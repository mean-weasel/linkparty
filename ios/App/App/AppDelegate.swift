import UIKit
import WebKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private let storageKey = "com.linkparty.app.webStorage"

    private var capacitorWebView: WKWebView? {
        guard let vc = window?.rootViewController as? CAPBridgeViewController else { return nil }
        return vc.webView
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        saveTokens()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        restoreTokens()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        saveTokens()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL,
              url.host == "linkparty.app" else {
            return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
        }

        if let webView = capacitorWebView {
            webView.load(URLRequest(url: url))
            return true
        }

        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Token Persistence

    private func saveTokens() {
        guard let webView = capacitorWebView else { return }

        let js = """
        (function() {
            var tokens = {};
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.startsWith('sb-')) {
                    tokens[key] = localStorage.getItem(key);
                }
            }
            return JSON.stringify(tokens);
        })();
        """

        webView.evaluateJavaScript(js) { [weak self] result, error in
            guard let self = self, error == nil, let json = result as? String else { return }
            UserDefaults.standard.set(json, forKey: self.storageKey)
        }
    }

    private func restoreTokens() {
        guard let webView = capacitorWebView,
              let json = UserDefaults.standard.string(forKey: storageKey),
              !json.isEmpty else { return }

        let escaped = json.replacingOccurrences(of: "\\", with: "\\\\")
                         .replacingOccurrences(of: "'", with: "\\'")

        let js = """
        (function() {
            try {
                var tokens = JSON.parse('\(escaped)');
                for (var key in tokens) {
                    localStorage.setItem(key, tokens[key]);
                    window.dispatchEvent(new StorageEvent('storage', { key: key, newValue: tokens[key] }));
                }
            } catch(e) {}
        })();
        """

        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
