package com.agentos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import tools.jackson.databind.json.JsonMapper;

import com.agentos.dto.ChatRequest;

class ChatServiceTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void fallsBackToSupportedActionsAndUsesHistoryForDesktopFollowUp() throws Exception {
        Path workspace = Files.createDirectories(temporaryDirectory.resolve("workspace"));
        Path desktop = Files.createDirectories(temporaryDirectory.resolve("desktop"));
        FileSystemService fileSystem = new FileSystemService(workspace, desktop);
        OllamaService ollama = mock(OllamaService.class);
        SettingsService settings = mock(SettingsService.class);
        MemoryService memory = mock(MemoryService.class);
        when(ollama.defaultModel()).thenReturn("qwen2.5");
        when(ollama.chatJson(anyString(), anyList())).thenThrow(new OllamaService.OllamaUnavailableException("offline"));
        when(settings.getSelectedModel("qwen2.5")).thenReturn("qwen2.5");
        ChatService service = new ChatService(ollama, fileSystem, settings, memory, JsonMapper.builder().build());
        List<ChatRequest.ChatMessage> history = List.of(
                new ChatRequest.ChatMessage("user", "Create a folder name is rohan and add a text file with text like Hello Rohan Pawar."),
                new ChatRequest.ChatMessage("assistant", "Okay, I will create it on the Desktop."));

        var result = service.chat(new ChatRequest("You have to do it on the Desktop folder.", history));

        assertThat(result.get("success")).isEqualTo(true);
        assertThat(Files.readString(desktop.resolve("rohan/hello.txt"))).isEqualTo("Hello Rohan Pawar");
        assertThat(result.get("answer").toString()).contains("Desktop/rohan/hello.txt");
    }

    @Test
    void replacesAnIncompleteModelActionWithAValidatedFilesystemPlan() throws Exception {
        Path workspace = Files.createDirectories(temporaryDirectory.resolve("workspace"));
        Path desktop = Files.createDirectories(temporaryDirectory.resolve("desktop"));
        FileSystemService fileSystem = new FileSystemService(workspace, desktop);
        OllamaService ollama = mock(OllamaService.class);
        SettingsService settings = mock(SettingsService.class);
        MemoryService memory = mock(MemoryService.class);
        when(ollama.defaultModel()).thenReturn("qwen2.5");
        when(ollama.chatJson(anyString(), anyList())).thenReturn("{\"intent\":\"task\",\"actions\":[{\"tool\":\"create_directory\",\"input\":{}}]}");
        when(settings.getSelectedModel("qwen2.5")).thenReturn("qwen2.5");
        ChatService service = new ChatService(ollama, fileSystem, settings, memory, JsonMapper.builder().build());

        var result = service.chat(new ChatRequest("Create a folder named rohan on Desktop.", List.of()));

        assertThat(result.get("success")).isEqualTo(true);
        assertThat(Files.isDirectory(desktop.resolve("rohan"))).isTrue();
    }
}
