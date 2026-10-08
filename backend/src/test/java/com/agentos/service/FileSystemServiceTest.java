package com.agentos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileSystemServiceTest {
    @TempDir
    Path temporaryDirectory;

    private FileSystemService fileSystem;
    private Path workspace;
    private Path desktop;

    @BeforeEach
    void setUp() throws Exception {
        workspace = Files.createDirectories(temporaryDirectory.resolve("workspace"));
        desktop = Files.createDirectories(temporaryDirectory.resolve("desktop"));
        fileSystem = new FileSystemService(workspace, desktop);
    }

    @Test
    void createsReadsListsCopiesMovesAndDeletesFiles() throws Exception {
        fileSystem.createDirectory("Desktop/rohan");
        fileSystem.writeFile("Desktop/rohan/hello.txt", "Hello Rohan Pawar");

        assertThat(fileSystem.readFile("Desktop/rohan/hello.txt")).isEqualTo("Hello Rohan Pawar");
        assertThat(fileSystem.listDirectory("Desktop/rohan").get("entries").toString()).contains("hello.txt");

        fileSystem.copyPath("Desktop/rohan/hello.txt", "Desktop/rohan/copy.txt");
        fileSystem.movePath("Desktop/rohan/copy.txt", "Desktop/rohan/moved.txt");
        assertThat(Files.exists(desktop.resolve("rohan/moved.txt"))).isTrue();
        fileSystem.deleteFile("Desktop/rohan/moved.txt");
        fileSystem.deletePath("Desktop/rohan");

        assertThat(Files.exists(desktop.resolve("rohan"))).isFalse();
    }

    @Test
    void rejectsTraversalAndProtectsAllowedRoots() {
        assertThatThrownBy(() -> fileSystem.writeFile("../outside.txt", "no"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Access denied");
        assertThatThrownBy(() -> fileSystem.deletePath("."))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("roots cannot be changed");
    }

    @Test
    void searchReturnsNestedMatchesWithinTheSelectedRoot() throws Exception {
        fileSystem.createDirectory("reports/2026");
        fileSystem.writeFile("reports/2026/summary.txt", "Quarterly summary");

        Map<String, Object> result = fileSystem.searchFiles(".", "summary");

        assertThat(result.get("entries").toString()).contains("reports/2026/summary.txt");
    }
}
