# Upstream Changes

This document summarizes the improvements made in this fork (MAVIS-creator/b2b)
relative to the original repository (Samexhighshow/b2b).

These changes are ready to be contributed back to the original project via a
cross-fork pull request:
**MAVIS-creator/b2b:main → Samexhighshow/b2b:main**

---

## Changes

### 1. Security — Remove committed secret (`ui/.env`)

The original repository tracked `ui/.env` which contained a real ThirdWeb
client ID.  This has been removed from version control.

- `ui/.env` is now listed in `.gitignore` (`/ui/.env`, `/ui/.env.local`).
- A safe template `ui/.env.example` has been added so new contributors know
  which environment variables are required without exposing real credentials.

```
VITE_THIRDWEB_CLIENT_ID=YOUR_THIRDWEB_CLIENT_ID
# VITE_CONTRACT_ADDRESS=0xYourContractAddress
```

### 2. Documentation — Full README rewrite

`README.md` has been rewritten to include:

- Technology stack overview (Solidity 0.8.20, Hardhat 3, React 18, Vite,
  thirdweb v5, Ganache)
- Contract feature summary
- Step-by-step setup and run instructions
- Local development workflow
- Project file-tree overview

### 3. UI — Replace emoji markers with SVG icons (`ui/src/App.jsx`)

All emoji status markers (🌱 📦 🚛 🏪) have been replaced with consistent,
accessible inline SVG icons that render reliably across all browsers and
operating systems.

Input parsing was also improved so that numeric fields (e.g. quantity,
batch ID) are parsed correctly before being sent to the smart contract.

### 4. Styling — Updated `ui/src/styles.css`

Visual improvements for consistency and responsiveness across the dashboard
layout and wallet-connection elements.

---

## How to create the upstream pull request

1. Go to <https://github.com/MAVIS-creator/b2b>
2. Click **"Contribute"** → **"Open pull request"**
3. Set **base repository** to `Samexhighshow/b2b` and **base branch** to `main`
4. Set **head repository** to `MAVIS-creator/b2b` and **compare branch** to `main`
5. Fill in the PR title and description, then submit.
