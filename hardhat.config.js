import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
    },
  },
});
