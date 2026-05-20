import AppKit
import WebKit

private let appName = "月之暗面"

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate {
    private var window: NSWindow?
    private var webView: WKWebView?
    private var webRootURL: URL?

    func applicationDidFinishLaunching(_ notification: Notification) {
        configureMainMenu()

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

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1100, height: 760),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = appName
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)

        self.window = window
        self.webView = webView

        guard let resourceURL = Bundle.main.resourceURL else {
            showFatalError("无法读取应用资源目录。")
            return
        }

        let wwwURL = resourceURL.appendingPathComponent("www", isDirectory: true)
        let indexURL = wwwURL.appendingPathComponent("index.html")
        webRootURL = wwwURL.standardizedFileURL

        if FileManager.default.fileExists(atPath: indexURL.path) {
            webView.loadFileURL(indexURL, allowingReadAccessTo: wwwURL)
        } else {
            showFatalError("未找到本地 app shell：\(indexURL.path)")
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "moonConsole" else { return }
        if let payload = message.body as? [String: Any] {
            let level = payload["level"] as? String ?? "log"
            let text = payload["message"] as? String ?? ""
            NSLog("[Moon WKWebView][\(level)] \(text)")
        } else {
            NSLog("[Moon WKWebView] \(message.body)")
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

        NSLog("[Moon WKWebView] Blocked navigation: \(url.absoluteString)")
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, isAllowedNavigation(url) {
            webView.load(URLRequest(url: url))
        } else if let url = navigationAction.request.url {
            NSLog("[Moon WKWebView] Blocked new-window navigation: \(url.absoluteString)")
        }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = appName
        alert.informativeText = message
        alert.addButton(withTitle: "好")
        alert.beginSheetModal(for: window ?? NSApp.mainWindow ?? NSWindow()) { _ in
            completionHandler()
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = appName
        alert.informativeText = message
        alert.addButton(withTitle: "好")
        alert.addButton(withTitle: "取消")
        alert.beginSheetModal(for: window ?? NSApp.mainWindow ?? NSWindow()) { response in
            completionHandler(response == .alertFirstButtonReturn)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = appName
        alert.informativeText = prompt
        alert.addButton(withTitle: "好")
        alert.addButton(withTitle: "取消")

        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 24))
        input.stringValue = defaultText ?? ""
        alert.accessoryView = input

        alert.beginSheetModal(for: window ?? NSApp.mainWindow ?? NSWindow()) { response in
            completionHandler(response == .alertFirstButtonReturn ? input.stringValue : nil)
        }
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.beginSheetModal(for: window ?? NSApp.mainWindow ?? NSWindow()) { response in
            completionHandler(response == .OK ? panel.urls : nil)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.beginSheetModal(for: window ?? NSApp.mainWindow ?? NSWindow()) { result in
            completionHandler(result == .OK ? panel.url : nil)
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        NSLog("[Moon WKWebView] Download finished.")
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        NSLog("[Moon WKWebView] Download failed: \(error.localizedDescription)")
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
        NSLog("[Moon WKWebView] \(message)")
        let alert = NSAlert()
        alert.messageText = appName
        alert.informativeText = message
        alert.addButton(withTitle: "退出")
        alert.runModal()
        NSApp.terminate(nil)
    }

    private func configureMainMenu() {
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)

        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "退出 \(appName)", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu

        NSApp.mainMenu = mainMenu
    }

    private static let wrapperAndConsoleBridgeScript = """
    window.__MOON_MACOS_WRAPPER__ = true;
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

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
