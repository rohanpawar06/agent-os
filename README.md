# AgentOS

AgentOS is a local assistant with a Next.js browser UI, a Spring Boot REST API, and Ollama for private, on-device chat. The Spring Boot backend handles chat routing, supported filesystem actions, model settings, service status, and persistent local memory.

## Project structure

```text
agent-os/
├── backend/                 Spring Boot application (Maven)
│   └── src/
│       ├── main/java/com/agentos/
│       │   ├── config/       Allowed roots, CORS and app configuration
│       │   ├── controller/  REST endpoints
│       │   ├── dto/         Validated API request objects
│       │   └── service/     Ollama, filesystem, memory and chat logic
│       ├── main/resources/  Spring configuration
│       └── test/java/       Backend tests
├── frontend/                Next.js browser application
├── agent-core/              TypeScript agent kernel and CLI
├── mcp-servers/             Filesystem MCP server for the CLI runtime
└── workspace/               AgentOS filesystem root
```

## Requirements

- Node.js 20 or newer
- Java 21 or newer
- Maven 3.6.3 or newer
- Ollama running locally with a model installed (default: `qwen2.5`)

## Run the browser application

From the repository root:

```powershell
ollama pull qwen2.5
npm run dev
```

The development launcher starts Spring Boot and the browser UI, then prints the UI address. It uses ports `8080` and `3000` by default and moves to the next available local port if either is occupied. Open the printed UI address in Brave or another browser. Stop both development processes with Ctrl+C.

To run each service separately, use two terminals:

```powershell
npm run backend:dev
```

```powershell
npm run dev --prefix ./frontend
```

## Backend API

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/chat` | POST | Local-model chat and executed filesystem tasks |
| `/api/files` | GET, POST | Browse and manage files and folders |
| `/api/status` | GET | Ollama, filesystem and memory status |
| `/api/settings` | GET, POST | Read or select an installed Ollama model |
| `/api/memory` | GET, DELETE | View or clear locally saved task outcomes |

Filesystem actions are limited to the repository's `workspace/` directory and the real Desktop folder. Supported actions include listing, reading, creating, writing, searching, copying, moving, and deleting paths. Absolute paths and symbolic-link escapes are rejected.

## Build and checks

```powershell
npm run typecheck
npm run build
npm run backend:test
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama server |
| `OLLAMA_MODEL` | `qwen2.5` | Default local model |
| `AGENTOS_BACKEND_PORT` | `8080` | Spring Boot port |
| `AGENTOS_WORKSPACE_PATH` | Project `workspace/` | Override the allowed workspace root |
| `AGENTOS_DESKTOP_PATH` | Windows Desktop Known Folder | Override the allowed Desktop root |
| `AGENTOS_DATA_DIR` | `~/.agentos` | Local settings and memory directory |
| `AGENTOS_FRONTEND_PORT` | `3000` | Preferred browser UI port |
| `AGENTOS_FRONTEND_ORIGINS` | `http://127.0.0.1:*,http://localhost:*` | Allowed local browser origins |
| `NEXT_PUBLIC_AGENTOS_API_URL` | `http://127.0.0.1:8080` | API address used by the browser UI |

The memory store is in-process by default and has a storage interface so a persistent adapter can be added without coupling it to the kernel.
