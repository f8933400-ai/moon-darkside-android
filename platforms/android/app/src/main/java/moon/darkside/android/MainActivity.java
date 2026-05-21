package moon.darkside.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public class MainActivity extends Activity {
    private static final String TAG = "MoonAndroid";
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/assets/www/index.html";
    private static final int FILE_CHOOSER_REQUEST = 4104;
    private static final int WRITE_STORAGE_REQUEST = 4105;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    private final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain(APP_HOST)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        setContentView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        configureWebView(webView);
        webView.loadUrl(START_URL);
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        view.addJavascriptInterface(new MoonDownloadBridge(), "MoonAndroidDownloads");
        view.setWebViewClient(new MoonWebViewClient());
        view.setWebChromeClient(new MoonWebChromeClient());
        view.setDownloadListener(downloadListener);
    }

    private final DownloadListener downloadListener = (url, userAgent, contentDisposition, mimeType, contentLength) -> {
        Log.w(TAG, "Download requested in Android test wrapper: " + url + " type=" + mimeType);
        String message = url != null && (url.startsWith("blob:") || url.startsWith("data:"))
                ? "保存失败：该下载未通过 Android 保存接口，请重试导出。"
                : "保存失败：Android 测试壳不允许外部下载。";
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    };

    private class MoonDownloadBridge {
        @JavascriptInterface
        public String saveBase64ToDownloads(String filename, String mimeType, String base64Data) {
            try {
                String payload = base64Data == null ? "" : base64Data.trim();
                if (payload.startsWith("data:")) {
                    int comma = payload.indexOf(',');
                    if (comma >= 0) payload = payload.substring(comma + 1);
                }
                byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
                return saveBytesToDownloads(filename, mimeType, bytes);
            } catch (Exception err) {
                Log.w(TAG, "saveBase64ToDownloads failed", err);
                return errorJson("无法解析导出文件内容：" + safeErrorMessage(err));
            }
        }

        @JavascriptInterface
        public String saveTextToDownloads(String filename, String mimeType, String text) {
            byte[] bytes = String.valueOf(text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
            return saveBytesToDownloads(filename, mimeType, bytes);
        }
    }

    private String saveBytesToDownloads(String filename, String mimeType, byte[] bytes) {
        String displayName = sanitizeDownloadFilename(filename);
        String cleanMime = normalizeMimeType(mimeType);
        try {
            String savedName;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                savedName = saveWithMediaStore(displayName, cleanMime, bytes);
            } else {
                savedName = saveWithLegacyDownloads(displayName, bytes);
            }
            String path = Environment.DIRECTORY_DOWNLOADS + "/" + savedName;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, "已保存到下载目录：" + savedName, Toast.LENGTH_LONG).show());
            return successJson(savedName, path);
        } catch (Exception err) {
            Log.w(TAG, "saveBytesToDownloads failed", err);
            return errorJson(safeErrorMessage(err));
        }
    }

    private String saveWithMediaStore(String displayName, String mimeType, byte[] bytes) throws Exception {
        ContentResolver resolver = getContentResolver();
        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        String uniqueName = uniqueMediaStoreName(resolver, collection, displayName);
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, uniqueName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri itemUri = resolver.insert(collection, values);
        if (itemUri == null) throw new IllegalStateException("系统下载目录不可写。");

        boolean ok = false;
        try (OutputStream out = resolver.openOutputStream(itemUri)) {
            if (out == null) throw new IllegalStateException("无法打开下载文件。");
            out.write(bytes == null ? new byte[0] : bytes);
            ok = true;
        } finally {
            if (!ok) resolver.delete(itemUri, null, null);
        }

        ContentValues done = new ContentValues();
        done.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(itemUri, done, null, null);
        return uniqueName;
    }

    private String saveWithLegacyDownloads(String displayName, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, WRITE_STORAGE_REQUEST));
            throw new SecurityException("需要存储权限才能保存到系统下载目录，请授权后重试导出。");
        }
        File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloads.exists() && !downloads.mkdirs()) throw new IllegalStateException("无法创建系统下载目录。");
        File target = uniqueLegacyFile(downloads, displayName);
        try (FileOutputStream out = new FileOutputStream(target)) {
            out.write(bytes == null ? new byte[0] : bytes);
        }
        return target.getName();
    }

    private String uniqueMediaStoreName(ContentResolver resolver, Uri collection, String displayName) {
        if (!downloadNameExists(resolver, collection, displayName)) return displayName;
        String[] parts = splitFilename(displayName);
        String stamp = String.valueOf(System.currentTimeMillis());
        String candidate = parts[0] + "-" + stamp + parts[1];
        int index = 2;
        while (downloadNameExists(resolver, collection, candidate)) {
            candidate = parts[0] + "-" + stamp + "-" + index + parts[1];
            index++;
        }
        return candidate;
    }

    private boolean downloadNameExists(ContentResolver resolver, Uri collection, String displayName) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
        String selection = MediaStore.MediaColumns.DISPLAY_NAME + "=? AND " + MediaStore.MediaColumns.RELATIVE_PATH + "=?";
        String[] args = new String[]{displayName, Environment.DIRECTORY_DOWNLOADS + "/"};
        try (Cursor cursor = resolver.query(collection, new String[]{MediaStore.MediaColumns._ID}, selection, args, null)) {
            return cursor != null && cursor.moveToFirst();
        } catch (Exception err) {
            Log.w(TAG, "downloadNameExists query failed", err);
            return false;
        }
    }

    private File uniqueLegacyFile(File dir, String displayName) {
        File candidate = new File(dir, displayName);
        if (!candidate.exists()) return candidate;
        String[] parts = splitFilename(displayName);
        int index = 2;
        do {
            candidate = new File(dir, parts[0] + "-" + index + parts[1]);
            index++;
        } while (candidate.exists());
        return candidate;
    }

    private String sanitizeDownloadFilename(String filename) {
        String clean = String.valueOf(filename == null ? "" : filename)
                .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", "_")
                .trim();
        clean = clean.replaceAll("^\\.+", "").trim();
        if (clean.isEmpty()) clean = "moon-export.txt";
        if (clean.length() > 160) {
            String[] parts = splitFilename(clean);
            int keep = Math.max(1, 160 - parts[1].length());
            clean = parts[0].substring(0, Math.min(parts[0].length(), keep)) + parts[1];
        }
        return clean;
    }

    private String normalizeMimeType(String mimeType) {
        String clean = String.valueOf(mimeType == null ? "" : mimeType).trim();
        int semi = clean.indexOf(';');
        if (semi > 0) clean = clean.substring(0, semi).trim();
        if (!clean.contains("/") || clean.startsWith("/") || clean.endsWith("/")) return "application/octet-stream";
        return clean;
    }

    private String[] splitFilename(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot > 0 && dot < filename.length() - 1) {
            return new String[]{filename.substring(0, dot), filename.substring(dot)};
        }
        return new String[]{filename, ""};
    }

    private String successJson(String filename, String path) {
        return "{\"ok\":true,\"filename\":\"" + jsonEscape(filename) + "\",\"path\":\"" + jsonEscape(path) + "\"}";
    }

    private String errorJson(String error) {
        return "{\"ok\":false,\"error\":\"" + jsonEscape(error == null || error.isEmpty() ? "未知错误" : error) + "\"}";
    }

    private String jsonEscape(String value) {
        return String.valueOf(value == null ? "" : value)
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private String safeErrorMessage(Exception err) {
        String message = err == null ? "" : err.getMessage();
        if (message == null || message.trim().isEmpty()) message = err == null ? "未知错误" : err.getClass().getSimpleName();
        return message;
    }

    private boolean isAllowedAppAsset(Uri uri) {
        return "https".equals(uri.getScheme()) && APP_HOST.equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    private boolean isInternalScheme(Uri uri) {
        String scheme = uri.getScheme();
        return "about".equals(scheme) || "blob".equals(scheme) || "data".equals(scheme) || "javascript".equals(scheme);
    }

    private WebResourceResponse blockedResponse() {
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                403,
                "Blocked",
                Collections.emptyMap(),
                new ByteArrayInputStream(new byte[0])
        );
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST) return;
        if (filePathCallback == null) return;
        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private class MoonWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
            if (response != null) return response;

            Uri uri = request.getUrl();
            if (isInternalScheme(uri)) return null;

            Log.w(TAG, "Blocked external resource request: " + uri);
            return blockedResponse();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isAllowedAppAsset(uri) || isInternalScheme(uri)) return false;
            Log.w(TAG, "Blocked external navigation: " + uri);
            Toast.makeText(MainActivity.this, "已阻止外部链接。", Toast.LENGTH_SHORT).show();
            return true;
        }
    }

    private class MoonWebChromeClient extends WebChromeClient {
        @Override
        public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
            Log.d(TAG, consoleMessage.messageLevel() + " " + consoleMessage.message() + " @" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber());
            return true;
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                    .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
            return true;
        }

        @Override
        public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
            final android.widget.EditText input = new android.widget.EditText(MainActivity.this);
            input.setSingleLine(false);
            input.setText(defaultValue == null ? "" : defaultValue);
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm(input.getText().toString()))
                    .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
            return true;
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
            }
            filePathCallback = callback;
            Intent intent = params.createIntent();
            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
            } catch (ActivityNotFoundException err) {
                Log.w(TAG, "No Android file chooser available.", err);
                filePathCallback.onReceiveValue(null);
                filePathCallback = null;
                return false;
            }
            return true;
        }
    }
}
