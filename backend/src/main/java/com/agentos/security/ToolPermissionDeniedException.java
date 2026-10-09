package com.agentos.security;

public class ToolPermissionDeniedException extends RuntimeException {
    public ToolPermissionDeniedException(String permission) {
        super("This account does not have permission to use " + permission + ".");
    }
}
