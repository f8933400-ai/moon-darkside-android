# P6-03 跨平台测试安装包路线规划

## 1. 当前基线

- 当前分支：`feature/p6-03-cross-platform-package-planning`
- 当前基线 tag：`p6-02-low-risk-maintenance-fixes`
- 当前基线 commit：`447b531 fix: address remaining maintenance issues`
- 当前稳定基线：`v0.4.0-local-stable`，不修改旧 tag
- 修复 / 规划日期：2026-05-20
- 工作区初始状态：干净
- 本轮目标：规划测试安装包路线，不实际打包

## 2. P6 目标

P6 的目标是产出可安装的测试包，用于本机和小范围设备验证，不作为正式公开分发：

- 产出 Android APK 测试包。
- 产出 macOS DMG 测试包。
- 产出 iOS 自签测试包 / IPA 试制。
- 不改变核心 Web app 业务语义。
- 不把用户数据、真实备份或测试样本打进安装包。
- 不新增联网同步、账号、遥测、远程 API、CDN、npm 或构建时代码依赖。
- 保留 local-only / offline-first 边界：用户数据仍在目标平台的本地 WebView 存储中。

P6-00 到 P6-02 已完成封包前数据安全、锁屏 / integrity 逻辑和中低风险维护修复。P6-03 之后恢复跨平台测试安装包路线，但每个产物都必须继续经过单独功能验收。

## 3. 总体技术路线

推荐路线：

- Android：原生 Android WebView wrapper。
- macOS：原生 macOS WKWebView wrapper。
- iOS：原生 iOS WKWebView wrapper。

本轮不优先选择 Electron、Capacitor、Tauri 或 Cordova：

- 当前应用是本地离线单页应用，运行时依赖普通静态文件、localStorage、IndexedDB、Web Crypto、文件导入导出和图片 Blob。
- 轻量原生壳更利于控制本地资源加载、WebView origin、localStorage / IndexedDB 持久化、下载 / 导入能力和外部导航限制。
- 原生壳可以避免为了测试包引入 npm、CDN 或重型构建链。
- P6 目标是测试安装包，不是正式商店发布；先验证最小壳和关键能力更稳。
- 如果后续要正式跨平台发布，再重新评估更完整的跨平台框架、自动更新、签名、notarization、商店合规和崩溃诊断。

## 4. Web app 打包输入基线

后续三端 wrapper 应基于当前 Git tag / 分支复制同一份静态 app shell，不直接修改 `v0.4.0-local-stable` tag。

应包含：

- `index.html`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- 本地图标：`app_icon.png`、`app_icon_192.png`、`app_icon_512.png`、`favicon.ico`
- `js/`
- `js/features/`
- `js/vendor/`
- 当前运行所需文档可选附带，但不应影响运行壳

不得包含：

- `.git`
- `node_modules`
- stable zip
- APK / DMG / IPA
- 平台 build 输出
- 临时测试文件
- 真实备份
- 真实敏感样本
- localStorage / IndexedDB 导出数据

后续打包时建议复制到：

- `platforms/android/app/src/main/assets/www/`
- `platforms/macos/MoonWrapper/Resources/www/`
- `platforms/ios/MoonWrapper/Resources/www/`

本轮不创建这些目录。

## 5. Android APK 路线

P6-04 建议新增 `platforms/android`，使用 Android 原生 WebView wrapper。

路线建议：

- 静态资源放入 `app/src/main/assets/www`。
- 优先考虑 WebViewAssetLoader 或等价方式加载本地 assets，避免直接依赖不稳定的 `file://` 行为。
- WebView 必须启用并验证 localStorage / IndexedDB。
- 禁止不必要的外部导航；外部 URL 默认拦截或提示。
- 不新增联网同步、账号、遥测或远程 API。
- 先生成 debug APK 作为测试包；release APK 和签名策略放到后续确认。

重点验收：

1. APK 可以安装。
2. WebView 可以加载本地 app shell。
3. localStorage 可用且持久化。
4. IndexedDB 可用且持久化。
5. 主 JSON 导入 / 导出可用。
6. encrypted-json 导入 / 导出可用，Web Crypto / PBKDF2 / AES-GCM 正常。
7. 账本 JSON v1/v2 可用。
8. CSV 导出可用。
9. 图片消息 / 成员头像 / 房间背景可用。
10. 图片备份 / 恢复可用。
11. 锁屏可用。
12. 无外部请求。
13. APK 不包含真实用户数据。
14. APK 不包含真实备份样本。
15. APK 不包含 `.git` / `node_modules`。

输出目标：

- `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`

说明：

- Android APK 是测试包，不是正式发布包。
- debug APK 不能作为正式公开发布产物。
- 如果需要 release APK，后续需要明确签名、版本号和分发策略。

## 6. macOS DMG 路线

P6-05 建议新增 `platforms/macos`，使用 Swift / WKWebView wrapper。

路线建议：

- 将静态 app shell 作为 `.app` bundle 资源。
- WKWebView 加载本地 app shell，并验证同源、本地资源和文件导入导出行为。
- 生成 `.app` 后用 `hdiutil` 生成 DMG。
- 先做 unsigned / ad-hoc 本地测试 DMG。

没有 Apple Developer Program 时的限制：

- 不做 Developer ID 签名。
- 不做 notarization。
- DMG 只用于本机或小范围测试。
- 外部用户打开可能遇到 Gatekeeper 提示，需要手动允许。
- 不应把它宣传为正式可信分发包。

重点验收：

1. DMG 可以挂载。
2. `.app` 可以打开。
3. WKWebView 可以加载本地 app shell。
4. localStorage 可用且持久化。
5. IndexedDB 可用且持久化。
6. 主 JSON / encrypted-json / 账本 JSON / CSV 的导入导出能力。
7. 图片备份 / 恢复。
8. 锁屏。
9. PWA Service Worker 在 WKWebView 环境中的实际行为记录；如果不可用，不应影响本地 bundle 资源加载。
10. 无外部请求。
11. DMG 不包含真实用户数据。
12. DMG 不包含真实备份样本。
13. DMG 不包含 `.git` / `node_modules`。

输出目标：

- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`

## 7. iOS 自签测试包 / IPA 试制路线

P6-06 建议新增 `platforms/ios`，使用 Swift / WKWebView wrapper。

路线建议：

- 使用 Xcode Personal Team / 自动签名做本机设备测试。
- 优先目标是通过 Xcode 安装到自己的 iPhone / iPad。
- 如果可以导出 IPA，则命名为 selfsigned-test。
- 不承诺广泛分发。

没有 Apple Developer Program 时的限制：

- 不做 App Store 发布。
- 不做 TestFlight。
- 不做正式 Ad Hoc 分发。
- 自签 / 个人团队测试包只适合本人设备或非常有限测试。
- 可能有签名有效期、设备绑定、重新签名、信任开发者等限制。
- 不应把 IPA 称为正式可分发安装包。

重点验收：

1. Xcode 可以构建。
2. 可以通过 Xcode 安装到本人设备。
3. WKWebView 可以加载本地 app shell。
4. localStorage 可用且持久化。
5. IndexedDB 可用且持久化。
6. 主 JSON / encrypted-json / 账本 JSON / CSV 在 iOS WebView 中的导入导出限制。
7. 如下载 API 不适配，需要记录替代方案，例如分享面板或保存到 Files。
8. 图片备份 / 恢复。
9. 锁屏。
10. 无外部请求。
11. IPA 不包含真实用户数据。
12. IPA 不包含真实备份样本。
13. IPA 不包含 `.git` / `node_modules`。

输出目标：

- `/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa`

## 8. 三端共同约束

必须保持：

1. 不改核心 Web app 业务语义。
2. 不改变主 JSON / encrypted-json 语义。
3. 不改变账本 JSON v1/v2 语义。
4. 不改变图片 hydrate / externalize 语义。
5. 不改变账本隔离。
6. 不把用户数据打进安装包。
7. 不新增联网同步。
8. 不新增远程 API。
9. 不引入外部 CDN。
10. 不把测试包提交到 git。
11. 不把真实备份样本提交到 git。
12. 不把平台构建产物提交到 git。
13. 不修改 `v0.4.0-local-stable` tag。

## 9. 三端需要重点适配的 WebView 差异

后续每个平台都需要单独验证：

1. localStorage 持久化。
2. IndexedDB 持久化。
3. Blob / ObjectURL 行为。
4. File input / 文件选择。
5. 下载 JSON / CSV / encrypted-json。
6. 导入 JSON / encrypted-json。
7. Web Crypto / PBKDF2 / AES-GCM。
8. WebAuthn / 生物识别在 WebView 中是否可用。
9. Service Worker 在 WebView 中是否可用或是否需要禁用。
10. 离线资源加载。
11. 中文文件名下载。
12. 深色模式 / 移动端布局。
13. iOS WKWebView 对下载和分享的限制。
14. Android WebView 对 `file://` / asset URL / origin 的限制。
15. macOS WKWebView 对本地文件访问的限制。

## 10. 安装包输出规则

建议输出到仓库外：

- `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg`
- `/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa`

要求：

- 不提交 APK / DMG / IPA 到 git。
- 不提交构建产物目录。
- 不提交用户数据。
- 不提交真实备份。
- 不提交 `.DS_Store`。
- 不提交 `node_modules`。
- 不提交平台生成的临时文件。
- 如果后续必须提交平台工程，必须通过 `.gitignore` 明确排除 build / DerivedData / Gradle build 输出等。

## 11. 建议平台目录规划

后续可以使用：

```text
platforms/
  android/
  macos/
  ios/
```

本轮不创建。

后续如果创建，需要同步新增或更新 `.gitignore`，排除：

Android：

- `platforms/android/.gradle/`
- `platforms/android/**/build/`
- `platforms/android/local.properties`
- `platforms/android/*.apk`
- `platforms/android/*.aab`

macOS / iOS：

- `platforms/**/DerivedData/`
- `platforms/**/*.xcuserdata/`
- `platforms/**/*.xcuserstate`
- `platforms/**/*.ipa`
- `platforms/**/*.dmg`
- `platforms/**/*.app`
- `platforms/**/*.xcarchive`

通用：

- `*.apk`
- `*.dmg`
- `*.ipa`
- `*.xcarchive`
- `.DS_Store`

## 12. P6 阶段验收重点

1. Android APK 安装 / 打开。
2. macOS DMG 挂载 / 拖拽 / 打开。
3. iOS Xcode 安装 / 自签 IPA 尝试。
4. 三端 localStorage。
5. 三端 IndexedDB。
6. 三端备份导入导出。
7. 三端 encrypted-json。
8. 三端图片记录。
9. 三端账本。
10. 三端锁屏。
11. 三端无外部请求。
12. 三端无新增 JS error。
13. 三端安装包不包含用户数据。
14. 三端文档和版本号一致。

## 13. 风险与限制

1. iOS 无付费开发者账户不能作为正式分发包。
2. macOS 无 Developer ID 签名 / notarization 时可能触发 Gatekeeper。
3. Android debug APK 仅用于测试，不等于正式发布 APK。
4. WebView 与浏览器 PWA 的下载 / 文件选择 / IndexedDB 行为可能有差异。
5. 三端 wrapper 可能需要平台特定文件导入导出适配。
6. WebAuthn / 生物识别在 WebView 中可能不可用或行为不同。
7. Service Worker 在 WebView 中可能不可用或不建议依赖。
8. P6 不应破坏 v0.4.0 web stable 包。
9. P6 产生的安装包不要提交 git。

## 14. P6-04 Android 进入条件

进入 P6-04 前：

1. P6-03 已提交。
2. P6-03 tag 已创建。
3. 当前分支切到 `feature/p6-04-android-apk-test-wrapper`。
4. 工作区干净。
5. 不修改 `v0.4.0-local-stable` tag。
6. 不 push。
7. P6-04 开始时先检查 Android 构建工具是否存在。
8. 如果本机没有 Android Studio / Gradle / SDK，先停止并报告，不要硬造不可构建工程。

## 15. 最终结论

P6 建议从 Android APK 测试包开始。Android 成功后再做 macOS DMG，macOS 成功后再做 iOS 自签测试包 / IPA 试制。三端测试包完成后进入 P6-07 综合验收，最后由 P6-08 做 `v0.4.1 package-test` 封版。

P6-03 本轮只完成路线规划，没有生成 APK / DMG / IPA，没有新增平台工程，没有修改业务代码。
