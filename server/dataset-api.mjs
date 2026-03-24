import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const datasetPath = path.join(repoRoot, "data", "processed", "cassava-dataset.json");

const host = process.env.DATASET_API_HOST || "127.0.0.1";
const port = Number(process.env.DATASET_API_PORT || 8080);

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
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 20)));
      const regionFilter = (url.searchParams.get("region") || "").trim().toLowerCase();

      let records = dataset.records || [];
      if (regionFilter) {
        records = records.filter((record) => String(record.region).toLowerCase().includes(regionFilter));
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
      const totalQtyTons = Number((summary.totalQuantityKg || 0) / 1000).toLocaleString();

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

server.listen(port, host, () => {
  console.log(`[dataset-api] listening on http://${host}:${port}`);
  console.log(`[dataset-api] source file: ${datasetPath}`);
});
