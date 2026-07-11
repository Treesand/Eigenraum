package de.eigenraum.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;

/**
 * JVM-Tests für den Android-OpenAIClient mit MockWebServer.
 * Ausführung: ./gradlew testDebugUnitTest (benötigt Android SDK).
 */
public class OpenAIClientTest {

    private MockWebServer server;
    private OpenAIClient client;

    @Before
    public void setUp() throws Exception {
        server = new MockWebServer();
        server.start();
        client = new OpenAIClient(server.url("/v1/responses"));
    }

    @After
    public void tearDown() throws Exception {
        server.shutdown();
    }

    private static final class Result {
        final AtomicInteger status = new AtomicInteger(-1);
        final AtomicReference<String> body = new AtomicReference<>();
        final AtomicReference<String> errorCode = new AtomicReference<>();
        final CountDownLatch latch = new CountDownLatch(1);

        OpenAIClient.Callback callback() {
            return new OpenAIClient.Callback() {
                @Override
                public void onSuccess(int s, String b, String requestId) {
                    status.set(s);
                    body.set(b);
                    latch.countDown();
                }

                @Override
                public void onError(String code) {
                    errorCode.set(code);
                    latch.countDown();
                }
            };
        }
    }

    @Test
    public void sendsAuthorizationHeaderAndBody() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"ok\":true}"));
        Result result = new Result();

        client.createResponse("sk-test", "{\"model\":\"x\"}", result.callback());
        assertTrue(result.latch.await(5, TimeUnit.SECONDS));

        assertEquals(200, result.status.get());
        RecordedRequest recorded = server.takeRequest();
        assertEquals("Bearer sk-test", recorded.getHeader("Authorization"));
        assertEquals("{\"model\":\"x\"}", recorded.getBody().readUtf8());
    }

    @Test
    public void passes401ThroughForJsMapping() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(401).setBody("{}"));
        Result result = new Result();

        client.createResponse("sk-bad", "{}", result.callback());
        assertTrue(result.latch.await(5, TimeUnit.SECONDS));
        assertEquals(401, result.status.get());
        assertNull(result.errorCode.get());
    }

    @Test
    public void passes429ThroughForJsMapping() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(429).setBody("{}"));
        Result result = new Result();

        client.createResponse("sk-test", "{}", result.callback());
        assertTrue(result.latch.await(5, TimeUnit.SECONDS));
        assertEquals(429, result.status.get());
    }

    @Test
    public void doesNotFollowRedirects() throws Exception {
        server.enqueue(new MockResponse()
                .setResponseCode(302)
                .addHeader("Location", "https://evil.example.com/steal"));
        Result result = new Result();

        client.createResponse("sk-test", "{}", result.callback());
        assertTrue(result.latch.await(5, TimeUnit.SECONDS));

        // Der Redirect-Status wird durchgereicht, kein zweiter Request folgt.
        assertEquals(302, result.status.get());
        assertEquals(1, server.getRequestCount());
    }

    @Test
    public void rejectsOversizedBody() throws Exception {
        StringBuilder oversized = new StringBuilder();
        for (int i = 0; i <= 64 * 1024; i += 1) {
            oversized.append("x");
        }
        Result result = new Result();

        client.createResponse("sk-test", oversized.toString(), result.callback());
        assertTrue(result.latch.await(5, TimeUnit.SECONDS));
        assertEquals("OPENAI_BAD_REQUEST", result.errorCode.get());
        assertEquals(0, server.getRequestCount());
    }
}
