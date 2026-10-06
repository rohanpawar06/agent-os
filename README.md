# AgentOS

AgentOS is a local-first agent runtime. The kernel manages a goal through planning, ordered task execution, observation, bounded recovery, replanning, and outcome memory. Ollama supplies the planning model; capabilities are discovered from MCP servers and the filesystem operations continue to run through the workspace-scoped filesystem MCP server.

## Requirements

- Node.js 20 or newer
- Ollama running locally with a model pulled (the default is `qwen2.5`)

## Build and run

From the repository root:

```powershell
npm run typecheck
npm run build
npm run agent -- "List workspace"
```

The filesystem MCP server restricts operations to `workspace/`. Its build runs before the agent command. For a direct MCP discovery check, run `npm run mcp:check --prefix agent-core`.

## Ollama settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama server URL |
| `OLLAMA_MODEL` | `qwen2.5` | Installed local model used to plan tasks |
| `AGENTOS_LLM_TIMEOUT_MS` | `120000` | Planning request timeout |
| `AGENTOS_ALLOW_OFFLINE_PLANNER` | `true` | Allow the bounded filesystem planner when Ollama is unavailable |
| `AGENTOS_MAX_PLAN_STEPS` | `12` | Maximum tasks accepted from a plan |
| `AGENTOS_MAX_REPLANS` | `1` | Maximum replans after a task failure |
| `AGENTOS_MAX_TASK_RETRIES` | `1` | Retries for transient transport failures |
| `AGENTOS_RETRY_DELAY_MS` | `250` | Base delay for retry backoff |
| `AGENTOS_FILESYSTEM_MCP_SERVER` | repository-relative build path | Override the filesystem server entry point |

Ollama requests use its `/api/chat` endpoint in JSON response mode. The planner validates that each returned capability is discovered and that required inputs are present before execution.

## Kernel modules

- `kernel/`: goal and task state, lifecycle transitions, and execution coordination
- `brain/`: planner, replanner, evaluator, and Ollama HTTP client
- `execution/`: capability execution, observation, and retry policy
- `capabilities/`: discovered capability registry and validated router
- `events/`: typed execution events for UIs and API adapters
- `memory/`: bounded in-memory outcome store with simple relevance lookup
- `mcp/`: MCP client and the existing filesystem server integration

The memory store is in-process by default and has a storage interface so a persistent adapter can be added without coupling it to the kernel.
