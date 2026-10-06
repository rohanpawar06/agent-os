import { AgentLoop } from "./agent/agent-loop.js";

async function main(): Promise<void> {
  const message = process.argv.slice(2).join(" ").trim();
  if (!message) {
    console.log([
      "AgentOS",
      "",
      "Usage:",
      '  npm run agent -- "List workspace"',
      '  npm run agent -- "Create a directory named demo-project"',
      '  npm run agent -- "Create file notes.txt with content \'Hello AgentOS\'"',
      "",
      "Planning uses Ollama by default. Set OLLAMA_MODEL and OLLAMA_BASE_URL to choose the local model.",
    ].join("\n"));
    return;
  }

  const result = await new AgentLoop().execute(message);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("AgentOS runtime failed:", error);
  process.exitCode = 1;
});
