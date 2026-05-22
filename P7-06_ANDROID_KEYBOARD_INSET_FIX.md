# P7-06 Android 键盘遮挡底部窗口修复

## 问题描述

Android APK 灰度测试中，在主记录界面编辑底部窗口、底部弹窗或底部输入区时，Android 软键盘弹出后会覆盖正在编辑的输入框或底部操作按钮。截图表现为底部编辑区域没有被顶起，也没有自动滚动到可见区域。

## 根因分析

当前 WebView 页面使用固定的应用高度和移动端底部弹窗布局：

- Android Activity 未声明 `windowSoftInputMode`，系统键盘弹出时 WebView 不一定按可见区域稳定 resize。
- Web 层只维护 `--app-height`，没有根据 `window.visualViewport` 计算键盘占用高度。
- 移动端 `.modal-backdrop` 贴近屏幕底部显示，键盘出现后没有额外底部 inset。
- 输入框聚焦后没有统一的二次滚动兜底，键盘动画结束后仍可能被遮挡。

最终根因：Android 键盘改变可视区域，但底部输入区和底部弹窗没有统一的 keyboard inset 与 focus scroll 机制。

## 修复方式

### Android Manifest

实现位置：`platforms/android/app/src/main/AndroidManifest.xml`

Activity 新增：

```xml
android:windowSoftInputMode="stateHidden|adjustResize"
```

本轮没有新增权限，没有修改包名、applicationId、导出保存权限或 WebView 业务配置。

### Web 键盘可视区域

实现位置：`js/app.js`

`setupViewportHeight()` 现在会：

- 监听 `window.resize`、`orientationchange`、`visualViewport.resize` 和 `visualViewport.scroll`。
- 在输入控件聚焦且 `visualViewport` 明显缩小时，计算键盘高度：
  `window.innerHeight - visualViewport.height - visualViewport.offsetTop`
- 写入 CSS 变量 `--keyboard-inset`。
- 给 `body` 加 / 移除 `keyboard-open`。
- 键盘打开时用可视区域高度更新 `--app-height`，让聊天输入区跟随可视区域上移。
- 键盘收起后恢复 `--keyboard-inset: 0px` 和正常高度。

### CSS keyboard inset

实现位置：`styles.css`

新增：

- `:root { --keyboard-inset:0px; }`
- `body.keyboard-open .modal-backdrop`
- `body.keyboard-open .disclaimer-backdrop`
- `body.keyboard-open .lock-backdrop`
- `body.keyboard-open .modal`
- `body.keyboard-open .advanced-search-modal`
- `body.keyboard-open .timeline-modal`
- `body.keyboard-open .poll-modal`
- `body.keyboard-open .handoff-modal`
- `body.keyboard-open .care-modal`
- `body.keyboard-open .backup-health-modal`
- `body.keyboard-open .storage-health-modal`
- `body.keyboard-open .fronting-modal`
- `body.keyboard-open .arrival-modal`
- 输入控件和操作区的 `scroll-margin-bottom`

这些规则只在 `body.keyboard-open` 时生效，用于把移动端底部弹窗和锁屏输入区域抬到键盘上方，并让内部滚动区域保留可见余量。

### 输入聚焦滚动

实现位置：`js/app.js`

新增 `setupKeyboardFocusScroll()`：

- 通过 `focusin` 事件委托覆盖 `input`、`textarea`、`select` 和 `contenteditable`。
- 排除 `checkbox`、`radio`、`file`、`range`、`color`、按钮类 input 等不会弹键盘的控件。
- 只在移动宽度、Android wrapper 或键盘已打开时执行。
- 聚焦后分 160ms / 360ms / 620ms 多次 `scrollIntoView({ block:"center" })`，覆盖键盘动画后的二次遮挡。

## 覆盖模块

本轮修复覆盖：

- 主记录聊天输入区。
- 发送图片 / 图片编辑 / 裁剪 / 标注等弹窗。
- 高级搜索。
- 时间线 / 回顾。
- 成员编辑。
- 群组 / 房间编辑。
- 前台日志。
- 交接便签。
- 任务 / 投票 / 照护相关弹窗。
- 锁屏密码设置与解锁。
- 账本新增 / 编辑 / 筛选 / 预算表单。
- 导入 / 导出相关弹窗。

## Android APK 重构建结果

- Android Gradle `:app:assembleDebug`：构建通过。
- APK 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：3.5M（3,640,468 bytes）
- APK 内容检查中，用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件；未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- APK 不提交进 git。

## 实机测试结果

当前本机没有连接 Android 设备，`adb devices` 为空；当前本机没有可用 Android AVD，`emulator -list-avds` 为空。因此 Android 实机键盘遮挡验收未完成，本轮不声称实机通过。

灰度设备需重点覆盖：

- 聊天输入框聚焦后输入框、“图片”和“发送”按钮可见。
- 发送图片弹窗内操作按钮不被键盘遮挡。
- 高级搜索关键词输入、底部按钮和结果区域可用。
- 账本金额 / 备注输入和保存按钮可见或可滚动到。
- 成员、房间、前台、照护、任务、投票等编辑弹窗输入不被遮挡。
- 键盘收起后布局恢复。

## 回归测试结果

- 长弹窗：保留 P7-01 的滚动结构；本轮只在 `keyboard-open` 时缩短可用高度。
- Android Downloads：未修改 `MoonAndroidDownloads` 或导出函数，P7-02 修复保持不变。
- 后台回首页 / 锁定：未修改 P7-04 / P7-05 生命周期与锁定状态机。
- 备份语义、账本隔离、图片 hydrate / externalize 和 `messageIntegrity` 均未改动。

## 已知限制

- 本机若无 Android 设备 / AVD，键盘运行态必须继续由灰度设备确认。
- 不同 Android 输入法的动画时序可能不同，因此 Web 端使用多次延迟滚动作为兜底。
