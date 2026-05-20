# P6-02 低风险维护修复与封包前回归

## 1. 修复基线

- 当前分支：`feature/p6-02-low-risk-maintenance-fixes`
- 基线 tag：`p6-01-lock-integrity-logic-fixes`
- 基线 commit：`c5c4605`
- 修复日期：2026-05-20
- 工作区初始状态：干净

## 2. 修复范围

- Service Worker stale-while-revalidate 边角修复。
- `dataUrlToBlob` 支持 charset、命名参数和非 base64 多字节 data URL。
- `imageStore` object URL cache 增加 LRU 上限和释放机制。
- 账本统计、预算和汇总改用 cents 整数计算，避免浮点边界误差。
- 系统名片 QR 生成 / 识别库拆成普通本地 vendor script。
- 封面和账本模式下跳过 journal 定时任务。

## 3. 每项修复说明

### Bug 8 Service Worker stale-while-revalidate

- 原风险：有缓存时刷新失败路径不清晰；无缓存且 fetch 失败时可能没有明确 fallback；新增 vendor 脚本若不进入 app shell 会影响离线 QR 功能。
- 修改文件：`sw.js`。
- 修复方式：`appShellResponse()` 改为明确的 async 流程；命中缓存时后台刷新失败只 `console.warn` 并返回旧缓存；无缓存时先 fetch，失败后回退到入口 app shell；继续只处理同源 GET app shell 请求，并把新增 QR vendor 脚本加入 `APP_SHELL`。
- 验收结果：headless 验证 cached refresh 失败返回 stale，missing cache fetch 失败可 fallback；浏览器验证 Service Worker 注册、Cache Storage 有 app shell、离线刷新可打开页面。
- 剩余风险：缓存名仍保持 `moon-app-shell-v0.4.0`，未做新的缓存版本 bump；本轮只修边角行为，未重写 PWA 策略。

### Bug 9 dataUrlToBlob charset / 非 base64 兼容

- 原风险：旧正则只覆盖普通 `data:image/png;base64,...`，不支持 `charset`、`name` 等参数或 UTF-8 非 base64 内容。
- 修改文件：`js/imageStore.js`。
- 修复方式：改为手动解析 `data:` header 和 payload；media type 取第一个 MIME 段；`base64` 参数大小写兼容；非 base64 使用 `decodeURIComponent` 和 `TextEncoder`。
- 验收结果：headless 和浏览器均验证普通 base64、带 charset 的 base64、UTF-8 文本 data URL 正常，非法 data URL 抛出明确错误。
- 剩余风险：仍依赖浏览器 `atob` / `TextEncoder`，与当前本地 SPA 运行环境一致。

### Bug 10 imageStore urlCache 释放

- 原风险：`getImageUrl()` 创建的 ObjectURL 长会话内持续累积，没有上限。
- 修改文件：`js/imageStore.js`。
- 修复方式：增加 `URL_CACHE_LIMIT = 120`；命中缓存时刷新最近使用顺序；新增 URL 后超过上限会 revoke 最旧 URL；`putImage()` / `deleteImage()` / `clearImageCache()` 继续释放对应 ObjectURL。
- 验收结果：headless 和浏览器均验证加载超过上限后 cache size 不超过 120，删除图片和清空缓存会释放 URL。
- 剩余风险：已渲染的旧 `<img>` 可能仍短暂持有浏览器内部资源；下一次渲染会重新取 URL。

### Bug 11 账本金额 cents 计算

- 原风险：统计和预算直接累加 JS Number，`0.1 + 0.2` 等边界可能导致预算误判。
- 修改文件：`js/features/ledger.js`。
- 修复方式：新增 `ledgerAmountToCents()`、`ledgerCentsToAmount()`、`ledgerMoneyFromCents()`；分类汇总、账户汇总、收入 / 支出合计、预算进度和超支判断使用 cents 整数；展示仍保留两位小数。
- 验收结果：headless 验证 `0.1 + 0.2` 显示 `0.30`，预算 `0.30` 不误报超支，`0.31` 会显示超出 `0.01`；浏览器验证账本 JSON v2 和 CSV 导出结构不变。
- 剩余风险：`ledgerRecords.amount` 存储结构仍保持原样，未做整数分持久化迁移。

### Bug 12 QR 库拆分

- 原风险：`system-card.js` 使用 `Function(atob(...))` 运行内嵌 QR 库，不利于 CSP 和审计。
- 修改文件：`index.html`、`sw.js`、`js/features/system-card.js`、`js/vendor/qrcode-generator.js`、`js/vendor/jsqr.js`。
- 修复方式：把原内嵌 QR generator 和 jsQR 库拆成普通本地脚本，在 `system-card.js` 前按顺序加载；删除 `system-card.js` 中的 `Function(atob(...))` 逻辑；QR 库缺失时给出明确错误提示。
- 验收结果：`system-card.js` 不再命中 `new Function` / `Function(` / `atob(`；浏览器验证 `qrcode` 和 `jsQR` 为本地全局函数，二维码绘制成功，新增 vendor 文件进入 app shell，离线 PWA 下页面可用。
- 剩余风险：vendor 文件仍是从既有内嵌库拆出的第三方库源码，本轮未替换为新的 QR 实现，也未新增 CSP。

### Bug 13 封面模式跳过 journal 定时任务

- 原风险：封面 / 账本页停留时，journal 相关 60 秒定时任务仍会运行并可能关闭投票或刷新隐藏区域。
- 修改文件：`js/app.js`。
- 修复方式：新增 `runJournalIntervalTasks()`，在 `appMode !== "journal"` 时直接返回；启动时也只在 journal 模式下执行 `closeDuePolls()`；导入后的立即 closeDuePolls 保持独立，不受 appMode 影响。
- 验收结果：headless 验证 cover 模式不调用 `closeDuePolls()`，journal 模式正常调用；浏览器回归无新增控制台错误。
- 剩余风险：本轮没有重构所有后台定时或渲染路径，只最小限制 journal interval。

## 4. 本轮未处理项

- 仍未开始 Android APK / macOS DMG / iOS IPA 打包。
- 未做严格局部脱敏分享模式。
- 未做账本 `amount` 存储迁移到整数分。
- 未做全项目 save rollback 大重构。
- 未新增 CSP 策略。
- 未新增云同步、远程 API、npm 依赖、CDN 或构建流程。

## 5. 测试结果

- `node --check`：`sw.js`、`js/sw-register.js`、`js/imageStore.js`、`js/features/ledger.js`、`js/features/system-card.js`、`js/vendor/qrcode-generator.js`、`js/vendor/jsqr.js`、`js/app.js`、`js/storage.js`、`js/features/import-export.js`、`js/features/encrypted-backup.js`、`js/features/messages.js`、`js/imageMigration.js`、`js/imageHealth.js`、`js/integrity.js`、`js/render.js`、`js/features/fronting.js`、`js/features/polls.js`、`js/features/storage-health.js` 全部通过。
- `git diff --check`：通过。
- headless 验收：通过，覆盖 data URL、urlCache、Service Worker 响应路径、账本 cents、QR 拆分、封面模式 interval。
- 浏览器 / PWA 验收：通过，localhost 注册 Service Worker，app shell 缓存 38 项，离线刷新可打开；Cache Storage 未出现 JSON / `.moonenc.json` / CSV；无新增外部请求和控制台错误。
- QR 生成功能回归：通过，`qrcode` / `jsQR` 本地脚本加载成功，`drawQr()` 返回有效尺寸。
- 账本小数边界测试：通过，`0.1 + 0.2` 汇总为 `0.30`，预算边界不误判。
- 主 JSON / encrypted-json 隔离：浏览器验收确认主导出仍不包含 `ledgerRecords` / `ledgerSettings`。
- 账本 JSON v1/v2 / CSV：浏览器验收确认 v2 导出包含 settings，CSV 表头和结构未变；本轮未改账本导入结构。

## 6. 最终结论

P6-02 指定的 Bug 8-13 已完成最小修复，并通过语法、diff、headless 和浏览器 / PWA 回归。未新增依赖、联网请求、`type="module"` 或打包产物；可以进入 P6-03 跨平台测试安装包路线规划。
