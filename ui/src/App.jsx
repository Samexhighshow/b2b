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
  { key: "dashboard", label: "Dashboard" },
  { key: "trace", label: "Traceability" },
  { key: "analytics", label: "Reports" },
];

const formatAddress = (address) => (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");

const parseNumericInput = (value, fieldLabel) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldLabel} is required.`);
  if (!/^\d+$/.test(trimmed)) throw new Error(`${fieldLabel} must be a whole number.`);
  return BigInt(trimmed);
};

const parseAppError = (error) => {
  const base = error?.reason || error?.shortMessage || error?.message || "Transaction failed.";

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

const toSvgPoints = (values, height = 190, widthStep = 56, multiplier = 2.2) =>
  values
    .map((value, index) => {
      const x = index * widthStep;
      const y = Math.max(10, height - value * multiplier);
      return `${x},${y}`;
    })
    .join(" ");

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [networkMetrics, setNetworkMetrics] = useState({
    totalBatches: 0,
    totalWeight: 0,
    statusCounts: [0, 0, 0, 0],
    recentRows: [],
    speedSeries: [0, 0, 0, 0, 0, 0, 0, 0],
    costSeries: [0, 0, 0, 0, 0, 0, 0, 0],
    lastUpdated: null,
  });

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
    if (!contract) return;

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
    if (!contract) return;
    refreshNetworkData();
  }, [contract]);

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

    try {
      setIsBusy(true);
      const batchId = parseNumericInput(transferBatchId, "Batch ID");
      const transaction = prepareContractCall({
        contract,
        method: "transferOwnership",
        params: [batchId, transferOwner.trim()],
      });

      await sendTransaction({ transaction });
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

    try {
      setIsBusy(true);
      const batchId = parseNumericInput(statusBatchId, "Batch ID");
      const transaction = prepareContractCall({
        contract,
        method: "updateStatus",
        params: [batchId, statusIndex],
      });

      await sendTransaction({ transaction });
      setMessage(`Status changed to ${STATUS_LABELS[statusIndex].replace("_", " ")}.`);
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

  return (
    <div className="app-root">
      <header className="main-navbar">
        <div className="nav-brand">
          <span className="brand-icon">C</span>
          <div>
            <strong>CassavaChain</strong>
            <small>Blockchain Supply Chain Management</small>
          </div>
        </div>

        <nav className="main-nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? "active" : ""}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
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
                <div className="line-chart">
                  <svg viewBox="0 0 392 190" preserveAspectRatio="none" role="img" aria-label="Efficiency chart">
                    <polyline points={toSvgPoints(networkMetrics.speedSeries)} className="line speed" />
                    <polyline points={toSvgPoints(networkMetrics.costSeries, 190, 56, 2.6)} className="line cost" />
                  </svg>
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
          </>
        ) : null}
      </main>

      {statusMessage ? <div className="toast">{statusMessage}</div> : null}
    </div>
  );
}
