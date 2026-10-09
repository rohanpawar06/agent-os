package com.agentos.service;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import com.agentos.security.AgentOsAccessPolicy;
import com.agentos.security.TenantContext;

/** Executes only administrator-configured API operations for the authenticated tenant. */
@Service
public class ApiIntegrationService {
    private static final Pattern IDENTIFIER = Pattern.compile("[a-zA-Z0-9_-]{1,64}");
    private static final Pattern QUERY_PARAMETER = Pattern.compile("[A-Za-z0-9_$.-]{1,128}");
    private static final Pattern SAFE_PATH = Pattern.compile("[A-Za-z0-9._~/-]{1,256}");
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE");
    private static final Set<String> BLOCKED_HEADERS = Set.of("host", "content-length", "connection", "transfer-encoding",
            "upgrade", "proxy-authorization", "proxy-authenticate", "te", "trailer");
    private static final int MAX_REQUEST_BODY_BYTES = 32 * 1024;
    private static final int MAX_RESPONSE_BODY_BYTES = 64 * 1024;

    private final Map<String, Map<String, ApiConnector>> connectorsByTenant;
    private final ObjectMapper objectMapper;
    private final AgentOsAccessPolicy accessPolicy;

    public ApiIntegrationService(@Value("${agentos.api-connectors:}") String connectorJson,
                                 ObjectMapper objectMapper, AgentOsAccessPolicy accessPolicy) {
        this.objectMapper = objectMapper;
        this.accessPolicy = accessPolicy;
        this.connectorsByTenant = parseConnectors(connectorJson, objectMapper);
    }

    public boolean configuredForCurrentTenant() {
        return !connectorsForCurrentTenant().isEmpty();
    }

    public List<Map<String, Object>> allTools() {
        Map<String, ApiConnector> tenantConnectors = connectorsForCurrentTenant();
        if (tenantConnectors.isEmpty()) return List.of();

        List<String> serviceNames = tenantConnectors.keySet().stream().sorted().toList();
        List<String> operationNames = tenantConnectors.values().stream()
                .flatMap(connector -> connector.operations().keySet().stream())
                .distinct().sorted().toList();
        String operationHelp = tenantConnectors.entrySet().stream()
                .flatMap(entry -> entry.getValue().operations().entrySet().stream()
                        .map(operation -> entry.getKey() + "." + operation.getKey() + ": " + operation.getValue().description()))
                .reduce("Configured operations: ", (left, right) -> left + "\n- " + right);

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("service", Map.of("type", "string", "enum", serviceNames,
                "description", "Choose one of the current user's administrator-configured services."));
        properties.put("operation", Map.of("type", "string", "enum", operationNames,
                "description", operationHelp));
        properties.put("query", Map.of("type", "object", "description", "Query parameters explicitly allowed for the selected operation."));
        properties.put("body", Map.of("type", "object", "description", "Optional JSON object for operations configured to accept a request body."));
        Map<String, Object> schema = Map.of("type", "object", "properties", properties, "required", List.of("service", "operation"));
        return List.of(Map.of("name", "call_approved_api",
                "description", "Call an administrator-approved HTTPS API operation for the authenticated user. The service, method, path, headers, and allowed query parameter names are fixed by server configuration; arbitrary URLs are not accepted.",
                "inputSchema", schema));
    }

    public FileSystemService.ToolOutput call(Map<String, Object> input) throws IOException {
        if (accessPolicy != null) accessPolicy.require("integrations.call_approved_api");
        String serviceName = requiredText(input.get("service"), "Choose a configured API service.");
        String operationName = requiredText(input.get("operation"), "Choose a configured API operation.");
        ApiConnector connector = connectorsForCurrentTenant().get(serviceName);
        if (connector == null) throw new IllegalArgumentException("That API service is not configured for this account.");
        ApiOperation operation = connector.operations().get(operationName);
        if (operation == null) throw new IllegalArgumentException("That API operation is not configured for this account.");

        Map<String, Object> query = objectMap(input.get("query"), "Query parameters must be an object.");
        URI uri = buildUri(connector.baseUri(), operation, query);
        String bodyJson = serializeBody(input.get("body"), operation);
        RestClient.RequestBodySpec request = connector.client().method(HttpMethod.valueOf(operation.method())).uri(uri)
                .headers(headers -> {
                    connector.headers().forEach(headers::set);
                    headers.setAccept(List.of(MediaType.APPLICATION_JSON));
                    if (bodyJson != null) headers.setContentType(MediaType.APPLICATION_JSON);
                });
        if (bodyJson != null) request.body(bodyJson);

        try {
            Map<String, Object> result = request.exchange((clientRequest, response) -> {
                int status = response.getStatusCode().value();
                if (status >= 300 && status < 400) {
                    throw new IllegalStateException("Redirects are disabled for approved API connectors. Configure the final HTTPS endpoint.");
                }
                if (status < 200 || status >= 300) {
                    throw new IllegalStateException("The approved API returned HTTP " + status + ".");
                }
                byte[] bytes = response.getBody().readNBytes(MAX_RESPONSE_BODY_BYTES + 1);
                if (bytes.length > MAX_RESPONSE_BODY_BYTES) {
                    throw new IllegalStateException("The approved API response exceeded the 64 KB limit.");
                }
                String text = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                Object responseBody = parseResponse(text);
                Map<String, Object> output = new LinkedHashMap<>();
                output.put("service", serviceName);
                output.put("operation", operationName);
                output.put("status", status);
                output.put("result", responseBody);
                return output;
            });
            return new FileSystemService.ToolOutput(result, null);
        } catch (RestClientException exception) {
            throw new IllegalStateException("The configured API request could not be completed.", exception);
        }
    }

    private URI buildUri(URI baseUri, ApiOperation operation, Map<String, Object> query) {
        if (!operation.queryParameters().containsAll(query.keySet())) {
            throw new IllegalArgumentException("The query includes a parameter not allowed for this API operation.");
        }
        UriComponentsBuilder builder = UriComponentsBuilder.fromUri(baseUri).path(operation.path());
        for (Map.Entry<String, Object> entry : query.entrySet()) {
            Object value = entry.getValue();
            if (!(value instanceof String || value instanceof Number || value instanceof Boolean)) {
                throw new IllegalArgumentException("Query parameter values must be text, numbers, or booleans.");
            }
            String text = String.valueOf(value);
            if (text.length() > 2_000) throw new IllegalArgumentException("Query parameter values must be shorter than 2,000 characters.");
            builder.queryParam(entry.getKey(), text);
        }
        return builder.encode().build().toUri();
    }

    private String serializeBody(Object body, ApiOperation operation) throws IOException {
        if (body == null) return null;
        if (!operation.bodyAllowed()) throw new IllegalArgumentException("This API operation does not accept a request body.");
        if (!(body instanceof Map<?, ?> || body instanceof List<?>)) {
            throw new IllegalArgumentException("API request bodies must be JSON objects or arrays.");
        }
        byte[] bytes = objectMapper.writeValueAsBytes(body);
        if (bytes.length > MAX_REQUEST_BODY_BYTES) throw new IllegalArgumentException("API request bodies are limited to 32 KB.");
        return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
    }

    private Object parseResponse(String body) throws IOException {
        if (body.isBlank()) return "";
        try {
            return objectMapper.readValue(body, Object.class);
        } catch (RuntimeException exception) {
            return body;
        }
    }

    private static Map<String, Object> objectMap(Object value, String message) {
        if (value == null) return Map.of();
        if (!(value instanceof Map<?, ?> raw)) throw new IllegalArgumentException(message);
        Map<String, Object> copy = new LinkedHashMap<>();
        raw.forEach((key, item) -> {
            if (!(key instanceof String name) || !QUERY_PARAMETER.matcher(name).matches()) {
                throw new IllegalArgumentException("Query parameter names contain unsupported characters.");
            }
            if (item == null) throw new IllegalArgumentException("Query parameter values cannot be null.");
            copy.put(name, item);
        });
        if (copy.size() > 30) throw new IllegalArgumentException("An API request can include at most 30 query parameters.");
        return Map.copyOf(copy);
    }

    private static String requiredText(Object value, String message) {
        if (!(value instanceof String text) || text.isBlank()) throw new IllegalArgumentException(message);
        return text.trim();
    }

    private Map<String, ApiConnector> connectorsForCurrentTenant() {
        return connectorsByTenant.getOrDefault(TenantContext.tenantId(), Map.of());
    }

    private static Map<String, Map<String, ApiConnector>> parseConnectors(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            Map<String, Object> tenantValues = mapper.readValue(json, new TypeReference<Map<String, Object>>() { });
            Map<String, Map<String, ApiConnector>> result = new LinkedHashMap<>();
            for (Map.Entry<String, Object> tenantEntry : tenantValues.entrySet()) {
                if (!IDENTIFIER.matcher(tenantEntry.getKey()).matches() || !(tenantEntry.getValue() instanceof Map<?, ?> services)) {
                    throw new IllegalStateException("AGENTOS_API_CONNECTORS must map tenant IDs to service objects.");
                }
                Map<String, ApiConnector> tenantConnectors = new LinkedHashMap<>();
                for (Map.Entry<?, ?> serviceEntry : services.entrySet()) {
                    if (!(serviceEntry.getKey() instanceof String serviceName) || !IDENTIFIER.matcher(serviceName).matches()
                            || !(serviceEntry.getValue() instanceof Map<?, ?> rawConfig)) {
                        throw new IllegalStateException("AGENTOS_API_CONNECTORS contains an invalid service configuration.");
                    }
                    tenantConnectors.put(serviceName, parseConnector(stringMap(rawConfig)));
                }
                result.put(tenantEntry.getKey(), Map.copyOf(tenantConnectors));
            }
            return Map.copyOf(result);
        } catch (RuntimeException exception) {
            if (exception instanceof IllegalStateException stateException) throw stateException;
            throw new IllegalStateException("AGENTOS_API_CONNECTORS must be valid JSON with HTTPS service configuration.", exception);
        }
    }

    private static ApiConnector parseConnector(Map<String, Object> config) {
        String baseUrl = requiredText(config.get("baseUrl"), "Each API service must define baseUrl.");
        URI baseUri;
        try {
            baseUri = URI.create(baseUrl);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("API service baseUrl must be a valid HTTPS URL.", exception);
        }
        if (!"https".equalsIgnoreCase(baseUri.getScheme()) || baseUri.getHost() == null || baseUri.getUserInfo() != null
                || baseUri.getQuery() != null || baseUri.getFragment() != null) {
            throw new IllegalStateException("API service baseUrl must use HTTPS and cannot contain credentials, query parameters, or fragments.");
        }
        String basePath = baseUri.getRawPath();
        if (basePath != null && (basePath.contains("%") || List.of(basePath.split("/")).contains("..")
                || List.of(basePath.split("/")).contains("."))) {
            throw new IllegalStateException("API service baseUrl cannot contain encoded or traversal path segments.");
        }
        rejectPrivateHost(baseUri.getHost());
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        baseUri = URI.create(normalizedBase);

        Map<String, String> headers = parseHeaders(config.get("headers"));
        if (!(config.get("operations") instanceof Map<?, ?> rawOperations) || rawOperations.isEmpty()) {
            throw new IllegalStateException("Each API service must define at least one operation.");
        }
        Map<String, ApiOperation> operations = new LinkedHashMap<>();
        rawOperations.forEach((rawName, rawOperation) -> {
            if (!(rawName instanceof String name) || !IDENTIFIER.matcher(name).matches() || !(rawOperation instanceof Map<?, ?> raw)) {
                throw new IllegalStateException("API service operation names and configurations are invalid.");
            }
            Map<String, Object> operationConfig = stringMap(raw);
            String method = requiredText(operationConfig.get("method"), "Each API operation must define method.").toUpperCase(Locale.ROOT);
            if (!METHODS.contains(method)) throw new IllegalStateException("API operation method must be GET, POST, PUT, PATCH, or DELETE.");
            String path = requiredText(operationConfig.get("path"), "Each API operation must define a relative path.");
            if (path.startsWith("/") || path.contains("..") || path.contains("\\") || path.contains("%")
                    || List.of(path.split("/")).contains(".")
                    || !SAFE_PATH.matcher(path).matches()) {
                throw new IllegalStateException("API operation paths must be safe relative paths without traversal or encoding.");
            }
            String description = operationConfig.get("description") instanceof String value ? value.trim() : name;
            if (description.length() > 300) throw new IllegalStateException("API operation descriptions must be shorter than 300 characters.");
            Set<String> queryParams = parseQueryParameters(operationConfig.get("queryParams"));
            boolean bodyAllowed = Boolean.TRUE.equals(operationConfig.get("bodyAllowed"));
            operations.put(name, new ApiOperation(method, path, description, queryParams, bodyAllowed));
        });

        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        RestClient client = RestClient.builder().requestFactory(requestFactory).build();
        return new ApiConnector(baseUri, headers, Map.copyOf(operations), client);
    }

    private static Map<String, String> parseHeaders(Object value) {
        if (value == null) return Map.of();
        if (!(value instanceof Map<?, ?> raw)) throw new IllegalStateException("API service headers must be an object of fixed header names and values.");
        Map<String, String> headers = new LinkedHashMap<>();
        raw.forEach((rawName, rawValue) -> {
            if (!(rawName instanceof String name) || !(rawValue instanceof String text) || name.isBlank()
                    || BLOCKED_HEADERS.contains(name.toLowerCase(Locale.ROOT)) || text.contains("\r") || text.contains("\n")) {
                throw new IllegalStateException("API service contains an invalid or blocked HTTP header.");
            }
            headers.put(name, text);
        });
        return Map.copyOf(headers);
    }

    private static Set<String> parseQueryParameters(Object value) {
        if (value == null) return Set.of();
        if (!(value instanceof List<?> names)) throw new IllegalStateException("API operation queryParams must be an array of names.");
        Set<String> result = new LinkedHashSet<>();
        for (Object rawName : names) {
            if (!(rawName instanceof String name) || !QUERY_PARAMETER.matcher(name).matches()) {
                throw new IllegalStateException("API operation query parameter names contain unsupported characters.");
            }
            result.add(name);
        }
        if (result.size() > 30) throw new IllegalStateException("API operations can allow at most 30 query parameter names.");
        return Set.copyOf(result);
    }

    private static void rejectPrivateHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        if (normalized.equals("localhost") || normalized.endsWith(".localhost") || normalized.endsWith(".local")
                || normalized.endsWith(".internal") || normalized.endsWith(".test")) {
            throw new IllegalStateException("API service hosts must be public HTTPS hosts.");
        }
        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (isNonPublicAddress(address)) throw new IllegalStateException("API service hosts cannot resolve to local or private IP addresses.");
            }
        } catch (UnknownHostException exception) {
            throw new IllegalStateException("API service host could not be resolved during startup.", exception);
        }
    }

    private static boolean isNonPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) return true;
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = Byte.toUnsignedInt(bytes[0]);
            int second = Byte.toUnsignedInt(bytes[1]);
            return first == 0 || first >= 224 || (first == 100 && second >= 64 && second <= 127)
                    || (first == 192 && (second == 0 || second == 168))
                    || (first == 198 && (second == 18 || second == 19 || second == 51))
                    || (first == 203 && second == 0);
        }
        return bytes.length == 16 && ((Byte.toUnsignedInt(bytes[0]) & 0xfe) == 0xfc
                || (Byte.toUnsignedInt(bytes[0]) == 0x20 && Byte.toUnsignedInt(bytes[1]) == 0x01
                && Byte.toUnsignedInt(bytes[2]) == 0x0d && Byte.toUnsignedInt(bytes[3]) == 0xb8));
    }

    private static Map<String, Object> stringMap(Map<?, ?> raw) {
        Map<String, Object> result = new LinkedHashMap<>();
        raw.forEach((key, value) -> {
            if (!(key instanceof String name)) throw new IllegalStateException("API connector configuration keys must be strings.");
            result.put(name, value);
        });
        return result;
    }

    private record ApiConnector(URI baseUri, Map<String, String> headers, Map<String, ApiOperation> operations, RestClient client) { }
    private record ApiOperation(String method, String path, String description, Set<String> queryParameters, boolean bodyAllowed) { }
}
