package com.agentos.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.agentos.security.AgentOsAccessPolicy;

@Service
public class ToolDispatchService {
    private static final Set<String> FILE_TOOLS = Set.of("list_directory", "create_directory", "write_file", "read_file",
            "delete_file", "delete_path", "copy_path", "move_path", "search_files");
    private final FileSystemService fileSystem;
    private final DocumentService documents;
    private final SpreadsheetService spreadsheets;
    private final WebSearchService webSearch;
    private final ApiIntegrationService apiIntegrations;
    private final AgentOsAccessPolicy accessPolicy;

    @Autowired
    public ToolDispatchService(FileSystemService fileSystem, DocumentService documents, SpreadsheetService spreadsheets,
                              WebSearchService webSearch, ApiIntegrationService apiIntegrations,
                              AgentOsAccessPolicy accessPolicy) {
        this.fileSystem = fileSystem;
        this.documents = documents;
        this.spreadsheets = spreadsheets;
        this.webSearch = webSearch;
        this.apiIntegrations = apiIntegrations;
        this.accessPolicy = accessPolicy;
    }

    /** Compatibility constructor used by isolated chat tests that only provide a filesystem. */
    public ToolDispatchService(FileSystemService fileSystem) {
        this.fileSystem = fileSystem;
        this.documents = null;
        this.spreadsheets = null;
        this.webSearch = null;
        this.apiIntegrations = null;
        this.accessPolicy = null;
    }

    public List<Map<String, Object>> tools() {
        List<Map<String, Object>> definitions = new ArrayList<>();
        fileSystem.allTools().forEach(tool -> addEnabled(definitions, "filesystem", tool));
        if (documents != null) documents.allTools().forEach(tool -> addEnabled(definitions, "documents", tool));
        if (spreadsheets != null) spreadsheets.allTools().forEach(tool -> addEnabled(definitions, "spreadsheets", tool));
        if (webSearch != null) webSearch.allTools().forEach(tool -> addEnabled(definitions, "web", tool));
        if (apiIntegrations != null) apiIntegrations.allTools().forEach(tool -> addEnabled(definitions, "integrations", tool));
        return definitions.stream().filter(tool -> Boolean.TRUE.equals(tool.get("enabled"))).toList();
    }

    public boolean tenantMode() {
        return accessPolicy != null && accessPolicy.tenantMode();
    }

    public List<Map<String, Object>> allImplementedTools() {
        List<Map<String, Object>> definitions = new ArrayList<>();
        fileSystem.allTools().forEach(tool -> addEnabled(definitions, "filesystem", tool));
        if (documents != null) documents.allTools().forEach(tool -> addEnabled(definitions, "documents", tool));
        if (spreadsheets != null) spreadsheets.allTools().forEach(tool -> addEnabled(definitions, "spreadsheets", tool));
        if (webSearch != null) webSearch.allTools().forEach(tool -> addEnabled(definitions, "web", tool));
        if (apiIntegrations != null) apiIntegrations.allTools().forEach(tool -> addEnabled(definitions, "integrations", tool));
        return List.copyOf(definitions);
    }

    public boolean webSearchConfigured() {
        return webSearch != null && webSearch.configured();
    }

    public boolean apiIntegrationsConfigured() {
        return apiIntegrations != null && apiIntegrations.configuredForCurrentTenant();
    }

    public boolean supports(String name) {
        return allImplementedTools().stream().anyMatch(tool -> name.equals(tool.get("name")));
    }

    public FileSystemService.ToolOutput execute(String name, Map<String, Object> input) throws IOException {
        if (FILE_TOOLS.contains(name)) return fileSystem.execute(name, input);
        if (documents != null && documents.allTools().stream().anyMatch(tool -> name.equals(tool.get("name")))) return documents.execute(name, input);
        if (spreadsheets != null && spreadsheets.allTools().stream().anyMatch(tool -> name.equals(tool.get("name")))) return spreadsheets.execute(name, input);
        if (webSearch != null && "search_web".equals(name)) return webSearch.search(input);
        if (apiIntegrations != null && "call_approved_api".equals(name)) return apiIntegrations.call(input);
        throw new IllegalArgumentException("Unsupported AgentOS tool: " + name);
    }

    private void addEnabled(List<Map<String, Object>> output, String capability, Map<String, Object> definition) {
        String name = String.valueOf(definition.get("name"));
        Map<String, Object> item = new LinkedHashMap<>(definition);
        item.put("capability", capability);
        item.put("permission", capability + "." + name);
        boolean permissionGranted = accessPolicy == null || accessPolicy.isAllowed(capability + "." + name);
        boolean configured = switch (capability) {
            case "web" -> webSearchConfigured();
            case "integrations" -> apiIntegrationsConfigured();
            default -> true;
        };
        item.put("enabled", permissionGranted && configured);
        output.add(Map.copyOf(item));
    }
}
