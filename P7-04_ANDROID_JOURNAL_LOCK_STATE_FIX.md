# P7-04 Android 主记录访问锁定状态 v2

## 问题描述

Android APK 灰度测试中，用户已设置锁屏密码并开启“退出或切到后台后回到首页”后，从主记录界面切后台再回到应用，主记录访问仍可能没有被正确锁定。表现为回到首页后再次进入主记录时不稳定地绕过锁屏，或后台期间没有可靠执行锁定流程。

## 复现步骤

1. 设置进入密码锁。
2. 开启“退出或切到后台后回到首页”。
3. 进入主记录界面并完成解锁。
4. 按 Home、最近任务切换或锁屏。
5. 回到应用。
6. 再次从伪装首页进入主记录。

预期：必须显示锁屏，密码或有效解锁成功后才能进入主记录。

## 根因分析

P7-04 第一轮已经新增 `journalAccessLocked`，但仍有两个关键薄弱点：

- 首页隐藏入口仍然会先执行 `setAppMode("journal")`，再由 `startLock()` 显示锁屏。这意味着“进入主记录”和“要求解锁”没有被入口守卫拆开，状态异常或异步时序下仍可能先进入主记录访问态。
- Android 原生 `onPause()` 只尝试执行 Web 回调，没有设置 `pendingBackgroundHomeReturn`。如果 WebView 在后台阶段没有稳定执行 `evaluateJavascript`，而 `onStop()` 未及时触发或被系统路径跳过，`onResume()` fallback 可能不会补偿锁定。

最终根因：回首页和锁定状态已经存在，但进入主记录没有统一前置守卫；Android `onPause` fallback 标记也不够稳。

## 设置项

- UI 控件：`#resetToCover`
- 文案：`退出或切到后台后回到首页`
- prefs 字段：`prefs.resetToCover`

本轮继续使用现有字段，没有新增设置项、localStorage key、IndexedDB schema 或主数据字段。

## 主记录访问锁定状态

实现位置：`js/app.js`

- `journalAccessLocked`
- `pendingJournalEntryReason`
- `hasJournalLockCredential()`
- `isJournalAccessLocked()`
- `requireJournalUnlock(reason)`
- `clearJournalUnlockRequirement(reason)`
- `journalRequiresUnlock()`

规则：

- `journalAccessLocked` 表示“主记录访问需要解锁”。
- 后台回首页且存在 `prefs.lockKdf` 或 legacy `prefs.lockHash` 时，先设置 `journalAccessLocked = true`。
- 回首页、刷新账本首页、关闭弹窗、`renderLedger()`、`appMode="cover"` 都不会清除 locked。
- 只有密码验证成功、生物识别成功或清除锁屏凭据时，才清除 locked。

## 后台处理流程

实现位置：`js/app.js`

`window.__moonAndroidAppBackgrounded(reason)` 调用 `returnToCoverForAndroidBackground(reason)`：

1. 读取 `prefs.resetToCover`。
2. 未开启时直接返回，不改变原有行为。
3. 已开启且存在锁屏凭据时，先 `requireJournalUnlock("android-background:" + reason)`。
4. 再关闭主记录弹层 / drawer，并切回伪装首页 / 本地账本首页。
5. 未设置锁屏密码时，只回首页，不显示锁屏。

## 进入主记录统一守卫

实现位置：`js/app.js`

- 首页隐藏入口改为调用 `requestEnterJournal("cover-hidden-entry")`。
- `requestEnterJournal()` 检查：
  - 没有锁屏凭据：允许进入。
  - 有锁屏凭据且 `journalAccessLocked === true`：停留在当前页面，调用 `showJournalLock()` 显示锁屏。
  - 有锁屏凭据但已经解锁：允许进入。
- 真正切入主记录只由 `enterJournalActually(reason)` 执行。
- 密码 / 生物识别成功后，`finishUnlockSuccess()` 先清除 locked；如果有 pending 进入请求，再调用 `enterJournalActually()`。
- 密码错误不会清除 locked，也不会进入主记录。

当前搜索确认没有其它 `setAppMode("journal")` 直接入口；实际切入点集中在 `enterJournalActually()`。

## Android Lifecycle Bridge

实现位置：`platforms/android/app/src/main/java/moon/darkside/android/MainActivity.java`

本轮增强：

- `onPause()` 现在也设置 `pendingBackgroundHomeReturn = true`。
- `onResume()` 如果发现 pending，会补发 `__moonAndroidAppBackgrounded("resumeFallback")`。
- 增加不包含用户数据的 logcat 灰度日志：
  - `onUserLeaveHint`
  - `onPause`
  - `onStop`
  - `onResume`
  - `notify backgrounded / foregrounded`
  - `evaluateJavascript delivered / failed`

Android 原生层仍只通知生命周期，不读写业务数据。

## Android APK 重构建结果

- Android Gradle `:app:assembleDebug`：构建通过。
- APK 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：3.5M（3,640,468 bytes）
- APK 精确内容检查未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- 用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件。
- APK 不提交进 git。

## 实机测试结果

当前本机没有连接 Android 设备，`adb devices` 为空；当前本机没有可用 Android AVD，`emulator -list-avds` 为空。因此 Android 实机后台锁定验收未完成。

灰度设备需重点覆盖：

- 开启后台回首页 + 已设置锁屏。
- Home / 最近任务 / 手机锁屏。
- 后台回首页后，在首页操作账本，再进入主记录仍需解锁。
- 正确密码解锁后可进入主记录，错误密码不能进入。
- 再次切后台后应重新锁定。
- 未设置锁屏密码时只回首页，不强制锁。
- 关闭后台回首页时不强制改变原行为。

## 回归测试结果

- 长弹窗：本轮未修改 `index.html`、`styles.css` 或弹窗相关结构，P7-01 修复保持不变。
- Android Downloads：本轮未修改导出入口、`js/downloads.js` 或 `MoonAndroidDownloads`，P7-02 修复保持不变。
- 生物识别：本轮未新增生物识别功能，只让成功解锁继续复用 `finishUnlockSuccess()`。
- 备份语义、账本隔离、图片 hydrate / externalize 和 `messageIntegrity` 均未改动。

## 已知限制

- 本机无 Android 设备 / AVD，运行态必须继续通过灰度设备确认。
- `journalAccessLocked` 是内存级会话状态；应用冷启动时默认为 locked，如果存在锁屏凭据，进入主记录仍会要求解锁。
