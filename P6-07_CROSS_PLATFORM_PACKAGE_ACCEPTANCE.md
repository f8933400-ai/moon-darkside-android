# P6-07 三端安装包功能验收

## 1. 验收基线

- 当前分支：`feature/p6-07-cross-platform-package-acceptance`
- 基线 tag：`p6-06-ios-selfsigned-test-wrapper`
- 基线 commit：`4b4dcf3 feat: add iOS WKWebView self-signed test wrapper`
- 验收日期：2026-05-21
- macOS：26.5，Build 25F71
- 工作区初始状态：干净

## 2. 验收对象

- Android APK：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
  - 大小：1.7M / 1,750,189 bytes
  - 工程：`platforms/android`
- macOS `.app`：`/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app`
  - 大小：1.5M
  - 工程：`platforms/macos`
- macOS DMG：`/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`
  - 大小：860K / 880,756 bytes
- iOS simulator build：
  - 工程：`platforms/ios`
  - simulator app：`platforms/ios/build/SymRoot/Debug-iphonesimulator/MoonDarksideIOS.app`
  - 大小：1.4M
- iOS IPA：
  - 未生成。
  - 原因：当前环境没有 signing identity / Team ID / 连接设备，也没有可用 iOS simulator devices 或 runtimes。

## 3. 三端构建结果

Android：

- `gradle :app:assembleDebug`：通过。
- APK 已重新复制到 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`。
- Gradle 输出仍有 Gradle 10 兼容性 deprecation 提示，不影响 debug APK 构建。

macOS：

- `platforms/macos/build-macos-test.sh`：通过。
- Swift 编译：通过。
- ad-hoc codesign：通过。
- hdiutil create：通过。
- hdiutil verify：通过。
- `.app` 和 DMG 已重新输出到仓库外目标路径。

iOS：

- `platforms/ios/build-ios-test.sh simulator`：通过。
- 构建方式：target build + `CODE_SIGNING_ALLOWED=NO`。
- device build：未执行，缺少 signing identity / Team ID / 连接设备。
- archive：未执行，缺少签名条件。
- IPA export：未执行，未生成 archive 且缺少签名条件。

## 4. Android 验收

构建：

- Android Studio JBR Java 21.0.10、Gradle 9.5.1、Android SDK `android-36.1` / build-tools `36.0.0`、`36.1.0`、`37.0.0` 可用。
- debug APK 构建通过。
- APK 内容检查通过。
- AndroidManifest 不申请 `INTERNET` 或敏感权限。

运行：

- `adb devices` 未列出设备。
- `emulator -list-avds` 未列出 AVD。
- Android 设备 / 模拟器运行验收未完成。

因此以下 Android 运行态能力状态为 `not tested` / `blocked`：

- APK 安装和打开。
- WebView 首页可视加载。
- localStorage 持久化。
- IndexedDB 持久化。
- 文本消息、图片消息、成员头像、房间背景。
- 主 JSON / encrypted-json 导入导出。
- 账本 JSON v1/v2、CSV。
- 锁屏、QR。
- Blob 下载、文件选择、中文文件名。
- logcat / 代理层无外部请求确认。

后续人工验收清单：

1. 连接 Android 设备或创建 AVD。
2. `adb install -r /Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`。
3. 打开 app，逐项验证首页、localStorage、IndexedDB、图片、备份、账本、锁屏、QR。
4. 重点观察 DownloadListener、file input 和 Blob URL 下载行为。
5. 结合 logcat 或代理确认无外部请求。

## 5. macOS 验收

构建与包：

- `.app` 构建通过。
- DMG 构建和 verify 通过。
- DMG 可挂载和卸载。
- DMG 内容为 `月之暗面.app` 和 `Applications` symlink。
- `.app` / DMG 未发现 `.git`、`node_modules`、`.DS_Store`、真实备份或包产物。

运行：

- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app` 可启动进程。
- DMG 中的 `月之暗面.app` 可启动进程。
- 已能正常退出测试 app。
- 完整 GUI 点击验收未完成；当前环境无法可靠执行可视点击和页面截图确认。

因此以下 macOS 运行态能力状态为 `partial` / `not tested`：

- app shell 可视加载：进程启动通过，页面可视未完成。
- localStorage / IndexedDB：未做交互验证。
- 图片消息 / 头像 / 背景：未做交互验证。
- 主 JSON / encrypted-json：未做导入导出验证。
- 账本 JSON / CSV：未做交互验证。
- 锁屏 / QR：未做交互验证。
- Blob 下载、中文文件名、文件选择：未做交互验证。

已知分发限制：

- `.app` 仅 ad-hoc 签名。
- DMG 未 notarized。
- 没有 Developer ID 签名。
- 外部机器打开可能遇到 Gatekeeper 提示。

## 6. iOS 验收

构建：

- Xcode 26.5、Swift 6.3.2、iPhoneOS SDK 26.5、iPhoneSimulator SDK 26.5 可用。
- `xcodebuild -list` 可识别 iOS 工程 target / scheme。
- `./build-ios-test.sh simulator` 构建通过。
- simulator app 内容检查通过。

运行与签名：

- `xcrun simctl list devices available` 未列出可用 simulator device。
- `xcrun simctl list runtimes` 未列出 runtime。
- `security find-identity -v -p codesigning` 显示 0 个有效身份。
- 没有 Team ID。
- 没有连接 iPhone / iPad。
- 未执行 simulator 运行。
- 未执行 device build。
- 未执行 archive。
- 未生成 IPA。

因此以下 iOS 运行态能力状态为 `not tested` / `blocked`：

- simulator 安装和启动。
- 真机安装和启动。
- WKWebView 首页可视加载。
- localStorage / IndexedDB。
- 图片消息 / 头像 / 背景。
- 主 JSON / encrypted-json。
- 账本 JSON / CSV。
- 锁屏 / QR。
- file input、Blob 下载、分享面板、中文文件名。

后续进入 iOS 设备测试前需要：

1. 在 Xcode 中配置 Personal Team。
2. 确认可用 signing identity。
3. 连接本人 iPhone / iPad，或安装可用 iOS simulator runtime 并创建 simulator device。
4. 重新执行 `./build-ios-test.sh device`、`archive`、`export`，按实际结果记录 IPA 是否能生成。

## 7. 三端共同验收矩阵

| 能力 | Android | macOS | iOS | 备注 |
|---|---|---|---|---|
| 构建 | pass | pass | pass | iOS 为 simulator build |
| 打开 app shell | not tested | partial | not tested | macOS 仅确认进程启动 |
| localStorage | not tested | not tested | not tested | 需运行态交互 |
| IndexedDB | not tested | not tested | not tested | 需运行态交互 |
| 主记录新增 | not tested | not tested | not tested | 需运行态交互 |
| 图片消息 | not tested | not tested | not tested | 需运行态交互 |
| 成员头像 | not tested | not tested | not tested | 需运行态交互 |
| 房间背景 | not tested | not tested | not tested | 需运行态交互 |
| 主 JSON 导出 | not tested | not tested | not tested | 下载行为需验证 |
| 主 JSON 导入 | not tested | not tested | not tested | file input 需验证 |
| encrypted-json 导出 | not tested | not tested | not tested | 下载行为需验证 |
| encrypted-json 导入 | not tested | not tested | not tested | file input 需验证 |
| 账本首页 | not tested | not tested | not tested | 需运行态交互 |
| 账本 JSON v2 导出 | not tested | not tested | not tested | 下载行为需验证 |
| 账本 JSON v1/v2 导入 | not tested | not tested | not tested | file input 需验证 |
| CSV 导出 | not tested | not tested | not tested | 下载行为需验证 |
| 锁屏 | not tested | not tested | not tested | 需运行态交互 |
| QR | not tested | not tested | not tested | 需运行态交互 |
| 无外部请求 | partial | partial | partial | 静态边界通过，运行态未测 |
| 不包含用户数据 | pass | pass | pass | IPA 未生成，iOS simulator app 检查通过 |

## 8. 文件导入导出差异

Android WebView：

- `onShowFileChooser` 已实现，理论上支持 input type=file。
- `DownloadListener` 当前只记录和提示，不接管 Blob 保存。
- 主 JSON / encrypted-json / 账本 JSON / CSV 导出是否可用未运行验证。
- 需要 P6-08 或后续决定是否实现 Android 原生保存 / 分享接管。

macOS WKWebView：

- `WKUIDelegate` 已实现文件选择。
- `WKDownloadDelegate` 已实现保存面板。
- Blob download、中文文件名和实际保存路径未完成交互验证。
- `file://` 下 Service Worker 跳过，wrapper 不依赖 SW。

iOS WKWebView：

- 当前未实现自定义 UIDocumentPicker / PHPicker / 分享面板接管。
- iOS WKWebView 对 Blob 下载、file input、保存到 Files、中文文件名的行为未验证。
- IPA 未生成，设备安装未完成。
- 这些是 P6-08 前后最需要补足的运行态差异。

## 9. 安装包内容检查

Android APK：

- APK 存在，大小 1.7M / 1,750,189 bytes。
- `unzip -l` grep 命中：
  - `assets/www/js/features/backup-health-ui.js`
  - `assets/www/js/features/encrypted-backup.js`
  - `res/xml/backup_rules.xml`
- 这些是运行时 JS 文件和 Android backup rules，不是真实用户备份。
- 未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、zip、DMG、IPA 或真实备份文件。

macOS `.app`：

- `.app` 存在，大小 1.5M。
- 未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc.json`、`*backup*.json`、zip、APK、DMG 或 IPA。

macOS DMG：

- DMG 存在，大小 860K / 880,756 bytes。
- `hdiutil verify` 通过。
- DMG 可挂载，包含 `月之暗面.app` 和 `Applications` symlink。
- 挂载内容未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc.json`、`*backup*.json` 或包产物。

iOS：

- IPA 未生成，IPA 内容检查不适用。
- simulator app 存在，大小 1.4M。
- simulator app 未发现 `.git`、`node_modules`、`.DS_Store`、真实备份、moonenc、zip、APK、DMG、IPA 或文档文件。

## 10. 发现的问题

1. Android 设备 / AVD 缺失
   - 平台：Android
   - 风险等级：中
   - 影响：无法确认 WebView localStorage / IndexedDB / 文件导入导出 / 图片 / 账本 / 锁屏 / QR 运行态。
   - 是否阻断 P6-08：不阻断文档封版，但阻断对 Android “运行通过”的表述。
   - 处理：记录为 P6-08 / 后续人工验收项。

2. macOS 完整 GUI 交互未完成
   - 平台：macOS
   - 风险等级：中
   - 影响：只能确认 `.app` / DMG app 进程启动，未确认页面可视与交互能力。
   - 是否阻断 P6-08：不阻断，但 P6-08 不能声称 macOS 交互全通过。
   - 处理：保留人工 GUI 验收清单。

3. iOS simulator runtime / device / signing 均缺失
   - 平台：iOS
   - 风险等级：高
   - 影响：无法运行 simulator app，无法 device build，无法 archive / IPA。
   - 是否阻断 P6-08：不阻断三端工程封版记录，但阻断 iOS 安装包可用性结论。
   - 处理：需要用户配置 Xcode Personal Team、签名身份和设备或 simulator runtime。

4. 三端文件导入导出差异未完成运行态验收
   - 平台：Android / macOS / iOS
   - 风险等级：中
   - 影响：Blob 下载、中文文件名、file input、分享 / 保存路径不能确认。
   - 是否阻断 P6-08：应在 P6-08 中列为 package-test 已知限制。
   - 处理：后续按平台补最小原生接管或记录操作方式。

## 11. 本轮修复情况

本轮仅做验收、重新构建、包内容检查和文档更新，没有修改 wrapper 源码或 Web app 业务代码。

修改文件：

- `P6-07_CROSS_PLATFORM_PACKAGE_ACCEPTANCE.md`
- `RELEASE_NOTES.md`

## 12. 测试命令与结果

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
- `node --check js/vendor/jsqr.js`：通过

构建：

- Android `gradle :app:assembleDebug`：通过。
- macOS `./build-macos-test.sh`：通过。
- iOS `./build-ios-test.sh simulator`：通过。

包内容检查：

- Android APK：通过，grep 命中均为运行时文件名，不是真实备份。
- macOS `.app`：通过。
- macOS DMG：verify / attach / 内容检查通过。
- iOS simulator app：通过。
- iOS IPA：不适用，未生成。

Git：

- `git diff --check`：通过。
- build 输出、APK、DMG、`.app`、IPA、archive、profiles、p12 均未进入可提交范围。

外部请求：

- 本轮未新增 Web app 运行时联网请求。
- Android wrapper 不申请 `INTERNET` 权限。
- macOS / iOS wrapper 均默认拦截外部导航。
- 运行态无外部请求仍需设备 / GUI / 日志或代理验收。

## 13. 已知限制

- 三端产物均为测试包，不是正式公开分发包。
- Android 缺少设备 / AVD，运行态验收未完成。
- macOS `.app` 仅 ad-hoc 签名，DMG 未 notarized，外部机器可能遇到 Gatekeeper 提示。
- macOS 完整 GUI 点击验收未完成。
- iOS 无 Team ID、无 signing identity、无 simulator devices / runtimes、无 iPhone / iPad，未生成 IPA。
- WebView 下载、文件选择、中文文件名和分享 / 保存路径存在平台差异，尚未运行态确认。
- Service Worker 不作为三端 wrapper 的运行依赖；file:// / app bundle 场景下跳过是可接受行为。
- PWA 浏览器版与 WebView wrapper 在存储、下载、文件选择和 Service Worker 行为上可能不同。

## 14. 最终结论

P6-07 完成了三端安装包工程和产物的综合构建回归、内容边界检查和可执行的基础启动检查：

- Android APK：构建通过，内容检查通过，未运行。
- macOS `.app` / DMG：构建通过，DMG verify / attach 通过，进程启动通过，完整交互未完成。
- iOS：simulator build 通过，未运行，未 device build，未 archive，未 IPA。

P6-07 可以进入 P6-08 `v0.4.1 package-test` 封版阶段，但 P6-08 必须把这些限制写入封版结论：三端测试包仍不是正式分发包；Android 和 iOS 尚未完成设备运行验收；macOS 尚未完成完整 GUI 交互验收；文件导入导出差异仍需人工或后续最小修复确认。
