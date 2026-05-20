# P6-05 macOS WKWebView DMG 测试包

## 1. 构建基线

- 当前分支：`feature/p6-05-macos-dmg-test-wrapper`
- 基线 tag：`p6-04-android-apk-test-wrapper`
- 基线 commit：`24d21a1 feat: add Android WebView APK test wrapper`
- 构建日期：2026-05-20
- macOS：26.5，Build 25F71
- Xcode：26.5，Build 17F42
- Swift：Apple Swift 6.3.2，swift-driver 1.148.6
- macOS SDK：`/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX26.5.sdk`
- hdiutil：可用，已用于 `create` / `verify` / `attach` / `detach`
- 工作区初始状态：干净

## 2. 本轮目标

P6-05 新增 macOS WKWebView 测试壳，将当前 Web app 静态资源打入 `.app` bundle，并生成本地测试 DMG。DMG 仅用于本机和小范围测试，不是正式公开分发包。

本轮明确不做：

- Developer ID 签名。
- notarization。
- App Store / TestFlight。
- iOS IPA。
- Android 工程改动。
- 云同步、远程 API、npm、CDN 或 `type="module"`。
- Web app 业务语义改动。

`.app` / DMG 不打包用户 localStorage、IndexedDB、真实备份、真实图片数据或敏感样本。

## 3. macOS 工程结构

新增 macOS 工程位于：

- `platforms/macos/README.md`
- `platforms/macos/build-macos-test.sh`
- `platforms/macos/.gitignore`
- `platforms/macos/MoonDarkside/Sources/main.swift`
- `platforms/macos/MoonDarkside/Resources/Info.plist`

构建方式：

- 不创建完整 Xcode project。
- 使用 `swiftc` 编译 Swift + AppKit + WebKit 最小应用。
- 手工组装 `.app` bundle。
- 构建时将当前仓库根目录的 Web app 静态资源复制到 `.app/Contents/Resources/www/`。
- 使用 `hdiutil create` 生成压缩 DMG。

Web app assets 同步：

- 复制 `index.html`、`styles.css`、`manifest.webmanifest`、`sw.js`、`favicon.ico`、`app_icon.png`、`app_icon_192.png`、`app_icon_512.png` 和 `js/**`。
- 不复制 `.git`、`node_modules`、`platforms`、文档、包产物、备份文件、`.DS_Store`、临时文件或真实敏感样本。
- 构建脚本会删除误进入 `Resources/www` 的 `.DS_Store`、包产物和备份命名文件。

输出：

- `.app`：`/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app`
- DMG：`/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`

`.gitignore` 已排除：

- `platforms/macos/build/`
- `platforms/macos/dist/`
- `platforms/macos/DerivedData/`
- `platforms/macos/**/*.app`
- `platforms/macos/**/*.dmg`
- `platforms/macos/**/*.xcarchive`
- `platforms/macos/**/*.xcuserdata`
- `platforms/macos/**/*.xcuserstate`

## 4. WKWebView 加载模型

加载方式：

- `.app` 启动后使用 `Bundle.main.resourceURL` 定位 `Contents/Resources/www/index.html`。
- 使用 `webView.loadFileURL(indexURL, allowingReadAccessTo: wwwDirectoryURL)` 加载本地 app shell。
- `allowingReadAccessTo` 限定为 `Contents/Resources/www/`。

WKWebView 配置：

- 使用默认持久化 `WKWebsiteDataStore.default()`。
- 启用 JavaScript。
- `allowsBackForwardNavigationGestures = true`。
- 注入 `window.__MOON_MACOS_WRAPPER__ = true`，作为 wrapper 环境标记。
- 注入轻量 console bridge，将 `console.log/warn/error` 输出到系统日志，便于开发验收。
- `WKUIDelegate` 支持 alert / confirm / prompt。
- `WKUIDelegate` 支持文件选择面板，用于 JSON 导入和图片选择的运行态验收。
- `WKDownloadDelegate` 支持下载保存面板；Blob 下载和中文文件名行为仍需运行态验收。

导航边界：

- 允许 `Contents/Resources/www/` 内的 `file://` URL。
- 允许 `about:`、`blob:`、`data:`、`javascript:` scheme。
- 其它导航默认拦截并记录，不主动加载远程 URL。

Service Worker：

- macOS wrapper 使用 `file://` 加载 bundle 资源。
- 现有 `js/sw-register.js` 在 `file://` 下会跳过 Service Worker。
- 本轮未修改 `js/sw-register.js`。
- wrapper 不依赖 Service Worker；用户数据仍由 WKWebView 本地存储保存。

## 5. .app / DMG 构建结果

构建命令：

```sh
cd /Users/pareo/Documents/月之暗面/platforms/macos
chmod +x build-macos-test.sh
./build-macos-test.sh
```

构建结果：

- Swift 编译：通过。
- `.app` 生成：通过。
- ad-hoc codesign：通过，`Signature=adhoc`，`TeamIdentifier=not set`。
- Developer ID 签名：未做。
- notarization：未做。
- DMG 生成：通过。
- DMG verify：通过，checksum VALID。
- `.app` 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app`
- `.app` 大小：1.5M
- DMG 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`
- DMG 大小：863K / 883,313 bytes
- `.app` / DMG 未提交到 git。

## 6. 验收矩阵

| 编号 | 场景 | 预期 | 实际结果 | 状态 | 备注 |
|---|---|---|---|---|---|
| M1 | `.app` 构建 | 生成 macOS app bundle | 已生成 | 通过 | 仓库外输出 |
| M2 | DMG 构建 | `hdiutil create` 成功 | 已生成并 verify | 通过 | 仓库外输出 |
| M3 | `.app` 内容边界 | 不含 `.git` / `node_modules` / 真实备份 / 包产物 | 内容检查无命中 | 通过 | `Resources/www` 无文档 |
| M4 | DMG 挂载 | 可挂载和卸载 | 已挂载检查并卸载 | 通过 | 包含 `.app` 和 Applications symlink |
| M5 | `.app` 打开 | 本地 `.app` 可启动 | 进程启动成功 | 部分通过 | 截屏因显示捕获失败未完成 |
| M6 | DMG 中 `.app` 打开 | 挂载后 app 可启动 | 进程启动成功 | 部分通过 | 未做交互验收 |
| M7 | WKWebView 加载 app shell | 显示首页 | 已实现 `loadFileURL` | 代码通过 | 未完成可视截图确认 |
| M8 | localStorage | 重启后主记录仍在 | 未执行 | 未测 | 需人工 GUI 验收 |
| M9 | IndexedDB | 图片等外置数据持久化 | 未执行 | 未测 | 需人工 GUI 验收 |
| M10 | 主记录新增 | 新增记录可保存 | 未执行 | 未测 | 需人工 GUI 验收 |
| M11 | 图片消息 | 选择图片、显示、重启后仍显示 | 未执行 | 未测 | 文件选择面板已实现 |
| M12 | 成员头像 | 选择头像、保存、恢复 | 未执行 | 未测 | 需人工 GUI 验收 |
| M13 | 房间背景 | 选择背景、保存、恢复 | 未执行 | 未测 | 需人工 GUI 验收 |
| M14 | 主 JSON 导出 / 导入 | 导出和导入可用 | 未执行 | 未测 | 下载和文件选择需 GUI 验收 |
| M15 | encrypted-json 导出 / 导入 | 完整主记录加密备份可用 | 未执行 | 未测 | Web app 语义未改 |
| M16 | 账本首页 | 账本可打开和新增记录 | 未执行 | 未测 | 需人工 GUI 验收 |
| M17 | 账本 JSON v1/v2 | 导入导出不影响主记录 | 未执行 | 未测 | Web app 语义未改 |
| M18 | CSV | 账本 CSV 导出尝试 | 未执行 | 未测 | WKDownloadDelegate 已实现 |
| M19 | 锁屏 | 设置密码并解锁 | 未执行 | 未测 | Web app 语义未改 |
| M20 | QR 功能 | 本地 vendor QR 可用 | 未执行 | 未测 | `js/vendor/**` 已打包 |
| M21 | 无外部请求 | 不联网、不新增同步 | 静态边界通过 | 代码通过 | 运行态需日志 / 代理验收 |
| M22 | 不包含用户数据 | DMG 不打包 localStorage / IndexedDB / 真实备份 | 内容检查通过 | 通过 | 用户数据只在运行后产生 |

## 7. 已知限制

- `.app` 只做 ad-hoc 签名，不是 Developer ID 签名。
- DMG 未 notarized，不是正式可信分发包。
- 外部机器打开可能遇到 Gatekeeper 提示，需要手动允许或重新签名。
- 当前只确认 `.app` 和 DMG 中 `.app` 能启动进程；没有完成完整 GUI 点击验收。
- 截屏验证因当前环境无法创建屏幕截图而未完成。
- WKWebView 的 localStorage、IndexedDB、Blob 下载、中文文件名、文件选择、图片上传和 Web Crypto 行为需要后续人工 GUI 验收。
- `file://` 下 Service Worker 会跳过，这是预期行为；macOS wrapper 不依赖 Service Worker。

## 8. 测试命令与结果

工具链：

- `xcode-select -p`：`/Applications/Xcode.app/Contents/Developer`
- `xcodebuild -version`：Xcode 26.5 / Build 17F42
- `swift --version`：Apple Swift 6.3.2
- `xcrun --sdk macosx --show-sdk-path`：通过
- `hdiutil create` / `verify` / `attach` / `detach`：通过

Web app 语法检查：

- `node --check sw.js`：通过
- `node --check js/sw-register.js`：通过
- `node --check js/storage.js`：通过
- `node --check js/features/ledger.js`：通过
- `node --check js/features/storage-health.js`：通过
- `node --check js/features/import-export.js`：通过
- `node --check js/features/encrypted-backup.js`：通过
- `node --check js/app.js`：通过
- `node --check js/features/messages.js`：通过
- `node --check js/imageStore.js`：通过
- `node --check js/imageMigration.js`：通过
- `node --check js/imageHealth.js`：通过
- `node --check js/integrity.js`：通过
- `node --check js/render.js`：通过
- `node --check js/features/system-card.js`：通过
- `node --check js/vendor/qrcode-generator.js`：通过

macOS 构建：

- `./build-macos-test.sh`：通过
- Swift compile：通过
- ad-hoc codesign verify：通过
- hdiutil create：通过
- hdiutil verify：通过
- DMG attach / detach：通过

内容检查：

- `.app` 未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc.json`、`*backup*.json`、zip、APK、DMG 或 IPA。
- `Resources/www` 未发现文档文件。
- DMG 挂载内容为 `月之暗面.app` 和 `Applications` symlink。

运行验收：

- 本地 `.app` 启动进程：通过。
- DMG 中 `.app` 启动进程：通过。
- 截屏确认：未完成，`screencapture` 报告无法从显示创建图片。
- localStorage / IndexedDB / 图片 / 备份 / 账本 / 锁屏 / QR：未做交互验收，需要后续人工 GUI 验收。

Git 检查：

- `git diff --check`：通过。
- `.app`、DMG 和 build 输出未进入 git 工作区可提交范围。

依赖与联网：

- 新增 macOS 平台壳使用系统 Swift / AppKit / WebKit。
- Web app 运行时没有新增 npm、CDN、远程 API 或 `type="module"`。
- wrapper 不主动加载远程 URL，外部导航默认拦截。

## 9. 最终结论

P6-05 已创建 macOS WKWebView 本地测试壳，并成功生成仓库外 `.app` 和 DMG：

- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app`
- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`

本轮保持 local-only / offline-first 边界，不打包用户数据，不改变 Web app 核心业务语义，不做正式签名或 notarization。`.app` / DMG 内容边界、构建、ad-hoc 签名、DMG 校验和基础启动通过。

由于没有完成完整 GUI 点击验收，P6-07 必须补充 macOS 运行态验收，重点覆盖 WKWebView 页面可视加载、localStorage、IndexedDB、文件导入导出、Blob 下载、图片恢复、账本、锁屏、QR、Service Worker 跳过行为和无外部请求。

在保留上述运行态风险的前提下，可以进入 P6-06 iOS 自签测试壳。
