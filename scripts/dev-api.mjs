import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const apiDir = path.join(repoRoot, "apps", "api");
const defaultDb = path.join(apiDir, "pmo_ops_p1_schema.db");

const pythonCandidates = process.platform === "win32"
  ? [
      path.join(apiDir, ".venv", "Scripts", "python.exe"),
      "python",
    ]
  : [
      path.join(apiDir, ".venv", "bin", "python"),
      "python3",
      "python",
    ];

const python = pythonCandidates.find((candidate) => candidate === "python" || candidate === "python3" || existsSync(candidate));

if (!python) {
  console.error("[dev:api] Could not find a Python interpreter for the API server.");
  console.error("[dev:api] Expected one of:");
  for (const candidate of pythonCandidates) {
    console.error(`  - ${candidate}`);
  }
  console.error("[dev:api] If the virtual environment does not exist yet, run:");
  console.error("  cd apps/api");
  console.error("  python -m venv .venv");
  console.error("  .\\.venv\\Scripts\\python -m pip install -e .");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? `sqlite:///${defaultDb.replace(/\\/g, "/")}`,
};

console.error("[dev:api] Starting API server");
console.error(`[dev:api] repo root  : ${repoRoot}`);
console.error(`[dev:api] api dir    : ${apiDir}`);
console.error(`[dev:api] python     : ${python}`);
console.error(`[dev:api] database   : ${env.DATABASE_URL}`);

if (!existsSync(path.join(apiDir, ".venv"))) {
  console.error("[dev:api] Warning: apps/api/.venv does not exist yet.");
  console.error("[dev:api] Create it once with: cd apps/api && python -m venv .venv && .\\.venv\\Scripts\\python -m pip install -e .");
}

if (!existsSync(defaultDb)) {
  console.error("[dev:api] Warning: default SQLite DB file is missing.");
  console.error(`[dev:api] Expected path: ${defaultDb}`);
}

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8001"],
  {
    cwd: apiDir,
    env,
    stdio: "inherit",
  }
);

child.on("error", (error) => {
  console.error("[dev:api] Failed to start uvicorn.");
  console.error(`[dev:api] ${error.message}`);
  console.error("[dev:api] Check that the API virtual environment is installed and that uvicorn exists in it.");
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[dev:api] API server stopped by signal ${signal}.`);
    process.kill(process.pid, signal);
    return;
  }

  if ((code ?? 0) !== 0) {
    console.error(`[dev:api] API server exited with code ${code}.`);
  }

  process.exit(code ?? 0);
});
