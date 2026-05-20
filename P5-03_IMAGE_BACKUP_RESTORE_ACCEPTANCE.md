# P5-03 图片备份 / 恢复 / hydrate / externalize 验收

## 1. 验收基线

- 当前分支：`feature/p5-03-image-backup-restore-acceptance`
- 基线 tag：`p5-02-data-safety-minimal-fixes`
- 基线 commit：`623d084`
- 验收日期：2026-05-20
- 工作区初始状态：干净

## 2. 验收范围

本轮覆盖图片备份与恢复主链路：

- 成员头像。
- 房间背景。
- 聊天图片。
- IndexedDB 图片存储。
- 主 JSON 导出 hydrate。
- 主 JSON 导入 externalize。
- encrypted-json 导出 / 导入图片恢复。
- 普通 JSON current / room 局部范围图片行为。
- `messageIntegrity` 与旧式 `imageData` externalize。
- `imageHealth` 缺失引用、孤儿图片和备份修复能力。
- P5-02 图片写入失败回滚和旧图延后清理回归。
- 主记录图片导入导出与账本隔离回归。

P5-03 没有改 IndexedDB schema，没有修改主 data schema，没有修改 `messageIntegrity` 算法语义，没有处理 PWA / Service Worker 缓存。

## 3. 当前图片存储模型

运行时主 data 只长期保存图片引用：

- 聊天图片：`messages[].imageId`，同时保留 `imageName` / `imageType`。
- 成员头像：`members[].avatarId`。
- 房间背景：`rooms[].backgroundId`。

图片实体保存在 IndexedDB：

- 数据库：`moon-images`。
- objectStore：`images`。
- 记录包含 `id`、`blob`、`mime`、`name`、`createdAt`。

导出 hydrate 语义：

- 完整 JSON 和 encrypted-json 会复制当前主 data。
- 导出副本根据 `imageId/avatarId/backgroundId` 从 IndexedDB 读取 Blob。
- 导出副本写入 `imageData/avatarData/backgroundData`，用于单文件恢复。
- hydrate 不修改运行时 data，不删除 IndexedDB 图片。
- 主记录 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。

导入 externalize 语义：

- 导入 JSON 中的 `imageData/avatarData/backgroundData` 会写回 IndexedDB。
- 导入后主 data 恢复为 `imageId/avatarId/backgroundId` 引用。
- 大体积 DataURL 不长期留在 localStorage 主 data。
- 原本校验正常的旧式图片消息在 externalize 后按当前规则重算 `integrity` 并保持正常。
- 原备份中已经校验异常的消息不会被静默洗成正常。

账本边界：

- 账本 JSON v2 只包含 `records` 和 `settings`。
- 账本备份不包含主记录图片、图片 DataURL、IndexedDB 图片、主记录消息或 `messageIntegrity`。
- 主记录图片导入导出不修改账本 records / settings。

## 4. 验收矩阵

| 编号 | 场景 | 预期 | 实际结果 | 状态 | 备注 |
|---|---|---|---|---|---|
| A-01 | imageStore 基础读写删除 | `putImage/getImageBlob/blobToDataUrl/getImageUrl/deleteImage` 正常 | `imageStore.selfTest()` 全部通过 | pass | 不改 schema |
| A-02 | 新增成员并设置头像 | 头像写入 IndexedDB，主 data 只保留 `avatarId` | IndexedDB 有头像 Blob，成员列表头像显示为 blob URL，localStorage 无 DataURL | pass | 使用保存按钮流程 |
| A-03 | 新增房间并设置背景 | 背景写入 IndexedDB，主 data 只保留 `backgroundId` | IndexedDB 有背景 Blob，聊天区背景显示为 blob URL，localStorage 无 DataURL | pass | 使用保存按钮流程 |
| A-04 | 新增聊天图片消息 | 图片写入 IndexedDB，消息只保留 `imageId` | IndexedDB 有 `msgimg-*`，聊天图片显示为 blob URL，localStorage 无 DataURL | pass | 使用发送图片流程 |
| B-01 | 完整 JSON hydrate | 导出副本包含图片恢复所需 DataURL | 图片消息含 `imageData`，成员含 `avatarData`，房间含 `backgroundData` | pass | runtime data 未改变 |
| B-02 | 完整 JSON 不改运行态 | 导出不删除 IndexedDB，也不把 DataURL 写回主 data | 导出前后主 data 和 IndexedDB 图片列表一致 | pass | 无副作用 |
| B-03 | 完整 JSON 账本隔离 | 主 JSON 不含账本 records / settings | 未出现 `ledgerRecords` / `ledgerSettings` | pass | 与 P4 / P5-02 一致 |
| C-01 | 完整 JSON externalize | 导入后图片写回 IndexedDB，主 data 恢复引用 | 导入后 2 张聊天图、1 个头像、2 个背景均有引用和 Blob | pass | localStorage 无 DataURL |
| C-02 | 完整 JSON 图片显示 | 导入后图片可显示 | 聊天图片、成员头像、房间背景均显示为 blob URL | pass | headless DOM 验证 |
| C-03 | 完整 JSON integrity | 正常消息导入后仍校验正常 | 导入后的消息 `integrityOk()` 全部为 true | pass | 正常备份路径 |
| D-01 | encrypted-json 完整范围 | 当前范围为 current 时仍导出全量主记录 | 解密 payload 包含多个群组 | pass | 继承 P5-02 修复 |
| D-02 | encrypted-json 图片恢复 | 解密 payload 含图片 DataURL，导入后图片恢复 | 头像、背景、两个群组图片消息均恢复 | pass | 账本未受影响 |
| D-03 | encrypted-json 账本隔离 | 解密 payload 不含账本 records / settings | 未出现 `ledgerRecords` / `ledgerSettings` | pass | 账本 records / settings 保持不变 |
| E-01 | 普通 JSON current 局部提示 | 导出前提示不是完整备份 | 出现 P5-02 局部范围确认文案 | pass | 不误称完整备份 |
| E-02 | 普通 JSON current 图片范围 | 当前房间消息 / 背景 hydrate，非当前房间消息不导出 | A 房间图片恢复，B 房间消息与图片不在局部备份中 | pass | 全局成员头像仍随全量 members hydrate |
| E-03 | 局部 JSON 导入 | 可导入并恢复局部范围内图片 | A 房间图片恢复，账本不受影响 | pass | 符合现有局部语义 |
| F-01 | 正常旧式 `imageData` 消息 | externalize 后图片写入 IndexedDB，校验正常 | `imageId` 存在，`imageData` 删除，`integrityOk()` 为 true | pass | P5-02 语义保持 |
| F-02 | 异常旧式 `imageData` 消息 | 图片处理完成，但校验异常保留 | `imageId` 存在，Blob 存在，`integrityOk()` 为 false | pass | 未被静默洗白 |
| G-01 | imageHealth 正常数据 | 不报告缺失或孤儿 | `missing.total=0`，`orphaned.length=0` | pass | 正常流程不制造孤儿 |
| G-02 | imageHealth 缺失引用 | 删除被引用 Blob 后能发现缺失 | 缺失消息图片被报告 | pass | 报告不含图片内容 |
| G-03 | imageHealth 从备份修复 | 完整备份可修复缺失图片 | preview 可修复，repair 后恢复健康 | pass | 不直接改主 data |
| G-04 | imageHealth 孤儿图片 | 不被主 data 引用的图片可识别 | `orphan-p503` 被报告为孤儿 | pass | 报告不包含 Blob / DataURL |
| H-01 | 图片消息 save 失败回滚 | 新图片清理，消息不保留为已发送 | 回滚通过，pending 图片保留可重试 | pass | P5-02 回归 |
| H-02 | 替换头像 save 失败回滚 | 旧头像引用和 Blob 保持，新图清理 | 回滚通过 | pass | P5-02 回归 |
| H-03 | 删除背景 save 失败回滚 | 旧背景引用和 Blob 保持 | 回滚通过 | pass | P5-02 回归 |
| H-04 | 背景 save 成功清理旧图 | 新图显示，旧图延后清理 | 保存成功后旧 Blob 被清理 | pass | P5-02 回归 |
| I-01 | 主 JSON / encrypted-json 账本隔离 | 仍不含 `ledgerRecords` / `ledgerSettings` | 两者均不含 | pass | 主记录层不覆盖账本 |
| I-02 | 账本 JSON v2 / v1 基本行为 | v2 仍含 records + settings；v1 records 可 normalize | 验证通过 | pass | 本轮未改账本代码 |
| I-03 | 无新增联网请求 | 验收过程只有本机资源请求 | `externalRequests=[]` | pass | 不新增远程 API |

## 5. 发现的问题

本轮未发现阻断 P5-03 的图片备份 / 恢复 bug。

记录到的非阻断事实：

- 普通 JSON current / room 是现有“局部恢复或排查”语义，不是严格局部分享文件。消息和房间背景跟随房间范围，成员列表仍为全量，因此成员头像也会随全量 members hydrate。该行为与 P5-02 文案和当前导出结构一致。
- localStorage 与 IndexedDB 仍不是浏览器级事务。P5-02 已对新增图片写入和旧图删除做最小回滚 / 延后清理；本轮验收确认正常路径和故障注入路径均未回退。
- PWA / Service Worker 离线缓存未在本轮验收，按计划进入 P5-04。

## 6. 修复情况

本轮仅验收和文档更新，无业务代码改动。

没有修改：

- `js/imageStore.js`
- `js/imageMigration.js`
- `js/imageHealth.js`
- `js/features/import-export.js`
- `js/storage.js`
- `js/app.js`
- `js/features/messages.js`
- `js/integrity.js`
- IndexedDB schema
- `messageIntegrity` 算法
- 账本隔离语义

## 7. 测试命令

静态检查：

- `node --check js/storage.js`：通过
- `node --check js/features/ledger.js`：通过
- `node --check js/features/storage-health.js`：通过
- `node --check js/features/import-export.js`：通过
- `node --check js/app.js`：通过
- `node --check js/features/messages.js`：通过
- `node --check js/imageStore.js`：通过
- `node --check js/imageMigration.js`：通过
- `node --check js/imageHealth.js`：通过
- `node --check js/integrity.js`：通过
- `node --check js/render.js`：通过
- `git diff --check`：通过

headless / 浏览器验收：

- 基础图片写入：通过。
- 完整 JSON hydrate：通过。
- 完整 JSON externalize：通过。
- encrypted-json 图片恢复：通过。
- 普通 JSON 局部图片范围：通过。
- `messageIntegrity` 与图片 externalize：通过。
- `imageHealth` 缺失引用、孤儿图片和备份修复：通过。
- P5-02 图片回滚回归：通过。
- 主记录图片导入导出与账本隔离：通过。
- 页面脚本错误：无。
- 新增联网请求：无，只有本机 `127.0.0.1` 资源请求。

依赖边界：

- 未新增 npm / CDN / 构建步骤。
- 未新增远程 API 或联网请求。
- 未使用 `type="module"`。

## 8. 最终结论

P5-03 图片备份 / 恢复 / hydrate / externalize 验收通过。

- 成员头像、房间背景、聊天图片均可通过完整 JSON 备份恢复。
- encrypted-json 固定完整范围，并可恢复主记录图片。
- 普通 JSON 局部导出的图片范围符合现有 current / room 语义。
- 导入 externalize 后主 data 回到外置引用形态，不长期保留大体积 DataURL。
- `messageIntegrity` 与 P5-02 语义一致：正常图片消息保持正常，异常消息不被静默洗白。
- `imageHealth` 可用于发现缺失引用、孤儿图片，并可从完整 JSON 备份修复缺失图片。
- P5-02 图片回滚修复未破坏正常备份 / 恢复流程。
- 主记录 JSON / encrypted-json 仍与账本 records / settings 隔离。

可以进入 P5-04，继续做 PWA 离线缓存与本地稳定包验收。
