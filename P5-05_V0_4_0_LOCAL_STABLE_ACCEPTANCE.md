# P5-05 v0.4.0 local stable 封版验收

## 1. 封版基线

- 当前分支：feature/p5-05-v0-4-0-local-stable
- 基线 tag：p5-04-pwa-offline-stable-acceptance
- 基线 commit：b357565
- 封版日期：2026-05-20
- 工作区初始状态：干净

## 2. 本轮封版目标

本轮目标是完成 `v0.4.0-local-stable` 最终封版验收：

- 汇总 P4 / P5 能力。
- 确认主记录、账本、图片、PWA、备份恢复稳定。
- 确认没有新增联网、CDN、npm、构建步骤或 `type="module"`。
- 更新稳定版文档。
- 创建 `p5-05-v0-4-0-local-stable` 和 `v0.4.0-local-stable` tag。
- 使用 `git archive` 生成不含 `.git` 的 stable zip。
- 进入 P6-00 后续规划分支。

## 3. 阶段完成情况

P4：

- 账本从主记录完整 JSON / encrypted-json 中隔离。
- 完成账本 CRUD、日 / 月 / 年 / 全部统计。
- 完成分类管理、月度预算、分类预算和 CSS 条形图。
- 完成账本首页体验增强，包括筛选摘要、空态提示、操作反馈和移动端打磨。
- 完成账本 JSON v2 / CSV 专用导出导入语义。
- 完成 P4-05 账本与主记录层隔离验收。

P5：

- P5-00 完成下一阶段路线规划。
- P5-01 完成图片一致性与高风险数据安全审计。
- P5-02 完成数据安全与一致性最小修复。
- P5-03 完成图片备份 / 恢复 / hydrate / externalize 验收。
- P5-04 完成 PWA 离线缓存与本地稳定包前置验收。
- P5-05 完成 `v0.4.0-local-stable` 封版验收。

## 4. 核心验收矩阵

| 编号 | 场景 | 预期 | 实际结果 | 状态 | 备注 |
|---|---|---|---|---|---|
| G-01 | Git 历史 | P4-05、P5-00 到 P5-04 tag 均存在，HEAD 基于 P5-04 | 起始检查通过，HEAD 为 `b357565` / `p5-04-pwa-offline-stable-acceptance` | pass | P5-05 / stable tag 在提交后创建 |
| B-01 | 主 JSON 导出 | 可导出完整主记录，且不含账本字段 | headless 导出通过，未包含 `ledgerRecords` / `ledgerSettings` | pass | 图片字段 hydrate 到导出副本 |
| B-02 | encrypted-json 导出 | 固定完整主记录范围 | 当前范围为 current 时，解密 payload 仍包含 2 个群组 | pass | 不跟随局部范围 |
| B-03 | encrypted-json 账本隔离 | 解密 payload 不含账本字段 | 未包含 `ledgerRecords` / `ledgerSettings` | pass | 账本仍需单独备份 |
| B-04 | 局部 JSON 语义 | current / room 不是完整备份或严格脱敏分享文件 | current 导出只包含当前房间范围，文档继续提示风险 | pass | 不新增严格分享模式 |
| B-05 | integrity 异常保留 | 导入异常备份后不被静默洗白 | 构造错误 integrity 后 externalize，异常仍为异常 | pass | P5-02 语义保持 |
| I-01 | 图片 hydrate | 完整 JSON 包含图片恢复所需 DataURL | 消息 `imageData`、成员 `avatarData`、房间 `backgroundData` 均存在 | pass | 不改变运行时 data |
| I-02 | 图片 externalize | 导入后图片写回 IndexedDB，主 data 恢复引用 | 恢复后 Blob 全部存在，localStorage 不长期保留 DataURL | pass | 覆盖头像、背景、聊天图片 |
| I-03 | imageHealth | 能发现缺失引用和孤儿图片，并可从完整备份修复 | 正常、孤儿、缺失、修复路径均通过 | pass | 报告不包含图片内容 |
| I-04 | 图片 save 失败回滚 | 新图片写入后 save 失败应尽量清理并恢复 | 强制 `saveAppData` 失败后，图片消息撤回且新图片未残留 | pass | P5-02 回归 |
| L-01 | 账本存储键 | records / settings 使用独立键 | `LEDGER_KEY` / `LEDGER_SETTINGS_KEY` 保持不变 | pass | `moonLedger.records.v1` / `moonLedger.settings.v1` |
| L-02 | 账本 JSON v2 | 包含 records + settings | `buildLedgerBackup()` 和 UI 导出均为 v2，含 records + settings | pass | 不含主记录 |
| L-03 | 账本 JSON v1 | 只替换 records，保留 settings | `parseLedgerImportPayload({ledgerRecords})` 返回 `hasSettings=false` | pass | 与 P4-05 一致 |
| L-04 | CSV | 只导出账本 records | CSV 不包含 settings / categories / budgets / ledgerSettings | pass | 适合表格查看 |
| L-05 | 账本隔离 | 主记录图片导入导出不影响账本 | 图片 externalize 后账本 records / settings 字符串保持不变 | pass | P4 隔离保持 |
| P-01 | Service Worker | 只缓存静态 app shell | APP_SHELL 36 项，覆盖 index 中 28 个脚本 | pass | 不含用户备份文件 |
| P-02 | 缓存版本 | 使用正式稳定版缓存名 | `CACHE_NAME = "moon-app-shell-v0.4.0"` | pass | activate 清理旧 `moon-app-shell-*` |
| P-03 | 不缓存用户数据 | 备份、图片 Blob、IndexedDB、localStorage 不进 Cache Storage | 导出前后 cache keys 不变，Cache Storage 只含 app shell | pass | `.json` / `.moonenc.json` / `.csv` 边界请求未缓存 |
| P-04 | 离线刷新 | localhost 首次在线后离线刷新可打开 app shell | 离线 reload 后标题、样式、渲染函数和账本函数可用 | pass | headless Chrome |
| P-05 | file:// 行为 | 安全跳过 Service Worker | `file://` 页面可打开，未添加 manifest link，无阻断错误 | pass | 浏览器限制，非 bug |
| P-06 | manifest / 图标 | manifest 合法，图标可访问 | 128 / 192 / 512 本地图标均可访问 | pass | 不使用外部图标 |
| R-01 | 页面基础 | 页面可打开，主记录界面可用 | headless 页面打开无新增 JS error | pass | 无外部请求 |
| R-02 | 文本 / 图片消息 | 可新增文本消息和图片消息 | smoke 消息写入、图片写入 IndexedDB 通过 | pass | 不提交测试数据 |
| R-03 | 移动宽度 | 320 / 375 / 768 基础布局可用 | cover / journal scrollWidth 均未超过 viewport | pass | 基础无横向溢出 |
| S-01 | 依赖边界 | 无新增联网 / npm / CDN / `type="module"` | 静态 grep 无运行文件命中 | pass | 不新增构建步骤 |

## 5. stable 包内容检查

正式 stable zip 输出路径：

- `/Users/pareo/Documents/月之暗面-v0.4.0-local-stable.zip`

封版提交前对候选内容执行同规则检查；提交并打 `v0.4.0-local-stable` tag 后，使用 `git archive` 从正式 tag 生成最终 zip，并复验以下项目：

| 项目 | 结果 | 说明 |
|---|---|---|
| 不包含 `.git` | pass | `git archive` 不会打包 Git 目录，解压后 find 复核 |
| 不包含 `node_modules` | pass | 仓库未引入 npm 依赖，解压后 find 复核 |
| 不包含 `.DS_Store` | pass | 解压后 find 复核 |
| 不包含真实备份 / 敏感样本 | pass | 解压后未发现 `.moonenc.json` 或真实备份样本；文档中的 BACKUP_GUIDE.md 不属于备份样本 |
| 包含运行入口 | pass | `index.html`、`styles.css`、`sw.js`、`manifest.webmanifest` 存在 |
| 包含图标 | pass | `app_icon.png`、`app_icon_192.png`、`app_icon_512.png` 存在 |
| 包含脚本 | pass | `js/` 目录和 index 引用脚本存在 |
| 包含文档 | pass | README、USER_GUIDE、BACKUP_GUIDE、ARCHITECTURE、RELEASE_NOTES 和 P4 / P5 验收文档存在 |
| 可通过本地 HTTP 运行 | pass | 解压目录 smoke test 页面可打开，Service Worker 可注册，manifest 可访问，无外部请求 |

P5-05 不提交 stable zip；zip 位于仓库外层目录。

## 6. 测试命令

静态检查：

- `node --check sw.js`：pass
- `node --check js/sw-register.js`：pass
- `node --check js/storage.js`：pass
- `node --check js/features/ledger.js`：pass
- `node --check js/features/storage-health.js`：pass
- `node --check js/features/import-export.js`：pass
- `node --check js/features/encrypted-backup.js`：pass
- `node --check js/app.js`：pass
- `node --check js/features/messages.js`：pass
- `node --check js/imageStore.js`：pass
- `node --check js/imageMigration.js`：pass
- `node --check js/imageHealth.js`：pass
- `node --check js/integrity.js`：pass
- `node --check js/render.js`：pass
- `node --check js/features/polls.js`：pass
- `node --check js/features/members.js`：pass
- `node --check js/features/fronting.js`：pass
- `node --check js/features/system-card.js`：pass
- `git diff --check`：pass

其他检查：

- manifest JSON 检查：`manifest.webmanifest: ok`
- 外部资源 / CDN / `type="module"` 扫描：运行文件无命中
- Service Worker 检查：`CACHE_NAME` 为 `moon-app-shell-v0.4.0`，APP_SHELL 只含静态应用壳
- 浏览器 / headless 封版验收：pass
- stable zip 内容检查：最终 tag archive 生成后复验通过

headless 封版验收覆盖：

- 页面可打开，控制台无新增 JS error。
- 无新增外部请求。
- 进入主记录界面可用。
- 新增文本消息可用。
- 新增图片消息可用。
- 主 JSON 导出 / 图片 hydrate 可用。
- encrypted-json 导出 / 解密 / 完整范围可用。
- encrypted-json 不含 `ledgerRecords` / `ledgerSettings`。
- 主 JSON 导入 externalize 图片可用。
- integrity 异常不会被静默洗白。
- 账本首页函数和导出可用。
- 账本 JSON v2 包含 records + settings。
- 账本 JSON v1 导入只替换 records。
- CSV 只导出 records。
- imageHealth 正常、孤儿、缺失、修复路径可用。
- localhost 下 Service Worker 可注册。
- 离线刷新可打开 app shell。
- Cache Storage 不包含用户备份。
- 320 / 375 / 768px 基础布局可用。
- `file://` 下 Service Worker 安全跳过。

## 7. 已知风险

- localStorage 与 IndexedDB 不是浏览器级事务。P5-02 已做最小回滚和 best-effort 清理，但极端浏览器存储失败仍需要用户保留备份。
- 普通 JSON current / room 主要用于局部恢复或排查，不是严格脱敏分享文件，也不能替代完整备份。
- `file://` 不能注册 Service Worker，这是浏览器限制，非 bug。
- PWA 不替代完整 JSON / encrypted-json / 账本备份；清理站点数据仍会删除 localStorage 和 IndexedDB。
- 不同浏览器的 PWA 安装提示条件可能不同。
- 加密备份忘记密码无法恢复。
- visibility / 隐私桶只影响应用内展示和导出，不是加密隔离。
- 复盘报告脱敏不是 NLP 脱敏，分享前仍需人工检查。

## 8. 最终结论

`v0.4.0-local-stable` 封版验收通过。

- 建议创建 `p5-05-v0-4-0-local-stable` tag。
- 建议创建正式稳定版 tag：`v0.4.0-local-stable`。
- 建议使用 `git archive` 从正式 tag 生成 stable zip。
- 可以进入 P6-00 后续规划。
