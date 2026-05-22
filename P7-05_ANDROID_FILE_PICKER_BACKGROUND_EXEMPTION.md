# P7-05 Android 文件选择器后台回首页豁免

## 问题描述

Android APK 灰度测试中，开启“退出或切到后台后回到首页”后，在主记录界面点击“图片”并进入 Android 系统文件选择器，选择图片返回应用时，底层页面会被切到伪装账本首页，但上层仍保留“发送图片”弹窗。

## 根因分析

Android 系统文件选择器由应用主动打开，但它仍会让 Activity 触发 `onPause()`、`onStop()` 和 `onResume()`。P7-04 的后台回首页逻辑没有区分“应用主动打开系统 UI”和“用户真正离开应用”，因此把文件选择器误判成真实后台：

1. `onShowFileChooser()` 打开系统选择器。
2. Activity lifecycle 触发后台通知。
3. Web 层执行后台回首页并锁定主记录访问。
4. 文件选择结果返回后，聊天图片回调继续打开“发送图片”弹窗，形成“底层账本首页 + 上层发送图片弹窗”的错位状态。

最终根因：Android lifecycle bridge 缺少应用主动外部交互豁免，Web 后台处理也没有 external interaction guard。

## 修复方式

### Android 原生层

实现位置：`platforms/android/app/src/main/java/moon/darkside/android/MainActivity.java`

新增状态：

- `appInitiatedExternalActivity`
- `suppressNextBackgroundHomeReturn`
- `externalInteractionResumeObserved`

新增流程：

1. `onShowFileChooser()` 启动文件选择器前调用 `beginExternalInteraction("fileChooser")`。
2. `onActivityResult()` 在成功、取消或异常路径中都通过 `finally` 调用 `endExternalInteraction("fileChooser")`。
3. `onUserLeaveHint()`、`onPause()`、`onStop()` 如果发现外部交互正在进行，不再通知 Web 层执行后台回首页。
4. `onResume()` 如果发现刚从外部交互返回，不执行 `resumeFallback` 后台回首页，只通知前台恢复。
5. 增加不包含用户文件路径或用户内容的 logcat 灰度日志。

### Web 层

实现位置：`js/app.js`

新增状态和守卫：

- `androidExternalInteractionDepth`
- `beginAndroidExternalInteraction(reason)`
- `endAndroidExternalInteraction(reason)`
- `isAndroidExternalInteractionActive()`
- `window.__moonAndroidExternalInteractionStarted(reason)`
- `window.__moonAndroidExternalInteractionEnded(reason)`

`returnToCoverForAndroidBackground(reason)` 在执行回首页前先检查外部交互状态。文件选择器期间收到后台事件时直接跳过，不切换 `appMode`，不关闭聊天图片弹窗，不设置主记录 locked。

## 覆盖场景

因为 Android WebView 的 `onShowFileChooser()` 覆盖所有 `input type="file"`，本轮修复覆盖：

- 聊天图片选择。
- 成员头像选择。
- 房间背景选择。
- 主 JSON 导入文件选择。
- encrypted-json 导入文件选择。
- 账本 JSON 导入文件选择。
- 备份健康检查中的 JSON 选择。

Android Downloads 导出当前使用 `MoonAndroidDownloads` + MediaStore 写入 Downloads，不启动文件选择器，本轮未修改该逻辑。

## 真正后台回首页回归

真正按 Home、最近任务切到其它 app、锁屏等场景不会设置 `appInitiatedExternalActivity`，仍会按 `prefs.resetToCover` 执行 P7-04 的回首页和锁定规则：

- 开启“退出或切到后台后回到首页”时回到伪装首页。
- 已设置 `prefs.lockKdf` 或 legacy `prefs.lockHash` 时，再进入主记录必须解锁。
- 未开启该选项时，不强制改变原行为。

## Android APK 重构建结果

- Android Gradle `:app:assembleDebug`：构建通过。
- APK 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：3.5M（3,640,468 bytes）
- APK 内容检查中，用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件；未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- APK 不提交进 git。

## 实机测试结果

当前本机没有连接 Android 设备，`adb devices` 为空；当前本机没有可用 Android AVD，`emulator -list-avds` 为空。因此 Android 实机文件选择器豁免验收未完成，本轮不声称实机通过。

灰度设备需重点覆盖：

- 聊天图片选择成功后仍停留主记录界面，并显示“发送图片”弹窗。
- 取消聊天图片选择后仍停留主记录界面，不跳到账本首页。
- 成员头像、房间背景和导入文件选择成功 / 取消后不误触发回首页。
- 真正按 Home、最近任务、锁屏仍会按设置回首页并锁定。
- 长弹窗滚动和 Android Downloads 导出保存保持不变。

## 回归测试结果

- 长弹窗：本轮未修改 `index.html`、`styles.css` 或弹窗布局，P7-01 修复保持不变。
- Android Downloads：本轮未修改 `MoonAndroidDownloads` 或 Web 导出函数，P7-02 修复保持不变。
- 主记录 locked 状态：只新增文件选择器豁免；真实后台路径仍沿用 P7-04 的 `journalAccessLocked` / `requestEnterJournal()`。
- 备份语义、账本隔离、图片 hydrate / externalize 和 `messageIntegrity` 均未改动。

## 已知限制

- 本机若无 Android 设备 / AVD，文件选择器运行态需继续由灰度设备确认。
- 当前豁免覆盖 WebView 文件选择器；若未来新增 `ACTION_CREATE_DOCUMENT` 等独立系统保存器，需要在对应启动 / 返回路径复用同一 external interaction 机制。
