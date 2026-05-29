# P8-01 成员日记第一步提示词

请在现有「月之暗面」本地单页应用中实现第一步功能：让每个成员/人格可以独立写日记。此步骤只做日记本体、数据保存、导入导出和基础查看编辑，不接入时间线，也不接入高级搜索；后续步骤会再统一搜索/时间线索引。

## 目标

新增一个「日记」功能，让系统内每位成员都能用自己的身份写私密或系统内可见的日记条目。日记应是独立数据类型，不要伪装成普通聊天消息，避免污染聊天记录和消息完整性逻辑。

## 数据结构

在 `data` 中新增 `diaryEntries: []`，每条记录建议包含：

```js
{
  id,
  memberId,
  memberNameSnapshot,
  title,
  text,
  mood,
  tags,
  visibility,
  createdAt,
  updatedAt,
  linkedRoomId,
  linkedFrontingLogId
}
```

字段要求：

- `memberId`：作者成员 ID，可为空，但保存时优先使用当前发言人。
- `memberNameSnapshot`：保存时记录成员名称快照，成员被删除或改名后仍能显示旧作者名。
- `title`：可为空；为空时列表里用正文摘要或“未命名日记”。
- `text`：必填正文。
- `mood`：可为空，普通文本即可。
- `tags`：字符串数组，可留空。
- `visibility`：先支持 `private`、`system`、`trusted`、`public` 四档，默认 `private`。当前版本只记录字段，不做真正加密隔离。
- `linkedRoomId`：可选，默认当前对话 ID，方便以后从时间线跳回上下文。
- `linkedFrontingLogId`：可选，先预留。

## 需要修改的地方

请优先遵循现有项目风格，保持单页应用的轻量结构。

建议涉及文件：

- `js/data.js`：给 `initial` 增加 `diaryEntries: []`。
- `js/migrate.js`：增加 `normalizeDiaryEntryRecord`，在 `migrate` 中补齐旧数据；结构化存储的 `normalizeForStorage` / `denormalizeFromStorage` / `comparableMigrationSnapshot` 也要覆盖 `diaryEntries`，避免备份迁移丢失。
- `js/features/import-export.js`：完整 JSON 导出/导入应包含 `diaryEntries`；局部导出时可以先只在“全部群组/完整备份”范围包含日记，避免局部恢复语义复杂。
- `index.html`：在对话工具区加入「日记」按钮，并新增日记模态框。
- 新建 `js/features/diary.js` 或放在清晰的 feature 文件中：实现日记渲染、创建、编辑、删除、成员筛选。
- `index.html` 脚本区加载新文件，位置放在 `members/fronting` 之后、`search/timeline` 之前均可。
- `styles.css`：补充日记面板样式，保持现有 modal、list、section 的视觉语言。
- `js/app.js` 或合适初始化位置：绑定日记按钮事件，并在总 `render()` 中刷新日记入口需要的状态。

## UI 行为

日记入口：

- 对话工具里新增按钮「日记」。
- 点击打开日记面板。

日记面板：

- 顶部：标题「成员日记」。
- 表单字段：作者、标题、心情/状态、可见性、标签、正文。
- 作者默认选择当前发言人；如果当前发言人不可用，则选第一个非 `gone` 成员。
- 正文为空时不允许保存。
- 标签用逗号或换行分隔，保存为去重后的字符串数组。
- 保存后清空正文和标题，保留作者选择，列表刷新。

列表：

- 显示最近日记，按 `createdAt/updatedAt` 倒序。
- 支持按作者筛选：全部成员 / 某一成员。
- 每项显示作者、时间、可见性、心情、标题、正文摘要、标签。
- 支持编辑和删除。
- 删除前二次确认。

编辑：

- 点击编辑后将条目加载回表单。
- 再次保存更新 `updatedAt`，不改变原 `createdAt`。
- 提供“取消编辑”按钮。

隐私提示：

- 面板内增加一句轻提示：可见性只是本应用内的记录字段，不是加密隔离；需要现实隐私保护仍应依赖设备锁和加密备份。

## 不要在第一步做

- 不要把日记接入高级搜索。
- 不要把日记接入时间线。
- 不要做自动 AI 总结。
- 不要做多媒体日记。
- 不要改变现有聊天消息结构或消息完整性校验。
- 不要重构搜索/时间线的大结构。

## 兼容与安全

- 旧数据没有 `diaryEntries` 时必须自动补空数组。
- 导入旧 JSON 时不能报错。
- 完整 JSON 导出后再导入，日记应完整保留。
- 删除成员后，日记仍通过 `memberNameSnapshot` 显示作者快照。
- 不要删除或重写用户已有数据字段。

## 验证清单

完成后请至少手动验证：

- 打开应用没有控制台错误。
- 点击「日记」能打开面板。
- 能用当前发言人保存一篇日记。
- 正文为空时不能保存。
- 能按成员筛选日记。
- 能编辑日记，并保留原创建时间、更新修改时间。
- 能删除日记，且删除前有确认。
- 完整 JSON 导出中包含 `diaryEntries`。
- 导入包含日记的完整 JSON 后，日记仍存在。
- 旧数据或空数据启动时，`data.diaryEntries` 为数组。

## 建议提交

实现完成后提交一个清晰的 git commit，例如：

```bash
git add index.html styles.css js/data.js js/migrate.js js/features/import-export.js js/app.js js/features/diary.js
git commit -m "Add member diary records"
```
