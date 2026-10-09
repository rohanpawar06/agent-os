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
    private final String thinkingLevel;
    private final long contextTokens;
    private final double temperature;

    public OllamaService(
            @Value("${agentos.ollama-url:http://127.0.0.1:11434}") String baseUrl,
            @Value("${agentos.default-model:qwen2.5}") String defaultModel,
            @Value("${agentos.request-timeout-seconds:120}") long timeoutSeconds,
            @Value("${agentos.model-thinking:medium}") String thinkingLevel,
            @Value("${agentos.context-tokens:0}") long contextTokens,
            @Value("${agentos.temperature:0.3}") double temperature) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.defaultModel = defaultModel;
        this.thinkingLevel = thinkingLevel.trim().toLowerCase();
        this.contextTokens = contextTokens;
        this.temperature = temperature;
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
        request.put("options", options());
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

    /** Uses Ollama's native function calling instead of asking the model to hand-write action JSON. */
    public Map<String, Object> chatWithTools(String model, List<Map<String, String>> messages,
                                              List<Map<String, Object>> availableTools) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", model);
        request.put("messages", messages);
        request.put("stream", false);
        request.put("options", options());
        if (supportsThinking(model) && !thinkingLevel.isBlank() && !thinkingLevel.equals("off")) {
            request.put("think", thinkingLevel);
        }
        if (!availableTools.isEmpty()) {
            List<Map<String, Object>> ollamaTools = availableTools.stream().map(tool -> {
                Map<String, Object> function = new LinkedHashMap<>();
                function.put("name", tool.get("name"));
                function.put("description", tool.get("description"));
                function.put("parameters", tool.get("inputSchema"));
                return Map.<String, Object>of("type", "function", "function", function);
            }).toList();
            request.put("tools", ollamaTools);
        }
        try {
            Map<?, ?> response = client.post().uri("/api/chat").body(request).retrieve().body(Map.class);
            if (response == null || !(response.get("message") instanceof Map<?, ?> message)) {
                throw new OllamaUnavailableException("Ollama returned an empty response. Check the model and try again.");
            }
            List<Map<String, Object>> actions = parseToolCalls(message.get("tool_calls"));
            if (!actions.isEmpty()) return Map.of("intent", "task", "actions", actions);
            Object rawContent = message.get("content");
            if (!(rawContent instanceof String content) || content.isBlank()) {
                throw new OllamaUnavailableException("Ollama returned neither an answer nor a supported tool call.");
            }
            return Map.of("intent", "chat", "answer", content.trim());
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private Map<String, Object> options() {
        Map<String, Object> options = new LinkedHashMap<>();
        options.put("temperature", temperature);
        if (contextTokens > 0) options.put("num_ctx", contextTokens);
        return options;
    }

    private static boolean supportsThinking(String model) {
        String normalized = model.toLowerCase();
        return normalized.contains("qwen3") || normalized.contains("deepseek-r1");
    }

    private static List<Map<String, Object>> parseToolCalls(Object rawCalls) {
        if (!(rawCalls instanceof List<?> calls)) return List.of();
        List<Map<String, Object>> actions = new ArrayList<>();
        for (Object rawCall : calls) {
            if (!(rawCall instanceof Map<?, ?> call) || !(call.get("function") instanceof Map<?, ?> function)
                    || !(function.get("name") instanceof String name) || !(function.get("arguments") instanceof Map<?, ?> arguments)) {
                continue;
            }
            Map<String, Object> input = new LinkedHashMap<>();
            arguments.forEach((key, value) -> {
                if (key instanceof String text) input.put(text, value);
            });
            actions.add(Map.of("tool", name, "input", input));
            if (actions.size() >= 12) break;
        }
        return List.copyOf(actions);
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
