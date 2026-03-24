# Live Demo Script (With Real Values)

Use this runbook for a clean, reliable live demo from terminal to UI.

## 1. Terminal Startup Sequence

Run in repo root:

```powershell
npm install
npm run dataset:build
npm run api:dataset
```

In another terminal:

```powershell
cd ui
npm install
npm run dev
```

If contract is not yet deployed:

```powershell
npx hardhat compile
$env:GANACHE_PRIVATE_KEY="0xYOUR_GANACHE_PRIVATE_KEY"
node scripts/deploy.js
```

## 2. MetaMask Setup

Network settings:

- Network Name: Ganache Local
- RPC URL: http://127.0.0.1:7545
- Chain ID: 1337
- Currency Symbol: ETH

Then import one Ganache account private key and connect wallet in the app.

## 3. UI Demo Flow (Suggested)

### Step A: Connect Wallet

- Click Connect Wallet.
- Select MetaMask account on Ganache network.

Expected:

- Wallet chip shows shortened address.

### Step B: Create First Batch

Dashboard > Log New Batch:

- Batch ID: 20260001
- Quantity (kg): 2500
- Origin: Ibadan, Nigeria

Click Submit Transaction and confirm in MetaMask.

Expected:

- Success toast.
- Active batches increases.
- New row appears in Recent Batches.

### Step C: Transfer Ownership

Dashboard > Ownership and Status:

- Batch ID (transfer): 20260001
- New Owner Address: 0xA6aB6f2D4f3F7c8D6E8F8D9e4C2B3A1d6E7F8A9b

Click Transfer Ownership and confirm.

Expected:

- Success toast.
- Owner value updates after refresh.

Note:

- Use an actual address from another Ganache/MetaMask account in your environment.

### Step D: Progress Status

Dashboard > Ownership and Status:

- Batch ID (status): 20260001

Click buttons in order:

1. PROCESSED
2. IN TRANSIT
3. DELIVERED

Confirm each transaction in MetaMask.

Expected:

- Status updates in recent table.
- Metrics and charts become more informative.

### Step E: Verify Traceability

Go to Traceability page:

- Search Batch ID: 20260001

Click Search.

Expected:

- Batch Overview loads.
- Journey timeline shows BatchCreated, OwnershipTransferred, and StatusUpdated events.
- Progress bar reaches 100 percent at DELIVERED.

### Step F: Show Reports

Go to Reports page.

Show these blocks:

- Transaction Efficiency chart
- Tracked Batches by Status
- Data Integrity recent blocks
- System Evaluation KPIs
- Dataset Insights cards and records

Click Reload Data in Dataset Insights.

Expected:

- Dataset values refresh from API.

## 4. Demo Validation Checks

Open these URLs in browser:

- http://127.0.0.1:3030/health
- http://127.0.0.1:3030/api/dataset/summary

Expected:

- health returns status ok.
- summary returns source metadata and high record count.

## 5. Quick Recovery During Live Demo

If API port conflict appears:

```powershell
npm run api:dataset
```

Expected behavior:

- If already running, startup check is successful.
- If 3030 is occupied by another app, API auto-falls back and syncs ui/.env.

If UI does not reflect new API port:

```powershell
cd ui
npm run dev
```

Restarting Vite reloads the updated environment.
