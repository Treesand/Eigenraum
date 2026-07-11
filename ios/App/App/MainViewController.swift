import UIKit
import Capacitor

/// Registriert das app-lokale Plugin NativeOpenAI an der Capacitor-Bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeOpenAIPlugin())
    }
}
