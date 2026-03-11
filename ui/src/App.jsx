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

const NAV_ITEMS = [
  { key: "dashboard", icon: "dashboard", label: "Dashboard" },
  { key: "trace", icon: "trace", label: "Traceability" },
  { key: "analytics", icon: "reports", label: "Reports" },
];

const formatAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

const parseNumericInput = (value, fieldLabel) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldLabel} is required.`);
  if (!/^\d+$/.test(trimmed)) throw new Error(`${fieldLabel} must be a whole number.`);
  return BigInt(trimmed);
};


const Icon = ({ name, className = "icon" }) => {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>;
    case "trace":
      return <svg {...common}><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h4a4 4 0 0 0 4-4V8"/></svg>;
    case "reports":
      return <svg {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20V8"/></svg>;
    case "leaf":
      return <svg {...common}><path d="M5 14c7 1 11-2 14-9 1 8-4 14-11 14-2 0-3-2-3-5Z"/><path d="M8 13c2 0 4 1 6 3"/></svg>;
    case "wallet":
      return <svg {...common}><rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M16 12h4.5"/><path d="M5 9h7"/></svg>;
    case "warning":
      return <svg {...common}><path d="M12 3 2.6 19h18.8L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".8" fill="currentColor"/></svg>;
    case "batch":
      return <svg {...common}><path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></svg>;
    case "check":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-4.6"/></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"/></svg>;
    case "document":
      return <svg {...common}><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v6h5"/><path d="M10 13h6"/><path d="M10 17h6"/></svg>;
    case "swap":
      return <svg {...common}><path d="M4 7h13"/><path d="m13 3 4 4-4 4"/><path d="M20 17H7"/><path d="m11 13-4 4 4 4"/></svg>;
    case "truck":
      return <svg {...common}><path d="M2 7h11v8H2z"/><path d="M13 10h4l3 3v2h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case "chain":
      return <svg {...common}><path d="M10 13a4 4 0 0 1 0-6l2-2a4 4 0 1 1 6 6l-1 1"/><path d="M14 11a4 4 0 0 1 0 6l-2 2a4 4 0 1 1-6-6l1-1"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
  }
};

const parseAppError = (error) => {
  const base = error?.reason || error?.shortMessage || error?.message || "Transaction failed.";

  if (base.includes("Invalid role")) {
    return "Wallet role is not FARMER. Assign FARMER role before creating a batch.";
  }

  if (base.includes("Batch exists")) {
    return "Batch ID already exists. Use a different Batch ID.";
  }

  return base;
};

export default function App() {
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");

  const [createBatchId, setCreateBatchId] = useState("");
  const [createOrigin, setCreateOrigin] = useState("");
  const [createQuantity, setCreateQuantity] = useState("");
  const [transferBatchId, setTransferBatchId] = useState("");
  const [transferOwner, setTransferOwner] = useState("");
  const [statusBatchId, setStatusBatchId] = useState("");
  const [searchBatchId, setSearchBatchId] = useState("");
  const [batchDetails, setBatchDetails] = useState(null);
  const [batchEvents, setBatchEvents] = useState([]);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);

  const walletMenuRef = useRef(null);
  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();

  const isWorking = isBusy || isConnecting || isPending;
  const hasClientId =
    import.meta.env.VITE_THIRDWEB_CLIENT_ID &&
    import.meta.env.VITE_THIRDWEB_CLIENT_ID !== "YOUR_THIRDWEB_CLIENT_ID";
  const chainLabel = activeChain?.id
    ? `${activeChain.name ?? "Unknown"} (${activeChain.id})`
    : "No network";

  const setMessage = (message) => {
    setStatusMessage(message);
    if (message) setTimeout(() => setStatusMessage(""), 6000);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target)) {
        setIsWalletMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const contract = useMemo(() => {
    if (!CONTRACT_ADDRESS || IS_PLACEHOLDER) return null;
    return getContract({
      client,
      chain: ganacheChain,
      address: CONTRACT_ADDRESS,
      abi: deploymentAbi,
    });
  }, [CONTRACT_ADDRESS]);

  const connectWallet = async () => {
    try {
      if (!hasClientId) {
        setMessage("Set VITE_THIRDWEB_CLIENT_ID and restart the UI.");
        return;
      }

      setIsBusy(true);
      await connect(async () => {
        const wallet = createWallet("io.metamask");
        await wallet.connect({ client, chain: ganacheChain });
        return wallet;
      });

      setIsWalletMenuOpen(false);
      setMessage(
        IS_PLACEHOLDER
          ? "Run deploy script first: node scripts/deploy.js with GANACHE_PRIVATE_KEY set."
          : "Wallet connected."
      );
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateBatch = async (event) => {
    event.preventDefault();
    if (!contract) {
      setMessage("Deploy contract first (node scripts/deploy.js with GANACHE_PRIVATE_KEY).");
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
      await sendTransaction({ transaction });
      setMessage("Batch created successfully.");
      setCreateBatchId("");
      setCreateOrigin("");
      setCreateQuantity("");
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleTransferOwnership = async (event) => {
    event.preventDefault();
    if (!contract) {
      setMessage("Deploy contract first (node scripts/deploy.js with GANACHE_PRIVATE_KEY).");
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
      await sendTransaction({ transaction });
      setMessage("Ownership transferred.");
      setTransferBatchId("");
      setTransferOwner("");
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateStatus = async (statusIndex) => {
    if (!contract) {
      setMessage("Deploy contract first (node scripts/deploy.js with GANACHE_PRIVATE_KEY).");
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
      await sendTransaction({ transaction });
      setMessage("Status updated.");
    } catch (error) {
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSearchBatch = async (event) => {
    event.preventDefault();
    if (!contract) {
      setMessage("Deploy contract first (node scripts/deploy.js with GANACHE_PRIVATE_KEY).");
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
      });
      await fetchBatchEvents(batchId);
    } catch (error) {
      setBatchDetails(null);
      setBatchEvents([]);
      setMessage(parseAppError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const fetchBatchEvents = async (batchId) => {
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

    const mapped = [
      ...created.map((item) => ({
        type: "BatchCreated",
        blockNumber: item.blockNumber,
        txHash: item.transactionHash,
        detail: `Owner ${formatAddress(item.args.owner)}`,
      })),
      ...status.map((item) => ({
        type: "StatusUpdated",
        blockNumber: item.blockNumber,
        txHash: item.transactionHash,
        detail: `Status ${STATUS_LABELS[Number(item.args.newStatus)]}`,
      })),
      ...transfers.map((item) => ({
        type: "OwnershipTransferred",
        blockNumber: item.blockNumber,
        txHash: item.transactionHash,
        detail: `${formatAddress(item.args.from)} → ${formatAddress(item.args.to)}`,
      })),
    ].sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

    setBatchEvents(mapped);
  };

  return (
    <div className="layout-root">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="leaf" /></span>
          <div>
            <strong>CassavaChain</strong>
            <small>Agri Traceability</small>
          </div>
        </div>

        <nav className="side-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`side-link ${activePage === item.key ? "active" : ""}`}
              onClick={() => setActivePage(item.key)}
              type="button"
            >
              <Icon name={item.icon} className="nav-icon" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="pulse" />
          Blockchain Connected
        </div>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Connected Stakeholder Dashboard</p>
            <h1>Supply Chain Control Center</h1>
          </div>

          <div className="wallet-avatar-shell" ref={walletMenuRef}>
            <button
              className="connect-btn"
              type="button"
              aria-haspopup="true"
              aria-expanded={isWalletMenuOpen}
              onClick={() => setIsWalletMenuOpen((prev) => !prev)}
            >
              <Icon name="wallet" className="btn-icon" />
              {activeAccount ? formatAddress(activeAccount.address) : "Connect Wallet"}
            </button>

            <div className={`wallet-dropdown ${isWalletMenuOpen ? "open" : ""}`}>
              <p className="wallet-title">
                {activeAccount ? `Connected: ${formatAddress(activeAccount.address)}` : "Connect wallet"}
              </p>
              <p className="muted">Network: {chainLabel}</p>
              <button className="primary" onClick={connectWallet} disabled={isWorking}>
                {activeAccount ? "Switch Network" : "MetaMask"}
              </button>
              {activeAccount && (
                <button
                  className="ghost"
                  onClick={() => {
                    disconnect();
                    setIsWalletMenuOpen(false);
                  }}
                  disabled={isWorking}
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-grid">
          {IS_PLACEHOLDER && (
            <section className="card wide warning-card">
              <h2 className="title-with-icon"><Icon name="warning" className="icon-sm" />Contract Not Ready</h2>
              <p className="muted">
                Deploy your contract first with <code>node scripts/deploy.js</code>, then refresh this page.
              </p>
            </section>
          )}

          <section className="card stat-card">
            <h3 className="title-with-icon"><Icon name="batch" className="icon-sm" />Active Batches</h3>
            <p className="big-number">{batchDetails ? 1 : 0}</p>
            <p className="stat-foot">Realtime on-chain visibility</p>
          </section>

          <section className="card stat-card">
            <h3 className="title-with-icon"><Icon name="check" className="icon-sm" />Last Tx Status</h3>
            <p className="big-number success">Success</p>
            <p className="stat-foot">Synced to blockchain</p>
          </section>

          <section className="card stat-card">
            <h3 className="title-with-icon"><Icon name="bolt" className="icon-sm" />Gas Optimization</h3>
            <p className="big-number">L2 Ready</p>
            <p className="stat-foot">Reduced transaction costs</p>
          </section>

          {(activePage === "dashboard" || activePage === "trace") && (
            <section className="card wide">
              <h2 className="title-with-icon"><Icon name="document" className="icon-sm" />Smart Contract Interaction: Log New Batch</h2>
              <form onSubmit={handleCreateBatch} className="form two-col">
                <label>
                  Batch ID
                  <input
                    value={createBatchId}
                    onChange={(event) => setCreateBatchId(event.target.value)}
                    placeholder="e.g. 20231026"
                    required
                  />
                </label>
                <label>
                  Quantity (kg)
                  <input
                    value={createQuantity}
                    onChange={(event) => setCreateQuantity(event.target.value)}
                    placeholder="e.g. 2500"
                    required
                  />
                </label>
                <label className="full">
                  Origin Location
                  <input
                    value={createOrigin}
                    onChange={(event) => setCreateOrigin(event.target.value)}
                    placeholder="Oluwaseun Farms, Ibadan"
                    required
                  />
                </label>
                <button className="primary full" type="submit" disabled={isWorking}>
                  Submit Transaction
                </button>
              </form>
            </section>
          )}

          <section className="card">
            <h2 className="title-with-icon"><Icon name="swap" className="icon-sm" />Transfer Batch Ownership</h2>
            <form onSubmit={handleTransferOwnership} className="form">
              <label>
                Batch ID
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
              <button className="primary" type="submit" disabled={isWorking}>
                Transfer
              </button>
            </form>
          </section>

          <section className="card">
            <h2 className="title-with-icon"><Icon name="truck" className="icon-sm" />Update Status</h2>
            <form className="form" onSubmit={(event) => event.preventDefault()}>
              <label>
                Batch ID
                <input
                  value={statusBatchId}
                  onChange={(event) => setStatusBatchId(event.target.value)}
                  required
                />
              </label>
              <div className="status-buttons">
                {STATUS_LABELS.map((label, index) => (
                  <button
                    key={label}
                    className="ghost"
                    type="button"
                    onClick={() => handleUpdateStatus(index)}
                    disabled={isWorking || !statusBatchId}
                  >
                    {label.replace("_", " ")}
                  </button>
                ))}
              </div>
            </form>
          </section>

          {(activePage === "dashboard" || activePage === "trace") && (
            <section className="card wide">
              <div className="panel-header">
                <h2 className="title-with-icon"><Icon name="search" className="icon-sm" />Supply Chain Traceability View</h2>
                <form onSubmit={handleSearchBatch} className="inline-form">
                  <input
                    value={searchBatchId}
                    onChange={(event) => setSearchBatchId(event.target.value)}
                    placeholder="Enter batch ID"
                    required
                  />
                  <button className="primary" type="submit" disabled={isWorking}>
                    Search
                  </button>
                </form>
              </div>

              {batchDetails ? (
                <div className="details">
                  <p><strong>Batch ID:</strong> {batchDetails.batchId}</p>
                  <p><strong>Origin:</strong> {batchDetails.originLocation}</p>
                  <p><strong>Quantity:</strong> {batchDetails.quantityKg} kg</p>
                  <p><strong>Status:</strong> {batchDetails.status}</p>
                  <p><strong>Current Owner:</strong> {batchDetails.currentOwner}</p>
                  <p><strong>Created:</strong> {batchDetails.createdAt}</p>
                </div>
              ) : (
                <p className="muted">No batch loaded yet.</p>
              )}

              <div className="history">
                <h3 className="title-with-icon"><Icon name="chain" className="icon-sm" />On-chain History</h3>
                {batchEvents.length === 0 ? (
                  <p className="muted">No events for this batch yet.</p>
                ) : (
                  <ul>
                    {batchEvents.map((event) => (
                      <li key={`${event.txHash}-${event.type}`}>
                        <span className="pill">{event.type}</span>
                        <span>Block {event.blockNumber.toString()}</span>
                        <p>{event.detail}</p>
                        <p className="muted mono">{formatAddress(event.txHash)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {statusMessage ? <div className="toast">{statusMessage}</div> : null}
    </div>
  );
}
