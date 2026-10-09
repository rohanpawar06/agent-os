package com.agentos.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agentos.service.OllamaService;
import com.agentos.service.SettingsService;
import com.agentos.security.AgentOsAccessPolicy;
import com.agentos.security.ToolPermissionDeniedException;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final OllamaService ollama;
    private final SettingsService settings;
    private final AgentOsAccessPolicy accessPolicy;

    public SettingsController(OllamaService ollama, SettingsService settings, AgentOsAccessPolicy accessPolicy) {
        this.ollama = ollama;
        this.settings = settings;
        this.accessPolicy = accessPolicy;
    }

    @GetMapping
    public Map<String, Object> get() {
        return Map.of("success", true, "model", settings.getSelectedModel(ollama.defaultModel()),
                "baseUrl", accessPolicy.tenantMode() ? "configured model service" : ollama.baseUrl());
    }

    @PostMapping
    public Map<String, Object> set(@RequestBody Map<String, Object> body) {
        if (accessPolicy.tenantMode()) throw new ToolPermissionDeniedException("shared model settings");
        Object rawModel = body.get("model");
        if (!(rawModel instanceof String model) || model.isBlank()) throw new IllegalArgumentException("Choose an installed Ollama model.");
        List<String> available = ollama.listModels();
        String matched = available.stream().filter(candidate -> normalize(candidate).equals(normalize(model))).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Model \"" + model.trim() + "\" is not installed in Ollama."));
        settings.saveSelectedModel(matched);
        return Map.of("success", true, "model", matched);
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase().replaceFirst(":latest$", "");
    }
}
