# 月之暗面 — 架构说明

## 1. 项目概述

“月之暗面”是一个本地运行的单页面应用，用于记录群组、私聊、成员、状态、投票、交接便签、账本和系统资料。页面入口是 `index.html`，可以通过 `file://` 直接打开，也可以用本地 HTTP 服务打开，例如 `http://127.0.0.1:8080/index.html`。

本项目没有构建步骤，不使用 `type="module"`，没有 CDN，没有 npm 依赖，也没有远程 API 请求。所有 JavaScript 文件通过普通 `<script src="...">` 按顺序加载，共享同一个全局作用域。

本项目默认 local-only / offline-first，不需要账号、云端、遥测或远程 API。所有用户数据默认保存在本机浏览器存储中（`localStorage` + IndexedDB）。没有任何数据会被发送到外部服务器。

## 2. 文件结构与加载顺序

`index.html` 当前脚本加载顺序如下：

```html
<script src="js/data.js"></script>
<script src="js/imageStore.js"></script>
<script src="js/integrity.js"></script>
<script src="js/migrate.js"></script>
<script src="js/storage.js"></script>
<script src="js/imageMigration.js"></script>
<script src="js/imageHealth.js"></script>
<script src="js/render.js"></script>
<script src="js/features/members.js"></script>
<script src="js/features/rooms.js"></script>
<script src="js/features/messages.js"></script>
<script src="js/features/polls.js"></script>
<script src="js/features/handoff.js"></script>
<script src="js/features/system-card.js"></script>
<script src="js/features/ledger.js"></script>
<script src="js/features/import-export.js"></script>
<script src="js/app.js"></script>
```

文件职责：

- `js/data.js`：常量、localStorage 键名、默认偏好、初始数据、工具函数。
- `js/imageStore.js`：IndexedDB 图片存储封装，暴露 `window.imageStore`。
- `js/integrity.js`：文本/CSV/Markdown 辅助、消息完整性校验、消息构造、基础查找函数。
- `js/migrate.js`：主数据结构迁移和默认字段补齐。
- `js/storage.js`：`LocalStorageAdapter`，负责主数据、偏好、账本的加载保存和 JSON 备份解析。
- `js/imageMigration.js`：旧 DataURL 图片迁移到 IndexedDB 的控制台工具。
- `js/imageHealth.js`：图片健康检查、孤儿清理、从 JSON 备份恢复缺失图片的控制台工具。
- `js/render.js`：偏好应用、列表/聊天/结构视图等渲染逻辑。
- `js/features/*.js`：成员、群组、消息、投票、交接、系统名片、账本、导入导出等业务功能。
- `js/app.js`：全局 UI 状态、事件绑定、启动流程、自动图片迁移触发。

注意：

- 不使用 `type="module"`。
- 所有文件共享同一个全局作用域（`window`）。
- 加载顺序即依赖顺序：后加载的文件可以访问前面文件定义的变量和挂到 `window` 的对象。

## 3. 全局状态

核心全局状态在 `js/app.js` 顶部定义：

- `data`：运行时主数据对象，包含成员、房间、消息、标签、投票、系统资料等。
- `prefs`：用户偏好，例如字号、主题、锁定设置、当前视角、是否显示全部私聊。
- `ledgerRecords`：账本记录数组。
- `currentRoomId`：当前打开的房间 ID。
- `tab`：侧边栏当前页签，常见值为 `rooms`、`private`、`members`。
- `appMode`：当前模式，主要在封面和记录界面之间切换。
- `pendingMemberAvatar`：成员头像编辑过程中的临时 DataURL、`"__KEEP__"` 或 `null`。
- `pendingRoomBg`：房间背景编辑过程中的临时 DataURL、`"__KEEP__"` 或 `null`。
- `pendingChatImage`：发送聊天图片前的临时预览数据。
- `pendingSystemCardPayload`、`pendingSystemCardImage`、`pendingSystemCardBg`、`pendingReceivedSystemCard`：系统名片相关临时状态。

## 4. localStorage 键名

主数据键名定义在 `js/data.js`：

```js
KEY = "osddDidLocalJournal.v2"
OLD_KEY = "osddDidLocalJournal.v1"
```

- `KEY`：当前版本主数据。
- `OLD_KEY`：旧版本主数据；`loadAppData()` 会兼容读取，但保存只写 `KEY`。

偏好与账本：

```js
PREF_KEY = "osddDidLocalJournal.prefs.v1"
LEDGER_KEY = "moonLedger.records.v1"
```

- `PREF_KEY`：用户偏好。
- `LEDGER_KEY`：账本记录。

图片迁移键名定义在 `js/imageMigration.js`：

- `imageMigrationDone`：值为 `"1"` 时跳过自动迁移。
- `imageMigrationAt`：迁移完成时间，ISO 字符串。
- `imageMigrationVersion`：当前写入 `"1"`。
- `backupBeforeImageMigration.v1`：迁移前主数据备份 JSON 字符串，用于回滚。

## 5. 主数据结构（data 对象）

`data` 由 `js/data.js` 的 `initial`、`js/migrate.js` 的迁移补齐、`js/storage.js` 的加载保存共同维护。主要字段包括：

- `nextSeq`
- `tags`
- `messageKinds`
- `polls`
- `handoffNotes`
- `systemProfile`
- `memberRelations`
- `externalSystemCards`
- `rooms`
- `members`
- `messages`

图片相关字段：

`messages[]`：

- `imageId`：图片存储在 IndexedDB 的 ID。新格式运行时主字段。
- `imageData`：图片 DataURL。旧格式兼容字段；新聊天图片不再写入。
- `imageName`、`imageType`：图片元信息。
- `integrity`：消息完整性校验码，见第 7 节。

`members[]`：

- `avatarId`：头像存储在 IndexedDB 的 ID。
- `avatarData`：头像 DataURL。旧格式兼容字段。

`rooms[]`：

- `backgroundId`：背景图存储在 IndexedDB 的 ID。
- `backgroundData`：背景图 DataURL。旧格式兼容字段。

## 6. IndexedDB 图片存储

`js/imageStore.js` 封装图片存储：

- 数据库：`moon-images`
- 版本：`1`
- objectStore：`images`
- keyPath：`id`

每条图片记录字段：

```js
{ id, blob, mime, name, createdAt }
```

ID 命名规则：

- 消息图片：`msgimg-${message.id}`
- 成员头像：`avatar-${member.id}`
- 房间背景：`roombg-${room.id}`

`window.imageStore` 暴露 API：

写入类：

- `putImage({ id, blob, mime, name })`：写入或覆盖一张图片。
- `deleteImage(id)`：删除一张图片。

读取类：

- `getImageBlob(id)`：返回 `Blob` 或 `null`。
- `getImageUrl(id)`：返回 objectURL；内部用 `urlCache` 缓存，避免重复 `URL.createObjectURL`。
- `listImages()`：返回摘要数组 `[{ id, mime, name, createdAt, size }]`，不包含 `Blob`。

辅助类：

- `dataUrlToBlob(dataUrl)`：DataURL 转 `Blob`。
- `blobToDataUrl(blob)`：`Blob` 转 DataURL，返回 `Promise`。
- `revokeImageUrl(id)`：释放指定 ID 的 objectURL 缓存。
- `clearImageCache()`：释放全部 objectURL 缓存。
- `selfTest()`：控制台自测，返回 `{ ok, put, read, dataUrl, objectUrl, deleted, dataUrlToBlob, pngMime }` 等结果。

## 7. 消息完整性校验（messageIntegrity）

`messageIntegrity(m)` 定义在 `js/integrity.js`。

旧格式：消息没有 `imageId` 时，校验输入包括 `imageData`：

```js
checksum([
  m.seq, m.id, m.roomId, m.speakerId, m.speakerName, m.kind,
  m.text, m.imageName, m.imageType, m.imageData, m.createdAt
].map(v=>v||"").join("\\u001f"))
```

新格式：消息有 `imageId` 时，使用 `_imgVer = 2`，校验输入包括 `imageId`：

```js
checksum([
  m.seq, m.id, m.roomId, m.speakerId, m.speakerName, m.kind,
  m.text, m.imageName, m.imageType, m.imageId, _imgVer, m.createdAt
].map(v=>v||"").join("\\u001f"))
```

合法重算场景：

1. 图片外置迁移（`imageData` → `imageId`）时，`runImageMigrationToIndexedDB()` 会对所有消息重算 `integrity`。
2. JSON 导入后，`externalizeImagesAfterJsonImport()` 会对所有消息重算 `integrity`。

## 8. 启动流程（boot）

`boot()` 定义在 `js/app.js`，当前执行顺序：

1. `await storage.init()`
2. `data = await load()`
3. `prefs = await loadPrefs()`
4. `ledgerRecords = await loadLedger()`
5. `currentRoomId = data.rooms[0]?.id || "main"`
6. `appMode = prefs.resetToCover===false ? (prefs.lastAppMode || "cover") : "cover"`
7. `await closeDuePolls()`
8. `await runAutoImageMigrationIfNeeded()`
9. `applyPrefs()`
10. `render()`
11. `applyAppMode()`

`boot().catch(...)` 会在启动失败时记录错误并提示数据加载失败。

## 9. 自动图片迁移（runAutoImageMigrationIfNeeded）

`runAutoImageMigrationIfNeeded()` 定义在 `js/app.js`，不挂到 `window`。

触发和守卫逻辑：

- 如果 `localStorage.getItem("imageMigrationDone") === "1"`，直接跳过。
- 如果当前 `data` 中没有任何 `imageData`、`avatarData`、`backgroundData`，写入：
  - `imageMigrationDone = "1"`
  - `imageMigrationAt = new Date().toISOString()`
  - `imageMigrationVersion = "1"`
  然后跳过。
- 否则调用 `window.runImageMigrationToIndexedDB({ confirm: true })`。
- 迁移成功时，迁移函数内部写入 `imageMigrationDone` 等标记。
- 迁移失败时只 `console.error`，不 `alert`，不阻断后续 `render()`，下次启动仍可重试。
- 不自动运行健康检查。
- 不自动清理孤儿图片。

## 10. 渲染管线（render）

渲染逻辑在 `js/render.js`。

关键设计：

- `render()` 是异步函数，会依次调用列表、发言者、分类、聊天、投票、交接、系统资料、关系、结构视图、系统名片面板等渲染函数。
- `renderChat()` 是异步函数。
- 使用 `_renderChatSeq` 防竞态：每次 `renderChat()` 调用递增序号；异步图片 URL 读取完成后检查序号是否仍是最新，若已被新一轮渲染抢占，则放弃写 DOM。

图片 URL 解析：

```js
resolveStoredImageUrl(record, idKey, dataKey)
```

- 优先读取 `record[idKey]`，例如 `imageId`、`avatarId`、`backgroundId`。
- 调用 `window.imageStore.getImageUrl()` 获取 objectURL。
- 如果 IDB 中缺失 Blob，会 `console.warn`，并回退到旧字段 `record[dataKey]`。
- 两者都无则返回空字符串。

批量预取：

```js
buildStoredImageUrlMap(records, idKey, dataKey)
```

- 按图片 ID 批量预取一组记录的图片 URL。
- 返回 `Map`，同时按 `record.id` 和图片 ID 存储 URL。
- 避免在消息循环内部逐条 `await`。

图片缺失显示：

- `bubbleContent(m, imageUrl)` 定义在 `js/integrity.js`。
- 如果有可用 URL，渲染 `<img>`。
- 如果有 `m.imageId` 但没有可用 URL，渲染 `<div class="img-placeholder">图片已丢失</div>`。
- 不因图片缺失导致渲染崩溃。

## 11. 图片保存路径（新图片写入流程）

聊天图片：`sendChatImage()` 在 `js/features/messages.js`。

流程：

1. `pendingChatImage.dataUrl` 保存临时预览。
2. `window.imageStore.dataUrlToBlob(dataUrl)` 转 Blob。
3. `window.imageStore.putImage({ id: "msgimg-" + msgId, blob, mime, name })` 写入 IDB。
4. 新消息只写入 `imageId`、`imageName`、`imageType`，不写 `imageData`。
5. 如果写入 IDB 失败，`alert` 用户并停止创建消息。

成员头像：`saveMemberBtn.onclick` 内的 `applyAvatarToMember()` 在 `js/app.js`。

- `pendingMemberAvatar === "__KEEP__"`：保留原头像。
- `pendingMemberAvatar === null`：删除 `avatarId/avatarData` 字段，并尝试 `imageStore.deleteImage(oldId)`。
- 传入 DataURL 时，写入 `avatar-${member.id}`，设置 `member.avatarId`，删除 `member.avatarData`。

房间背景：`saveRoomBtn.onclick` 内的 `applyBgToRoom()` 在 `js/app.js`。

- `pendingRoomBg === "__KEEP__"`：保留原背景。
- `pendingRoomBg === null`：删除 `backgroundId/backgroundData` 字段，并尝试 `imageStore.deleteImage(oldId)`。
- 传入 DataURL 时，写入 `roombg-${room.id}`，设置 `room.backgroundId`，删除 `room.backgroundData`。

## 12. JSON 导入导出

导出路径在 `js/features/import-export.js`。

`formatExportJsonAsync()`：

1. 根据导出范围取 `selected.rooms` 和 `selected.messages`。
2. 用 `JSON.parse(JSON.stringify(...))` 深拷贝导出对象，不修改运行时 `data`。
3. 调用 `hydrateImagesForJsonExport(exportObj)`。
4. 对有 `imageId/avatarId/backgroundId` 但无 DataURL 的记录，从 IndexedDB 读取 Blob，再用 `blobToDataUrl()` 写回深拷贝对象的 `imageData/avatarData/backgroundData`。
5. 如果部分图片在 IDB 缺失，会 `console.warn` 并 `alert` 用户备份可能不完整；导出仍继续。
6. 导出 JSON 可同时包含 `imageId` 和 `imageData`，用于完整单文件备份。

导入路径：

```text
importBackupFile(file)
  → storage.importBackup()
  → externalizeImagesAfterJsonImport(incoming)
  → data = incoming
  → save()
  → render()
```

`externalizeImagesAfterJsonImport(appData)`：

- 遍历 `messages`：如果有 `imageData`，写入 IDB，设置 `imageId`，删除 `imageData`。
- 遍历 `members`：如果有 `avatarData`，写入 IDB，设置 `avatarId`，删除 `avatarData`。
- 遍历 `rooms`：如果有 `backgroundData`，写入 IDB，设置 `backgroundId`，删除 `backgroundData`。
- 如果新版 JSON 同时有 ID 和 DataURL，优先用 DataURL 写入原 ID。
- 对所有 `messages` 重算 `integrity`。
- 全部成功后才覆盖运行时 `data`。
- 任何步骤失败会进入 `catch`，`console.error` 并 `alert`，不会覆盖当前 `data`。

兼容性：

- 旧版 JSON 只有 DataURL：导入后自动外置到 IDB。
- 新版 JSON 有 ID + DataURL：导入时用 DataURL 恢复图片到 IDB。
- 运行时快照只有 ID：导出时 hydrate 补齐 DataURL。

## 13. 控制台维护工具

`js/imageMigration.js`：

- `previewImageMigration()`
  - 只统计当前 `data` 中有多少 `imageData/avatarData/backgroundData` 待迁移。
  - 不写数据。
- `runImageMigrationToIndexedDB({ confirm: true })`
  - 执行旧图片外置迁移。
  - 必须传 `confirm: true`。
  - 迁移前写入 `backupBeforeImageMigration.v1`。
  - 把 DataURL 写入 IDB，改为 `imageId/avatarId/backgroundId`，删除 DataURL 字段。
  - 重算消息 integrity。
  - 保存主数据并写入迁移标记。
- `rollbackImageMigrationFromBackup()`
  - 从 `backupBeforeImageMigration.v1` 恢复主数据。
  - 清除迁移标记。
  - 不删除 IDB 图片。

`js/imageHealth.js`：

- `runImageStorageHealthCheck()`
  - 扫描 `data` 中所有 `imageId/avatarId/backgroundId`。
  - 检查 IDB 中是否存在对应 Blob。
  - 同时找出 IDB 中不再被 `data` 引用的孤儿图片。
  - 返回 `{ ok, referenced, missing, orphaned, indexedDbTotal }`。
- `listImageStoreRecords()`
  - 列出 IDB 所有图片摘要 `[{ id, mime, name, createdAt, size }]`。
  - 不返回 Blob。
- `cleanOrphanImages({ confirm: true })`
  - 清理 IDB 中 `data` 不再引用的孤儿图片。
  - 必须传 `confirm: true`。
  - 不修改 `data`。
- `previewRepairMissingImagesFromBackupJson(backupJsonOrObject)`
  - 只读操作。
  - 统计当前 missing 图片中有多少能从备份 JSON 的 DataURL 恢复。
  - 不写 IDB，不改 `data`，不写 localStorage。
- `repairMissingImagesFromBackupJson(backupJsonOrObject, options)`
  - 从备份 JSON 顶层 `messages/members/rooms` 中读取 `imageData/avatarData/backgroundData`。
  - 把当前 missing 图片写回 IDB。
  - `options.overwrite = false` 为默认值；已有同 ID 图片时跳过。
  - 返回 `{ ok, repaired, stillMissing, skipped, errors }`。
- `repairMissingImagesFromBackupFile(file, options)`
  - 接收 `File` 对象。
  - 用 `FileReader` 读取 JSON 文本。
  - 调用 `repairMissingImagesFromBackupJson()`。
  - 返回 `Promise`，resolve 值与 `repairMissingImagesFromBackupJson()` 相同。

## 14. 不变约束（代码冻结规则）

后续修改不应打破以下规则：

1. 不使用 `type="module"`。所有 JS 文件用普通 `<script src>` 加载，共享 `window` 作用域。
2. 不引入 CDN、npm、打包工具。页面可以通过 `file://` 打开，也可以通过本地 HTTP 服务打开。
3. 新写入路径不得再把图片 DataURL 长期写入 `data`。
4. `imageData/avatarData/backgroundData` 只作为兼容输入和导出备份字段存在：
   - 渲染时作为 IDB 缺失或旧数据的回退来源。
   - 导出时由 `hydrateImagesForJsonExport()` 从 IDB 补回到导出对象，不改运行时 `data`。
   - 导入时由 `externalizeImagesAfterJsonImport()` 读取后立即外置为 ID，并从 `data` 中删除。
   - 启动迁移后，运行时 `data` 不应长期保留 DataURL 字段。
5. 图片存储在 IndexedDB（`moon-images` / `images` store），不长期存储在 localStorage 主数据里。
6. `messageIntegrity` 的输入字段集合不能随意修改。
7. 改变 integrity 规则必须使用版本标记（当前图片新格式为 `_imgVer = 2`），并在迁移时重算所有消息。
8. `renderChat()` 必须保持 async + `_renderChatSeq` 防竞态结构。
9. 图片失败处理规则：
   - 新聊天图片写入 `imageStore` 失败：不能创建消息，必须 `alert` 用户。
   - 成员/房间删除旧图片时，`imageStore.deleteImage(oldId).catch(()=>{})` 不阻塞保存。
   - 不应创建“`data` 中有新 `imageId` 但 IDB 写入失败”的新数据。
10. JSON 导出必须尽量包含 `imageData/avatarData/backgroundData`，保证单文件完整备份语义。
11. JSON 导入失败时不覆盖当前 `data`。
12. 健康检查、孤儿清理、备份恢复工具都是控制台维护工具，不应在页面加载或 `boot()` 中自动运行。

## 15. 已知局限与后续方向

当前架构的已知局限：

- localStorage 仍然是主数据存储；图片已经外置到 IndexedDB，但消息、成员、房间等结构化数据仍保存在 localStorage。
- 数据量非常大时，例如几千条消息，主数据 JSON 的加载、保存和整体迁移仍可能变慢。
- 没有虚拟滚动；消息数极多时，聊天 DOM 可能变大。
- 没有全文搜索。

后续迁移 Flutter 或原生壳时，`imageStore.js` 的 `putImage/getImageBlob/getImageUrl` 可以对应到平台 bridge 或原生持久化调用；其他业务文件目前主要依赖 `window.imageStore` API。

关于 SQLite：

SQLite 不是当前救火项。现有架构已经通过 IndexedDB 图片外置解决了 localStorage 膨胀和 DataURL 内存压力的主要问题。只有在以下真实需求出现时，再启动 SQLite 迁移更合适：

- 消息数量增长到查询、加载或渲染明显变慢。
- 需要全文搜索。
- 需要打包为原生应用，并希望结构化数据使用平台级持久化存储。
- 需要跨进程访问同一份数据。

在这些需求出现前，不建议提前引入 SQLite 复杂度。
