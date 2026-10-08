import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
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
function getWindowsDesktopPath(): string | undefined {
  if (process.platform !== "win32") return undefined;

  try {
    const knownFolder = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", "[Environment]::GetFolderPath('Desktop')"],
      { encoding: "utf8", timeout: 5_000, windowsHide: true }
    ).trim();
    return knownFolder || undefined;
  } catch {
    return undefined;
  }
}

const desktopCandidates = [
  process.env.OneDrive ? path.join(process.env.OneDrive, "Desktop") : undefined,
  path.join(os.homedir(), "OneDrive", "Desktop"),
  path.join(os.homedir(), "Desktop"),
].filter((candidate): candidate is string => !!candidate);
const desktop = path.resolve(
  process.env.AGENTOS_DESKTOP_PATH ??
    getWindowsDesktopPath() ??
    desktopCandidates.find(existsSync) ??
    path.join(os.homedir(), "Desktop")
);

// ============================================================
// Security Helper
// ============================================================

async function resolveWorkspacePath(relativePath: string): Promise<string> {
  if (!relativePath || relativePath.trim() === "") {
    throw new Error("Path cannot be empty.");
  }

  const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  const desktopPrefix = /^desktop(?:\/|$)/i.test(normalizedPath);
  const root = desktopPrefix ? desktop : workspace;
  const relativeToRoot = desktopPrefix
    ? normalizedPath.replace(/^desktop\/?/i, "")
    : normalizedPath;
  const resolvedPath = path.resolve(root, relativeToRoot);

  // Keep tools inside the project workspace or the explicitly supported Desktop folder.
  if (
    resolvedPath !== root &&
    !resolvedPath.startsWith(root + path.sep)
  ) {
    throw new Error(
      "Access denied: use a path inside workspace/ or Desktop/."
    );
  }

  const [realRoot, realPath] = await Promise.all([
    resolveWithMissingSegments(root),
    resolveWithMissingSegments(resolvedPath),
  ]);
  const relativeToRealRoot = path.relative(realRoot, realPath);
  if (relativeToRealRoot === ".." || relativeToRealRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRealRoot)) {
    throw new Error("Access denied: symbolic links cannot escape workspace/ or Desktop/.");
  }

  return resolvedPath;
}

async function resolveWithMissingSegments(targetPath: string): Promise<string> {
  const missingSegments: string[] = [];
  let currentPath = targetPath;

  while (true) {
    try {
      const realAncestor = await fs.realpath(currentPath);
      return path.resolve(realAncestor, ...missingSegments.reverse());
    } catch (error) {
      if (!isMissingPath(error)) throw error;
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) throw error;
      missingSegments.push(path.basename(currentPath));
      currentPath = parentPath;
    }
  }
}

function isMissingPath(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

function ensureNotRoot(resolvedPath: string): void {
  if (resolvedPath === workspace || resolvedPath === desktop) {
    throw new Error("Access denied: the workspace and Desktop roots cannot be changed or deleted.");
  }
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
            "Create a directory inside workspace/ or Desktop/. Prefix Desktop paths with Desktop/.",

          inputSchema: {
            type: "object",

            properties: {
              name: {
                type: "string",
                description:
                  "Relative path inside workspace/, or prefix with Desktop/ for the Desktop folder.",
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
            "Create or overwrite a file inside workspace/ or Desktop/. Prefix Desktop paths with Desktop/.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative path inside workspace/, or prefix with Desktop/ for the Desktop folder.",
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
            "Read a text file inside workspace/ or Desktop/. Prefix Desktop paths with Desktop/.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative path inside workspace/, or prefix with Desktop/ for the Desktop folder.",
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
            "List files and directories inside workspace/ or Desktop/. Use Desktop/ to list the Desktop folder.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative path inside workspace/. Use '.' for workspace root or Desktop/ to list Desktop.",
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
            "Delete a file inside workspace/ or Desktop/. Prefix Desktop paths with Desktop/.",

          inputSchema: {
            type: "object",

            properties: {
              path: {
                type: "string",
                description:
                  "Relative path inside workspace/, or prefix with Desktop/ for the Desktop folder.",
              },
            },

            required: ["path"],
          },
        },

        {
          name: "delete_path",
          description: "Delete a file or folder inside workspace/ or Desktop/. Folder deletion is recursive.",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File or folder path inside workspace/ or Desktop/." },
            },
            required: ["path"],
          },
        },

        {
          name: "copy_path",
          description: "Copy a file or folder to another path inside workspace/ or Desktop/. Destination is the exact new path.",
          inputSchema: {
            type: "object",
            properties: {
              source: { type: "string", description: "Existing source path inside workspace/ or Desktop/." },
              destination: { type: "string", description: "New destination path inside workspace/ or Desktop/." },
            },
            required: ["source", "destination"],
          },
        },

        {
          name: "move_path",
          description: "Move or rename a file or folder to another path inside workspace/ or Desktop/. Destination is the exact new path.",
          inputSchema: {
            type: "object",
            properties: {
              source: { type: "string", description: "Existing source path inside workspace/ or Desktop/." },
              destination: { type: "string", description: "New destination path inside workspace/ or Desktop/." },
            },
            required: ["source", "destination"],
          },
        },

        {
          name: "search_files",
          description: "Search file and folder names recursively inside workspace/ or Desktop/.",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Directory to search, such as '.' or 'Desktop/'." },
              query: { type: "string", description: "Text to match in file and folder names." },
            },
            required: ["path", "query"],
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

      const directoryPath = await resolveWorkspacePath(name);

      await fs.mkdir(directoryPath, {
        recursive: true,
      });

      return {
        content: [
          {
            type: "text",
            text: `Directory created successfully: ${directoryPath}`,
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

      const resolvedPath = await resolveWorkspacePath(filePath);

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
              `File written successfully: ${resolvedPath}`,
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

      const resolvedPath = await resolveWorkspacePath(filePath);

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
          : await resolveWorkspacePath(directory);

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
            text: JSON.stringify({ path: resolvedPath, entries: result }, null, 2),
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

      const resolvedPath = await resolveWorkspacePath(filePath);
      ensureNotRoot(resolvedPath);

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

    if (toolName === "delete_path") {
      const filePath = args.path;
      if (typeof filePath !== "string") throw new Error("Path must be a string.");
      const resolvedPath = await resolveWorkspacePath(filePath);
      ensureNotRoot(resolvedPath);
      await fs.rm(resolvedPath, { recursive: true, force: false });
      return { content: [{ type: "text", text: `Deleted successfully: ${resolvedPath}` }] };
    }

    if (toolName === "copy_path" || toolName === "move_path") {
      const source = args.source;
      const destination = args.destination;
      if (typeof source !== "string" || typeof destination !== "string") {
        throw new Error("Source and destination must be strings.");
      }
      const [sourcePath, destinationPath] = await Promise.all([
        resolveWorkspacePath(source),
        resolveWorkspacePath(destination),
      ]);
      ensureNotRoot(sourcePath);
      ensureNotRoot(destinationPath);
      if (sourcePath === destinationPath) throw new Error("Source and destination must be different paths.");
      try {
        await fs.lstat(destinationPath);
        throw new Error(`Destination already exists: ${destinationPath}`);
      } catch (error) {
        if (!isMissingPath(error)) throw error;
      }
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });

      if (toolName === "copy_path") {
        await fs.cp(sourcePath, destinationPath, { recursive: true, errorOnExist: true, force: false });
      } else {
        try {
          await fs.rename(sourcePath, destinationPath);
        } catch (error) {
          if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EXDEV") throw error;
          await fs.cp(sourcePath, destinationPath, { recursive: true, errorOnExist: true, force: false });
          await fs.rm(sourcePath, { recursive: true, force: false });
        }
      }

      const verb = toolName === "copy_path" ? "Copied" : "Moved";
      return { content: [{ type: "text", text: `${verb} ${sourcePath} to ${destinationPath}` }] };
    }

    if (toolName === "search_files") {
      const directory = args.path;
      const query = args.query;
      if (typeof directory !== "string" || typeof query !== "string" || !query.trim()) {
        throw new Error("A directory path and non-empty search query are required.");
      }
      const rootPath = directory === "." ? workspace : await resolveWorkspacePath(directory);
      const directoryAlias = directory.replace(/\\/g, "/").replace(/\/+$/, "") || ".";
      const matches: Array<{ name: string; path: string; type: "directory" | "file" }> = [];
      const pending = [rootPath];
      let scanned = 0;
      const maxScanned = 5_000;
      const needle = query.trim().toLocaleLowerCase();
      while (pending.length && scanned < maxScanned) {
        const currentPath = pending.pop()!;
        const children = await fs.readdir(currentPath, { withFileTypes: true });
        for (const child of children) {
          if (child.isSymbolicLink()) continue;
          scanned += 1;
          const childPath = path.join(currentPath, child.name);
          const type = child.isDirectory() ? "directory" : "file";
          if (child.name.toLocaleLowerCase().includes(needle)) {
            const relativePath = path.relative(rootPath, childPath).split(path.sep).join("/");
            matches.push({
              name: child.name,
              path: directoryAlias === "." ? relativePath : `${directoryAlias}/${relativePath}`,
              type,
            });
          }
          if (child.isDirectory()) pending.push(childPath);
          if (scanned >= maxScanned) break;
        }
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ path: rootPath, query: query.trim(), truncated: scanned >= maxScanned, entries: matches }, null, 2),
        }],
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
