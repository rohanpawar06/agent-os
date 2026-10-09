package com.agentos.security;

/** Request-scoped identity for tenant-aware storage and tool authorization. */
public final class TenantContext {
    private static final ThreadLocal<String> TENANT_ID = new ThreadLocal<>();

    private TenantContext() { }

    public static String tenantId() {
        String tenantId = TENANT_ID.get();
        return tenantId == null ? "local" : tenantId;
    }

    static void setTenantId(String tenantId) {
        TENANT_ID.set(tenantId);
    }

    static void clear() {
        TENANT_ID.remove();
    }
}
