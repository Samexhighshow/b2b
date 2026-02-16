import { createThirdwebClient, defineChain } from "thirdweb";

export const ganacheChain = defineChain({
  id: 1337,
  name: "Ganache Local",
  rpc: "http://127.0.0.1:7545",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});

export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "YOUR_THIRDWEB_CLIENT_ID",
});
