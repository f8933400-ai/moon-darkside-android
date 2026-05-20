# 备份与恢复指南

这份指南专门说明《月之暗面》的主记录完整 JSON 备份、可选加密备份、账本专用备份、导入、图片恢复和备份健康检查。备份文件可能包含非常敏感的聊天、成员资料、照护记录、系统资料、账本记录和图片内容，不要随意发给不可信对象。

## 完整 JSON 备份

推荐定期导出完整 JSON 备份。

操作步骤：

1. 打开设置。
2. 进入“导出 / 导入备份”。
3. 导出范围选择“全部群组”。
4. 文件格式选择“JSON 备份”。
5. 点击导出并保存文件。

完整 JSON 备份用于恢复本机数据。它不是脱敏报告，也不是适合分享的公开文件。

## PWA 与备份的边界

PWA 安装是可选的，只负责让应用更方便地启动，并通过 Service Worker 缓存静态应用文件。它不是云同步，也不会把用户数据上传到任何地方。

Service Worker 不缓存完整 JSON 备份、`.moonenc.json` 加密备份、账本 JSON、CSV、图片 Blob、IndexedDB 内容或 `localStorage` 内容。当前数据仍保存在当前浏览器的 `localStorage` + IndexedDB 中；一旦清理站点数据、更换浏览器或更换设备，仍需要依靠完整 JSON 备份或加密备份恢复。

因此，PWA 不替代备份流程。v0.4.0 local stable 的静态壳缓存版本是 `moon-app-shell-v0.4.0`，并包含 128 / 192 / 512 本地图标；更新 app 文件后，如果看到旧界面，可以刷新页面，或清理此站点缓存 / Service Worker 后重新打开。直接用 `file://` 打开时，Service Worker 不可用；需要 PWA 缓存能力时，请使用本机 HTTP 或可信的 HTTPS 本地 / 私有静态服务。

## 可选加密完整 JSON 备份

如果需要保护导出的备份文件，可以在“文件格式”里选择“加密完整 JSON 备份”。应用会固定生成全部主记录范围的完整备份对象，包括 hydrate 后的图片 DataURL，再用密码加密并保存为 `.moonenc.json` 文件。它不受导出弹窗里的当前群组 / 指定群组范围影响。

加密备份的边界：

- 使用浏览器 Web Crypto API，在本机完成 PBKDF2 密钥派生和 AES-GCM 加密，不联网。
- 密码不会保存到 `localStorage`，不会写入备份文件，也不会写入加密 envelope。
- 忘记密码后无法恢复加密备份；应用没有找回密码或重置密码的能力。
- 加密只保护导出的 `.moonenc.json` 文件，不会加密当前浏览器里的本机数据。
- encrypted-json 固定复用主记录完整 JSON，因此默认不包含账本记录或账本设置。
- 普通 JSON 备份仍可用；你可以继续导出未加密 `.json` 作为离线恢复文件。
- 导入加密备份成功后，解密出的普通完整 JSON 会走同一套导入流程，图片仍会 externalize 到 IndexedDB。
- 备份文件和密码都需要谨慎保管。建议至少保留一份安全保存的备份，并谨慎分享任何完整备份。

加密 envelope 只保存版本、KDF 参数、cipher 参数和密文 payload，不包含明文 JSON、密码或密钥。

## 完整备份包含哪些字段

主记录完整 JSON 备份继续包含：

- `rooms`
- `members`
- `messages`
- `tags`
- `messageKinds`
- `polls`
- `handoffNotes`
- `frontingLogs`
- `tasks`
- `systemProfile`
- `systemProfileVisibility`
- `memberRelations`
- `externalSystemCards`
- `careLogs`
- `careChecklist`

主记录完整 JSON / encrypted-json 默认不再包含 `ledgerRecords` 或 `ledgerSettings`。账本记录平时独立保存在 `LEDGER_KEY`，账本分类和预算设置独立保存在 `LEDGER_SETTINGS_KEY`，需要使用首页的账本备份功能单独导出。

局部 current / room JSON 不默认带出 `tasks`、`careLogs`、`careChecklist`，但可能仍包含全局成员、系统资料、成员关系、系统名片或配置。它主要用于局部恢复或排查，不适合作为脱敏分享文件，也不能替代完整备份。需要完整恢复主记录时请导出“全部群组”的 JSON 备份，或选择“加密完整 JSON 备份”。

## 账本专用备份

账本首页提供两种专用导出：

- `导出账本备份`：生成 `moon-ledger-backup-YYYYMMDD-HHMM.json`。
- `导出 CSV`：生成 `moon-ledger-YYYYMMDD-HHMM.csv`，字段为 `date,type,amount,category,account,paymentMethod,note,createdAt,updatedAt`。

首页会说明 JSON 与 CSV 的用途区别：JSON 用于完整恢复账本，CSV 适合表格查看。JSON v2 包含账本记录和账本设置；CSV 仍只包含账本记录。

账本 JSON 格式：

```json
{
  "app": "moon-ledger",
  "kind": "ledger-backup",
  "version": 2,
  "createdAt": "...",
  "records": [],
  "settings": {
    "categories": [],
    "budgets": [],
    "defaultViewMode": "month"
  }
}
```

`records` 只包含账本记录，`settings` 只包含账本分类、月度预算和默认账本视图设置。账本备份不包含 `rooms`、`members`、`messages`、`frontingLogs`、`tasks`、`careLogs`、`polls`、`prefs`、图片 DataURL、系统资料、隐私桶设置或复盘报告。

账本记录字段包括 `id`、`type`、`amount`、`category`、`account`、`paymentMethod`、`date`、`note`、`createdAt`、`updatedAt`。金额为 0 的记录会被保留。

账本导入接受 `kind === "ledger-backup"` 且 `records` 为数组的文件，也兼容 version 1 账本备份和只含 `ledgerRecords` 数组的旧账本文件。version 1 只替换账本记录，会保留当前账本设置，不写入 `LEDGER_SETTINGS_KEY`；version 2 会在校验 settings 格式后同时导入 `records` 和 `settings`。导入前会显示记录数量、日期范围、总收入、总支出、分类数量、预算数量和导入方式。确认后只写入账本相关的 `LEDGER_KEY` / `LEDGER_SETTINGS_KEY`，不调用主记录导入，不写 IndexedDB 图片，也不修改主记录数据、偏好或 `messageIntegrity`。

分类改名不会批量迁移旧记录里的 `category` 字符串；预算统计以 `categoryName` 匹配账本记录中的分类名，以兼容旧记录。

旧版主记录备份如果包含 `ledgerRecords`，新版主导入不会自动恢复账本，只会提示。需要迁移旧账本时，请使用账本页的账本导入功能；如果文件同时包含 `rooms/messages/members` 等主记录字段，账本导入会拒绝读取其中内容。

## 图片如何导出

运行时新图片不长期写入主 JSON。

- 聊天图片保存在 IndexedDB，消息里保存 `imageId`。
- 成员头像保存在 IndexedDB，成员里保存 `avatarId`。
- 房间背景保存在 IndexedDB，房间里保存 `backgroundId`。

导出完整 JSON 时，应用会执行 hydrate：

1. 复制当前要导出的数据。
2. 根据 `imageId/avatarId/backgroundId` 从 IndexedDB 读取 Blob。
3. 把图片转换成 DataURL。
4. 写入导出副本里的 `imageData/avatarData/backgroundData`。
5. 不修改运行时 `data`。

这样完整 JSON 备份可以成为单文件备份，包含图片恢复所需内容。

P5-03 验收确认：成员头像、房间背景和聊天图片都会在完整 JSON 导出副本中 hydrate 为 DataURL；导出不会改变当前运行时 data，也不会删除 IndexedDB 中的图片。

## JSON 导入如何恢复图片

导入 JSON 时，应用会 externalize 图片：

1. 先读取和解析 JSON。
2. 迁移旧数据结构并补齐字段。
3. 对 `messages` 中的 `imageData` 写入 IndexedDB，设置 `imageId`，删除 `imageData`。
4. 对 `members` 中的 `avatarData` 写入 IndexedDB，设置 `avatarId`，删除 `avatarData`。
5. 对 `rooms` 中的 `backgroundData` 写入 IndexedDB，设置 `backgroundId`，删除 `backgroundData`。
6. 对原本校验正常的消息按现有规则重算 `integrity`；对原备份中已经校验异常的消息，保留异常状态并提示用户。
7. 全部成功后才覆盖当前运行时 data 并保存。

如果导入失败，当前 data 不会被覆盖。

如果导入确认时提示存在 `messageIntegrity` 异常，导入完成后这些异常消息仍会保持“校验异常”状态，不会因为图片 externalize 被静默重算成正常。

导入加密备份时，应用会先要求输入备份密码。密码只用于本次解密，不会保存。密码错误、文件损坏或解密后不是有效备份时，当前 data 不会被覆盖，也不会写入 IndexedDB 图片。

P5-03 验收确认：完整 JSON 和 encrypted-json 导入后，成员头像、房间背景、聊天图片都能 externalize 回 IndexedDB，并恢复为 `avatarId/backgroundId/imageId` 引用；主 data 不会长期保留大体积图片 DataURL。

## storage.exportBackup() 与 UI JSON 导出

`storage.exportBackup()` 和 UI 完整 JSON 导出保持一致语义：

- 都会生成完整备份对象。
- 都会 hydrate 图片。
- 都不会修改运行时 `data`。
- 都保留主记录完整备份所需字段。
- 都不包含 `ledgerRecords` 或 `ledgerSettings`。

这意味着用于恢复的完整备份可以来自 UI 导出，也可以来自调用 `storage.exportBackup()` 的桌面或调试流程。

## 导入前的安全提醒

导入 JSON 会覆盖当前本机主数据。建议：

- 导入前先导出当前完整 JSON 备份。
- 只导入自己信任来源的备份。
- 不要导入来源不明或被修改过的 JSON。
- 如果导入失败，应用会保留当前 data，但仍建议保留手动备份。

visibility / 隐私桶只影响应用内展示和导出，不是加密隔离。完整 JSON 备份可能包含 visibility 标记为 private 的内容。

加密备份同样可能包含完整敏感内容，只是导出文件被密码保护。它不会改变本机浏览器存储里的明文主数据、账本数据或 IndexedDB 图片库。账本数据需要另行使用账本备份导出。

图片写入和主数据保存跨越 IndexedDB 与 localStorage，浏览器本身不提供统一事务。本版本对新增聊天图片、成员头像和房间背景做了最小回滚：如果主数据保存失败，会尽量删除本次新写入图片并恢复内存状态；删除或替换头像 / 背景时，旧图片会延后到主数据保存成功后再清理。

## 备份健康检查 UI

备份健康检查用于处理图片库和主数据之间的关系。

可以检查：

- 主数据引用的图片数量。
- IndexedDB 中缺失的图片。
- IndexedDB 中不再被主数据引用的孤儿图片。

使用步骤：

1. 打开设置。
2. 点击“备份健康检查”。
3. 点击“运行检查”。
4. 根据结果决定是否清理孤儿图片或从备份修复缺失图片。

清理和修复操作都需要再次确认，不会自动运行。

## 从 JSON 修复缺失图片

如果健康检查发现缺失图片，而你有一份包含图片 DataURL 的完整 JSON 备份：

1. 打开“备份健康检查”。
2. 点击“选择 JSON 备份”。
3. 选择完整 JSON 备份文件。
4. 点击“预览可修复图片”。
5. 确认预览结果。
6. 点击“从备份修复缺失图片”。

修复过程会从 JSON 备份里的 `imageData/avatarData/backgroundData` 恢复图片到 IndexedDB。它不应该直接改主 data；主 data 中原本的图片 ID 会继续指向修复后的 Blob。

P5-03 验收确认：正常图片数据下健康检查不报告缺失；删除被引用 Blob 后能发现缺失引用；额外写入未引用图片后能报告孤儿图片；从完整 JSON 备份修复缺失图片后可恢复健康状态。

## 复盘报告和普通导出不是完整备份

Markdown、TXT、CSV 和复盘报告适合阅读、整理或有限分享，但它们不是完整恢复用备份。

尤其是复盘报告：

- 只导出选定日期范围和章节。
- 图片只显示“含图片”，不导出图片内容。
- 脱敏不是 NLP 脱敏，导出前需要人工检查敏感信息。
- 不导出系统档案、成员自定义字段、图片 Blob 或隐私桶配置。

需要恢复数据时，请使用完整 JSON 备份。

## 校验码和清空后的序号

消息校验码序号来自 `message.seq`。删除或清空消息后，`nextSeq` 会从剩余 messages 重新计算。全部消息清空后，下一条消息从 `0001` 开始。

这只是序号重算，不改变 `messageIntegrity` 规则。

## 备份文件如何保管

完整 JSON 备份可能包含：

- 聊天原文
- 私聊内容
- 成员资料
- 前台记录
- 交接和任务
- 投票理由和决议
- 照护记录
- 系统资料
- 图片 DataURL

账本专用备份可能包含收入、支出、分类、日期、账户、付款方式和备注，也请保存在可信位置。不要把完整备份或账本备份发给不可信对象，也不要上传到不了解隐私边界的地方。加密备份可以降低主记录备份文件泄露后的风险，但忘记密码无法恢复；普通 JSON 备份仍可用，适合放在你能确保安全的离线位置。
