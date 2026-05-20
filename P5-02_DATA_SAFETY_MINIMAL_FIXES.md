# P5-02 数据安全与一致性最小修复

## 1. 修复基线

- 当前分支：`feature/p5-02-data-safety-minimal-fixes`
- 基线 tag：`p5-01-image-consistency-audit`
- 基线 commit：`de43a26`
- 修复日期：2026-05-20
- 工作区初始状态：干净

## 2. 修复范围

本轮根据 P5-01 审计结论，只处理已确认的 P1 / P2 数据安全和一致性风险：

- encrypted-json 固定导出完整主记录范围。
- 导入时保留原备份中的 `messageIntegrity` 异常状态。
- 聊天图片、成员头像、房间背景写入 IndexedDB 后，如果主数据保存失败，会尽量回滚新图片和内存状态。
- 删除或替换头像 / 背景时，旧图片延后到主数据保存成功后再清理。
- inline handler 中来自数据的 id 改为 JS 字符串参数安全转义。
- 普通 JSON 局部导出增加语义说明和导出前确认。
- 清空群组但不清空聊天记录时增加额外确认。

本轮没有处理 P3 维护风险，没有修改账本结构和账本隔离语义，没有改 IndexedDB schema，也没有引入依赖、联网请求、构建步骤或 `type="module"`。

## 3. 每项修复说明

### 3.1 encrypted-json 完整范围

原风险：

- “加密完整 JSON 备份”此前复用普通 JSON 当前导出范围，用户在“当前群组”范围下可能得到一个局部加密 JSON，却误以为已经完成完整备份。

修改文件：

- `index.html`
- `js/features/import-export.js`
- `README.md`
- `BACKUP_GUIDE.md`
- `USER_GUIDE.md`
- `ARCHITECTURE.md`
- `RELEASE_NOTES.md`

修复方式：

- `encrypted-json` 选中时自动使用 `all` scope，并禁用导出范围 / 指定群组控件。
- encrypted-json 分支调用完整范围的 JSON 生成逻辑，不再隐式依赖当前 DOM scope。
- 加密完整 JSON 文件名使用完整备份命名，不再按当前群组命名。
- UI 与文档明确说明 encrypted-json 固定导出全部主记录数据，账本仍需单独备份。

验收结果：

- headless 验证两个群组场景下，当前范围为 current 时，选择 encrypted-json 后明文导出副本包含两个群组。
- 普通 JSON + current 仍只导出当前群组；普通 JSON + all 仍导出完整主记录范围。
- 主 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。

剩余风险：

- encrypted-json 只保护导出的备份文件，不加密浏览器本地存储；密码遗失无法恢复。

### 3.2 integrity 异常保留

原风险：

- 导入时先提示 `messageIntegrity` 异常，但随后图片 externalize 会对所有消息重算 integrity，导致异常消息导入后显示为“校验正常”。

修改文件：

- `js/features/import-export.js`
- `README.md`
- `BACKUP_GUIDE.md`
- `ARCHITECTURE.md`
- `RELEASE_NOTES.md`

修复方式：

- 导入解析后、图片 externalize 前记录原备份中校验异常的消息对象。
- `externalizeImagesAfterJsonImport()` 增加选项，对原本异常的消息不覆盖旧 `integrity`。
- 对原本正常的旧图片消息，图片外置后仍按现有规则合法重算 integrity。
- 导入确认提示和导入完成提示都明确说明原备份中有异常消息，并且会保留为异常状态。

验收结果：

- headless 构造错误 integrity 的普通 JSON 后验证：导入确认前能统计异常；externalize 后异常消息仍为异常。
- 正常文本消息和带 `imageData` 的正常旧消息仍可在导入后保持校验正常。
- 带 `imageData` 的异常旧消息会完成图片外置，但仍保持校验异常。

剩余风险：

- 本轮没有新增持久审计日志；异常提示以导入前确认和导入完成提示为主。

### 3.3 图片写入 save 失败回滚

原风险：

- 聊天图片、成员头像和房间背景先写 IndexedDB，再保存主数据。`save()` 失败时会产生孤儿图片，或造成内存状态、localStorage 和 IndexedDB 错位。

修改文件：

- `js/app.js`
- `js/features/messages.js`
- `README.md`
- `BACKUP_GUIDE.md`
- `ARCHITECTURE.md`
- `RELEASE_NOTES.md`

修复方式：

- 增加轻量状态快照 / 恢复 helper，用于保存失败后的内存回滚。
- 新增或替换成员头像、房间背景时使用新的唯一图片 id，避免覆盖旧 Blob。
- 保存失败时删除本次新写入的图片，恢复 `data` / `currentRoomId` 并重新渲染。
- 聊天图片保存失败时删除刚写入的 `msgimg-*`，撤回刚 push 的消息，并保留待发送图片状态以便重试。

验收结果：

- headless 模拟 `storage.saveAppData()` 失败后验证：聊天图片、成员头像、房间背景的新图片不会留在 IndexedDB，内存消息 / 成员 / 群组状态恢复。
- 成功路径仍能保存图片引用并显示图片。

剩余风险：

- localStorage 与 IndexedDB 仍不是浏览器级事务；本轮采用最小回滚和 best-effort 清理，不重写图片系统。

### 3.4 删除头像 / 背景延后清理

原风险：

- 删除或替换头像 / 背景时，如果先删旧 IndexedDB Blob，再遇到主数据保存失败，刷新后旧主数据仍引用旧 id，但图片实体已经缺失。

修改文件：

- `js/app.js`
- `BACKUP_GUIDE.md`
- `ARCHITECTURE.md`
- `RELEASE_NOTES.md`

修复方式：

- 头像 / 背景旧图不再在 `save()` 前删除。
- 保存成功后再 best-effort 清理不再被引用的旧图片。
- 旧图清理失败只输出 `console.warn`，不回滚已成功保存的主数据。
- 保存失败时旧引用和旧 Blob 保持不变。

验收结果：

- headless 模拟保存失败后验证：替换 / 删除头像或背景不会删除旧 Blob，主数据恢复旧引用。
- 保存成功后旧图片进入延后清理流程。

剩余风险：

- 清理失败可能暂时留下孤儿图片，仍可由图片健康检查发现和清理。

### 3.5 inline handler id 安全

原风险：

- 导入数据中的 room / member / message / poll 等 id 直接拼入 inline JS handler，异常 id 可能破坏点击，甚至构造执行片段。

修改文件：

- `js/render.js`
- `js/features/polls.js`
- `js/features/members.js`
- `js/features/fronting.js`
- `js/features/system-card.js`
- `RELEASE_NOTES.md`

修复方式：

- 增加 `jsAttrArg(value)`，先用 `JSON.stringify(String(value))` 生成 JS 字符串参数，再用 HTML escape 放入属性。
- 对 P5-01 审计确认的 room / member / message / poll / relation / fronting / external card inline handler 参数统一使用安全参数。
- 保留现有交互结构，不做大规模事件委托重写。

验收结果：

- headless 构造异常 room id：`bad');window.__auditInjected=1;//`，渲染并点击后未设置 `window.__auditInjected`，也没有新增 JS 语法错误。
- 常规 room / member / message / poll 入口仍可渲染和触发。

剩余风险：

- 本轮采用最小转义修复；后续若大改渲染层，仍建议逐步迁移到 `data-*` + 事件委托。

### 3.6 普通 JSON 局部范围文案

原风险：

- 当前群组 / 指定群组 JSON 会过滤部分字段，但仍可能包含全局成员、系统资料或配置。用户可能误以为它是严格局部分享文件或完整备份。

修改文件：

- `index.html`
- `js/features/import-export.js`
- `README.md`
- `BACKUP_GUIDE.md`
- `USER_GUIDE.md`
- `ARCHITECTURE.md`
- `RELEASE_NOTES.md`

修复方式：

- 导出弹窗说明局部 JSON 主要用于局部恢复或排查，不适合作为脱敏分享文件。
- 普通 JSON + current / room 导出前增加确认，说明它不是完整备份且可能仍包含全局资料。
- encrypted-json 固定完整范围，不走局部范围风险确认。
- 不改变普通 JSON 的 current / room / all 现有结构。

验收结果：

- headless 验证普通 JSON + current 会出现局部风险确认。
- encrypted-json 不出现局部风险确认。
- Markdown / TXT / CSV 脱敏导出逻辑未改。

剩余风险：

- 本轮不新增严格局部分享模式；如需真正脱敏分享，后续仍需单独设计。

### 3.7 清空群组语义确认

原风险：

- “清空群组”但不勾“清空聊天记录”时，当前设计仍会删除不再归属任何保留群组的聊天记录。原文案容易被理解成完全不删聊天。

修改文件：

- `index.html`
- `js/app.js`
- `USER_GUIDE.md`
- `RELEASE_NOTES.md`

修复方式：

- 清空弹窗中的“清空群组”文案说明会删除被清空群组内的聊天记录。
- 当用户勾选清空群组但不勾清空聊天记录时，增加额外确认。
- 用户取消额外确认时不修改数据。
- 不改变现有清空逻辑。

验收结果：

- headless 验证只勾清空群组时出现额外确认；取消后数据不变。
- 清空群组 + 清空聊天记录时不出现重复误导提示。

剩余风险：

- 当前仍沿用原始清空语义；本轮只降低误操作风险。

## 4. 不处理项

本轮不处理以下事项：

- `debouncedSave()` 与直接 `save()` 的共享 promise 维护风险。
- 照护清单 normalize 不可达兜底。
- 非 base64 dataURL 多字节转换。
- PWA / Service Worker 缓存验收。
- 账本功能和账本隔离语义。
- 图片备份 / 恢复 / hydrate / externalize 完整验收；该项进入 P5-03。

## 5. 测试结果

静态检查：

- `node --check js/storage.js`：通过
- `node --check js/features/ledger.js`：通过
- `node --check js/features/storage-health.js`：通过
- `node --check js/features/import-export.js`：通过
- `node --check js/app.js`：通过
- `node --check js/features/messages.js`：通过
- `node --check js/render.js`：通过
- `node --check js/features/polls.js`：通过
- `node --check js/features/members.js`：通过
- `node --check js/features/fronting.js`：通过
- `node --check js/features/system-card.js`：通过
- `git diff --check`：通过

headless 验收：

- encrypted-json 完整范围：通过。
- integrity 异常保留：通过。
- 图片写入 save 失败回滚：通过。
- 删除头像 / 背景延后清理：通过。
- inline handler id 安全：通过。
- 普通 JSON 局部范围提示：通过。
- 清空群组额外确认：通过。
- 主 JSON / encrypted-json 不包含 `ledgerRecords` 或 `ledgerSettings`：通过。
- 基础回归和无新增联网 / 依赖 / `type="module"`：通过。

## 6. 最终结论

P5-02 已完成 P5-01 确认的 P1 / P2 数据安全和一致性最小修复。主记录与账本隔离语义保持不变，图片仍使用 IndexedDB + 主数据 imageId / avatarId / backgroundId 语义，导入导出系统未被重写。

可以进入 P5-03，继续做图片备份 / 恢复 / hydrate / externalize 的完整验收。
