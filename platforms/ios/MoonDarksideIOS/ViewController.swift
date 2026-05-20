import UIKit
import WebKit

final class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    private var webRootURL: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true

        let contentController = WKUserContentController()
        contentController.add(self, name: "moonConsole")
        contentController.addUserScript(WKUserScript(
            source: Self.wrapperAndConsoleBridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        ))
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])

        self.webView = webView
        loadLocalAppShell()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "moonConsole" else { return }
        if let payload = message.body as? [String: Any] {
            let level = payload["level"] as? String ?? "log"
            let text = payload["message"] as? String ?? ""
            NSLog("[Moon iOS WKWebView][\(level)] \(text)")
        } else {
            NSLog("[Moon iOS WKWebView] \(message.body)")
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if isAllowedNavigation(url) {
            decisionHandler(.allow)
            return
        }

        NSLog("[Moon iOS WKWebView] Blocked navigation: \(url.absoluteString)")
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, isAllowedNavigation(url) {
            webView.load(URLRequest(url: url))
        } else if let url = navigationAction.request.url {
            NSLog("[Moon iOS WKWebView] Blocked new-window navigation: \(url.absoluteString)")
        }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "月之暗面", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "月之暗面", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: "月之暗面", message: prompt, preferredStyle: .alert)
        alert.addTextField { textField in
            textField.text = defaultText
        }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "好", style: .default) { _ in
            completionHandler(alert.textFields?.first?.text)
        })
        present(alert, animated: true)
    }

    private func loadLocalAppShell() {
        guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") else {
            showFatalError("未找到本地 app shell。")
            return
        }
        let wwwURL = indexURL.deletingLastPathComponent()
        webRootURL = wwwURL.standardizedFileURL
        webView.loadFileURL(indexURL, allowingReadAccessTo: wwwURL)
    }

    private func isAllowedNavigation(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }

        if scheme == "file" {
            guard let webRootURL else { return false }
            let normalizedPath = url.standardizedFileURL.path
            let rootPath = webRootURL.path
            return normalizedPath == rootPath || normalizedPath.hasPrefix(rootPath + "/")
        }

        return ["about", "blob", "data", "javascript"].contains(scheme)
    }

    private func showFatalError(_ message: String) {
        NSLog("[Moon iOS WKWebView] \(message)")
        let alert = UIAlertController(title: "月之暗面", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "退出", style: .destructive))
        present(alert, animated: true)
    }

    private static let wrapperAndConsoleBridgeScript = """
    window.__MOON_IOS_WRAPPER__ = true;
    (function(){
      if (window.__MOON_CONSOLE_BRIDGE__) return;
      window.__MOON_CONSOLE_BRIDGE__ = true;
      ["log", "warn", "error"].forEach(function(level){
        var original = console[level];
        console[level] = function(){
          try {
            var message = Array.prototype.map.call(arguments, function(item){
              if (typeof item === "string") return item;
              try { return JSON.stringify(item); } catch (err) { return String(item); }
            }).join(" ");
            window.webkit.messageHandlers.moonConsole.postMessage({ level: level, message: message });
          } catch (err) {}
          return original.apply(console, arguments);
        };
      });
    })();
    """
}
