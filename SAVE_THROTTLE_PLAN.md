# P3-03b save() 写入频率评估与最小节流

> 本轮只评估并最小化 `save()` 写入频率，不改变数据结构、`localStorage` key、`messageIntegrity`、图片外置、JSON 导入导出或 `imageHealth` API。

## 1. 当前保存架构

- 主数据仍通过 `save()` 写入 `KEY = "osddDidLocalJournal.v2"`。
- `save()` 仍是整包 `JSON.stringify(data)` 后写入 `localStorage`。
- `savePrefs()` 独立写入 `PREF_KEY`。
- `saveLedger()` 独立写入 `LEDGER_KEY`。
- 图片仍通过 IndexedDB `moon-images / images` 保存，主数据只保存图片引用。

P3-03 评估已经指出：长期风险来自主 JSON 增长和每次保存写整包。P3-03b 的目标不是迁移存储层，而是先降低低风险连续 UI 操作带来的重复写入。

## 2. 本轮统计结果

本轮统计当前代码中的主数据保存路径：

- 主数据 `save()` 业务调用点：原有 42 个。
- 本轮保留立即 `await save()`：40 个。
- 本轮改为 `debouncedSave()`：2 个。
- `savePrefs()` / `saveLedger()` 不计入主数据 `save()`，但在下方单独说明。

## 3. 必须立即保存的路径

这些路径继续使用 `await save()`，原因是它们涉及新记录、删除、导入、消息完整性、图片引用、自动结算或用户明确确认后的不可逆操作。

| 位置 | 调用点 | 判断 | 原因 |
| --- | --- | --- | --- |
| `js/imageMigration.js` | 图片迁移完成后保存主数据 | 立即保存 | DataURL 外置后主数据已删除内联图片，必须和 IndexedDB 写入尽快保持一致。 |
| `js/app.js` | `deleteMember()` | 立即保存 | 删除成员并追加系统消息，影响成员关系和历史显示。 |
| `js/app.js` | `deleteRoom()` | 立即保存 | 删除房间会删除消息、投票、交接，且会重算 `nextSeq`。 |
| `js/app.js` | `deleteMessage()` | 立即保存 | 删除消息后会重算 `nextSeq`，不能延迟。 |
| `js/app.js` | 文字消息发送 | 立即保存 | 新消息需要立即落盘，涉及 `seq` / `messageIntegrity`。 |
| `js/app.js` | 清空交接便签 | 立即保存 | 用户确认后的删除操作。 |
| `js/app.js` | 保存成员 | 立即保存 | 可能写头像引用、状态历史和系统消息。 |
| `js/app.js` | 保存房间 | 立即保存 | 可能写背景图引用和房间结构。 |
| `js/app.js` | 今日状态写入聊天 | 立即保存 | 会新增消息并计算完整性。 |
| `js/app.js` | 清空数据 | 立即保存 | 不可逆批量操作，可能重置成员、房间、消息和 `nextSeq`。 |
| `js/render.js` | 保存 / 删除消息分类 | 立即保存 | 改变分类列表，且不是高频连续切换。 |
| `js/features/messages.js` | 发送图片消息 | 立即保存 | IndexedDB 已写图片，主数据必须立即保存 `imageId` 和消息完整性。 |
| `js/features/care.js` | 保存照护记录 | 立即保存 | 可能同时写入聊天消息。 |
| `js/features/care.js` | 删除照护记录 | 立即保存 | 用户确认后的删除操作。 |
| `js/features/care.js` | 新增照护清单项 | 立即保存 | 新建结构化记录，需要避免刷新丢失。 |
| `js/features/care.js` | 删除照护清单项 | 立即保存 | 用户确认后的删除操作。 |
| `js/features/fronting.js` | 保存前台日志 | 立即保存 | 前台状态是时间线和接续面板的重要来源。 |
| `js/features/fronting.js` | 删除前台日志 | 立即保存 | 用户确认后的删除操作。 |
| `js/features/fronting.js` | 结束当前前台 | 立即保存 | 结束时间影响当前状态和后续接续判断。 |
| `js/features/arrival.js` | 接续面板管理删除后保存 | 立即保存 | 接续面板删除会影响多个来源记录，且是显式管理操作。 |
| `js/features/rooms.js` | 创建 / 打开私聊 | 立即保存 | 可能新建房间并切换当前房间。 |
| `js/features/system-card.js` | 保存系统档案 | 立即保存 | 用户显式保存，不属于连续轻量切换。 |
| `js/features/system-card.js` | 保存外部系统名片 | 立即保存 | 新增外部资料记录。 |
| `js/features/system-card.js` | 删除外部系统名片 | 立即保存 | 用户确认后的删除操作。 |
| `js/features/members.js` | 保存 / 删除标签 | 立即保存 | 影响成员展示和标签引用。 |
| `js/features/members.js` | 保存 / 删除成员关系 | 立即保存 | 影响系统结构视图和成员关系。 |
| `js/features/tasks.js` | 删除任务 | 立即保存 | 用户确认后的删除操作。 |
| `js/features/import-export.js` | JSON 导入后保存 | 立即保存 | 导入失败不能覆盖当前数据，成功导入必须立即落盘。 |
| `js/features/handoff.js` | 保存交接便签 | 立即保存 | 可能同时创建任务，属于显式新增。 |
| `js/features/polls.js` | 发起投票 | 立即保存 | 会新增投票和系统消息。 |
| `js/features/polls.js` | 保存投票 / 理由 | 立即保存 | 投票记录是决策数据，不做延迟。 |
| `js/features/polls.js` | 暂停 / 恢复 / 取消投票 | 立即保存 | 投票状态影响是否可投票和自动结算。 |
| `js/features/polls.js` | 手动结束投票 | 立即保存 | 会写系统消息和交接便签。 |
| `js/features/polls.js` | 到期自动关闭投票 | 立即保存 | 自动结算必须落盘，避免重复结算。 |
| `js/features/polls.js` | 删除投票 | 立即保存 | 用户确认后的删除操作。 |
| `js/features/polls.js` | 复制投票结果到交接 | 立即保存 | 新增交接便签。 |

## 4. 可节流保存的路径

本轮只对两类低风险连续 UI 操作使用 `debouncedSave()`：

| 位置 | 调用点 | 改动 | 原因 |
| --- | --- | --- | --- |
| `js/features/tasks.js` | `updateTaskStatus()` | 先更新内存并重绘任务列表，再 `debouncedSave("任务状态保存")` | 任务状态按钮可能连续点击；只改 `status` / `updatedAt`，不创建或删除记录，不影响消息完整性。 |
| `js/features/care.js` | `toggleCareChecklistItem()` | 先更新内存并重绘清单，再 `debouncedSave("照护清单保存")` | 勾选清单是高频轻量切换；只改 `done` / `updatedAt`，不删除记录，不写消息。 |

节流延迟：`600 ms`。

如果用户在节流等待期间触发其它立即 `save()`，普通 `save()` 会清掉待执行的节流计时器，并把当前完整 `data` 立即写入。因此“先勾选、再发送消息 / 导入 / 清空 / 保存成员”等路径仍会以立即保存为准。

## 5. 暂不节流的候选项

以下路径虽然可能被频繁使用，但本轮不节流：

- 投票保存：它是决策数据，状态和理由应立即落盘。
- 前台日志：接续面板和时间线依赖它，且通常不是连续轻量切换。
- 成员、房间、标签、关系：结构性变更，不适合延迟。
- 消息发送和图片发送：涉及 `messageIntegrity`、`seq`、`imageId`，必须立即。
- JSON 导入、清空数据、图片迁移、投票关闭：这些是高风险原子路径，必须立即。
- 术语保存：仍走 `savePrefs()` 立即保存，不做节流。

## 6. savePrefs() / saveLedger() 说明

`savePrefs()` 不写主数据 `KEY`，本轮不改：

- 外观字号原本使用 `safeSavePrefs()`，保持现状。
- 术语保存、术语恢复默认继续立即 `await savePrefs()`。
- 密码锁、视角设置、进入界面设置继续立即保存。

`saveLedger()` 不写主数据 `KEY`，本轮不改：

- 账本新增记录继续立即保存到 `LEDGER_KEY`。
- JSON 导入中账本覆盖继续立即保存。

## 7. 已实施的最小代码变更

新增：

- `debouncedSave(label, delayMs = 600)`。
- 待节流保存存在时，任何普通 `save()` 会取消节流计时器，并立即保存当前完整 `data`。

修改：

- 任务状态切换改为节流保存。
- 照护清单勾选改为节流保存。

未修改：

- 数据结构。
- `localStorage` key。
- `IndexedDB` schema。
- `messageIntegrity`。
- 图片外置逻辑。
- JSON 导入导出语义。
- `imageHealth` API。
- 账本 UI。

## 8. 已知风险

- 如果用户在节流窗口内立刻关闭页面，最近一次任务状态或照护清单勾选可能还未写入磁盘。
- 该风险只限本轮两类低风险切换；新增、删除、导入、发送、清空等关键路径仍立即保存。
- 后续如果要继续降低风险，可以增加“页面隐藏 / 关闭前 flush pending debounced save”的专门小步，但本轮先保持最小改动。

## 9. 后续建议

1. 继续观察 P3-03a 本地存储状态中的主数据体积。
2. 如需要更精确评估，可在 P3-03c 前加入 `save()` 写入耗时和调用频率统计。
3. 如果主数据继续增长，再评估 messages object store 原型。
