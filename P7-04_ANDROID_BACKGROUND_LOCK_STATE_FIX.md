# P7-04 Android 后台回首页后的锁定状态修复

## 问题描述

Android APK 灰度测试中，在同时满足以下条件时：

- 已开启“退出或切到后台后回到首页”
- 已设置进入密码锁
- 用户当前在主记录界面

切到后台再回到应用后，应用可能已经回到伪装首页 / 本地账本首页，但主记录访问没有被明确标记为 locked。再次从首页进入主记录时，可能不稳定地绕过锁屏。

## 复现步骤

1. 打开 Android APK。
2. 设置进入密码。
3. 开启“退出或切到后台后回到首页”。
4. 进入主记录界面并完成解锁。
5. 按 Home 或切到其他应用。
6. 回到应用。
7. 再次尝试进入主记录。

预期：回到伪装首页后，再进主记录必须输入密码或通过可用解锁方式。

## 根因分析

P7-03 已经补上 Android lifecycle bridge，并能通知 Web 层回到伪装首页。但 Web 锁屏模型仍主要依赖 `prefs.lockKdf` / legacy `prefs.lockHash` 判断“是否设置了密码”，没有独立表达“当前主记录访问是否已经解锁 / 是否因后台返回而重新锁定”的会话状态。

结果是“回首页”与“重新锁定主记录访问”没有被拆开表达。后台回首页能隐藏主记录，但没有稳定设置“下一次访问主记录必须解锁”的状态。

## 设置项

- UI 控件：`#resetToCover`
- 文案：`退出或切到后台后回到首页`
- prefs 字段：`prefs.resetToCover`

本轮继续使用现有字段，没有新增设置项、localStorage key 或 prefs schema。

## 修复规则

- `prefs.resetToCover` 只控制 Android 后台时是否回到伪装首页。
- `prefs.lockKdf` / legacy `prefs.lockHash` 只控制是否存在锁屏凭据。
- 新增内存级会话状态 `journalAccessLocked`，表示主记录访问当前是否需要解锁。
- 后台回首页且存在锁屏凭据时，设置 `journalAccessLocked = true`。
- 回到首页、刷新首页账本、关闭弹窗都不会清除 locked 状态。
- 只有密码验证成功、生物识别成功，或清除锁屏凭据时，才清除 `journalAccessLocked`。
- 未设置锁屏密码时，只回首页，不显示锁屏、不阻断进入主记录。
- 关闭 `prefs.resetToCover` 时，Android 后台生命周期不会强制回首页，也不会强制锁定。

## Android Lifecycle Bridge

本轮未改 Android 原生 lifecycle bridge。现有实现仍位于：

`platforms/android/app/src/main/java/moon/darkside/android/MainActivity.java`

已覆盖：

- `onUserLeaveHint()`
- `onPause()`
- `onStop()`
- `onResume()` fallback
- 安全封装 `evaluateJavascript`

Android 原生层只通知 Web 层，不直接改业务状态。

## Web 端 Locked 状态修复

实现位置：`js/app.js`

新增 / 调整：

- `journalAccessLocked`
- `requireJournalUnlock()`
- `clearJournalUnlockRequirement()`
- `journalRequiresUnlock()`
- `returnToCoverForAndroidBackground(reason)`

当 Android lifecycle 回调触发且 `prefs.resetToCover !== false` 时，Web 层会先根据 `prefs.lockKdf` / `prefs.lockHash` 设置主记录访问锁定状态，再切回伪装首页。

## 进入主记录入口检查

实现位置：`js/app.js`

- 首页隐藏入口改为走 `enterJournalFromCover()`。
- `startLock()` 改为检查 `journalRequiresUnlock()`。
- 正确密码解锁和生物识别解锁共用 `finishUnlockSuccess()`，解锁成功时才清除 `journalAccessLocked`。

因此从首页再次进入主记录时，如果后台已经设置 locked，必须先显示锁屏。

## Android APK 重构建结果

- Android Gradle `:app:assembleDebug`：构建通过。
- APK 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：3.5M（3,640,468 bytes）
- APK 精确内容检查未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- 用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件。
- APK 不提交进 git。

## 实机测试结果

当前本机没有连接 Android 设备或可用 AVD，因此 Android 实机后台锁定验收未完成。

待灰度设备覆盖：

- 开启后台回首页 + 已设置锁屏。
- 开启后台回首页 + 未设置锁屏。
- 关闭后台回首页 + 已设置锁屏。
- Home / 最近任务 / 手机锁屏 / 返回 Activity。
- 锁定状态保持和解锁后再次后台重新锁定。

## 回归测试结果

- 长弹窗：本轮未修改 `index.html` / `styles.css` / 弹窗相关代码；P7-01 修复保持不变。
- Downloads 导出：本轮未修改 `js/downloads.js`、导出功能或 `MoonAndroidDownloads`；P7-02 修复保持不变。
- 生物识别：本轮未修改 Android BiometricPrompt bridge，只复用成功解锁后的同一清锁路径。
- 备份语义、账本隔离、图片系统和 `messageIntegrity` 均未改动。

## 已知限制

- 本机无 Android 设备 / AVD，运行态必须继续通过灰度设备确认。
- `journalAccessLocked` 是内存级会话状态，不写入持久化存储；应用冷启动时默认按 locked 处理，存在锁屏凭据就会要求解锁。
