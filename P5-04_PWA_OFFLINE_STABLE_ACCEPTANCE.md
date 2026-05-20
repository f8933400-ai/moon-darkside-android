# P5-04 PWA 离线缓存与本地稳定包验收

## 1. 验收基线

- 当前分支：feature/p5-04-pwa-offline-stable-acceptance
- 基线 tag：p5-03-image-backup-restore-acceptance
- 基线 commit：c0c7efd
- 验收日期：2026-05-20
- 工作区初始状态：干净

## 2. 验收范围

本轮覆盖：

- Service Worker 注册。
- app shell 缓存范围。
- 缓存版本更新。
- 离线访问。
- manifest 与图标。
- PWA 安装基本条件。
- 不缓存用户数据。
- local stable 包文件完整性。
- P5-03 图片备份 / 恢复回归。
- P4 账本隔离回归。

## 3. 当前 PWA 模型

`js/sw-register.js` 只在以下环境尝试注册 Service Worker：

- `https:`
- `http:` + `localhost`
- `http:` + `127.0.0.1`
- `http:` + `[::1]`

`file://` 下不会注册 Service Worker，会安全跳过。因此直接双击 `index.html` 时应用仍可用，但 PWA 离线壳缓存不可用。

`sw.js` 只缓存静态 app shell：

- `./`
- `./index.html`
- `./styles.css`
- `./manifest.webmanifest`
- `./app_icon.png`
- `./app_icon_192.png`
- `./app_icon_512.png`
- `./favicon.ico`
- `index.html` 中所有普通 `<script src>` 引用的 `js/` 文件。

`sw.js` 的 fetch 边界：

- 只处理 `GET`。
- 只处理 `http:` / `https:`。
- 只处理同源请求。
- 只处理 `APP_SHELL_PATHS` 中的静态 app shell 路径。
- 不处理未知路径。
- 不处理跨源请求。
- 不处理用户导出的 `.json`、`.moonenc.json`、`.csv`。
- 不处理 `data:` / `blob:`。

Cache Storage 只用于静态 app shell。用户数据仍在当前浏览器的 `localStorage` 和 IndexedDB 中；图片 Blob 仍在 IndexedDB 中。PWA 缓存不是备份，也不会缓存、上传或打包用户导出的备份文件。

## 4. 本轮最小修复

本轮做了以下最小修复：

| 项目 | 修改文件 | 结果 |
|---|---|---|
| 更新缓存版本 | `sw.js` | `CACHE_NAME` 从 `moon-app-shell-v0.3.1` 更新为 `moon-app-shell-p5-04-v0.4.0` |
| 补齐安装图标 | `manifest.webmanifest`, `app_icon_192.png`, `app_icon_512.png` | manifest 继续保留 128 图标，并新增 192 / 512 本地图标 |
| 补齐 app shell 图标缓存 | `sw.js` | `APP_SHELL` 新增 192 / 512 图标 |
| 改善更新接管 | `sw.js` | install 后 `skipWaiting()`，activate 后 `clients.claim()` |

未改变：

- 未改成缓存所有请求。
- 未缓存用户备份、图片 Blob、IndexedDB 或 localStorage。
- 未修改主记录、账本、图片 hydrate / externalize 或导入导出语义。
- 未新增依赖、联网请求、CDN、构建步骤或 `type="module"`。

## 5. 验收矩阵

| 编号 | 场景 | 预期 | 实际结果 | 状态 | 备注 |
|---|---|---|---|---|---|
| A1 | `file://` 打开 | 不注册 Service Worker，页面可用 | 页面标题正常，无阻断错误；未添加 manifest link | pass | 浏览器限制，非 bug |
| A2 | localhost 打开 | 注册 Service Worker | `scope` 为 `http://127.0.0.1:4184/`，页面受控 | pass | headless Chrome 验收 |
| A3 | HTTPS 条件 | 允许 HTTPS 注册 | 注册条件包含 `protocol === "https:"` | pass | 静态代码确认 |
| B1 | index 脚本缓存 | 所有 script src 在 APP_SHELL | 28 个脚本全部覆盖 | pass | query 参数按 pathname 匹配 |
| B2 | 静态资源缓存 | 样式、manifest、图标、sw-register 都在 APP_SHELL | APP_SHELL 共 36 项，文件均存在 | pass | 不含用户备份文件 |
| B3 | 禁止项 | 不含 node_modules、备份 JSON、CSV、真实数据 | 未发现禁止项 | pass | 静态扫描确认 |
| C1 | 缓存版本 | P5-04 缓存名不再停留旧版 | `moon-app-shell-p5-04-v0.4.0` | pass | activate 会清旧 `moon-app-shell-*` |
| C2 | 更新接管 | 新 SW 可更快接管页面 | 已添加 `skipWaiting()` / `clients.claim()` | pass | 不清除用户数据 |
| D1 | 离线刷新 | app shell 可离线打开 | 离线 reload 后标题、样式、渲染函数和账本函数可用 | pass | 首次在线安装后验收 |
| E1 | 主 JSON 导出 | 不进入 Cache Storage | 导出前后 cache keys 未变化 | pass | 主 JSON 不含 ledger 字段 |
| E2 | encrypted-json 导出 | 不进入 Cache Storage | 导出前后 cache keys 未变化 | pass | 解密 payload 不含 ledger 字段 |
| E3 | 账本 JSON / CSV 导出 | 不进入 Cache Storage | MoonBridge 捕获导出文件，cache keys 未变化 | pass | 账本导出仍独立 |
| E4 | 图片 Blob / IndexedDB | 不进入 Cache Storage | Cache entries 仅 app shell 路径 | pass | 图片仍由 IndexedDB 管理 |
| F1 | fetch 边界 | 不处理用户备份 / 未知路径 | `.json` / `.moonenc.json` / `.csv` / unknown 均走网络 404，未缓存 | pass | 404 为预期边界测试 |
| F2 | blob URL | 不被 SW 截获 | blob fetch 返回原文 `hello` | pass | 未进入 Cache Storage |
| G1 | manifest | JSON 语法与 PWA 字段可用 | `display: "standalone"`，`start_url` / `scope` 合理 | pass | headless fetch 成功 |
| G2 | 图标 | 图标存在且尺寸充足 | 128 / 192 / 512 PNG 均可访问 | pass | 全部本地生成 |
| H1 | 主备份隔离 | 主 JSON / encrypted-json 不含账本 | `ledgerRecords` / `ledgerSettings` 均不存在 | pass | P4 隔离保持 |
| H2 | 图片链路回归 | P5-03 语义不受 PWA 改动影响 | 本轮未触碰图片导入导出代码 | pass | P5-03 验收结论保持 |
| H3 | 账本回归 | 账本 JSON / CSV 可导出 | 本地导出文件名生成正常 | pass | 未修改账本代码 |

## 6. 不缓存用户数据验证

| 数据类型 | 验收结果 | 说明 |
|---|---|---|
| 主 JSON | pass | 通过 `formatExportJsonAsync("all")` 生成，不触发 Cache Storage 新增项 |
| encrypted-json | pass | 通过本机 Web Crypto 生成 envelope，不触发 Cache Storage 新增项 |
| 账本 JSON | pass | 通过账本导出生成，不触发 Cache Storage 新增项 |
| CSV | pass | 通过账本 CSV 导出生成，不触发 Cache Storage 新增项 |
| 图片 Blob | pass | Cache Storage 仅有 app shell；图片 Blob 仍由 IndexedDB 管理 |
| IndexedDB | pass | Service Worker 不读取或缓存 IndexedDB 内容 |
| localStorage | pass | Service Worker 不读取或缓存 localStorage 内容 |

## 7. 本地 stable 包准备情况

当前 P5-04 不是最终 v0.4.0 封版。P5-05 将继续做 v0.4.0 local stable 封版验收。

P5-04 已确认：

- app shell 缓存清单完整。
- Service Worker 缓存版本已更新。
- 离线刷新可打开应用壳。
- manifest 和本地图标可访问。
- 用户数据不进入 Service Worker Cache Storage。
- 主记录备份、图片备份恢复语义和账本隔离语义未受影响。

P5-05 封版时仍需确认：

- stable 包不包含 `.git`。
- stable 包不包含临时文件、真实数据、node_modules 或构建产物。
- stable 包包含运行所需 HTML、CSS、JS、manifest、Service Worker 和图标。
- 文档、tag、stable 包命名保持一致。

## 8. 测试命令与结果

命令结果：

- `node --check sw.js`：pass
- `node --check js/sw-register.js`：pass
- `node --check js/storage.js`：pass
- `node --check js/features/ledger.js`：pass
- `node --check js/features/storage-health.js`：pass
- `node --check js/features/import-export.js`：pass
- `node --check js/app.js`：pass
- `node --check js/features/messages.js`：pass
- `node --check js/imageStore.js`：pass
- `node --check js/imageMigration.js`：pass
- `node --check js/imageHealth.js`：pass
- `node --check js/integrity.js`：pass
- `node --check js/render.js`：pass
- `git diff --check`：pass

浏览器 / headless 验收结果：

- 使用本地 HTTP 服务打开 `http://127.0.0.1:4184/index.html`。
- headless Chrome 确认 Service Worker 注册并控制页面。
- Cache Storage 只出现 `moon-app-shell-p5-04-v0.4.0`。
- APP_SHELL 共 36 项；index 中 28 个脚本全部覆盖。
- 离线刷新后页面标题、样式、渲染函数和账本函数可用。
- 导出主 JSON、encrypted-json、账本 JSON、CSV 后 cache keys 未变化。
- `.json` / `.moonenc.json` / `.csv` / unknown 路径边界请求未进入缓存。
- manifest 可访问，128 / 192 / 512 本地图标可访问。
- 未发现外部请求或新增 JS error。

本轮没有新增依赖、联网请求、CDN、构建步骤或 `type="module"`。

## 9. 已知风险

- `file://` 下不能注册 Service Worker，这是浏览器限制，非 bug。
- PWA 离线缓存只缓存静态 app shell，不替代完整 JSON / encrypted-json 备份。
- Service Worker 不缓存用户数据；清理浏览器站点数据仍会删除 localStorage / IndexedDB。
- 不同浏览器的安装提示条件可能不同；本轮已补齐 192 / 512 本地图标以降低安装提示风险。
- Service Worker 更新仍受浏览器生命周期影响；P5-04 已通过缓存版本、`skipWaiting()` 和 `clients.claim()` 降低旧缓存滞留风险。
- P5-05 仍需要最终 stable 包封版检查。

## 10. 最终结论

P5-04 PWA 离线缓存验收通过。

- 缓存版本已更新为 `moon-app-shell-p5-04-v0.4.0`。
- app shell 缓存范围确认正确。
- localhost 下 Service Worker 注册和离线刷新通过。
- `file://` 下安全跳过 Service Worker。
- 用户导出的 JSON、encrypted-json、账本 JSON、CSV、图片 Blob、IndexedDB 和 localStorage 不进入 Service Worker 缓存。
- manifest 和本地图标可用。
- 主 JSON / encrypted-json 仍不包含 `ledgerRecords` 或 `ledgerSettings`。
- 图片备份 / 恢复语义和账本隔离语义未受影响。

可以进入 P5-05 v0.4.0 local stable 封版验收。
