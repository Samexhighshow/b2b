/**
 * setup-and-test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Full end-to-end setup & smoke test for CassavaSupplyChain on Ganache:
 *
 *  1. Checks Ganache is reachable on http://127.0.0.1:7545
 *  2. Compiles & deploys CassavaSupplyChain.sol
 *  3. Writes contract-address.json and abi.json into ui/src/
 *  4. Assigns FARMER role to the deployer wallet (so createBatch works)
 *  5. Creates 3 test batches, transfers one, updates statuses
 *  6. Reads them back and prints a pass/fail summary
 *
 * Usage:
 *   $env:GANACHE_PRIVATE_KEY="0x<your key>"; node scripts/setup-and-test.mjs
 *
 * Or just run:   npm run setup:test   (after adding the script to package.json)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot  = path.resolve(__dirname, "..");
const UI_SRC    = path.join(repoRoot, "ui", "src");

const RPC_URL  = "http://127.0.0.1:7545";
const CHAIN_ID = 1337;

// ── helpers ──────────────────────────────────────────────────────────────────

const log  = (msg) => console.log(`\n✅  ${msg}`);
const warn = (msg) => console.log(`⚠️   ${msg}`);
const fail = (msg) => { console.error(`\n❌  ${msg}`); process.exit(1); };

function section(title) {
  console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`);
}

async function ganacheReachable() {
  try {
    const res = await fetch(RPC_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
      signal:  AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return typeof data.result === "string";
  } catch {
    return false;
  }
}

// ── 1. Pre-flight ─────────────────────────────────────────────────────────────

section("1 / 6 — Pre-flight checks");

const privateKey = process.env.GANACHE_PRIVATE_KEY?.trim();
if (!privateKey) {
  fail(
    "GANACHE_PRIVATE_KEY is not set.\n" +
    "  PowerShell:  $env:GANACHE_PRIVATE_KEY='0x<your key>'; node scripts/setup-and-test.mjs\n" +
    "  Tip:         Your key is in ui/.env on the GANACHE_PRIVATE_KEY line."
  );
}

const isRunning = await ganacheReachable();
if (!isRunning) {
  fail(
    "Ganache is NOT running on http://127.0.0.1:7545\n" +
    "  → Open the Ganache desktop app and click 'Quickstart' (Chain ID 1337, port 7545)\n" +
    "  → OR run:  npx ganache --port 7545 --chain.chainId 1337"
  );
}
log("Ganache is running on http://127.0.0.1:7545");

// ── 2. Connect wallet ─────────────────────────────────────────────────────────

section("2 / 6 — Connecting wallet");

const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: "ganache" });
const wallet   = new ethers.Wallet(privateKey, provider);
const address  = await wallet.getAddress();
const balance  = await provider.getBalance(address);

console.log(`  Address : ${address}`);
console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);

if (balance === 0n) {
  fail("Wallet has 0 ETH — it may not be a Ganache account. Check your private key.");
}
log(`Wallet ready (${ethers.formatEther(balance)} ETH)`);

// ── 3. Deploy contract ────────────────────────────────────────────────────────

section("3 / 6 — Deploying CassavaSupplyChain");

const artifactPath = path.join(
  repoRoot, "artifacts", "contracts",
  "CassavaSupplyChain.sol", "CassavaSupplyChain.json"
);

let artifact;
try {
  artifact = JSON.parse(await readFile(artifactPath, "utf8"));
} catch {
  fail(
    "Compiled artifact not found. Run Hardhat compile first:\n" +
    "  npx hardhat compile"
  );
}

const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

const contractAddress = await contract.getAddress();
console.log(`  Contract address: ${contractAddress}`);

// Write ui/src files
await mkdir(UI_SRC, { recursive: true });

await writeFile(
  path.join(UI_SRC, "contract-address.json"),
  JSON.stringify({ CassavaSupplyChain: contractAddress, chainId: CHAIN_ID }, null, 2),
  "utf8"
);

await writeFile(
  path.join(UI_SRC, "abi.json"),
  JSON.stringify(artifact.abi, null, 2),
  "utf8"
);

log(`Contract deployed → ${contractAddress}`);
log("Wrote ui/src/contract-address.json and ui/src/abi.json");

// ── 4. Assign FARMER role to deployer ────────────────────────────────────────

section("4 / 6 — Assigning FARMER role to deployer wallet");

// Role enum: NONE=0, FARMER=1, PROCESSOR=2, DISTRIBUTOR=3, RETAILER=4, ADMIN=5
const tx1 = await contract.assignRole(address, 1n); // Role.FARMER = 1
await tx1.wait();

const role = await contract.roles(address);
if (Number(role) !== 1) {
  fail("Role assignment did not stick. Got role: " + role.toString());
}
log(`FARMER role assigned to ${address} (role index = ${role})`);

// ── 5. Create test batches + operations ──────────────────────────────────────

section("5 / 6 — Creating test batches & operations");

const testBatches = [
  { id: 1001n, origin: "Ibadan, Oyo State",    qty: 2500n },
  { id: 1002n, origin: "Enugu, Enugu State",    qty: 1800n },
  { id: 1003n, origin: "Owerri, Imo State",     qty: 3200n },
];

for (const b of testBatches) {
  const tx = await contract.createBatch(b.id, b.origin, b.qty);
  await tx.wait();
  console.log(`  Created batch #${b.id} — ${b.origin} (${b.qty} kg)`);
}
log("3 test batches created on-chain");

// Update status of batch 1001 → PROCESSED (1)
const tx2 = await contract.updateStatus(1001n, 1n);
await tx2.wait();
console.log("  Updated batch #1001 status → PROCESSED");

// Update status of batch 1002 → IN_TRANSIT (2)
const tx3 = await contract.updateStatus(1002n, 2n);
await tx3.wait();
console.log("  Updated batch #1002 status → IN_TRANSIT");

// Get account[1] from Ganache as a transfer target
let transferTarget = null;
try {
  const accounts = await provider.send("eth_accounts", []);
  transferTarget = accounts.find((a) => a.toLowerCase() !== address.toLowerCase());
} catch { /* ignore */ }

if (transferTarget) {
  const tx4 = await contract.transferOwnership(1003n, transferTarget);
  await tx4.wait();
  console.log(`  Transferred batch #1003 ownership → ${transferTarget}`);
} else {
  warn("Could not get a second account from Ganache — skipping ownership transfer test.");
}

log("All batch operations completed");

// ── 6. Verify by reading back ─────────────────────────────────────────────────

section("6 / 6 — Verification: reading batches back from chain");

const STATUS_LABELS = ["CREATED", "PROCESSED", "IN_TRANSIT", "DELIVERED"];
let allPassed = true;

for (const b of testBatches) {
  try {
    const data = await contract.getBatch(b.id);
    const onChainId  = data[0].toString();
    const onChainOrg = data[1];
    const onChainQty = data[2].toString();
    const statusIdx  = Number(data[5]);

    const pass = (
      onChainId  === b.id.toString() &&
      onChainOrg === b.origin &&
      onChainQty === b.qty.toString()
    );

    if (pass) {
      console.log(`  ✅  Batch #${b.id} → ${onChainOrg} | ${onChainQty} kg | Status: ${STATUS_LABELS[statusIdx]}`);
    } else {
      console.log(`  ❌  Batch #${b.id} mismatch — got id=${onChainId} origin="${onChainOrg}" qty=${onChainQty}`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌  Batch #${b.id} read error: ${err.message}`);
    allPassed = false;
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
if (allPassed) {
  console.log("  🎉  ALL TESTS PASSED — dApp is ready to use!");
} else {
  console.log("  ❌  Some tests failed — review the output above.");
}
console.log("═".repeat(60));

console.log(`
  Next steps:
  ─────────────────────────────────────────────────────────
  1. Keep Ganache running (don't close it!)
  2. Start the dataset API:   npm run api:dataset
  3. Start the UI:            cd ui && npm run dev
  4. Open MetaMask → switch to Ganache (Chain ID 1337)
  5. Import this private key into MetaMask:
     ${privateKey}
  6. Open http://localhost:5173 and you're good to go!
  ─────────────────────────────────────────────────────────
`);
