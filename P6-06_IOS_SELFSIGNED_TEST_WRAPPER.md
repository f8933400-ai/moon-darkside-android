# P6-06 iOS WKWebView 自签测试壳 / IPA 试制

## 1. 构建基线

- 当前分支：`feature/p6-06-ios-selfsigned-test-wrapper`
- 基线 tag：`p6-05-macos-dmg-test-wrapper`
- 基线 commit：`db1de32 feat: add macOS WKWebView DMG test wrapper`
- 构建日期：2026-05-20
- Xcode：26.5，Build 17F42
- Swift：Apple Swift 6.3.2，swift-driver 1.148.6
- iPhoneOS SDK：`/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS26.5.sdk`
- iPhoneSimulator SDK：`/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator26.5.sdk`
- available simulator devices：当前环境未列出可用 iOS simulator 设备
- signing identity：`security find-identity -v -p codesigning` 显示 0 个有效身份
- DEVELOPMENT_TEAM：未配置
- 工作区初始状态：干净

## 2. 本轮目标

P6-06 新增 iOS WKWebView 测试壳，使用本地静态 app shell，并尝试构建 iOS 测试 app。目标是自签 / Personal Team / 本人设备测试，不是正式分发包。

本轮明确不做：

- App Store 发布。
- TestFlight。
- 正式 Ad Hoc 分发。
- 企业分发。
- Android / macOS 新产物。
- 云同步、远程 API、npm、CDN 或 `type="module"`。
- Web app 业务语义改动。

本轮未提交 `.app`、IPA、archive、证书、provisioning profile、p12 或 build 输出。

## 3. iOS 工程结构

新增 iOS 工程位于：

- `platforms/ios/README.md`
- `platforms/ios/build-ios-test.sh`
- `platforms/ios/exportOptions.plist`
- `platforms/ios/.gitignore`
- `platforms/ios/MoonDarksideIOS.xcodeproj/`
- `platforms/ios/MoonDarksideIOS/AppDelegate.swift`
- `platforms/ios/MoonDarksideIOS/ViewController.swift`
- `platforms/ios/MoonDarksideIOS/Info.plist`
- `platforms/ios/MoonDarksideIOS/Assets.xcassets/`
- `platforms/ios/MoonDarksideIOS/Resources/`

工程配置：

- Swift + UIKit + WebKit。
- Bundle Identifier：`moon.darkside.ios`
- App 显示名：`月之暗面`
- Deployment Target：iOS 15.0
- 不引入 Swift Package、CocoaPods、Capacitor、Cordova、React Native、Flutter、Electron 或 Tauri。
- 不写死未知 Team ID；用户后续可在 Xcode 中选择 Personal Team。

Web app assets 同步方式：

- `build-ios-test.sh` 在构建前从仓库根目录同步当前 Web app 静态资源到 `platforms/ios/MoonDarksideIOS/Resources/www/`。
- 同步内容包含 `index.html`、`styles.css`、`manifest.webmanifest`、`sw.js`、图标和 `js/**`。
- 同步后删除 `.DS_Store`、包产物、备份命名文件和临时文件。
- `Resources/www/` 是生成目录，已被 `.gitignore` 排除，不提交重复 Web app 副本。

构建输出：

- simulator app：`platforms/ios/build/SymRoot/Debug-iphonesimulator/MoonDarksideIOS.app`
- archive 目标：`/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.xcarchive`，本轮未生成
- IPA 目标：`/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa`，本轮未生成

## 4. WKWebView 加载模型

加载方式：

- 使用 `Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www")` 定位 app bundle 内的 `www/index.html`。
- 使用 `webView.loadFileURL(indexURL, allowingReadAccessTo: wwwDirectoryURL)` 加载本地 app shell。
- `allowingReadAccessTo` 限定为 `www` 目录，确保 CSS、JS 和图标资源可加载。

WKWebView 配置：

- 使用默认持久化 `WKWebsiteDataStore.default()`。
- JavaScript 使用 WKWebView 默认能力。
- `allowsBackForwardNavigationGestures = true`。
- 注入 `window.__MOON_IOS_WRAPPER__ = true`，作为 wrapper 环境标记。
- 注入轻量 console bridge，将 `console.log/warn/error` 输出到系统日志，便于 debug。
- `WKUIDelegate` 支持 alert / confirm / prompt。
- 当前未实现自定义 UIDocumentPicker / PHPicker / 下载分享接管；iOS WKWebView 的 file input、Blob 下载和分享行为需要 P6-07 运行态验收。

导航边界：

- 允许 `www` 目录内的 `file://` URL。
- 允许 `about:`、`blob:`、`data:`、`javascript:` scheme。
- 其它导航默认拦截并记录，不主动加载远程 URL。

Service Worker：

- iOS wrapper 使用 `file://` 加载 bundle 资源。
- 现有 `js/sw-register.js` 在 `file://` 下会跳过 Service Worker。
- 本轮未修改 `js/sw-register.js`。
- wrapper 不依赖 Service Worker；用户数据仍由 WKWebView 本地存储保存。

## 5. Signing / IPA 结果

签名环境：

- `security find-identity -v -p codesigning`：0 个有效身份。
- `DEVELOPMENT_TEAM`：未配置。
- 未发现可直接用于 Personal Team 自动签名的 Team ID。
- 没有连接 iPhone / iPad。

构建结果：

- `xcodebuild -list -project platforms/ios/MoonDarksideIOS.xcodeproj`：通过，识别 target 和 scheme。
- `./build-ios-test.sh simulator`：通过。
- simulator build 使用 target 方式和 `CODE_SIGNING_ALLOWED=NO`，输出 ignored build 目录中的 simulator app。
- scheme + generic simulator destination 方式因当前环境没有 available simulator runtime / destinations 失败；脚本已避开该路径。
- device build：未执行，原因是没有 signing identity / Team ID / 连接设备。
- archive：未执行，原因同上。
- export IPA：未执行，原因是未生成 archive 且缺少签名条件。

IPA 状态：

- `/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa` 未生成。
- 本轮不声称 IPA 可用或可分发。
- 下一步需要用户在 Xcode 中选择 Personal Team、连接本人设备后，再尝试 `./build-ios-test.sh device`、`archive` 和 `export`。

## 6. 验收矩阵

| 编号 | 场景 | 预期 | 实际结果 | 状态 | 备注 |
|---|---|---|---|---|---|
| I1 | 工程可被 Xcode 识别 | xcodebuild 可列出 target / scheme | 已通过 | 通过 | `MoonDarksideIOS` |
| I2 | Web assets 同步 | 只同步运行必需静态资源 | 已同步到 ignored `Resources/www` | 通过 | `.DS_Store` 被删除 |
| I3 | simulator build | 至少构建 simulator app | 已通过 | 通过 | target build + `CODE_SIGNING_ALLOWED=NO` |
| I4 | simulator app 内容边界 | 不含 `.git` / `node_modules` / 真实备份 / 包产物 | 内容检查无命中 | 通过 | build 输出未提交 |
| I5 | iOS simulator 运行 | App 可打开并显示首页 | 未执行 | 未测 | 当前没有可用 simulator device |
| I6 | device build | 可签名构建本人设备 app | 未执行 | 未测 | 缺少 signing identity / Team ID / 设备 |
| I7 | archive | 可生成 `.xcarchive` | 未执行 | 未测 | 签名条件不足 |
| I8 | IPA export | 可导出 selfsigned-test IPA | 未执行 | 未测 | IPA 未生成 |
| I9 | WKWebView 加载 app shell | 显示首页 | 已实现 `loadFileURL` | 代码通过 | 未运行确认 |
| I10 | localStorage | 重启后主记录仍在 | 未执行 | 未测 | 需 P6-07 运行验收 |
| I11 | IndexedDB | 图片等外置数据持久化 | 未执行 | 未测 | 需 P6-07 运行验收 |
| I12 | 主记录新增 | 新增记录可保存 | 未执行 | 未测 | 需 P6-07 运行验收 |
| I13 | 图片消息 | 选择图片、显示、重启后仍显示 | 未执行 | 未测 | file input 行为待验收 |
| I14 | 成员头像 | 选择头像、保存、恢复 | 未执行 | 未测 | 需 P6-07 运行验收 |
| I15 | 房间背景 | 选择背景、保存、恢复 | 未执行 | 未测 | 需 P6-07 运行验收 |
| I16 | 主 JSON 导出 / 导入 | 导出和导入可用 | 未执行 | 未测 | Blob 下载 / file input 待验收 |
| I17 | encrypted-json 导出 / 导入 | 完整主记录加密备份可用 | 未执行 | 未测 | Web app 语义未改 |
| I18 | 账本首页 | 账本可打开和新增记录 | 未执行 | 未测 | 需 P6-07 运行验收 |
| I19 | 账本 JSON v1/v2 | 导入导出不影响主记录 | 未执行 | 未测 | Web app 语义未改 |
| I20 | CSV | 账本 CSV 导出尝试 | 未执行 | 未测 | iOS 下载 / 分享待适配评估 |
| I21 | 锁屏 | 设置密码并解锁 | 未执行 | 未测 | Web app 语义未改 |
| I22 | QR 功能 | 本地 vendor QR 可用 | 未执行 | 未测 | `js/vendor/**` 已同步 |
| I23 | 无外部请求 | 不联网、不新增同步 | 静态边界通过 | 代码通过 | 运行态需日志 / 代理验收 |
| I24 | 不包含用户数据 | app / IPA 不打包 localStorage / IndexedDB / 真实备份 | simulator app 内容检查通过 | 通过 | IPA 未生成 |

## 7. 已知限制

- 没有 Apple Developer Program 时，不能将本轮产物作为正式分发包。
- 当前没有 signing identity / Team ID，无法完成 device build、archive 或 IPA export。
- 当前没有可用 iOS simulator device，未进行 simulator 运行验收。
- Personal Team 设备测试通常需要在 Xcode 中选择 Team、连接本人设备，并可能需要定期重新签名。
- iOS WKWebView 的 file input、Blob 下载、保存到 Files、分享面板、中文文件名和 IndexedDB 持久化需要设备或可用 simulator 运行态验证。
- Service Worker 在 `file://` 下跳过，这是预期行为；iOS wrapper 不依赖 Service Worker。
- 当前 simulator build 为了避开缺失 simulator runtime 造成的 actool 失败，没有将 asset catalog 加入 build phase；app 壳功能不受影响，后续有完整 iOS runtime / signing 环境后可恢复 target app icon 编译。

## 8. 测试命令与结果

工具链：

- `xcode-select -p`：`/Applications/Xcode.app/Contents/Developer`
- `xcodebuild -version`：Xcode 26.5 / Build 17F42
- `swift --version`：Apple Swift 6.3.2
- `xcrun --sdk iphoneos --show-sdk-path`：通过
- `xcrun --sdk iphonesimulator --show-sdk-path`：通过
- `xcrun simctl list devices available`：当前无可用 iOS simulator devices
- `xcrun xctrace list devices`：只列出本机 Mac
- `security find-identity -v -p codesigning`：0 valid identities found

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

iOS 构建：

- `xcodebuild -list -project platforms/ios/MoonDarksideIOS.xcodeproj`：通过
- `./build-ios-test.sh simulator`：通过
- device build：未执行，签名身份 / Team ID / 设备不足
- archive：未执行，签名身份 / Team ID / 设备不足
- export IPA：未执行，未生成 archive 且签名条件不足

内容检查：

- simulator app 未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc.json`、`*backup*.json`、zip、APK、DMG、IPA 或文档文件。
- `Resources/www` 生成目录未提交。
- IPA 未生成，因此未执行 IPA 内容检查。

Git 检查：

- `git diff --check`：通过。
- build、`Resources/www`、`.app`、archive、IPA、profiles 和证书均未进入 git 工作区可提交范围。

依赖与联网：

- 新增 iOS 平台壳使用系统 Swift / UIKit / WebKit。
- Web app 运行时没有新增 npm、CDN、远程 API 或 `type="module"`。
- wrapper 不主动加载远程 URL，外部导航默认拦截。

## 9. 最终结论

P6-06 已创建 iOS WKWebView 自签测试壳工程，并完成 simulator app 构建验证：

- iOS 工程：`platforms/ios/MoonDarksideIOS.xcodeproj`
- simulator app：`platforms/ios/build/SymRoot/Debug-iphonesimulator/MoonDarksideIOS.app`

由于当前环境没有 signing identity / Team ID / iPhone 或 iPad，也没有可用 iOS simulator device，本轮未完成设备安装、archive 或 IPA export。`/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa` 未生成，本轮不声称 IPA 可用。

本轮保持 local-only / offline-first 边界，不打包用户数据，不改变 Web app 核心业务语义，不做 App Store / TestFlight / 正式 Ad Hoc。P6-07 必须补充 iOS 运行态验收，重点覆盖 WKWebView 页面可视加载、localStorage、IndexedDB、文件导入导出、Blob 下载或分享、图片恢复、账本、锁屏、QR、Service Worker 跳过行为和无外部请求。

在保留上述签名和运行态风险的前提下，可以进入 P6-07 三端安装包综合验收。
