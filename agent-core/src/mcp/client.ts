import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

export class MCPClient {
  private client = this.createClient();
  private transport: StdioClientTransport | null = null;
  private connected = false;
  private connectPromise: Promise<void> | null = null;
  private knownTools = new Set<string>();

  private createClient(): Client {
    return new Client({ name: "agentos-core", version: "1.0.0" }, { capabilities: {} });
  }

  private createTransport(): StdioClientTransport {
    const configuredPath = process.env.AGENTOS_FILESYSTEM_MCP_SERVER;
    const serverPath = configuredPath
      ? configuredPath
      : fileURLToPath(new URL("../../../mcp-servers/filesystem/dist/index.js", import.meta.url));
    return new StdioClientTransport({ command: process.execPath, args: [serverPath] });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connectPromise) return this.connectPromise;
    const transport = this.createTransport();
    this.transport = transport;
    this.connectPromise = this.client.connect(transport).then(() => {
      this.connected = true;
    }).catch(async (error: unknown) => {
      this.transport = null;
      try { await transport.close(); } catch { /* The transport may not have started. */ }
      this.client = this.createClient();
      throw error;
    }).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  async listTools() {
    await this.connect();
    const result = await this.client.listTools();
    this.knownTools = new Set(result.tools.map((tool) => tool.name));
    return result.tools;
  }

  async hasTool(toolName: string): Promise<boolean> {
    if (this.knownTools.size === 0) await this.listTools();
    return this.knownTools.has(toolName);
  }

  async callTool(name: string, arguments_: Record<string, unknown> = {}): Promise<unknown> {
    await this.connect();
    if (!(await this.hasTool(name))) throw new Error(`MCP tool "${name}" is not available.`);
    const result = await this.client.callTool({ name, arguments: arguments_ });
    if (result.isError) {
      const details = (
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content) ?? ""
      ).slice(0, 500);
      throw new Error(details || `MCP tool "${name}" reported an error.`);
    }
    return result;
  }

  async disconnect(): Promise<void> {
    if (this.connectPromise) await this.connectPromise.catch(() => undefined);
    if (this.transport) {
      const transport = this.transport;
      this.transport = null;
      try {
        await transport.close();
      } finally {
        this.connected = false;
        this.knownTools.clear();
        this.client = this.createClient();
      }
    }
  }
}
