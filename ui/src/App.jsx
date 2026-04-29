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
import AcademicPage from "./components/AcademicPage.jsx";
import AdminPage from "./components/AdminPage.jsx";
import DashboardPage from "./components/DashboardPage.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import ReportsPage from "./components/ReportsPage.jsx";
import TraceabilityPage from "./components/TraceabilityPage.jsx";
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

const STATUS_ROLE_REQUIREMENTS = {
  1: 2,
  2: 3,
  3: 4,
};

const RESOURCE_CONTENT = {
  "Privacy Policy": {
    title: "Privacy Policy",
    body: [
      "CassavaTrace stores live supply chain state on your local blockchain and reads simulation analytics from the local dataset API.",
      "Wallet addresses are displayed in the interface only for transaction and ownership verification.",
      "No private keys are stored by the app. Signing remains inside MetaMask.",
    ],
  },
  "Terms of Service": {
    title: "Terms of Service",
    body: [
      "This interface is intended for academic demonstration and local testing of cassava supply chain workflows.",
      "On-chain actions are irreversible on the active Ganache ledger once confirmed.",
      "Only use stakeholder accounts that you control and have intentionally assigned for the current demo environment.",
    ],
  },
  Documentation: {
    title: "Documentation",
    body: [
      "Core project guide: README.md",
      "UI behavior guide: docs/UI_WORKFLOW_GUIDE.md",
      "Live demo steps: docs/LIVE_DEMO_SCRIPT.md",
      "Dataset API commands: npm run dataset:build and npm run api:dataset",
    ],
  },
  Support: {
    title: "Support",
    body: [
      "If MetaMask hangs, reconnect the wallet, confirm Ganache is running on chain 1337, and make sure the connected wallet is the current batch owner.",
      "If analytics are missing, rebuild the dataset and restart the dataset API.",
      "If transactions fail, confirm the account has the required role and the batch ownership has been transferred correctly.",
    ],
  },
};

const DATASET_API_BASE = import.meta.env.VITE_DATASET_API_URL || "http://127.0.0.1:3030";

const formatAddress = (address) => (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");

const parseNumericInput = (value, fieldLabel) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldLabel} is required.`);
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldLabel} must be a whole number.`);
  }
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

  if (base.includes("Only current owner")) {
    return "Only the current batch owner can perform this action. Transfer ownership to this wallet first.";
  }

  if (base.includes("Only admin")) {
    return "Only the contract admin can assign stakeholder roles.";
  }

  if (base.includes("Status update role mismatch")) {
    return "This wallet cannot perform that status update. Use the stakeholder wallet for the next supply-chain stage.";
  }

  if (base.includes("Status must advance one step")) {
    return "Status changes must follow the supply-chain order one step at a time.";
  }

  if (base.includes("Status already final")) {
    return "This batch is already DELIVERED and cannot move to another status.";
  }

  if (base.includes("Status cannot reset to CREATED")) {
    return "Batches can only move forward from CREATED to DELIVERED.";
  }

  if (base.includes("Transfer requires next stakeholder role")) {
    return "Ownership can only be transferred to the correct next stakeholder role for the current stage.";
  }

  if (base.includes("Transfer not allowed after delivery")) {
    return "Delivered batches cannot be transferred again.";
  }

  if (base.includes("Owner role mismatch for stage")) {
    return "The current owner does not have the correct role for this batch stage. Recheck the role assignments and ownership path.";
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

  return {
    speed: normalized.map((chunk) => chunk.length * 12),
    cost: normalized.map((chunk) => {
      const statusUpdates = chunk.filter((eventItem) => eventItem.type === "StatusUpdated").length;
      const transfers = chunk.filter((eventItem) => eventItem.type === "OwnershipTransferred").length;
      return statusUpdates * 7 + transfers * 5;
    }),
  };
};

const toSvgPoints = (values, height = 190, widthStep = 56, maxValue = 1) =>
  values
    .map((value, index) => {
      const x = index * widthStep;
      const y = Math.max(10, height - (value / Math.max(1, maxValue)) * (height - 12));
      return `${x},${y}`;
    })
    .join(" ");

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
  const [datasetChallenges, setDatasetChallenges] = useState([]);
  const [datasetApiError, setDatasetApiError] = useState("");
  const [resourceModal, setResourceModal] = useState(null);
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
  const [activeRoleId, setActiveRoleId] = useState(0);
  const [assignRoleUser, setAssignRoleUser] = useState("");
  const [assignRoleId, setAssignRoleId] = useState(1);

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
  const isAdminViewUnlocked = activeAccount?.address?.toLowerCase() === contractAdmin?.toLowerCase();
  const activeRoleLabel = ROLE_LABELS[activeRoleId] || "UNKNOWN";

  const contract = useMemo(() => {
    if (!CONTRACT_ADDRESS || IS_PLACEHOLDER) {
      return null;
    }

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
      const isReady = Boolean(payload?.result);
      setIsGanacheReady(isReady);
      return isReady;
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
      const [summaryResponse, recordsResponse, challengesResponse] = await Promise.all([
        fetch(`${DATASET_API_BASE}/api/dataset/summary`),
        fetch(`${DATASET_API_BASE}/api/dataset/records?limit=8`),
        fetch(`${DATASET_API_BASE}/api/dataset/challenges`),
      ]);

      if (!summaryResponse.ok || !recordsResponse.ok || !challengesResponse.ok) {
        throw new Error("Dataset API unavailable");
      }

      const summaryPayload = await summaryResponse.json();
      const recordsPayload = await recordsResponse.json();
      const challengesPayload = await challengesResponse.json();

      setDatasetSummary(summaryPayload.summary || null);
      setDatasetRecords(Array.isArray(recordsPayload.records) ? recordsPayload.records : []);
      setDatasetChallenges(Array.isArray(challengesPayload.insights) ? challengesPayload.insights : []);
      setDatasetApiError("");
    } catch {
      setDatasetSummary(null);
      setDatasetRecords([]);
      setDatasetChallenges([]);
      setDatasetApiError("Dataset API not reachable. Run npm run dataset:build and npm run api:dataset.");
    }
  };

  const reloadDatasetInsights = async () => {
    await loadDatasetApiData();
    setMessage("Dataset analytics refreshed.");
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

  useEffect(() => {
    loadDatasetApiData();
  }, []);

  useEffect(() => {
    if (!isAdminViewUnlocked && (activePage === "admin" || activePage === "academic")) {
      setActivePage("dashboard");
    }
  }, [activePage, isAdminViewUnlocked]);

  useEffect(() => {
    const loadActiveRole = async () => {
      if (!contract || !activeAccount?.address) {
        setActiveRoleId(0);
        return;
      }

      try {
        const role = await readContract({
          contract,
          method: "roles",
          params: [activeAccount.address],
        });
        setActiveRoleId(Number(role));
      } catch {
        setActiveRoleId(0);
      }
    };

    loadActiveRole();
  }, [contract, activeAccount?.address]);

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
    if (!contract) {
      return;
    }

    const [created, status, transfers] = await Promise.all([
      getContractEvents({
        contract,
        events: [prepareEvent({ signature: "event BatchCreated(uint256 indexed batchId,address indexed owner)" })],
        filters: { batchId },
        fromBlock: 0n,
        toBlock: "latest",
      }),
      getContractEvents({
        contract,
        events: [prepareEvent({ signature: "event StatusUpdated(uint256 indexed batchId,uint8 newStatus)" })],
        filters: { batchId },
        fromBlock: 0n,
        toBlock: "latest",
      }),
      getContractEvents({
        contract,
        events: [
          prepareEvent({
            signature: "event OwnershipTransferred(uint256 indexed batchId,address indexed from,address indexed to)",
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
    if (!contract || !isGanacheReady) {
      return;
    }

    try {
      setIsRefreshing(true);

      const [created, status, transfers] = await Promise.all([
        getContractEvents({
          contract,
          events: [prepareEvent({ signature: "event BatchCreated(uint256 indexed batchId,address indexed owner)" })],
          fromBlock: 0n,
          toBlock: "latest",
        }),
        getContractEvents({
          contract,
          events: [prepareEvent({ signature: "event StatusUpdated(uint256 indexed batchId,uint8 newStatus)" })],
          fromBlock: 0n,
          toBlock: "latest",
        }),
        getContractEvents({
          contract,
          events: [
            prepareEvent({
              signature: "event OwnershipTransferred(uint256 indexed batchId,address indexed from,address indexed to)",
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
        setContractAdmin("");
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
    if (!contract || !isGanacheReady) {
      return;
    }
    refreshNetworkData();
  }, [contract, isGanacheReady]);

  const handleSearchBatch = async (event) => {
    event?.preventDefault();

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
        quantityKg: Number(data[2]),
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
    event?.preventDefault();

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
    event?.preventDefault();

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
      const batchData = await readContract({
        contract,
        method: "getBatch",
        params: [batchId],
      });

      if (batchData[4]?.toLowerCase() !== activeAccount.address.toLowerCase()) {
        setMessage("Only the current batch owner can transfer ownership. Switch to the owner wallet first.");
        return;
      }

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
      const batchData = await readContract({
        contract,
        method: "getBatch",
        params: [batchId],
      });
      const currentOwner = batchData[4];
      const currentStatusIndex = Number(batchData[5]);
      const requiredRoleId = STATUS_ROLE_REQUIREMENTS[statusIndex];

      if (currentOwner?.toLowerCase() !== activeAccount.address.toLowerCase()) {
        setMessage("This wallet is not the current owner of the batch. Transfer the batch to the processor/distributor/retailer wallet before updating status.");
        return;
      }

      if (requiredRoleId && activeRoleId !== requiredRoleId) {
        setMessage(`This action requires ${ROLE_LABELS[requiredRoleId]} role. Connected wallet role is ${activeRoleLabel}.`);
        return;
      }

      if (statusIndex < currentStatusIndex) {
        setMessage("Status cannot move backward in this workflow.");
        return;
      }

      if (statusIndex === currentStatusIndex) {
        setMessage(`Batch is already marked as ${STATUS_LABELS[statusIndex].replace("_", " ")}.`);
        return;
      }

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
    event?.preventDefault();

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
      const assignedUser = assignRoleUser;
      setAssignRoleUser("");
      setMessage(`Role ${ROLE_LABELS[assignRoleId]} assigned to ${formatAddress(assignedUser)}.`);
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

  const navItems = isAdminViewUnlocked
    ? [
        ...BASE_NAV_ITEMS,
        { key: "admin", label: "Admin Platform" },
        { key: "academic", label: "Academic View" },
      ]
    : BASE_NAV_ITEMS;

  const renderActivePage = () => {
    switch (activePage) {
      case "trace":
        return (
          <TraceabilityPage
            searchBatchId={searchBatchId}
            setSearchBatchId={setSearchBatchId}
            handleSearchBatch={handleSearchBatch}
            batchDetails={batchDetails}
            batchEvents={batchEvents}
            statusPercent={statusPercent}
            formatAddress={formatAddress}
            isWorking={isWorking}
            IS_PLACEHOLDER={IS_PLACEHOLDER}
          />
        );
      case "analytics":
        return (
          <ReportsPage
            networkMetrics={networkMetrics}
            STATUS_LABELS={STATUS_LABELS}
            refreshNetworkData={refreshNetworkData}
            traceabilityCoverage={traceabilityCoverage}
            integrityScore={integrityScore}
            efficiencyScore={efficiencyScore}
            completedBatches={completedBatches}
            isWorking={isWorking}
            IS_PLACEHOLDER={IS_PLACEHOLDER}
            formatAddress={formatAddress}
            datasetSummary={datasetSummary}
            datasetRecords={datasetRecords}
            datasetApiError={datasetApiError}
            loadDatasetApiData={loadDatasetApiData}
            toSvgPoints={toSvgPoints}
          />
        );
      case "admin":
        return isAdminViewUnlocked ? (
          <AdminPage
            isWorking={isWorking}
            IS_PLACEHOLDER={IS_PLACEHOLDER}
            formatAddress={formatAddress}
            activeAccount={activeAccount}
            assignRoleUser={assignRoleUser}
            setAssignRoleUser={setAssignRoleUser}
            assignRoleId={assignRoleId}
            setAssignRoleId={setAssignRoleId}
            handleAssignRole={handleAssignRole}
            refreshNetworkData={refreshNetworkData}
            contractAdmin={contractAdmin}
            reloadDatasetInsights={reloadDatasetInsights}
          />
        ) : null;
      case "academic":
        return isAdminViewUnlocked ? (
          <AcademicPage
            ganacheChain={ganacheChain}
            datasetSummary={datasetSummary}
            datasetChallenges={datasetChallenges}
            traceabilityCoverage={traceabilityCoverage}
            integrityScore={integrityScore}
            efficiencyScore={efficiencyScore}
          />
        ) : null;
      default:
        return (
          <DashboardPage
            networkMetrics={networkMetrics}
            integrityScore={integrityScore}
            createBatchId={createBatchId}
            setCreateBatchId={setCreateBatchId}
            createQuantity={createQuantity}
            setCreateQuantity={setCreateQuantity}
            createOrigin={createOrigin}
            setCreateOrigin={setCreateOrigin}
            handleCreateBatch={handleCreateBatch}
            transferBatchId={transferBatchId}
            setTransferBatchId={setTransferBatchId}
            transferOwner={transferOwner}
            setTransferOwner={setTransferOwner}
            handleTransferOwnership={handleTransferOwnership}
            statusBatchId={statusBatchId}
            setStatusBatchId={setStatusBatchId}
            handleUpdateStatus={handleUpdateStatus}
            allBatches={allBatches}
            formatAddress={formatAddress}
            refreshNetworkData={refreshNetworkData}
            isWorking={isWorking}
            IS_PLACEHOLDER={IS_PLACEHOLDER}
            STATUS_LABELS={STATUS_LABELS}
            lastUpdated={networkMetrics.lastUpdated}
          />
        );
    }
  };

  const openResource = (resourceName) => {
    const resource = RESOURCE_CONTENT[resourceName];
    if (resource) {
      setResourceModal(resource);
    }
  };

  const openNotifications = () => {
    const ownerHint =
      batchDetails?.currentOwner && activeAccount?.address
        ? batchDetails.currentOwner.toLowerCase() === activeAccount.address.toLowerCase()
          ? "You currently own the loaded batch."
          : "Loaded batch is owned by another wallet."
        : "Load a batch in Traceability to inspect ownership.";

    setMessage(`Wallet: ${activeRoleLabel}. Network: ${chainLabel}. ${ownerHint}`);
  };

  return (
    <div className="app-root bg-surface text-on-surface">
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        navItems={navItems}
        activeAccount={activeAccount}
        formatAddress={formatAddress}
        isConnecting={isConnecting}
        onConnectWallet={connectWallet}
        onDisconnect={() => {
          disconnect();
          setIsWalletMenuOpen(false);
          setMessage("Wallet disconnected.");
        }}
        isWorking={isWorking}
        isWalletMenuOpen={isWalletMenuOpen}
        setIsWalletMenuOpen={setIsWalletMenuOpen}
        walletMenuRef={walletMenuRef}
        chainLabel={chainLabel}
        onOpenNotifications={openNotifications}
        activeRoleLabel={activeRoleLabel}
      />

      {IS_PLACEHOLDER ? (
        <div className="px-6 pt-24">
          <div className="mx-auto max-w-7xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
            Contract is not ready. Deploy with <code>node scripts/deploy.js</code>, then refresh.
          </div>
        </div>
      ) : null}

      {renderActivePage()}
      <Footer onOpenResource={openResource} />

      {resourceModal ? (
        <div className="fixed inset-0 z-[70] bg-primary/25 backdrop-blur-sm px-4 py-10">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-emerald-100 bg-white p-6 shadow-[0_24px_50px_rgba(13,40,29,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-h3 text-h3 text-primary">{resourceModal.title}</h2>
                <p className="mt-2 text-body-sm text-on-surface-variant">CassavaTrace reference information</p>
              </div>
              <button
                type="button"
                onClick={() => setResourceModal(null)}
                className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-emerald-50 hover:text-secondary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {resourceModal.body.map((paragraph) => (
                <p key={paragraph} className="text-body-md text-on-surface-variant">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {statusMessage ? (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-xl bg-primary-container px-4 py-3 text-sm text-white shadow-[0_16px_40px_rgba(13,40,29,0.28)]">
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}
