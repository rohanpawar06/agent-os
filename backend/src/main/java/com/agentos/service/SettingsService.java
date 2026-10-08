package com.agentos.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import tools.jackson.databind.ObjectMapper;

import com.agentos.config.AppPaths;

@Service
public class SettingsService {
    private final Path settingsFile;
    private final ObjectMapper objectMapper;
    private String selectedModel;
    private boolean loaded;

    public SettingsService(AppPaths paths, ObjectMapper objectMapper) {
        this.settingsFile = paths.dataDirectory().resolve("settings.json");
        this.objectMapper = objectMapper;
    }

    public synchronized String getSelectedModel(String fallback) {
        if (loaded) return selectedModel == null ? fallback : selectedModel;
        loaded = true;
        try {
            if (Files.isRegularFile(settingsFile)) {
                Map<?, ?> settings = objectMapper.readValue(settingsFile.toFile(), Map.class);
                if (settings.get("model") instanceof String model && !model.isBlank()) selectedModel = model.trim();
            }
        } catch (RuntimeException exception) {
            throw new IllegalStateException("AgentOS could not read its local settings file.", exception);
        }
        return selectedModel == null ? fallback : selectedModel;
    }

    public synchronized void saveSelectedModel(String model) {
        String normalized = model == null ? "" : model.trim();
        if (normalized.isBlank()) throw new IllegalArgumentException("Choose a model name.");
        Path temporary = settingsFile.resolveSibling(settingsFile.getFileName() + "." + UUID.randomUUID() + ".tmp");
        try {
            Files.createDirectories(settingsFile.getParent());
            objectMapper.writeValue(temporary.toFile(), Map.of("model", normalized));
            try {
                Files.move(temporary, settingsFile, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (java.nio.file.AtomicMoveNotSupportedException exception) {
                Files.move(temporary, settingsFile, StandardCopyOption.REPLACE_EXISTING);
            }
            selectedModel = normalized;
            loaded = true;
        } catch (IOException exception) {
            try { Files.deleteIfExists(temporary); } catch (IOException ignored) { }
            throw new IllegalStateException("AgentOS could not save its local settings file.", exception);
        }
    }
}
