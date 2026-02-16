import { useMemo, useState } from "react";
import {
  getContract,
  prepareContractCall,
  readContract,
  getContractEvents,
  prepareEvent,
} from "thirdweb";
import {
  useActiveAccount,
  useActiveWalletChain,
  useConnect,
  useDisconnect,
  useSendTransaction,
} from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import contractAddressData from "./contract-address.json";
import deploymentAbi from "./abi.json";
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

const formatAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

export default function App() {
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const [createBatchId, setCreateBatchId] = useState("");
  const [createOrigin, setCreateOrigin] = useState("");
  const [createQuantity, setCreateQuantity] = useState("");

  const [transferBatchId, setTransferBatchId] = useState("");
  const [transferOwner, setTransferOwner] = useState("");

  const [statusBatchId, setStatusBatchId] = useState("");

  const [searchBatchId, setSearchBatchId] = useState("");
  const [batchDetails, setBatchDetails] = useState(null);
  const [batchEvents, setBatchEvents] = useState([]);

  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  const isWorking = isBusy || isConnecting || isPending;
  const hasClientId =
    import.meta.env.VITE_THIRDWEB_CLIENT_ID &&
    import.meta.env.VITE_THIRDWEB_CLIENT_ID !== "YOUR_THIRDWEB_CLIENT_ID";

  const setMessage = (message) => {
    setStatusMessage(message);
    if (message) {
      setTimeout(() => setStatusMessage(""), 6000);
    }
  };

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
  }, [CONTRACT_ADDRESS, IS_PLACEHOLDER]);

  const connectWallet = async () => {
    try {
      if (!hasClientId) {
        setMessage("Set VITE_THIRDWEB_CLIENT_ID and restart the UI.");
        return;
      }
      setIsBusy(true);
      await connect({
        client,
        wallet: createWallet("io.metamask"),
        chain: ganacheChain,
      });
      setMessage(
        IS_PLACEHOLDER
          ? "⚠️ Run deploy script first: node scripts/deploy.js with GANACHE_PRIVATE_KEY set."
          : "Wallet connected."
      );
    } catch (error) {
      setMessage(error.message || "Failed to connect wallet.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateBatch = async (event) => {
    event.preventDefault();
    if (!contract) {
      setMessage("❌ Deploy contract first (run: node scripts/deploy.js with GANACHE_PRIVATE_KEY)");
      return;
    }
    try {
      setIsBusy(true);
      const transaction = prepareContractCall({
        contract,
        method: "createBatch",
        params: [
          BigInt(createBatchId),
          createOrigin.trim(),
          BigInt(createQuantity),
        ],
      });
      await sendTransaction({ transaction });
      setMessage("Batch created successfully.");
      setCreateBatchId("");
      setCreateOrigin("");
      setCreateQuantity("");
    } catch (error) {
      setMessage(error.reason || error.message || "Create batch failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleTransferOwnership = async (event) => {
    event.preventDefault();
    if (!contract) {
      setMessage("❌ Deploy contract first (run: node scripts/deploy.js with GANACHE_PRIVATE_KEY)");
      return;
    }
    try {
      setIsBusy(true);
      const transaction = prepareContractCall({
        contract,
        method: "transferOwnership",
        params: [BigInt(transferBatchId), transferOwner.trim()],
      });
      await sendTransaction({ transaction });
      setMessage("Ownership transferred.");
      setTransferBatchId("");
      setTransferOwner("");
    } catch (error) {
      setMessage(error.reason || error.message || "Transfer failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateStatus = async (statusIndex) => {
    if (!contract) {
      setMessage("❌ Deploy contract first (run: node scripts/deploy.js with GANACHE_PRIVATE_KEY)");
      return;
    }
    try {
      setIsBusy(true);
      const transaction = prepareContractCall({
        contract,
        method: "updateStatus",
        params: [BigInt(statusBatchId), statusIndex],
      });
      await sendTransaction({ transaction });
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error.reason || error.message || "Status update failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSearchBatch = async (event) => {
    event.preventDefault();
    if (!contract) {
      setMessage("❌ Deploy contract first (run: node scripts/deploy.js with GANACHE_PRIVATE_KEY)");
      return;
    }
    try {
      setIsBusy(true);
      const data = await readContract({
        contract,
        method: "getBatch",
        params: [BigInt(searchBatchId)],
      });
      const details = {
        batchId: data[0].toString(),
        originLocation: data[1],
        quantityKg: data[2].toString(),
        createdAt: new Date(Number(data[3]) * 1000).toLocaleString(),
        currentOwner: data[4],
        status: STATUS_LABELS[Number(data[5])],
        exists: data[6],
      };
      setBatchDetails(details);
      await fetchBatchEvents(searchBatchId);
    } catch (error) {
      setBatchDetails(null);
      setBatchEvents([]);
      setMessage(error.reason || error.message || "Batch not found.");
    } finally {
      setIsBusy(false);
    }
  };

  const fetchBatchEvents = async (batchId) => {
    if (!contract) return;
    const numericBatchId = BigInt(batchId);
    const [created, status, transfers] = await Promise.all([
      getContractEvents({
        contract,
        events: [
          prepareEvent({
            signature: "event BatchCreated(uint256 indexed batchId,address indexed owner)",
          }),
        ],
        filters: { batchId: numericBatchId },
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
        filters: { batchId: numericBatchId },
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
        filters: { batchId: numericBatchId },
        fromBlock: 0n,
        toBlock: "latest",
      }),
    ]);

    const mapped = [
      ...created.map((event) => ({
        type: "BatchCreated",
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        detail: `Owner ${event.args.owner}`,
      })),
      ...status.map((event) => ({
        type: "StatusUpdated",
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        detail: `Status ${STATUS_LABELS[Number(event.args.newStatus)]}`,
      })),
      ...transfers.map((event) => ({
        type: "OwnershipTransferred",
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        detail: `${formatAddress(event.args.from)} -> ${formatAddress(event.args.to)}`,
      })),
    ].sort((a, b) => a.blockNumber - b.blockNumber);

    setBatchEvents(mapped);
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>🌿 Cassava Supply Chain</h1>
          <p className="navbar-subtitle">Blockchain Traceability Dashboard</p>
        </div>

        <div className="navbar-spacer" />

        <div className="navbar-status">
          <div className="network-badge">
            <span className="dot" />
            <span>Ganache</span>
          </div>
        </div>

        <div className="navbar-wallet">
          <div className="wallet-avatar-shell">
            <button className="wallet-avatar" type="button" aria-haspopup="true">
              {activeAccount ? (
                <div className="avatar-content">
                  <span className="avatar-circle">{formatAddress(activeAccount.address).charAt(0).toUpperCase()}</span>
                  <span className="avatar-label">Connected</span>
                </div>
              ) : (
                <div className="avatar-content">
                  <span className="avatar-circle">W</span>
                  <span className="avatar-label">Wallet</span>
                </div>
              )}
            </button>

            <div className="wallet-dropdown">
              <div className="dropdown-header">
                {activeAccount ? (
                  <>
                    <p className="dropdown-title">Wallet Connected</p>
                    <p className="dropdown-address">{formatAddress(activeAccount.address)}</p>
                  </>
                ) : (
                  <p className="dropdown-title">Connect Your Wallet</p>
                )}
              </div>

              <button
                className="dropdown-button primary"
                onClick={connectWallet}
                disabled={isWorking}
              >
                {activeAccount ? "Switch Network" : "🦊 MetaMask"}
              </button>

              {activeAccount && (
                <button
                  className="dropdown-button ghost"
                  onClick={disconnect}
                  disabled={isWorking}
                >
                  Disconnect
                </button>
              )}

              <p className="dropdown-footer">
                {activeChain ? `Chain: ${activeChain.name} (${activeChain.id})` : "No network"}
              </p>
            </div>
          </div>
        </div>
      </nav>

      <main className="grid">
        {IS_PLACEHOLDER && (
          <section className="panel wide alert-panel">
            <div className="alert-content">
              <p className="alert-icon">⚠️</p>
              <div>
                <h3>Contract Not Ready</h3>
                <p>Run the deploy script to initialize the contract:</p>
                <code style={{ background: "#f0f0f0", padding: "8px 12px", borderRadius: "6px", display: "block", marginTop: "8px" }}>
                  $env:GANACHE_PRIVATE_KEY="your_key"; node scripts/deploy.js
                </code>
              </div>
            </div>
          </section>
        )}
        <section className="panel">
          <h2>Create Batch</h2>
          <form onSubmit={handleCreateBatch} className="form">
            <label>
              Batch ID
              <input
                value={createBatchId}
                onChange={(event) => setCreateBatchId(event.target.value)}
                placeholder="e.g. 101"
                required
              />
            </label>
            <label>
              Origin Location
              <input
                value={createOrigin}
                onChange={(event) => setCreateOrigin(event.target.value)}
                placeholder="e.g. Oyo State"
                required
              />
            </label>
            <label>
              Quantity (kg)
              <input
                value={createQuantity}
                onChange={(event) => setCreateQuantity(event.target.value)}
                placeholder="e.g. 250"
                required
              />
            </label>
            <button className="primary" type="submit" disabled={isWorking}>
              Create Batch
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Transfer Ownership</h2>
          <form onSubmit={handleTransferOwnership} className="form">
            <label>
              Batch ID
              <input
                value={transferBatchId}
                onChange={(event) => setTransferBatchId(event.target.value)}
                placeholder="e.g. 101"
                required
              />
            </label>
            <label>
              New Owner Address
              <input
                value={transferOwner}
                onChange={(event) => setTransferOwner(event.target.value)}
                placeholder="0x..."
                required
              />
            </label>
            <button className="primary" type="submit" disabled={isWorking}>
              Transfer
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Update Status</h2>
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Batch ID
              <input
                value={statusBatchId}
                onChange={(event) => setStatusBatchId(event.target.value)}
                placeholder="e.g. 101"
                required
              />
            </label>
            <div className="status-buttons">
              {STATUS_LABELS.map((label, index) => (
                <button
                  className="ghost"
                  type="button"
                  key={label}
                  onClick={() => handleUpdateStatus(index)}
                  disabled={isWorking || !statusBatchId}
                >
                  {label.replace("_", " ")}
                </button>
              ))}
            </div>
          </form>
        </section>

        <section className="panel wide">
          <div className="panel-header">
            <div>
              <h2>Search Batch</h2>
              <p className="muted">Pull a batch record plus its on-chain history.</p>
            </div>
            <form onSubmit={handleSearchBatch} className="inline-form">
              <input
                value={searchBatchId}
                onChange={(event) => setSearchBatchId(event.target.value)}
                placeholder="Batch ID"
                required
              />
              <button className="primary" type="submit" disabled={isWorking}>
                Search
              </button>
            </form>
          </div>

          {batchDetails ? (
            <div className="details">
              <div>
                <p className="label">Batch ID</p>
                <p className="value">{batchDetails.batchId}</p>
              </div>
              <div>
                <p className="label">Origin</p>
                <p className="value">{batchDetails.originLocation}</p>
              </div>
              <div>
                <p className="label">Quantity</p>
                <p className="value">{batchDetails.quantityKg} kg</p>
              </div>
              <div>
                <p className="label">Created</p>
                <p className="value">{batchDetails.createdAt}</p>
              </div>
              <div>
                <p className="label">Owner</p>
                <p className="value mono">{batchDetails.currentOwner}</p>
              </div>
              <div>
                <p className="label">Status</p>
                <p className="value chip">{batchDetails.status}</p>
              </div>
            </div>
          ) : (
            <p className="muted">No batch loaded yet.</p>
          )}

          <div className="history">
            <h3>History</h3>
            {batchEvents.length === 0 ? (
              <p className="muted">No events for this batch yet.</p>
            ) : (
              <ul>
                {batchEvents.map((event) => (
                  <li key={`${event.txHash}-${event.type}`}>
                    <div>
                      <span className="pill">{event.type}</span>
                      <span className="meta">Block {event.blockNumber}</span>
                    </div>
                    <p>{event.detail}</p>
                    <p className="mono small">{event.txHash}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {statusMessage ? <div className="toast">{statusMessage}</div> : null}
    </div>
  );
}
