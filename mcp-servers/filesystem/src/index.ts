import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================
// AgentOS Workspace
// ============================================================

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

/*
  Compiled file:

  agent-os/
  └── mcp-servers/
      └── filesystem/
          └── dist/
              └── index.js  <-- current file

  We need to reach:

  agent-os/
  └── workspace/
*/

const workspace = path.resolve(
  currentDirectory,
  "../../../workspace"
);

// ============================================================
// Security Helper
// ============================================================

function resolveWorkspacePath(relativePath: string): string {
  if (!relativePath || relativePath.trim() === "") {
    throw new Error("Path cannot be empty.");
  }

  const resolvedPath = path.resolve(
    workspace,
    relativePath
  );

  // Prevent path traversal outside workspace
  if (
    resolvedPath !== workspace &&
    !resolvedPath.startsWith(workspace + path.sep)
  ) {
    throw new Error(
      "Access denied: path is outside the AgentOS workspace."
    );
  }

  return resolvedPath;
}

// ============================================================
// MCP Server
// ============================================================

const server = new Server(
  {
    name: "agentos-filesystem",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================
// Tool Discovery
// ============================================================

server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    return {
      tools: [
        // --------------------------------------------------
        // CREATE DIRECTORY
        // --------------------------------------------------

        {
          name: "create_directory",

          description:
            "Create a directory inside the AgentOS workspace.",

          inputSchema: {
            type: "object",

            properties: {
              name: {
                type: "string",
                description:
                  "Relative directory path inside the workspace.",
              },
            },

            required: ["name"],
          },
        },

        // --------------------------------------------------
        // WRITE FILE
        // --------------------------------------------------

        {
          name: "write_file",

          description:
            "Create or overwrite a file inside the AgentOS workspace.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative file path inside the workspace.",
              },

              content: {
                type: "string",
                description:
                  "Content to write into the file.",
              },
            },

            required: ["path", "content"],
          },
        },

        // --------------------------------------------------
        // READ FILE
        // --------------------------------------------------

        {
          name: "read_file",

          description:
            "Read a text file from the AgentOS workspace.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative file path inside the workspace.",
              },
            },

            required: ["path"],
          },
        },

        // --------------------------------------------------
        // LIST DIRECTORY
        // --------------------------------------------------

        {
          name: "list_directory",

          description:
            "List files and directories inside the AgentOS workspace.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative directory path. Use '.' for workspace root.",
              },
            },

            required: ["path"],
          },
        },

        // --------------------------------------------------
        // DELETE FILE
        // --------------------------------------------------

        {
          name: "delete_file",

          description:
            "Delete a file inside the AgentOS workspace.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative file path inside the workspace.",
              },
            },

            required: ["path"],
          },
        },
      ],
    };
  }
);

// ============================================================
// Tool Execution
// ============================================================

server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    const toolName = request.params.name;

    const args =
      (request.params.arguments ?? {}) as Record<
        string,
        unknown
      >;

    // ========================================================
    // CREATE DIRECTORY
    // ========================================================

    if (toolName === "create_directory") {
      const name = args.name;

      if (typeof name !== "string") {
        throw new Error(
          "Directory name must be a string."
        );
      }

      const directoryPath =
        resolveWorkspacePath(name);

      await fs.mkdir(directoryPath, {
        recursive: true,
      });

      return {
        content: [
          {
            type: "text",
            text:
              `Directory created successfully: ${name}`,
          },
        ],
      };
    }

    // ========================================================
    // WRITE FILE
    // ========================================================

    if (toolName === "write_file") {
      const filePath = args.path;
      const content = args.content;

      if (typeof filePath !== "string") {
        throw new Error(
          "File path must be a string."
        );
      }

      if (typeof content !== "string") {
        throw new Error(
          "File content must be a string."
        );
      }

      const resolvedPath =
        resolveWorkspacePath(filePath);

      // Make sure parent directory exists
      await fs.mkdir(
        path.dirname(resolvedPath),
        {
          recursive: true,
        }
      );

      await fs.writeFile(
        resolvedPath,
        content,
        "utf-8"
      );

      return {
        content: [
          {
            type: "text",
            text:
              `File written successfully: ${filePath}`,
          },
        ],
      };
    }

    // ========================================================
    // READ FILE
    // ========================================================

    if (toolName === "read_file") {
      const filePath = args.path;

      if (typeof filePath !== "string") {
        throw new Error(
          "File path must be a string."
        );
      }

      const resolvedPath =
        resolveWorkspacePath(filePath);

      const content =
        await fs.readFile(
          resolvedPath,
          "utf-8"
        );

      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    }

    // ========================================================
    // LIST DIRECTORY
    // ========================================================

    if (toolName === "list_directory") {
      const directory =
        args.path ?? ".";

      if (typeof directory !== "string") {
        throw new Error(
          "Directory path must be a string."
        );
      }

      const resolvedPath =
        directory === "."
          ? workspace
          : resolveWorkspacePath(directory);

      const entries =
        await fs.readdir(
          resolvedPath,
          {
            withFileTypes: true,
          }
        );

      const result = entries.map(
        (entry) => ({
          name: entry.name,
          type: entry.isDirectory()
            ? "directory"
            : "file",
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              result,
              null,
              2
            ),
          },
        ],
      };
    }

    // ========================================================
    // DELETE FILE
    // ========================================================

    if (toolName === "delete_file") {
      const filePath = args.path;

      if (typeof filePath !== "string") {
        throw new Error(
          "File path must be a string."
        );
      }

      const resolvedPath =
        resolveWorkspacePath(filePath);

      await fs.unlink(
        resolvedPath
      );

      return {
        content: [
          {
            type: "text",
            text:
              `File deleted successfully: ${filePath}`,
          },
        ],
      };
    }

    // ========================================================
    // UNKNOWN TOOL
    // ========================================================

    throw new Error(
      `Unknown tool: ${toolName}`
    );
  }
);

// ============================================================
// Start MCP Server
// ============================================================

const transport =
  new StdioServerTransport();

await server.connect(
  transport
);