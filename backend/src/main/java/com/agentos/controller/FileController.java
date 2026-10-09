package com.agentos.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.agentos.service.FileSystemService;
import com.agentos.security.AgentOsAccessPolicy;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final FileSystemService fileSystem;
    private final AgentOsAccessPolicy accessPolicy;

    public FileController(FileSystemService fileSystem, AgentOsAccessPolicy accessPolicy) {
        this.fileSystem = fileSystem;
        this.accessPolicy = accessPolicy;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> list(@RequestParam(defaultValue = ".") String path) throws Exception {
        accessPolicy.require("filesystem.list_directory");
        return Map.of("success", true, "tool", "list_directory", "data", fileSystem.listDirectory(path));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> perform(@RequestBody Map<String, Object> request) throws Exception {
        Object rawAction = request.get("action");
        if (!(rawAction instanceof String action) || action.isBlank()) throw new IllegalArgumentException("Choose a supported filesystem operation.");
        Map<String, Object> input = new LinkedHashMap<>(request);
        input.remove("action");
        FileSystemService.ToolOutput output = fileSystem.execute(action, input);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("tool", action);
        response.put("data", output.data());
        if (output.text() != null) response.put("text", output.text());
        return response;
    }
}
