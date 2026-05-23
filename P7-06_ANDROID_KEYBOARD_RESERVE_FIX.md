# P7-06 Android 长窗口键盘 Reserve 修复

## 问题描述

Android APK 灰度测试中，上一轮键盘适配后，底部窗口会尝试跟随聚焦输入框，但当长窗口已经滚动到底部时，键盘仍可能遮挡底部输入框或操作区。表现为底部弹窗 / 长窗口没有足够额外滚动空间，输入框无法继续滚到键盘上方。

## 根因分析

P7-06 第一轮已经加入 `visualViewport`、`--keyboard-inset`、`body.keyboard-open` 和基础 `scrollIntoView()`，但仍存在三个不足：

1. 长窗口内部滚动区只有 `scroll-padding-bottom`，没有真实 `padding-bottom` reserve。内容滚到底时，滚动容器没有额外空间把最后的输入框顶到键盘上方。
2. focus 处理总是直接调用元素自身的 `scrollIntoView()`，没有优先滚动最近的 `.modal-scroll-body` / `.modal` / `.cover-main` 等实际滚动容器。
3. Android WebView 的键盘动画和 `visualViewport` 更新有延迟，原先 160ms / 360ms / 620ms 的滚动校正仍可能早于最终键盘位置。

最终根因：缺少长窗口内容区的 keyboard reserve padding，以及针对最近滚动容器的多阶段可见区域校正。

## 修复方式

### keyboard inset / reserve

实现位置：`js/app.js`

`setupViewportHeight()` 继续根据 `window.visualViewport` 计算：

- `--keyboard-inset`：实际键盘占用高度。
- `--keyboard-reserve`：键盘高度 + 32px 缓冲。

键盘收起后两者都恢复为 `0px`。

### CSS reserve padding

实现位置：`styles.css`

新增 / 增强：

- `:root { --keyboard-inset:0px; --keyboard-reserve:0px; }`
- `body.keyboard-open .modal-scroll-body`
- `body.keyboard-open .advanced-search-scroll-body`
- `body.keyboard-open .timeline-scroll-body`
- `body.keyboard-open .modal:not(.advanced-search-modal):not(.timeline-modal)`
- `body.keyboard-open .cover-main`
- `body.keyboard-open input / textarea / select / .modal-actions`

关键变化是：键盘打开时，滚动内容区获得真实的 `padding-bottom: calc(... + var(--keyboard-reserve))`，不是只设置 `scroll-padding-bottom`。这样长窗口已经到底部时，最后一个输入框仍有空间滚到键盘上方。

### 底部窗口 max-height

上一轮已经在 `body.keyboard-open` 下为主要长弹窗扣除 `--keyboard-inset`：

- 高级搜索。
- 时间线 / 回顾。
- 投票。
- 交接。
- 照护。
- 存储健康 / 备份健康。
- 前台日志。
- 接续面板。

本轮保留该机制，并补上内容区 reserve。

### 多次滚动校正

实现位置：`js/app.js`

`setupKeyboardFocusScroll()` 增强为：

1. 找最近的实际滚动容器：
   - `.modal-scroll-body`
   - `.modal`
   - `.cover-main`
   - `.messages`
   - `.list`
   - 或 `document.scrollingElement`
2. 根据 `visualViewport` 可见范围计算输入框是否被遮挡。
3. 优先对最近滚动容器做 delta 滚动。
4. 如果仍不可见，再 fallback 到 `scrollIntoView({ block:"center" })`。
5. 校正时机增加为：
   - 立即一次
   - 150ms
   - 300ms
   - 600ms
   - 900ms

这覆盖 Android WebView 键盘动画和 visualViewport 延迟。

## 覆盖模块

本轮覆盖：

- 主记录聊天输入区。
- 长弹窗底部输入框。
- 高级搜索。
- 时间线 / 回顾。
- 账本新增 / 编辑 / 筛选 / 预算表单。
- 成员 / 房间编辑。
- 前台记录。
- 交接便签。
- 照护 / 任务 / 投票相关弹窗。
- 发送图片 / 图片编辑 / 裁剪 / 标注弹窗。
- 锁屏和密码设置弹窗。

## Android APK 重构建结果

- Android Gradle `:app:assembleDebug`：构建通过。
- APK 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：3.5M（3,640,468 bytes）
- APK 内容检查中，用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件；未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- APK 不提交进 git。

## 实机测试结果

当前本机没有连接 Android 设备，`adb devices` 为空；当前本机没有可用 Android AVD，`emulator -list-avds` 为空。因此 Android 实机键盘 reserve 验收未完成，本轮不声称实机通过。

灰度设备需重点覆盖：

- 长窗口滚到底部后点击底部输入框，键盘弹出后输入框仍可见。
- 底部操作按钮可见或可滚动到。
- 聊天输入区“图片”和“发送”按钮可见。
- 高级搜索、账本表单、前台 / 照护 / 任务 / 投票编辑弹窗输入不被遮挡。
- 键盘收起后布局恢复。

## 回归测试结果

- 长弹窗：保留 P7-01 滚动结构；本轮只增加 keyboard reserve。
- Android Downloads：未修改 `MoonAndroidDownloads` 或导出函数。
- 后台回首页 / 锁定：未修改 Android lifecycle bridge 或 `journalAccessLocked`。
- 文件选择器豁免：未修改 P7-05 external interaction 逻辑。
- 备份语义、账本隔离、图片 hydrate / externalize 和 `messageIntegrity` 均未改动。

## 已知限制

- 本机若无 Android 设备 / AVD，键盘 reserve 运行态必须继续由灰度设备确认。
- 不同 Android 输入法键盘高度和动画时序不同，本轮使用 reserve padding + 900ms 多次校正来覆盖延迟。
