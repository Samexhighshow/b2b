import { createThirdwebClient, defineChain } from "thirdweb";

export const ganacheChain = defineChain({
  id: 1337,
  name: "Ganache Local",
  rpc: "http://127.0.0.1:7545",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId || clientId === "YOUR_THIRDWEB_CLIENT_ID") {
  console.warn("⚠️ VITE_THIRDWEB_CLIENT_ID is not set. Get one from https://thirdweb.com/dashboard");
}

export const client = createThirdwebClient({
  clientId: clientId || "test_client",
});
