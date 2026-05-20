# macOS WKWebView 测试壳

这是 P6-05 的 macOS 本地测试包壳。它使用 Swift、AppKit 和 WKWebView 加载仓库根目录的静态 Web app，不引入 Electron、npm、CDN 或远程同步。

构建：

```sh
cd /Users/pareo/Documents/月之暗面/platforms/macos
chmod +x build-macos-test.sh
./build-macos-test.sh
```

输出：

- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app`
- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`

定位：

- 这是本地测试 `.app` / DMG，不是正式公开分发包。
- 本轮不做 Developer ID 签名，不做 notarization。
- 外部机器打开 unsigned / ad-hoc 测试包可能遇到 Gatekeeper 提示。
- 用户数据不会打进 app bundle 或 DMG；运行后仍由 WKWebView 的本地存储保存。
