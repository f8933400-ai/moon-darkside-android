# 月之暗面 / Moon Darkside Android

> 一个给多意识体、plural、DID / OSDD、tulpa、questioning 和任何需要“把内部生活好好放下”的人使用的本地离线记录工具。

**没有账号。没有云同步。没有遥测。没有远程 API。**

《月之暗面》是一款 Android 优先的本地离线单页应用。它把“内部沟通、前台日志、交接、照护、任务、议题、时间线回顾、备份和伪装账本首页”放在一个可以离线运行的工具里。

它不是医疗产品，不提供诊断、治疗、危机干预或医疗建议。它只是一个尽量安静、可控、不会把你的记录上传到别处的本地工具。

## 为什么先做 Android

因为现实里的使用者不一定有 Mac，不一定有 Windows 电脑，也不一定有稳定的云盘和复杂文件管理能力。

这个项目现在按 **Android-first** 继续推进：

- APK 是主要使用目标。
- 文件导出优先保存到 Android 系统 `Download/下载` 目录。
- 交互优先适配 Android WebView、软键盘、文件选择器、后台锁定和小屏宽度。
- Web / PWA 保留为开发、演示和兜底入口。
- macOS / iOS / Windows 包装层暂时不是重点。

## 核心特性

- **本地离线记录**：主记录保存在当前设备，不主动联网。
- **多成员对话**：像聊天一样记录系统内交流、状态、边界、需求和记忆。
- **成员与群组**：成员资料、标签、头像、群组、私聊 / 小群聊。
- **前台日志**：记录前台、共前台、靠近前台、旁观 / 在场、混合、未知等状态。
- **接续面板**：进入主记录时快速看最近前台、交接、任务、照护和议题。
- **交接与任务**：把“后来的人需要知道什么”落到可以继续做的条目里。
- **照护板**：记录饮水、进食、睡眠、疼痛、精力、感官负荷等生活状态。
- **议题 / 投票**：记录内部讨论、理由、暂停、恢复、决议和复盘时间。
- **高级搜索**：搜索消息、成员、群组、交接、投票、前台和任务。
- **时间线 / 月度回顾**：只读聚合本机记录，做回顾和整理。
- **长截图**：当前对话可生成 PNG 长图，Android 版保存到系统下载目录。
- **本地账本首页**：可作为伪装层使用，也可以独立记录收入 / 支出。
- **完整 JSON / 加密 JSON 备份**：主记录备份和账本备份保持隔离。
- **图片外置存储**：聊天图片、头像和背景存进 IndexedDB，导出完整备份时再 hydrate。
- **轻量锁屏**：进入主记录可设密码；Android 后台返回可回到伪装首页并重新要求解锁。

## 隐私模型

这个项目的默认姿态是：**你的记录应该待在你的设备里。**

- 不需要账号。
- 不依赖 CDN。
- 不新增 npm 构建链。
- 不发送遥测。
- 不主动访问远程 API。
- Android 版不申请联网权限。
- Service Worker 只缓存应用静态文件，不缓存用户备份文件。

本地隐私仍然取决于现实设备安全：手机锁屏、浏览器数据、APK 来源、导出的备份文件、截图和分享对象。

## 重要提醒

《月之暗面》不是医疗、心理治疗或危机处理工具。

如果你正在经历强烈痛苦、失控风险、伤害自己或他人的冲动，请优先联系现实中的可信任的人、当地紧急服务或专业支持。

进入密码锁只是本地轻量隐私门帘，不是数据加密。需要保护备份文件时，请使用加密完整 JSON 备份，并把密码妥善保存。

## 数据保存位置

主记录和偏好使用浏览器本地存储：

| 内容 | 位置 |
| --- | --- |
| 主记录 | `localStorage` key `osddDidLocalJournal.v2` |
| 偏好 | `localStorage` key `osddDidLocalJournal.prefs.v1` |
| 账本记录 | `localStorage` key `moonLedger.records.v1` |
| 账本设置 | `localStorage` key `moonLedger.settings.v1` |
| 图片库 | IndexedDB `moon-images` / objectStore `images` |

主记录完整 JSON / encrypted-json 不包含 `ledgerRecords` 或 `ledgerSettings`。账本有独立的 JSON / CSV 导出入口。

## Android 构建

需要本机已安装 Android Studio / Android SDK。

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

cd platforms/android
gradle :app:assembleDebug
```

调试 APK 输出：

```text
platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

本仓库不会提交 APK、AAB、DMG、IPA、build 输出、真实备份或用户数据。

## 本地 Web 运行

如果只是开发或预览，可以在仓库根目录启动本地 HTTP：

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:8080/index.html
```

直接打开 `index.html` 也能跑，但部分浏览器能力会受 `file://` 限制。

## 备份原则

建议定期导出完整 JSON 或加密完整 JSON 备份。

- 主记录完整备份：设置 → 导出 / 导入备份 → 全部群组 → JSON 备份。
- 加密完整备份：设置 → 导出 / 导入备份 → encrypted-json。
- 账本备份：首页账本区域单独导出 JSON 或 CSV。
- 图片会在完整 JSON 导出时从 IndexedDB 补回为 DataURL。
- 导入完整 JSON 时，图片会再次外置回 IndexedDB。

不要把真实备份文件提交到 GitHub。

## 开发约束

为了保护本地离线和隐私语义，贡献代码时请保持：

- 不新增云同步、遥测或远程 API。
- 不新增 CDN。
- 不随意引入 npm 构建链。
- 不改变主数据 schema，除非有明确迁移。
- 不把账本数据塞回主记录备份。
- 不改变 `messageIntegrity` 语义。
- 不提交 APK / build 输出 / 用户备份 / 临时文件。

## 当前状态

这是一个个人维护的 Android-first 灰度项目。很多功能已经能用，但仍需要不同 Android 设备上的真实测试，尤其是：

- 软键盘和底部窗口。
- 文件选择器返回。
- 系统下载目录保存。
- 后台返回首页和锁屏。
- 长截图高度限制。
- 低配设备上的大图片 / 大备份压力。

## 许可证

本项目使用 **GNU General Public License v3.0** 开源。

详见 [LICENSE](LICENSE)。
