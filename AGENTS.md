# Eigenraum Engineering Rules

- Eigenraum bleibt local-first und backendlos.
- Kein API-Key im JavaScript-Bundle.
- Keine OpenAI-Aufrufe aus React oder dem WebView.
- Kein OpenAI-JavaScript-SDK.
- OpenAI-Kommunikation ausschließlich über NativeOpenAI.
- Keine Cloud-Datenbank, Anmeldung oder Analytics ergänzen.
- Keine Tasklisten, Streaks, Punkte oder Gamification ergänzen.
- KI-Ausgaben immer strukturiert validieren.
- Jeder KI-Fehler benötigt einen lokalen Fallback.
- Der Morgenstart darf niemals auf eine Netzwerkanfrage warten.
- Persönliche Texte nicht loggen.
- Keine externen Assets ohne ausdrückliche Anforderung.
- Neue Animationselemente müssen über deklarative Schemas laufen.
- Kein von der KI erzeugter HTML-, CSS-, SVG- oder JavaScript-Code.
- Reduced Motion muss bei jeder Animation respektiert werden.
- Änderungen müssen lint-, typecheck- und testfähig sein.
