package com.agentos.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.agentos.security.AgentOsAccessPolicy;

/** Optional live search through Ollama's hosted web-search API. Disabled without a configured key. */
@Service
public class WebSearchService {
    private static final int MAX_QUERY_LENGTH = 500;
    private final String apiKey;
    private final RestClient client;
    private final AgentOsAccessPolicy accessPolicy;

    public WebSearchService(@Value("${agentos.web-search.api-key:}") String apiKey, AgentOsAccessPolicy accessPolicy) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.accessPolicy = accessPolicy;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(8));
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.client = RestClient.builder().baseUrl("https://ollama.com")
                .requestFactory(factory).build();
    }

    public boolean configured() {
        return !apiKey.isBlank();
    }

    public List<Map<String, Object>> allTools() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("query", Map.of("type", "string", "description", "The concise public-web question or search terms."));
        properties.put("max_results", Map.of("type", "integer", "description", "Number of results from 1 to 10; defaults to 5."));
        Map<String, Object> schema = Map.of("type", "object", "properties", properties, "required", List.of("query"));
        return List.of(Map.of("name", "search_web",
                "description", "Search public web pages for current information. Use for recent facts or when the user asks to search the web. Search terms are sent to the configured Ollama web-search provider.",
                "inputSchema", schema));
    }

    public FileSystemService.ToolOutput search(Map<String, Object> input) {
        if (!configured()) throw new IllegalStateException("Live web search is not configured. Set OLLAMA_API_KEY to enable it.");
        if (accessPolicy != null) accessPolicy.require("web.search_web");
        Object rawQuery = input.get("query");
        if (!(rawQuery instanceof String query) || query.isBlank()) {
            throw new IllegalArgumentException("Enter a web search query.");
        }
        query = query.trim();
        if (query.length() > MAX_QUERY_LENGTH) throw new IllegalArgumentException("Web search queries must be shorter than 500 characters.");
        int maxResults = 5;
        Object requestedCount = input.get("max_results");
        if (requestedCount instanceof Number count) maxResults = Math.max(1, Math.min(10, count.intValue()));

        try {
            Map<?, ?> response = client.post().uri("/api/web_search")
                    .header("Authorization", "Bearer " + apiKey)
                    .body(Map.of("query", query, "max_results", maxResults))
                    .retrieve().body(Map.class);
            List<Map<String, String>> results = normalizeResults(response == null ? null : response.get("results"));
            return new FileSystemService.ToolOutput(Map.of("query", query, "results", results), null);
        } catch (RestClientException exception) {
            throw new IllegalStateException("The configured web-search provider could not complete the request.", exception);
        }
    }

    private static List<Map<String, String>> normalizeResults(Object rawResults) {
        if (!(rawResults instanceof List<?> values)) return List.of();
        List<Map<String, String>> results = new ArrayList<>();
        for (Object value : values) {
            if (!(value instanceof Map<?, ?> item)) continue;
            String title = bounded(string(item.get("title")), 300);
            String url = safeUrl(string(item.get("url")));
            String content = bounded(string(item.get("content")), 3000);
            if (title.isBlank() || url.isBlank() || content.isBlank()) continue;
            results.add(Map.of("title", title, "url", url, "content", content));
            if (results.size() == 10) break;
        }
        return List.copyOf(results);
    }

    private static String safeUrl(String value) {
        if (value == null || value.length() > 2048) return "";
        try {
            java.net.URI uri = java.net.URI.create(value.trim());
            String scheme = uri.getScheme();
            if (uri.getHost() == null || uri.getUserInfo() != null || scheme == null
                    || !(scheme.toLowerCase(Locale.ROOT).equals("https") || scheme.toLowerCase(Locale.ROOT).equals("http"))) return "";
            return uri.toASCIIString();
        } catch (IllegalArgumentException exception) {
            return "";
        }
    }

    private static String bounded(String value, int maxLength) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength) + "…";
    }

    private static String string(Object value) {
        return value instanceof String text ? text : null;
    }
}
