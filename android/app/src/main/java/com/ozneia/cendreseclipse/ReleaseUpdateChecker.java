package com.ozneia.cendreseclipse;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.net.ssl.HttpsURLConnection;

final class ReleaseUpdateChecker {
    private static final String REPOSITORY = "Ozne-IA/cendres-eclipse";
    private static final String RECENT_RELEASES = "https://api.github.com/repos/" + REPOSITORY + "/releases?per_page=20";
    private static final String DOWNLOAD_BASE = "https://github.com/" + REPOSITORY + "/releases/download/";
    private static final String APK_NAME = "Cendres-Eclipse-Android.apk";
    private static final int MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
    private static final int TIMEOUT_MS = 5000;
    private static final String VERSION_NUMBER = "(0|[1-9][0-9]*)";
    private static final Pattern VERSION = Pattern.compile(VERSION_NUMBER + "\\." + VERSION_NUMBER + "\\." + VERSION_NUMBER);

    private ReleaseUpdateChecker() {
    }

    static void check(Activity activity) {
        new Thread(() -> {
            try {
                String installedVersion = activity.getPackageManager()
                        .getPackageInfo(activity.getPackageName(), 0).versionName;
                JSONArray releases = fetchRecentReleases();
                if (releases == null) return;

                String tag = findUpdateTag(releases, installedVersion);
                if (tag == null) return;
                activity.runOnUiThread(() -> showUpdate(activity, versionFromTag(tag), downloadUrl(tag)));
            } catch (IOException | JSONException | PackageManager.NameNotFoundException ignored) {
                // The release check is optional when GitHub cannot be reached.
            }
        }, "cendres-release-check").start();
    }

    private static JSONArray fetchRecentReleases() throws IOException, JSONException {
        HttpsURLConnection connection = (HttpsURLConnection) URI.create(RECENT_RELEASES).toURL().openConnection();
        connection.setConnectTimeout(TIMEOUT_MS);
        connection.setReadTimeout(TIMEOUT_MS);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("User-Agent", "cendres-eclipse-android");
        try {
            if (connection.getResponseCode() != HttpsURLConnection.HTTP_OK) return null;

            try (InputStream input = connection.getInputStream()) {
                ByteArrayOutputStream body = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) != -1) {
                    if (body.size() + bytesRead > MAX_RESPONSE_BYTES) return null;
                    body.write(buffer, 0, bytesRead);
                }
                return new JSONArray(new String(body.toByteArray(), StandardCharsets.UTF_8));
            }
        } finally {
            connection.disconnect();
        }
    }

    static String findUpdateTag(JSONArray releases, String installedVersion) {
        if (installedVersion == null) return null;
        Matcher newest = VERSION.matcher(installedVersion);
        if (!newest.matches()) return null;

        String updateTag = null;
        for (int index = 0; index < releases.length(); index++) {
            JSONObject release = releases.optJSONObject(index);
            if (release == null || release.optBoolean("draft") || release.optBoolean("prerelease")) continue;

            String tag = release.optString("tag_name");
            Matcher candidate = VERSION.matcher(versionFromTag(tag));
            if (candidate.matches() && compareVersions(candidate, newest) > 0
                    && hasApk(release.optJSONArray("assets"), downloadUrl(tag))) {
                newest = candidate;
                updateTag = tag;
            }
        }
        return updateTag;
    }

    private static String versionFromTag(String tag) {
        return tag.startsWith("v") ? tag.substring(1) : tag;
    }

    private static String downloadUrl(String tag) {
        return DOWNLOAD_BASE + tag + "/" + APK_NAME;
    }

    private static boolean hasApk(JSONArray assets, String downloadUrl) {
        if (assets == null) return false;
        for (int index = 0; index < assets.length(); index++) {
            JSONObject asset = assets.optJSONObject(index);
            if (asset != null && APK_NAME.equals(asset.optString("name"))
                    && "uploaded".equals(asset.optString("state")) && asset.optLong("size") > 0
                    && downloadUrl.equals(asset.optString("browser_download_url"))) {
                return true;
            }
        }
        return false;
    }

    private static int compareVersions(Matcher latest, Matcher installed) {
        for (int part = 1; part <= 3; part++) {
            String latestNumber = latest.group(part);
            String installedNumber = installed.group(part);
            int byLength = Integer.compare(latestNumber.length(), installedNumber.length());
            if (byLength != 0) return byLength;

            int byDigit = latestNumber.compareTo(installedNumber);
            if (byDigit != 0) return byDigit;
        }
        return 0;
    }

    private static void showUpdate(Activity activity, String version, String downloadUrl) {
        if (activity.isFinishing() || activity.isDestroyed()) return;

        new AlertDialog.Builder(activity)
                .setTitle("Mise à jour disponible")
                .setMessage("La version " + version + " de Cendres de l’Éclipse est disponible. "
                        + "Télécharge l’APK, puis ouvre-le pour lancer l’installation Android.")
                .setNegativeButton("Plus tard", null)
                .setPositiveButton("Télécharger l’APK", (dialog, which) -> {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
                    try {
                        activity.startActivity(intent);
                    } catch (ActivityNotFoundException ignored) {
                        Toast.makeText(activity, "Aucune application ne peut ouvrir le lien de téléchargement.", Toast.LENGTH_LONG).show();
                    }
                })
                .show();
    }
}
