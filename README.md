# Eigenraum

Eigenraum ist eine kleine, ruhige, persönliche App für morgens und abends –
keine Aufgaben-, Gewohnheits- oder Produktivitäts-App. Sie hilft, kurz
wahrzunehmen, wie nah man sich selbst ist:

1. Ein kurzes **morgendliches visuelles Artefakt** (abstrakte Canvas-Animation
   plus ein einzelner ruhiger Satz).
2. Ein sehr kurzer **Morgen-Check-in** (Bedürfnis, Schutz, Erlaubnis).
3. Ein **abendlicher Checkout** (vier freie Textfragen, Zustand, Deutlichkeit).
4. Aus dem Checkout entsteht am Abend die **Animation für den nächsten Morgen** –
   als sanfte Gegenbewegung, nicht als Spiegelung des Abendzustands.
5. Eine **lokale Historie** ohne Punkte, Streaks oder Bewertungen.

## Architektur

```text
React + TypeScript (Vite)        Capacitor 8              Nativer Code
┌─────────────────────────┐     ┌──────────────┐     ┌──────────────────────┐
│ UI, Domänenlogik,       │     │              │     │ NativeOpenAI-Plugin  │
│ Dexie/IndexedDB,        │ ──▶ │ JS-Bridge    │ ──▶ │ Keychain / Keystore  │
│ Canvas-Renderer,        │     │ (nur Body,   │     │ URLSession / OkHttp  │
│ Zod-Validierung         │     │  nie der Key)│     │ Authorization-Header │
└─────────────────────────┘     └──────────────┘     └──────────────────────┘
```

- **Kein Backend.** Kein Server, keine Serverless Function, kein Proxy,
  keine Cloud-Datenbank, kein Konto, kein Sync. Alle Daten liegen in
  IndexedDB (Dexie) auf dem Gerät.
- **Bring Your Own Key (BYOK).** Der Nutzer hinterlegt seinen eigenen
  OpenAI-API-Key über einen nativen Dialog. Der Key wird auf iOS in der
  Keychain (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, kein iCloud-Sync,
  kein Backup) und auf Android AES-GCM-verschlüsselt (nicht exportierbarer
  Keystore-Schlüssel, `allowBackup="false"`) gespeichert.
- **Kein OpenAI-SDK im Browser.** Der React-Code kennt weder den OpenAI-Host
  noch einen Authorization-Header und kann den Key nicht auslesen – es gibt
  keine `getApiKey()`-Methode. Der native Plugin akzeptiert nur den
  Request-Body (max. 64 KiB) und spricht ausschließlich den fest codierten
  Endpoint `https://api.openai.com/v1/responses` an (keine Redirects,
  kein Cache, keine Cookies).

### Warum kein OpenAI-SDK im Browser?

Ein API-Key im WebView oder JavaScript-Bundle wäre auslesbar (DevTools,
Bundle-Inspektion, XSS). Deshalb erzeugt der TypeScript-Teil nur den
Request-Body; der Header entsteht erst im nativen Code, und die Antwort
kommt als Status + Body zurück. Der Web-Build liefert bei echten
KI-Aufrufen den Fehler `AI_UNAVAILABLE_ON_WEB` oder nutzt im
Entwicklungsmodus einen lokalen Mock.

### Generierung des Morgenartefakts

- Responses API (`POST /v1/responses`) mit `store: false`, ohne Streaming,
  ohne `previous_response_id` – jede Generierung ist stateless.
- Modell in den Einstellungen wählbar: Terra (`gpt-5.6-terra`, Standard),
  Sol (`gpt-5.6-sol`) oder Luna (`gpt-5.6-luna`); ebenso die Thinking-Stufe
  (`reasoning.effort`: minimal/low/medium/high, Standard low – höhere Stufen
  erhalten automatisch mehr `max_output_tokens`). Beides zentral in
  `src/ai/prompt-builder.ts`.
- Structured Outputs: Das JSON-Schema wird aus einer einzigen Zod-Definition
  erzeugt (`src/ai/output-schema.ts`), strict mode, `additionalProperties: false`.
- Jede Antwort wird lokal erneut mit Zod validiert, Zahlenwerte werden in
  die erlaubten Bereiche geklemmt, die Phrase auf 90 Zeichen begrenzt.
  Unbekannte Enums oder jeder Fehler (HTTP, Timeout, Refusal, incomplete,
  ungültiges JSON) führen zum **deterministischen lokalen Fallback-Artefakt** –
  der Abend-Checkout geht dabei nie verloren.
- Gesendet werden nur der aktuelle Checkout und höchstens drei vorherige
  Zustände samt Zielqualität – keine IDs, kein Name, keine Geräteinfos,
  keine vollständige Historie.

### Animation

Die KI erzeugt kein Bild und keinen Code, sondern ein deklaratives
`AnimationSpec` (Hintergrund, Farben, 1–4 Ebenen mit Form/Bewegung).
Ein Canvas-2D-Renderer mit Seeded-PRNG (Mulberry32) rendert daraus
deterministisch 3,2–5 Sekunden ruhige Bewegung und ein statisches Endbild.
Bei `prefers-reduced-motion` oder aktivierter App-Einstellung wird direkt
das Endbild gezeigt und der Satz erscheint in unter 250 ms. Der Morgenstart
liest ausschließlich IndexedDB und funktioniert im Flugmodus.

## Entwicklung

```bash
npm install
npm run dev          # Browser-Entwicklung mit Mock-AI-Provider
npm run lint
npm run typecheck
npm run test         # Vitest (Unit + Komponenten)
npm run build
npm run test:e2e     # Playwright (nutzt den Mock-AI-Provider)
```

Im Browser-Build darf **kein echter OpenAI-Key** eingegeben werden – es gibt
dort auch keinen Weg dazu. Der Mock-Provider ist im Dev-Server automatisch
aktiv und über localStorage steuerbar:

- `eigenraum.mockAi.configured = "true"` – simuliert eingerichteten Zugang
- `eigenraum.mockAi.failWith = "<AiErrorCode>"` – erzwingt einen Fehlerpfad

## iOS einrichten (primäre Plattform)

```bash
npm run build
npx cap sync ios
npx cap open ios     # erfordert macOS/Xcode
```

Das Plugin (`ios/App/App/NativeOpenAI/`) wird über `MainViewController`
an der Bridge registriert (im Storyboard hinterlegt). Signing-Team in
Xcode wählen, dann auf Gerät oder Simulator starten.

**API-Key einrichten:** In der App (Onboarding oder Einstellungen →
„OpenAI-Zugang einrichten“) öffnet sich ein nativer Dialog mit sicherem
Eingabefeld. Der Key wird direkt in der Keychain gespeichert, nie angezeigt
und nie an JavaScript übergeben.

## Android einrichten

```bash
npm run build
npx cap sync android
npx cap open android # erfordert Android Studio
```

Plugin: `android/app/src/main/java/de/eigenraum/app/`
(Keystore AES-GCM + OkHttp, Registrierung in `MainActivity`).

## Tests

- **Unit/Komponenten:** `npm run test` – Datumslogik (Monats-/Jahresgrenzen,
  DST), PRNG- und Fallback-Determinismus, Spec-Normalisierung,
  Response-Parsing inkl. aller Fehlerpfade, JSON-Schema-Eigenschaften,
  Formular-Verhalten, Reduced Motion.
- **E2E:** `npm run test:e2e` – drei Szenarien (Happy Path mit Folgetag ohne
  erneuten KI-Aufruf, Fehlerpfad mit Fallback ohne externe Hosts,
  Reduced Motion).
- **Nativ:** siehe `tests/native/README.md` (XCTest mit URLProtocol-Stub,
  Android-JVM-Tests mit MockWebServer; erfordern Xcode bzw. Android SDK).

## Datenschutz

Deine Einträge werden lokal gespeichert. Für die Erzeugung eines
Morgenbildes wird der dafür benötigte Checkout direkt von deinem Gerät an
OpenAI gesendet (`store: false`; die übliche Missbrauchs-Aufbewahrung von
OpenAI kann je nach Projektkonfiguration dennoch gelten). Die App behauptet
bewusst nicht, dass Daten das Gerät niemals verlassen.

## Bekannte Sicherheitsgrenze

> Diese App ist für die private Verwendung mit einem eigenen
> OpenAI-API-Key ausgelegt. Der API-Key wird nicht mit der App ausgeliefert.
> Trotz geschützter nativer Speicherung kann ein Schlüssel auf einem
> kompromittierten oder kontrollierten Endgerät nicht absolut geschützt werden.

Für eine öffentlich vertriebene App mit einem herausgeberseitigen Key wäre
diese Architektur ungeeignet; OpenAI rät generell davon ab, API-Keys in
Browser- oder Mobil-Clients einzusetzen.

## Aktuelle Einschränkungen

- Die nativen Builds (Xcode/Android Studio) konnten in der
  Linux-Entwicklungsumgebung nicht kompiliert werden; die Plugin-Quellen
  und Projektdateien sind vollständig, `npx cap sync` läuft fehlerfrei.
- Für die iOS-Tests muss einmalig ein Unit-Test-Target in Xcode angelegt
  werden (siehe `tests/native/README.md`).
- Der JSON-Export nutzt einen Browser-Download; auf iOS empfiehlt sich
  später eine Anbindung an das native Share-Sheet.
- Formtypen `petal` und `ribbon` sind implementiert, werden vom lokalen
  Fallback-Generator aber noch nicht verwendet (nur von KI-Specs).
- Diagnoseseite für technische Fehlercodes ist noch nicht umgesetzt;
  Codes werden nur intern am Artefakt gespeichert.
