# CassavaTrace UI Overview for Stitch AI

## Project Purpose
**CassavaTrace** is a blockchain-based supply chain management system for cassava batches. It tracks cassava from creation (farmer) through processing, distribution, and delivery with full on-chain traceability, role-based access, and analytics.

---

## Design System & Branding

### Color Palette
```
Primary (Dark Green):  #0d281d, #0f2d20, #123826 (nav gradient)
Accent Green:          #2f9b54 (active state, primary buttons)
Soft Green:            #d9efe0 (soft backgrounds, tags)
Subtle Text:           #5e6b63 (secondary labels)
Main Text:             #132219 (body text)
Background:            #e5ebe3 (main page bg)
Card Background:       #f4f7f2 (card/form backgrounds)
Blue Line:             #2f61d8 (event volume metric)
Orange Line:           #d3781f (transition score metric)
```

### Typography
- **Headings/Strong**: Sora (600, 700 weight)
- **Body/UI**: Inter (400, 500, 600, 700)
- Fonts imported from Google Fonts

### Spacing & Sizing
- Container max-width: 1280px
- Standard gap: 16px
- Card border-radius: 16px (nav), 10-12px (cards)
- Padding: 16px (main), 12px (cards), 10px (form labels)

---

## Page Navigation

### Header / Navbar
**Fixed horizontal bar at top with 3 sections:**
1. **Left**: Brand mark (SVG cassava leaf logo) + text "CassavaTrace" + tagline "Blockchain Supply Chain Management"
2. **Center**: Tab buttons (Dashboard | Traceability | Reports) + optional role-specific tabs (Admin Platform, Academic View for contract admins)
3. **Right**: Wallet connection button (shows formatted address "0x1234...5678" when connected, status LED indicator)

**Wallet Menu** (dropdown on click):
- Shows connected address or "Wallet not connected"
- Network label (e.g., "Ganache (1337)")
- "Connect MetaMask" button (or "Switch / Reconnect" if connected)
- "Disconnect" button (only when connected)

**Status Message Toast** (fixed bottom-right, auto-dismiss):
- Green-tinted dark background (#10261a)
- Shows transaction results or error messages

---

## Page 1: Dashboard

### Layout
3-column grid of KPI cards at top, then 2-column form section, then recent batches table.

### Section 1: Key Metrics (3 cards)
```
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ Active Batches      │ Total Cassava Weight │ Data Integrity       │
│ [number]            │ [weight] kg          │ Verified / Waiting   │
│ On-chain records    │ From blockchain      │ Updated [time]       │
└─────────────────────┴──────────────────────┴──────────────────────┘
```

### Section 2: Forms (2-column layout)

**Left Card: "Log New Batch"**
- Batch ID input (placeholder: "20240001")
- Quantity (kg) input (placeholder: "2500")
- Origin input (placeholder: "Ibadan, Nigeria")
- Submit button (full width)

**Right Card: "Ownership & Status"**
- **Transfer Ownership Form:**
  - Batch ID (transfer) input
  - New Owner Address input
  - Submit button
- **Update Status Form (below with top margin):**
  - Batch ID (status) input
  - 4 status buttons in grid: CREATED | PROCESSED | IN_TRANSIT | DELIVERED
  - (Status buttons replace a dropdown—allow direct clicking)

### Section 3: Recent Batches Table
- Header: "Recent Batches (On-chain)" + "Refresh Data" button
- Table columns: Batch ID | Origin | Weight | Status | Owner
- Shows up to 8 most recent batches
- Status column shows text (e.g., "IN_TRANSIT")
- Owner column shows formatted address

---

## Page 2: Traceability

### Layout
Single card with search bar + details grid

### Search Section
- Horizontal search bar: input "Enter batch ID" + Search button

### Batch Details (conditional, shown after search)
**Two-column sub-card layout:**

**Left Sub-card: "Batch Overview"**
- Batch ID
- Origin
- Quantity (kg)
- Owner (formatted address)
- Status (with readable label, e.g., "IN_TRANSIT")
- Created (formatted date/time)
- Progress bar: "Traceability Progress" showing % completion from CREATED (0%) to DELIVERED (100%)

**Right Sub-card: "Blockchain Journey" (Timeline)**
- Vertical timeline list of events
- Each event shows:
  - Pill badge with event type (BatchCreated | StatusUpdated | OwnershipTransferred)
  - Event detail text (e.g., "Owner 0x1234...5678" or "Status PROCESSED")
  - Block number + transaction hash (formatted)
  - Events sorted chronologically

**Empty State:**
"Search for a batch to view traceability details from blockchain records."

---

## Page 3: Reports (Analytics)

### Section 1: Transaction Efficiency Chart (left) + Status Distribution Bars (right)

**Left Chart: "Transaction Efficiency (From Blockchain Events)"**
- Dual-line chart (SVG-based)
- Y-axis: Dynamic scaling with tick labels (0, 33%, 66%, 100%)
- X-axis: Time windows (T-7, T-6, ..., T-1, Now)
- Blue line: Event Volume Score (activity metric)
- Orange line: Transition Score (status updates + ownership transfers)
- Dashed horizontal grid lines
- Legend: Shows metric names and colors
- Point markers and endpoint labels on latest data

**Right Card: "Tracked Batches by Status"**
- 4 stacked bar cards (one per status: CREATED, PROCESSED, IN_TRANSIT, DELIVERED)
- Each shows bar fill % + absolute count
- Color: Green gradient (#3cab63 to #2f844c)

### Section 2: Data Integrity Table
- Header: "Data Integrity - Recent Blocks"
- Columns: Block ID | Block Number | Event Type | Status | Transaction
- Each row shows block info + "Verified" (green tag) or "Pending" (orange tag)
- Shows up to 6 most recent events

### Section 3: System Evaluation (3 metric cards)
```
┌──────────────────────────┬─────────────────────────┬──────────────────────┐
│ Traceability Coverage    │ Data Integrity Score    │ Transaction Eff.     │
│ [%]                      │ [%]                     │ [%]                  │
│ X of Y batches DELIVERED │ Based on event verify   │ From activity ratio  │
└──────────────────────────┴─────────────────────────┴──────────────────────┘
```

---

## Key UI Components & Patterns

### Buttons
- **Primary** (.btn.primary): Green background (#2f9b54), white text, rounded
- **Ghost** (.btn.ghost): Transparent, colored text, hover effect
- Disabled state: opacity reduced, cursor disabled

### Form Inputs
- Standard text/number inputs
- Labels above each input
- Placeholder text for guidance
- Border color: light green (#ced9cf)

### Cards & Sub-cards
- Main cards: Background #f4f7f2, border 1px light green, border-radius 12px
- Padding: 16px
- Box-shadow: subtle elevation shadow

### Status Tags
- **"Verified"** (green): #daf1e3 bg, #0f6d34 text
- **"Pending"** (orange): #f8e3bc bg, #7a4f0b text
- Border-radius: 999px (fully rounded pills)

### Grid Layouts
- **KPI grid**: 3 columns, auto-responsive
- **Form grid**: 2 columns, span-2 for full-width buttons
- **Evaluation grid**: 3 columns
- **Status bar grid**: Single column, 4 items

### Progress Bars
- Background: #dce8de (light gray-green)
- Fill: Green gradient (#39b067 → #2a8c4f)
- Height: 8px, border-radius: 999px

### Event Pills / Badges
- Background: #e4f3ea (light green)
- Text: #166739 (darker green), bold, small font
- Padding: 4px 8px, border-radius: 999px

---

## Wallet Integration Visual

### Wallet Button (Always Visible in Top-Right)
- Green LED indicator (9px circle) with glow effect
- Formatted wallet address or "Connect Wallet" text
- Bordered button with slight background opacity

### Connection States
- **Not Connected**: "Connect Wallet" label, subtle LED (inactive)
- **Connected**: Formatted address (first 6 + last 4 chars), active green LED with glow

---

## Data Visualization Details

### Line Chart Specs
- ViewBox: 0 0 392 190 (aspect ratio preserved)
- Two polylines with stroke-width 3.2
- Colors: Blue (#2f61d8) for Event Volume, Orange (#d3781f) for Transition Score
- Grid lines: Dashed gray (#d7e1d9)
- Dynamic Y-axis scaling based on max data point
- X-axis shows 8 time windows

### Bar Charts
- Track background: #dfebe3 (light)
- Bar fill: Gradient green (#3cab63 → #2f844c)
- Each bar height represents % of total

### Table Styling
- Header: Small caps, light gray-green text (#5e6b63), uppercase
- Rows: Bordered, alternating subtle background
- Cells: 10px padding, left-aligned

---

## Responsive Design Notes
- Max-width 1280px container
- At 1020px: Grid shifts to 1 column
- At 640px: Padding reduces, forms stack vertically
- Wallet menu adjusts position on mobile

---

## Key Interactions
1. **Wallet Connect**: Click wallet button → MetaMask prompt → Address displays
2. **Create Batch**: Fill form → Submit → Toast message (success/error)
3. **Search Batch**: Enter ID → Click Search → Details load dynamically
4. **Status Update**: Select Batch ID → Click status button → Transaction sent
5. **Refresh Data**: Click "Refresh Data" → RPC probes Ganache → Charts/tables update

---

## Branding Elements
- **Logo**: Cassava leaf SVG (green gradient)
- **Typography**: Modern sans-serif (Sora + Inter)
- **Tone**: Professional, trustworthy, data-driven
- **Accent**: Vibrant green (represents growth/agriculture)

---

## Summary for Stitch AI
Create a modern, professional blockchain supply chain UI with:
- Dark green navigation header with avatar-like wallet icon dropdown
- Card-based layout for forms and metrics
- Multi-page navigation (Dashboard, Traceability, Reports)
- Dual-metric line chart with dynamic scaling
- Status-based color coding (green for verified, orange for pending)
- Responsive grid system
- Clean typography hierarchy
- Subtle green color scheme throughout
