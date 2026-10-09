package com.agentos.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agentos.service.ToolDispatchService;

@RestController
@RequestMapping("/api/tools")
public class ToolController {
    private final ToolDispatchService tools;

    public ToolController(ToolDispatchService tools) {
        this.tools = tools;
    }

    @PostMapping("/{name}")
    public Map<String, Object> execute(@PathVariable String name, @RequestBody Map<String, Object> input) throws Exception {
        var output = tools.execute(name, input);
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("success", true);
        response.put("tool", name);
        response.put("data", output.data());
        if (output.text() != null) response.put("text", output.text());
        return response;
    }
}
