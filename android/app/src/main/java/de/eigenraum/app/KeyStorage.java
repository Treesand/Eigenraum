package de.eigenraum.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Speichert den OpenAI-API-Key AES-GCM-verschlüsselt in privaten
 * SharedPreferences. Der AES-Schlüssel liegt nicht exportierbar im
 * Android Keystore; der Klartext-Key wird nie persistiert.
 */
final class KeyStorage {

    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "eigenraum_openai_storage_key";
    private static final String PREFS = "eigenraum_secure";
    private static final String PREF_CIPHERTEXT = "openai_key_ciphertext";
    private static final String PREF_IV = "openai_key_iv";
    private static final String PREF_VERSION = "openai_key_format_version";
    private static final int FORMAT_VERSION = 1;
    private static final int GCM_TAG_BITS = 128;

    private final SharedPreferences preferences;

    KeyStorage(Context context) {
        this.preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
        keyStore.load(null);

        KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
        if (entry instanceof KeyStore.SecretKeyEntry) {
            return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        }

        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    boolean save(String apiKey) {
        try {
            SecretKey secretKey = getOrCreateSecretKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] iv = cipher.getIV();
            byte[] ciphertext = cipher.doFinal(apiKey.getBytes("UTF-8"));

            preferences.edit()
                    .putString(PREF_CIPHERTEXT, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
                    .putString(PREF_IV, Base64.encodeToString(iv, Base64.NO_WRAP))
                    .putInt(PREF_VERSION, FORMAT_VERSION)
                    .apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    boolean exists() {
        return preferences.contains(PREF_CIPHERTEXT) && preferences.contains(PREF_IV);
    }

    /**
     * Nur für den nativen HTTP-Client – der Klartext verlässt die
     * native Schicht nicht in Richtung JavaScript.
     */
    String read() {
        try {
            String storedCiphertext = preferences.getString(PREF_CIPHERTEXT, null);
            String storedIv = preferences.getString(PREF_IV, null);
            if (storedCiphertext == null || storedIv == null) {
                return null;
            }
            SecretKey secretKey = getOrCreateSecretKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey,
                    new GCMParameterSpec(GCM_TAG_BITS, Base64.decode(storedIv, Base64.NO_WRAP)));
            byte[] plain = cipher.doFinal(Base64.decode(storedCiphertext, Base64.NO_WRAP));
            return new String(plain, "UTF-8");
        } catch (Exception e) {
            return null;
        }
    }

    void delete() {
        preferences.edit()
                .remove(PREF_CIPHERTEXT)
                .remove(PREF_IV)
                .remove(PREF_VERSION)
                .apply();
    }
}
