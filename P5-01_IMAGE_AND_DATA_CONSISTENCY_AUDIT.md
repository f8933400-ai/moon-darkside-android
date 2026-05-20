# P5-01 图片一致性与高风险数据安全审计

## 1. 审计基线

- 当前分支：`feature/p5-01-image-consistency-audit`
- 基线 tag：`p5-00-next-phase-planning`
- 基线 commit：`34f84bb`
- 审计日期：2026-05-20
- 工作区初始状态：干净

## 2. 审计范围

本轮覆盖此前延后的图片一致性问题，并把 P1 高风险数据安全问题一并纳入审计：

- 图片外置和 IndexedDB 图片写入 / 删除。
- 主 JSON 导出 / 导入的 hydrate / externalize 行为。
- encrypted-json 导出 / 导入范围语义。
- `messageIntegrity` 导入校验、提示和重算行为。
- 局部 JSON 导出范围。
- inline handler 中 id 拼接的 JS 字符串安全。
- 清空群组语义。
- `save()` / `debouncedSave()` 维护风险。
- 低风险代码味道，包括照护清单 normalize 兜底和非 base64 dataURL 转 Blob。

## 3. 风险总览表

| 编号 | 风险 | 当前确认状态 | 风险等级 | 是否可复现 | 建议进入 P5-02 | 备注 |
|---|---|---|---|---|---|---|
| P1-01 | 加密“完整 JSON 备份”实际跟随当前导出范围 | confirmed | P1 | 是 | 是 | UI 文案写“完整”，默认范围为当前群组 |
| P1-02 | 导入时 integrity 异常会在提示后被重算成正常 | confirmed | P1 | 是 | 是 | 异常提示非持久，导入后原异常状态丢失 |
| P1-03 | 图片写入 IndexedDB 与主数据保存不是事务 | confirmed | P1 | 是 | 是 | save 失败会留下内存、localStorage、IndexedDB 不一致 |
| P2-04 | 删除头像 / 背景时先删 IndexedDB，保存失败后会缺图 | confirmed | P2 | 是 | 是 | 旧主数据仍引用图片，但图片 Blob 已删除 |
| P2-05 | 局部 JSON 导出范围语义不一致 | design ambiguity | P2 | 是 | 是 | rooms/messages 等局部，members/profile 等仍全量 |
| P2-06 | 导入数据 id 拼入 inline JS handler | confirmed | P2 | 是 | 是 | 异常 id 可破坏点击，也可构造可执行片段 |
| P2-07 | 清空群组但不勾清空消息时会删除被清空群组消息 | design ambiguity | P2 | 是 | 是 | 当前文案已有提示，但仍容易被理解成“不清空消息” |
| P3-08 | `debouncedSave()` 与直接 `save()` 的共享 promise 逻辑较绕 | needs more testing | P3 | 未复现 | 否 | 暂记录为维护风险 |
| P3-09 | 照护清单 normalize 兜底基本不可达 | false positive | P3 | 否 | 否 | 正常加载下 `migrate.js` 已导出 normalize 函数 |
| P3-10 | 非 base64 dataURL 转 Blob 对多字节内容不严谨 | confirmed | P3 | 是 | 否 | 当前图片路径主要产生 base64 dataURL，触发面低 |

## 4. P1 审计详情

### P1-01 加密完整 JSON 备份范围语义

当前代码位置：

- `index.html:193` 的文件格式选项写作 `加密完整 JSON 备份`。
- `js/features/import-export.js:20` 打开导出弹窗时把 `exportScope` 默认设为 `current`。
- `js/features/import-export.js:22` 的 `selectedExportRooms()` 按 `current` / `room` / `all` 选择房间。
- `js/features/import-export.js:395` 的 `formatExportJsonAsync()` 基于当前选择构造 JSON。
- `js/features/import-export.js:427-439` 的 encrypted-json 分支先生成普通 JSON，再把该 JSON 交给 `exportEncryptedBackup()` 加密。

当前 UI 文案叫“加密完整 JSON 备份”，但当前导出范围默认是“当前群组”。encrypted-json 没有强制切到 `all`，而是复用普通 JSON 的当前范围。

复现步骤：

1. 准备两个群组，各有一条消息，并加入 tasks / careLogs / members / systemProfile 等全局字段。
2. 打开导出弹窗，保持默认导出范围 `current`。
3. 选择 `encrypted-json`，在加密前检查 `formatExportJsonAsync()` 生成的明文 JSON 副本。

实际结果：

- 导出的 `rooms` 只包含当前群组。
- 导出的 `messages` 只包含当前群组消息。
- `tasks`、`careLogs`、`careChecklist` 因 `includeFullScope=false` 没有进入导出对象。
- `members`、`systemProfile`、`memberRelations`、`externalSystemCards` 仍为全量。

影响：

- 用户看到“完整 JSON 备份”后可能误以为已经完整备份所有主记录数据。
- 如果用户只保存该加密文件，恢复时会发现非当前群组消息和部分全局结构化记录缺失。
- 这是备份语义和数据安全风险，建议保持 P1。

建议修复方案：

- 方案 A：encrypted-json 的“完整 JSON 备份”强制使用 `all` scope，或直接复用 `storage.exportBackup()` 的完整备份语义。
- 方案 B：如果允许局部加密备份，则 UI 必须明确写“当前群组加密 JSON”或“指定群组加密 JSON”，并在文件名和确认提示中体现范围。

推荐 P5-02 优先采用方案 A。当前用户心智已经被“完整备份”建立，强制 full scope 是最小惊讶、最小数据损失风险的修复。

是否建议 P5-02 修复：是。

### P1-02 导入 integrity 异常被重算

当前代码位置：

- `js/storage.js:308-329` 的 `storage.importBackup()` 先走 `migrate()`。
- `js/migrate.js:86` 只在缺少 integrity 或缺少 seq 时重算；带 seq 且带旧 integrity 的异常消息会保留原校验值。
- `js/features/import-export.js:475-476` 在导入确认前统计 `integrityOk(m)` 异常数并追加提示。
- `js/features/import-export.js:479` 确认后调用 `externalizeImagesAfterJsonImport(incoming)`。
- `js/features/import-export.js:471` 的 `externalizeImagesAfterJsonImport()` 最后对所有消息执行 `m.integrity=messageIntegrity(m)`。

复现样本说明：

- 构造一个普通 JSON 备份，包含一条消息。
- 该消息有稳定 `id`、`seq`、`createdAt`、`text`，但把 `integrity` 改成错误值 `00000000`。

复现步骤：

1. 调用 `storage.importBackup()` 得到 incoming 数据。
2. 在调用 `externalizeImagesAfterJsonImport()` 前统计 `incoming.messages.filter(m=>!integrityOk(m)).length`。
3. 调用 `externalizeImagesAfterJsonImport(incoming)`。
4. 再次统计异常数并检查该消息的 `integrity` 字段。

实际结果：

- externalize 前异常数为 1。
- externalize 后异常数为 0。
- 原 `integrity: "00000000"` 被改写为当前内容的新校验码。
- 用户导入时会看到一次异常提示，但导入完成后的本地记录显示“校验正常”，且没有持久化记录说明“原备份校验异常”。

影响：

- `messageIntegrity` 的审计意义被削弱。
- 异常备份被导入后会被洗成“正常”，后续用户无法区分它是历史真实正常消息，还是导入时发现过异常的消息。
- 对备份来源可信度判断不利，建议保持 P1。

建议修复方案：

- 导入时保留原备份校验结果，至少把异常消息的 id / seq / 原 integrity / 期望 integrity 汇总到导入提示或持久记录。
- 对异常消息不要静默重写为“正常”。
- 如果为了当前版本算法一致性仍需要导入后重新生成新 integrity，也必须保留“原备份校验异常”的可见提示或文档化记录。
- P5-02 可先做最小修复：导入确认提示保留异常清单，导入完成后用一次明确 alert 或本地标记说明异常消息已被重新计算。

是否建议 P5-02 修复：是。

### P1-03 图片 IndexedDB 与主数据保存非事务

当前代码位置：

- 成员头像：`js/app.js:296-329`，`putImage()` 或 `deleteImage()` 发生在最终 `save()` 之前。
- 房间背景：`js/app.js:336`，与头像同样先操作图片，再保存主数据。
- 聊天图片：`js/features/messages.js:18`，先 `putImage()`，再把消息 push 到 `data.messages`，最后 `save()`。
- 图片存储：`js/imageStore.js:50-69` 的 `putImage()` / `deleteImage()` 直接写 IndexedDB。
- 图片健康检查：`js/imageHealth.js:18-64` 按当前内存 `data` 引用与 IndexedDB 图片列表比对。

save 失败模拟方式：

- 在本机浏览器临时审计脚本中保留 IndexedDB 正常写入，临时让 `save()` 返回失败或让 `localStorage.setItem()` 抛错。
- 分别验证头像上传 / 替换、聊天图片发送；背景流程与头像代码路径相同。

实际结果：

- 头像新增 / 替换：IndexedDB 已写入新 `avatarId`，内存对象引用新头像，但 localStorage 中没有新引用。
- 聊天图片发送：IndexedDB 已写入 `msgimg-*`，内存中已有带图片消息，但 localStorage 中没有该消息或引用。
- save 失败后不关闭弹窗 / 不刷新并不能消除内存与持久化不一致。
- 基于当前内存运行 `imageHealth` 时可能看不到问题；刷新后因 localStorage 没有引用，刚写入的图片会变成孤儿图片。

影响：

- 用户以为图片已保存，但刷新后记录丢失或图片变成孤儿。
- 图片健康检查可以在刷新后发现孤儿，但不能阻止 save 失败时产生错位。
- 跨 localStorage 和 IndexedDB 的写入缺少事务边界，建议保持 P1。

建议修复方案：

- 最小侵入方案：记录本次新写入的 imageId；如果最终 `save()` 失败，则删除刚写入的图片，并恢复内存对象中的旧字段。
- 替换头像 / 背景时不要在 save 前删除旧图；成功后再清理旧 imageId。
- 聊天图片发送时，如果 `save()` 失败，应移除刚 push 的消息并删除刚写入的 `msgimg-*`。
- 暂不重写图片系统，也不修改 IndexedDB schema；P5-02 只处理失败回滚。

是否建议 P5-02 修复：是。

## 5. P2 审计详情

### P2-04 删除头像 / 背景图片时提前删 IndexedDB

当前代码位置：

- `js/app.js:298-303` 删除头像时先删 `m.avatarId` / `m.avatarData`，并调用 `window.imageStore.deleteImage(oldId)`。
- `js/app.js:336` 删除房间背景时同样先删除旧图片引用和 IndexedDB 图片。
- 最终 `save()` 在 `js/app.js:329` 或 `js/app.js:336` 后段才执行。

复现或检查步骤：

1. 先保存一个带头像的成员，localStorage 中引用旧 `avatarId`，IndexedDB 中存在旧 Blob。
2. 在编辑成员时选择移除头像。
3. 临时模拟 `save()` 失败。
4. 检查 localStorage、内存对象和 IndexedDB。

实际结果：

- localStorage 仍引用旧 `avatarId`。
- IndexedDB 中旧图片已被删除。
- 内存对象已经删除头像引用。
- 刷新后 localStorage 还原为旧头像引用，但 IndexedDB 已无对应 Blob，图片健康检查会报缺失引用。

风险判断：

- 这是 P1-03 的反向场景：不是孤儿图片，而是主数据引用还在、图片实体被提前删。
- 影响头像和背景，风险等级列为 P2，因为需要 save 失败窗口触发，但后果是用户可见缺图。

建议修复方案：

- 主数据保存成功后再删除旧图片。
- 或 save 失败时恢复旧图片；但旧 Blob 已删除时恢复成本更高。
- 推荐 P5-02 采用“延后删除旧图片到 save 成功后”的最小方案。

是否进入 P5-02：是。

### P2-05 局部 JSON 导出范围语义不一致

当前代码位置：

- `js/features/import-export.js:22-23` 选择 `current` / `room` 时只筛选 rooms 和 messages。
- `js/features/import-export.js:27-28` 和 `js/features/import-export.js:395` 对 `tasks` / `careLogs` / `careChecklist` 只在 full scope 下导出。
- `js/features/import-export.js:395` 仍全量保留 `frontingLogs`、`systemProfile`、`systemProfileVisibility`、`memberRelations`、`externalSystemCards` 和 `members`。

复现或检查步骤：

1. 准备两个群组、多个成员、系统资料、成员关系、外部系统名片和照护 / 任务数据。
2. 选择“当前群组”或“指定群组”并导出 JSON。
3. 检查 JSON 字段。

实际结果：

- `rooms`、`messages`、`polls`、`handoffNotes` 按当前选择过滤。
- `tasks`、`careLogs`、`careChecklist` 在局部 scope 下不导出。
- `members`、`systemProfile`、`memberRelations`、`externalSystemCards` 和 `frontingLogs` 仍全量保留。

风险判断：

- 如果 JSON 被理解为“局部分享文件”，会带出全局成员和系统资料。
- 如果 JSON 被理解为“备份”，局部 scope 又会丢掉 tasks / careLogs / careChecklist。
- 当前更像设计和文案不一致，列为 P2 design ambiguity。

建议修复方案：

- P5-02 至少更新 UI 文案：局部 JSON 仍包含全局成员和配置，不适合分享。
- 如果要支持分享，应新增严格局部导出模式，但这不应和备份 JSON 混用。
- 在修 P1-01 时同步收束 JSON / encrypted-json 的“备份”心智。

是否进入 P5-02：是，至少做文案或确认提示。

### P2-06 导入数据里的 id 拼进 inline JS handler

当前代码位置：

- `js/render.js:59` 把 room / member id 直接拼入 `onclick`、`oncontextmenu`、`onpointerdown`。
- `js/render.js:69` 把 message id 直接拼入 `oncontextmenu` 和 `onpointerdown`。
- `js/features/polls.js:254-266` 把 poll id 直接拼入多个按钮的 `onclick`。
- 同类位置还包括 `js/features/members.js:26,31`、`js/features/fronting.js:236`、`js/features/system-card.js:21` 等。

复现或检查步骤：

1. 构造导入数据，使某个 room id 为 `bad');window.__auditInjected=1;//`。
2. 渲染房间列表。
3. 点击该房间项。

实际结果：

- 渲染出的片段包含 `onclick="selectRoom('bad');window.__auditInjected=1;//')"`。
- 点击后 `window.__auditInjected` 被置为 `1`。
- 这说明 HTML escape 不等于 JS 字符串安全；部分位置甚至没有对 id 做 HTML escape。

风险判断：

- 当前应用是本地离线应用，攻击面主要来自导入恶意或异常 JSON 备份。
- 风险包括点击失效、误触发全局函数、执行导入文件中构造出的脚本片段。
- 列为 P2，并建议 P5-02 修复。

建议修复方案：

- 推荐优先改为 `data-id` / `data-kind` + 事件委托，消除 inline handler 字符串拼接。
- 如 P5-02 只能做小修，可先增加 JS 字符串 literal 安全转义，但这只是过渡方案。
- 需要覆盖 room、member、message、poll、fronting、relation、system card 等所有 inline handler id 使用点。

是否进入 P5-02：是。

### P2-07 清空群组但不勾清空消息时会删除非默认群组消息

当前代码位置：

- `index.html:202` 文案写“清空群组：包含普通群组和所有私聊 / 小群聊，重置为默认群组并删除被清空房间里的聊天记录。”
- `js/app.js:365` 在 `clearRooms` 为 true 时把 `data.rooms` 重置为 `initial.rooms`，把 `currentRoomId` 改为默认群组；如果没有勾选 `clearMessages`，则保留 `roomId===currentRoomId` 的消息。

复现或检查步骤：

1. 准备多个非默认群组及各自消息。
2. 打开清空数据弹窗。
3. 只勾选“清空群组”，不勾选“清空聊天记录”。
4. 确认后检查剩余消息。

实际结果：

- 非默认群组被删除。
- 原属于被删群组的消息也被删除。
- 若测试数据里没有默认 `main` 群组消息，最终 `messages` 会为空。

风险判断：

- 当前 checkbox 文案已经提到会删除被清空房间里的聊天记录，因此不是纯 bug。
- 但“没有勾选清空聊天记录”与实际删除大量消息之间仍容易造成误解。
- 列为 P2 design ambiguity，建议 P5-02 至少加强确认提示。

建议修复方案：

- 在二次确认中明确列出“即使未勾选清空聊天记录，也会删除被清空群组里的消息”。
- 或要求清空群组时必须同时勾选清空消息。
- 如果要保留消息，需要设计孤儿消息迁移规则，不建议 P5-02 直接大改。

是否进入 P5-02：是，先做文案 / 确认提示级最小修复。

## 6. P3 审计详情

### P3-08 `debouncedSave()` 与直接 `save()` 的共享 promise 逻辑较绕

当前代码位置：

- `js/storage.js:333-380`

检查结果：

- `save()` 会取消未触发的 debounced timer，并 resolve 旧的 debounced promise。
- debounced timer 触发后会再调用 `save()`，此时 timer 已清空，避免明显递归。
- 本轮未复现实际数据损坏或 promise 悬挂。

风险判断：

- 当前主要是维护风险：状态变量包括 timer、promise、resolve，直接保存和节流保存之间耦合较强。
- 不建议纳入 P5-02 必修，除非 P5-02 修复图片保存时需要触碰保存层。

### P3-09 照护清单 normalize 有不可达兜底

当前代码位置：

- `js/features/care.js:61-85`
- `js/migrate.js:190-191` 把 `normalizeCareLogRecord` / `normalizeCareChecklistRecord` 暴露到 `window`

检查结果：

- 正常加载顺序下，care 模块会使用 `window.normalizeCareLogRecord` 和 `window.normalizeCareChecklistRecord`。
- care 模块中的 fallback 主要在 normalize 函数缺失时才生效。

风险判断：

- 未发现功能影响。
- 更接近代码味道或防御性兜底，不进入 P5-02 必修。

### P3-10 非 base64 dataURL 转 Blob 对多字节内容不严谨

当前代码位置：

- `js/imageStore.js:106-121`

复现或检查步骤：

1. 调用 `dataUrlToBlob("data:text/plain,%E4%BD%A0%E5%A5%BD")`。
2. 读取 Blob 文本。

实际结果：

- 多字节文本没有按 UTF-8 bytes 编码，结果变成错误字符。
- ASCII 非 base64 dataURL 可正常工作。
- base64 dataURL 当前正常。

风险判断：

- 当前图片流程主要来自 `FileReader.readAsDataURL()` 和 canvas `toDataURL()`，实际生成的是 base64 dataURL。
- 旧 JSON 图片备份也应主要为 base64 图片 DataURL。
- 因此列为 P3 低风险，不进入 P5-02 必修；如果未来支持非 base64 dataURL，需要改为 `TextEncoder`。

## 7. P5-02 推荐修复顺序

1. 加密完整 JSON 备份强制 full scope，或同步改名为局部加密备份；推荐强制 full scope。
2. 导入 integrity 异常保留 / 提示，不要静默洗成“校验正常”。
3. 图片写入 IndexedDB 后 save 失败时回滚新写入图片和内存引用。
4. 删除头像 / 背景旧图片延后到 save 成功后，或失败时可恢复旧图。
5. inline handler id 安全：优先 `data-*` + 事件委托，至少先做 JS 字符串安全转义。
6. 局部 JSON 导出范围文案或确认提示，必要时后续另开严格局部分享模式。
7. 清空群组语义澄清：加强二次确认或要求同步勾选清空消息。
8. P3 代码味道择机处理，不作为 P5-02 阻断项。

## 8. 本轮不修复项

- P5-01 只审计，不修复业务逻辑。
- 图片一致性、encrypted-json 范围、integrity 导入行为、inline handler 安全等具体修复进入 P5-02。
- 未复现实际 bug 的 P3 项不进入 P5-02 必修，但保留观察。
- 本轮不修改 IndexedDB schema、主 data 结构、`messageIntegrity` 语义、图片 hydrate / externalize 语义、账本隔离语义或导入导出业务语义。

## 9. 验收命令与结果

已执行：

- `node --check js/storage.js`：通过
- `node --check js/features/ledger.js`：通过
- `node --check js/features/storage-health.js`：通过
- `node --check js/features/import-export.js`：通过
- `node --check js/app.js`：通过
- `git diff --check`：通过

本轮结果：

- 无业务代码改动。
- 无新增依赖。
- 无新增联网请求。
- 无 `type="module"`。

## 10. 最终结论

P5-01 已确认三个 P1 风险：

- P1-01：加密“完整 JSON 备份”跟随当前导出范围，可能造成误以为完整备份但实际缺数据。
- P1-02：导入 integrity 异常会在提示后被重算为正常，异常状态不持久。
- P1-03：图片 IndexedDB 与主数据保存不是事务，save 失败可造成孤儿图片、缺失引用或内存 / 持久化错位。

P5-01 同时确认四个 P2 风险或设计歧义：

- 删除头像 / 背景图片时提前删除 IndexedDB。
- 局部 JSON 导出范围语义不一致。
- inline handler id 拼接存在点击破坏和注入风险。
- 清空群组但不勾清空消息的语义需要更明确提示。

P3 项目前不阻断 P5-02。P5-02 可以开始最小修复，优先处理 P1 数据安全和图片一致性风险，再处理 P2 的 UI 语义和 inline handler 安全。
