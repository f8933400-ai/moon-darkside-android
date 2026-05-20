# 备份与恢复指南

这份指南专门说明《月之暗面》的完整 JSON 备份、导入、图片恢复和备份健康检查。备份文件可能包含非常敏感的聊天、成员资料、照护记录、系统资料和图片内容，不要随意发给不可信对象。

## 完整 JSON 备份

推荐定期导出完整 JSON 备份。

操作步骤：

1. 打开设置。
2. 进入“导出 / 导入备份”。
3. 导出范围选择“全部群组”。
4. 文件格式选择“JSON 备份”。
5. 点击导出并保存文件。

完整 JSON 备份用于恢复本机数据。它不是脱敏报告，也不是适合分享的公开文件。

## 完整备份包含哪些字段

完整 JSON 备份继续包含：

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
- `ledgerRecords`

其中 `ledgerRecords` 平时独立保存在 `LEDGER_KEY`，但完整 JSON 备份会包含它。

局部 current / room JSON 不默认带出 `ledgerRecords`、`tasks`、`careLogs`、`careChecklist`。需要完整恢复时请导出“全部群组”的 JSON 备份。

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

## JSON 导入如何恢复图片

导入 JSON 时，应用会 externalize 图片：

1. 先读取和解析 JSON。
2. 迁移旧数据结构并补齐字段。
3. 对 `messages` 中的 `imageData` 写入 IndexedDB，设置 `imageId`，删除 `imageData`。
4. 对 `members` 中的 `avatarData` 写入 IndexedDB，设置 `avatarId`，删除 `avatarData`。
5. 对 `rooms` 中的 `backgroundData` 写入 IndexedDB，设置 `backgroundId`，删除 `backgroundData`。
6. 按现有规则重算消息 `integrity`。
7. 全部成功后才覆盖当前运行时 data 并保存。

如果导入失败，当前 data 不会被覆盖。

## storage.exportBackup() 与 UI JSON 导出

`storage.exportBackup()` 和 UI 完整 JSON 导出保持一致语义：

- 都会生成完整备份对象。
- 都会 hydrate 图片。
- 都不会修改运行时 `data`。
- 都保留完整备份所需字段。

这意味着用于恢复的完整备份可以来自 UI 导出，也可以来自调用 `storage.exportBackup()` 的桌面或调试流程。

## 导入前的安全提醒

导入 JSON 会覆盖当前本机主数据。建议：

- 导入前先导出当前完整 JSON 备份。
- 只导入自己信任来源的备份。
- 不要导入来源不明或被修改过的 JSON。
- 如果导入失败，应用会保留当前 data，但仍建议保留手动备份。

visibility / 隐私桶只影响应用内展示和导出，不是加密隔离。完整 JSON 备份可能包含 visibility 标记为 private 的内容。

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
- 账本记录
- 图片 DataURL

请把备份保存在可信位置。不要把完整备份发给不可信对象，也不要上传到不了解隐私边界的地方。
