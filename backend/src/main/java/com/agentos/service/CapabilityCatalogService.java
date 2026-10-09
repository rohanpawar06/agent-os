package com.agentos.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.agentos.security.AgentOsAccessPolicy;

@Service
public class CapabilityCatalogService {
    private final ToolDispatchService tools;
    private final FileSystemService fileSystem;
    private final AgentOsAccessPolicy accessPolicy;

    public CapabilityCatalogService(ToolDispatchService tools, FileSystemService fileSystem, AgentOsAccessPolicy accessPolicy) {
        this.tools = tools;
        this.fileSystem = fileSystem;
        this.accessPolicy = accessPolicy;
    }

    public List<Map<String, Object>> list() {
        Map<String, List<Map<String, Object>>> implemented = new LinkedHashMap<>();
        for (Map<String, Object> tool : tools.allImplementedTools()) {
            implemented.computeIfAbsent(String.valueOf(tool.get("capability")), ignored -> new ArrayList<>()).add(tool);
        }
        List<Map<String, Object>> catalog = new ArrayList<>();
        catalog.add(implemented("filesystem", "Files & folders", "List, read, write, search, copy, move, and delete within your assigned workspace.", "Workspace root is isolated per account. Desktop access is available only in local mode.", implemented));
        catalog.add(implemented("documents", "Documents", "Create and edit plain text and Markdown files in your workspace.", "Supports .txt, .md, and .markdown files.", implemented));
        catalog.add(implemented("spreadsheets", "Spreadsheets", "Create, read, append, and filter CSV spreadsheets.", "CSV only; large reads are bounded to a safe preview.", implemented));
        Map<String, Object> webSearch = new LinkedHashMap<>(implemented("web", "Web search",
                "Search public web pages for current information and cite the returned sources.",
                "Set OLLAMA_API_KEY and grant web.search_web to each account that may use live search. Queries are sent to Ollama's hosted search API.", implemented));
        if (!tools.webSearchConfigured()) webSearch.put("status", "requires_configuration");
        catalog.add(Map.copyOf(webSearch));
        catalog.add(connector("browser", "Browser control", "Operate a browser running on a user's own computer.", "Requires a paired local AgentOS companion; the cloud server cannot reach a user's laptop.",
                List.of("open_browser_page", "capture_browser_page", "click_browser_element")));
        catalog.add(connector("terminal", "Terminal", "Run approved commands on a user's own computer.", "Requires a local companion and explicit command allowlist; arbitrary shell execution is not exposed by the cloud server.",
                List.of("run_approved_command", "read_command_output")));
        catalog.add(connector("databases", "Databases", "Inspect and query a database connection.", "Requires a per-user database connector and least-privilege database credentials.",
                List.of("inspect_database", "query_database")));
        catalog.add(connector("email", "Email", "Search mail, create drafts, and send messages.", "Requires a per-user OAuth connection and send permission.",
                List.of("search_email", "create_email_draft", "send_email")));
        catalog.add(connector("calendar", "Calendar", "Read and manage calendar events.", "Requires a per-user calendar OAuth connection.",
                List.of("list_calendar_events", "create_calendar_event", "update_calendar_event")));
        catalog.add(connector("integrations", "API integrations", "Connect to an approved external service.", "Requires a configured host allowlist and per-user credentials; arbitrary URLs are blocked to prevent SSRF.",
                List.of("call_approved_api", "read_api_result")));
        return List.copyOf(catalog);
    }

    public Map<String, Object> security() {
        return Map.of("mode", accessPolicy.mode(), "tenantId", accessPolicy.tenantMode() ? com.agentos.security.TenantContext.tenantId() : "local",
                "workspaceIsolation", accessPolicy.tenantMode(), "desktopAccess", !accessPolicy.tenantMode(),
                "rateLimitPerMinute", accessPolicy.tenantMode() ? 120 : 0);
    }

    private Map<String, Object> implemented(String id, String name, String description, String configuration,
                                             Map<String, List<Map<String, Object>>> groups) {
        List<Map<String, Object>> groupTools = groups.getOrDefault(id, List.of());
        long enabledCount = groupTools.stream().filter(tool -> Boolean.TRUE.equals(tool.get("enabled"))).count();
        String status = enabledCount > 0 ? "available" : "permission_required";
        return Map.of("id", id, "name", name, "description", description, "configuration", configuration,
                "status", status, "tools", groupTools, "enabledToolCount", enabledCount);
    }

    private static Map<String, Object> connector(String id, String name, String description, String configuration, List<String> toolNames) {
        List<Map<String, Object>> entries = toolNames.stream().map(tool -> Map.<String, Object>of(
                "name", tool, "description", "Connector operation is not enabled in this build.", "enabled", false, "status", "requires_connector")).toList();
        return Map.of("id", id, "name", name, "description", description, "configuration", configuration,
                "status", "requires_connector", "tools", entries, "enabledToolCount", 0);
    }
}
