import { AgentLoop } from "./agent/agent-loop.js";

async function main() {
  console.log(`
╔════════════════════════════════════════════╗
║              AgentOS Runtime                ║
╚════════════════════════════════════════════╝
`);

  const agent = new AgentLoop();

  const result = await agent.execute(
    "Analyze my workspace and tell me what you find.",
  );

  console.log("\n🎯 Final Result");
  console.log(
    JSON.stringify(result, null, 2),
  );
}

main().catch((error) => {
  console.error(
    "\n❌ Agent runtime failed:",
    error,
  );

  process.exit(1);
});