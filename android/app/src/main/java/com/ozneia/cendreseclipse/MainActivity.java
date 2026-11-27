package com.ozneia.cendreseclipse;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = WebViewAssetLoader.DEFAULT_DOMAIN;
    private static final String GAME_ORIGIN = "https://" + ASSET_HOST;
    private static final int IMPORT_SAVE_REQUEST = 1;
    private static final int EXPORT_SAVE_REQUEST = 2;
    private static final int MAX_SAVE_CHARS = 1_048_576;

    private WebView game;
    private ValueCallback<Uri[]> pendingImport;
    private String pendingExport;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);

        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(7, 6, 9));
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        // The document picker returns a content URI for the selected file.
        // Navigation and subresource requests still pass through the origin checks below.
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        game.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!isGameOrigin(url)) {
                    return emptyResponse(403, "Forbidden");
                }
                if (!"GET".equals(request.getMethod())) {
                    return emptyResponse(405, "Method Not Allowed");
                }
                if ("/sw.js".equals(url.getPath())) {
                    // APK updates replace these bundled assets. Never create a second cache for them.
                    return emptyResponse(404, "Not Found");
                }
                WebResourceResponse response = assets.shouldInterceptRequest(url);
                return response != null ? response : emptyResponse(404, "Not Found");
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (isGameOrigin(url)) {
                    return false;
                }
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(url.getScheme())) {
                    openExternalLink(url);
                }
                return true;
            }
        });
        game.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                return openSavePicker(callback);
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(
                    game, "cendresAndroidSave", Collections.singleton(GAME_ORIGIN),
                    (view, message, origin, isMainFrame, reply) -> {
                        if (isMainFrame && isGameOrigin(origin)
                                && message.getType() == WebMessageCompat.TYPE_STRING) {
                            exportSave(message.getData());
                        }
                    });
        }

        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(7, 6, 9));
        container.addView(game, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        if (Build.VERSION.SDK_INT >= 35) {
            container.setOnApplyWindowInsetsListener((view, insets) -> {
                var safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(container);
        game.setFocusableInTouchMode(true);
        game.requestFocus();
        game.loadUrl(GAME_ORIGIN + "/index.html");
        ReleaseUpdateChecker.check(this);
    }

    private static boolean isGameOrigin(Uri url) {
        return "https".equals(url.getScheme()) && ASSET_HOST.equals(url.getEncodedAuthority());
    }

    private static WebResourceResponse emptyResponse(int status, String reason) {
        return new WebResourceResponse(
                "text/plain", "UTF-8", status, reason, Collections.emptyMap(),
                new ByteArrayInputStream(new byte[0]));
    }

    private void openExternalLink(Uri url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, url).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, R.string.external_link_failed, Toast.LENGTH_LONG).show();
        }
    }

    private boolean openSavePicker(ValueCallback<Uri[]> callback) {
        if (pendingImport != null || pendingExport != null) {
            callback.onReceiveValue(null);
            return true;
        }
        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("*/*");
        pendingImport = callback;
        try {
            startActivityForResult(picker, IMPORT_SAVE_REQUEST);
        } catch (ActivityNotFoundException error) {
            pendingImport = null;
            callback.onReceiveValue(null);
            Toast.makeText(this, R.string.file_picker_failed, Toast.LENGTH_LONG).show();
        }
        return true;
    }

    private void exportSave(String json) {
        if (pendingImport != null || pendingExport != null || json == null
                || json.isEmpty() || json.length() > MAX_SAVE_CHARS) {
            Toast.makeText(this, R.string.save_export_failed, Toast.LENGTH_LONG).show();
            return;
        }
        Intent picker = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("application/json")
                .putExtra(Intent.EXTRA_TITLE, "cendres-eclipse-sauvegarde.json");
        pendingExport = json;
        try {
            startActivityForResult(picker, EXPORT_SAVE_REQUEST);
        } catch (ActivityNotFoundException error) {
            pendingExport = null;
            Toast.makeText(this, R.string.file_picker_failed, Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Uri selected = resultCode == RESULT_OK && data != null ? data.getData() : null;
        if (selected != null && !"content".equals(selected.getScheme())) {
            selected = null;
        }
        if (requestCode == IMPORT_SAVE_REQUEST && pendingImport != null) {
            ValueCallback<Uri[]> callback = pendingImport;
            pendingImport = null;
            callback.onReceiveValue(selected == null ? null : new Uri[] {selected});
        }
        if (requestCode == EXPORT_SAVE_REQUEST) {
            String json = pendingExport;
            pendingExport = null;
            if (selected != null && json != null) {
                Uri destination = selected;
                new Thread(() -> writeSave(destination, json), "save-export").start();
            }
        }
    }

    private void writeSave(Uri destination, String json) {
        try (OutputStream stream = getContentResolver().openOutputStream(destination, "wt")) {
            if (stream == null) {
                throw new IOException("No output stream");
            }
            stream.write(json.getBytes(StandardCharsets.UTF_8));
        } catch (IOException | SecurityException error) {
            runOnUiThread(() -> Toast.makeText(this, R.string.save_export_failed, Toast.LENGTH_LONG).show());
        }
    }

    @Override
    protected void onPause() {
        game.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        game.onResume();
    }

    @Override
    protected void onDestroy() {
        if (pendingImport != null) {
            pendingImport.onReceiveValue(null);
            pendingImport = null;
        }
        game.destroy();
        super.onDestroy();
    }
}
