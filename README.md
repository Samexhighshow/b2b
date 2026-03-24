# CassavaTrace: Blockchain Supply Chain Management

<p align="center">
	<img src="ui/public/favicon.svg" alt="CassavaTrace Logo" width="92" height="92" />
</p>

<p align="center">
	Track cassava batches from creation to delivery with on-chain smart contracts,
	off-chain data processing, and a stakeholder-ready UI.
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Solidity-0.8.20-1f2937?logo=solidity" alt="Solidity" />
	<img src="https://img.shields.io/badge/Hardhat-3.x-f7df1e?logo=ethereum" alt="Hardhat" />
	<img src="https://img.shields.io/badge/React-18-0ea5e9?logo=react" alt="React" />
	<img src="https://img.shields.io/badge/Vite-5-6366f1?logo=vite" alt="Vite" />
	<img src="https://img.shields.io/badge/thirdweb-v5-111827" alt="thirdweb" />
	<img src="https://img.shields.io/badge/Ganache-1337-8b5e3c" alt="Ganache" />
</p>

## Table of Contents

- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [MetaMask Setup](#metamask-setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Objectives Mapping](#objectives-mapping)
- [Project Structure](#project-structure)
- [Guides](#guides)
- [Troubleshooting](#troubleshooting)

## Project Overview

CassavaTrace is a full-stack blockchain application for cassava supply-chain traceability.

It combines:

- On-chain transaction integrity through Ethereum smart contracts.
- Role-aware stakeholder operations (create, transfer, status progression).
- Off-chain dataset preprocessing for simulation, analytics, and evaluation.
- A practical UI for operational input and decision-focused reports.

## Core Features

### On-chain

- Create cassava batches with ID, quantity, and origin.
- Transfer ownership between supply-chain actors.
- Update lifecycle status from CREATED to DELIVERED.
- Query complete batch state and event history.

### Off-chain

- Pull live cassava datasets from verified online sources.
- Preprocess and normalize raw records into app-ready JSON.
- Serve dataset insights through local API endpoints.
- Auto-fallback to safe sample data when online sources are unavailable.

### UI

- Dashboard for transaction input and recent on-chain records.
- Traceability screen for per-batch journey reconstruction.
- Reports for integrity, efficiency, status distribution, and dataset insights.

## Architecture

| Layer            | Responsibility                                | Tech                  |
| ---------------- | --------------------------------------------- | --------------------- |
| Smart Contract   | Batch state transitions and ownership history | Solidity, Hardhat     |
| Deployment       | Contract deployment and UI ABI/address sync   | Node.js, ethers       |
| Dataset Pipeline | Fetch, parse, normalize cassava data          | Node.js script        |
| Dataset API      | Read-only dataset endpoints for UI            | Node.js HTTP server   |
| Frontend         | Forms, wallet actions, traceability, reports  | React, Vite, thirdweb |
| Local Chain      | Transaction execution and event source        | Ganache               |

## Prerequisites

- Node.js 18 or later
- Ganache running at http://127.0.0.1:7545
- Chain ID 1337
- Thirdweb client ID from https://thirdweb.com/dashboard

## Quick Start

### 1. Install dependencies

```bash
npm install
cd ui
npm install
cd ..
```

### 2. Compile and deploy contract

```bash
npx hardhat compile
```

PowerShell:

```powershell
$env:GANACHE_PRIVATE_KEY="0xYOUR_GANACHE_PRIVATE_KEY"
node scripts/deploy.js
```

Bash:

```bash
export GANACHE_PRIVATE_KEY=0xYOUR_GANACHE_PRIVATE_KEY
node scripts/deploy.js
```

Deployment writes:

- ui/src/abi.json
- ui/src/contract-address.json

### 3. Build dataset

```bash
npm run dataset:build
```

Expected output includes source URL, source ID, and record count.

### 4. Start dataset API

```bash
npm run api:dataset
```

Behavior:

- Starts on port 3030 by default.
- If already running, exits successfully.
- If occupied by another app, auto-selects next free port.
- Automatically syncs ui/.env VITE_DATASET_API_URL to the active API port.

### 5. Run UI

```bash
cd ui
npm run dev
```

Open the local Vite URL shown in terminal.

## MetaMask Setup

1. Add custom network:
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH
2. Import a Ganache private key into MetaMask.
3. Connect wallet in the app using the Connect Wallet button.

## Environment Variables

Create ui/.env from ui/.env.example and configure:

| Variable                | Required | Description                                  |
| ----------------------- | -------- | -------------------------------------------- |
| VITE_THIRDWEB_CLIENT_ID | Yes      | Thirdweb Client ID                           |
| VITE_CONTRACT_ADDRESS   | Optional | Manual contract address override             |
| VITE_DATASET_API_URL    | Optional | Dataset API URL (auto-synced by API startup) |

## API Endpoints

- GET /health
- GET /api/dataset/summary
- GET /api/dataset/records?limit=20
- GET /api/dataset/challenges

Example:

```bash
curl http://127.0.0.1:3030/api/dataset/summary
```

## Objectives Mapping

1. Smart contract design and implementation: contracts/CassavaSupplyChain.sol
2. Local blockchain deployment and simulation: Hardhat + Ganache + scripts/deploy.js
3. Interactive stakeholder UI: ui/src/App.jsx with thirdweb + MetaMask
4. Dataset sourcing and preprocessing: scripts/dataset-pipeline.mjs + server/dataset-api.mjs
5. Evaluation of traceability, integrity, efficiency: Reports section in UI
6. Supply-chain challenge analysis: data-informed reporting + event-driven analytics

## Project Structure

```text
.
|-- contracts/
|   `-- CassavaSupplyChain.sol
|-- scripts/
|   |-- deploy.js
|   `-- dataset-pipeline.mjs
|-- server/
|   `-- dataset-api.mjs
|-- data/
|   |-- raw/
|   `-- processed/
|-- ui/
|   |-- public/
|   |   `-- favicon.svg
|   |-- src/
|   |   |-- App.jsx
|   |   |-- abi.json
|   |   |-- contract-address.json
|   |   `-- thirdwebClient.js
|   `-- .env.example
|-- docs/
|   |-- UI_WORKFLOW_GUIDE.md
|   `-- LIVE_DEMO_SCRIPT.md
`-- package.json
```

## Guides

- Detailed UI behavior guide: docs/UI_WORKFLOW_GUIDE.md
- Step-by-step live demo script: docs/LIVE_DEMO_SCRIPT.md

## Troubleshooting

### API already running

If npm run api:dataset reports already running, this is expected and successful.

### Dataset falls back to local sample

If online source is unavailable, fallback mode is used automatically.
Check source in:

- data/processed/cassava-dataset.json
- GET /api/dataset/summary

### UI not picking new API port

Restart Vite after API restart:

```bash
cd ui
npm run dev
```

### Contract not ready message

Re-run deployment and refresh the UI:

```bash
node scripts/deploy.js
```

## License

For academic and project demonstration use. Add your preferred open-source license if needed.
