package com.agentos.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AppPaths {
    private final Path workspace;
    private final Path desktop;
    private final Path dataDirectory;

    public AppPaths(
            @Value("${agentos.workspace-path:}") String configuredWorkspace,
            @Value("${agentos.desktop-path:}") String configuredDesktop,
            @Value("${agentos.data-dir:}") String configuredDataDirectory) {
        this.workspace = resolveWorkspace(configuredWorkspace);
        this.desktop = resolveDesktop(configuredDesktop);
        this.dataDirectory = resolveDataDirectory(configuredDataDirectory);
    }

    public Path workspace() {
        return workspace;
    }

    public Path desktop() {
        return desktop;
    }

    public Path dataDirectory() {
        return dataDirectory;
    }

    private static Path resolveWorkspace(String configured) {
        if (!configured.isBlank()) return Path.of(configured).toAbsolutePath().normalize();
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path parent = current.getParent();
        List<Path> candidates = parent == null
                ? List.of(current.resolve("workspace"))
                : List.of(current.resolve("workspace"), parent.resolve("workspace"));
        for (Path candidate : candidates) {
            if (Files.isDirectory(candidate)) return candidate;
        }
        return current.resolve("workspace").normalize();
    }

    private static Path resolveDesktop(String configured) {
        if (!configured.isBlank()) return Path.of(configured).toAbsolutePath().normalize();
        if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
            Path knownFolder = windowsDesktop();
            if (knownFolder != null) return knownFolder;
        }
        String oneDrive = System.getenv("OneDrive");
        if (oneDrive != null && !oneDrive.isBlank()) {
            Path documentsDesktop = Path.of(oneDrive, "Documents", "Desktop");
            if (Files.isDirectory(documentsDesktop)) return documentsDesktop.toAbsolutePath().normalize();
            Path desktop = Path.of(oneDrive, "Desktop");
            if (Files.isDirectory(desktop)) return desktop.toAbsolutePath().normalize();
        }
        return Path.of(System.getProperty("user.home"), "Desktop").toAbsolutePath().normalize();
    }

    private static Path windowsDesktop() {
        try {
            Process process = new ProcessBuilder("powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
                    "[Environment]::GetFolderPath('Desktop')")
                    .redirectErrorStream(true)
                    .start();
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return null;
            }
            if (process.exitValue() != 0) return null;
            String value = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            return value.isBlank() ? null : Path.of(value).toAbsolutePath().normalize();
        } catch (IOException | InterruptedException | RuntimeException exception) {
            if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
            return null;
        }
    }

    private static Path resolveDataDirectory(String configured) {
        if (!configured.isBlank()) return Path.of(configured).toAbsolutePath().normalize();
        return Path.of(System.getProperty("user.home"), ".agentos").toAbsolutePath().normalize();
    }
}
