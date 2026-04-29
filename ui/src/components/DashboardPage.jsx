export default function DashboardPage({
  networkMetrics,
  integrityScore,
  createBatchId,
  setCreateBatchId,
  createQuantity,
  setCreateQuantity,
  createOrigin,
  setCreateOrigin,
  handleCreateBatch,
  transferBatchId,
  setTransferBatchId,
  transferOwner,
  setTransferOwner,
  handleTransferOwnership,
  statusBatchId,
  setStatusBatchId,
  handleUpdateStatus,
  allBatches,
  formatAddress,
  refreshNetworkData,
  isWorking,
  IS_PLACEHOLDER,
  STATUS_LABELS,
  lastUpdated,
}) {
  return (
    <main className="mt-24 mb-12 max-w-7xl mx-auto px-6 w-full space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-h1 text-h1 text-primary">Logistics Dashboard</h1>
        <p className="text-on-surface-variant font-body-md">Real-time cassava supply chain monitoring on-chain.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter">
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-secondary-container/30 rounded-lg text-on-secondary-container">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <span className="text-label-caps font-label-caps text-on-secondary-container bg-secondary-container px-2 py-1 rounded">
              ACTIVE
            </span>
          </div>
          <div className="font-h2 text-h2 text-primary">{networkMetrics.totalBatches}</div>
          <div className="font-body-sm text-on-surface-variant">Active Batches</div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-on-tertiary-fixed/10 rounded-lg text-on-tertiary-fixed-variant">
              <span className="material-symbols-outlined">weight</span>
            </div>
          </div>
          <div className="font-h2 text-h2 text-primary">
            {networkMetrics.totalWeight.toLocaleString()} <span className="text-lg text-on-surface-variant">kg</span>
          </div>
          <div className="font-body-sm text-on-surface-variant">Total Cassava Weight</div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-surface-variant rounded-lg text-surface-tint">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <div className="flex gap-2">
              <span className="text-status-tag font-status-tag px-2 py-1 bg-on-secondary-container/10 text-on-secondary-container rounded">
                Verified
              </span>
            </div>
          </div>
          <div className="font-h3 text-h3 text-primary">Data Integrity</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${integrityScore}%` }} />
            </div>
            <span className="text-label-caps font-label-caps text-on-surface-variant text-xs">{integrityScore}%</span>
          </div>
          <div className="mt-2 text-body-sm text-on-surface-variant">
            {lastUpdated ? `Updated ${lastUpdated}` : "Waiting for live chain data"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid-gutter">
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">add_circle</span>
            <h3 className="font-h3 text-h3 text-primary">Log New Batch</h3>
          </div>
          <form onSubmit={handleCreateBatch} className="space-y-md">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-label-caps font-label-caps text-on-surface-variant">BATCH ID</label>
                <input
                  value={createBatchId}
                  onChange={(e) => setCreateBatchId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
                  placeholder="20240001"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-caps font-label-caps text-on-surface-variant">QUANTITY (KG)</label>
                <input
                  value={createQuantity}
                  onChange={(e) => setCreateQuantity(e.target.value)}
                  className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
                  placeholder="2500"
                  type="number"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant">ORIGIN (FARM REGISTRY)</label>
              <input
                value={createOrigin}
                onChange={(e) => setCreateOrigin(e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
                placeholder="Ibadan, Nigeria"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isWorking || IS_PLACEHOLDER}
              className="w-full py-4 bg-primary-container text-white font-bold rounded-lg hover:bg-opacity-90 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">cloud_upload</span>
              MINT BATCH ON-CHAIN
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)] space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">swap_horiz</span>
              <h3 className="text-body-lg font-semibold text-primary">Ownership & Status</h3>
            </div>
            <form onSubmit={handleTransferOwnership} className="space-y-md p-4 bg-white/50 rounded-lg border border-emerald-50">
              <p className="text-label-caps font-label-caps text-on-surface-variant mb-2">TRANSFER OWNERSHIP</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={transferBatchId}
                  onChange={(e) => setTransferBatchId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
                  placeholder="Batch ID"
                  required
                />
                <input
                  value={transferOwner}
                  onChange={(e) => setTransferOwner(e.target.value)}
                  className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
                  placeholder="New Owner Address"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isWorking || IS_PLACEHOLDER}
                className="w-full py-3 bg-secondary text-white font-semibold rounded-lg hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-2"
              >
                Transfer Ownership
              </button>
            </form>
          </section>

          <section>
            <form className="space-y-md p-4 bg-white/50 rounded-lg border border-emerald-50">
              <p className="text-label-caps font-label-caps text-on-surface-variant mb-2">UPDATE BATCH STATUS</p>
              <input
                value={statusBatchId}
                onChange={(e) => setStatusBatchId(e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all mb-4"
                placeholder="Batch ID to Update"
                required
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STATUS_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleUpdateStatus(index)}
                    disabled={isWorking || !statusBatchId || IS_PLACEHOLDER}
                    className="py-2 px-1 text-xs font-bold border-2 border-emerald-100 text-emerald-800 rounded hover:bg-emerald-50 transition-colors disabled:opacity-50"
                  >
                    {label.replace("_", " ")}
                  </button>
                ))}
              </div>
            </form>
          </section>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)] overflow-hidden">
        <div className="p-lg border-b border-emerald-100 flex items-center justify-between">
          <h3 className="font-h3 text-h3 text-primary">Recent Batches (On-chain)</h3>
          <button
            onClick={refreshNetworkData}
            disabled={isWorking || IS_PLACEHOLDER}
            className="text-on-secondary-container font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
            type="button"
          >
            Refresh Data <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low border-b border-emerald-100">
              <tr>
                <th className="px-lg py-4 text-label-caps font-label-caps text-on-surface-variant">BATCH ID</th>
                <th className="px-lg py-4 text-label-caps font-label-caps text-on-surface-variant">ORIGIN</th>
                <th className="px-lg py-4 text-label-caps font-label-caps text-on-surface-variant">WEIGHT</th>
                <th className="px-lg py-4 text-label-caps font-label-caps text-on-surface-variant">STATUS</th>
                <th className="px-lg py-4 text-label-caps font-label-caps text-on-surface-variant">OWNER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 bg-white/40">
              {allBatches.slice(0, 8).length > 0 ? (
                allBatches.slice(0, 8).map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="px-lg py-4 font-mono text-sm text-secondary">{batch.batchId}</td>
                    <td className="px-lg py-4 text-body-sm">{batch.originLocation}</td>
                    <td className="px-lg py-4 text-body-sm font-medium">{batch.quantityKg.toLocaleString()} kg</td>
                    <td className="px-lg py-4">
                      <span className="text-status-tag font-status-tag px-3 py-1 bg-emerald-50 text-secondary border border-secondary/20 rounded-full inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-lg py-4 font-mono text-xs text-on-surface-variant">{formatAddress(batch.currentOwner)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-lg py-4 text-center text-on-surface-variant">
                    No batches available on-chain yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
