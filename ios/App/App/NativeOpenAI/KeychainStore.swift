import Foundation
import Security

/// Speichert den OpenAI-API-Key als Generic Password in der Keychain.
/// kSecAttrAccessibleWhenUnlockedThisDeviceOnly verhindert, dass der
/// Schlüssel über iCloud-Keychain oder Gerätebackups migriert wird.
enum KeychainStore {
    static let service = "de.eigenraum.app"
    static let account = "openai-api-key"

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }

    /// Fügt den Key hinzu oder ersetzt einen bestehenden Wert.
    @discardableResult
    static func save(_ key: String) -> Bool {
        guard let data = key.data(using: .utf8) else {
            return false
        }

        SecItemDelete(baseQuery as CFDictionary)

        var query = baseQuery
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly

        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    static func exists() -> Bool {
        var query = baseQuery
        query[kSecReturnData as String] = false
        return SecItemCopyMatching(query as CFDictionary, nil) == errSecSuccess
    }

    /// Nur für den nativen HTTP-Client. Der Key wird niemals über die
    /// Capacitor-Bridge an JavaScript zurückgegeben.
    static func read() -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func delete() -> Bool {
        let status = SecItemDelete(baseQuery as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
