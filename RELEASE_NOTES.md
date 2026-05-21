# 发布说明

## P7-04 v2 Android 主记录后台锁定状态

P7-04 v2 继续修复 Android APK 中开启“退出或切到后台后回到首页”并设置密码时，主记录后台返回后没有稳定锁定的问题：

- 主记录入口新增 `requestEnterJournal()` 守卫，不再先切到 `journal` 再显示锁屏。
- `journalAccessLocked` 现在明确表示“主记录访问需要解锁”；回首页、刷新账本首页、关闭弹窗或 `appMode="cover"` 不会清除该状态。
- Android 后台回调会在回首页前先 `requireJournalUnlock()`；再次进入主记录时必须先密码或有效解锁。
- Android `onPause()` 也设置 native pending fallback，避免 WebView 后台阶段未执行 JS 时，`onResume()` 无法补发锁定逻辑。
- 增加不含用户数据的灰度调试日志，便于确认 lifecycle 和锁定状态。
- 已重新生成 Android test APK 到 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`，APK 不提交进 git。

本轮没有修改主 data schema、localStorage key、IndexedDB schema、主 JSON / encrypted-json 内容语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize、伪装账本入口逻辑或 `messageIntegrity`，也没有新增 npm、CDN、`type="module"`、云同步或远程 API。长弹窗滚动修复和 Android Downloads 导出保存修复保持不变。

## P7-04 Android 后台回首页后的锁定状态

P7-04 修复 Android APK 中开启“退出或切到后台后回到首页”并已设置密码时，后台返回后主记录访问没有稳定进入 locked 状态的问题：

- Web 层新增内存级 `journalAccessLocked` 会话状态，区分“是否设置了密码”和“当前主记录访问是否已经解锁”。
- Android lifecycle 回调触发后台回首页时，如果存在 `lockKdf` 或 legacy `lockHash`，会先标记主记录访问需要解锁，再回到伪装首页。
- 回首页、刷新首页账本或关闭弹窗不会清除 locked 状态；只有密码 / 生物识别解锁成功或清除锁屏凭据才会清除。
- 从伪装首页重新进入主记录时，会通过现有锁屏入口检查 locked 状态，已设置密码时必须先解锁。
- 已重新生成 Android test APK 到 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`，APK 不提交进 git。

本轮没有修改主 data schema、localStorage key、IndexedDB schema、主 JSON / encrypted-json 内容语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize、伪装账本入口逻辑或 `messageIntegrity`，也没有新增 npm、CDN、`type="module"`、云同步或远程 API。长弹窗滚动修复、Android Downloads 导出保存修复和 Android BiometricPrompt bridge 保持不变。

## P7-03 Android 后台回首页 / 锁定 / 生物识别

P7-03 修复 Android APK 灰度中剩余的后台返回和生物识别路径问题：

- Android APK 新增 Activity lifecycle bridge，让“退出或切到后台后回到首页”在 `onUserLeaveHint`、`onPause`、`onStop` 和 `onResume` fallback 中生效。
- 开启该选项后，从主记录切到后台再回到应用，会回到伪装层 / 本地账本首页。
- 已设置锁屏密码时，再次进入主记录仍会走现有锁屏流程；未设置锁屏密码时只回首页，不强制显示锁屏。
- Android APK 生物识别新增 `MoonAndroidBiometric` bridge，改走原生 AndroidX `BiometricPrompt`，不再在 APK 中落到 WebAuthn 浏览器不支持提示。
- Web / PWA 浏览器版保留原 WebAuthn 生物识别路径。
- 已重新生成 Android test APK 到 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`，APK 不提交进 git。

本轮没有修改主 data schema、localStorage key、IndexedDB schema、主 JSON / encrypted-json 内容语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize、伪装账本入口逻辑或 `messageIntegrity`，也没有新增 npm、CDN、`type="module"`、云同步或远程 API。已完成的长弹窗滚动修复和 Android Downloads 导出保存修复保持不变。

## P7-02 Android 导出保存到 Downloads

P7-02 修复 Android APK 灰度中导出只弹提示、不生成文件的问题：

- Android APK 新增 `MoonAndroidDownloads` JS bridge，由 Web 导出流程把文件内容交给原生保存。
- Android 10+ 使用 `MediaStore.Downloads` 写入系统公共“下载 / Download”目录；Android 9 及以下保留受权限保护的公共 Downloads 写入路径。
- 主 JSON、encrypted-json、复盘 Markdown / TXT、账本 JSON、账本 CSV 和系统名片 PNG 导出都会优先走 Android 保存接口。
- 保存成功后会提示 `已保存到系统下载目录：Download/xxx`，不再只显示“暂未接管下载”。
- 普通桌面 Web / PWA 仍保留原有浏览器下载行为；普通聊天页不应误弹下载提示。
- 已重新生成 Android test APK 到 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`，APK 不提交进 git。

本轮没有修改主 data schema、localStorage key、IndexedDB schema、主 JSON / encrypted-json 内容语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize、伪装账本入口逻辑或 `messageIntegrity`，也没有新增 npm、CDN、`type="module"`、云同步或远程 API。

## P7-01 Android 移动端弹窗系统修复

P7-01 修复 Android 灰度中发现的移动端长弹窗滚动、关闭和底部操作遮挡问题：

- “时间线 / 回顾”和“高级搜索”改为固定标题区 + 独立滚动内容区，320px / 375px 宽度下可滑动、按钮可触达且无横向溢出。
- 移除会盖住内容的全局 sticky 底部操作区，避免出现多个关闭入口或底部按钮与内容重叠。
- 两个重点弹窗只保留一个明确的右上关闭按钮；高级搜索窄屏打开时不再自动弹出键盘。
- 本地存储状态和备份健康检查接回统一弹窗打开 / 关闭路径，打开时会重置滚动位置。
- 已重新生成 Android test APK 到 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`，APK 不提交进 git。

本轮没有修改数据结构、localStorage key、IndexedDB schema、主 JSON / encrypted-json 语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize、伪装账本入口逻辑或 `messageIntegrity`，也没有新增 npm、CDN、`type="module"` 或联网请求。

## P6-08 v0.4.1 package-test 封版

P6-08 完成 `v0.4.1-package-test` 封版记录，并准备外部 package-test 归档包：

- Android debug APK 重新构建通过，APK 保持仓库外输出；当前没有设备 / AVD 运行验收，因此不声称 Android 运行态通过。
- macOS `.app` / DMG 重新构建通过，DMG verify 通过；`.app` 可启动进程，但完整 GUI 点击验收仍未完成。
- iOS WKWebView 工程 simulator build 通过；当前没有 Team ID、有效 codesigning identity、可用 simulator device / runtime 或连接设备，因此未生成 archive 或 IPA。
- package-test 定位为本机 / 小范围测试基线，不是正式公开发布版，不是三端运行全通过版。
- 安装包和外部归档不预置用户数据；用户仍需自行使用主 JSON、encrypted-json 和账本 JSON 备份。
- 本轮不做 Android release signing、macOS Developer ID 签名 / notarization、iOS App Store / TestFlight / 正式 Ad Hoc 分发。
- 下一阶段进入 P7 设备运行验收，重点补 Android 设备 / AVD、macOS GUI、iOS simulator / 真机签名和三端文件导入导出差异。

本轮没有提交 APK / DMG / IPA / `.app` / archive / build 输出，没有新增 Web app 运行时联网请求、npm、CDN 或 `type="module"`。

## P6-07 三端安装包功能验收

P6-07 完成 Android / macOS / iOS 三端测试壳的综合验收记录：

- 重新构建 Android debug APK、macOS `.app` / DMG、iOS simulator app，三端构建均通过。
- 重新检查 Android APK、macOS `.app` / DMG 和 iOS simulator app 内容边界，未发现 `.git`、`node_modules`、真实备份、用户数据或敏感样本进入测试产物。
- Android 当前没有连接设备或 AVD，因此未完成 APK 安装、WebView 运行、localStorage、IndexedDB、图片、备份、账本、锁屏和 QR 的运行态验收。
- macOS `.app` 和 DMG 中 `.app` 能启动进程，DMG 可挂载和校验；完整 GUI 点击验收、Blob 下载、中文文件名和文件选择仍需后续人工验证。
- iOS 当前没有 Team ID、有效 codesigning identity、可用 simulator device / runtime 或连接设备；simulator build 通过，但未运行，未生成 archive 或 IPA。
- 三端 WebView 下载、文件选择、中文文件名、分享 / 保存路径和 Service Worker 行为差异已记录为 package-test 已知限制。

本轮没有新增正式发布流程，没有提交 APK / DMG / IPA / `.app` / archive / build 输出，没有新增 Web app 运行时联网请求、npm、CDN 或 `type="module"`。下一阶段进入 P6-08 `v0.4.1 package-test` 封版。

## P6-06 iOS WKWebView 自签测试壳 / IPA 试制

P6-06 新增 iOS WKWebView 自签测试壳工程：

- 新增 `platforms/ios/` Swift + UIKit + WebKit 工程，使用 `WKWebView` 加载 app bundle 内的本地静态 app shell。
- 构建脚本在构建前同步当前 Web app 静态资源到 iOS app 的 `Resources/www/` 生成目录，不提交重复 Web app 副本，并排除 `.git`、`node_modules`、真实备份、包产物和临时文件。
- `WKWebView` 使用 `loadFileURL(..., allowingReadAccessTo:)` 加载本地 app shell，外部导航默认拦截；wrapper 不依赖 Service Worker。
- 已通过 simulator app 构建验证，构建产物保留在 ignored build 目录，不提交 `.app`、archive 或 IPA。
- 当前环境没有 signing identity / Team ID / 连接设备，也没有可用 iOS simulator device，因此未进行设备安装、运行态验收、archive 或 IPA export。
- 本轮没有修改 Web app 核心业务语义，没有改变主记录、encrypted-json、账本、图片、锁屏或 integrity 规则。

本轮 iOS 产物定位为自签 / 本人设备测试壳，不是正式分发包。没有 Apple Developer Program 时，不能做 App Store、TestFlight 或正式 Ad Hoc 分发；后续需要在 Xcode 中选择 Personal Team 并连接设备后继续试制 IPA 或安装测试。下一阶段进入三端综合验收。

## P6-05 macOS WKWebView DMG 测试包

P6-05 新增 macOS WKWebView DMG 测试壳，并生成本地测试 `.app` / DMG：

- 新增 `platforms/macos/` 轻量 Swift + AppKit + WebKit 工程，不创建复杂 Xcode project，也不引入 Electron、npm、CDN 或远程依赖。
- 构建脚本在打包时复制当前静态 app shell 到 `.app/Contents/Resources/www/`，不重复提交 Web app 副本，并排除 `.git`、`node_modules`、真实备份、包产物和临时文件。
- WKWebView 使用 `loadFileURL(..., allowingReadAccessTo:)` 加载本地 app shell，外部导航默认拦截；wrapper 不依赖 Service Worker。
- 生成 `.app` 和 DMG 到仓库外，不提交 `.app`、DMG 或 build 输出。
- 本轮只做 ad-hoc 签名，不做 Developer ID 签名，不做 notarization；外部机器打开可能遇到 Gatekeeper 提示。
- 本轮没有修改 Web app 核心业务语义，没有改变主记录、encrypted-json、账本、图片、锁屏或 integrity 规则。

当前已确认 `.app` 和 DMG 中 `.app` 可以启动进程，DMG 可以挂载和校验；完整 GUI 交互验收仍需后续覆盖 localStorage、IndexedDB、文件导入导出、Blob 下载、图片、账本、锁屏和 QR。下一阶段进入 iOS 自签测试壳。

## P6-04 Android WebView APK 测试包

P6-04 新增 Android WebView APK 测试壳，并生成 debug APK 测试包：

- 新增 `platforms/android/` Android Gradle 工程，使用 Java `MainActivity` 和 AndroidX `WebViewAssetLoader` 加载 APK 内本地静态 app shell。
- Web app 静态资源在 Gradle 构建时复制到 generated assets，不重复提交 `assets/www`，并排除 `.git`、`node_modules`、真实备份、包产物和临时文件。
- Android debug APK 输出到仓库外 `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`，不提交 APK 或 build 输出。
- AndroidManifest 不申请 `INTERNET`、相机、定位、通讯录、麦克风或存储权限；测试壳不新增联网同步。
- WebView 启用 JavaScript、DOM storage 和文件选择器，支持后续验证 localStorage、IndexedDB、JSON 导入和图片选择；Blob 下载 / 导出行为仍需设备运行验收。
- 本轮没有修改 Web app 核心业务语义，没有改变主记录、encrypted-json、账本、图片、锁屏或 integrity 规则。

当前环境没有连接 Android 设备或可用模拟器，因此 APK 安装、打开、localStorage、IndexedDB、图片、备份、账本、锁屏和 QR 的运行态验收已记录为未执行，留到 P6-07 综合验收或人工设备测试。下一阶段进入 macOS DMG 测试壳。

## P6-03 跨平台测试安装包路线规划

P6-03 恢复跨平台测试安装包路线规划，但本轮仍不实际打包，也不新增平台工程：

- 新增 `P6-03_CROSS_PLATFORM_PACKAGE_PLAN.md`，规划 Android APK、macOS DMG、iOS 自签测试包 / IPA 试制路线。
- 明确 P6 产物用于本机和小范围测试，不是正式公开分发包。
- 明确没有 Apple Developer Program 时，macOS 缺少 Developer ID 签名 / notarization 可能触发 Gatekeeper，iOS 不能使用 App Store、TestFlight 或正式 Ad Hoc 分发。
- 明确三端都必须保持 local-only / offline-first，不把用户数据、真实备份或敏感样本打进安装包，不新增联网同步。
- 明确安装包和平台构建产物不提交 git，建议输出到仓库外。
- 明确下一阶段从 `feature/p6-04-android-apk-test-wrapper` 的 Android WebView APK 测试壳开始。

本轮没有业务代码改动，没有生成 APK / DMG / IPA，没有新增 npm、CDN、远程 API、构建步骤或 `type="module"`。

## P6-02 低风险维护修复与封包前回归

P6-02 继续暂停 Android APK / macOS DMG / iOS IPA 试制，收束代码审查中剩余的中低风险维护问题：

- 整理 Service Worker app shell stale-while-revalidate 边角行为，避免无缓存且刷新失败时返回不明确结果。
- `dataUrlToBlob` 支持带 charset / name 参数的 data URL 和 UTF-8 非 base64 内容。
- IndexedDB 图片 ObjectURL cache 增加 LRU 上限和释放，删除图片或清空缓存时同步 revoke。
- 账本统计、分类汇总、账户汇总和预算判断改用 cents 整数计算，避免 `0.1 + 0.2` 这类浮点边界误差。
- 系统名片 QR 生成 / 识别库从 `system-card.js` 内嵌 `Function(atob(...))` 拆为普通本地 vendor script，并加入 PWA app shell。
- 封面 / 账本模式下不再运行 journal 的 60 秒定时任务；进入记录界面后自动关闭过期投票仍正常。

本轮未生成 APK / DMG / IPA，未新增 npm、CDN、远程 API、构建步骤或 `type="module"`。下一阶段恢复 P6-03 跨平台测试安装包路线规划。

## P6-01 锁屏 / integrity / 业务逻辑小坑修复

P6-01 继续暂停 Android APK / macOS DMG / iOS 自签测试包试制，先收束代码审查中确认的中高优先级逻辑问题：

- 新设置的进入密码锁改用带独立 salt 的 PBKDF2-SHA256；旧 `lockHash` 仍可解锁，并在成功解锁后尝试迁移到新 `lockKdf`。
- 禁止“只开启生物识别但没有进入密码”的无效锁屏状态；旧偏好中发现该状态会自动纠正。
- 锁屏文案明确说明它只是本地轻量隐私门帘，不是数据加密；备份文件保护仍应使用 encrypted-json。
- `messageIntegrity` 新生成值改用真实 U+001F 字段分隔符，同时兼容旧版字面 `"\\u001f"` 分隔符生成的消息。
- 编辑已有 fronting 记录时不再因为结束时间为空而误关其它正在进行的记录；新建进行中记录仍会关闭其它 open 记录。
- 导入旧式 inline 图片备份成功后会清理图片迁移完成标记，给下次启动留下迁移兜底。
- 主记录 JSON / encrypted-json 导入后会立即结算已过期的进行中投票，不再最多等待 60 秒定时器。

本轮未处理 Service Worker stale-while-revalidate、`dataUrlToBlob` charset、urlCache、账本金额整数化、QR 库拆分、封面模式计时器和更广泛普通保存路径 rollback；这些进入 P6-02 或后续阶段。跨平台打包继续暂停。

## P6-00 封包前关键数据安全修复

P6-00 暂停 Android APK / macOS DMG / iOS 自签测试包试制，优先修复封包前 P1 数据安全问题：

- 导入主 JSON / encrypted-json 时，图片 externalize 改用唯一 import 图片 ID，避免覆盖本机已有同名 IndexedDB 图片。
- 导入或图片迁移失败时，会 best-effort 清理本轮已经写入 IndexedDB 的图片，并恢复内存数据状态。
- 删除成员 / 群组 / 消息时增加 rollback；保存成功后才清理对应头像、背景或消息图片。
- 删除成员时清理任务、投票、fronting 和私聊中的非历史悬挂引用；不删除历史消息。
- fronting 新增 / 删除 / 结束和清空数据路径增加 `save()` 失败回滚，避免 UI 与 localStorage 状态错位。

本轮未处理锁屏密码强度、仅生物识别不设密码、`messageIntegrity` 分隔符、Service Worker 缓存策略、`dataUrlToBlob` charset、urlCache、账本金额浮点、QR 库 eval 风格和封面模式计时器等中低风险项；这些进入 P6-01 或后续阶段。

## v0.4.0-local-stable

这是《月之暗面》的 v0.4.0 本地稳定版。重点是把 P4 本地账本隔离和 P5 数据安全、图片备份恢复、PWA 离线缓存验收收束为可分发的 local stable 包。

本版本仍然是 local-only / offline-first：没有云同步、账号、遥测、CDN、npm、构建步骤、`type="module"` 或远程 API。

主要内容：

- 完成 P4 账本能力：本地账本 CRUD、日 / 月 / 年 / 全部统计、分类管理、月度预算、分类预算、CSS 条形图、账本 JSON v2 和 CSV 专用导出。
- 完成账本隔离：主记录 JSON / encrypted-json 不包含 `ledgerRecords` 或 `ledgerSettings`；账本 records 使用 `moonLedger.records.v1`，账本 settings 使用 `moonLedger.settings.v1`。
- encrypted-json 固定导出完整主记录范围，不再跟随当前群组 / 指定群组导出范围；账本仍需单独备份。
- 导入主 JSON 时，如果原备份存在 `messageIntegrity` 异常，异常消息不会被图片 externalize 流程静默洗成“校验正常”。
- 完成图片备份 / 恢复验收：成员头像、房间背景、聊天图片可通过完整 JSON / encrypted-json hydrate 和 externalize 恢复。
- 完成图片一致性最小修复：新增图片写入后如果主数据保存失败，会尽量回滚新图片和内存状态；旧头像 / 背景延后到保存成功后清理。
- 完成 PWA 离线缓存验收：Service Worker 只缓存静态 app shell，缓存名为 `moon-app-shell-v0.4.0`，不缓存用户数据、导出备份、图片 Blob、IndexedDB 或 localStorage。
- stable zip 通过封版检查，不包含 `.git`、`node_modules`、临时文件、`.DS_Store`、真实备份或敏感样本。

已知风险：

- localStorage 与 IndexedDB 不是浏览器级事务；本版本已做最小回滚和 best-effort 清理，但极端浏览器存储失败仍需用户保留备份。
- 普通 JSON current / room 主要用于局部恢复或排查，不是严格脱敏分享文件，也不能替代完整备份。
- `file://` 下不能注册 Service Worker，这是浏览器限制；需要 PWA 离线壳缓存时请使用 localhost 或 HTTPS。
- PWA 不是备份替代品。更换浏览器、清理站点数据、重装系统或换设备前仍需导出完整 JSON / encrypted-json 和账本备份。
- 不同浏览器的 PWA 安装提示条件可能不同。

## v0.3.0-local-stable

这是《月之暗面》的 P0-P2 本地稳定版。重点是把多意识体本地记录、前台日志、交接任务、隐私导出、照护、时间线和复盘报告打磨到可长期自用的基础状态。

本版本仍然是 local-only / offline-first：没有云同步、账号、遥测、CDN、npm、构建步骤或远程 API。

## P3-04 加密备份补充

P3-04 增加了可选的加密完整 JSON 备份：

- 导出格式新增“加密完整 JSON 备份”，文件建议后缀为 `.moonenc.json`。
- 加密使用浏览器 Web Crypto API，在本机完成 PBKDF2 / AES-GCM，不联网，不引入第三方加密库。
- 加密前仍复用完整 JSON hydrate 流程，外置图片会先补回导出副本里的 DataURL。
- 加密 envelope 只包含 `app/kind/version/kdf/cipher/payload` 等元信息和密文，不包含明文 JSON、密码或密钥。
- 密码不会保存到 `localStorage`，也不会写入备份文件。忘记密码后无法恢复加密备份。
- 加密只保护导出的备份文件，不会加密当前浏览器里的本机 `localStorage`、账本记录或 IndexedDB 图片库。
- 普通 JSON 备份仍可用。导入加密备份成功后，解密出的普通完整 JSON 会走现有导入流程，图片仍会 externalize 回 IndexedDB。
- 仍建议至少保留一份安全保存的备份，并谨慎分享任何完整备份。

## P3-05 PWA / 本地安装基础支持

P3-05 增加基础 PWA 支持：

- 新增 `manifest.webmanifest`，声明应用名称、独立窗口显示、主题色和现有 `app_icon.png` 图标。
- 新增 `sw.js`，只缓存静态 app shell：入口 HTML、样式、manifest、图标和本地 `js/` 脚本。
- 新增普通脚本 `js/sw-register.js`，仅在 `https:` 或本机 `http://localhost` / `127.0.0.1` / `[::1]` 下注册 Service Worker；`file://` 下静默跳过。
- PWA 安装是可选能力，不提供云同步，不替代完整 JSON 备份或加密备份。
- 用户数据仍保存在当前浏览器的 `localStorage` + IndexedDB 中。Service Worker 不缓存用户导出的 JSON / `.moonenc.json` 文件、图片 Blob、IndexedDB 内容或 `localStorage` 内容。
- 更新 app 文件后，浏览器可能需要刷新页面或清理此站点缓存 / Service Worker 才能看到最新静态文件。

## P4-01 账本隔离与专用备份

P4-01 将账本备份从主记录完整备份中拆出：

- 主记录 JSON / encrypted-json 默认不再包含 `ledgerRecords`。
- 主记录导入检测到旧版备份里的 `ledgerRecords` 时只提示，不会自动覆盖当前账本。
- 账本首页新增账本专用 JSON 导出，格式为 `app: "moon-ledger"`、`kind: "ledger-backup"`、`version: 1`、`createdAt` 和 `records`。
- 账本首页新增 CSV 导出，字段为 `date,type,amount,category,account,paymentMethod,note,createdAt,updatedAt`。
- 账本 JSON 导入目前只支持替换当前账本，确认后只写入 `moonLedger.records.v1`，不影响主记录数据、偏好、IndexedDB 图片或 `messageIntegrity`。
- 旧版主备份如需迁移账本，请到账本页使用账本导入功能；账本导入会拒绝读取包含 `rooms/messages/members` 等主记录字段的文件。
- 账本专用备份可能包含现实财务信息，仍需谨慎保存和分享。

## P4-02 真实账本 CRUD 与统计

P4-02 将首页账本升级为普通本地账本：

- 支持新增、编辑、删除收入和支出记录。
- 记录字段包含日期、金额、分类、账户 / 钱包、支付方式和备注，金额为 0 的记录会被保留。
- 支持按日、月、年、全部查看，并支持类型和分类筛选。
- 统计支出合计、收入合计、结余、记录条数、分类汇总、账户 / 钱包汇总和最近记录。
- 账本 JSON / CSV 专用导出导入继续与主记录完整备份隔离。

## P4-03 分类管理、预算与统计图表基础版

P4-03 增强账本设置和统计视图：

- 新增独立账本设置键 `moonLedger.settings.v1`，保存分类、月度预算和默认账本视图。
- 默认分类会在没有账本设置时自动补齐，分类支持添加、编辑、归档和恢复。
- 新增月度总预算和分类预算，只统计支出，并显示剩余额度、已用比例和超支提示。
- 支出 / 收入分类汇总增加本地 CSS 条形图，不引入图表库或联网依赖。
- 账本 JSON 备份升级到 version 2，包含 `records` 和 `settings`；version 1 账本备份仍可导入，且只替换账本记录、保留当前账本设置。
- 分类改名不会批量迁移旧记录里的 `category` 字符串，分类预算按 `categoryName` 兼容旧记录。
- CSV 仍只导出账本记录；主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。

## P4-04 账本首页体验增强

P4-04 打磨本地账本首页的日常可用性：

- 优化账本首页布局，补充筛选摘要、空态提示和轻量操作反馈。
- 分类管理按支出 / 收入分组展示，归档分类与常用分类更容易区分。
- 预算区域补充非月视图提示、分类预算空态和更清晰的预算百分比。
- 账本备份区域说明 JSON / CSV 用途区别：JSON v2 包含 `records` 和 `settings`，CSV 只包含 records。
- 移动端表单、按钮、分类名、备注和条形图继续避免横向溢出。
- 主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。

## P4-05 账本与记录层隔离验收

P4-05 完成账本隔离验收：

- 确认主记录 JSON / encrypted-json 不包含账本记录或账本设置。
- 确认主记录导入不会覆盖当前账本，旧版含 `ledgerRecords` 的主备份也不会自动恢复到账本。
- 确认账本 JSON v2 只包含 `records` 和 `settings`，不包含主记录数据、偏好、图片或 `messageIntegrity`。
- 确认账本 JSON v1 导入只替换 records 并保留当前 settings，v2 导入替换 records + settings。
- 确认坏 settings 导入失败且尽量保留当前账本。
- 确认 CSV 只导出账本记录，存储健康面板只显示账本大小和数量统计，不泄露账本明细。

## P5-00 下一阶段路线规划

P5-00 完成 P4 后的下一阶段规划：

- 新增 `P5-00_NEXT_PHASE_PLAN.md`，复盘 P1-P4 已完成能力和当前稳定边界。
- 明确 P4 已以账本与主记录层隔离验收收束。
- 将之前多轮延后的图片一致性问题列为 P5-01 优先排查对象。
- 规划 P5-01 到 P5-05 路线：图片一致性审计、最小修复、图片备份恢复验收、PWA 离线缓存验收和 v0.4.0 local stable 封版验收。
- 本轮没有修改业务代码、导入导出语义、账本隔离语义、存储 schema 或本地依赖边界。

## P5-01 图片一致性与高风险数据安全审计

P5-01 完成图片一致性与高风险数据安全审计：

- 新增 `P5-01_IMAGE_AND_DATA_CONSISTENCY_AUDIT.md`，逐项复核此前潜在漏洞清单，并记录当前代码确认、复现路径、风险评级、影响范围和 P5-02 建议修复策略。
- 覆盖 encrypted-json 范围语义、`messageIntegrity` 导入行为、图片 IndexedDB 与主数据保存一致性、删除图片时序、局部 JSON 范围、inline handler id 安全和清空群组语义。
- 明确本轮不做业务修复，只输出审计结论和 P5-02 最小修复顺序。
- 没有新增依赖、联网请求、构建步骤或 `type="module"`。

## P5-02 数据安全与一致性最小修复

P5-02 根据 P5-01 审计结论完成最小必要修复：

- 新增 `P5-02_DATA_SAFETY_MINIMAL_FIXES.md`，记录修复范围、验收结果和剩余风险。
- “加密完整 JSON 备份”现在固定导出全部主记录数据，不再跟随当前群组 / 指定群组范围；主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。
- 导入时如果原备份存在 `messageIntegrity` 异常，异常消息不会再被图片 externalize 流程静默重算成“校验正常”，导入确认和完成提示都会说明异常数量。
- 聊天图片、成员头像和房间背景写入 IndexedDB 后，如果主数据保存失败，会尽量删除本次新写入图片并恢复内存状态；删除或替换头像 / 背景时，旧图延后到保存成功后清理。
- inline handler 中来自数据的 id 改用安全 JS 字符串参数，降低异常 id 导致点击失效或注入的风险。
- 普通 JSON 的当前群组 / 指定群组导出增加语义说明和导出前确认，避免误认为是完整备份或脱敏分享文件。
- 清空群组但不清空聊天记录时增加额外确认，明确会删除被清空群组中的聊天记录。
- 本轮没有新增依赖、联网请求、构建步骤或 `type="module"`，没有修改账本隔离语义。

## P5-03 图片备份 / 恢复验收

P5-03 完成图片备份、恢复、hydrate 和 externalize 链路验收：

- 新增 `P5-03_IMAGE_BACKUP_RESTORE_ACCEPTANCE.md`，记录成员头像、房间背景、聊天图片、完整 JSON、encrypted-json、局部 JSON、`imageHealth` 和 P5-02 回滚修复的验收矩阵。
- 确认完整 JSON 导出会在导出副本中 hydrate `imageData/avatarData/backgroundData`，且不改变运行时主 data 或 IndexedDB 图片。
- 确认完整 JSON / encrypted-json 导入后，图片会 externalize 回 IndexedDB，主 data 恢复为 `imageId/avatarId/backgroundId` 引用。
- 确认 encrypted-json 固定完整范围，并可恢复成员头像、房间背景和聊天图片。
- 确认普通 JSON current / room 的图片范围跟随现有局部导出语义；局部 JSON 仍不是完整备份或脱敏分享文件。
- 确认 `imageHealth` 能发现缺失引用、孤儿图片，并能从完整 JSON 备份修复缺失图片。
- 本轮未发现阻断 bug，没有业务代码改动，没有新增依赖、联网请求、构建步骤或 `type="module"`。

## P5-04 PWA 离线缓存与本地稳定包验收

P5-04 完成 PWA 离线缓存和本地稳定包前置验收：

- 新增 `P5-04_PWA_OFFLINE_STABLE_ACCEPTANCE.md`，记录 Service Worker 注册、app shell 缓存、离线刷新、manifest、图标和不缓存用户数据的验收结果。
- 将 Service Worker 缓存名更新为 `moon-app-shell-p5-04-v0.4.0`，避免继续停留在旧 app shell 缓存版本。
- Service Worker 仍只缓存静态 app shell，并在 activate 阶段清理旧 `moon-app-shell-*` 缓存；本轮没有改成缓存所有请求。
- manifest 新增 192 / 512 本地图标，`APP_SHELL` 同步缓存这些静态图标。
- 验收确认导出的主 JSON、encrypted-json、账本 JSON、CSV、图片 Blob、IndexedDB 和 localStorage 不进入 Service Worker Cache Storage。
- `file://` 下继续安全跳过 Service Worker；localhost / HTTPS 条件下可注册。
- 主 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`；图片备份 / 恢复语义和账本隔离语义未受影响。
- 没有新增依赖、联网请求、构建步骤或 `type="module"`。

## P0-P2 已完成功能

P0 阶段：

- 成员、群组、私聊基础管理。
- 成员档案 2.0：扩展资料、自定义字段、状态历史、头像外置。
- 前台日志 2.0：支持前台、共前台、靠近前台、旁观 / 在场、混合 / 模糊、未知 / 不确定。
- 接续面板：汇总最近前台、交接、消息、投票、任务、照护信息。
- 交接模板 + 任务接力：交接可创建任务，任务可开始、暂停、恢复、完成、删除。
- 高级搜索：内存搜索消息、成员资料、房间、交接、投票、前台和任务。

P1 阶段：

- 投票升级为议题 / 决议 / 复盘：说明、理由、暂停、恢复、取消、决议和复盘时间。
- 公开资料分级 / 隐私桶：控制系统资料和部分字段的展示与脱敏导出。
- 身体照护板 / 需求看板：照护记录和照护清单，可选写入聊天。
- 备份健康检查 UI：检查缺失图片、孤儿图片，并可从完整 JSON 修复。
- 自定义术语系统：成员、系统、前台、交接、任务、照护、接续等界面词可自定义。

P2 阶段：

- 时间线总览 + 月度回顾：只读聚合消息、前台、交接、议题、任务和照护记录。
- 复盘报告导出：按日期范围导出 Markdown / TXT，可选择章节并套用脱敏选项。
- P2 总体验收：确认导入导出、图片外置、messageIntegrity、P0-P1 回归和移动端弹窗。
- 发布前维护：补齐本地图标资源，更新架构文档。

## 重要修复

- JSON 导入失败时不会覆盖当前 data。
- `storage.exportBackup()` 与 UI 完整 JSON 导出图片 hydrate 语义一致。
- 投票默认截止时间使用本地时间，避免时区偏移。
- 清空聊天 / 数据清零后 `nextSeq` 会从剩余消息重算；消息全部清空后，下一条校验码从 `0001` 开始。
- `renderChat()` 保持 async + `_renderChatSeq`，降低异步图片渲染竞态。
- 图片外置后，新聊天图片、成员头像和房间背景长期保存为 IndexedDB Blob + 主数据 ID。
- `app_icon.png` 和 `favicon.ico` 已补齐，避免本地浏览器资源 404。

## 数据兼容说明

- 主数据仍保存在 `localStorage` 的 `osddDidLocalJournal.v2`。
- 偏好保存在 `osddDidLocalJournal.prefs.v1`。
- 账本记录保存在 `moonLedger.records.v1`，账本设置保存在 `moonLedger.settings.v1`，与主记录完整 JSON / encrypted-json 备份隔离。
- 图片保存在 IndexedDB：`moon-images` / `images`。
- 旧备份中的 `imageData/avatarData/backgroundData` 导入后会 externalize 到 IndexedDB。
- 完整 JSON 导出会 hydrate 图片 DataURL，以便单文件备份。
- 可选加密备份会加密 hydrate 后的完整 JSON 导出副本；普通 JSON 路径保持可用。
- `messageIntegrity` 规则没有在本版本发布验证中改动。
- visibility / 隐私桶只影响应用内展示和导出，不是加密隔离。

完整 JSON 备份包含 P0-P2 主记录数据字段，例如 `frontingLogs`、`tasks`、`careLogs`、`careChecklist`、`polls` 新字段、`systemProfileVisibility`、`memberRelations` 和 `externalSystemCards`；不再默认包含 `ledgerRecords` 或 `ledgerSettings`。

## 已知限制

- 高级搜索是内存搜索，不是持久化全文索引。
- localStorage 仍是主结构化数据存储；数据量极大时可能需要 IndexedDB / SQLite 结构化迁移。
- 没有虚拟滚动；消息或时间线特别多时，DOM 可能变重。
- visibility / 隐私桶不是加密隔离。
- 加密备份只保护导出的备份文件，不保护当前浏览器本地存储；忘记备份密码无法恢复。
- 复盘报告脱敏不是 NLP 脱敏，导出前需要人工检查敏感信息。
- 照护板不是医疗建议、治疗建议或危机干预。
- 时间线 / 月度回顾只是本地记录统计，不代表状态判断或诊断。
- 没有云同步、账号、遥测或远程 API。

## 下一阶段计划

下一阶段可以考虑：

- P3 前先做一次真实使用数据量下的性能评估。
- 视需要增加更细的复盘报告模板或导出预览。
- 评估是否需要结构化存储迁移，例如 IndexedDB 主数据表或 SQLite。
- 评估更好的移动端长列表体验，例如虚拟滚动。
- 继续保持 local-only / offline-first，不引入远程服务作为默认路径。
