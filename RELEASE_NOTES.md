# 发布说明

## v0.4.0-local-stable

这是《月之暗面》的 v0.4.0 本地稳定版。重点是把 P4 本地账本隔离和 P5 数据安全、图片备份恢复、PWA 离线缓存验收收束为可分发的 local stable 包。

本版本仍然是 local-only / offline-first：没有云同步、账号、遥测、CDN、npm、构建步骤、`type="module"` 或远程 API。

主要内容：

- 完成 P4 账本能力：本地账本 CRUD、日 / 月 / 年 / 全部统计、分类管理、月度预算、分类预算、CSS 条形图、账本 JSON v2 和 CSV 专用导出。
- 完成账本隔离：主记录 JSON / encrypted-json 不包含 `ledgerRecords` 或 `ledgerSettings`；账本 records 使用 `moonLedger.records.v1`，账本 settings 使用 `moonLedger.settings.v1`。
- encrypted-json 固定导出完整主记录范围，不再跟随当前群组 / 指定群组导出范围；账本仍需单独备份。
- 导入主 JSON 时，如果原备份存在 `messageIntegrity` 异常，异常消息不会被图片 externalize 流程静默洗成“校验正常”。
- 完成图片备份 / 恢复验收：成员头像、房间背景、聊天图片可通过完整 JSON / encrypted-json hydrate 和 externalize 恢复。
- 完成图片一致性最小修复：新增图片写入后如果主数据保存失败，会尽量回滚新图片和内存状态；旧头像 / 背景延后到保存成功后清理。
- 完成 PWA 离线缓存验收：Service Worker 只缓存静态 app shell，缓存名为 `moon-app-shell-v0.4.0`，不缓存用户数据、导出备份、图片 Blob、IndexedDB 或 localStorage。
- stable zip 通过封版检查，不包含 `.git`、`node_modules`、临时文件、`.DS_Store`、真实备份或敏感样本。

已知风险：

- localStorage 与 IndexedDB 不是浏览器级事务；本版本已做最小回滚和 best-effort 清理，但极端浏览器存储失败仍需用户保留备份。
- 普通 JSON current / room 主要用于局部恢复或排查，不是严格脱敏分享文件，也不能替代完整备份。
- `file://` 下不能注册 Service Worker，这是浏览器限制；需要 PWA 离线壳缓存时请使用 localhost 或 HTTPS。
- PWA 不是备份替代品。更换浏览器、清理站点数据、重装系统或换设备前仍需导出完整 JSON / encrypted-json 和账本备份。
- 不同浏览器的 PWA 安装提示条件可能不同。

## v0.3.0-local-stable

这是《月之暗面》的 P0-P2 本地稳定版。重点是把多意识体本地记录、前台日志、交接任务、隐私导出、照护、时间线和复盘报告打磨到可长期自用的基础状态。

本版本仍然是 local-only / offline-first：没有云同步、账号、遥测、CDN、npm、构建步骤或远程 API。

## P3-04 加密备份补充

P3-04 增加了可选的加密完整 JSON 备份：

- 导出格式新增“加密完整 JSON 备份”，文件建议后缀为 `.moonenc.json`。
- 加密使用浏览器 Web Crypto API，在本机完成 PBKDF2 / AES-GCM，不联网，不引入第三方加密库。
- 加密前仍复用完整 JSON hydrate 流程，外置图片会先补回导出副本里的 DataURL。
- 加密 envelope 只包含 `app/kind/version/kdf/cipher/payload` 等元信息和密文，不包含明文 JSON、密码或密钥。
- 密码不会保存到 `localStorage`，也不会写入备份文件。忘记密码后无法恢复加密备份。
- 加密只保护导出的备份文件，不会加密当前浏览器里的本机 `localStorage`、账本记录或 IndexedDB 图片库。
- 普通 JSON 备份仍可用。导入加密备份成功后，解密出的普通完整 JSON 会走现有导入流程，图片仍会 externalize 回 IndexedDB。
- 仍建议至少保留一份安全保存的备份，并谨慎分享任何完整备份。

## P3-05 PWA / 本地安装基础支持

P3-05 增加基础 PWA 支持：

- 新增 `manifest.webmanifest`，声明应用名称、独立窗口显示、主题色和现有 `app_icon.png` 图标。
- 新增 `sw.js`，只缓存静态 app shell：入口 HTML、样式、manifest、图标和本地 `js/` 脚本。
- 新增普通脚本 `js/sw-register.js`，仅在 `https:` 或本机 `http://localhost` / `127.0.0.1` / `[::1]` 下注册 Service Worker；`file://` 下静默跳过。
- PWA 安装是可选能力，不提供云同步，不替代完整 JSON 备份或加密备份。
- 用户数据仍保存在当前浏览器的 `localStorage` + IndexedDB 中。Service Worker 不缓存用户导出的 JSON / `.moonenc.json` 文件、图片 Blob、IndexedDB 内容或 `localStorage` 内容。
- 更新 app 文件后，浏览器可能需要刷新页面或清理此站点缓存 / Service Worker 才能看到最新静态文件。

## P4-01 账本隔离与专用备份

P4-01 将账本备份从主记录完整备份中拆出：

- 主记录 JSON / encrypted-json 默认不再包含 `ledgerRecords`。
- 主记录导入检测到旧版备份里的 `ledgerRecords` 时只提示，不会自动覆盖当前账本。
- 账本首页新增账本专用 JSON 导出，格式为 `app: "moon-ledger"`、`kind: "ledger-backup"`、`version: 1`、`createdAt` 和 `records`。
- 账本首页新增 CSV 导出，字段为 `date,type,amount,category,account,paymentMethod,note,createdAt,updatedAt`。
- 账本 JSON 导入目前只支持替换当前账本，确认后只写入 `moonLedger.records.v1`，不影响主记录数据、偏好、IndexedDB 图片或 `messageIntegrity`。
- 旧版主备份如需迁移账本，请到账本页使用账本导入功能；账本导入会拒绝读取包含 `rooms/messages/members` 等主记录字段的文件。
- 账本专用备份可能包含现实财务信息，仍需谨慎保存和分享。

## P4-02 真实账本 CRUD 与统计

P4-02 将首页账本升级为普通本地账本：

- 支持新增、编辑、删除收入和支出记录。
- 记录字段包含日期、金额、分类、账户 / 钱包、支付方式和备注，金额为 0 的记录会被保留。
- 支持按日、月、年、全部查看，并支持类型和分类筛选。
- 统计支出合计、收入合计、结余、记录条数、分类汇总、账户 / 钱包汇总和最近记录。
- 账本 JSON / CSV 专用导出导入继续与主记录完整备份隔离。

## P4-03 分类管理、预算与统计图表基础版

P4-03 增强账本设置和统计视图：

- 新增独立账本设置键 `moonLedger.settings.v1`，保存分类、月度预算和默认账本视图。
- 默认分类会在没有账本设置时自动补齐，分类支持添加、编辑、归档和恢复。
- 新增月度总预算和分类预算，只统计支出，并显示剩余额度、已用比例和超支提示。
- 支出 / 收入分类汇总增加本地 CSS 条形图，不引入图表库或联网依赖。
- 账本 JSON 备份升级到 version 2，包含 `records` 和 `settings`；version 1 账本备份仍可导入，且只替换账本记录、保留当前账本设置。
- 分类改名不会批量迁移旧记录里的 `category` 字符串，分类预算按 `categoryName` 兼容旧记录。
- CSV 仍只导出账本记录；主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。

## P4-04 账本首页体验增强

P4-04 打磨本地账本首页的日常可用性：

- 优化账本首页布局，补充筛选摘要、空态提示和轻量操作反馈。
- 分类管理按支出 / 收入分组展示，归档分类与常用分类更容易区分。
- 预算区域补充非月视图提示、分类预算空态和更清晰的预算百分比。
- 账本备份区域说明 JSON / CSV 用途区别：JSON v2 包含 `records` 和 `settings`，CSV 只包含 records。
- 移动端表单、按钮、分类名、备注和条形图继续避免横向溢出。
- 主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。

## P4-05 账本与记录层隔离验收

P4-05 完成账本隔离验收：

- 确认主记录 JSON / encrypted-json 不包含账本记录或账本设置。
- 确认主记录导入不会覆盖当前账本，旧版含 `ledgerRecords` 的主备份也不会自动恢复到账本。
- 确认账本 JSON v2 只包含 `records` 和 `settings`，不包含主记录数据、偏好、图片或 `messageIntegrity`。
- 确认账本 JSON v1 导入只替换 records 并保留当前 settings，v2 导入替换 records + settings。
- 确认坏 settings 导入失败且尽量保留当前账本。
- 确认 CSV 只导出账本记录，存储健康面板只显示账本大小和数量统计，不泄露账本明细。

## P5-00 下一阶段路线规划

P5-00 完成 P4 后的下一阶段规划：

- 新增 `P5-00_NEXT_PHASE_PLAN.md`，复盘 P1-P4 已完成能力和当前稳定边界。
- 明确 P4 已以账本与主记录层隔离验收收束。
- 将之前多轮延后的图片一致性问题列为 P5-01 优先排查对象。
- 规划 P5-01 到 P5-05 路线：图片一致性审计、最小修复、图片备份恢复验收、PWA 离线缓存验收和 v0.4.0 local stable 封版验收。
- 本轮没有修改业务代码、导入导出语义、账本隔离语义、存储 schema 或本地依赖边界。

## P5-01 图片一致性与高风险数据安全审计

P5-01 完成图片一致性与高风险数据安全审计：

- 新增 `P5-01_IMAGE_AND_DATA_CONSISTENCY_AUDIT.md`，逐项复核此前潜在漏洞清单，并记录当前代码确认、复现路径、风险评级、影响范围和 P5-02 建议修复策略。
- 覆盖 encrypted-json 范围语义、`messageIntegrity` 导入行为、图片 IndexedDB 与主数据保存一致性、删除图片时序、局部 JSON 范围、inline handler id 安全和清空群组语义。
- 明确本轮不做业务修复，只输出审计结论和 P5-02 最小修复顺序。
- 没有新增依赖、联网请求、构建步骤或 `type="module"`。

## P5-02 数据安全与一致性最小修复

P5-02 根据 P5-01 审计结论完成最小必要修复：

- 新增 `P5-02_DATA_SAFETY_MINIMAL_FIXES.md`，记录修复范围、验收结果和剩余风险。
- “加密完整 JSON 备份”现在固定导出全部主记录数据，不再跟随当前群组 / 指定群组范围；主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。
- 导入时如果原备份存在 `messageIntegrity` 异常，异常消息不会再被图片 externalize 流程静默重算成“校验正常”，导入确认和完成提示都会说明异常数量。
- 聊天图片、成员头像和房间背景写入 IndexedDB 后，如果主数据保存失败，会尽量删除本次新写入图片并恢复内存状态；删除或替换头像 / 背景时，旧图延后到保存成功后清理。
- inline handler 中来自数据的 id 改用安全 JS 字符串参数，降低异常 id 导致点击失效或注入的风险。
- 普通 JSON 的当前群组 / 指定群组导出增加语义说明和导出前确认，避免误认为是完整备份或脱敏分享文件。
- 清空群组但不清空聊天记录时增加额外确认，明确会删除被清空群组中的聊天记录。
- 本轮没有新增依赖、联网请求、构建步骤或 `type="module"`，没有修改账本隔离语义。

## P5-03 图片备份 / 恢复验收

P5-03 完成图片备份、恢复、hydrate 和 externalize 链路验收：

- 新增 `P5-03_IMAGE_BACKUP_RESTORE_ACCEPTANCE.md`，记录成员头像、房间背景、聊天图片、完整 JSON、encrypted-json、局部 JSON、`imageHealth` 和 P5-02 回滚修复的验收矩阵。
- 确认完整 JSON 导出会在导出副本中 hydrate `imageData/avatarData/backgroundData`，且不改变运行时主 data 或 IndexedDB 图片。
- 确认完整 JSON / encrypted-json 导入后，图片会 externalize 回 IndexedDB，主 data 恢复为 `imageId/avatarId/backgroundId` 引用。
- 确认 encrypted-json 固定完整范围，并可恢复成员头像、房间背景和聊天图片。
- 确认普通 JSON current / room 的图片范围跟随现有局部导出语义；局部 JSON 仍不是完整备份或脱敏分享文件。
- 确认 `imageHealth` 能发现缺失引用、孤儿图片，并能从完整 JSON 备份修复缺失图片。
- 本轮未发现阻断 bug，没有业务代码改动，没有新增依赖、联网请求、构建步骤或 `type="module"`。

## P5-04 PWA 离线缓存与本地稳定包验收

P5-04 完成 PWA 离线缓存和本地稳定包前置验收：

- 新增 `P5-04_PWA_OFFLINE_STABLE_ACCEPTANCE.md`，记录 Service Worker 注册、app shell 缓存、离线刷新、manifest、图标和不缓存用户数据的验收结果。
- 将 Service Worker 缓存名更新为 `moon-app-shell-p5-04-v0.4.0`，避免继续停留在旧 app shell 缓存版本。
- Service Worker 仍只缓存静态 app shell，并在 activate 阶段清理旧 `moon-app-shell-*` 缓存；本轮没有改成缓存所有请求。
- manifest 新增 192 / 512 本地图标，`APP_SHELL` 同步缓存这些静态图标。
- 验收确认导出的主 JSON、encrypted-json、账本 JSON、CSV、图片 Blob、IndexedDB 和 localStorage 不进入 Service Worker Cache Storage。
- `file://` 下继续安全跳过 Service Worker；localhost / HTTPS 条件下可注册。
- 主 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`；图片备份 / 恢复语义和账本隔离语义未受影响。
- 没有新增依赖、联网请求、构建步骤或 `type="module"`。

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
- 账本记录保存在 `moonLedger.records.v1`，账本设置保存在 `moonLedger.settings.v1`，与主记录完整 JSON / encrypted-json 备份隔离。
- 图片保存在 IndexedDB：`moon-images` / `images`。
- 旧备份中的 `imageData/avatarData/backgroundData` 导入后会 externalize 到 IndexedDB。
- 完整 JSON 导出会 hydrate 图片 DataURL，以便单文件备份。
- 可选加密备份会加密 hydrate 后的完整 JSON 导出副本；普通 JSON 路径保持可用。
- `messageIntegrity` 规则没有在本版本发布验证中改动。
- visibility / 隐私桶只影响应用内展示和导出，不是加密隔离。

完整 JSON 备份包含 P0-P2 主记录数据字段，例如 `frontingLogs`、`tasks`、`careLogs`、`careChecklist`、`polls` 新字段、`systemProfileVisibility`、`memberRelations` 和 `externalSystemCards`；不再默认包含 `ledgerRecords` 或 `ledgerSettings`。

## 已知限制

- 高级搜索是内存搜索，不是持久化全文索引。
- localStorage 仍是主结构化数据存储；数据量极大时可能需要 IndexedDB / SQLite 结构化迁移。
- 没有虚拟滚动；消息或时间线特别多时，DOM 可能变重。
- visibility / 隐私桶不是加密隔离。
- 加密备份只保护导出的备份文件，不保护当前浏览器本地存储；忘记备份密码无法恢复。
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
