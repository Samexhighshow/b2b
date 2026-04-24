import { useEffect, useMemo, useRef, useState } from "react";
import {
  getContract,
  getContractEvents,
  prepareContractCall,
  prepareEvent,
  readContract,
} from "thirdweb";
import {
  useActiveAccount,
  useActiveWalletChain,
  useConnect,
  useDisconnect,
  useSendTransaction,
} from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import deploymentAbi from "./abi.json";
import contractAddressData from "./contract-address.json";
import { client, ganacheChain } from "./thirdwebClient.js";

const DEPLOYED_ADDRESS = contractAddressData?.CassavaSupplyChain;
const IS_PLACEHOLDER_ADDRESS =
  !DEPLOYED_ADDRESS ||
  DEPLOYED_ADDRESS === "0x0000000000000000000000000000000000000000" ||
  DEPLOYED_ADDRESS === "0xYourContractAddress";

const CONTRACT_ADDRESS =
  DEPLOYED_ADDRESS && !IS_PLACEHOLDER_ADDRESS
    ? DEPLOYED_ADDRESS
    : import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourContractAddress";

const IS_PLACEHOLDER = CONTRACT_ADDRESS === "0xYourContractAddress";
const STATUS_LABELS = ["CREATED", "PROCESSED", "IN_TRANSIT", "DELIVERED"];
const ROLE_LABELS = ["NONE", "FARMER", "PROCESSOR", "DISTRIBUTOR", "RETAILER", "ADMIN"];

const BASE_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "trace", label: "Traceability" },
  { key: "analytics", label: "Reports" },
];

const DATASET_API_BASE = import.meta.env.VITE_DATASET_API_URL || "http://127.0.0.1:3030";

const formatAddress = (address) => (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");

const parseNumericInput = (value, fieldLabel) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldLabel} is required.`);
  if (!/^\d+$/.test(trimmed)) throw new Error(`${fieldLabel} must be a whole number.`);
  return BigInt(trimmed);
};

const parseAppError = (error) => {
  const base = error?.reason || error?.shortMessage || error?.message || "Transaction failed.";

  if (base.includes("Cannot read properties of undefined") && base.includes("id")) {
    return "Wallet session is not fully initialized. Reconnect MetaMask and switch to Ganache (Chain ID 1337), then try again.";
  }

  if (base.includes("Invalid role")) {
    return "Wallet role is not FARMER. Assign FARMER role to this wallet first.";
  }

  if (base.includes("Batch exists")) {
    return "Batch ID already exists. Use another batch ID.";
  }

  if (base.includes("Batch not found")) {
    return "Batch not found on-chain. Confirm the batch ID.";
  }

  return base;
};

const buildChartSeries = (events) => {
  const points = 8;
  if (!events.length) {
    return {
      speed: [0, 0, 0, 0, 0, 0, 0, 0],
      cost: [0, 0, 0, 0, 0, 0, 0, 0],
    };
  }

  const chunkSize = Math.max(1, Math.ceil(events.length / points));
  const chunks = [];

  for (let start = 0; start < events.length; start += chunkSize) {
    chunks.push(events.slice(start, start + chunkSize));
  }

  while (chunks.length < points) {
    chunks.unshift([]);
  }

  const normalized = chunks.slice(-points);

  const speed = normalized.map((chunk) => chunk.length * 12);
  const cost = normalized.map((chunk) => {
    const statusUpdates = chunk.filter((eventItem) => eventItem.type === "StatusUpdated").length;
    const transfers = chunk.filter((eventItem) => eventItem.type === "OwnershipTransferred").length;
    return statusUpdates * 7 + transfers * 5;
  });

  return { speed, cost };
};

const toSvgPoints = (values, height = 190, widthStep = 56, maxValue = 1) =>
  values
    .map((value, index) => {
      const x = index * widthStep;
      const y = Math.max(10, height - (value / Math.max(1, maxValue)) * (height - 12));
      return `${x},${y}`;
    })
    .join(" ");

const BrandMark = ({ className = "brand-logo", size = 34 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 34 34"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="32" height="32" rx="9" fill="url(#markBg)" />
    <rect x="1" y="1" width="32" height="32" rx="9" stroke="rgba(186,255,220,0.42)" strokeWidth="1.2" />
    <path d="M11 11.8h8.2a3.1 3.1 0 0 1 0 6.2h-4.4a3.1 3.1 0 0 0 0 6.2H23" stroke="#E8FFF3" strokeWidth="2.3" strokeLinecap="round" />
    <circle cx="10.5" cy="11.8" r="1.55" fill="#9CFFD1" />
    <circle cx="23.5" cy="24.2" r="1.55" fill="#9CFFD1" />
    <defs>
      <linearGradient id="markBg" x1="3" y1="2" x2="29" y2="31" gradientUnits="userSpaceOnUse">
        <stop stopColor="#31C575" />
        <stop offset="1" stopColor="#0D6A3E" />
      </linearGradient>
    </defs>
  </svg>
);

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGanacheReady, setIsGanacheReady] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);

  const [createBatchId, setCreateBatchId] = useState("");
  const [createOrigin, setCreateOrigin] = useState("");
  const [createQuantity, setCreateQuantity] = useState("");
  const [transferBatchId, setTransferBatchId] = useState("");
  const [transferOwner, setTransferOwner] = useState("");
  const [statusBatchId, setStatusBatchId] = useState("");
  const [searchBatchId, setSearchBatchId] = useState("");

  const [batchDetails, setBatchDetails] = useState(null);
  const [batchEvents, setBatchEvents] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [datasetSummary, setDatasetSummary] = useState(null);
  const [datasetRecords, setDatasetRecords] = useState([]);
  const [datasetApiError, setDatasetApiError] = useState("");
  const [networkMetrics, setNetworkMetrics] = useState({
    totalBatches: 0,
    totalWeight: 0,
    statusCounts: [0, 0, 0, 0],
    recentRows: [],
    speedSeries: [0, 0, 0, 0, 0, 0, 0, 0],
    costSeries: [0, 0, 0, 0, 0, 0, 0, 0],
    lastUpdated: null,
  });

  const [contractAdmin, setContractAdmin] = useState("");
  const [assignRoleUser, setAssignRoleUser] = useState("");
  const [assignRoleId, setAssignRoleId] = useState(1); // Default to Farmer

  const walletMenuRef = useRef(null);

  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();

  const hasClientId =
    import.meta.env.VITE_THIRDWEB_CLIENT_ID &&
    import.meta.env.VITE_THIRDWEB_CLIENT_ID !== "YOUR_THIRDWEB_CLIENT_ID";

  const chainLabel = activeChain?.id
    ? `${activeChain.name ?? "Unknown"} (${activeChain.id})`
    : `${ganacheChain.name} (${ganacheChain.id})`;

  const isWorking = isBusy || isConnecting || isPending || isRefreshing;

  const contract = useMemo(() => {
    if (!CONTRACT_ADDRESS || IS_PLACEHOLDER) return null;
    return getContract({
      client,
      chain: ganacheChain,
      address: CONTRACT_ADDRESS,
      abi: deploymentAbi,
    });
  }, []);

  const setMessage = (message) => {
    setStatusMessage(message);
    if (message) {
      setTimeout(() => setStatusMessage(""), 6200);
    }
  };

  const probeGanache = async () => {
    try {
      const response = await fetch(ganacheChain.rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Ganache RPC unavailable");
      }

      const payload = await response.json();
      setIsGanacheReady(Boolean(payload?.result));
      return Boolean(payload?.result);
    } catch {
      setIsGanacheReady(false);
      return false;
    }
  };

  const ensureWalletReady = () => {
    if (!activeAccount) {
      setMessage("Connect MetaMask before submitting a transaction.");
      return false;
    }

    if (!isGanacheReady) {
      setMessage("Ganache RPC is not reachable yet. Start Ganache on 7545 and try again.");
      return false;
    }

    if (!activeChain?.id) {
      setMessage("Wallet network not detected yet. Reconnect wallet and try again.");
      return false;
    }

    if (Number(activeChain.id) !== Number(ganacheChain.id)) {
      setMessage(`Wrong network. Switch MetaMask to ${ganacheChain.name} (${ganacheChain.id}).`);
      return false;
    }

    return true;
  };

  const loadDatasetApiData = async () => {
    try {
      const [summaryResponse, recordsResponse] = await Promise.all([
        fetch(`${DATASET_API_BASE}/api/dataset/summary`),
        fetch(`${DATASET_API_BASE}/api/dataset/records?limit=8`),
      ]);

      if (!summaryResponse.ok || !recordsResponse.ok) {
        throw new Error("Dataset API unavailable");
      }

      const summaryPayload = await summaryResponse.json();
      const recordsPayload = await recordsResponse.json();

      setDatasetSummary(summaryPayload.summary || null);
      setDatasetRecords(Array.isArray(recordsPayload.records) ? recordsPayload.records : []);
      setDatasetApiError("");
    } catch {
      setDatasetSummary(null);
      setDatasetRecords([]);
      setDatasetApiError("Dataset API not reachable. Run npm run dataset:build and npm run api:dataset.");
    }
  };

  useEffect(() => {
    probeGanache();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target)) {
        setIsWalletMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const connectWallet = async () => {
    try {
      if (!hasClientId) {
        setMessage("Set VITE_THIRDWEB_CLIENT_ID in ui/.env and restart the app.");
        return;
      }

      setIsBusy(true);
      await connect(async () => {
        const wallet = createWallet("io.metamask");
        await wallet.connect({ client, chain: ganacheChain });
        return wallet;
      });

      setIsWalletMenuOpen(false);
      setMessage("Wallet connected.");
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const loadBatchEvents = async (batchId) => {
    if (!contract) return;

    const [created, status, transfers] = await Promise.all([
      getContractEvents({
        contract,
        events: [
          prepareEvent({
            signature: "event BatchCreated(uint256 indexed batchId,address indexed owner)",
          }),
        ],
        filters: { batchId },
        fromBlock: 0n,
        toBlock: "latest",
      }),
      getContractEvents({
        contract,
        events: [
          prepareEvent({
            signature: "event StatusUpdated(uint256 indexed batchId,uint8 newStatus)",
          }),
        ],
        filters: { batchId },
        fromBlock: 0n,
        toBlock: "latest",
      }),
      getContractEvents({
        contract,
        events: [
          prepareEvent({
            signature:
              "event OwnershipTransferred(uint256 indexed batchId,address indexed from,address indexed to)",
          }),
        ],
        filters: { batchId },
        fromBlock: 0n,
        toBlock: "latest",
      }),
    ]);

    const merged = [
      ...created.map((eventItem) => ({
        type: "BatchCreated",
        blockNumber: eventItem.blockNumber,
        txHash: eventItem.transactionHash,
        detail: `Owner ${formatAddress(eventItem.args.owner)}`,
      })),
      ...status.map((eventItem) => ({
        type: "StatusUpdated",
        blockNumber: eventItem.blockNumber,
        txHash: eventItem.transactionHash,
        detail: `Status ${STATUS_LABELS[Number(eventItem.args.newStatus)]}`,
      })),
      ...transfers.map((eventItem) => ({
        type: "OwnershipTransferred",
        blockNumber: eventItem.blockNumber,
        txHash: eventItem.transactionHash,
        detail: `${formatAddress(eventItem.args.from)} -> ${formatAddress(eventItem.args.to)}`,
      })),
    ].sort((left, right) => Number(left.blockNumber) - Number(right.blockNumber));

    setBatchEvents(merged);
  };

  const refreshNetworkData = async () => {
    if (!contract || !isGanacheReady) return;

    try {
      setIsRefreshing(true);

      const [created, status, transfers] = await Promise.all([
        getContractEvents({
          contract,
          events: [
            prepareEvent({
              signature: "event BatchCreated(uint256 indexed batchId,address indexed owner)",
            }),
          ],
          fromBlock: 0n,
          toBlock: "latest",
        }),
        getContractEvents({
          contract,
          events: [
            prepareEvent({
              signature: "event StatusUpdated(uint256 indexed batchId,uint8 newStatus)",
            }),
          ],
          fromBlock: 0n,
          toBlock: "latest",
        }),
        getContractEvents({
          contract,
          events: [
            prepareEvent({
              signature:
                "event OwnershipTransferred(uint256 indexed batchId,address indexed from,address indexed to)",
            }),
          ],
          fromBlock: 0n,
          toBlock: "latest",
        }),
      ]);

      const allEvents = [
        ...created.map((eventItem) => ({
          type: "BatchCreated",
          blockNumber: eventItem.blockNumber,
          txHash: eventItem.transactionHash,
        })),
        ...status.map((eventItem) => ({
          type: "StatusUpdated",
          blockNumber: eventItem.blockNumber,
          txHash: eventItem.transactionHash,
        })),
        ...transfers.map((eventItem) => ({
          type: "OwnershipTransferred",
          blockNumber: eventItem.blockNumber,
          txHash: eventItem.transactionHash,
        })),
      ].sort((left, right) => Number(left.blockNumber) - Number(right.blockNumber));

      const batchIds = [...new Set(created.map((eventItem) => eventItem.args.batchId.toString()))];

      const fetchedBatches = await Promise.all(
        batchIds.map(async (batchIdText) => {
          const data = await readContract({
            contract,
            method: "getBatch",
            params: [BigInt(batchIdText)],
          });

          return {
            batchId: data[0].toString(),
            originLocation: data[1],
            quantityKg: Number(data[2]),
            createdAt: new Date(Number(data[3]) * 1000).toLocaleString(),
            currentOwner: data[4],
            statusIndex: Number(data[5]),
            status: STATUS_LABELS[Number(data[5])],
          };
        })
      );

      const statusCounts = [0, 0, 0, 0];
      let totalWeight = 0;

      fetchedBatches.forEach((batchItem) => {
        statusCounts[batchItem.statusIndex] += 1;
        totalWeight += batchItem.quantityKg;
      });

      const recentRows = allEvents
        .slice(-6)
        .reverse()
        .map((eventItem) => ({
          block: `0x${eventItem.blockNumber.toString(16)}`,
          blockNumber: eventItem.blockNumber.toString(),
          event: eventItem.type,
          status: eventItem.type === "StatusUpdated" ? "Pending" : "Verified",
          txHash: eventItem.txHash,
        }));

      const series = buildChartSeries(allEvents);

      try {
        const adminAddr = await readContract({ contract, method: "admin" });
        setContractAdmin(adminAddr);
      } catch {
        /* ignore */
      }

      setAllBatches(fetchedBatches.sort((left, right) => Number(right.batchId) - Number(left.batchId)));
      setNetworkMetrics({
        totalBatches: fetchedBatches.length,
        totalWeight,
        statusCounts,
        recentRows,
        speedSeries: series.speed,
        costSeries: series.cost,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!contract || !isGanacheReady) return;
    refreshNetworkData();
  }, [contract, isGanacheReady]);

  useEffect(() => {
    loadDatasetApiData();
  }, []);

  const handleSearchBatch = async (event) => {
    event.preventDefault();

    if (!contract) {
      setMessage("Deploy contract first: node scripts/deploy.js");
      return;
    }

    try {
      setIsBusy(true);
      const batchId = parseNumericInput(searchBatchId, "Batch ID");
      const data = await readContract({
        contract,
        method: "getBatch",
        params: [batchId],
      });

      setBatchDetails({
        batchId: data[0].toString(),
        originLocation: data[1],
        quantityKg: data[2].toString(),
        createdAt: new Date(Number(data[3]) * 1000).toLocaleString(),
        currentOwner: data[4],
        status: STATUS_LABELS[Number(data[5])],
        statusIndex: Number(data[5]),
      });

      await loadBatchEvents(batchId);
      setMessage(`Loaded batch ${data[0].toString()} from blockchain data.`);
    } catch (error) {
      setBatchDetails(null);
      setBatchEvents([]);
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateBatch = async (event) => {
    event.preventDefault();

    if (!contract) {
      setMessage("Deploy contract first: node scripts/deploy.js");
      return;
    }

    if (!ensureWalletReady()) {
      return;
    }

    try {
      setIsBusy(true);
      const batchId = parseNumericInput(createBatchId, "Batch ID");
      const quantity = parseNumericInput(createQuantity, "Quantity");
      const transaction = prepareContractCall({
        contract,
        method: "createBatch",
        params: [batchId, createOrigin.trim(), quantity],
      });

      await sendTransaction(transaction);
      setCreateBatchId("");
      setCreateOrigin("");
      setCreateQuantity("");
      setSearchBatchId(batchId.toString());
      setMessage("Batch created successfully.");
      await refreshNetworkData();
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleTransferOwnership = async (event) => {
    event.preventDefault();

    if (!contract) {
      setMessage("Deploy contract first: node scripts/deploy.js");
      return;
    }

    if (!ensureWalletReady()) {
      return;
    }

    try {
      setIsBusy(true);
      const batchId = parseNumericInput(transferBatchId, "Batch ID");
      const transaction = prepareContractCall({
        contract,
        method: "transferOwnership",
        params: [batchId, transferOwner.trim()],
      });

      await sendTransaction(transaction);
      setTransferBatchId("");
      setTransferOwner("");
      setMessage("Ownership transferred.");
      await refreshNetworkData();
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateStatus = async (statusIndex) => {
    if (!contract) {
      setMessage("Deploy contract first: node scripts/deploy.js");
      return;
    }

    if (!ensureWalletReady()) {
      return;
    }

    try {
      setIsBusy(true);
      const batchId = parseNumericInput(statusBatchId, "Batch ID");
      const transaction = prepareContractCall({
        contract,
        method: "updateStatus",
        params: [batchId, statusIndex],
      });

      await sendTransaction(transaction);
      setMessage(`Status changed to ${STATUS_LABELS[statusIndex].replace("_", " ")}.`);
      await refreshNetworkData();
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleAssignRole = async (event) => {
    event.preventDefault();

    if (!contract) {
      setMessage("Deploy contract first: node scripts/deploy.js");
      return;
    }

    if (!ensureWalletReady()) {
      return;
    }

    try {
      setIsBusy(true);
      const transaction = prepareContractCall({
        contract,
        method: "assignRole",
        params: [assignRoleUser.trim(), assignRoleId],
      });

      await sendTransaction(transaction);
      setAssignRoleUser("");
      setMessage(`Role ${ROLE_LABELS[assignRoleId]} assigned to ${formatAddress(assignRoleUser)}.`);
      await refreshNetworkData();
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const statusPercent = batchDetails
    ? Math.round((batchDetails.statusIndex / (STATUS_LABELS.length - 1)) * 100)
    : 0;

  const completedBatches = networkMetrics.statusCounts[3] || 0;
  const traceabilityCoverage = networkMetrics.totalBatches
    ? Math.round((completedBatches / networkMetrics.totalBatches) * 100)
    : 0;

  const verifiedRows = networkMetrics.recentRows.filter((row) => row.status === "Verified").length;
  const integrityScore = networkMetrics.recentRows.length
    ? Math.round((verifiedRows / networkMetrics.recentRows.length) * 100)
    : 0;

  const avgActivity =
    networkMetrics.speedSeries.reduce((acc, value) => acc + value, 0) /
    Math.max(1, networkMetrics.speedSeries.length);
  const avgCost =
    networkMetrics.costSeries.reduce((acc, value) => acc + value, 0) /
    Math.max(1, networkMetrics.costSeries.length);
  const efficiencyScore = avgActivity
    ? Math.max(0, Math.min(100, Math.round((avgActivity / (avgActivity + avgCost)) * 100)))
    : 0;

  const chartMaxValue = Math.max(1, ...networkMetrics.speedSeries, ...networkMetrics.costSeries);
  const yAxisTicks = [
    chartMaxValue,
    Math.max(1, Math.round(chartMaxValue * 0.66)),
    Math.max(1, Math.round(chartMaxValue * 0.33)),
    0,
  ];
  const xAxisLabels = networkMetrics.speedSeries.map((_, index) =>
    index === networkMetrics.speedSeries.length - 1 ? "Now" : `T-${networkMetrics.speedSeries.length - 1 - index}`
  );

  return (
    <div className="app-root">
      <header className="main-navbar">
        <div className="nav-brand">
          <BrandMark />
          <div>
            <strong>CassavaTrace</strong>
            <small>Blockchain Supply Chain Management</small>
          </div>
        </div>

        <nav className="main-nav-links">
          {BASE_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? "active" : ""}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
          {activeAccount?.address?.toLowerCase() === contractAdmin?.toLowerCase() ? (
            <>
              <button
                type="button"
                className={activePage === "admin" ? "active" : ""}
                onClick={() => setActivePage("admin")}
              >
                Admin Platform
              </button>
              <button
                type="button"
                className={activePage === "academic" ? "active" : ""}
                onClick={() => setActivePage("academic")}
              >
                Academic View
              </button>
            </>
          ) : null}
        </nav>

        <div className="wallet-shell" ref={walletMenuRef}>
          <button
            className="wallet-trigger"
            type="button"
            onClick={() => setIsWalletMenuOpen((current) => !current)}
          >
            <span className="wallet-led" />
            {activeAccount ? formatAddress(activeAccount.address) : "Connect Wallet"}
          </button>

          <div className={`wallet-menu ${isWalletMenuOpen ? "open" : ""}`}>
            <p className="menu-title">
              {activeAccount ? `Connected: ${formatAddress(activeAccount.address)}` : "Wallet not connected"}
            </p>
            <p className="menu-subtitle">Network: {chainLabel}</p>
            <button className="btn primary" type="button" onClick={connectWallet} disabled={isWorking}>
              {activeAccount ? "Switch / Reconnect" : "Connect MetaMask"}
            </button>
            {activeAccount ? (
              <button
                className="btn ghost"
                type="button"
                disabled={isWorking}
                onClick={() => {
                  disconnect();
                  setIsWalletMenuOpen(false);
                  setMessage("Wallet disconnected.");
                }}
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="page-wrap">
        {IS_PLACEHOLDER ? (
          <section className="notice-card">
            Contract is not ready. Deploy with node scripts/deploy.js, then refresh.
          </section>
        ) : null}

        {activePage === "dashboard" ? (
          <>
            <section className="kpi-grid">
              <article className="card">
                <h3>Active Batches</h3>
                <p className="kpi-value">{networkMetrics.totalBatches}</p>
                <small>On-chain records tracked</small>
              </article>

              <article className="card">
                <h3>Total Cassava Weight</h3>
                <p className="kpi-value">{networkMetrics.totalWeight.toLocaleString()} kg</p>
                <small>Aggregated from blockchain batch records</small>
              </article>

              <article className="card">
                <h3>Data Integrity</h3>
                <p className="kpi-value">{networkMetrics.recentRows.length ? "Verified" : "Waiting"}</p>
                <small>{networkMetrics.lastUpdated ? `Updated ${networkMetrics.lastUpdated}` : "No updates yet"}</small>
              </article>
            </section>

            <section className="grid-two">
              <article className="card">
                <h3>Log New Batch</h3>
                <form className="data-form two-col" onSubmit={handleCreateBatch}>
                  <label>
                    Batch ID
                    <input
                      value={createBatchId}
                      onChange={(event) => setCreateBatchId(event.target.value)}
                      placeholder="20240001"
                      required
                    />
                  </label>
                  <label>
                    Quantity (kg)
                    <input
                      value={createQuantity}
                      onChange={(event) => setCreateQuantity(event.target.value)}
                      placeholder="2500"
                      required
                    />
                  </label>
                  <label className="span-2">
                    Origin
                    <input
                      value={createOrigin}
                      onChange={(event) => setCreateOrigin(event.target.value)}
                      placeholder="Ibadan, Nigeria"
                      required
                    />
                  </label>
                  <button className="btn primary span-2" type="submit" disabled={isWorking || IS_PLACEHOLDER}>
                    Submit Transaction
                  </button>
                </form>
              </article>

              <article className="card">
                <h3>Ownership & Status</h3>
                <form className="data-form" onSubmit={handleTransferOwnership}>
                  <label>
                    Batch ID (transfer)
                    <input
                      value={transferBatchId}
                      onChange={(event) => setTransferBatchId(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    New Owner Address
                    <input
                      value={transferOwner}
                      onChange={(event) => setTransferOwner(event.target.value)}
                      required
                    />
                  </label>
                  <button className="btn primary" type="submit" disabled={isWorking || IS_PLACEHOLDER}>
                    Transfer Ownership
                  </button>
                </form>

                <form className="data-form top-gap" onSubmit={(event) => event.preventDefault()}>
                  <label>
                    Batch ID (status)
                    <input
                      value={statusBatchId}
                      onChange={(event) => setStatusBatchId(event.target.value)}
                      required
                    />
                  </label>
                  <div className="status-grid">
                    {STATUS_LABELS.map((label, index) => (
                      <button
                        key={label}
                        className="btn ghost"
                        type="button"
                        onClick={() => handleUpdateStatus(index)}
                        disabled={isWorking || !statusBatchId || IS_PLACEHOLDER}
                      >
                        {label.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </form>

                {activeAccount?.address?.toLowerCase() === contractAdmin?.toLowerCase() ? (
                  <form className="data-form top-gap border-top" onSubmit={handleAssignRole}>
                    <h4>Admin: Assign User Role</h4>
                    <label>
                      User Address
                      <input
                        value={assignRoleUser}
                        onChange={(event) => setAssignRoleUser(event.target.value)}
                        placeholder="0x..."
                        required
                      />
                    </label>
                    <label>
                      Select Role
                      <select
                        className="custom-select"
                        value={assignRoleId}
                        onChange={(event) => setAssignRoleId(Number(event.target.value))}
                      >
                        {ROLE_LABELS.map((label, index) =>
                          index === 0 || index === 5 ? null : (
                            <option key={label} value={index}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <button className="btn primary" type="submit" disabled={isWorking || IS_PLACEHOLDER}>
                      Assign Role
                    </button>
                  </form>
                ) : null}
              </article>
            </section>

            <section className="card top-gap">
              <div className="section-head">
                <h3>Recent Batches (On-chain)</h3>
                <button className="btn ghost" type="button" onClick={refreshNetworkData} disabled={isWorking || IS_PLACEHOLDER}>
                  Refresh Data
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Origin</th>
                      <th>Weight</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBatches.length ? (
                      allBatches.slice(0, 8).map((batchItem) => (
                        <tr key={batchItem.batchId}>
                          <td>{batchItem.batchId}</td>
                          <td>{batchItem.originLocation}</td>
                          <td>{batchItem.quantityKg.toLocaleString()} kg</td>
                          <td>{batchItem.status.replace("_", " ")}</td>
                          <td>{formatAddress(batchItem.currentOwner)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No batches available on-chain yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {activePage === "trace" ? (
          <>
            <section className="card">
              <div className="section-head">
                <h3>Supply Chain Traceability View</h3>
                <form className="inline-form" onSubmit={handleSearchBatch}>
                  <input
                    value={searchBatchId}
                    onChange={(event) => setSearchBatchId(event.target.value)}
                    placeholder="Enter batch ID"
                    required
                  />
                  <button className="btn primary" type="submit" disabled={isWorking || IS_PLACEHOLDER}>
                    Search
                  </button>
                </form>
              </div>

              {batchDetails ? (
                <div className="trace-details">
                  <article className="sub-card">
                    <h4>Batch Overview</h4>
                    <p><strong>Batch ID:</strong> {batchDetails.batchId}</p>
                    <p><strong>Origin:</strong> {batchDetails.originLocation}</p>
                    <p><strong>Quantity:</strong> {batchDetails.quantityKg} kg</p>
                    <p><strong>Owner:</strong> {formatAddress(batchDetails.currentOwner)}</p>
                    <p><strong>Status:</strong> {batchDetails.status.replace("_", " ")}</p>
                    <p><strong>Created:</strong> {batchDetails.createdAt}</p>
                    <div className="progress-wrap">
                      <span>Traceability Progress</span>
                      <div className="progress-bar">
                        <div style={{ width: `${statusPercent}%` }} />
                      </div>
                    </div>
                  </article>

                  <article className="sub-card">
                    <h4>Blockchain Journey</h4>
                    <ul className="timeline-list">
                      {batchEvents.length ? (
                        batchEvents.map((eventItem) => (
                          <li key={`${eventItem.txHash}-${eventItem.type}`}>
                            <span className="event-pill">{eventItem.type}</span>
                            <p>{eventItem.detail}</p>
                            <small>
                              Block {eventItem.blockNumber.toString()} · {formatAddress(eventItem.txHash)}
                            </small>
                          </li>
                        ))
                      ) : (
                        <li>
                          <p>No events found for this batch yet.</p>
                        </li>
                      )}
                    </ul>
                  </article>
                </div>
              ) : (
                <p className="empty-state">Search for a batch to view traceability details from blockchain records.</p>
              )}
            </section>
          </>
        ) : null}

        {activePage === "analytics" ? (
          <>
            <section className="grid-two">
              <article className="card">
                <h3>Transaction Efficiency (From Blockchain Events)</h3>
                <div className="line-chart-shell">
                  <div className="chart-y-axis">
                    {yAxisTicks.map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>
                  <div className="line-chart">
                    <svg viewBox="0 0 392 190" preserveAspectRatio="none" role="img" aria-label="Efficiency chart">
                      {[40, 90, 140].map((y) => (
                        <line key={y} x1="0" y1={y} x2="392" y2={y} className="grid-line" />
                      ))}
                      <polyline
                        points={toSvgPoints(networkMetrics.speedSeries, 190, 56, chartMaxValue)}
                        className="line speed"
                      />
                      <polyline
                        points={toSvgPoints(networkMetrics.costSeries, 190, 56, chartMaxValue)}
                        className="line cost"
                      />
                    </svg>
                    <div className="chart-x-axis">
                      {xAxisLabels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="legend-row">
                  <span><i className="dot speed" />Activity</span>
                  <span><i className="dot cost" />Status/Transfer Weight</span>
                </div>
              </article>

              <article className="card">
                <h3>Tracked Batches by Status</h3>
                <div className="bar-grid">
                  {STATUS_LABELS.map((label, index) => (
                    <div key={label} className="bar-card">
                      <div className="bar-label">{label.replace("_", " ")}</div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${
                              networkMetrics.totalBatches
                                ? Math.round((networkMetrics.statusCounts[index] / networkMetrics.totalBatches) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <strong>{networkMetrics.statusCounts[index]}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="card top-gap">
              <h3>Data Integrity - Recent Blocks</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Block ID</th>
                      <th>Block Number</th>
                      <th>Event Type</th>
                      <th>Status</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkMetrics.recentRows.length ? (
                      networkMetrics.recentRows.map((row) => (
                        <tr key={`${row.block}-${row.txHash}`}>
                          <td>{row.block}</td>
                          <td>{row.blockNumber}</td>
                          <td>{row.event}</td>
                          <td>
                            <span className={`tag ${row.status === "Verified" ? "ok" : "pending"}`}>{row.status}</span>
                          </td>
                          <td>{formatAddress(row.txHash)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No blockchain events yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card top-gap">
              <h3>System Evaluation</h3>
              <div className="evaluation-grid">
                <article className="sub-card">
                  <h4>Traceability Coverage</h4>
                  <p className="kpi-value">{traceabilityCoverage}%</p>
                  <small>{completedBatches} of {networkMetrics.totalBatches} batches reached DELIVERED</small>
                </article>
                <article className="sub-card">
                  <h4>Data Integrity Score</h4>
                  <p className="kpi-value">{integrityScore}%</p>
                  <small>Based on recent on-chain event verification checks</small>
                </article>
                <article className="sub-card">
                  <h4>Transaction Efficiency</h4>
                  <p className="kpi-value">{efficiencyScore}%</p>
                  <small>Computed from activity versus status/transfer overhead</small>
                </article>
              </div>
              <p className="dataset-note">
                This section evaluates traceability, data integrity, and transaction efficiency directly from blockchain activity.
              </p>
            </section>

            <section className="card top-gap">
              <div className="section-head">
                <h3>Dataset Insights</h3>
                <button className="btn ghost" type="button" onClick={loadDatasetApiData} disabled={isWorking}>
                  Reload Data
                </button>
              </div>

              {datasetSummary ? (
                <div className="dataset-summary-grid">
                  <article className="sub-card">
                    <h4>Total Dataset Records</h4>
                    <p className="kpi-value">{datasetSummary.totalRecords}</p>
                  </article>
                  <article className="sub-card">
                    <h4>Average Loss</h4>
                    <p className="kpi-value">{datasetSummary.avgLossPct}%</p>
                  </article>
                  <article className="sub-card">
                    <h4>Average Transport Time</h4>
                    <p className="kpi-value">{datasetSummary.avgTransportHours} hrs</p>
                  </article>
                </div>
              ) : (
                <p className="dataset-note">{datasetApiError}</p>
              )}

              <div className="table-wrap top-gap">
                <table>
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Region</th>
                      <th>Year</th>
                      <th>Qty (kg)</th>
                      <th>Quality</th>
                      <th>Loss %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasetRecords.length ? (
                      datasetRecords.map((record) => (
                        <tr key={record.recordId}>
                          <td>{record.recordId}</td>
                          <td>{record.region}</td>
                          <td>{record.year}</td>
                          <td>{Number(record.quantityKg || 0).toLocaleString()}</td>
                          <td>{record.qualityGrade}</td>
                          <td>{record.lossPct}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No dataset records loaded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {activePage === "admin" ? (
          <section className="admin-platform">
            <div className="grid-two">
              <article className="card">
                <h3>System Role Management</h3>
                <p className="dataset-note">As the System Admin, you can authorize stakeholders by assigning roles to their wallets.</p>
                <form className="data-form top-gap" onSubmit={handleAssignRole}>
                  <label>
                    Target Wallet Address
                    <input
                      value={assignRoleUser}
                      onChange={(event) => setAssignRoleUser(event.target.value)}
                      placeholder="0x..."
                      required
                    />
                  </label>
                  <label>
                    Stakeholder Role
                    <select
                      className="custom-select"
                      value={assignRoleId}
                      onChange={(event) => setAssignRoleId(Number(event.target.value))}
                    >
                      {ROLE_LABELS.map((label, index) =>
                        index === 0 || index === 5 ? null : (
                          <option key={label} value={index}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <button className="btn primary" type="submit" disabled={isWorking || IS_PLACEHOLDER}>
                    Authorize Stakeholder
                  </button>
                </form>
              </article>

              <article className="card">
                <h3>Blockchain Simulation Controls</h3>
                <p className="dataset-note">Use these controls to simulate supply chain activity for demonstration.</p>
                <div className="status-grid top-gap">
                   <button className="btn ghost" onClick={refreshNetworkData} disabled={isWorking}>
                     Sync Network State
                   </button>
                   <button className="btn ghost" onClick={() => setMessage("Simulation mode active.")}>
                     Export Ledger (JSON)
                   </button>
                </div>
                <div className="info-box top-gap">
                   <strong>Admin Address:</strong>
                   <code>{contractAdmin}</code>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activePage === "academic" ? (
          <section className="academic-evaluation">
            <div className="card academic-hero">
              <h2>Academic Objectives Evaluation</h2>
              <p>Mapping the system features to the Master's project requirements.</p>
            </div>

            <div className="objective-grid top-gap">
              <article className="card objective-card">
                <div className="obj-num">Obj (i) & (ii)</div>
                <h4>Blockchain & Smart Contracts</h4>
                <p>Ethereum smart contracts implemented in Solidity and simulated on Ganache ({ganacheChain.name}).</p>
                <span className="tag ok">Verified On-Chain</span>
              </article>

              <article className="card objective-card">
                <div className="obj-num">Obj (iii)</div>
                <h4>Stakeholder Interaction</h4>
                <p>Interactive dApp developed using React, Thirdweb, and MetaMask for secure identity management.</p>
                <span className="tag ok">UI Operational</span>
              </article>

              <article className="card objective-card">
                <div className="obj-num">Obj (iv)</div>
                <h4>Dataset Processing</h4>
                <p>Sourced cassava datasets preprocessed for system simulation. Total records: {datasetSummary?.totalRecords || 0}.</p>
                <span className="tag ok">Data Integrated</span>
              </article>

              <article className="card objective-card">
                <div className="obj-num">Obj (v)</div>
                <h4>Performance Evaluation</h4>
                <p>Traceability: {traceabilityCoverage}% | Integrity: {integrityScore}% | Efficiency: {efficiencyScore}%.</p>
                <span className="tag ok">Metrics Calculated</span>
              </article>
            </div>

            <article className="card top-gap">
               <h3>Objective (vi): Addressing Supply Chain Challenges</h3>
               <div className="challenges-grid">
                  <div className="challenge-item">
                    <strong>Transparency</strong>
                    <p>Blockchain provides a shared, immutable ledger that removes information silos between stakeholders.</p>
                  </div>
                  <div className="challenge-item">
                    <strong>Traceability</strong>
                    <p>Every cassava batch has a verifiable history (Blockchain Journey) accessible via Batch ID search.</p>
                  </div>
                  <div className="challenge-item">
                    <strong>Security</strong>
                    <p>Cryptographic wallet signatures (MetaMask) ensure only authorized owners can modify data.</p>
                  </div>
               </div>
            </article>
          </section>
        ) : null}
      </main>

      {statusMessage ? <div className="toast">{statusMessage}</div> : null}
    </div>
  );
}
