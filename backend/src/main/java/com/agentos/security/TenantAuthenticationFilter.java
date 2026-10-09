package com.agentos.security;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class TenantAuthenticationFilter extends OncePerRequestFilter {
    private static final int REQUESTS_PER_MINUTE = 120;
    private final AgentOsAccessPolicy accessPolicy;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, RateBucket> rateBuckets = new ConcurrentHashMap<>();

    public TenantAuthenticationFilter(AgentOsAccessPolicy accessPolicy, ObjectMapper objectMapper) {
        this.accessPolicy = accessPolicy;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(request.getContextPath() + "/api/")
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String tenantId = "local";
        if (accessPolicy.tenantMode()) {
            String authorization = request.getHeader("Authorization");
            String token = authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)
                    ? authorization.substring(7).trim() : null;
            tenantId = accessPolicy.authenticate(token);
            if (tenantId == null) {
                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "A valid AgentOS API key is required.");
                return;
            }
            if (isRateLimited(tenantId)) {
                response.setHeader("Retry-After", "60");
                writeError(response, HttpStatus.TOO_MANY_REQUESTS.value(), "This account has reached the request limit. Try again in a minute.");
                return;
            }
        }

        TenantContext.setTenantId(tenantId);
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private boolean isRateLimited(String tenantId) {
        long currentMinute = Instant.now().getEpochSecond() / 60;
        RateBucket bucket = rateBuckets.compute(tenantId, (id, existing) ->
                existing == null || existing.minute() != currentMinute ? new RateBucket(currentMinute, new AtomicInteger()) : existing);
        return bucket.count().incrementAndGet() > REQUESTS_PER_MINUTE;
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), java.util.Map.of("success", false, "error", message));
    }

    private record RateBucket(long minute, AtomicInteger count) { }
}
