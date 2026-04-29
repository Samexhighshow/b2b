/**
 * Full end-to-end setup and smoke test for CassavaSupplyChain on Ganache.
 *
 * Steps:
 *  1. Check Ganache is reachable on http://127.0.0.1:7545
 *  2. Deploy CassavaSupplyChain from the configured admin wallet
 *  3. Write contract-address.json and abi.json into ui/src/
 *  4. Assign FARMER, PROCESSOR, DISTRIBUTOR, and RETAILER roles
 *  5. Create 3 test batches and move them through valid stage transitions
 *  6. Read the batches back and print a pass/fail summary
 *
 * Usage:
 *   $env:GANACHE_PRIVATE_KEY="0x<your key>"; node scripts/setup-and-test.mjs
 *   npm run setup:test
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const uiSrc = path.join(repoRoot, "ui", "src");

const RPC_URL = "http://127.0.0.1:7545";
const CHAIN_ID = 1337;
const STATUS_LABELS = ["CREATED", "PROCESSED", "IN_TRANSIT", "DELIVERED"];
const ROLE_IDS = {
  FARMER: 1n,
  PROCESSOR: 2n,
  DISTRIBUTOR: 3n,
  RETAILER: 4n,
};

const log = (message) => console.log(`\n[ok] ${message}`);
const warn = (message) => console.log(`[warn] ${message}`);
const fail = (message) => {
  console.error(`\n[error] ${message}`);
  process.exit(1);
};

function section(title) {
  console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`);
}

async function ganacheReachable() {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
      signal: AbortSignal.timeout(4000),
    });

    const payload = await response.json();
    return typeof payload?.result === "string";
  } catch {
    return false;
  }
}

async function resolvePrivateKey() {
  let privateKey = process.env.GANACHE_PRIVATE_KEY?.trim();

  if (!privateKey) {
    try {
      const envPath = path.join(repoRoot, "ui", ".env");
      const envContent = await readFile(envPath, "utf8");
      const match = envContent.match(/GANACHE_PRIVATE_KEY\s*=\s*([^\r\n]+)/);
      if (match?.[1]) {
        privateKey = match[1].trim();
      }
    } catch {
      // Ignore missing local env file.
    }
  }

  if (!privateKey) {
    fail(
      "GANACHE_PRIVATE_KEY is not set in the environment or ui/.env.\n" +
      "Add GANACHE_PRIVATE_KEY=0x... for one of your Ganache accounts."
    );
  }

  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  return privateKey;
}

async function loadArtifact() {
  const artifactPath = path.join(
    repoRoot,
    "artifacts",
    "contracts",
    "CassavaSupplyChain.sol",
    "CassavaSupplyChain.json",
  );

  try {
    return JSON.parse(await readFile(artifactPath, "utf8"));
  } catch {
    fail("Compiled artifact not found. Run: npx hardhat compile");
  }
}

section("1 / 6 - Pre-flight checks");

const privateKey = await resolvePrivateKey();

if (!(await ganacheReachable())) {
  fail(
    "Ganache is not reachable on http://127.0.0.1:7545.\n" +
    "Open Ganache and start a workspace on chain ID 1337 and port 7545."
  );
}

log("Ganache RPC is reachable");

section("2 / 6 - Connecting admin wallet");

const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: "ganache" });
const adminWallet = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
const adminAddress = await adminWallet.getAddress();
const adminBalance = await provider.getBalance(adminAddress);

console.log(`Admin address: ${adminAddress}`);
console.log(`Admin balance: ${ethers.formatEther(adminBalance)} ETH`);

if (adminBalance === 0n) {
  fail("Configured admin wallet has 0 ETH. Use a funded Ganache private key.");
}

log("Admin wallet is funded and ready");

section("3 / 6 - Deploying CassavaSupplyChain");

const artifact = await loadArtifact();
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, adminWallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

const contractAddress = await contract.getAddress();
console.log(`Contract address: ${contractAddress}`);

await mkdir(uiSrc, { recursive: true });
await writeFile(
  path.join(uiSrc, "contract-address.json"),
  JSON.stringify({ CassavaSupplyChain: contractAddress, chainId: CHAIN_ID }, null, 2),
  "utf8",
);
await writeFile(path.join(uiSrc, "abi.json"), JSON.stringify(artifact.abi, null, 2), "utf8");

log("Deployment complete and UI contract files updated");

section("4 / 6 - Assigning stakeholder roles");

const allAccounts = await provider.send("eth_accounts", []);
const stakeholderAccounts = allAccounts.filter(
  (account) => account.toLowerCase() !== adminAddress.toLowerCase(),
);

if (stakeholderAccounts.length < 4) {
  fail("Ganache must expose at least 5 accounts to test all stakeholder roles.");
}

const stakeholders = {
  FARMER: stakeholderAccounts[0],
  PROCESSOR: stakeholderAccounts[1],
  DISTRIBUTOR: stakeholderAccounts[2],
  RETAILER: stakeholderAccounts[3],
};

const signers = {};

for (const [label, stakeholderAddress] of Object.entries(stakeholders)) {
  const assignTx = await contract.assignRole(stakeholderAddress, ROLE_IDS[label]);
  await assignTx.wait();

  const onChainRole = await contract.roles(stakeholderAddress);
  if (onChainRole !== ROLE_IDS[label]) {
    fail(`${label} role assignment failed for ${stakeholderAddress}.`);
  }

  signers[label] = await provider.getSigner(stakeholderAddress);
  console.log(`${label.padEnd(12)} ${stakeholderAddress}`);
}

log("All stakeholder roles assigned");

section("5 / 6 - Creating batches and moving them through the chain");

const farmerContract = contract.connect(signers.FARMER);
const processorContract = contract.connect(signers.PROCESSOR);
const distributorContract = contract.connect(signers.DISTRIBUTOR);
const retailerContract = contract.connect(signers.RETAILER);

const testBatches = [
  { id: 1001n, origin: "Ibadan, Oyo State", qty: 2500n },
  { id: 1002n, origin: "Enugu, Enugu State", qty: 1800n },
  { id: 1003n, origin: "Owerri, Imo State", qty: 3200n },
];

for (const batch of testBatches) {
  const createTx = await farmerContract.createBatch(batch.id, batch.origin, batch.qty);
  await createTx.wait();
  console.log(`Created batch #${batch.id} from ${batch.origin}`);

  const toProcessorTx = await farmerContract.transferOwnership(batch.id, stakeholders.PROCESSOR);
  await toProcessorTx.wait();
  console.log(`  -> transferred to PROCESSOR`);
}

const processedTx = await processorContract.updateStatus(1001n, 1n);
await processedTx.wait();
console.log("Batch #1001 updated to PROCESSED");

const processedTx2 = await processorContract.updateStatus(1002n, 1n);
await processedTx2.wait();
const toDistributorTx2 = await processorContract.transferOwnership(1002n, stakeholders.DISTRIBUTOR);
await toDistributorTx2.wait();
const transitTx2 = await distributorContract.updateStatus(1002n, 2n);
await transitTx2.wait();
console.log("Batch #1002 updated to IN_TRANSIT");

const processedTx3 = await processorContract.updateStatus(1003n, 1n);
await processedTx3.wait();
const toDistributorTx3 = await processorContract.transferOwnership(1003n, stakeholders.DISTRIBUTOR);
await toDistributorTx3.wait();
const transitTx3 = await distributorContract.updateStatus(1003n, 2n);
await transitTx3.wait();
const toRetailerTx3 = await distributorContract.transferOwnership(1003n, stakeholders.RETAILER);
await toRetailerTx3.wait();
const deliveredTx3 = await retailerContract.updateStatus(1003n, 3n);
await deliveredTx3.wait();
console.log("Batch #1003 updated to DELIVERED");

log("Lifecycle operations completed");

section("6 / 6 - Verifying batches on-chain");

const expectedStates = {
  "1001": { owner: stakeholders.PROCESSOR.toLowerCase(), status: 1 },
  "1002": { owner: stakeholders.DISTRIBUTOR.toLowerCase(), status: 2 },
  "1003": { owner: stakeholders.RETAILER.toLowerCase(), status: 3 },
};

let allPassed = true;

for (const batch of testBatches) {
  try {
    const data = await contract.getBatch(batch.id);
    const batchId = data[0].toString();
    const origin = data[1];
    const quantity = data[2].toString();
    const owner = data[4].toLowerCase();
    const status = Number(data[5]);
    const expected = expectedStates[batchId];

    const pass =
      batchId === batch.id.toString() &&
      origin === batch.origin &&
      quantity === batch.qty.toString() &&
      owner === expected.owner &&
      status === expected.status;

    if (!pass) {
      console.log(
        `[fail] Batch #${batchId} mismatch: origin=${origin}, qty=${quantity}, owner=${owner}, status=${STATUS_LABELS[status]}`,
      );
      allPassed = false;
      continue;
    }

    console.log(
      `[pass] Batch #${batchId} | ${origin} | ${quantity} kg | owner=${owner} | status=${STATUS_LABELS[status]}`,
    );
  } catch (error) {
    console.log(`[fail] Batch #${batch.id} read error: ${error.message}`);
    allPassed = false;
  }
}

console.log(`\n${"=".repeat(64)}`);
console.log(allPassed ? "All tests passed. The dApp is ready to use." : "Some tests failed. Review the output above.");
console.log("=".repeat(64));

console.log(`
Next steps:
1. Keep Ganache running.
2. Start the dataset API with: npm run api:dataset
3. Start the UI with: cd ui && npm run dev
4. In MetaMask, switch to your Ganache network (Chain ID 1337).
5. Import the stakeholder wallets you want to test.
6. Open http://localhost:5173
`);
