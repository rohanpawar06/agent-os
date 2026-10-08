package com.agentos.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class OllamaService {
    private final String baseUrl;
    private final String defaultModel;
    private final RestClient client;

    public OllamaService(
            @Value("${agentos.ollama-url:http://127.0.0.1:11434}") String baseUrl,
            @Value("${agentos.default-model:qwen2.5}") String defaultModel,
            @Value("${agentos.request-timeout-seconds:120}") long timeoutSeconds) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.defaultModel = defaultModel;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(5, timeoutSeconds)));
        this.client = RestClient.builder().baseUrl(this.baseUrl).requestFactory(factory).build();
    }

    public String baseUrl() {
        return baseUrl;
    }

    public String defaultModel() {
        return defaultModel;
    }

    public List<String> listModels() {
        try {
            Map<?, ?> response = client.get().uri("/api/tags").retrieve().body(Map.class);
            if (response == null || !(response.get("models") instanceof List<?> models)) return List.of();
            List<String> names = new ArrayList<>();
            for (Object item : models) {
                if (item instanceof Map<?, ?> model && model.get("name") instanceof String name && !name.isBlank()) names.add(name);
            }
            return names;
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    public String chatJson(String model, List<Map<String, String>> messages) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", model);
        request.put("messages", messages);
        request.put("stream", false);
        request.put("format", "json");
        request.put("options", Map.of("temperature", 0.2));
        try {
            Map<?, ?> response = client.post().uri("/api/chat").body(request).retrieve().body(Map.class);
            if (response == null || !(response.get("message") instanceof Map<?, ?> message)
                    || !(message.get("content") instanceof String content) || content.isBlank()) {
                throw new OllamaUnavailableException("Ollama returned an empty response. Check the model and try again.");
            }
            return content;
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private OllamaUnavailableException unavailable(Exception cause) {
        return new OllamaUnavailableException(
                "Cannot reach Ollama at " + baseUrl + ". Start Ollama and make sure " + defaultModel + " is installed.", cause);
    }

    public static class OllamaUnavailableException extends RuntimeException {
        public OllamaUnavailableException(String message) {
            super(message);
        }

        public OllamaUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
