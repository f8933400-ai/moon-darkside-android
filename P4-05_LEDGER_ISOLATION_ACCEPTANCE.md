# P4-05 账本与记录层隔离验收

## 验收概况

- 验收日期：2026-05-20
- 当前分支：`feature/p4-05-ledger-isolation-acceptance`
- P4-04 基线 tag：`p4-04-ledger-home-polish`
- P4-04 基线提交：`f80e495`
- 验收范围：账本 `records` / `settings` 与主记录层的备份、导入、导出、存储健康面板和可见账本 UI 文案隔离。
- 结果：通过。

## 验收命令

```bash
node --check js/storage.js
node --check js/features/ledger.js
node --check js/features/storage-health.js
node --check js/features/import-export.js
node --check js/app.js
git diff --check
```

浏览器 / headless 验收使用本地静态服务 `http://127.0.0.1:4185/` 和 Playwright CLI 执行。Playwright 仅作为本地验收工具运行，没有向仓库加入 npm 依赖、构建产物或测试产物。

## 验收矩阵

| 场景 | 验收点 | 结果 |
| --- | --- | --- |
| 主 JSON 导出 | `storage.exportBackup()` 不含 `ledgerRecords`、`ledgerSettings`、`moonLedger.records.v1`、`moonLedger.settings.v1`，也不含账本记录 / 设置哨兵内容 | 通过 |
| encrypted-json 导出 | 解密后的 payload 不含 `ledgerRecords`、`ledgerSettings`，也不含账本记录 / 设置哨兵内容 | 通过 |
| 普通主记录导入 | 主记录正常导入，`ledgerRecords`、`ledgerSettings`、`prefs`、IndexedDB 图片不变 | 通过 |
| 旧版主记录导入 | 含 `ledgerRecords` 的旧版主备份只导入主记录，不自动覆盖当前账本，并显示保留当前账本语义 | 通过 |
| 账本 JSON v2 导出 | `app: "moon-ledger"`、`kind: "ledger-backup"`、`version: 2`，包含 `records` 和 `settings` | 通过 |
| 账本 JSON v2 隔离 | 不包含主记录 `rooms`、`members`、`messages`、`prefs`、`messageIntegrity`、图片字段或主记录哨兵内容 | 通过 |
| 账本 JSON v1 导入 | 只替换账本 `records`，保留当前 `settings`，不影响主记录、`prefs` 或 IndexedDB 图片 | 通过 |
| 账本 JSON v2 导入 | 替换账本 `records` 和 `settings`，不影响主记录、`prefs` 或 IndexedDB 图片 | 通过 |
| 坏 settings 导入 | v2 `settings` 格式错误时导入失败，当前 `records` / `settings` / 主记录不变 | 通过 |
| 半导入回滚 | 模拟 `saveLedgerSettings()` 失败时，尽量回滚 `records` / `settings` | 通过 |
| 账本导入入口 | 使用账本入口导入主记录备份会被拒绝，当前账本和主记录不变 | 通过 |
| CSV 导出 | 只导出 `date,type,amount,category,account,paymentMethod,note,createdAt,updatedAt` 记录字段，不导出 settings / categories 设置 / budgets 设置 / 主记录字段 | 通过 |
| 存储健康面板 | 显示账本大小、账本设置大小和数量统计，不显示账本明细、金额明细、分类详情或预算详情 | 通过 |
| 账本 UI 文案 | 账本首页可见 UI 不出现禁用词，保持普通记账软件语气 | 通过 |
| 依赖与联网 | 无新增 npm / CDN / `type="module"`，验收期间无外部请求，控制台无新增 JS error | 通过 |

## Headless 验收结果

本地浏览器验收共执行 44 个断言，全部通过：

- KEY / PREF_KEY / LEDGER_KEY / LEDGER_SETTINGS_KEY 未改。
- 主 JSON 和 encrypted-json 均不包含账本 records / settings。
- 普通主导入和旧版含账本字段主导入均不覆盖当前账本。
- 账本 JSON v2 导出包含 records + settings，且不包含主记录数据。
- CSV 只包含账本 records 字段。
- 账本 JSON v1 导入只替换 records 并保留 settings。
- 账本 JSON v2 导入替换 records + settings。
- 坏 settings 导入失败且不破坏当前账本。
- 模拟 settings 保存失败时，records / settings 尽量回滚。
- 账本导入入口拒绝主记录备份。
- 存储健康面板不泄露账本明细。
- 账本首页可见 UI 文案无禁用词。
- 无外部请求、无新增 JS error、无新增 npm / CDN / `type="module"`。

## 静态检查结果

- `node --check js/storage.js`：通过。
- `node --check js/features/ledger.js`：通过。
- `node --check js/features/storage-health.js`：通过。
- `node --check js/features/import-export.js`：通过。
- `node --check js/app.js`：通过。
- `git diff --check`：通过。

## 发现的问题与修复情况

本轮未发现账本隔离相关阻断问题，因此没有修改业务代码。

## 剩余风险

- `localStorage` 本身不是事务型存储。账本 v2 导入已经做写入前校验和失败后尽量回滚，但极端情况下如果浏览器存储连续失败，仍只能做到尽量保留原账本并提示用户。
- 分类改名仍不批量迁移旧记录中的 `category` 字符串，这是 P4-03 既定行为，不属于本轮隔离问题。

## 最终结论

P4-05「账本与记录层隔离验收」通过。主记录完整 JSON / encrypted-json 与账本 records / settings 保持隔离；账本 JSON / CSV 专用备份语义保持正确；主导入不会覆盖账本；账本导入不会影响主记录；存储健康面板只显示账本大小和数量，不泄露账本明细。
