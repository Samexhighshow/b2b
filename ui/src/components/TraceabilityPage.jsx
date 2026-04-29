export default function TraceabilityPage({
  searchBatchId,
  setSearchBatchId,
  handleSearchBatch,
  batchDetails,
  batchEvents,
  statusPercent,
  formatAddress,
  isWorking,
  IS_PLACEHOLDER,
}) {
  return (
    <main className="pt-24 pb-12 max-w-7xl mx-auto px-6">
      <section className="mb-lg">
        <form
          onSubmit={handleSearchBatch}
          className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_rgba(13,40,29,0.05)] border border-surface-variant"
        >
          <div className="flex flex-col md:flex-row gap-md items-center">
            <div className="relative flex-grow w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
                qr_code_scanner
              </span>
              <input
                value={searchBatchId}
                onChange={(e) => setSearchBatchId(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-surface-variant rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all font-body-md"
                placeholder="Enter batch ID"
                type="text"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isWorking || IS_PLACEHOLDER}
              className="w-full md:w-auto px-xl py-3 bg-secondary text-white rounded-lg font-body-md font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">search</span>
              Search Trace
            </button>
          </div>
        </form>
      </section>

      {batchDetails ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-grid-gutter">
          <div className="lg:col-span-5 flex flex-col gap-grid-gutter">
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_rgba(13,40,29,0.05)] border border-surface-variant">
              <div className="flex justify-between items-start mb-lg">
                <div>
                  <h2 className="font-h3 text-on-surface">Batch Overview</h2>
                  <p className="text-on-surface-variant text-body-sm">Detailed crop telemetry data</p>
                </div>
                <span className="bg-[#d9efe0] text-[#2f9b54] px-3 py-1 rounded-full text-status-tag flex items-center gap-1 font-status-tag">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  Verified
                </span>
              </div>
              <div className="space-y-md">
                <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                  <span className="text-on-surface-variant text-body-sm font-medium">Batch ID</span>
                  <span className="text-on-surface font-semibold font-mono">{batchDetails.batchId}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                  <span className="text-on-surface-variant text-body-sm font-medium">Origin</span>
                  <span className="text-on-surface text-body-sm">{batchDetails.originLocation}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                  <span className="text-on-surface-variant text-body-sm font-medium">Quantity</span>
                  <span className="text-on-surface text-body-sm">{Number(batchDetails.quantityKg).toLocaleString()} KG</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                  <span className="text-on-surface-variant text-body-sm font-medium">Current Owner</span>
                  <span className="text-on-surface text-body-sm font-mono text-xs">{formatAddress(batchDetails.currentOwner)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                  <span className="text-on-surface-variant text-body-sm font-medium">Created</span>
                  <span className="text-on-surface text-body-sm">{batchDetails.createdAt}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-on-surface-variant text-body-sm font-medium">Status</span>
                  <span className="text-on-surface text-body-sm">{batchDetails.status}</span>
                </div>
              </div>
              <div className="mt-xl">
                <div className="flex justify-between items-end mb-xs">
                  <span className="font-label-caps text-on-surface-variant text-label-caps">TRACEABILITY PROGRESS</span>
                  <span className="font-h3 text-secondary text-body-md">{statusPercent}%</span>
                </div>
                <div className="w-full bg-surface-variant rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: `${statusPercent}%` }} />
                </div>
                <p className="mt-xs text-body-sm text-on-surface-variant italic">
                  {batchDetails.statusIndex === 3 ? "Batch delivered." : "In supply chain transit."}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_rgba(13,40,29,0.05)] border border-surface-variant h-full">
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-h3 text-on-surface">Blockchain Journey</h2>
              </div>
              <div className="relative pl-8 space-y-xl max-h-[500px] overflow-y-auto">
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-surface-variant" />

                {batchEvents.length > 0 ? (
                  batchEvents.map((event, idx) => (
                    <div key={`${event.txHash}-${idx}`} className="relative">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-secondary ring-4 ring-surface-container" />
                      <div className="flex flex-col gap-xs">
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-secondary font-h3 text-body-md">{event.type}</span>
                          <span className="text-on-surface-variant text-body-sm">Block #{event.blockNumber.toString().slice(-6)}</span>
                        </div>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-status-tag font-status-tag">
                            Block #{event.blockNumber.toString()}
                          </span>
                          <span className="bg-[#d9efe0] text-[#2f9b54] px-2 py-0.5 rounded text-status-tag font-status-tag">Finalized</span>
                        </div>
                        <div className="bg-surface-container-low p-md rounded-lg border border-surface-variant">
                          <div className="flex flex-col gap-2">
                            <div>
                              <span className="mb-1 block text-label-caps text-on-surface-variant font-label-caps">DETAIL</span>
                              <span className="text-body-sm text-on-surface">{event.detail}</span>
                            </div>
                            <div>
                              <span className="mb-1 block text-label-caps text-on-surface-variant font-label-caps">TRANSACTION HASH</span>
                              <span className="font-mono text-on-surface text-body-sm break-all">{event.txHash}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-on-surface-variant text-body-sm">No events found for this batch yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_rgba(13,40,29,0.05)] border border-surface-variant">
          <p className="text-on-surface-variant font-body-md text-center py-12">
            Search for a batch to view traceability details from blockchain records.
          </p>
        </div>
      )}
    </main>
  );
}
