# P6-08 v0.4.1 package-test 封版

## 1. 封版基线

- 当前分支：`feature/p6-08-v0-4-1-package-test`
- 基线 tag：`p6-07-cross-platform-package-acceptance`
- 基线 commit：`02f4b75 chore: complete cross-platform package acceptance`
- 封版日期：2026-05-21
- 工作区初始状态：干净
- 本轮提交目标：`chore: finalize v0.4.1 package test`

## 2. package-test 定位

`v0.4.1-package-test` 是 Web app 代码与三端测试壳的 package-test 封版，不是正式公开发布版，也不是三端运行全通过版。

允许的结论：

- Android debug APK 构建通过，但设备 / AVD 运行验收未完成。
- macOS `.app` / DMG 构建通过，进程启动和 DMG 校验通过，但完整 GUI 点击验收未完成。
- iOS WKWebView 工程 simulator build 通过，但没有可用 simulator device / runtime，未运行；没有 Team ID、codesigning identity 或连接设备，因此没有生成 IPA。
- Android APK、macOS DMG 和 iOS 工程都只用于本机或小范围测试。
- 用户数据不会预置到安装包中；用户仍需自行使用主 JSON、encrypted-json 和账本 JSON 备份。

明确不做：

- 不做 Android 正式 release signing。
- 不做 macOS Developer ID 签名或 notarization。
- 不做 iOS App Store、TestFlight、正式 Ad Hoc 或企业分发。
- 不声称三端 localStorage、IndexedDB、图片、备份、账本、锁屏和 QR 运行态全通过。

## 3. P6 阶段完成情况

- P6-00：完成封包前关键数据安全修复，包括导入图片唯一 ID、图片迁移失败清理、删除路径图片清理和关键 save 失败回滚。
- P6-01：完成锁屏 PBKDF2 + salt、仅生物识别无密码状态纠正、messageIntegrity 分隔符兼容、fronting 历史编辑误关修复、导入旧图迁移兜底和导入后过期投票立即关闭。
- P6-02：完成 Service Worker 边角、data URL 兼容、图片 URL cache 释放、账本 cents 计算、QR vendor script 拆分和封面模式定时任务修复。
- P6-03：完成跨平台测试安装包路线规划，明确 Android APK、macOS DMG 和 iOS 自签测试包均为测试用途。
- P6-04：新增 Android WebView APK 测试壳，并生成 debug APK。
- P6-05：新增 macOS WKWebView DMG 测试壳，并生成本地测试 `.app` / DMG。
- P6-06：新增 iOS WKWebView 自签测试壳，完成 simulator build；未生成 IPA。
- P6-07：完成三端构建和包内容综合验收文档，明确运行态验收缺口。
- P6-08：封为 `v0.4.1-package-test`，生成外部 package-test zip，并进入 P7 设备运行验收阶段。

## 4. 产物清单

| 产物 | 路径 | 当前状态 | 大小 |
|---|---|---|---|
| Android debug APK | `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk` | 存在，重新构建通过 | 1.7M / 1,750,189 bytes |
| macOS `.app` | `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app` | 存在，重新构建通过 | 1.5M |
| macOS DMG | `/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg` | 存在，重新构建和 verify 通过 | 860K / 880,762 bytes |
| iOS simulator app | `platforms/ios/build/SymRoot/Debug-iphonesimulator/MoonDarksideIOS.app` | simulator build 通过 | 1.4M |
| iOS IPA | `/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa` | 未生成 | 不适用 |
| iOS archive | `/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.xcarchive` | 未生成 | 不适用 |
| package-test zip | `/Users/pareo/Documents/月之暗面-v0.4.1-package-test.zip` | 提交并打 tag 后生成，仓库外保存 | 生成后记录于最终输出 |

## 5. 构建结果

| 平台 | 构建对象 | 结果 | 备注 |
|---|---|---|---|
| Web | 源码快照 / 语法检查 | pass | `node --check` 全部通过 |
| Android | debug APK | pass | `gradle :app:assembleDebug` 通过；未设备运行 |
| macOS | `.app` / DMG | pass | Swift build、ad-hoc codesign、hdiutil create / verify 通过；未完整 GUI 点击 |
| iOS | simulator build | pass | `./build-ios-test.sh simulator` 通过；无 simulator runtime / device 运行 |
| iOS | device / archive / IPA | blocked | 无 Team ID、codesigning identity 和连接设备 |

## 6. 运行验收状态

| 能力 | Web | Android | macOS | iOS | 备注 |
|---|---|---|---|---|---|
| app shell 打开 | pass | not tested | partial | not tested | macOS 仅确认进程启动；Android / iOS 未运行 |
| localStorage | not re-tested | not tested | not tested | not tested | 三端 wrapper 需设备 / GUI 运行态验收 |
| IndexedDB | not re-tested | not tested | not tested | not tested | 图片外置存储需运行态验证 |
| 主记录 | not re-tested | not tested | not tested | not tested | P6-08 不声称三端主记录运行通过 |
| 图片 | not re-tested | not tested | not tested | not tested | 图片消息 / 头像 / 背景需 P7 验收 |
| 主 JSON | not re-tested | not tested | not tested | not tested | 导出下载和导入 file input 需平台验证 |
| encrypted-json | not re-tested | not tested | not tested | not tested | encrypted-json 语义未改，但运行态未验收 |
| 账本 JSON | not re-tested | not tested | not tested | not tested | 账本导入导出需平台验证 |
| CSV | not re-tested | not tested | not tested | not tested | Blob 下载 / 文件名需平台验证 |
| 锁屏 | not re-tested | not tested | not tested | not tested | 锁屏逻辑未改，三端运行态未验收 |
| QR | not re-tested | not tested | not tested | not tested | vendor script 已打包，运行态需验证 |
| 无外部请求 | partial | partial | partial | partial | 静态边界通过，运行态需日志或代理确认 |

## 7. 包内容检查

Android APK：

- APK 内容检查通过。
- `unzip -l` grep 命中 `assets/www/js/features/backup-health-ui.js`、`assets/www/js/features/encrypted-backup.js` 和 `res/xml/backup_rules.xml`。
- 上述命中是运行时 JS 文件名和 Android backup rules，不是真实用户备份。
- 未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、zip、DMG、IPA 或真实备份文件。

macOS `.app`：

- `.app` 内容检查通过。
- 未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc.json`、`*backup*.json`、zip、APK、DMG 或 IPA。

macOS DMG：

- `hdiutil verify` 通过。
- DMG 可挂载和卸载。
- 挂载内容未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc.json` 或 `*backup*.json`。

iOS：

- IPA 未生成，IPA 内容检查不适用。
- simulator app 内容检查通过，未发现 `.git`、`node_modules`、`.DS_Store`、真实备份、moonenc、zip、APK、DMG 或 IPA。

package-test zip：

- 按封版流程在 `p6-08-v0-4-1-package-test` 和 `v0.4.1-package-test` tag 创建后生成。
- 验证要求：不含 `.git`、`node_modules`、`.DS_Store`、真实备份、用户数据、p12、mobileprovision 或 xcarchive。
- 允许包含仓库外 Android debug APK 和 macOS test DMG。
- 当前 iOS 没有 IPA，因此 package-test zip 不包含 IPA。

## 8. package-test zip 内容

目标路径：

- `/Users/pareo/Documents/月之暗面-v0.4.1-package-test.zip`

建议结构：

- `README_PACKAGE_TEST.md`：说明 package-test 定位、内容和限制。
- `web/`：当前 `v0.4.1-package-test` 源码快照中的运行文件与文档。
- `packages/android/月之暗面-v0.4.1-android-test.apk`：Android debug APK 测试包。
- `packages/macos/月之暗面-v0.4.1-macos-test.dmg`：macOS unsigned / non-notarized DMG 测试包。
- `packages/ios/README_IOS_LIMITATIONS.txt`：说明当前没有 iOS IPA 的原因。

不包含：

- `.git`、`node_modules`、平台 build 输出、`.app`、`.xcarchive`、真实备份、用户数据、签名证书、provisioning profile、p12。
- iOS IPA；当前环境没有 Team ID、codesigning identity 和连接设备，未生成 IPA。

## 9. 已知限制

1. Android 缺少设备 / AVD 运行验收；APK 安装、打开、localStorage、IndexedDB、图片、备份、账本、锁屏和 QR 未做运行态确认。
2. macOS `.app` 只做 ad-hoc 签名，DMG 未 notarized，外部机器可能被 Gatekeeper 拦截。
3. macOS 完整 GUI 点击验收未完成；当前仅确认 `.app` / DMG 中 `.app` 可启动进程。
4. iOS 没有 Team ID、codesigning identity 或连接设备，未执行 device build、archive 或 IPA export。
5. iOS simulator build 通过，但没有可用 simulator device / runtime，因此未运行。
6. 三端文件导入导出差异尚需设备级测试。
7. WebView 下载、文件选择、Blob URL、中文文件名和分享 / 保存路径需要 P7 继续验收。
8. PWA Service Worker 不作为三端 wrapper 运行依赖；wrapper 使用本地 bundle / assets 加载。
9. `v0.4.1-package-test` 不是正式发布版，不适合公开分发给非测试对象。

## 10. 下一阶段建议

- P7-00：设备运行验收计划。
- P7-01：Android 设备 / AVD 运行验收。
- P7-02：macOS GUI 完整交互验收。
- P7-03：iOS simulator / 设备签名验收。
- P7-04：三端文件导入导出专项适配。
- P7-05：v0.4.2 runtime-test 封版。

## 11. 最终结论

P6-08 可以封为 `v0.4.1-package-test`：

- Web app 代码和三端测试壳已形成可归档的 package-test 基线。
- Android APK、macOS `.app` / DMG 和 iOS simulator build 的构建 smoke check 通过。
- 包内容边界检查未发现用户数据、真实备份、`.git` 或 `node_modules` 被打入测试产物。
- iOS IPA 未生成，三端运行态验收不完整，因此不能作为正式发布版或“三端运行全通过”版本。

建议创建 `p6-08-v0-4-1-package-test` 和 `v0.4.1-package-test` tag，生成外部 package-test zip，然后进入 P7 设备运行验收阶段。
