package com.agentos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.agentos.security.AgentOsAccessPolicy;

/** Prevents accidentally exposing the unauthenticated local profile on a network interface. */
@Component
public class CloudModeGuard {
    public CloudModeGuard(AgentOsAccessPolicy accessPolicy,
                          @Value("${server.address:127.0.0.1}") String serverAddress) {
        String address = serverAddress.trim().toLowerCase();
        if (!accessPolicy.tenantMode() && !("127.0.0.1".equals(address) || "localhost".equals(address) || "::1".equals(address))) {
            throw new IllegalStateException("Local AgentOS mode may only bind to loopback. Use AGENTOS_AUTH_MODE=tenant before exposing the server.");
        }
    }
}
