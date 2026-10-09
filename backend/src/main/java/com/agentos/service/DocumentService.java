package com.agentos.service;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.agentos.security.AgentOsAccessPolicy;

@Service
public class DocumentService {
    private final FileSystemService fileSystem;
    private final AgentOsAccessPolicy accessPolicy;

    public DocumentService(FileSystemService fileSystem, AgentOsAccessPolicy accessPolicy) {
        this.fileSystem = fileSystem;
        this.accessPolicy = accessPolicy;
    }

    public List<Map<String, Object>> allTools() {
        return List.of(
                tool("create_document", "Create a plain text or Markdown document in the allowed workspace.",
                        Map.of("path", "string", "content", "string"), List.of("path", "content")),
                tool("read_document", "Read a plain text or Markdown document.",
                        Map.of("path", "string"), List.of("path")),
                tool("append_document", "Append text to an existing plain text or Markdown document.",
                        Map.of("path", "string", "content", "string"), List.of("path", "content")),
                tool("replace_document_text", "Replace matching text in a plain text or Markdown document.",
                        Map.of("path", "string", "search", "string", "replacement", "string"), List.of("path", "search", "replacement")));
    }

    public List<Map<String, Object>> tools() {
        return allTools().stream().filter(tool -> accessPolicy.isAllowed("documents." + tool.get("name"))).toList();
    }

    public FileSystemService.ToolOutput execute(String tool, Map<String, Object> input) throws IOException {
        accessPolicy.require("documents." + tool);
        String path = string(input, "path");
        requireDocumentPath(path);
        return switch (tool) {
            case "create_document" -> {
                String content = string(input, "content");
                yield new FileSystemService.ToolOutput(Map.of("path", fileSystem.writeFile(path, content)), null);
            }
            case "read_document" -> new FileSystemService.ToolOutput(Map.of("path", path), fileSystem.readFile(path));
            case "append_document" -> {
                String current = fileSystem.readFile(path);
                String addition = string(input, "content");
                String separator = current.isEmpty() || current.endsWith("\n") ? "" : "\n";
                yield new FileSystemService.ToolOutput(Map.of("path", fileSystem.writeFile(path, current + separator + addition)), null);
            }
            case "replace_document_text" -> {
                String current = fileSystem.readFile(path);
                String search = string(input, "search");
                if (search.isEmpty()) throw new IllegalArgumentException("Search text cannot be empty.");
                if (!current.contains(search)) throw new IllegalArgumentException("The requested text was not found in the document.");
                String result = current.replace(search, string(input, "replacement"));
                yield new FileSystemService.ToolOutput(Map.of("path", fileSystem.writeFile(path, result)), null);
            }
            default -> throw new IllegalArgumentException("Unsupported document operation: " + tool);
        };
    }

    private static void requireDocumentPath(String path) {
        String lower = path.toLowerCase(java.util.Locale.ROOT);
        if (!(lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown"))) {
            throw new IllegalArgumentException("Documents must use a .txt, .md, or .markdown extension.");
        }
    }

    private static String string(Map<String, Object> input, String name) {
        Object value = input.get(name);
        if (!(value instanceof String text)) throw new IllegalArgumentException("A string value is required for '" + name + "'.");
        return text;
    }

    private static Map<String, Object> tool(String name, String description, Map<String, String> fields, List<String> required) {
        Map<String, Object> properties = new LinkedHashMap<>();
        fields.forEach((key, type) -> properties.put(key, Map.of("type", type)));
        return Map.of("name", name, "description", description,
                "inputSchema", Map.of("type", "object", "properties", properties, "required", required));
    }
}
