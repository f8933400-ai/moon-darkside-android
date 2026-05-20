# P5-00 下一阶段路线规划

## 1. 当前基线

- 当前分支：`feature/p5-00-next-phase-planning`
- 当前基线 tag：`p4-05-ledger-isolation-acceptance`
- 当前基线 commit：`b9502ee`
- P4 结束状态：账本与主记录层隔离验收已完成
- 工作区状态：开始 P5-00 前为干净工作区

## 2. 已完成阶段复盘

P1（含 P0-P1 基础稳定化）：

- 完成本地离线记录基础：成员、群组、私聊、聊天记录、前台日志、接续面板、交接和任务接力。
- 完成成员档案 2.0、高级搜索、议题 / 决议 / 复盘、隐私桶 / 可见性、照护板和备份健康检查 UI。
- 完成自定义术语系统，允许把成员、系统、前台、交接、任务、照护、接续等界面词改成自用说法。

P2：

- 完成时间线总览和月度回顾，对消息、前台、交接、议题、任务和照护记录做只读聚合。
- 完成复盘报告 Markdown / TXT 导出，支持日期范围、章节开关和脱敏选项。
- 完成 P2 总体验收，覆盖导入导出、图片外置、`messageIntegrity`、P0-P1 回归和移动端弹窗。

P3：

- 建立性能基线，确认大房间消息渲染和 `localStorage` 主数据体积是主要风险。
- 完成消息虚拟滚动，降低单房间数千消息时的 DOM 压力，并保持搜索跳转、发送图片和校验语义稳定。
- 完成结构化存储评估，结论是暂不全量迁移 IndexedDB / SQLite，继续观察主数据体积。
- 完成本地存储健康面板和保存节流，降低少量低风险高频操作的重复写入。
- 完成可选 encrypted-json 加密完整 JSON 备份，复用完整 JSON hydrate 语义。
- 完成 PWA / 本地安装基础能力，Service Worker 只缓存静态 app shell，不缓存用户数据。

P4：

- 完成账本从主记录完整 JSON / encrypted-json 中隔离。
- 完成账本 CRUD、日 / 月 / 年 / 全部统计、分类管理、月度预算和 CSS 条形图。
- 完成账本首页体验增强，包括筛选摘要、空态提示、操作反馈和移动端打磨。
- 完成账本专用 JSON v2 / CSV 导出导入语义。
- 完成 P4-05 账本与主记录层隔离验收。

## 3. 当前稳定边界

1. 主记录层与账本层已经隔离。
2. 主 JSON / encrypted-json 不包含 `ledgerRecords` / `ledgerSettings`。
3. 账本 JSON v2 包含 `records` + `settings`。
4. 账本 JSON v1 导入只替换 `records`，保留当前 `settings`。
5. CSV 只导出账本 `records`。
6. 存储健康面板不泄露账本明细。
7. 账本功能目前作为伪装首页的普通本地账本存在。
8. 目前不引入联网、CDN、npm、构建步骤或 `type="module"`。

## 4. 剩余风险与后续重点

1. 图片一致性 bug：
   - 之前多轮明确延后，不属于 P4 账本隔离修复范围。
   - 涉及图片外置、JSON hydrate / externalize、IndexedDB 图片、`messageIntegrity`、主记录备份与恢复。
   - P5-01 应先做排查和验收，不急于大改。

2. `localStorage` 非事务性：
   - P4 已对账本导入做写入前校验和失败后尽力回滚。
   - 后续如涉及更多跨存储写入，例如主 JSON + IndexedDB 图片 + 偏好或账本组合写入，需要继续注意失败顺序和恢复提示。

3. PWA / Service Worker 缓存：
   - 后续如果要发布稳定包，需要检查缓存版本、离线资源、更新提示和旧缓存清理方式。
   - Service Worker 仍不应缓存用户 JSON、加密备份、图片 Blob、IndexedDB 内容或 `localStorage` 内容。

4. 文档与 stable 包一致性：
   - 每轮结束后需要确认 git tag、stable 包、README / RELEASE_NOTES 一致。
   - 发布稳定包前需要确认 tag 指向、文档版本名和实际文件内容一致。

5. 移动端长期体验：
   - P4 做过账本移动端打磨，但主记录层、图片编辑 / 发送、备份健康检查和导入恢复流程后续仍需关注。

## 5. 推荐 P5 阶段路线

P5-00：下一阶段路线规划

- 收束 P4 后的状态，明确 P5 的优先级和不变边界。

P5-01：图片一致性问题排查 / 验收

- 不急于修复。
- 先建立图片一致性验收矩阵。
- 复现或确认图片一致性 bug。
- 明确图片外置、IndexedDB、JSON hydrate / externalize、`messageIntegrity` 的当前行为。
- 输出是否需要 P5-02 修复的结论。

P5-02：图片一致性最小修复

- 只做 P5-01 发现的最小必要修复。
- 不重写图片系统。
- 不修改无关主记录逻辑。
- 不破坏 encrypted-json 和主 JSON 备份语义。

P5-03：图片备份 / 恢复 / hydrate / externalize 验收

- 验收图片相关的导出、导入、恢复、完整性检查。
- 确认旧备份兼容。
- 确认 IndexedDB 图片不丢、不重复、不误删。

P5-04：PWA 离线缓存与本地稳定包验收

- 验收 PWA Service Worker、manifest、本地离线资源和缓存更新。
- 不引入联网依赖。

P5-05：v0.4.0 local stable 封版验收

- 汇总 P5。
- 确认文档、tag、stable 包一致。
- 准备 `v0.4.0-local-stable` 或类似稳定版标记。

## 6. P5-01 进入条件

进入 P5-01 前必须满足：

1. 当前分支从 P5-00 tag 创建。
2. P5-00 已提交并打 tag。
3. 工作区干净。
4. 不修改 P4 tags。
5. 不修改 P4 账本隔离语义。
6. 不引入 npm / CDN / `type="module"`。
7. 不 push，除非另行要求。

## 7. P5-01 初步验收方向

P5-01 需要重点关注的文件：

- `js/imageStore.js`
- `js/imageMigration.js`
- `js/imageHealth.js`
- `js/storage.js`
- `js/features/import-export.js`
- `js/integrity.js`
- `js/render.js`
- `js/app.js`
- `BACKUP_GUIDE.md`
- `ARCHITECTURE.md`
- `USER_GUIDE.md`
- `README.md`
- `RELEASE_NOTES.md`

P5-01 需要建立的测试方向：

1. 新增带图片记录。
2. 编辑带图片记录。
3. 删除带图片记录。
4. 主 JSON 导出外置图片语义。
5. 主 JSON 导入 hydrate 语义。
6. encrypted-json 导出 / 导入与图片关系。
7. IndexedDB 图片是否存在。
8. `imageHealth` 是否能发现异常。
9. `messageIntegrity` 是否与图片外置保持一致。
10. PWA 离线后图片显示是否正常。
11. 旧备份恢复是否正常。
12. 不误伤账本功能。

## 8. 不在 P5-00 做的事

1. P5-00 不修图片 bug。
2. P5-00 不改代码。
3. P5-00 不改 schema。
4. P5-00 不改导入导出语义。
5. P5-00 不改账本功能。
6. P5-00 不新增测试依赖。
7. P5-00 不 push。

## 9. 最终结论

P4 已结束，账本与主记录层隔离已经通过 P4-05 验收。P5 推荐从图片一致性审计开始，先把之前延后的图片一致性 bug 复现、定位并形成验收矩阵，再决定是否进入最小修复。P5-00 提交并打 tag 后，可以创建 P5-01 分支并进入图片一致性审计。
