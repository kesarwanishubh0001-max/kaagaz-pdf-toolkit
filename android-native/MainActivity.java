package com.kaagaz.pdftoolkit;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.NonNull;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private KaagazStorageBridge storageBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setAllowFileAccess(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            storageBridge = new KaagazStorageBridge(this, webView);
            webView.addJavascriptInterface(storageBridge, "KaagazNative");
        }

        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (storageBridge != null) {
            storageBridge.notifyPermissionUpdate();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == KaagazStorageBridge.REQUEST_CODE_STORAGE && storageBridge != null) {
            storageBridge.notifyPermissionUpdate();
        }
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Uri dataUri = intent.getData();
        if (!Intent.ACTION_VIEW.equals(action) || dataUri == null) {
            return;
        }

        new Thread(() -> {
            try {
                String fileName = resolveDisplayName(dataUri);
                String mimeType = getContentResolver().getType(dataUri);
                if (mimeType == null) mimeType = "application/octet-stream";

                try (InputStream is = getContentResolver().openInputStream(dataUri);
                     ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                    if (is == null) return;
                    byte[] buffer = new byte[32768];
                    int read;
                    int total = 0;
                    int maxBytes = 40 * 1024 * 1024;
                    while ((read = is.read(buffer)) != -1) {
                        total += read;
                        if (total > maxBytes) return;
                        baos.write(buffer, 0, read);
                    }
                    String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                    JSONObject payload = new JSONObject();
                    payload.put("name", fileName);
                    payload.put("mimeType", mimeType);
                    payload.put("base64", base64);

                    final String jsPayload = payload.toString();
                    runOnUiThread(() -> {
                        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                        if (webView != null) {
                            webView.postDelayed(() -> webView.evaluateJavascript(
                                    "window.__KAAGAZ_INCOMING_FILE__ = " + jsPayload + ";" +
                                    "window.dispatchEvent(new CustomEvent('kaagaz-incoming-file', { detail: window.__KAAGAZ_INCOMING_FILE__ }));",
                                    null
                            ), 700);
                        }
                    });
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    private String resolveDisplayName(Uri uri) {
        String result = "document";
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        String queried = cursor.getString(nameIndex);
                        if (queried != null && !queried.trim().isEmpty()) {
                            return queried;
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        String path = uri.getPath();
        if (path != null) {
            int cut = path.lastIndexOf('/');
            if (cut != -1 && cut + 1 < path.length()) {
                result = path.substring(cut + 1);
            }
        }
        return result;
    }
}
