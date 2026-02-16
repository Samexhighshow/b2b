import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const rpcUrl = "http://127.0.0.1:7545";
const privateKey = process.env.GANACHE_PRIVATE_KEY;

if (!privateKey) {
	throw new Error("Set GANACHE_PRIVATE_KEY in your environment.");
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
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();

await contract.waitForDeployment();
console.log("CassavaSupplyChain deployed to:", await contract.getAddress());
