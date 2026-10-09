# AgentOS

AgentOS is a browser-based assistant with a Next.js UI, a Spring Boot API, and an Ollama model runtime. It supports a loopback-only local mode and a multi-user tenant mode for internet deployments.

Chat operations use Ollama's native tool-call interface, so the model selects declared AgentOS actions rather than hand-writing action JSON. The available actions are still checked against the current account's grants before execution.

## Tool families

The capability registry shows ten top-level families and the real status of their operations:

| Family | Available operations |
| --- | --- |
| Files & folders | List, read, create, write, search, copy, move, and delete inside the assigned roots |
| Documents | Create, read, append, and replace text in `.txt`, `.md`, and `.markdown` files |
| Spreadsheets | Create, read, append, and filter `.csv` files |
| Web search | Search public web pages through Ollama's hosted search API; optional API key and per-user grant required |
| Browser control | Requires a paired local companion; cloud servers cannot access a user's laptop |
| Terminal | Requires a local companion and an explicit command allowlist |
| Databases | Requires a per-user database connector and least-privilege credentials |
| Email | Requires a per-user OAuth connector |
| Calendar | Requires a per-user OAuth connector |
| API integrations | Call administrator-configured HTTPS operations with per-user credentials and grants |

Files, documents, spreadsheets, optional web search, and configured API integrations execute in this build. The remaining five appear as `Connector required` until their provider or local-runner adapters are implemented; entering credentials alone does not activate an unimplemented connector. No arbitrary shell command, browser, email, database, or arbitrary-URL call is exposed by the cloud server.

## Local development

Requirements: Node.js 20+, Java 21+, Maven, and Ollama.

```powershell
ollama pull qwen3.5:9b
npm run dev
```

For stronger answers, choose a tool-capable model that fits the computer's available memory, install it with Ollama, then set `OLLAMA_MODEL` to its installed name. Qwen3.5 is one option supported by current Ollama releases; larger variants generally need more memory. AgentOS passes configurable thinking to supported Qwen3 and DeepSeek-R1 models. Set `AGENTOS_CONTEXT_TOKENS` only when the machine has enough memory for the larger context. No model is downloaded automatically by AgentOS. Before I install or download a model for you, provide the absolute folder where Ollama should store it.

More capable local models can improve reasoning and instruction following. They do not provide live web facts by themselves. To enable current web search, create an Ollama account/API key, set `OLLAMA_API_KEY`, and grant `web.search_web` to the intended tenant. This uses Ollama's hosted search API: search queries are sent to Ollama, while chat and file operations remain local. Leave the key empty to keep web search disabled. See the [Ollama web-search documentation](https://github.com/ollama/ollama/blob/main/docs/capabilities/web-search.mdx).

Open the address printed by the launcher in Brave or another browser. The local profile binds the Spring API to `127.0.0.1`, does not require an API key, and may use the current computer's Desktop. The startup guard prevents local mode from binding to a public network interface.

## Internet deployment with Docker Compose

The Compose deployment runs the UI, Spring API, and Ollama. Only the UI port is published. Put a TLS reverse proxy or a hosting provider's HTTPS endpoint in front of it; do not publish backend port `8080` or Ollama port `11434`.

1. Copy `.env.example` to `.env` and set `AGENTOS_PUBLIC_ORIGIN` to the public UI origin.
2. Generate an API key for each user:

   ```powershell
   node scripts/create-tenant-key.mjs rohan
   ```

   Give the returned `token` to that user privately. Put only its `sha256` value in `AGENTOS_TENANT_KEYS` in `.env`.
3. Add that user's allowed tool names to `AGENTOS_TOOL_GRANTS`. Grants default to deny. Avoid granting delete operations unless the account needs them.
   To allow live web search, set `OLLAMA_API_KEY` and add `web.search_web` to that user's grant list.
   To allow an approved API connector, add `integrations.call_approved_api` and configure only that tenant's services in `AGENTOS_API_CONNECTORS`.
4. Start the deployment and install the model:

   ```powershell
   docker compose up -d --build
   docker compose exec ollama ollama pull qwen3.5:9b
   ```

5. Open the public HTTPS URL, go to **Settings**, and connect with the user's raw API key.

Example configuration for multiple users:

```dotenv
AGENTOS_TENANT_KEYS='{"rohan":"<rohan-sha256>","maya":"<maya-sha256>"}'
AGENTOS_TOOL_GRANTS='{"rohan":["filesystem.list_directory","filesystem.read_file","filesystem.create_directory","filesystem.write_file","documents.read_document","documents.create_document"],"maya":["filesystem.*","documents.*","spreadsheets.*"]}'
AGENTOS_PUBLIC_ORIGIN=https://agentos.example.com
```

Tenant workspaces and memories are stored under `/data/tenants/<tenant-id>` on the persistent `agentos-data` volume. Each API key is checked as a SHA-256 hash, each request is rate limited to 120 per minute per tenant, and cloud filesystem access cannot reach the server's Desktop. The Settings screen keeps the raw API key in that browser tab's session storage. Rotate a key by generating a new one and replacing its hash in `.env`.

### Administrator-configured API integrations

`AGENTOS_API_CONNECTORS` maps tenant IDs to named services. Each service has a fixed HTTPS `baseUrl`, optional fixed request `headers`, and an `operations` map. An operation fixes its HTTP method and relative path; optional `queryParams` explicitly allow query parameter names, and `bodyAllowed: true` enables a bounded JSON body. The tool accepts a service and operation name, never an arbitrary URL. Private/local hosts and redirects are rejected, request and response bodies are bounded, and configured headers are never exposed to the model. Store real credentials only in the deployment's private `.env` or secret manager.

Example shape (replace the example host and credential before enabling it):

```dotenv
AGENTOS_API_CONNECTORS='{"rohan":{"weather":{"baseUrl":"https://api.example.com/v1","headers":{"Authorization":"Bearer replace-me"},"operations":{"current":{"method":"GET","path":"current","description":"Get current conditions","queryParams":["city"]}}}}}'
```

For local mode, use `local` as the tenant ID. Cloud mode requires an exact tenant ID that also has a key in `AGENTOS_TENANT_KEYS`; grant `integrations.call_approved_api` only to the accounts that need it.

This Compose setup is a single-backend deployment. It supports multiple isolated accounts on one host; it is not a multi-replica or high-availability storage design. Back up the `agentos-data` and `ollama-data` volumes, restrict access to `.env`, and terminate TLS at the public edge.

## API

All `/api/**` routes require `Authorization: Bearer <tenant-api-key>` in tenant mode. The frontend proxy forwards requests to the backend on the private Compose network.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/chat` | POST | Chat and execute enabled filesystem, document, spreadsheet, and optional web-search tools |
| `/api/files` | GET, POST | Browse and manage allowed files and folders |
| `/api/tools/{name}` | POST | Execute an enabled document, spreadsheet, or approved API operation |
| `/api/status` | GET | Model health, ten-family capability registry, and security mode |
| `/api/settings` | GET, POST | Inspect model settings; model changes are local-mode only |
| `/api/memory` | GET, DELETE | Read or clear the current account's task memory |

The workspace root is configurable with `AGENTOS_WORKSPACE_PATH` in local mode. `AGENTOS_DESKTOP_PATH` selects the local Desktop root. `AGENTOS_DATA_DIR` selects settings, memory, and tenant storage. `OLLAMA_BASE_URL` and `OLLAMA_MODEL` configure the model service.
`AGENTOS_MODEL_THINKING`, `AGENTOS_CONTEXT_TOKENS`, and `AGENTOS_TEMPERATURE` adjust model reasoning, context size, and response variability. Context length should be raised only when the host has enough memory.

## Checks

```powershell
npm run typecheck
npm run build
npm run backend:test
```
