# 备份与恢复指南

这份指南专门说明《月之暗面》的完整 JSON 备份、可选加密备份、导入、图片恢复和备份健康检查。备份文件可能包含非常敏感的聊天、成员资料、照护记录、系统资料和图片内容，不要随意发给不可信对象。

## 完整 JSON 备份

推荐定期导出完整 JSON 备份。

操作步骤：

1. 打开设置。
2. 进入“导出 / 导入备份”。
3. 导出范围选择“全部群组”。
4. 文件格式选择“JSON 备份”。
5. 点击导出并保存文件。

完整 JSON 备份用于恢复本机数据。它不是脱敏报告，也不是适合分享的公开文件。

## 可选加密完整 JSON 备份

如果需要保护导出的备份文件，可以在“文件格式”里选择“加密完整 JSON 备份”。应用会先生成与普通完整 JSON 备份等价的备份对象，包括 hydrate 后的图片 DataURL，再用密码加密并保存为 `.moonenc.json` 文件。

加密备份的边界：

- 使用浏览器 Web Crypto API，在本机完成 PBKDF2 密钥派生和 AES-GCM 加密，不联网。
- 密码不会保存到 `localStorage`，不会写入备份文件，也不会写入加密 envelope。
- 忘记密码后无法恢复加密备份；应用没有找回密码或重置密码的能力。
- 加密只保护导出的 `.moonenc.json` 文件，不会加密当前浏览器里的本机数据。
- 普通 JSON 备份仍可用；你可以继续导出未加密 `.json` 作为离线恢复文件。
- 导入加密备份成功后，解密出的普通完整 JSON 会走同一套导入流程，图片仍会 externalize 到 IndexedDB。
- 备份文件和密码都需要谨慎保管。建议至少保留一份安全保存的备份，并谨慎分享任何完整备份。

加密 envelope 只保存版本、KDF 参数、cipher 参数和密文 payload，不包含明文 JSON、密码或密钥。

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

导入加密备份时，应用会先要求输入备份密码。密码只用于本次解密，不会保存。密码错误、文件损坏或解密后不是有效备份时，当前 data 不会被覆盖，也不会写入 IndexedDB 图片。

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

加密备份同样可能包含完整敏感内容，只是导出文件被密码保护。它不会改变本机浏览器存储里的明文主数据、账本数据或 IndexedDB 图片库。

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

请把备份保存在可信位置。不要把完整备份发给不可信对象，也不要上传到不了解隐私边界的地方。加密备份可以降低备份文件泄露后的风险，但忘记密码无法恢复；普通 JSON 备份仍可用，适合放在你能确保安全的离线位置。
