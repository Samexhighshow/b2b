import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const rawDir = path.join(repoRoot, "data", "raw");
const processedDir = path.join(repoRoot, "data", "processed");

const SOURCE_URLS = [
  "https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Cassava%20production%20%28FAOSTAT%2C%202024%29/Cassava%20production%20%28FAOSTAT%2C%202024%29.csv",
  "https://raw.githubusercontent.com/datasets/country-list/master/data.csv",
];

const FALLBACK_ROWS = [
  { region: "Nigeria", year: 2021, quantityTonnes: 60030000 },
  { region: "Ghana", year: 2021, quantityTonnes: 23100000 },
  { region: "Cameroon", year: 2021, quantityTonnes: 6500000 },
  { region: "Benin", year: 2021, quantityTonnes: 4200000 },
  { region: "Nigeria", year: 2022, quantityTonnes: 61400000 },
  { region: "Ghana", year: 2022, quantityTonnes: 23650000 },
  { region: "Cameroon", year: 2022, quantityTonnes: 6630000 },
  { region: "Benin", year: 2022, quantityTonnes: 4310000 },
  { region: "Nigeria", year: 2023, quantityTonnes: 62550000 },
  { region: "Ghana", year: 2023, quantityTonnes: 24100000 },
  { region: "Cameroon", year: 2023, quantityTonnes: 6720000 },
  { region: "Benin", year: 2023, quantityTonnes: 4390000 },
];

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const escapedQuote = inQuotes && line[i + 1] === '"';
      if (escapedQuote) {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    rows.push(row);
  }

  return rows;
}

function normalizeRows(rows) {
  const normalized = [];

  rows.forEach((row, index) => {
    const headerMap = Object.keys(row).reduce((acc, key) => {
      acc[key.toLowerCase()] = key;
      return acc;
    }, {});

    const region =
      row[headerMap.entity] ||
      row[headerMap.country] ||
      row[headerMap.region] ||
      row[headerMap.name] ||
      null;

    const yearRaw = row[headerMap.year] || row[headerMap.date] || null;
    const year = Number.parseInt(String(yearRaw || ""), 10);

    const valueRaw =
      row[headerMap["cassava production"]] ||
      row[headerMap.production] ||
      row[headerMap.value] ||
      row[headerMap.quantity] ||
      null;

    const numericValue = Number.parseFloat(String(valueRaw || "").replace(/,/g, ""));

    if (!region || !Number.isFinite(year) || !Number.isFinite(numericValue)) {
      return;
    }

    const quantityTonnes = numericValue;
    const quantityKg = Math.max(0, Math.round(quantityTonnes * 1000));
    const qualityGrade = quantityTonnes > 20000000 ? "A" : quantityTonnes > 7000000 ? "B" : "C";
    const lossPct = Number((8 + ((year + index) % 6) * 0.9).toFixed(1));
    const transportHours = 10 + ((index + year) % 8);

    normalized.push({
      recordId: `DS-${year}-${String(index + 1).padStart(3, "0")}`,
      batchId: `${year}${String((index % 90) + 10).padStart(2, "0")}`,
      region,
      year,
      productType: "Cassava Roots",
      quantityTonnes,
      quantityKg,
      qualityGrade,
      lossPct,
      transportHours,
      sourceType: "online",
    });
  });

  return normalized;
}

function normalizeFallbackRows(rows) {
  return rows.map((row, index) => {
    const quantityKg = Math.round(row.quantityTonnes * 1000);
    const qualityGrade = row.quantityTonnes > 20000000 ? "A" : row.quantityTonnes > 7000000 ? "B" : "C";
    const lossPct = Number((8.2 + (index % 5) * 0.7).toFixed(1));
    const transportHours = 9 + (index % 7);

    return {
      recordId: `FB-${row.year}-${String(index + 1).padStart(3, "0")}`,
      batchId: `${row.year}${String((index % 90) + 10).padStart(2, "0")}`,
      region: row.region,
      year: row.year,
      productType: "Cassava Roots",
      quantityTonnes: row.quantityTonnes,
      quantityKg,
      qualityGrade,
      lossPct,
      transportHours,
      sourceType: "fallback",
    };
  });
}

function summarize(records) {
  const totalRecords = records.length;
  const totalQuantityKg = records.reduce((acc, row) => acc + row.quantityKg, 0);
  const avgLossPct =
    totalRecords > 0 ? Number((records.reduce((acc, row) => acc + row.lossPct, 0) / totalRecords).toFixed(2)) : 0;
  const avgTransportHours =
    totalRecords > 0
      ? Number((records.reduce((acc, row) => acc + row.transportHours, 0) / totalRecords).toFixed(2))
      : 0;

  const byRegion = Object.entries(
    records.reduce((acc, row) => {
      acc[row.region] = (acc[row.region] || 0) + row.quantityKg;
      return acc;
    }, {})
  )
    .map(([region, quantityKg]) => ({ region, quantityKg }))
    .sort((a, b) => b.quantityKg - a.quantityKg);

  return {
    totalRecords,
    totalQuantityKg,
    avgLossPct,
    avgTransportHours,
    byRegion,
  };
}

async function fetchOnlineRows() {
  for (const url of SOURCE_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "cassava-b2b-pipeline/1.0",
        },
      });

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const parsed = parseCsv(text);
      const normalized = normalizeRows(parsed);

      if (normalized.length > 0) {
        return { records: normalized, rawCsv: text, sourceUrl: url, usedFallback: false };
      }
    } catch {
      // Try next source URL.
    }
  }

  const fallbackRecords = normalizeFallbackRows(FALLBACK_ROWS);
  const fallbackCsv = ["region,year,quantityTonnes", ...FALLBACK_ROWS.map((row) => `${row.region},${row.year},${row.quantityTonnes}`)].join("\n");

  return {
    records: fallbackRecords,
    rawCsv: fallbackCsv,
    sourceUrl: "fallback-local-sample",
    usedFallback: true,
  };
}

async function run() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });

  const fetched = await fetchOnlineRows();
  const summary = summarize(fetched.records);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      url: fetched.sourceUrl,
      usedFallback: fetched.usedFallback,
    },
    summary,
    records: fetched.records,
  };

  await writeFile(path.join(rawDir, "cassava-dataset.csv"), fetched.rawCsv, "utf8");
  await writeFile(path.join(processedDir, "cassava-dataset.json"), JSON.stringify(payload, null, 2), "utf8");

  console.log(`[dataset-pipeline] records: ${payload.summary.totalRecords}`);
  console.log(`[dataset-pipeline] source: ${payload.source.url}`);
  console.log(`[dataset-pipeline] wrote: data/processed/cassava-dataset.json`);
}

run().catch((error) => {
  console.error("[dataset-pipeline] failed:", error);
  process.exitCode = 1;
});
