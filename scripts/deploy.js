import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const rpcUrl = "http://127.0.0.1:7545";
const chainId = 1337;

// Put your UI folder name here (change if yours is different)
const UI_OUT_DIR = "ui/src";

const privateKey = process.env.GANACHE_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Set GANACHE_PRIVATE_KEY in your environment (Ganache account private key).");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "CassavaSupplyChain.sol",
  "CassavaSupplyChain.json"
);

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId, name: "ganache" });
const wallet = new ethers.Wallet(privateKey, provider);

console.log("Deploying with wallet:", await wallet.getAddress());

const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

const address = await contract.getAddress();
console.log("CassavaSupplyChain deployed to:", address);

// ✅ Write address + ABI into UI folder
const outDir = path.join(__dirname, "..", UI_OUT_DIR);
await mkdir(outDir, { recursive: true });

await writeFile(
  path.join(outDir, "contract-address.json"),
  JSON.stringify({ CassavaSupplyChain: address, chainId }, null, 2),
  "utf8"
);

await writeFile(
  path.join(outDir, "abi.json"),
  JSON.stringify(artifact.abi, null, 2),
  "utf8"
);

console.log(`Wrote UI files:
- ${UI_OUT_DIR}/contract-address.json
- ${UI_OUT_DIR}/abi.json`);
