# P6-00 封包前关键数据安全修复

## 1. 修复基线

- 当前分支：`feature/p6-00-post-v0-4-0-planning`
- 当前基线 tag：`v0.4.0-local-stable`
- 当前基线 commit：`5f5d0dc chore: finalize v0.4.0 local stable`
- 修复日期：2026-05-20
- 工作区初始状态：干净
- P6-00 tag 检查：开始时 `p6-00-prepackage-critical-data-fixes` 不存在
- P6-01 分支检查：开始时 `feature/p6-01-lock-integrity-logic-fixes` 不存在

## 2. 修复范围

- 导入图片 externalize 改为唯一 import 图片 ID，避免覆盖本机 IndexedDB 旧图。
- 导入和图片迁移过程中记录本次写入图片，失败时 best-effort 清理。
- 删除成员 / 群组 / 消息时增加 save 失败 rollback，保存成功后才清理对应图片。
- 删除成员时清理 tasks / polls / frontingLogs / 私聊 memberIds 等非历史引用。
- fronting 新增 / 删除 / 结束和清空数据增加 save 失败 rollback。

## 3. 每项修复说明

### Bug 1：导入图片覆盖与失败回滚

- 原风险：导入使用 `msgimg-${id}` / `avatar-${id}` / `roombg-${id}`，会覆盖本机已有同名 IndexedDB 图片；`save()` 失败时新写入图片不能回滚。
- 修改文件：`js/features/import-export.js`
- 修复方式：新增 import 图片唯一 ID；`externalizeImagesAfterJsonImport()` 记录 `createdImageIds`；externalize 或 `save()` 失败时清理本轮新增图片并恢复 data / currentRoomId。
- 验收结果：headless 故障注入确认旧同名图片不被覆盖，成功导入后 data 指向新 import ID，失败导入后 data / currentRoomId 回滚且新图被删除。
- 剩余风险：IndexedDB 与 localStorage 仍不是事务；清理失败只 `console.warn`。

### Bug 2：图片迁移失败清理

- 原风险：旧 `imageData` 迁移到 IndexedDB 中途失败时，已写入的图片会成为孤儿图片。
- 修改文件：`js/imageMigration.js`
- 修复方式：迁移期间记录 `createdImageIds`；失败且主 data 尚未成功保存时恢复 data snapshot 并删除已写入图片。
- 验收结果：headless 注入第 N 张图片写入失败，前 N-1 张图片被删除，data 恢复，`imageMigrationDone` 未设置；成功迁移路径保持正常。
- 剩余风险：如果主 data 已成功保存但后续迁移元信息写入失败，会保留图片 Blob，避免破坏已保存引用。

### Bug 3：删除路径图片清理与悬挂引用

- 原风险：删除成员 / 群组 / 消息后，对应头像、背景、消息图片可能成为孤儿；部分非历史引用仍指向已删除对象。
- 修改文件：`js/app.js`
- 修复方式：删除前 snapshot；`save()` 失败恢复 snapshot 并不删图片；`save()` 成功后清理未被引用的旧图片。成员删除清理 memberRelations、task assignees、poll votes/comments、fronting memberIds/primaryMemberId、private room memberIds。群组删除保留原有删除群组消息 / polls / handoffNotes 语义，并清理指向被删 handoff 的 task `linkedHandoffId`。
- 验收结果：headless 覆盖 deleteMessage / deleteMember / deleteRoom 成功和失败路径；成功后图片清理，失败后数据与图片均保留。
- 剩余风险：历史消息保留已删除成员显示名；这是当前产品语义，本轮不删除历史消息。

### Bug 4：save 失败 rollback

- 原风险：fronting 和清空等路径先改内存再 `save()`，失败后 UI 与 localStorage 不一致。
- 修改文件：`js/app.js`、`js/features/fronting.js`
- 修复方式：fronting 新增 / 删除 / 结束和 confirmClear 清空前 snapshot；`save()` 失败恢复 data / prefs / currentRoomId / tab 并重新渲染；保存成功后再执行图片清理等副作用。
- 验收结果：headless 注入 fronting end/delete 保存失败，原 open / log 状态恢复；confirmClear 保存失败后成员和消息恢复且不删图。
- 剩余风险：poll / care / task / handoff 的一般保存路径未做大范围重构，只在成员 / 群组删除相关引用中覆盖必要清理。

## 4. 本轮未处理项

- 锁屏密码强度。
- 仅生物识别不设密码。
- `messageIntegrity` 分隔符。
- Service Worker stale-while-revalidate。
- `dataUrlToBlob` charset。
- `urlCache` 生命周期。
- 账本金额 Number 浮点问题。
- `system-card.js` QR 库 eval 风格。
- 封面模式 `setInterval`。
- 导入后 `imageMigrationDone` / `closeDuePolls` 小坑。
- Android / macOS / iOS 打包。

这些进入 P6-01 或后续阶段。

## 5. 测试结果

- `node --check js/storage.js`：通过
- `node --check js/features/import-export.js`：通过
- `node --check js/imageMigration.js`：通过
- `node --check js/imageStore.js`：通过
- `node --check js/imageHealth.js`：通过
- `node --check js/app.js`：通过
- `node --check js/features/messages.js`：通过
- `node --check js/features/fronting.js`：通过
- `node --check js/features/polls.js`：通过
- `node --check js/features/care.js`：通过
- `node --check js/render.js`：通过
- `node --check js/integrity.js`：通过
- `node --check js/features/ledger.js`：通过
- `node --check js/features/storage-health.js`：通过
- `git diff --check`：通过
- headless 故障注入：`/private/tmp/p6_00_headless_tests.js` 通过，覆盖导入唯一 ID / save 失败清理、迁移失败清理、删除成功和失败、fronting 失败 rollback、imageHealth 正常报告。
- 浏览器烟测：通过 `http://127.0.0.1:4177/index.html` 加载，标题为 `月之暗面 · 本地版`，控制台 error 日志为空；临时本地服务已停止。
- imageHealth 结果：正常引用下 `missing.total=0`、`orphaned.length=0`。
- 主 JSON / encrypted-json 账本隔离：导出对象未加入 `ledgerRecords` / `ledgerSettings`；本轮未修改账本导出导入结构。
- 账本 JSON v1/v2：未修改 `js/features/ledger.js` 账本解析、保存和导出结构。

## 6. 最终结论

P6-00 已完成封包前 P1 数据安全与一致性最小修复。当前仍暂停跨平台打包；完成提交和 tag 后，可以进入 P6-01 继续处理锁屏、integrity 逻辑和其它中低风险项。
