import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatViem from "@nomicfoundation/hardhat-viem";

export default defineConfig({
  plugins: [hardhatEthers, hardhatViem],
  solidity: {
    version: "0.8.20",
  },
  networks: {
    ganache: {
      type: "http",
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
  },
});
