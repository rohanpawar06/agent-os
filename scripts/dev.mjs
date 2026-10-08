import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { request as httpRequest } from "node:http";

const isWindows = process.platform === "win32";
const configuredApiBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL;
const preferredBackendPort = Number(process.env.AGENTOS_BACKEND_PORT ?? (configuredApiBase ? new URL(configuredApiBase).port || 8080 : 8080));
const preferredFrontendPort = Number(process.env.AGENTOS_FRONTEND_PORT ?? "3000");
let backendPort = preferredBackendPort;
let apiBase = configuredApiBase ?? `http://127.0.0.1:${backendPort}`;
let frontendPort = preferredFrontendPort;
function startCommand(command, args, options) {
  if (isWindows) {
    return spawn("cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], options);
  }
  return spawn(command, args, options);
}

let backend;
let frontend;
let stopping = false;

function stop(child) {
  if (!child?.pid) return;
  if (isWindows) {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    killer.unref();
  } else {
    child.kill("SIGTERM");
  }
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  stop(frontend);
  stop(backend);
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
async function waitForBackend() {
  const deadline = Date.now() + 180_000;
  while (!stopping && Date.now() < deadline) {
    if (backend.exitCode !== null) throw new Error("Spring Boot exited before the API became ready.");
    const ready = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port: backendPort });
      socket.setTimeout(1_500);
      socket.on("connect", () => { socket.destroy(); resolve(true); });
      socket.on("timeout", () => { socket.destroy(); resolve(false); });
      socket.on("error", () => resolve(false));
    });
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Spring Boot did not become ready within three minutes.");
}

function portAcceptsConnections(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(1_000);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => resolve(false));
  });
}

function isAgentOsApiReady(port) {
  if (isWindows) {
    const script = "$ErrorActionPreference = 'Stop'; try { $uri = 'http://127.0.0.1:' + $env:AGENTOS_PROBE_PORT + '/api/status'; $status = Invoke-RestMethod -Uri $uri -TimeoutSec 2; if ($status.apiVersion -eq 1) { exit 0 } } catch { }; exit 1";
    return new Promise((resolve) => {
      const checker = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
        env: { ...process.env, AGENTOS_PROBE_PORT: String(port) },
        stdio: "ignore",
        windowsHide: true,
      });
      checker.on("error", () => resolve(false));
      checker.on("exit", (code) => resolve(code === 0));
    });
  }
  return new Promise((resolve) => {
    const request = httpRequest(`http://127.0.0.1:${port}/api/status`, { method: "GET", timeout: 2_000 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { resolve(response.statusCode === 200 && JSON.parse(body).apiVersion === 1); }
        catch { resolve(false); }
      });
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(false));
    request.end();
  });
}

async function selectBackend() {
  for (let port = preferredBackendPort; port < preferredBackendPort + 20; port += 1) {
    if (!(await portAcceptsConnections("127.0.0.1", port))) return { port, existing: false };
    if (await isAgentOsApiReady(port)) return { port, existing: true };
    if (configuredApiBase) throw new Error(`The configured API URL ${configuredApiBase} is occupied by a service that is not the current AgentOS backend.`);
    console.warn(`Port ${port} is occupied by another service; checking the next local port.`);
  }
  throw new Error("No free local backend port was found between the configured port and the next 20 ports.");
}

async function selectFrontendPort() {
  for (let port = preferredFrontendPort; port < preferredFrontendPort + 20; port += 1) {
    if (!(await portAcceptsConnections("127.0.0.1", port))) return port;
    console.warn(`Port ${port} is occupied; checking the next browser port.`);
  }
  throw new Error("No free local frontend port was found between the configured port and the next 20 ports.");
}

try {
  const selectedBackend = await selectBackend();
  backendPort = selectedBackend.port;
  apiBase = configuredApiBase ?? `http://127.0.0.1:${backendPort}`;
  frontendPort = await selectFrontendPort();
  if (selectedBackend.existing) {
    console.log(`Spring Boot is already ready at ${apiBase}.`);
  } else {
    console.log("Starting AgentOS Spring Boot backend...");
    backend = startCommand("mvn", ["-f", "backend/pom.xml", "spring-boot:run"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        AGENTOS_BACKEND_PORT: String(backendPort),
        AGENTOS_FRONTEND_ORIGINS: process.env.AGENTOS_FRONTEND_ORIGINS ?? "http://127.0.0.1:*,http://localhost:*",
      },
    });
    backend.on("error", (error) => {
      console.error(`Could not start Maven: ${error.message}`);
      shutdown(1);
    });
    backend.on("exit", (code) => {
      if (!stopping) {
        console.error(`Spring Boot stopped${code === null ? "" : ` with exit code ${code}`}.`);
        shutdown(code ?? 1);
      }
    });
    await waitForBackend();
    console.log(`Spring Boot is ready at ${apiBase}.`);
  }
  console.log(`Starting the browser UI at http://127.0.0.1:${frontendPort}...`);
  frontend = startCommand("npm", ["run", "dev", "--prefix", "./frontend", "--", "--port", String(frontendPort)], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_AGENTOS_API_URL: apiBase,
      AGENTOS_BACKEND_PORT: String(backendPort),
    },
  });
  frontend.on("error", (error) => {
    console.error(`Could not start the frontend: ${error.message}`);
    shutdown(1);
  });
  frontend.on("exit", (code) => shutdown(code ?? 0));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  shutdown(1);
}
