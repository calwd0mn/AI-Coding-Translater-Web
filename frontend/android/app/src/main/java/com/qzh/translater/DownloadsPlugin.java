package com.qzh.translater;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "Downloads")
public class DownloadsPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType");
        String base64Data = call.getString("base64Data");

        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("Missing fileName");
            return;
        }

        if (mimeType == null || mimeType.trim().isEmpty()) {
            call.reject("Missing mimeType");
            return;
        }

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Missing base64Data");
            return;
        }

        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(
            MediaStore.MediaColumns.RELATIVE_PATH,
            Environment.DIRECTORY_DOWNLOADS
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        }

        Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        Uri uri = resolver.insert(collection, values);

        if (uri == null) {
            call.reject("Unable to create download entry");
            return;
        }

        try (OutputStream outputStream = resolver.openOutputStream(uri)) {
            if (outputStream == null) {
                call.reject("Unable to open download entry");
                return;
            }

            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            outputStream.write(bytes);
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            call.reject("Unable to save download", error);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues pendingValues = new ContentValues();
            pendingValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, pendingValues, null, null);
        }

        JSObject result = new JSObject();
        result.put("fileName", fileName);
        result.put("relativePath", fileName);
        call.resolve(result);
    }
}
