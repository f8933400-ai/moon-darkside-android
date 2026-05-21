# P7-02 Android 导出保存到 Downloads 修复

## 问题描述

Android APK 灰度测试中，用户执行导出后只看到提示：

“Android 测试壳暂未接管下载，请在 P6-07 验收导出行为。”

实际没有得到导出文件，系统“文件 / 下载 / Download”中也无法确认新文件。

## 原因

Android 测试壳原先只注册了 `DownloadListener`，但监听到下载时只弹 Toast，没有真正写入文件。Web 端导出使用 Blob + `URL.createObjectURL()` + `a.download`，Android WebView 触发 `blob:` 下载时原生层拿不到 Blob 内容，因此不能只靠 `DownloadListener` 保存文件。

## 修复方式

- 新增 Android JS bridge：`window.MoonAndroidDownloads`。
- 原生接口：
  - `saveBase64ToDownloads(filename, mimeType, base64Data)`
  - `saveTextToDownloads(filename, mimeType, text)`
- Web 端新增普通脚本 `js/downloads.js`，统一提供：
  - `downloadTextFile`
  - `downloadBlobFile`
  - `downloadDataUrlFile`
- Android APK 内检测到 `MoonAndroidDownloads` 后，Web 端会把 Blob / data URL 转交给原生保存接口，不再触发旧的 `a.download` 下载占位流程。
- Android 10+ 使用 `MediaStore.Downloads` 写入系统公共 Downloads 目录，并设置 `Environment.DIRECTORY_DOWNLOADS` 作为 `RELATIVE_PATH`。
- 写入时使用 `IS_PENDING=1`，完成后清除 pending；失败时删除 pending / partial 记录。
- 文件名在原生层 sanitize，移除路径分隔符、Windows 保留字符和控制字符，空文件名回退为 `moon-export.txt`。
- Android 9 及以下保留公共 Downloads 目录写入路径，并新增 `WRITE_EXTERNAL_STORAGE`，限定 `android:maxSdkVersion="28"`。
- `DownloadListener` 不再显示“暂未接管下载”，如果仍被触发，会明确提示“保存失败，未生成文件”类文案。

## 覆盖文件类型

- 主 JSON 导出：`.json`，`application/json`
- encrypted-json 导出：`.moonenc.json`，`application/json`
- 复盘 Markdown / TXT：`.md` / `.txt`
- 账本 JSON 导出：`.json`，`application/json`
- 账本 CSV 导出：`.csv`，`text/csv`
- 系统名片 PNG：`.png`，`image/png`

## 测试结果

- `node --check` 已通过指定 Web 文件和本轮新增 / 修改 JS。
- `git diff --check` 已通过。
- Android Gradle `:app:assembleDebug` 构建通过。
- 已重新生成 APK：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：1.7M（1,783,038 bytes）
- APK 精确内容检查未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg` 或 `.ipa`。
- 当前本机没有连接 Android 设备，`adb devices` 为空。
- 当前本机没有可用 Android AVD，`emulator -list-avds` 为空。

## 已知限制

- 本轮没有设备 / AVD，Downloads 实机保存尚未在本机完成，需继续灰度设备安装后确认。
- WebView 到原生桥接会把导出 Blob 转为 base64，特别大的完整备份可能有额外内存压力，需要后续设备压力测试。
- Android 9 及以下需要用户授予存储权限后重试导出；Android 10+ 不需要 `WRITE_EXTERNAL_STORAGE`。
- 本轮未改主 data schema、localStorage key、IndexedDB schema、主 JSON / encrypted-json 内容语义、账本 JSON / CSV 语义、账本隔离、图片 hydrate / externalize 或 `messageIntegrity`。

## 灰度验收清单

- 主 JSON：导出后提示 `已保存到系统下载目录：Download/xxx.json`，文件在系统 Downloads 可见。
- encrypted-json：导出后提示 `Download/xxx.moonenc.json`，文件在系统 Downloads 可见，仍为完整主记录范围且不包含账本 records/settings。
- 账本 JSON：导出后提示 `Download/moon-ledger-backup-xxx.json`，文件包含 records + settings。
- CSV：导出后提示 `Download/moon-ledger-xxx.csv`，文件为账本 records CSV。
- 普通聊天页：输入、发送、图片选择、时间线和高级搜索开关不应误弹下载提示。
