# Native Tests

## iOS (`tests/native/ios/NativeOpenAITests.swift`)

XCTest-Suite für `KeychainStore`, `OpenAIClient` (URLProtocol-Stub,
Redirect-Sperre, Fehlermapping) und die Plugin-Oberfläche
(keine Key-Lese-Methode).

Einbindung:

1. `ios/App/App.xcodeproj` in Xcode öffnen.
2. Unit-Test-Target anlegen: File → New → Target → Unit Testing Bundle,
   Name `AppTests`, Host Application `App`.
3. `tests/native/ios/NativeOpenAITests.swift` zum Test-Target hinzufügen.
4. `Cmd+U` ausführen.

Die Keychain-Tests benötigen einen Simulator oder ein Gerät.

## Android (`android/app/src/test/java/de/eigenraum/app/OpenAIClientTest.java`)

JVM-Tests mit MockWebServer, bereits im Gradle-Projekt eingebunden:

```bash
cd android && ./gradlew testDebugUnitTest
```

Beide Suiten erfordern die jeweilige native Toolchain (Xcode bzw.
Android SDK) und können in einer reinen Linux-CI ohne SDKs nicht laufen.
