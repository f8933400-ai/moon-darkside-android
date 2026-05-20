# 月之暗面 — 架构说明

## 1. 项目概述

“月之暗面”是一个 local-only / offline-first 的本地离线单页面应用，用于多意识体场景下的聊天式记录、成员与群组管理、私聊、前台日志、交接、任务、议题 / 投票、照护、时间线回顾、复盘导出、本地账本首页和系统资料整理。

页面入口是 `index.html`。应用可以通过 `file://` 直接打开，也可以通过本地 HTTP 服务打开，例如 `http://127.0.0.1:8080/index.html`。

当前稳定边界为 `v0.4.0-local-stable`。项目不使用 `type="module"`，不引入 CDN、npm、构建步骤、账号、云同步、遥测或远程 API。所有 JavaScript 都通过普通 `<script src="...">` 顺序加载，共享同一个全局作用域。用户数据默认保存在本机 `localStorage` + IndexedDB 中，不会由应用主动上传到外部服务。

## 2. 文件结构与加载顺序

`index.html` 当前脚本加载顺序如下。这里省略 cache-busting query 参数，只保留实际文件路径；依赖关系以这个顺序为准：

```html
<script src="js/sw-register.js"></script>
<script src="js/data.js"></script>
<script src="js/features/terms.js"></script>
<script src="js/imageStore.js"></script>
<script src="js/integrity.js"></script>
<script src="js/migrate.js"></script>
<script src="js/storage.js"></script>
<script src="js/imageMigration.js"></script>
<script src="js/imageHealth.js"></script>
<script src="js/features/backup-health-ui.js"></script>
<script src="js/features/storage-health.js"></script>
<script src="js/render.js"></script>
<script src="js/features/members.js"></script>
<script src="js/features/rooms.js"></script>
<script src="js/features/messages.js"></script>
<script src="js/features/polls.js"></script>
<script src="js/features/handoff.js"></script>
<script src="js/features/tasks.js"></script>
<script src="js/features/care.js"></script>
<script src="js/features/fronting.js"></script>
<script src="js/features/system-card.js"></script>
<script src="js/features/ledger.js"></script>
<script src="js/features/import-export.js"></script>
<script src="js/features/arrival.js"></script>
<script src="js/features/search.js"></script>
<script src="js/features/timeline.js"></script>
<script src="js/app.js"></script>
```

主要职责：

- `js/sw-register.js`：按协议注册 PWA Service Worker；`file://` 下跳过。
- `js/data.js`：常量、localStorage 键名、默认偏好、初始数据、基础工具。
- `js/features/terms.js`：自定义术语系统，提供 `term()`、设置面板填充与静态文案刷新。
- `js/imageStore.js`：IndexedDB 图片存储封装，暴露 `window.imageStore`。
- `js/integrity.js`：消息文本、导出辅助、校验码、`messageIntegrity()`、`makeMessage()`、基础查找函数。
- `js/migrate.js`：主数据迁移、旧 JSON 兼容、字段补齐、记录归一化。
- `js/storage.js`：`LocalStorageAdapter`，负责主数据、偏好、账本加载保存和完整备份解析。
- `js/imageMigration.js`：旧 DataURL 图片外置到 IndexedDB 的控制台维护工具。
- `js/imageHealth.js`：图片健康检查、孤儿图片清理、从 JSON 备份修复缺失图片的控制台 API。
- `js/features/backup-health-ui.js`：备份健康检查 UI，调用 `imageHealth.js` 现有 API。
- `js/features/storage-health.js`：本地存储状态面板，展示主数据、图片和账本的体积 / 数量统计。
- `js/render.js`：偏好应用、侧栏、聊天、结构视图、系统资料、系统名片等渲染。
- `js/features/*.js`：各功能模块。
- `js/app.js`：全局 UI 状态、事件绑定、启动流程、自动图片迁移触发。

### PWA / Service Worker 边界

PWA 支持由 `js/sw-register.js`、`sw.js` 和 `manifest.webmanifest` 组成。

- `js/sw-register.js` 只在 `https:` 或本机 `http://localhost` / `127.0.0.1` / `[::1]` 下注册 Service Worker。
- `file://` 下会跳过 Service Worker。页面仍可直接打开，但没有 PWA 离线壳缓存。
- `sw.js` 的缓存名为 `moon-app-shell-v0.4.0`。
- `APP_SHELL` 只包含静态应用壳：入口 HTML、样式、manifest、favicon、本地图标和 `index.html` 直接加载的普通 `js/` 脚本。
- fetch handler 只响应同源 `GET` 且 pathname 命中 `APP_SHELL_PATHS` 的 http / https 请求。
- Service Worker 不缓存用户导出的 `.json`、`.moonenc.json`、账本 JSON、CSV、图片 Blob、IndexedDB 内容或 localStorage 内容。
- install 阶段完成 app shell 缓存后会 `skipWaiting()`；activate 阶段会清理旧的 `moon-app-shell-*` 缓存并 `clients.claim()`。
- `manifest.webmanifest` 使用 standalone 显示模式，并引用 128 / 192 / 512 本地图标。

Cache Storage 与用户数据存储边界必须保持分离：Cache Storage 只服务静态 app shell，主记录、账本和图片仍分别由 localStorage 与 IndexedDB 管理。

## 3. 全局状态

核心全局状态在 `js/app.js` 顶部定义：

- `data`：运行时主数据对象，包含成员、房间、消息、标签、议题、前台日志、任务、照护、系统资料等。
- `prefs`：偏好对象，包含字号、主题、锁定、封面策略、当前视角、私聊管理模式、接续面板入口、自定义术语等。
- `ledgerRecords`：账本记录数组，独立于主 `data` 存储。
- `ledgerSettings`：账本分类、月度预算和默认账本视图设置，独立于主 `data` 和 `prefs` 存储。
- `currentRoomId`：当前打开的房间 ID。
- `tab`：侧边栏当前页签，常见值为 `rooms`、`private`、`members`。
- `appMode`：封面 / 记录界面的当前模式。
- `pendingMemberAvatar`、`pendingRoomBg`、`pendingChatImage`：图片编辑或发送前的临时 DataURL / 保留标记。
- `pendingSystemCardPayload`、`pendingSystemCardImage`、`pendingSystemCardBg`、`pendingReceivedSystemCard`：系统名片相关临时状态。

## 4. localStorage 键名

主数据键名定义在 `js/data.js`：

```js
KEY = "osddDidLocalJournal.v2"
OLD_KEY = "osddDidLocalJournal.v1"
```

偏好与账本：

```js
PREF_KEY = "osddDidLocalJournal.prefs.v1"
LEDGER_KEY = "moonLedger.records.v1"
LEDGER_SETTINGS_KEY = "moonLedger.settings.v1"
```

- `KEY`：当前版本主数据。
- `OLD_KEY`：旧版主数据兼容读取；保存只写 `KEY`。
- `PREF_KEY`：用户偏好。
- `LEDGER_KEY`：账本记录。账本独立存储，默认不进入主 `data`，也不进入主记录完整 JSON / encrypted-json 备份。
- `LEDGER_SETTINGS_KEY`：账本分类、预算和默认视图。账本设置独立存储，不进入主 `data`、`prefs` 或主记录完整 JSON / encrypted-json 备份。

图片迁移相关键名：

- `imageMigrationDone`
- `imageMigrationAt`
- `imageMigrationVersion`
- `backupBeforeImageMigration.v1`

## 5. 主数据结构（data 对象）

`data` 由 `initial`、迁移函数和存储层共同维护。当前主要字段包括：

- `nextSeq`
- `tags`
- `messageKinds`
- `polls`
- `handoffNotes`
- `frontingLogs`
- `tasks`
- `careLogs`
- `careChecklist`
- `systemProfile`
- `systemProfileVisibility`
- `memberRelations`
- `externalSystemCards`
- `rooms`
- `members`
- `messages`

成员 `members[]` 当前支持：

- 基础字段：`id`、`name`、`role`、`status`、`tagId`、`note`。
- 成员档案 2.0 字段：`pronouns`、`aliases`、`comfortMethods`、`boundaries`、`avoidNotes`、`communicationStyle`、`frontingPreferences`、`customFields`、`statusHistory`、`createdAt`、`updatedAt`。
- 图片字段：`avatarId` 为新格式主字段，`avatarData` 只作为旧数据兼容 / JSON 导出字段。

消息 `messages[]` 当前支持：

- 基础字段：`id`、`seq`、`roomId`、`speakerId`、`speakerName`、`kind`、`text`、`createdAt`、`integrity`。
- 图片字段：`imageId`、`imageName`、`imageType`；`imageData` 只作为旧数据兼容 / JSON 导出字段。

房间 `rooms[]` 当前支持：

- `id`、`type`、`memberIds`、`name`、`desc`、`createdAt`。
- 背景图字段：`backgroundId` 为新格式主字段，`backgroundData` 只作为旧数据兼容 / JSON 导出字段。

议题 / 投票 `polls[]` 当前支持：

- `title`、`description`、`options`、`votes`、`comments`。
- `status`：例如 `open`、`paused`、`closed`、`cancelled`。
- `voteMode`：例如 `simple`、`consensus`。
- `deadline`、`reviewAt`、`decisionText`、`createdAt`、`updatedAt`、`closedAt`。

前台日志 `frontingLogs[]` 当前支持：

- `memberIds`、`primaryMemberId`
- `stateType`：前台、共前台、靠近前台、旁观 / 在场、混合 / 模糊、未知 / 不确定等。
- `memoryRating`
- `startAt`、`endAt`
- `note`、`createdAt`、`updatedAt`

任务 `tasks[]` 当前支持：

- `title`、`detail`
- `status`：`todo`、`doing`、`paused`、`done`
- `assignedMemberIds`
- `dueAt`
- `source`
- `linkedHandoffId`
- `createdAt`、`updatedAt`

照护数据：

- `careLogs[]`：身体 / 需求记录，包括 `hunger`、`thirst`、`sleep`、`pain`、`energy`、`sensory`、`mood`、`meds`、`note`、`createdByMemberId`、`createdAt`。
- `careChecklist[]`：照护清单项，包括 `title`、`done`、`createdAt`、`updatedAt`。

系统资料：

- `systemProfile`：系统简介、边界、安抚方式、安全提醒等记录。
- `systemProfileVisibility`：公开资料分级 / 隐私桶设置，只影响应用内展示和导出，不是加密隔离。
- `memberRelations`：成员关系记录。
- `externalSystemCards`：保存的外部系统名片，不合并到本系统资料。

## 6. prefs 结构

`prefs` 主要字段包括：

- `fontSize`
- `dark`
- `lockHash`
- `useBiometric`
- `webauthnCredentialId`
- `resetToCover`
- `lastAppMode`
- `currentViewMemberId`
- `showAllPrivateRooms`
- `privateRoomNoticeSeen`
- `showArrivalOnEnter`
- `terms`

`showArrivalOnEnter` 控制进入记录界面时是否显示接续面板。`terms` 保存自定义术语，只影响界面文案，不修改历史内容或 JSON key。

## 7. IndexedDB 图片存储

`js/imageStore.js` 封装图片存储：

- 数据库：`moon-images`
- 版本：`1`
- objectStore：`images`
- keyPath：`id`

每条图片记录结构：

```js
{ id, blob, mime, name, createdAt }
```

ID 命名规则：

- 消息图片：`msgimg-${message.id}`
- 成员头像：`avatar-${member.id}`
- 房间背景：`roombg-${room.id}`

`window.imageStore` 暴露：

- `putImage({ id, blob, mime, name })`
- `getImageBlob(id)`
- `getImageUrl(id)`
- `deleteImage(id)`
- `listImages()`
- `dataUrlToBlob(dataUrl)`
- `blobToDataUrl(blob)`
- `revokeImageUrl(id)`
- `clearImageCache()`
- `selfTest()`

运行时新写入图片仍进入 IndexedDB，主 `data` 只长期保存 `imageId/avatarId/backgroundId`，不长期写 DataURL。

## 8. 图片导入导出语义

JSON 完整备份和 UI 完整 JSON 导出都使用同一语义：

- `formatExportJsonAsync(scopeOverride)` 导出 UI JSON；encrypted-json 调用时固定使用完整范围。
- `storage.exportBackup()` 导出程序化完整备份。
- 两者都会在导出对象的深拷贝上调用 `hydrateImagesForJsonExport()`。
- hydrate 会读取 IndexedDB Blob，并在导出副本中补齐 `imageData/avatarData/backgroundData`。
- hydrate 不修改运行时 `data`。
- 主记录完整 JSON / encrypted-json 默认不包含 `ledgerRecords` 或 `ledgerSettings`。账本使用首页的账本专用 JSON / CSV 导出。
- 普通 JSON 的 current / room 范围不是严格脱敏分享文件；它会过滤部分房间相关数据，但仍可能保留全局成员、系统资料或配置。

JSON 导入路径：

```text
importBackupFile(file)
  -> storage.importBackup(parsed)
  -> externalizeImagesAfterJsonImport(incoming, { keepBadIntegrityMessages, createdImageIds })
  -> data = incoming
  -> save()
  -> render()
```

导入规则：

- 如果导入 JSON 中有 `imageData`，写入 IndexedDB，设置新的唯一 import `imageId`，删除 `imageData`。
- 如果有 `avatarData`，写入 IndexedDB，设置新的唯一 import `avatarId`，删除 `avatarData`。
- 如果有 `backgroundData`，写入 IndexedDB，设置新的唯一 import `backgroundId`，删除 `backgroundData`。
- 如果新版 JSON 同时包含 ID 和 DataURL，优先用 DataURL 恢复为新的 import 图片 ID，避免覆盖本机已有同名图片。
- `externalizeImagesAfterJsonImport()` 完成后会按现有规则重算原本校验正常的消息 `integrity`；原备份中已经校验异常的消息不会被静默重算成正常。
- JSON 导入失败不会覆盖当前 `data`，并会 best-effort 删除本次导入新增的图片。
- 如果旧版主记录备份中存在 `ledgerRecords`，主记录导入只提示，不会自动覆盖当前账本。

P5-03 验收确认完整 JSON / encrypted-json 能恢复成员头像、房间背景和聊天图片；导出 hydrate 不改变运行时 data 或 IndexedDB 图片，导入 externalize 后主 data 不长期保留大体积 DataURL。

复盘报告和时间线只读取主数据摘要，只标记“含图片”，不读取 IndexedDB Blob，也不导出图片内容或 DataURL。

## 9. messageIntegrity 与 nextSeq

`messageIntegrity(m)` 定义在 `js/integrity.js`。规则保持不变：

- 没有 `imageId` 的旧格式消息，校验输入包含 `imageData`。
- 有 `imageId` 的新格式消息，校验输入包含 `imageId` 和 `_imgVer = 2`。
- 不应随意改变输入字段集合。
- 如果未来必须改变规则，需要显式版本标记并通过迁移重算。

`message.seq` 是消息校验码序号的来源，界面显示为 `seqCode(m)`，例如 `0001`。

`nextSeq` 修复规则：

- `calculateNextSeqFromMessages(messages)` 根据现有消息最大 `seq` 计算下一号。
- `resetNextSeqFromMessages()` 会从剩余 `messages` 重算 `data.nextSeq`。
- 删除消息、清空聊天、清空数据或删除房间内消息后会重算。
- 当 `messages` 为空时，`nextSeq` 回到 `1`，下一条消息校验码从 `0001` 开始。
- 这些修复不改变 `messageIntegrity` 规则。

合法重算 integrity 的场景：

- 图片外置迁移 `imageData -> imageId`。
- JSON 导入 externalize 图片之后，但原备份中已经校验异常的消息不得被静默洗成正常。
- 新建消息时由 `makeMessage()` 生成。

## 10. 启动与渲染

`boot()` 定义在 `js/app.js`，当前流程：

1. `await storage.init()`
2. `data = await load()`
3. `prefs = await loadPrefs()`
4. `ledgerRecords = await loadLedger()`
5. `ledgerSettings = await loadLedgerSettings()`
6. `currentRoomId = data.rooms[0]?.id || "main"`
7. `appMode = prefs.resetToCover===false ? (prefs.lastAppMode || "cover") : "cover"`
8. `await closeDuePolls()`
9. `await runAutoImageMigrationIfNeeded()`
10. `applyLedgerDefaultViewMode()`
11. `applyPrefs()`
12. `applyTermsToStaticLabels()`
13. `render()`
14. `applyAppMode()`

`render()` 在 `js/render.js`，负责刷新视角、列表、发言身份、分类、聊天、投票、交接、系统档案、成员关系、结构视图、系统名片和前台状态。

`renderChat()` 必须保持 async + `_renderChatSeq` 防竞态结构。图片 URL 解析优先走 `imageId/avatarId/backgroundId` 的 IndexedDB objectURL；旧 DataURL 仅作为兼容回退。图片缺失时显示 placeholder，不让渲染崩溃。

## 11. 当前功能模块

P0-P2 当前模块包括：

- 成员 / 群组 / 私聊基础管理。
- 成员档案 2.0：扩展字段、自定义字段、状态历史、结构视图隐私处理、头像外置。
- 前台日志 2.0：补录、编辑、删除、当前进行中记录、未知 / 混合 / 共前台等状态。
- 接续面板：进入后汇总前台、交接、消息、投票、任务和照护记录；支持管理模式删除来源记录。
- 交接模板 + 任务接力：模板填充、交接创建任务、任务开始 / 暂停 / 恢复 / 完成 / 删除。
- 高级搜索：内存聚合搜索消息、成员扩展字段、房间、交接、投票、前台、任务；支持跳转和消息高亮。
- 投票升级为议题 / 决议 / 复盘：议题说明、投票理由、暂停 / 恢复 / 取消、决议文本、复盘时间。
- 公开资料分级 / 隐私桶：`systemProfileVisibility` 控制应用内展示和脱敏导出，不是加密隔离。
- 系统名片：默认只包含可公开字段；可保存外部系统名片，不合并到本系统资料。
- 身体照护板 / 需求看板：照护记录、照护清单，可选写入聊天 `kind="状态"`。
- 备份健康检查 UI：检查图片引用、缺失图片、孤儿图片；修复和清理前均需确认。
- 自定义术语系统：自定义成员、系统、前台、交接、任务、照护、接续等界面词。
- 时间线总览 + 月度回顾：只读聚合消息、前台、交接、议题、任务、照护；不聚合账本、不读图片 Blob、不修改 `data`。
- 复盘报告导出：Markdown / TXT，只读生成；支持日期范围、章节开关、脱敏、排除私聊、隐藏成员名。
- 本地账本首页：账本记录存放在 `LEDGER_KEY`，账本分类和预算设置存放在 `LEDGER_SETTINGS_KEY`，与主记录完整备份隔离；首页提供收支 CRUD、分类管理、月度总预算、分类预算、日 / 月 / 年 / 全部统计、CSS 条形图、筛选摘要、空态提示、操作反馈、账本 JSON / CSV 导出和账本 JSON 替换导入。

## 12. 导入导出

普通导出：

- Markdown / TXT / CSV 支持脱敏导出。
- JSON 用于完整备份，默认保留全量数据；完整 JSON 备份包含图片 DataURL hydrate 结果。
- 局部 current / room JSON 不默认带出 `tasks`、`careLogs`、`careChecklist`，但可能仍包含全局成员、系统资料、成员关系、系统名片或配置，因此不是严格脱敏分享文件。
- 完整 all JSON 包含主记录数据、任务和照护数据，但不包含 `ledgerRecords` 或 `ledgerSettings`。
- encrypted-json 固定复用完整 all JSON，不受当前导出范围影响，因此同样不包含 `ledgerRecords` 或 `ledgerSettings`。
- 如需迁移账本，应使用首页的账本导入功能；旧版主记录备份里的 `ledgerRecords` 不会在主导入时自动恢复。账本 JSON v2 会携带 records 和 settings，导入时替换账本记录和账本设置；v1 只携带 records，导入时只替换账本记录并保留当前账本设置。分类改名不会批量迁移旧记录里的 `category` 字符串，分类预算按 `categoryName` 匹配旧记录分类名。

复盘报告导出：

- 格式：`review-md`、`review-txt`。
- 默认日期范围：当前自然月。
- 可选章节：概览统计、时间线摘要、聊天摘要、前台记录、交接、议题 / 投票、任务、照护记录。
- 脱敏支持成员别名、排除私聊、隐藏投票评论。
- 不导出系统档案、成员 customFields、隐私桶配置、系统名片或图片内容。
- 脱敏不是 NLP 脱敏；用户导出前仍需人工确认 note / 原文中是否包含敏感内容。

## 13. 控制台维护工具

`js/imageMigration.js`：

- `previewImageMigration()`
- `runImageMigrationToIndexedDB({ confirm: true })`
- `rollbackImageMigrationFromBackup()`

`js/imageHealth.js`：

- `runImageStorageHealthCheck()`
- `listImageStoreRecords()`
- `cleanOrphanImages({ confirm: true })`
- `previewRepairMissingImagesFromBackupJson(backupJsonOrObject)`
- `repairMissingImagesFromBackupJson(backupJsonOrObject, options)`
- `repairMissingImagesFromBackupFile(file, options)`

这些工具不会自动运行。备份健康检查 UI 只调用现有 imageHealth API，不直接改主 `data`；清理和修复需要用户确认。

P5-03 验收确认 imageHealth 能发现缺失图片引用、孤儿图片，并可从完整 JSON 备份修复缺失图片；报告只包含引用 id、类型、数量、文件名和大小等元信息，不包含图片 Blob 或 DataURL。

## 14. 不变约束（维护规则）

后续修改不应打破以下规则：

1. 不使用 `type="module"`。
2. 不引入 CDN、npm、打包工具、账号、云同步或远程 API。
3. 继续保持 local-only / offline-first。
4. 新写入路径不得把图片 DataURL 长期写入主 `data`。
5. `imageData/avatarData/backgroundData` 只作为旧数据兼容、导入输入和完整 JSON 导出字段存在。
6. 图片长期存储在 IndexedDB，不长期存储在 localStorage 主数据里。
7. 不随意修改 `messageIntegrity` 输入字段集合。
8. `renderChat()` 必须保持 async + `_renderChatSeq`。
9. JSON 完整备份必须尽量 hydrate 图片，保持单文件恢复语义。
10. JSON 导入失败不能覆盖当前 `data`。
11. 新写入图片后如果主数据保存失败，应尽量删除本次新图片并恢复内存状态；删除或替换旧头像 / 背景时，旧图片应延后到主数据保存成功后清理。
12. 不自动运行健康检查、孤儿清理或备份修复。
13. 不把“接续面板”改回旧名称。
14. 不把 visibility 当作安全加密边界；它只影响应用内展示和导出。

## 15. 已知局限与后续方向

当前架构的已知局限：

- localStorage 仍是主结构化数据存储；图片已经外置到 IndexedDB。
- 目前已有内存高级搜索，但没有持久化全文索引。
- 数据量极大时，加载、保存、迁移和搜索仍可能需要 IndexedDB / SQLite 结构化迁移。
- 没有虚拟滚动；消息和时间线极大时 DOM 可能变重。
- 复盘报告脱敏不是 NLP 脱敏，导出前仍需人工确认敏感内容。
- `systemProfileVisibility` 和成员自定义字段 visibility 只影响应用内展示和导出，不是加密隔离。
- 复盘报告和月度回顾只做本地记录统计，不做诊断、治疗建议或危机干预判断。

后续迁移 Flutter 或原生壳时，`imageStore.js` 的 `putImage/getImageBlob/getImageUrl` 可以对应到平台 bridge 或原生持久化调用；其他业务文件目前主要依赖 `window.imageStore` API。

SQLite 不是当前默认方向。只有在消息量、搜索需求、跨进程访问或原生打包需求真实出现后，再引入结构化数据库会更合适。
