# iOS WKWebView 自签测试壳

这是 P6-06 的 iOS 本地测试壳。它使用 Swift、UIKit 和 WKWebView 加载仓库根目录的静态 Web app，不引入 Swift Package、CocoaPods、npm、CDN 或远程同步。

构建 simulator：

```sh
cd /Users/pareo/Documents/月之暗面/platforms/ios
chmod +x build-ios-test.sh
./build-ios-test.sh simulator
```

如果已经在 Xcode 中选择 Personal Team，并连接本人设备，可再尝试：

```sh
./build-ios-test.sh device
./build-ios-test.sh archive
./build-ios-test.sh export
```

定位：

- 这是 iOS 自签 / 本人设备测试壳，不是正式分发包。
- 没有 Apple Developer Program 时，不做 App Store、TestFlight 或正式 Ad Hoc 分发。
- 如果 IPA 受签名限制无法导出，需要在 Xcode 中选择 Personal Team 或提供合法签名环境后重试。
- 用户数据不会打进 app bundle、archive 或 IPA；运行后仍由 WKWebView 的本地存储保存。
