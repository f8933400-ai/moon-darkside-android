# P6-04 Android WebView APK 测试包

## 1. 构建基线

- 当前分支：`feature/p6-04-android-apk-test-wrapper`
- 基线 tag：`p6-03-cross-platform-package-planning`
- 基线 commit：`1beaaf7`
- 构建日期：2026-05-20
- Java：Android Studio JBR OpenJDK 21.0.10
- Gradle：9.5.1
- Android SDK：`/Users/pareo/Library/Android/sdk`
- Android platforms：`android-36.1`
- Android build-tools：`36.0.0`、`36.1.0`、`37.0.0`
- 工作区初始状态：干净

## 2. 本轮目标

P6-04 新增 Android WebView 测试壳，用当前仓库里的本地静态 app shell 构建 debug APK。APK 只用于本机和小范围测试，不是正式发布包，不申请联网权限，不打包用户数据，不新增云同步，也不改变 Web app 的主记录、图片、账本、锁屏、备份或 integrity 语义。

本轮没有生成 macOS DMG 或 iOS IPA，没有新增 npm / CDN / `type="module"`，没有修改 `v0.4.0-local-stable` tag。

## 3. Android 工程结构

新增 Android 工程位于：

- `platforms/android/settings.gradle`
- `platforms/android/build.gradle`
- `platforms/android/gradle.properties`
- `platforms/android/.gitignore`
- `platforms/android/app/build.gradle`
- `platforms/android/app/src/main/AndroidManifest.xml`
- `platforms/android/app/src/main/java/moon/darkside/android/MainActivity.java`
- `platforms/android/app/src/main/res/`

Gradle 配置：

- Android Gradle Plugin：`9.2.0`
- `applicationId` / `namespace`：`moon.darkside.android`
- `compileSdk`：Android 36.1
- `targetSdk`：36
- `minSdk`：26
- AndroidX WebKit：`androidx.webkit:webkit:1.16.0`

Web app assets 同步方式：

- 使用 Gradle `syncMoonWebAssets` copy task。
- 构建时从仓库根目录复制运行必需静态资源到 `platforms/android/app/build/generated/moon-web-assets/www/`。
- Android assets sourceSet 指向 `platforms/android/app/build/generated/moon-web-assets/`。
- 复制范围包含 `index.html`、`styles.css`、`manifest.webmanifest`、`sw.js`、图标和 `js/**`。
- 排除 `.git/**`、`node_modules/**`、`platforms/**`、包产物、备份文件、`.DS_Store`、临时文件和文档。

`.gitignore` 已排除 Android 构建缓存、build 输出、local.properties、APK / AAB、DMG / IPA / xcarchive 和 `.DS_Store`。APK 输出到仓库外：

- `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`

## 4. WebView 加载模型

本轮使用 AndroidX `WebViewAssetLoader` 加载 APK 内 assets：

- 加载 URL：`https://appassets.androidplatform.net/assets/www/index.html`
- assets 映射：`/assets/` -> APK assets
- JavaScript：启用
- DOM storage：启用
- WebView database：启用，用于 IndexedDB 等本地存储能力
- 文件访问：`setAllowFileAccess(false)`
- content 访问：启用，用于 Android 文件选择器返回的 `content://` URI
- mixed content：禁止
- 外部导航：默认阻止并提示
- 外部资源请求：非 appassets / blob / data / about / javascript scheme 默认返回 403
- Android 返回键：WebView 可后退时后退，否则退出 Activity
- 文件选择：实现 `onShowFileChooser`，用于 JSON 导入和图片选择的运行态验收
- 下载：本轮只记录下载请求并提示，Blob 下载是否需要原生接管留到 P6-07 / P6-08 运行验收

AndroidManifest 未申请 `INTERNET`、相机、定位、通讯录、麦克风或存储权限，`usesCleartextTraffic=false`。Service Worker 未作为 Android wrapper 的核心依赖；本轮未修改 `js/sw-register.js`，WebView 中是否实际注册 Service Worker 需要设备运行时记录。

## 5. APK 构建结果

构建环境变量：

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

构建命令：

```sh
cd /Users/pareo/Documents/月之暗面/platforms/android
gradle :app:assembleDebug
```

构建结果：

- Gradle 构建：通过
- 原始 APK：`platforms/android/app/build/outputs/apk/debug/app-debug.apk`
- 输出 APK：`/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`
- APK 大小：1.7M / 1,750,189 bytes
- 签名：Android debug key，`CN=Android Debug`
- APK 未提交到 git

构建输出中存在 Java deprecated API 和 Gradle 10 兼容性提示，不影响本轮 debug APK 构建；后续若升级 Gradle 主版本再处理。

## 6. 验收矩阵

| 编号 | 场景 | 预期 | 实际结果 | 状态 | 备注 |
|---|---|---|---|---|---|
| A1 | APK 构建 | `assembleDebug` 成功 | 已生成 debug APK | 通过 | 输出到仓库外 |
| A2 | APK 内容边界 | 不含 `.git` / `node_modules` / 真实备份 / 包产物 | 内容检查未发现这些文件 | 通过 | grep 仅命中运行时 backup JS 和 Android backup rules |
| A3 | Manifest 权限 | 不申请 `INTERNET` 和敏感权限 | `aapt dump permissions` 仅显示 package | 通过 | 无 `uses-permission` |
| A4 | WebView 加载 app shell | 使用本地 appassets URL | 已实现 `WebViewAssetLoader` | 代码通过 | 设备未运行 |
| A5 | APK 安装 | 可安装到设备 / 模拟器 | 未执行 | 未测 | 当前无连接设备 / AVD |
| A6 | APK 打开 | WebView 显示首页 | 未执行 | 未测 | 需 P6-07 或人工设备验收 |
| A7 | localStorage | 重启后主记录仍在 | 未执行 | 未测 | 需设备运行验证 |
| A8 | IndexedDB | 图片等外置数据持久化 | 未执行 | 未测 | 需设备运行验证 |
| A9 | 主记录新增 | 新增记录可保存 | 未执行 | 未测 | 需设备运行验证 |
| A10 | 图片消息 | 选择图片、显示、重启后仍显示 | 未执行 | 未测 | `onShowFileChooser` 已实现 |
| A11 | 成员头像 | 选择头像、保存、恢复 | 未执行 | 未测 | 需设备运行验证 |
| A12 | 房间背景 | 选择背景、保存、恢复 | 未执行 | 未测 | 需设备运行验证 |
| A13 | 主 JSON 导出 / 导入 | 导出和导入可用 | 未执行 | 未测 | Blob 下载可能需 P6-07 适配 |
| A14 | encrypted-json 导出 / 导入 | 完整主记录加密备份可用 | 未执行 | 未测 | 不改变 encrypted-json 语义 |
| A15 | 账本首页 | 账本可打开和新增记录 | 未执行 | 未测 | 需设备运行验证 |
| A16 | 账本 JSON v1/v2 | 导入导出不影响主记录 | 未执行 | 未测 | Web app 语义未改 |
| A17 | CSV | 账本 CSV 导出尝试 | 未执行 | 未测 | Blob 下载可能需适配 |
| A18 | 锁屏 | 设置密码并解锁 | 未执行 | 未测 | Web app 语义未改 |
| A19 | QR 功能 | 本地 vendor QR 可用 | 未执行 | 未测 | APK assets 包含 `js/vendor/**` |
| A20 | 无外部请求 | 不联网、不新增同步 | 静态边界通过 | 代码通过 | 运行态仍需 logcat 验收 |
| A21 | 不包含用户数据 | APK 不打包 localStorage / IndexedDB / 真实备份 | 内容检查通过 | 通过 | 用户数据只在 WebView 运行时产生 |

## 7. 已知限制

- debug APK 使用 SDK debug key 签名，不是正式发布包。
- 当前没有连接 Android 设备或模拟器，未进行安装、打开和 WebView 运行态验收。
- Android WebView 的 Blob 下载、文件导出和分享行为可能不同于桌面浏览器；本轮 `DownloadListener` 只记录下载请求并提示，不接管保存。
- `onShowFileChooser` 已实现，但 JSON 导入、图片消息、头像和背景选择仍需设备验证。
- Service Worker 在 Android WebView 中是否注册、是否产生无害 console warning，需要设备运行时记录；APK 加载不依赖 Service Worker。
- 外部导航和外部资源请求已在 WebViewClient 层阻断，但无外部请求仍需结合 logcat / 代理做 P6-07 运行验收。

## 8. 测试命令与结果

Web app 语法检查：

- `node --check sw.js`：通过
- `node --check js/sw-register.js`：通过
- `node --check js/storage.js`：通过
- `node --check js/features/ledger.js`：通过
- `node --check js/features/storage-health.js`：通过
- `node --check js/features/import-export.js`：通过
- `node --check js/features/encrypted-backup.js`：通过
- `node --check js/app.js`：通过
- `node --check js/features/messages.js`：通过
- `node --check js/imageStore.js`：通过
- `node --check js/imageMigration.js`：通过
- `node --check js/imageHealth.js`：通过
- `node --check js/integrity.js`：通过
- `node --check js/render.js`：通过
- `node --check js/features/system-card.js`：通过
- `node --check js/vendor/qrcode-generator.js`：通过

Android 构建：

- `gradle :app:assembleDebug`：通过
- APK 内容检查：未发现 `.git`、`node_modules`、`.DS_Store`、`.moonenc`、`.zip`、`.dmg`、`.ipa` 或真实备份数据
- 权限检查：未申请 `INTERNET` 或敏感权限
- debug 签名检查：通过

Git 检查：

- `git diff --check`：通过
- APK、Gradle cache 和 build 输出未进入 git 工作区可提交范围

运行验收：

- `adb devices`：无连接设备
- `emulator -list-avds`：无可用 AVD
- APK 安装 / 打开 / localStorage / IndexedDB / 图片 / 备份 / 账本 / 锁屏 / QR：本轮未进行设备运行验收，需要后续接设备或模拟器执行

依赖与联网：

- Android 平台壳新增 Gradle / Android Gradle Plugin / AndroidX WebKit 构建依赖。
- Web app 运行时没有新增 npm、CDN、远程 API 或 `type="module"`。
- AndroidManifest 未申请 `INTERNET` 权限。

## 9. 最终结论

P6-04 已创建 Android WebView debug APK 测试壳，并成功生成仓库外 APK：

- `/Users/pareo/Documents/月之暗面-v0.4.1-android-test.apk`

Android 工程使用 `WebViewAssetLoader` 以 HTTPS 风格 appassets URL 加载 APK 内静态资源，不复制用户数据，不申请联网权限，不改变 Web app 核心业务语义。APK 内容边界、权限、构建和语法检查通过。

由于当前没有 Android 设备或模拟器，本轮没有声称安装和运行态功能通过。P6-07 必须补充 Android 设备验收，重点覆盖 localStorage、IndexedDB、文件导入导出、Blob 下载、图片恢复、账本、锁屏、QR、Service Worker 行为和无外部请求。

在保留上述运行态风险的前提下，可以进入 P6-05 macOS DMG 测试壳。
