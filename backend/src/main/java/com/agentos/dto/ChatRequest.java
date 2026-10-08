package com.agentos.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank String message,
        List<@Valid ChatMessage> history) {
    public record ChatMessage(String role, String content) { }
}
