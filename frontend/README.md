# AgentOS Web App

The browser UI uses the local Ollama model and AgentOS filesystem MCP server. It answers questions and can read or change files inside `workspace/` or the user's Desktop folder using the `Desktop/` path prefix.

## Run locally

Requirements: Node.js 20 or newer, Ollama, and the `qwen2.5` model. Start Ollama first, then run from the repository root:

```powershell
ollama pull qwen2.5
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev command builds the filesystem MCP server before starting Next.js. Set `OLLAMA_BASE_URL` or `OLLAMA_MODEL` to use different local Ollama settings.
