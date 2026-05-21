# P7-03 Android 后台回首页 / 锁定 / 生物识别修复

## 问题描述

Android APK 灰度测试中仍有两个运行态问题：

- 开启“退出或切到后台后回到首页”后，从主记录界面切到后台再回到应用，仍可能停留在主记录界面。
- Android APK 中生物识别可能落到浏览器 WebAuthn 路径，显示“当前浏览器不支持平台生物识别”一类提示。

本轮只处理 Android 后台生命周期、主记录再进入锁定和 Android 原生生物识别，不修改已完成的长弹窗滚动修复和 Downloads 导出保存修复。

## 设置项确认

- UI 控件：`#resetToCover`
- 文案：`退出或切到后台后回到首页`
- prefs 字段：`prefs.resetToCover`
- 默认值：`true`
- 现有语义：开启时启动 / 退出 / 切后台后回到伪装首页；关闭时保留上一应用模式。

本轮没有新增重复设置项，也没有修改 `localStorage` key 或 prefs schema。

## Android Lifecycle Bridge

实现位置：`platforms/android/app/src/main/java/moon/darkside/android/MainActivity.java`

Android 原生层新增生命周期通知：

- `onUserLeaveHint()`：通知 `window.__moonAndroidAppBackgrounded("userLeaveHint")`
- `onPause()`：通知 `window.__moonAndroidAppBackgrounded("pause")`
- `onStop()`：设置 pending flag，并通知 `window.__moonAndroidAppBackgrounded("stop")`
- `onResume()`：如果 pending flag 未被后台阶段执行，回前台后补发 `window.__moonAndroidAppBackgrounded("resumeFallback")`，再通知 `window.__moonAndroidAppForegrounded()`

原生层只通知 Web 层，不读写业务数据，不修改主记录、账本、备份或图片存储。

## Web 端后台处理

实现位置：`js/app.js`

新增 Web 回调：

- `window.__moonAndroidAppBackgrounded(reason)`
- `window.__moonAndroidAppForegrounded()`

处理规则：

- 如果 `prefs.resetToCover === false`，直接返回，不强制改变用户当前界面。
- 如果开启该选项，关闭主记录里的 drawer、菜单和非首页设置弹窗，再调用现有 `setAppMode("cover")` 回到伪装层 / 本地账本首页。
- 如果已经在首页，只刷新账本首页，不切换成员、群组或修改记录。
- 是否需要解锁继续沿用现有凭据判断：`prefs.lockKdf` 或 legacy `prefs.lockHash`。
- 再次从伪装入口进入主记录时，现有 `applyAppMode()` / `startLock()` 会显示锁屏；未设置锁屏密码时不会强制显示锁。

## 行为规则

- 开启 `prefs.resetToCover` + 未设置锁屏密码：后台返回后显示伪装首页，再进入主记录不要求密码。
- 开启 `prefs.resetToCover` + 已设置锁屏密码：后台返回后显示伪装首页，再进入主记录必须解锁。
- 关闭 `prefs.resetToCover`：Android 生命周期通知仍存在，但 Web 端不强制回首页。
- 锁定只依赖现有 `lockKdf` / `lockHash`，本轮没有新增锁定 schema。

## Android BiometricPrompt Bridge

实现位置：`platforms/android/app/src/main/java/moon/darkside/android/MainActivity.java` 和 `js/app.js`

新增 Android JS bridge：

- bridge 名称：`window.MoonAndroidBiometric`
- `isAvailable()`：原生检查 `BiometricManager.canAuthenticate(...)`
- `authenticate(requestId)`：启动 AndroidX `BiometricPrompt`
- 成功回调：`window.__moonAndroidBiometricResult(requestId, true, "")`
- 失败回调：`window.__moonAndroidBiometricResult(requestId, false, "错误信息")`

Web 端检测到 `MoonAndroidBiometric` 后，生物识别解锁优先走 Android 原生路径，不再进入 WebAuthn / `PublicKeyCredential` 浏览器路径。成功后调用和密码解锁相同的 `finishUnlockSuccess()`；失败后保持锁定并提示使用密码。

Web / PWA 浏览器版保留原 WebAuthn 逻辑。

## 权限说明

- 新增源 manifest 权限：`android.permission.USE_BIOMETRIC`
- AndroidX Biometric 合并 manifest 时会带入旧版 `android.permission.USE_FINGERPRINT`，用于兼容 Android 8/9 指纹能力。
- 保留 P7-02 已有的 `WRITE_EXTERNAL_STORAGE`，且仍限定 `android:maxSdkVersion="28"`，只服务 Android 9 及以下 Downloads 导出保存。
- 未新增 `INTERNET`、相机、定位、通讯录、麦克风或无关权限。

## 测试结果

- `node --check` 已通过指定 Web 文件。
- `git diff --check` 已通过。
- Android Gradle `:app:assembleDebug` 构建通过。
- 已重新生成 APK：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：3.5M（3,640,468 bytes）
- APK 精确内容检查未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- 用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件。
- APK 不提交进 git。

当前本机没有连接 Android 设备，`adb devices` 为空；当前本机没有可用 Android AVD，`emulator -list-avds` 为空。因此以下实机项未在本机完成：

- 开启后台回首页 + 未设置锁屏密码。
- 开启后台回首页 + 已设置锁屏密码。
- 关闭后台回首页。
- Home / 最近任务 / 锁屏等后台方式。
- Android 原生 BiometricPrompt 成功 / 失败路径。

## 已知限制

- `onResume()` 的 fallback 会尽量保证最终回到伪装首页，但在非常慢的设备上，回前台瞬间可能存在极短暂的旧页面闪现风险，需要灰度真机继续观察。
- BiometricPrompt 依赖系统已配置生物识别或设备凭据；不可用时会提示使用密码。
- 本轮没有改主 data schema、localStorage key、IndexedDB schema、主 JSON / encrypted-json 语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize 或 `messageIntegrity`。

## 灰度验收清单

- 开启“退出或切到后台后回到首页”，未设置锁屏密码：进入主记录后按 Home，再回应用，应回到伪装首页，再进入主记录不要求密码。
- 开启“退出或切到后台后回到首页”，已设置锁屏密码：进入主记录后按 Home，再回应用，应回到伪装首页，再进入主记录必须解锁。
- 关闭该选项：进入主记录后切后台再回应用，不应强制回首页。
- 生物识别：Android 系统已设置指纹 / 面容 / 屏幕锁时，点击生物识别应弹出系统 BiometricPrompt，不应显示 WebAuthn 浏览器不支持提示。
- 生物识别不可用：应提示使用密码，密码解锁仍可用。
