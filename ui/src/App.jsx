import { useMemo, useState } from "react";
import { ethers } from "ethers";
import abi from "./abi/CassavaSupplyChain.json";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourContractAddress";

const STATUS_LABELS = ["CREATED", "PROCESSED", "IN_TRANSIT", "DELIVERED"];

const formatAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

export default function App() {
  const [account, setAccount] = useState("");
  const [networkName, setNetworkName] = useState("");
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

  const hasProvider = typeof window !== "undefined" && window.ethereum;

  const provider = useMemo(() => {
    if (!hasProvider) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, [hasProvider]);

  const setMessage = (message) => {
    setStatusMessage(message);
    if (message) {
      setTimeout(() => setStatusMessage(""), 6000);
    }
  };

  const getSignerContract = async () => {
    if (!provider) throw new Error("MetaMask not detected.");
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
  };

  const connectWallet = async () => {
    try {
      if (!provider) {
        setMessage("MetaMask not detected. Install the extension first.");
        return;
      }
      setIsBusy(true);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      setAccount(await signer.getAddress());
      setNetworkName(`${network.name} (chain ${network.chainId})`);
      setMessage("Wallet connected.");
    } catch (error) {
      setMessage(error.message || "Failed to connect wallet.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateBatch = async (event) => {
    event.preventDefault();
    try {
      setIsBusy(true);
      const contract = await getSignerContract();
      const tx = await contract.createBatch(
        BigInt(createBatchId),
        createOrigin.trim(),
        BigInt(createQuantity)
      );
      await tx.wait();
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
    try {
      setIsBusy(true);
      const contract = await getSignerContract();
      const tx = await contract.transferOwnership(
        BigInt(transferBatchId),
        transferOwner.trim()
      );
      await tx.wait();
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
    try {
      setIsBusy(true);
      const contract = await getSignerContract();
      const tx = await contract.updateStatus(BigInt(statusBatchId), statusIndex);
      await tx.wait();
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error.reason || error.message || "Status update failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSearchBatch = async (event) => {
    event.preventDefault();
    try {
      setIsBusy(true);
      const contract = await getSignerContract();
      const data = await contract.getBatch(BigInt(searchBatchId));
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
      await fetchBatchEvents(contract, searchBatchId);
    } catch (error) {
      setBatchDetails(null);
      setBatchEvents([]);
      setMessage(error.reason || error.message || "Batch not found.");
    } finally {
      setIsBusy(false);
    }
  };

  const fetchBatchEvents = async (contract, batchId) => {
    const numericBatchId = BigInt(batchId);
    const createdFilter = contract.filters.BatchCreated(numericBatchId);
    const statusFilter = contract.filters.StatusUpdated(numericBatchId);
    const transferFilter = contract.filters.OwnershipTransferred(numericBatchId);

    const [created, status, transfers] = await Promise.all([
      contract.queryFilter(createdFilter, 0, "latest"),
      contract.queryFilter(statusFilter, 0, "latest"),
      contract.queryFilter(transferFilter, 0, "latest"),
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
      <header className="hero">
        <div>
          <p className="eyebrow">Cassava Traceability</p>
          <h1>Supply Chain Control Deck</h1>
          <p className="subtitle">
            Track cassava batches end-to-end with a clean, local-only workflow on
            Ganache.
          </p>
        </div>
        <div className="hero-card">
          <div className="status-row">
            <span className="dot" />
            <span>Local Ganache</span>
          </div>
          <p className="label">Contract</p>
          <p className="mono">{CONTRACT_ADDRESS}</p>
          <button
            className="primary"
            onClick={connectWallet}
            disabled={isBusy}
          >
            {account ? `Connected ${formatAddress(account)}` : "Connect Wallet"}
          </button>
          <p className="meta">{networkName || "Awaiting connection"}</p>
        </div>
      </header>

      <main className="grid">
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
            <button className="primary" type="submit" disabled={isBusy}>
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
            <button className="primary" type="submit" disabled={isBusy}>
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
                  disabled={isBusy || !statusBatchId}
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
              <button className="primary" type="submit" disabled={isBusy}>
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
