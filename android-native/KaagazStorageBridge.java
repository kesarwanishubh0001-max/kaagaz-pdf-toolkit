package com.kaagaz.pdftoolkit;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Native Android bridge exposed as `window.KaagazNative` inside the WebView.
 * Provides full device storage permission handling, recursive document scanning,
 * direct local file reading, saving outputs to Downloads/Kaagaz, and native Android printing.
 */
public class KaagazStorageBridge {

    public static final int REQUEST_CODE_STORAGE = 4102;
    private static final int MAX_SCAN_DEPTH = 6;
    private static final int MAX_SCAN_RESULTS = 600;
    private static final long MAX_READ_BYTES = 45L * 1024L * 1024L; // 45 MB safety limit for WebView Base64 bridge

    private static final Set<String> SUPPORTED_EXTENSIONS = new HashSet<>(Arrays.asList(
            "pdf",
            "doc", "docx", "rtf", "odt",
            "xls", "xlsx", "ods", "csv", "tsv",
            "ppt", "pptx", "odp",
            "txt", "md", "markdown", "log", "json", "xml", "yaml", "yml", "ini", "toml",
            "html", "htm", "css", "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "sh", "sql",
            "png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "ico", "avif",
            "zip", "epub"
    ));

    private final Activity activity;
    private final WebView webView;

    public KaagazStorageBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        }
        return ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.READ_EXTERNAL_STORAGE
        ) == PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface
    public void requestStoragePermission() {
        activity.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    if (Environment.isExternalStorageManager()) {
                        notifyPermissionUpdate();
                        return;
                    }
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                        intent.setData(Uri.parse("package:" + activity.getPackageName()));
                        activity.startActivity(intent);
                    } catch (Exception fallbackError) {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        activity.startActivity(intent);
                    }
                } else {
                    List<String> perms = new ArrayList<>();
                    perms.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                    perms.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                    ActivityCompat.requestPermissions(
                            activity,
                            perms.toArray(new String[0]),
                            REQUEST_CODE_STORAGE
                    );
                }
            } catch (Exception e) {
                Toast.makeText(activity, "Unable to open storage permission settings", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public String scanDeviceFiles() {
        JSONArray resultArray = new JSONArray();
        if (!hasStoragePermission()) {
            return resultArray.toString();
        }

        try {
            File rootDir = Environment.getExternalStorageDirectory();
            if (rootDir == null || !rootDir.exists() || !rootDir.canRead()) {
                return resultArray.toString();
            }

            List<File> collected = new ArrayList<>();
            scanDirectoryRecursive(rootDir, 0, collected);

            Collections.sort(collected, new Comparator<File>() {
                @Override
                public int compare(File a, File b) {
                    return Long.compare(b.lastModified(), a.lastModified());
                }
            });

            String rootCanonical = rootDir.getCanonicalPath();
            int limit = Math.min(collected.size(), MAX_SCAN_RESULTS);
            for (int i = 0; i < limit; i++) {
                File file = collected.get(i);
                String name = file.getName();
                String ext = getExtension(name);
                String parentPath = file.getParent() != null ? file.getParent() : "";
                String folderLabel = formatFolderLabel(parentPath, rootCanonical);

                JSONObject obj = new JSONObject();
                obj.put("id", "android-" + file.getAbsolutePath().hashCode() + "-" + file.lastModified());
                obj.put("name", name);
                obj.put("path", file.getAbsolutePath());
                obj.put("folder", folderLabel);
                obj.put("size", file.length());
                obj.put("lastModified", file.lastModified());
                obj.put("ext", ext);
                obj.put("extension", ext);
                resultArray.put(obj);
            }
        } catch (Exception ignored) {
        }

        return resultArray.toString();
    }

    private void scanDirectoryRecursive(File dir, int depth, List<File> out) {
        if (dir == null || depth > MAX_SCAN_DEPTH || out.size() >= MAX_SCAN_RESULTS * 2) {
            return;
        }
        String dirName = dir.getName();
        if (depth > 0) {
            if (dirName.startsWith(".")) return;
            String lower = dirName.toLowerCase(Locale.ROOT);
            if (lower.equals("android") || lower.equals("cache") || lower.equals("thumbnails") || lower.equals("lost.dir")) {
                return;
            }
        }

        File[] children = dir.listFiles();
        if (children == null) return;

        for (File child : children) {
            if (out.size() >= MAX_SCAN_RESULTS * 2) break;
            if (child.isDirectory()) {
                scanDirectoryRecursive(child, depth + 1, out);
            } else if (child.isFile() && child.canRead() && child.length() > 0) {
                String ext = getExtension(child.getName());
                if (SUPPORTED_EXTENSIONS.contains(ext)) {
                    out.add(child);
                }
            }
        }
    }

    @JavascriptInterface
    public String readFileBase64(String filePath) {
        if (filePath == null || filePath.trim().isEmpty() || !hasStoragePermission()) {
            return "";
        }
        try {
            File rootDir = Environment.getExternalStorageDirectory();
            File target = new File(filePath);
            if (!target.exists() || !target.isFile() || !target.canRead()) {
                return "";
            }
            String rootCanonical = rootDir.getCanonicalPath();
            String targetCanonical = target.getCanonicalPath();
            if (!targetCanonical.startsWith(rootCanonical)) {
                return "";
            }
            if (target.length() > MAX_READ_BYTES) {
                activity.runOnUiThread(() ->
                        Toast.makeText(activity, "File exceeds 45 MB viewer limit", Toast.LENGTH_SHORT).show()
                );
                return "";
            }

            try (FileInputStream fis = new FileInputStream(target);
                 ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[32768];
                int read;
                while ((read = fis.read(buffer)) != -1) {
                    baos.write(buffer, 0, read);
                }
                return Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            }
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public String saveFileToDownloads(String filename, String base64Data, String mimeType) {
        if (filename == null || base64Data == null || base64Data.isEmpty()) {
            return "";
        }
        try {
            String safeName = filename.replaceAll("[^a-zA-Z0-9._\\- ]", "_");
            if (safeName.isEmpty()) {
                safeName = "kaagaz-output.pdf";
            }
            String resolvedMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = activity.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                values.put(MediaStore.Downloads.MIME_TYPE, resolvedMime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Kaagaz");
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return "";
                try (OutputStream os = resolver.openOutputStream(uri)) {
                    if (os == null) return "";
                    os.write(bytes);
                    os.flush();
                }
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File kaagazDir = new File(downloadsDir, "Kaagaz");
                if (!kaagazDir.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    kaagazDir.mkdirs();
                }
                File outFile = new File(kaagazDir, safeName);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(bytes);
                    fos.flush();
                }
            }

            final String finalName = safeName;
            activity.runOnUiThread(() ->
                    Toast.makeText(activity, "Saved to Downloads/Kaagaz/" + finalName, Toast.LENGTH_LONG).show()
            );
            return "Downloads/Kaagaz/" + safeName;
        } catch (Exception e) {
            activity.runOnUiThread(() ->
                    Toast.makeText(activity, "Could not save file to Downloads", Toast.LENGTH_SHORT).show()
            );
            return "";
        }
    }

    @JavascriptInterface
    public void printCurrentPage(String jobName) {
        final String resolvedJobName = (jobName != null && !jobName.trim().isEmpty())
                ? "KAAGAZ - " + jobName.trim()
                : "KAAGAZ Document";

        activity.runOnUiThread(() -> {
            try {
                PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (printManager == null || webView == null) {
                    Toast.makeText(activity, "Print service unavailable on this device", Toast.LENGTH_SHORT).show();
                    return;
                }
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(resolvedJobName);
                PrintAttributes attributes = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build();
                printManager.print(resolvedJobName, adapter, attributes);
            } catch (Exception e) {
                Toast.makeText(activity, "Printing failed on this device", Toast.LENGTH_SHORT).show();
            }
        });
    }

    public void notifyPermissionUpdate() {
        if (webView == null) return;
        activity.runOnUiThread(() ->
                webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('kaagaz-permission-result'));",
                        null
                )
        );
    }

    private static String getExtension(String name) {
        int idx = name.lastIndexOf('.');
        if (idx < 0 || idx == name.length() - 1) return "";
        return name.substring(idx + 1).toLowerCase(Locale.ROOT);
    }

    private static String formatFolderLabel(String parentPath, String rootCanonical) {
        if (parentPath == null || parentPath.isEmpty()) return "Internal Storage";
        if (parentPath.equals(rootCanonical)) return "Internal Storage";
        if (parentPath.startsWith(rootCanonical + "/")) {
            return parentPath.substring(rootCanonical.length() + 1);
        }
        return parentPath;
    }
}
