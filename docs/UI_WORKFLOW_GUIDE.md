# UI Workflow Guide

This guide explains exactly how each form, button, and page behaves in the CassavaTrace app.

## 1. UI Data Lanes

The app has two data lanes:

- On-chain lane: smart contract transactions and event history.
- Off-chain lane: dataset API analytics and simulation records.

When you submit transactions, only the on-chain lane is used.

## 2. Wallet Controls

### Connect Wallet

- Opens MetaMask via thirdweb.
- Connects to local Ganache chain (1337).
- Required before writing transactions.

### Disconnect

- Disconnects the active wallet session from the app.

## 3. Dashboard: Inputs and Actions

### A. Log New Batch Form

Fields:

- Batch ID
- Quantity (kg)
- Origin

Button:

- Submit Transaction

What it does:

- Calls createBatch(batchId, origin, quantity) on-chain.
- Prompts MetaMask signature.
- On success: clears form and refreshes dashboard metrics/tables.

### B. Ownership and Status Form

Transfer section fields:

- Batch ID (transfer)
- New Owner Address

Button:

- Transfer Ownership

What it does:

- Calls transferOwnership(batchId, newOwner) on-chain.

Status section field:

- Batch ID (status)

Buttons:

- CREATED
- PROCESSED
- IN TRANSIT
- DELIVERED

What each does:

- Calls updateStatus(batchId, statusIndex) on-chain.

### C. Recent Batches Table

Button:

- Refresh Data

What it does:

- Re-fetches all batch events and current batch states from blockchain.

## 4. Traceability Page

### Search Form

Field:

- Batch ID

Button:

- Search

What it does:

- Reads getBatch(batchId) from contract.
- Loads matching lifecycle events:
  - BatchCreated
  - StatusUpdated
  - OwnershipTransferred

Output panels:

- Batch Overview: origin, quantity, owner, status, created date.
- Traceability Progress: completion bar based on status.
- Blockchain Journey: event timeline with block and tx hash.

## 5. Reports Page

### A. Transaction Efficiency

- Activity and weight trend lines generated from blockchain events.

### B. Tracked Batches by Status

- Counts of CREATED, PROCESSED, IN_TRANSIT, DELIVERED.

### C. Data Integrity - Recent Blocks

- Recent event rows with block references and verification tags.

### D. System Evaluation

Three computed KPIs:

- Traceability Coverage: delivered batches / total batches.
- Data Integrity Score: verified recent rows ratio.
- Transaction Efficiency: activity-overhead score.

### E. Dataset Insights

Button:

- Reload Data

What it does:

- Calls dataset API endpoints:
  - /api/dataset/summary
  - /api/dataset/records

What it shows:

- Total dataset records
- Average loss
- Average transport time
- Record table (ID, region, year, quantity, quality, loss)

Important:

- Dataset section is read-only analytics.
- It does not submit blockchain transactions.

## 6. Error Cases You May See

- Contract not ready: deploy contract first.
- Wallet role error: account is not authorized for operation.
- Batch exists: Batch ID already used.
- Batch not found: wrong or missing batch ID.
- Dataset API not reachable: run dataset build + API startup.

## 7. End-to-End Runtime Order

1. Start Ganache.
2. Deploy contract.
3. Build dataset.
4. Start dataset API.
5. Start UI.
6. Connect MetaMask.
7. Use dashboard forms for transactions.
8. Use traceability and reports for verification and analytics.
