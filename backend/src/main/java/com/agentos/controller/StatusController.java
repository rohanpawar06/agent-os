package com.agentos.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agentos.service.FileSystemService;
import com.agentos.service.MemoryService;
import com.agentos.service.OllamaService;
import com.agentos.service.SettingsService;

@RestController
@RequestMapping("/api/status")
public class StatusController {
    private final OllamaService ollama;
    private final FileSystemService fileSystem;
    private final MemoryService memory;
    private final SettingsService settings;

    public StatusController(OllamaService ollama, FileSystemService fileSystem, MemoryService memory, SettingsService settings) {
        this.ollama = ollama;
        this.fileSystem = fileSystem;
        this.memory = memory;
        this.settings = settings;
    }

    @GetMapping
    public Map<String, Object> status() {
        String model = settings.getSelectedModel(ollama.defaultModel());
        List<String> models = List.of();
        String ollamaError = null;
        boolean ollamaConnected = false;
        try {
            models = ollama.listModels();
            ollamaConnected = true;
        } catch (RuntimeException exception) {
            ollamaError = exception.getMessage();
        }
        boolean modelAvailable = models.stream().anyMatch(candidate -> modelMatches(candidate, model));
        Map<String, Object> ollamaStatus = new java.util.LinkedHashMap<>();
        ollamaStatus.put("connected", ollamaConnected);
        ollamaStatus.put("availableModels", models);
        ollamaStatus.put("modelAvailable", modelAvailable);
        if (ollamaError != null) ollamaStatus.put("error", ollamaError);
        ollamaStatus.put("baseUrl", ollama.baseUrl());
        return Map.of(
                "success", true,
                "apiVersion", 1,
                "model", model,
                "ollama", ollamaStatus,
                "filesystem", Map.of("connected", true, "roots", fileSystem.roots(), "tools", fileSystem.tools()),
                "memory", Map.of("connected", true, "storage", "local file", "records", memory.list().size()),
                "checkedAt", Instant.now().toString());
    }

    private static boolean modelMatches(String candidate, String selected) {
        return normalize(candidate).equals(normalize(selected));
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase().replaceFirst(":latest$", "");
    }
}
