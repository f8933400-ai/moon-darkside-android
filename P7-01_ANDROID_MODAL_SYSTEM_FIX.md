# P7-01 Android 移动端弹窗系统修复

## 问题截图描述

灰度测试截图确认 Android APK / WebView 中长弹窗存在可用性问题：

- “时间线 / 回顾”弹窗内容过高，初始版本无法滑到底部，也没有可触达的退出入口。
- 后续单点修复后仍出现底部操作区与内容重叠、多个关闭入口并存、“生成时间线”等按钮被遮挡或压到边缘。
- “高级搜索”弹窗内容较长，需要一起检查移动端滑动、键盘弹出、按钮可达和关闭入口一致性。

## 影响弹窗

本轮重点处理：

- 时间线 / 回顾
- 高级搜索

同时排查以下弹窗 / overlay / drawer 的移动端滚动风险：

- 导出 / 导入、锁屏设置、成员编辑、群组 / 私聊、系统档案
- 本地存储状态、备份健康检查
- 投票、任务、照护、交接、接续面板、前台日志
- 图片发送、编辑、裁剪、标注和系统名片预览

## 修复方式

- 为“时间线 / 回顾”和“高级搜索”改成固定 header + 可滚动 body 的结构。
- 新增 `.modal-scroll-body`，让长内容区使用 `overflow-y:auto`、`-webkit-overflow-scrolling:touch`、`overscroll-behavior:contain` 和安全区底部 padding。
- 两个重点弹窗的 panel 改为 flex column、`overflow:hidden`、`max-height:calc(100vh - 32px)` / `calc(100dvh - 32px)`，避免 panel 与内部 body 争抢滚动。
- 移除全局最后一组 `.modal-actions` 的 sticky 规则，避免底部操作条盖住内容或形成多个关闭框。
- “时间线 / 回顾”和“高级搜索”只保留右上角一个明确关闭按钮，移除底部重复关闭按钮。
- `openModal()` 现在会同时重置 panel 和 `.modal-scroll-body` 的滚动位置。
- 高级搜索在窄屏下不再自动聚焦关键词输入框，避免 Android 键盘打开后立即遮挡操作按钮。
- 本地存储状态、备份健康检查改为通过统一 `openModal()` / `closeModal()` 路径打开关闭。
- 更新 Service Worker cache 名，避免 Android / PWA shell 继续使用旧静态资源。

## 时间线 / 回顾修复结果

- 右上角只保留一个关闭按钮。
- “重置”“生成本月回顾”“生成时间线”位于可滚动内容区内，不再被固定底部区域遮挡。
- 生成结果列表和月回顾面板留在同一个滚动体内，外层 panel 不再与内容滚动冲突。
- 320px 和 375px 宽度检查均无横向溢出。
- 浏览器移动宽度检查：内容区可从 `scrollTop=0` 滑到最大滚动位置，320px / 375px 下最大滚动约 995px；操作按钮在正常滑动过程中完整可见。

## 高级搜索检查结果

- 右上角只保留一个关闭按钮。
- 移除底部“关闭”按钮，只保留“重置 / 搜索”操作，避免多个关闭区域。
- 搜索条件、checkbox 区域、操作按钮和结果区在同一个滚动 body 内，不再与 footer 重叠。
- 窄屏打开时不自动聚焦关键词输入框，降低 Android 键盘遮挡按钮的风险。
- 320px 和 375px 宽度检查均无横向溢出。
- 浏览器移动宽度检查：内容区可滑到底，320px / 375px 下最大滚动约 568px；“重置 / 搜索”按钮可完整触达。

## 其它弹窗排查结果

- 通用 `.modal` 在移动端仍保留 `max-height`、`overflow-y:auto`、触摸惯性滚动和安全区 padding。
- 成员编辑、照护、设置、系统档案、导出 / 导入、投票、交接、接续面板、前台日志、存储健康和备份健康等长弹窗未再使用会覆盖内容的全局 sticky footer。
- 存储健康和备份健康已接回统一打开 / 关闭路径，打开时会重置滚动位置。
- 320px / 375px smoke test 覆盖了通用长弹窗滚动与底部操作触达，没有发现横向溢出。

## Android APK 重构建结果

- 已重新构建 debug APK。
- 输出路径：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- 文件大小：1.7M（1,770,889 bytes）
- APK 不提交进 git。
- 包内容检查未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- 用户要求的宽泛 `backup` grep 只命中应用自身脚本 `encrypted-backup.js`、`backup-health-ui.js` 和 Android `backup_rules.xml`，不是用户备份文件。

## 已知剩余问题

- 当前本机没有连接 Android 设备，`adb devices` 为空。
- 当前本机没有可用 Android AVD，`emulator -list-avds` 为空。
- 因此本轮没有完成真机 / AVD 里的手动 Android WebView 滑动实测；已完成 APK 重建、浏览器移动宽度验证和静态包内容检查，仍需灰度设备安装后做最终运行态确认。
- 本轮未改数据结构、localStorage key、IndexedDB schema、备份语义、账本隔离、图片存储语义或 `messageIntegrity`。
