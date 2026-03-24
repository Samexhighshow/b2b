import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Auto-fallback port strategy:
// 1. Try configured DATASET_API_PORT (default 3030)
// 2. If busy but our API already running there, exit success
// 3. If busy with other app, auto-try next ports (3031, 3032, ...)
// 4. Automatically update ui/.env VITE_DATASET_API_URL to match actual port
// Result: UI is always synchronized with API endpoint

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const datasetPath = path.join(
  repoRoot,
  "data",
  "processed",
  "cassava-dataset.json",
);

const host = process.env.DATASET_API_HOST || "127.0.0.1";
let port = Number(process.env.DATASET_API_PORT || 3030);
const uiEnvPath = path.join(repoRoot, "ui", ".env");

async function isDatasetApiRunning(targetHost, targetPort) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`http://${targetHost}:${targetPort}/health`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload?.service === "cassava-dataset-api";
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function findAvailablePort(startPort, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidatePort = startPort + attempt;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

    try {
      const response = await fetch(`http://${host}:${candidatePort}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = await response.json();
        if (payload?.service === "cassava-dataset-api") {
          return { port: candidatePort, status: "already-running" };
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    const { createConnection } = await import("node:net");
    try {
      return await new Promise((resolve, reject) => {
        const socket = createConnection(candidatePort, host);
        socket.on("connect", () => {
          socket.destroy();
          reject(new Error("port-in-use"));
        });
        socket.on("error", () => {
          resolve({ port: candidatePort, status: "available" });
        });
        setTimeout(() => {
          socket.destroy();
          reject(new Error("timeout"));
        }, 300);
      });
    } catch (error) {
      if (error?.message === "port-in-use") continue;
      continue;
    }
  }

  return null;
}

async function updateUiEnvApiUrl(newPort) {
  try {
    let envContent = await readFile(uiEnvPath, "utf8");
    const newUrl = `http://127.0.0.1:${newPort}`;
    envContent = envContent.replace(
      /VITE_DATASET_API_URL=.+/,
      `VITE_DATASET_API_URL=${newUrl}`,
    );
    await import("node:fs/promises")
      .then((m) => m.writeFile(uiEnvPath, envContent, "utf8"))
      .catch(() => {});
  } catch {}
}

async function loadDataset() {
  const fileText = await readFile(datasetPath, "utf8");
  return JSON.parse(fileText);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(response) {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end();
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Invalid request URL." });
    return;
  }

  if (request.method === "OPTIONS") {
    sendNoContent(response);
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "cassava-dataset-api",
      time: new Date().toISOString(),
    });
    return;
  }

  try {
    const dataset = await loadDataset();

    if (url.pathname === "/api/dataset/summary") {
      sendJson(response, 200, {
        generatedAt: dataset.generatedAt,
        source: dataset.source,
        summary: dataset.summary,
      });
      return;
    }

    if (url.pathname === "/api/dataset/records") {
      const limit = Math.max(
        1,
        Math.min(200, Number(url.searchParams.get("limit") || 20)),
      );
      const regionFilter = (url.searchParams.get("region") || "")
        .trim()
        .toLowerCase();

      let records = dataset.records || [];
      if (regionFilter) {
        records = records.filter((record) =>
          String(record.region).toLowerCase().includes(regionFilter),
        );
      }

      sendJson(response, 200, {
        generatedAt: dataset.generatedAt,
        source: dataset.source,
        count: records.length,
        records: records.slice(0, limit),
      });
      return;
    }

    if (url.pathname === "/api/dataset/challenges") {
      const summary = dataset.summary || {};
      const totalQtyTons = Number(
        (summary.totalQuantityKg || 0) / 1000,
      ).toLocaleString();

      sendJson(response, 200, {
        generatedAt: dataset.generatedAt,
        insights: [
          `Post-harvest loss pressure is estimated at ${summary.avgLossPct ?? 0}% across sampled records.`,
          `Transport latency averages ${summary.avgTransportHours ?? 0} hours, impacting freshness and traceability windows.`,
          `Observed cassava volume in dataset: ${totalQtyTons} tonnes, requiring coordinated multi-stakeholder data sharing.`,
        ],
      });
      return;
    }

    sendJson(response, 404, { error: "Route not found." });
  } catch (error) {
    sendJson(response, 500, {
      error: "Dataset is not available. Run: npm run dataset:build",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

server.on("error", async (error) => {
  if (error?.code !== "EADDRINUSE") {
    console.error("[dataset-api] failed to start:", error);
    process.exit(1);
    return;
  }

  const alreadyRunning = await isDatasetApiRunning(host, port);
  if (alreadyRunning) {
    console.log(`[dataset-api] already running on http://${host}:${port}`);
    console.log("[dataset-api] startup check: successful");
    process.exit(0);
    return;
  }

  console.log(
    `[dataset-api] port ${port} is in use, searching for available port...`,
  );
  const result = await findAvailablePort(port, 5);

  if (!result) {
    console.error(
      `[dataset-api] no available ports found (tried ${port}–${port + 4}). ` +
        "Kill blocking process or set DATASET_API_PORT.",
    );
    process.exit(1);
    return;
  }

  if (result.status === "already-running") {
    console.log(
      `[dataset-api] our service already running on http://${host}:${result.port}`,
    );
    console.log("[dataset-api] startup check: successful");
    process.exit(0);
    return;
  }

  port = result.port;
  await updateUiEnvApiUrl(port);
  console.log(
    `[dataset-api] using fallback port ${port}. Updated ui/.env VITE_DATASET_API_URL.`,
  );
  server.listen(port, host);
});

server.listen(port, host, () => {
  updateUiEnvApiUrl(port);
  console.log(`[dataset-api] listening on http://${host}:${port}`);
  console.log(`[dataset-api] source file: ${datasetPath}`);
  console.log(
    `[dataset-api] ui/.env updated with VITE_DATASET_API_URL=http://${host}:${port}`,
  );
});
