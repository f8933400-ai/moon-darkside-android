# P6-01 锁屏 / integrity / 业务逻辑小坑修复

## 1. 修复基线

- 当前分支：`feature/p6-01-lock-integrity-logic-fixes`
- 基线 tag：`p6-00-prepackage-critical-data-fixes`
- 基线 commit：`92fa17b`
- 修复日期：2026-05-20
- 工作区初始状态：干净

## 2. 修复范围

- 锁屏密码改为 PBKDF2-SHA256 + 独立 salt。
- 旧 `lockHash` 兼容验证和成功解锁后的迁移。
- 禁止仅开启生物识别但没有本地锁屏密码的无效状态。
- `messageIntegrity` 改用真实 U+001F 分隔符，并兼容旧字面 `"\\u001f"` 算法。
- fronting 编辑历史 / 编辑已有记录时不误关其它 open 记录。
- 导入旧式 inline 图片备份后重置 `imageMigrationDone` 迁移标记。
- 导入主记录备份后立即结算已到期投票。

## 3. 每项修复说明

### 锁屏 PBKDF2 与定位文案

- 原风险：旧锁屏密码以无 salt SHA-256 保存到 `prefs.lockHash`，弱密码更容易被离线猜测；界面也容易让用户误以为锁屏等于数据加密。
- 修改文件：`js/app.js`、`index.html`、`USER_GUIDE.md`、`ARCHITECTURE.md`、`README.md`。
- 修复方式：新增 `lockKdf` 结构，使用 `PBKDF2-SHA256`、250000 次迭代和随机 salt；新设置密码不再只保存裸 `lockHash`；旧 `lockHash` 验证成功后尝试迁移；锁屏设置保存失败会恢复原偏好状态；锁屏界面和文档明确说明锁屏只是本地轻量隐私门帘，不是数据加密。
- 验收结果：headless 验证新密码生成 `lockKdf.alg / iterations / salt / hash`，正确密码可解锁，错误密码不可解锁，清除锁屏后 `lockKdf / lockHash / useBiometric` 被清除；旧 `lockHash` 可解锁并迁移。
- 剩余风险：锁屏仍不能抵御拥有设备、浏览器存储、开发者工具或文件系统访问权限的人；备份文件保护仍需使用 encrypted-json。

### 生物识别无密码状态

- 原风险：`useBiometric=true` 但没有锁屏密码时，锁屏不会显示，用户可能误以为已经开启指纹 / 面容锁。
- 修改文件：`js/app.js`、`index.html`、`USER_GUIDE.md`。
- 修复方式：保存锁屏设置时要求先存在 `lockKdf` 或旧 `lockHash`；无密码勾选生物识别会提示并关闭；启动锁屏时发现旧的无密码生物识别状态会自动清理。
- 验收结果：headless 验证无密码勾选生物识别会被阻止，已有密码时可以开启，旧无效偏好会被 `startLock()` 纠正。
- 剩余风险：本轮不引入新的 WebAuthn 大改；不同浏览器的系统生物识别可用性仍受环境限制。

### messageIntegrity 分隔符兼容

- 原风险：字段分隔符原先写成字面字符串 `"\\u001f"`，不是真实 U+001F。
- 修改文件：`js/integrity.js`、`ARCHITECTURE.md`、`README.md`、`BACKUP_GUIDE.md`。
- 修复方式：新增 `INTEGRITY_SEPARATOR = "\u001f"` 和 `LEGACY_INTEGRITY_SEPARATOR = "\\u001f"`；新生成 integrity 使用真实 U+001F；`integrityOk()` 同时接受新旧算法。
- 验收结果：headless 验证新旧算法结果不同但均可验证；篡改消息仍会失败；新建消息使用新算法。
- 剩余风险：不做全量历史重写，旧正常消息会保持旧 hash，直到被合法编辑或重算。

### fronting 历史编辑不误关

- 原风险：编辑已有记录且 `endAt === null` 时会调用 `closeOtherOpenFrontingLogs()`，可能把其它 open 记录关到过去时间。
- 修改文件：`js/features/fronting.js`。
- 修复方式：在保存表单时区分新增和编辑；只有“新增一条进行中记录”才关闭其它 open 记录，编辑已有记录不自动关其它 open 记录。
- 验收结果：headless 验证新建 open 记录仍会关闭其它 open 记录；编辑历史记录、编辑已有 open 记录不会影响其它 open 记录；保存失败 rollback 仍正常。
- 剩余风险：如果用户把已有历史记录编辑成 open，本轮不会自动关闭其它 open 记录，避免历史编辑产生隐式副作用。

### 导入旧图片备份迁移兜底

- 原风险：导入含 `imageData/avatarData/backgroundData` 的旧备份后，如果后续仍残留旧式图片字段，而 `imageMigrationDone` 仍为 `1`，下次启动可能跳过自动迁移。
- 修改文件：`js/features/import-export.js`、`BACKUP_GUIDE.md`、`ARCHITECTURE.md`、`README.md`。
- 修复方式：导入前检测 inline 图片字段；导入成功后清理 `imageMigrationDone / imageMigrationAt / imageMigrationVersion`，让下次启动重新检查实际数据。
- 验收结果：headless 验证含 inline 图片的主记录导入成功后迁移标记被清理；无 inline 图片的导入不会清理该标记。
- 剩余风险：如果浏览器 `localStorage.removeItem` 本身失败，只会 `console.warn`；主数据导入成功状态不因此回滚。

### 导入后立即 closeDuePolls

- 原风险：导入含已过期 open poll 的备份后，投票可能要等 60 秒定时器才关闭。
- 修改文件：`js/features/import-export.js`、`js/features/polls.js`、`BACKUP_GUIDE.md`、`ARCHITECTURE.md`、`README.md`。
- 修复方式：`closeDuePolls()` 支持 `{ saveChanges:false }`；主记录导入在最终 `save()` 前对导入后的 data 立即结算到期投票，一次保存完成导入和投票关闭。若结算失败，会恢复导入数据到结算前状态并继续导入。
- 验收结果：headless 验证导入已过期 open poll 后立即变为 closed，并写入系统消息；导入保存只发生一次；无过期 poll 行为不变。
- 剩余风险：closeDuePolls 内部如果未来新增非幂等副作用，需要继续保持导入路径的回滚边界。

## 4. 本轮未处理项

- Service Worker stale-while-revalidate。
- `dataUrlToBlob` charset。
- `urlCache` 生命周期。
- 账本金额整数化。
- `system-card.js` QR 库拆分 / eval 风格清理。
- 封面模式 `setInterval`。
- 更广泛普通保存路径 rollback 重构。
- Android APK / macOS DMG / iOS IPA 打包。

这些进入 P6-02 或后续阶段。

## 5. 测试结果

- `node --check`：指定 JS 文件全部通过。
- `git diff --check`：通过。
- headless 验收：通过；覆盖锁屏 PBKDF2、旧 `lockHash` 迁移、生物识别无密码阻止、integrity 新旧算法兼容、fronting 编辑副作用、导入旧图片备份迁移标记、导入过期 poll 立即关闭、主 JSON 不含账本字段、imageHealth。
- 浏览器验收：本地 HTTP 打开页面，应用可加载，控制台无新增 JS error。
- 旧锁屏迁移：通过。
- integrity 兼容：通过。
- 导入旧备份和过期 poll：通过。

## 6. 最终结论

P6-01 指定 Bug 5 / 6 / 7 / 14 / 15 / 16 已完成最小修复。跨平台打包继续暂停；可以进入 P6-02 低风险维护修复。
