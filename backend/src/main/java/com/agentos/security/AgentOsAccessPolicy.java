package com.agentos.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Validates cloud user keys and applies deny-by-default, per-tenant tool grants. */
@Component
public class AgentOsAccessPolicy {
    private static final Pattern TENANT_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");
    private static final Pattern SHA256_HEX = Pattern.compile("(?i)[a-f0-9]{64}");

    private final String mode;
    private final Map<String, String> tokenHashes;
    private final Map<String, Set<String>> grants;

    public AgentOsAccessPolicy(
            @Value("${agentos.auth.mode:local}") String mode,
            @Value("${agentos.auth.tenant-keys:}") String tenantKeysJson,
            @Value("${agentos.auth.tool-grants:}") String toolGrantsJson,
            ObjectMapper objectMapper) {
        this.mode = mode.trim().toLowerCase();
        if (!this.mode.equals("local") && !this.mode.equals("tenant")) {
            throw new IllegalStateException("AGENTOS_AUTH_MODE must be either local or tenant.");
        }
        this.tokenHashes = parseStringMap(tenantKeysJson, objectMapper, "tenant keys");
        Map<String, Set<String>> parsedGrants = new LinkedHashMap<>();
        try {
            if (toolGrantsJson != null && !toolGrantsJson.isBlank()) {
                Map<String, Object> values = objectMapper.readValue(toolGrantsJson, new TypeReference<Map<String, Object>>() { });
                for (Map.Entry<String, Object> entry : values.entrySet()) {
                    if (!TENANT_ID.matcher(entry.getKey()).matches() || !(entry.getValue() instanceof java.util.List<?> list)) {
                        throw new IllegalStateException("AGENTOS_TOOL_GRANTS must map tenant IDs to arrays of permission names.");
                    }
                    Set<String> tenantGrants = new LinkedHashSet<>();
                    for (Object rawGrant : list) {
                        if (!(rawGrant instanceof String grant) || grant.isBlank() || grant.contains("..")) {
                            throw new IllegalStateException("AGENTOS_TOOL_GRANTS contains an invalid permission name.");
                        }
                        tenantGrants.add(grant.trim().toLowerCase());
                    }
                    parsedGrants.put(entry.getKey(), Set.copyOf(tenantGrants));
                }
            }
        } catch (RuntimeException exception) {
            if (exception instanceof IllegalStateException stateException) throw stateException;
            throw new IllegalStateException("AGENTOS_TOOL_GRANTS must be valid JSON.", exception);
        }
        this.grants = Map.copyOf(parsedGrants);

        if (tenantMode()) {
            if (this.tokenHashes.isEmpty()) throw new IllegalStateException("Tenant mode requires AGENTOS_TENANT_KEYS.");
            if (this.tokenHashes.values().stream().anyMatch(hash -> !SHA256_HEX.matcher(hash).matches())) {
                throw new IllegalStateException("Tenant API keys must be configured as SHA-256 hashes.");
            }
            if (this.tokenHashes.keySet().stream().anyMatch(id -> !TENANT_ID.matcher(id).matches())) {
                throw new IllegalStateException("Tenant IDs may contain only letters, numbers, underscores, and hyphens.");
            }
            if (this.tokenHashes.values().stream().map(String::toLowerCase).distinct().count() != this.tokenHashes.size()) {
                throw new IllegalStateException("Each tenant must have a unique API key.");
            }
            if (!this.tokenHashes.keySet().containsAll(this.grants.keySet())) {
                throw new IllegalStateException("AGENTOS_TOOL_GRANTS cannot include a tenant without an API key.");
            }
        }
    }

    public boolean tenantMode() {
        return mode.equals("tenant");
    }

    public String mode() {
        return mode;
    }

    public String authenticate(String bearerToken) {
        if (!tenantMode() || bearerToken == null || bearerToken.isBlank()) return null;
        String candidateHash = sha256Hex(bearerToken);
        byte[] candidate = candidateHash.getBytes(StandardCharsets.US_ASCII);
        String matchedTenant = null;
        for (Map.Entry<String, String> entry : tokenHashes.entrySet()) {
            boolean matches = MessageDigest.isEqual(candidate, entry.getValue().toLowerCase().getBytes(StandardCharsets.US_ASCII));
            if (matches) matchedTenant = entry.getKey();
        }
        return matchedTenant;
    }

    public boolean isAllowed(String permission) {
        if (!tenantMode()) return true;
        String tenantId = TenantContext.tenantId();
        Set<String> tenantGrants = grants.getOrDefault(tenantId, Set.of());
        String normalized = permission.toLowerCase();
        if (tenantGrants.contains(normalized)) return true;
        int categorySeparator = normalized.indexOf('.');
        return categorySeparator > 0 && tenantGrants.contains(normalized.substring(0, categorySeparator) + ".*");
    }

    public void require(String permission) {
        if (!isAllowed(permission)) throw new ToolPermissionDeniedException(permission);
    }

    public Set<String> grantsFor(String tenantId) {
        return grants.getOrDefault(tenantId, Set.of());
    }

    private Map<String, String> parseStringMap(String json, ObjectMapper objectMapper, String label) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            Map<String, String> parsed = objectMapper.readValue(json, new TypeReference<Map<String, String>>() { });
            Map<String, String> normalized = new LinkedHashMap<>();
            parsed.forEach((tenant, hash) -> normalized.put(tenant, hash == null ? "" : hash.trim()));
            return Map.copyOf(normalized);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("AGENTOS_TENANT_KEYS must be valid JSON mapping tenant IDs to SHA-256 hashes.", exception);
        }
    }

    private static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }
}
