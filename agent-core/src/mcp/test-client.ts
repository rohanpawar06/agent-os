import { MCPClient } from "./client.js";

async function main(): Promise<void> {
  const client = new MCPClient();

  try {
    console.log("🔌 Connecting to MCP...");

    const tools = await client.listTools();

    console.log("\n📦 Available MCP Tools:");

    for (const tool of tools) {
      console.log(`\n🔧 ${tool.name}`);
      console.log(`   ${tool.description ?? "No description"}`);
    }
  } catch (error) {
    console.error("\n❌ MCP test failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await client.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Unexpected error:", error);
  process.exitCode = 1;
});