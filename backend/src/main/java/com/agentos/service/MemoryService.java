package com.agentos.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import com.agentos.config.AppPaths;

@Service
public class MemoryService {
    private final AppPaths paths;
    private final ObjectMapper objectMapper;

    public MemoryService(AppPaths paths, ObjectMapper objectMapper) {
        this.paths = paths;
        this.objectMapper = objectMapper;
    }

    public synchronized List<MemoryRecord> list() {
        Path memoryFile = memoryFile();
        if (!Files.isRegularFile(memoryFile)) return List.of();
        try {
            return objectMapper.readValue(memoryFile.toFile(), new TypeReference<List<MemoryRecord>>() { });
        } catch (RuntimeException exception) {
            throw new IllegalStateException("AgentOS could not read its local memory file.", exception);
        }
    }

    public synchronized void add(String goal, boolean success, String summary) {
        List<MemoryRecord> records = new ArrayList<>(list());
        records.add(0, new MemoryRecord(UUID.randomUUID().toString(), goal,
                success ? "completed" : "failed", summary, Instant.now().toString()));
        if (records.size() > 200) records = new ArrayList<>(records.subList(0, 200));
        write(records);
    }

    public synchronized void clear() {
        Path memoryFile = memoryFile();
        try {
            Files.deleteIfExists(memoryFile);
        } catch (IOException exception) {
            throw new IllegalStateException("AgentOS could not clear its local memory file.", exception);
        }
    }

    public synchronized boolean delete(String id) {
        List<MemoryRecord> records = new ArrayList<>(list());
        boolean removed = records.removeIf(record -> record.id().equals(id));
        if (removed) write(records);
        return removed;
    }

    private void write(List<MemoryRecord> records) {
        Path memoryFile = memoryFile();
        Path temporary = memoryFile.resolveSibling(memoryFile.getFileName() + ".tmp");
        try {
            Files.createDirectories(memoryFile.getParent());
            objectMapper.writeValue(temporary.toFile(), records);
            try {
                Files.move(temporary, memoryFile, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (java.nio.file.AtomicMoveNotSupportedException exception) {
                Files.move(temporary, memoryFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            try { Files.deleteIfExists(temporary); } catch (IOException ignored) { }
            throw new IllegalStateException("AgentOS could not save local memory.", exception);
        }
    }

    private Path memoryFile() {
        return paths.currentDataDirectory().resolve("memory.json");
    }

    public record MemoryRecord(String id, String goal, String outcome, String summary, String createdAt) { }
}
