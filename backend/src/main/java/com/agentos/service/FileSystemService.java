package com.agentos.service;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import com.agentos.config.AppPaths;

@Service
public class FileSystemService {
    private static final int MAX_READ_BYTES = 4 * 1024 * 1024;
    private static final int MAX_WRITE_BYTES = 8 * 1024 * 1024;
    private static final int MAX_SEARCH_RESULTS = 500;
    private final Path workspace;
    private final Path desktop;

    @Autowired
    public FileSystemService(AppPaths paths) {
        this(paths.workspace(), paths.desktop());
    }

    public FileSystemService(Path workspace, Path desktop) {
        this.workspace = workspace.toAbsolutePath().normalize();
        this.desktop = desktop.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.workspace);
            Files.createDirectories(this.desktop);
        } catch (IOException exception) {
            throw new IllegalStateException("AgentOS could not initialize its allowed filesystem roots.", exception);
        }
    }

    public Map<String, Object> listDirectory(String inputPath) throws IOException {
        Resolved resolved = resolve(inputPath);
        if (!Files.isDirectory(resolved.path())) throw new IllegalArgumentException("That path is not a folder.");
        List<Map<String, String>> entries;
        try (var stream = Files.list(resolved.path())) {
            entries = stream.sorted(Comparator
                            .comparing((Path path) -> !Files.isDirectory(path))
                            .thenComparing(path -> path.getFileName().toString().toLowerCase(Locale.ROOT)))
                    .map(path -> {
                        Map<String, String> entry = new LinkedHashMap<>();
                        entry.put("name", path.getFileName().toString());
                        entry.put("type", Files.isDirectory(path) ? "directory" : "file");
                        entry.put("path", joinAlias(resolved.alias(), path.getFileName().toString()));
                        return entry;
                    }).toList();
        }
        return Map.of("path", resolved.alias(), "entries", entries);
    }

    public String createDirectory(String inputPath) throws IOException {
        Resolved resolved = resolve(inputPath);
        Files.createDirectories(resolved.path());
        return resolved.alias();
    }

    public String writeFile(String inputPath, String content) throws IOException {
        if (content == null) throw new IllegalArgumentException("File content is required.");
        if (content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_WRITE_BYTES) {
            throw new IllegalArgumentException("Files must be smaller than 8 MB.");
        }
        Resolved resolved = resolve(inputPath);
        if (resolved.path().equals(resolved.root())) throw new IllegalArgumentException("Choose a file name inside an allowed root.");
        Files.createDirectories(resolved.path().getParent());
        Files.writeString(resolved.path(), content, java.nio.charset.StandardCharsets.UTF_8);
        return resolved.alias();
    }

    public String readFile(String inputPath) throws IOException {
        Resolved resolved = resolve(inputPath);
        if (!Files.isRegularFile(resolved.path())) throw new IllegalArgumentException("That path is not a file.");
        if (Files.size(resolved.path()) > MAX_READ_BYTES) throw new IllegalArgumentException("Files larger than 4 MB cannot be opened in AgentOS.");
        return Files.readString(resolved.path(), java.nio.charset.StandardCharsets.UTF_8);
    }

    public String deleteFile(String inputPath) throws IOException {
        Resolved resolved = resolve(inputPath);
        ensureNotRoot(resolved);
        if (!Files.isRegularFile(resolved.path())) throw new IllegalArgumentException("That path is not a file. Use delete_path for a folder.");
        Files.delete(resolved.path());
        return resolved.alias();
    }

    public String deletePath(String inputPath) throws IOException {
        Resolved resolved = resolve(inputPath);
        ensureNotRoot(resolved);
        if (!Files.exists(resolved.path())) throw new IllegalArgumentException("That path does not exist.");
        Files.walkFileTree(resolved.path(), new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path directory, IOException error) throws IOException {
                if (error != null) throw error;
                Files.delete(directory);
                return FileVisitResult.CONTINUE;
            }
        });
        return resolved.alias();
    }

    public String copyPath(String sourcePath, String destinationPath) throws IOException {
        Resolved source = resolve(sourcePath);
        Resolved destination = resolve(destinationPath);
        if (!Files.exists(source.path())) throw new IllegalArgumentException("The source path does not exist.");
        if (source.path().equals(destination.path())) throw new IllegalArgumentException("Source and destination must be different.");
        if (Files.isDirectory(source.path()) && destination.path().startsWith(source.path())) {
            throw new IllegalArgumentException("A folder cannot be copied into itself.");
        }
        if (Files.exists(destination.path())) throw new IllegalArgumentException("The destination already exists.");
        Files.createDirectories(destination.path().getParent());
        if (Files.isDirectory(source.path())) {
            Files.walkFileTree(source.path(), new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attributes) throws IOException {
                    Files.createDirectories(destination.path().resolve(source.path().relativize(directory)));
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) throws IOException {
                    Files.copy(file, destination.path().resolve(source.path().relativize(file)));
                    return FileVisitResult.CONTINUE;
                }
            });
        } else {
            Files.copy(source.path(), destination.path());
        }
        return destination.alias();
    }

    public String movePath(String sourcePath, String destinationPath) throws IOException {
        Resolved source = resolve(sourcePath);
        Resolved destination = resolve(destinationPath);
        ensureNotRoot(source);
        if (!Files.exists(source.path())) throw new IllegalArgumentException("The source path does not exist.");
        if (source.path().equals(destination.path())) throw new IllegalArgumentException("Source and destination must be different.");
        if (Files.isDirectory(source.path()) && destination.path().startsWith(source.path())) {
            throw new IllegalArgumentException("A folder cannot be moved into itself.");
        }
        if (Files.exists(destination.path())) throw new IllegalArgumentException("The destination already exists.");
        Files.createDirectories(destination.path().getParent());
        try {
            Files.move(source.path(), destination.path(), StandardCopyOption.ATOMIC_MOVE);
        } catch (java.nio.file.AtomicMoveNotSupportedException exception) {
            Files.move(source.path(), destination.path());
        }
        return destination.alias();
    }

    public Map<String, Object> searchFiles(String inputPath, String query) throws IOException {
        if (query == null || query.isBlank()) throw new IllegalArgumentException("Enter a search name.");
        Resolved resolved = resolve(inputPath);
        if (!Files.isDirectory(resolved.path())) throw new IllegalArgumentException("Choose a folder to search.");
        String needle = query.toLowerCase(Locale.ROOT);
        List<Map<String, String>> entries = new ArrayList<>();
        try (var stream = Files.walk(resolved.path(), 16)) {
            var iterator = stream.iterator();
            while (iterator.hasNext() && entries.size() < MAX_SEARCH_RESULTS) {
                Path path = iterator.next();
                if (path.equals(resolved.path()) || !path.getFileName().toString().toLowerCase(Locale.ROOT).contains(needle)) continue;
                Map<String, String> entry = new LinkedHashMap<>();
                entry.put("name", path.getFileName().toString());
                entry.put("type", Files.isDirectory(path) ? "directory" : "file");
                entry.put("path", aliasFor(resolved.root(), path, resolved.desktopRoot()));
                entries.add(entry);
            }
        }
        return Map.of("path", resolved.alias(), "entries", entries, "truncated", entries.size() == MAX_SEARCH_RESULTS);
    }

    public List<String> roots() {
        return List.of(workspace.toString(), desktop.toString());
    }

    public List<Map<String, Object>> tools() {
        return List.of(
                tool("list_directory", "List files and folders in workspace/ or Desktop/", Map.of("path", "string"), List.of("path")),
                tool("create_directory", "Create a folder in workspace/ or Desktop/", Map.of("name", "string"), List.of("name")),
                tool("write_file", "Create or replace a text file", Map.of("path", "string", "content", "string"), List.of("path", "content")),
                tool("read_file", "Read a text file", Map.of("path", "string"), List.of("path")),
                tool("delete_file", "Delete a file", Map.of("path", "string"), List.of("path")),
                tool("delete_path", "Delete a folder and its contents", Map.of("path", "string"), List.of("path")),
                tool("copy_path", "Copy a file or folder", Map.of("source", "string", "destination", "string"), List.of("source", "destination")),
                tool("move_path", "Move or rename a file or folder", Map.of("source", "string", "destination", "string"), List.of("source", "destination")),
                tool("search_files", "Find names in a folder tree", Map.of("path", "string", "query", "string"), List.of("path", "query")));
    }

    public ToolOutput execute(String tool, Map<String, Object> input) throws IOException {
        String path = optionalStringValue(input, "path");
        return switch (tool) {
            case "list_directory" -> new ToolOutput(listDirectory(defaultValue(path, ".")), null);
            case "create_directory" -> new ToolOutput(Map.of("path", createDirectory(stringValue(input, "name"))), null);
            case "write_file" -> new ToolOutput(Map.of("path", writeFile(path, stringValue(input, "content"))), null);
            case "read_file" -> new ToolOutput(Map.of("path", path), readFile(path));
            case "delete_file" -> new ToolOutput(Map.of("path", deleteFile(path)), null);
            case "delete_path" -> new ToolOutput(Map.of("path", deletePath(path)), null);
            case "copy_path" -> new ToolOutput(Map.of("path", copyPath(stringValue(input, "source"), stringValue(input, "destination"))), null);
            case "move_path" -> new ToolOutput(Map.of("path", movePath(stringValue(input, "source"), stringValue(input, "destination"))), null);
            case "search_files" -> new ToolOutput(searchFiles(defaultValue(path, "."), stringValue(input, "query")), null);
            default -> throw new IllegalArgumentException("Unsupported filesystem operation: " + tool);
        };
    }

    private Resolved resolve(String input) throws IOException {
        if (input == null || input.isBlank()) throw new IllegalArgumentException("Path cannot be empty.");
        String normalized = input.replace('\\', '/').replaceFirst("^\\./", "");
        boolean isDesktop = normalized.matches("(?i)^desktop(?:/.*)?$");
        String relative = isDesktop ? normalized.replaceFirst("(?i)^desktop/?", "") : normalized;
        if (relative.matches("^[A-Za-z]:.*") || relative.startsWith("/") || relative.startsWith("//")) {
            throw new IllegalArgumentException("Access denied: use a path inside workspace/ or Desktop/.");
        }
        Path root = (isDesktop ? desktop : workspace).toAbsolutePath().normalize();
        Path candidate = root.resolve(relative).normalize();
        if (!candidate.startsWith(root)) throw new IllegalArgumentException("Access denied: use a path inside workspace/ or Desktop/.");
        Path realRoot = resolveMissingSegments(root);
        Path realCandidate = resolveMissingSegments(candidate);
        if (!realCandidate.startsWith(realRoot)) {
            throw new IllegalArgumentException("Access denied: symbolic links cannot escape workspace/ or Desktop/.");
        }
        String alias = isDesktop ? "Desktop" : ".";
        if (!relative.isBlank() && !relative.equals(".")) alias = alias + "/" + relative.replaceAll("^/+", "");
        return new Resolved(root, candidate, alias, isDesktop);
    }

    private static Path resolveMissingSegments(Path path) throws IOException {
        Deque<Path> missing = new LinkedList<>();
        Path current = path;
        while (current != null && !Files.exists(current)) {
            missing.addFirst(current.getFileName());
            current = current.getParent();
        }
        if (current == null) throw new IOException("Could not resolve filesystem path.");
        Path resolved = current.toRealPath();
        for (Path segment : missing) resolved = resolved.resolve(segment);
        return resolved.normalize();
    }

    private static void ensureNotRoot(Resolved resolved) {
        if (resolved.path().equals(resolved.root())) throw new IllegalArgumentException("The workspace and Desktop roots cannot be changed or deleted.");
    }

    private static String aliasFor(Path root, Path path, boolean desktopRoot) {
        String base = desktopRoot ? "Desktop" : ".";
        Path relative = root.relativize(path);
        return relative.toString().isBlank() ? base : base + "/" + relative.toString().replace('\\', '/');
    }

    private static String joinAlias(String parent, String name) {
        return parent.equals(".") ? name : parent + "/" + name;
    }

    private static String stringValue(Map<String, Object> input, String key) {
        Object value = input.get(key);
        if (!(value instanceof String text)) throw new IllegalArgumentException("A string value is required for '" + key + "'.");
        return text;
    }

    private static String optionalStringValue(Map<String, Object> input, String key) {
        Object value = input.get(key);
        return value instanceof String text ? text : null;
    }

    private static String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static Map<String, Object> tool(String name, String description, Map<String, String> properties, List<String> required) {
        Map<String, Object> fields = new LinkedHashMap<>();
        properties.forEach((key, value) -> fields.put(key, Map.of("type", value)));
        return Map.of("name", name, "description", description,
                "inputSchema", Map.of("type", "object", "properties", fields, "required", required));
    }

    public record ToolOutput(Object data, String text) { }

    private record Resolved(Path root, Path path, String alias, boolean desktopRoot) { }
}
