package de.eigenraum.app;

import android.app.AlertDialog;
import android.text.InputType;
import android.widget.EditText;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * Capacitor-Plugin "NativeOpenAI" (Android).
 *
 * Der API-Key wird in einem nativen Dialog eingegeben, AES-GCM-
 * verschlüsselt gespeichert und nie an JavaScript zurückgegeben.
 * Es existiert bewusst keine getApiKey-Methode.
 */
@CapacitorPlugin(name = "NativeOpenAI")
public class NativeOpenAIPlugin extends Plugin {

    /** Muss mit DEFAULT_AI_MODEL in src/ai/prompt-builder.ts übereinstimmen. */
    private static final String DEFAULT_MODEL = "gpt-5.6-terra";

    private KeyStorage keyStorage;
    private OpenAIClient client;

    @Override
    public void load() {
        keyStorage = new KeyStorage(getContext());
        client = new OpenAIClient();
    }

    @PluginMethod
    public void hasApiKey(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", keyStorage.exists());
        call.resolve(result);
    }

    @PluginMethod
    public void promptForApiKey(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            EditText input = new EditText(getActivity());
            input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            input.setHint("API-Key");

            new AlertDialog.Builder(getActivity())
                    .setTitle("OpenAI-Zugang")
                    .setMessage("Der Schlüssel wird verschlüsselt auf diesem Gerät gespeichert.")
                    .setView(input)
                    .setNegativeButton("Abbrechen", (dialog, which) -> {
                        JSObject result = new JSObject();
                        result.put("saved", false);
                        result.put("validated", false);
                        call.resolve(result);
                    })
                    .setPositiveButton("Speichern", (dialog, which) -> {
                        String entered = input.getText().toString().trim();
                        if (entered.isEmpty()) {
                            JSObject result = new JSObject();
                            result.put("saved", false);
                            result.put("validated", false);
                            call.resolve(result);
                            return;
                        }
                        if (!keyStorage.save(entered)) {
                            call.reject("UNKNOWN", "UNKNOWN");
                            return;
                        }
                        testStoredKey((valid, modelAccess) -> {
                            JSObject result = new JSObject();
                            result.put("saved", true);
                            result.put("validated", valid);
                            call.resolve(result);
                        });
                    })
                    .setCancelable(false)
                    .show();
        });
    }

    @PluginMethod
    public void deleteApiKey(PluginCall call) {
        keyStorage.delete();
        call.resolve();
    }

    @PluginMethod
    public void testConnection(PluginCall call) {
        if (!keyStorage.exists()) {
            call.reject("API_KEY_MISSING", "API_KEY_MISSING");
            return;
        }
        testStoredKey((valid, modelAccess) -> {
            JSObject result = new JSObject();
            result.put("valid", valid);
            result.put("modelAccess", modelAccess);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void createResponse(PluginCall call) {
        String body = call.getString("body");
        if (body == null || body.isEmpty()) {
            call.reject("OPENAI_BAD_REQUEST", "OPENAI_BAD_REQUEST");
            return;
        }
        String apiKey = keyStorage.read();
        if (apiKey == null || apiKey.isEmpty()) {
            call.reject("API_KEY_MISSING", "API_KEY_MISSING");
            return;
        }

        client.createResponse(apiKey, body, new OpenAIClient.Callback() {
            @Override
            public void onSuccess(int status, String responseBody, String requestId) {
                JSObject result = new JSObject();
                result.put("status", status);
                result.put("body", responseBody);
                result.put("requestId", requestId);
                call.resolve(result);
            }

            @Override
            public void onError(String code) {
                call.reject(code, code);
            }
        });
    }

    private interface TestResult {
        void done(boolean valid, boolean modelAccess);
    }

    /** Minimaler Verbindungstest über den fest codierten Endpoint. */
    private void testStoredKey(TestResult onDone) {
        String apiKey = keyStorage.read();
        if (apiKey == null || apiKey.isEmpty()) {
            onDone.done(false, false);
            return;
        }
        try {
            JSONObject probe = new JSONObject();
            probe.put("model", DEFAULT_MODEL);
            probe.put("input", "ping");
            probe.put("store", false);
            probe.put("max_output_tokens", 16);

            client.createResponse(apiKey, probe.toString(), new OpenAIClient.Callback() {
                @Override
                public void onSuccess(int status, String body, String requestId) {
                    boolean valid = status != 401 && status != 403;
                    onDone.done(valid, status == 200);
                }

                @Override
                public void onError(String code) {
                    onDone.done(false, false);
                }
            });
        } catch (Exception e) {
            onDone.done(false, false);
        }
    }
}
