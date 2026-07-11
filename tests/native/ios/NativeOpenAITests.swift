import XCTest
@testable import App

/// Native Tests für KeychainStore und OpenAIClient.
///
/// Einbindung: In Xcode ein Unit-Test-Target "AppTests" anlegen
/// (File → New → Target → Unit Testing Bundle, Host: App) und diese
/// Datei dort hinzufügen. Die Ausführung erfordert macOS/Xcode und
/// ist in einer Linux-Umgebung nicht möglich.
final class KeychainStoreTests: XCTestCase {
    override func setUp() {
        super.setUp()
        KeychainStore.delete()
    }

    override func tearDown() {
        KeychainStore.delete()
        super.tearDown()
    }

    func testSaveAndExists() {
        XCTAssertFalse(KeychainStore.exists())
        XCTAssertTrue(KeychainStore.save("sk-test-value"))
        XCTAssertTrue(KeychainStore.exists())
    }

    func testReplaceOverwritesExistingKey() {
        XCTAssertTrue(KeychainStore.save("first"))
        XCTAssertTrue(KeychainStore.save("second"))
        XCTAssertEqual(KeychainStore.read(), "second")
    }

    func testDeleteRemovesKey() {
        KeychainStore.save("to-delete")
        XCTAssertTrue(KeychainStore.delete())
        XCTAssertFalse(KeychainStore.exists())
        XCTAssertNil(KeychainStore.read())
    }

    func testDeleteWithoutKeyIsNotAnError() {
        XCTAssertTrue(KeychainStore.delete())
    }
}

/// Der Key darf über die Plugin-Schnittstelle nicht auslesbar sein.
final class PluginSurfaceTests: XCTestCase {
    func testPluginExposesNoKeyReadingMethod() {
        let plugin = NativeOpenAIPlugin()
        let methodNames = plugin.pluginMethods.map { $0.name }
        XCTAssertFalse(methodNames.contains("getApiKey"))
        XCTAssertEqual(
            Set(methodNames),
            ["hasApiKey", "promptForApiKey", "deleteApiKey", "testConnection", "createResponse"]
        )
    }
}

/// URLProtocol-Stub für Netzwerktests ohne echte Verbindung.
final class StubURLProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (HTTPURLResponse, Data))?
    static var error: Error?
    static var seenRequests: [URLRequest] = []

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.seenRequests.append(request)
        if let error = Self.error {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }
        guard let handler = Self.handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.unknown))
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

final class OpenAIClientTests: XCTestCase {
    private var client: OpenAIClient!

    override func setUp() {
        super.setUp()
        StubURLProtocol.handler = nil
        StubURLProtocol.error = nil
        StubURLProtocol.seenRequests = []

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        let session = URLSession(
            configuration: configuration,
            delegate: NoRedirectDelegate(),
            delegateQueue: nil
        )
        client = OpenAIClient(session: session, readKey: { "sk-test" })
    }

    private func stub(status: Int, body: String = "{}", headers: [String: String] = [:]) {
        StubURLProtocol.handler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: status,
                httpVersion: "HTTP/1.1",
                headerFields: headers
            )!
            return (response, Data(body.utf8))
        }
    }

    func testTargetsOnlyTheFixedEndpoint() {
        stub(status: 200)
        let expectation = expectation(description: "request")
        client.createResponse(body: "{}") { _ in expectation.fulfill() }
        wait(for: [expectation], timeout: 5)

        XCTAssertEqual(
            StubURLProtocol.seenRequests.first?.url?.absoluteString,
            "https://api.openai.com/v1/responses"
        )
    }

    func testMissingKeyIsRejectedBeforeAnyRequest() {
        let clientWithoutKey = OpenAIClient(session: .shared, readKey: { nil })
        let expectation = expectation(description: "missing key")
        clientWithoutKey.createResponse(body: "{}") { result in
            if case .failure(let error) = result {
                XCTAssertEqual(error.code, "API_KEY_MISSING")
            } else {
                XCTFail("Erwarteter Fehler blieb aus")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
        XCTAssertTrue(StubURLProtocol.seenRequests.isEmpty)
    }

    func test401IsReturnedAsStatusForJsMapping() {
        stub(status: 401, body: "{\"error\":{}}")
        let expectation = expectation(description: "401")
        client.createResponse(body: "{}") { result in
            if case .success(let response) = result {
                XCTAssertEqual(response.status, 401)
            } else {
                XCTFail("401 muss als Status durchgereicht werden")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
    }

    func test429IsReturnedAsStatusForJsMapping() {
        stub(status: 429)
        let expectation = expectation(description: "429")
        client.createResponse(body: "{}") { result in
            if case .success(let response) = result {
                XCTAssertEqual(response.status, 429)
            } else {
                XCTFail("429 muss als Status durchgereicht werden")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
    }

    func testTimeoutMapsToNetworkTimeout() {
        StubURLProtocol.error = URLError(.timedOut)
        let expectation = expectation(description: "timeout")
        client.createResponse(body: "{}") { result in
            if case .failure(let error) = result {
                XCTAssertEqual(error.code, "NETWORK_TIMEOUT")
            } else {
                XCTFail("Timeout muss NETWORK_TIMEOUT ergeben")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
    }

    func testOfflineMapsToNetworkOffline() {
        StubURLProtocol.error = URLError(.notConnectedToInternet)
        let expectation = expectation(description: "offline")
        client.createResponse(body: "{}") { result in
            if case .failure(let error) = result {
                XCTAssertEqual(error.code, "NETWORK_OFFLINE")
            } else {
                XCTFail("Offline muss NETWORK_OFFLINE ergeben")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
    }

    func testOversizedBodyIsRejected() {
        let oversized = String(repeating: "x", count: 64 * 1024 + 1)
        let expectation = expectation(description: "oversized")
        client.createResponse(body: oversized) { result in
            if case .failure(let error) = result {
                XCTAssertEqual(error.code, "OPENAI_BAD_REQUEST")
            } else {
                XCTFail("Zu großer Body muss abgelehnt werden")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
        XCTAssertTrue(StubURLProtocol.seenRequests.isEmpty)
    }

    func testRedirectToForeignHostIsNotFollowed() {
        // Der Stub liefert eine Weiterleitung auf einen fremden Host.
        // NoRedirectDelegate blockiert sie; der Redirect-Status wird
        // durchgereicht und es entsteht kein zweiter Request.
        stub(status: 302, headers: ["Location": "https://evil.example.com/steal"])
        let expectation = expectation(description: "redirect")
        client.createResponse(body: "{}") { result in
            if case .success(let response) = result {
                XCTAssertEqual(response.status, 302)
            } else {
                XCTFail("Redirect darf nicht verfolgt werden")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5)
        XCTAssertEqual(StubURLProtocol.seenRequests.count, 1)
        XCTAssertEqual(StubURLProtocol.seenRequests.first?.url?.host, "api.openai.com")
    }
}
