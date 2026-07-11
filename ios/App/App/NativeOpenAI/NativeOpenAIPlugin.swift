import Foundation
import UIKit
import Capacitor

/// Capacitor-Plugin "NativeOpenAI".
///
/// Sicherheitsgrundsätze:
/// - Der API-Key wird über einen nativen Dialog eingegeben und direkt in
///   der Keychain gespeichert – er passiert die JS-Bridge nicht.
/// - Es existiert bewusst keine getApiKey-Methode.
/// - Host, Pfad und Authorization-Header liegen nur im nativen Code.
@objc(NativeOpenAIPlugin)
public class NativeOpenAIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeOpenAIPlugin"
    public let jsName = "NativeOpenAI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hasApiKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "promptForApiKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteApiKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "testConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createResponse", returnType: CAPPluginReturnPromise)
    ]

    /// Muss mit DEFAULT_AI_MODEL in src/ai/prompt-builder.ts übereinstimmen;
    /// wird nur für den Verbindungstest verwendet.
    private static let defaultModel = "gpt-5.6-terra"

    private let client = OpenAIClient()

    @objc func hasApiKey(_ call: CAPPluginCall) {
        call.resolve(["configured": KeychainStore.exists()])
    }

    @objc func promptForApiKey(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let viewController = self.bridge?.viewController else {
                call.reject("UNKNOWN", "UNKNOWN")
                return
            }

            let alert = UIAlertController(
                title: "OpenAI-Zugang",
                message: "Der Schlüssel wird nur in der Keychain dieses Geräts gespeichert.",
                preferredStyle: .alert
            )
            alert.addTextField { textField in
                textField.placeholder = "API-Key"
                textField.isSecureTextEntry = true
                textField.autocorrectionType = .no
                textField.autocapitalizationType = .none
            }
            alert.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in
                call.resolve(["saved": false, "validated": false])
            })
            alert.addAction(UIAlertAction(title: "Speichern", style: .default) { [weak alert] _ in
                let entered = alert?.textFields?.first?.text?
                    .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                guard !entered.isEmpty else {
                    call.resolve(["saved": false, "validated": false])
                    return
                }
                guard KeychainStore.save(entered) else {
                    call.reject("UNKNOWN", "UNKNOWN")
                    return
                }
                // Der Key bleibt nativ; nur das Testergebnis geht zurück.
                self.client.testConnection(model: Self.defaultModel) { valid, _ in
                    call.resolve(["saved": true, "validated": valid])
                }
            })

            viewController.present(alert, animated: true)
        }
    }

    @objc func deleteApiKey(_ call: CAPPluginCall) {
        KeychainStore.delete()
        call.resolve()
    }

    @objc func testConnection(_ call: CAPPluginCall) {
        guard KeychainStore.exists() else {
            call.reject("API_KEY_MISSING", "API_KEY_MISSING")
            return
        }
        client.testConnection(model: Self.defaultModel) { valid, modelAccess in
            call.resolve(["valid": valid, "modelAccess": modelAccess])
        }
    }

    @objc func createResponse(_ call: CAPPluginCall) {
        guard let body = call.getString("body"), !body.isEmpty else {
            call.reject("OPENAI_BAD_REQUEST", "OPENAI_BAD_REQUEST")
            return
        }

        client.createResponse(body: body) { result in
            switch result {
            case .success(let response):
                call.resolve([
                    "status": response.status,
                    "body": response.body,
                    "requestId": response.requestId as Any
                ])
            case .failure(let error):
                call.reject(error.code, error.code)
            }
        }
    }
}
