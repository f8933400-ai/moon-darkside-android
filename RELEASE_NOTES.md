# 发布说明

## v0.3.0-local-stable

这是《月之暗面》的 P0-P2 本地稳定版。重点是把多意识体本地记录、前台日志、交接任务、隐私导出、照护、时间线和复盘报告打磨到可长期自用的基础状态。

本版本仍然是 local-only / offline-first：没有云同步、账号、遥测、CDN、npm、构建步骤或远程 API。

## P0-P2 已完成功能

P0 阶段：

- 成员、群组、私聊基础管理。
- 成员档案 2.0：扩展资料、自定义字段、状态历史、头像外置。
- 前台日志 2.0：支持前台、共前台、靠近前台、旁观 / 在场、混合 / 模糊、未知 / 不确定。
- 接续面板：汇总最近前台、交接、消息、投票、任务、照护信息。
- 交接模板 + 任务接力：交接可创建任务，任务可开始、暂停、恢复、完成、删除。
- 高级搜索：内存搜索消息、成员资料、房间、交接、投票、前台和任务。

P1 阶段：

- 投票升级为议题 / 决议 / 复盘：说明、理由、暂停、恢复、取消、决议和复盘时间。
- 公开资料分级 / 隐私桶：控制系统资料和部分字段的展示与脱敏导出。
- 身体照护板 / 需求看板：照护记录和照护清单，可选写入聊天。
- 备份健康检查 UI：检查缺失图片、孤儿图片，并可从完整 JSON 修复。
- 自定义术语系统：成员、系统、前台、交接、任务、照护、接续等界面词可自定义。

P2 阶段：

- 时间线总览 + 月度回顾：只读聚合消息、前台、交接、议题、任务和照护记录。
- 复盘报告导出：按日期范围导出 Markdown / TXT，可选择章节并套用脱敏选项。
- P2 总体验收：确认导入导出、图片外置、messageIntegrity、P0-P1 回归和移动端弹窗。
- 发布前维护：补齐本地图标资源，更新架构文档。

## 重要修复

- JSON 导入失败时不会覆盖当前 data。
- `storage.exportBackup()` 与 UI 完整 JSON 导出图片 hydrate 语义一致。
- 投票默认截止时间使用本地时间，避免时区偏移。
- 清空聊天 / 数据清零后 `nextSeq` 会从剩余消息重算；消息全部清空后，下一条校验码从 `0001` 开始。
- `renderChat()` 保持 async + `_renderChatSeq`，降低异步图片渲染竞态。
- 图片外置后，新聊天图片、成员头像和房间背景长期保存为 IndexedDB Blob + 主数据 ID。
- `app_icon.png` 和 `favicon.ico` 已补齐，避免本地浏览器资源 404。

## 数据兼容说明

- 主数据仍保存在 `localStorage` 的 `osddDidLocalJournal.v2`。
- 偏好保存在 `osddDidLocalJournal.prefs.v1`。
- 账本记录保存在 `moonLedger.records.v1`，完整 JSON 备份包含 `ledgerRecords`。
- 图片保存在 IndexedDB：`moon-images` / `images`。
- 旧备份中的 `imageData/avatarData/backgroundData` 导入后会 externalize 到 IndexedDB。
- 完整 JSON 导出会 hydrate 图片 DataURL，以便单文件备份。
- `messageIntegrity` 规则没有在本版本发布验证中改动。
- visibility / 隐私桶只影响应用内展示和导出，不是加密隔离。

完整 JSON 备份包含 P0-P2 数据字段，例如 `frontingLogs`、`tasks`、`careLogs`、`careChecklist`、`polls` 新字段、`systemProfileVisibility`、`memberRelations`、`externalSystemCards` 和 `ledgerRecords`。

## 已知限制

- 高级搜索是内存搜索，不是持久化全文索引。
- localStorage 仍是主结构化数据存储；数据量极大时可能需要 IndexedDB / SQLite 结构化迁移。
- 没有虚拟滚动；消息或时间线特别多时，DOM 可能变重。
- visibility / 隐私桶不是加密隔离。
- 复盘报告脱敏不是 NLP 脱敏，导出前需要人工检查敏感信息。
- 照护板不是医疗建议、治疗建议或危机干预。
- 时间线 / 月度回顾只是本地记录统计，不代表状态判断或诊断。
- 没有云同步、账号、遥测或远程 API。

## 下一阶段计划

下一阶段可以考虑：

- P3 前先做一次真实使用数据量下的性能评估。
- 视需要增加更细的复盘报告模板或导出预览。
- 评估是否需要结构化存储迁移，例如 IndexedDB 主数据表或 SQLite。
- 评估更好的移动端长列表体验，例如虚拟滚动。
- 继续保持 local-only / offline-first，不引入远程服务作为默认路径。
