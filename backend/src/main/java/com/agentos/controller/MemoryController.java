package com.agentos.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agentos.service.MemoryService;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {
    private final MemoryService memory;

    public MemoryController(MemoryService memory) {
        this.memory = memory;
    }

    @GetMapping
    public Map<String, Object> list() {
        return Map.of("success", true, "memories", memory.list());
    }

    @DeleteMapping
    public Map<String, Object> clear() {
        memory.clear();
        return Map.of("success", true);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        return Map.of("success", true, "deleted", memory.delete(id));
    }
}
