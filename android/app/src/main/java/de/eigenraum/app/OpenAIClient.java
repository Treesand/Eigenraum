package de.eigenraum.app;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Einziger Ort der Android-App mit OpenAI-Host und Authorization-Header.
 * Kein Cache, keine Cookies, keine Redirects, keine TLS-Anpassungen.
 */
final class OpenAIClient {

    interface Callback {
        void onSuccess(int status, String body, String requestId);

        void onError(String code);
    }

    /** Fest codiert – JavaScript kann keine andere URL übergeben. */
    static final HttpUrl ENDPOINT = HttpUrl.get("https://api.openai.com/v1/responses");
    static final int MAX_BODY_BYTES = 64 * 1024;
    private static final MediaType JSON = MediaType.get("application/json");

    private final OkHttpClient client;
    private final HttpUrl endpoint;

    OpenAIClient() {
        this(ENDPOINT);
    }

    /** Paketprivat: nur Tests (MockWebServer) dürfen den Endpoint ersetzen. */
    OpenAIClient(HttpUrl endpoint) {
        this.endpoint = endpoint;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .followRedirects(false)
                .followSslRedirects(false)
                .cache(null)
                .build();
    }

    void createResponse(String apiKey, String body, Callback callback) {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BODY_BYTES) {
            callback.onError("OPENAI_BAD_REQUEST");
            return;
        }

        Request request = new Request.Builder()
                .url(endpoint)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .post(RequestBody.create(bytes, JSON))
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(okhttp3.Call call, IOException e) {
                if (e instanceof SocketTimeoutException || e instanceof InterruptedIOException) {
                    callback.onError("NETWORK_TIMEOUT");
                } else if (e instanceof UnknownHostException) {
                    callback.onError("NETWORK_OFFLINE");
                } else {
                    callback.onError("UNKNOWN");
                }
            }

            @Override
            public void onResponse(okhttp3.Call call, Response response) throws IOException {
                try (ResponseBody responseBody = response.body()) {
                    String text = responseBody != null ? responseBody.string() : "";
                    String requestId = response.header("x-request-id");
                    callback.onSuccess(response.code(), text, requestId);
                }
            }
        });
    }
}
