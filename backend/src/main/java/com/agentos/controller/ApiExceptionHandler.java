package com.agentos.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.agentos.service.OllamaService.OllamaUnavailableException;
import com.agentos.security.ToolPermissionDeniedException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> badRequest(IllegalArgumentException exception) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalidRequest(MethodArgumentNotValidException exception) {
        return response(HttpStatus.BAD_REQUEST, "Enter a message before sending.");
    }

    @ExceptionHandler(OllamaUnavailableException.class)
    public ResponseEntity<Map<String, Object>> modelUnavailable(OllamaUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage());
    }

    @ExceptionHandler(ToolPermissionDeniedException.class)
    public ResponseEntity<Map<String, Object>> permissionDenied(ToolPermissionDeniedException exception) {
        return response(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> internalError(Exception exception) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR,
                exception.getMessage() == null ? "AgentOS could not complete the request." : exception.getMessage());
    }

    private static ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "error", message == null ? "Request failed." : message));
    }
}
