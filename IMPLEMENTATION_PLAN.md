# Eigenraum – Implementierungsplan

Stand: Projektstart auf leerem Repository.

## Zielarchitektur

- React + TypeScript (strict) + Vite als Web-Layer (UI, Domänenlogik, Speicherung, Rendering).
- Capacitor 8 als nativer Container; iOS primär, Android als zweite Plattform.
- OpenAI-Kommunikation ausschließlich im nativen Capacitor-Plugin `NativeOpenAI`
  (Keychain / Keystore + natives HTTP). Kein OpenAI-SDK, kein Key im WebView.
- Dexie/IndexedDB für alle Anwendungsdaten, Zod für Laufzeitvalidierung,
  Canvas 2D + Seeded-PRNG für das Morgenartefakt.

## Schritte

1. Projekt initialisieren: package.json, tsconfig, Vite, ESLint, Prettier,
   Vitest, Playwright, Capacitor-Konfiguration, CSP in index.html.
2. Domäne: `LocalDateKey`-Funktionen, Datentypen (Check-in, Checkout,
   Artefakt, Interpretation, AnimationSpec), Dexie-Datenbank + Repositories.
3. Lokaler Fallback-Generator (`createFallbackArtifact`) deterministisch,
   vollständig getestet.
4. Canvas-Renderer: Mulberry32-PRNG, Szenenaufbau aus Spec, Formtypen
   blob/ring/line/particles (petal/ribbon danach), Reduced-Motion-Pfad.
5. Flows: Onboarding, Startseite, Morgen-Check-in, Abend-Checkout,
   Generierungsablauf mit Mock-AI-Provider; komplett im Browser testbar.
6. iOS-Plugin: Keychain, nativer Key-Dialog (UIAlertController, secure),
   URLSession (ephemeral, feste URL, Redirect-Sperre), Fehlercodes.
7. Responses-API: Request-Builder, JSON-Schema aus Zod, Response-Parser
   mit vollständigem Fehlermapping.
8. `NativeAiProvider` an Plugin anbinden; Provider-Auswahl
   (nativ / Mock / `AI_UNAVAILABLE_ON_WEB`).
9. Einstellungen, Verlauf, JSON-Export, Alles-löschen.
10. Android-Plugin: Keystore AES-GCM, OkHttp, `allowBackup="false"`.
11. Sicherheits-/Reduced-Motion-/Accessibility-Prüfung, grep-Checks.
12. README, AGENTS.md, finale Testläufe (lint, typecheck, unit, build, e2e).

## Teststrategie

- Vitest: Datumslogik (Monats-/Jahresgrenzen, DST), PRNG-Determinismus,
  Spec-Normalisierung (Klemmen, unbekannte Enums), Fallback-Mapping,
  Response-Parsing (inkl. Refusal, incomplete, fehlender Text, HTTP-Mapping),
  Phrase-Kürzung, JSON-Schema-Eigenschaften (additionalProperties, required).
- React Testing Library: Check-in-/Checkout-Formulare, Reduced Motion,
  fehlender Key, Fallback-Anzeige.
- Playwright (Mock-AI): Onboarding→Checkout→Artefakt→Folgetag offline,
  Fehlerpfad→Fallback, Reduced Motion.
- Native iOS-Tests (XCTest, URLProtocol-Stub) und Android-Tests als
  Quellcode beigelegt; Ausführung erfordert Xcode bzw. Android SDK.
