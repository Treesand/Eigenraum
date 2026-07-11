import Foundation

struct OpenAIResponse {
    let status: Int
    let body: String
    let requestId: String?
}

enum OpenAIClientError: Error {
    case apiKeyMissing
    case bodyTooLarge
    case networkOffline
    case networkTimeout
    case unknown

    var code: String {
        switch self {
        case .apiKeyMissing: return "API_KEY_MISSING"
        case .bodyTooLarge: return "OPENAI_BAD_REQUEST"
        case .networkOffline: return "NETWORK_OFFLINE"
        case .networkTimeout: return "NETWORK_TIMEOUT"
        case .unknown: return "UNKNOWN"
        }
    }
}

/// Blockiert jede HTTP-Weiterleitung – der Client spricht ausschließlich
/// mit dem fest codierten OpenAI-Endpoint.
final class NoRedirectDelegate: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}

/// Einziger Ort der App, an dem der OpenAI-Host, der Pfad und der
/// Authorization-Header existieren. JavaScript liefert nur den Body.
final class OpenAIClient {
    /// Fest codiert – keine konfigurierbare URL, kein HTTP, kein Proxy.
    static let endpoint = URL(string: "https://api.openai.com/v1/responses")!
    static let maxBodyBytes = 64 * 1024

    private let session: URLSession
    private let readKey: () -> String?

    init(session: URLSession? = nil, readKey: @escaping () -> String? = KeychainStore.read) {
        if let session = session {
            self.session = session
        } else {
            // Ephemer: keine Cookies, kein Cache, nichts wird persistiert.
            let configuration = URLSessionConfiguration.ephemeral
            configuration.httpCookieAcceptPolicy = .never
            configuration.httpShouldSetCookies = false
            configuration.urlCache = nil
            configuration.timeoutIntervalForRequest = 30
            configuration.timeoutIntervalForResource = 45
            self.session = URLSession(
                configuration: configuration,
                delegate: NoRedirectDelegate(),
                delegateQueue: nil
            )
        }
        self.readKey = readKey
    }

    func createResponse(
        body: String,
        completion: @escaping (Result<OpenAIResponse, OpenAIClientError>) -> Void
    ) {
        guard let apiKey = readKey(), !apiKey.isEmpty else {
            completion(.failure(.apiKeyMissing))
            return
        }
        guard let bodyData = body.data(using: .utf8), bodyData.count <= Self.maxBodyBytes else {
            completion(.failure(.bodyTooLarge))
            return
        }

        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.httpBody = bodyData
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let startedAt = Date()
        let task = session.dataTask(with: request) { data, response, error in
            if let error = error as? URLError {
                switch error.code {
                case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed,
                     .internationalRoamingOff, .cannotFindHost, .cannotConnectToHost:
                    completion(.failure(.networkOffline))
                case .timedOut:
                    completion(.failure(.networkTimeout))
                default:
                    completion(.failure(.unknown))
                }
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(.unknown))
                return
            }

            let bodyText = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            let requestId = httpResponse.value(forHTTPHeaderField: "x-request-id")

            #if DEBUG
            // Nur technische Metadaten – nie Key, Header oder Inhalte.
            let durationMs = Int(Date().timeIntervalSince(startedAt) * 1000)
            print("NativeOpenAI status=\(httpResponse.statusCode) durationMs=\(durationMs) responseBytes=\(data?.count ?? 0)")
            #endif

            completion(.success(OpenAIResponse(
                status: httpResponse.statusCode,
                body: bodyText,
                requestId: requestId
            )))
        }
        task.resume()
    }

    /// Minimaler Verbindungstest über denselben fest codierten Endpoint.
    func testConnection(
        model: String,
        completion: @escaping (_ valid: Bool, _ modelAccess: Bool) -> Void
    ) {
        let probeBody: [String: Any] = [
            "model": model,
            "input": "ping",
            "store": false,
            "max_output_tokens": 16
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: probeBody),
              let body = String(data: data, encoding: .utf8) else {
            completion(false, false)
            return
        }
        createResponse(body: body) { result in
            switch result {
            case .success(let response):
                let valid = response.status != 401 && response.status != 403
                completion(valid, response.status == 200)
            case .failure:
                completion(false, false)
            }
        }
    }
}
