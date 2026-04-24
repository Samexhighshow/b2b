import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatViem from "@nomicfoundation/hardhat-viem";

export default defineConfig({
  plugins: [hardhatEthers, hardhatViem],
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
    },
  },
  networks: {
    // External Ganache desktop app (keep this for when Ganache app is used)
    ganache: {
      type: "http",
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
    // Hardhat built-in node — configured to mimic Ganache (port 7545, chainId 1337)
    localhost: {
      type: "http",
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
  },
  // Hardhat node server settings: run on port 7545 with chain ID 1337
  // Start with: npx hardhat node --port 7545
  // This makes it a drop-in replacement for Ganache
});
