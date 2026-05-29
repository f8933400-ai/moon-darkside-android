<div align="center">

<h1>月之暗面</h1>

<p><strong>Moon Darkside Android</strong></p>

<p>一个给多意识体、plural、DID / OSDD、tulpa、questioning 和任何需要“把内部生活好好放下”的人使用的本地离线记录工具。</p>

<p>作者：仲原令依、Codex</p>

<p>
  <img alt="Android" src="https://img.shields.io/badge/platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white">
  <img alt="Offline first" src="https://img.shields.io/badge/offline-first-111827?style=for-the-badge">
  <img alt="Local only" src="https://img.shields.io/badge/data-local_only-4F46E5?style=for-the-badge">
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-0F766E?style=for-the-badge">
  <img alt="License GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-A855F7?style=for-the-badge">
</p>

<p><strong>没有账号。没有云同步。没有遥测。没有远程 API。</strong></p>

<p>
  <a href="#它是什么--项目定位">项目定位</a> ·
  <a href="#功能地图">功能地图</a> ·
  <a href="#apk-使用说明">APK 使用说明</a> ·
  <a href="#备份与数据隔离">备份与数据隔离</a> ·
  <a href="#android-构建">Android 构建</a>
</p>

</div>

---

## 它是什么 / 项目定位

《月之暗面》是一款 Android 优先的本地离线单页应用。它把内部沟通、前台日志、交接、照护、任务、议题、时间线回顾、备份和伪装账本首页放在一个可以离线运行的工具里。

它不是医疗产品，不提供诊断、治疗、危机干预或医疗建议。它只是一个尽量安静、可控、不会把你的记录上传到别处的本地工具。

## 功能地图

| 模块 | 可以做什么 |
| --- | --- |
| 内部沟通 | 像聊天一样记录系统内交流、状态、边界、需求和记忆。 |
| 成员与群组 | 管理成员资料、标签、头像、群组、私聊 / 小群聊。 |
| 前台日志 | 记录前台、共前台、靠近前台、旁观 / 在场、混合、未知等状态。 |
| 接续面板 | 进入主记录时快速看最近前台、交接、任务、照护和议题。 |
| 交接与任务 | 把“后来的人需要知道什么”落到可以继续做的条目里。 |
| 照护板 | 记录饮水、进食、睡眠、疼痛、精力、感官负荷等生活状态。 |
| 议题 / 投票 | 记录内部讨论、理由、暂停、恢复、决议和复盘时间。 |
| 高级搜索 | 搜索消息、成员、群组、交接、投票、前台和任务。 |
| 时间线 / 月度回顾 | 只读聚合本机记录，做回顾和整理。 |
| 长截图 | 当前对话可生成 PNG 长图，Android 版保存到系统下载目录。 |
| 本地账本首页 | 可作为伪装层使用，也可以独立记录收入 / 支出。 |
| 备份 | 主记录完整 JSON / 加密 JSON 备份，账本备份保持隔离。 |
| 图片外置存储 | 聊天图片、头像和背景存进 IndexedDB，完整备份时再 hydrate。 |
| 轻量锁屏 | 进入主记录可设密码；Android 后台返回可回到伪装首页并重新要求解锁。 |

## 灰度测试免责声明

这是一个个人维护的灰度测试项目。很多功能已经能用，但仍可能在不同 Android 设备、浏览器内核、系统文件选择器、软键盘、后台恢复、长截图或大图片 / 大备份场景下出现兼容性问题。

请不要把它当作唯一的数据保存位置。使用过程中请勤做备份，尤其是在升级 APK、导入数据、清理浏览器 / 应用数据、更换设备或进行大量图片记录前后。建议定期导出完整 JSON 或加密完整 JSON，并把备份文件保存到可信位置；账本数据请使用账本页的独立备份入口单独导出。

## APK 使用说明

APK 面向不熟悉技术操作的使用者发布，目标是安装后可以直接打开使用。APK 可以作为 GitHub Releases 附件或其他分发包发布；源码仓库不会提交 APK、AAB、DMG、IPA、build 输出、真实备份或用户数据。

### 第一次打开

应用默认会进入“本地账本”首页。这个页面既可以正常记账，也可以作为伪装首页使用，避免一打开就暴露主记录界面。

### 进入主记录 / 功能层

1. 在“本地账本”首页右上角点齿轮按钮。
2. 在弹出的“声明”窗口里，长按“版本声明”按钮约 1 秒。
3. 松手后会进入主记录 / 功能层。
4. 如果已经设置进入密码，需要先解锁。

短按“版本声明”只会显示版本声明。如果没有进入主记录，请按住更久一点。

### 关闭退后台回伪装首页

默认开启时，关闭退出或切到后台后，应用会回到“本地账本”首页。如果不想这样：

1. 先进入主记录 / 功能层。
2. 打开“设置”。
3. 切到“安全”。
4. 取消勾选“退出或切到后台后回到首页”。

取消后，应用不会因为切到后台自动回到伪装首页。需要隐私保护时，建议保持开启，并设置进入密码。

## 隐私模型

这个项目的默认姿态是：**你的记录应该待在你的设备里。**

- 不需要账号。
- 应用运行不依赖 CDN。
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

## 备份与数据隔离

主记录和偏好使用浏览器本地存储：

| 内容 | 位置 |
| --- | --- |
| 主记录 | `localStorage` key `osddDidLocalJournal.v2` |
| 偏好 | `localStorage` key `osddDidLocalJournal.prefs.v1` |
| 账本记录 | `localStorage` key `moonLedger.records.v1` |
| 账本设置 | `localStorage` key `moonLedger.settings.v1` |
| 图片库 | IndexedDB `moon-images` / objectStore `images` |

主记录完整 JSON / encrypted-json 不包含 `ledgerRecords` 或 `ledgerSettings`。账本有独立的 JSON / CSV 导出入口。

建议定期导出完整 JSON 或加密完整 JSON 备份：

- 主记录完整备份：设置 → 导出 / 导入备份 → 全部群组 → JSON 备份。
- 加密完整备份：设置 → 导出 / 导入备份 → encrypted-json。
- 账本备份：首页账本区域单独导出 JSON 或 CSV。
- 图片会在完整 JSON 导出时从 IndexedDB 补回为 DataURL。
- 导入完整 JSON 时，图片会再次外置回 IndexedDB。

不要把真实备份文件提交到 GitHub。

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

## 开发约束

为了保护本地离线和隐私语义，贡献代码时请保持：

- 不新增云同步、遥测或远程 API。
- 不新增 CDN。
- 不随意引入 npm 构建链。
- 不改变主数据 schema，除非有明确迁移。
- 不把账本数据塞回主记录备份。
- 不改变 `messageIntegrity` 语义。
- 不提交 APK / build 输出 / 用户备份 / 临时文件。

## 许可证

本项目使用 **GNU General Public License v3.0** 开源。

详见 [LICENSE](LICENSE)。
