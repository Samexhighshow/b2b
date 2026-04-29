export default function ReportsPage({
  networkMetrics,
  STATUS_LABELS,
  refreshNetworkData,
  traceabilityCoverage,
  integrityScore,
  efficiencyScore,
  completedBatches,
  isWorking,
  IS_PLACEHOLDER,
  formatAddress,
  datasetSummary,
  datasetRecords,
  datasetApiError,
  loadDatasetApiData,
  toSvgPoints,
}) {
  const chartMaxValue = Math.max(1, ...networkMetrics.speedSeries, ...networkMetrics.costSeries);
  const yAxisTicks = [
    chartMaxValue,
    Math.max(1, Math.round(chartMaxValue * 0.66)),
    Math.max(1, Math.round(chartMaxValue * 0.33)),
    0,
  ];
  const xAxisLabels = networkMetrics.speedSeries.map((_, index) =>
    index === networkMetrics.speedSeries.length - 1 ? "Now" : `T-${networkMetrics.speedSeries.length - 1 - index}`
  );

  return (
    <main className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface">Analytics & Insights</h1>
        <p className="font-body-md text-on-surface-variant mt-2">
          Comprehensive data performance and blockchain traceability audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-grid-gutter mb-lg">
        <div className="lg:col-span-8 bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30">
          <div className="flex justify-between items-center mb-lg gap-4 flex-wrap">
            <h3 className="font-h3 text-h3 text-on-surface">Transaction Efficiency</h3>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-on-tertiary-container" />
                <span className="font-label-caps text-label-caps text-on-surface-variant">Event Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-on-tertiary-fixed-variant" />
                <span className="font-label-caps text-label-caps text-on-surface-variant">Transition Score</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] flex">
            <div className="flex flex-col justify-between text-[10px] text-outline pr-2 py-2">
              {yAxisTicks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
            <div className="flex-1 relative">
              <svg viewBox="0 0 392 300" className="w-full h-full" preserveAspectRatio="none">
                <line x1="0" y1="50" x2="392" y2="50" stroke="#d7e1d9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="150" x2="392" y2="150" stroke="#d7e1d9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="250" x2="392" y2="250" stroke="#d7e1d9" strokeWidth="1" strokeDasharray="4 4" />
                <polyline
                  points={toSvgPoints(networkMetrics.speedSeries, 280, 56, chartMaxValue)}
                  fill="none"
                  stroke="#2f61d8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={toSvgPoints(networkMetrics.costSeries, 280, 56, chartMaxValue)}
                  fill="none"
                  stroke="#d3781f"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-between mt-4 font-label-caps text-label-caps text-outline gap-2">
            {xAxisLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30">
          <h3 className="font-h3 text-h3 text-on-surface mb-lg">Batches by Status</h3>
          <div className="space-y-6">
            {STATUS_LABELS.map((label, index) => (
              <div key={label}>
                <div className="flex justify-between mb-2">
                  <span className="font-label-caps text-label-caps text-on-surface">{label}</span>
                  <span className="font-body-sm font-semibold">{networkMetrics.statusCounts[index]}</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-on-secondary-container rounded-full"
                    style={{
                      width: `${
                        networkMetrics.totalBatches
                          ? Math.round((networkMetrics.statusCounts[index] / networkMetrics.totalBatches) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-lg pt-lg border-t border-surface-variant flex items-center justify-center">
            <button
              onClick={refreshNetworkData}
              disabled={isWorking || IS_PLACEHOLDER}
              className="text-secondary font-body-sm font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
              type="button"
            >
              Refresh Report <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter mb-lg">
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30 flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-secondary-container/30 flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined">distance</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Traceability Coverage</p>
            <p className="font-h2 text-h3 text-on-surface">{traceabilityCoverage}%</p>
            <p className="text-body-sm text-on-surface-variant">{completedBatches} delivered batches</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30 flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-on-tertiary-container/10 flex items-center justify-center text-on-tertiary-container">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Data Integrity Score</p>
            <p className="font-h2 text-h3 text-on-surface">{integrityScore}%</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30 flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-surface-variant/30 flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined">speed</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Transaction Efficiency</p>
            <p className="font-h2 text-h3 text-on-surface">{efficiencyScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter mb-lg">
        {datasetSummary ? (
          <>
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30">
              <p className="font-label-caps text-label-caps text-on-surface-variant">Dataset Records</p>
              <p className="font-h2 text-h3 text-on-surface mt-2">{datasetSummary.totalRecords}</p>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30">
              <p className="font-label-caps text-label-caps text-on-surface-variant">Average Loss</p>
              <p className="font-h2 text-h3 text-on-surface mt-2">{datasetSummary.avgLossPct}%</p>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30">
              <p className="font-label-caps text-label-caps text-on-surface-variant">Avg Transport Time</p>
              <p className="font-h2 text-h3 text-on-surface mt-2">{datasetSummary.avgTransportHours} hrs</p>
            </div>
          </>
        ) : (
          <div className="md:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-lg text-amber-900">
            {datasetApiError}
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30 overflow-hidden">
        <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center">
          <h3 className="font-h3 text-h3 text-on-surface">Data Integrity - Recent Blocks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surface-container text-on-surface-variant font-label-caps text-label-caps text-left">
              <tr>
                <th className="px-lg py-md">Block ID</th>
                <th className="px-lg py-md">Number</th>
                <th className="px-lg py-md">Event Type</th>
                <th className="px-lg py-md">Status</th>
                <th className="px-lg py-md">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body-sm text-on-surface">
              {networkMetrics.recentRows.length > 0 ? (
                networkMetrics.recentRows.map((row) => (
                  <tr key={`${row.block}-${row.txHash}`} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-lg py-md font-mono text-xs">{row.block}</td>
                    <td className="px-lg py-md">{row.blockNumber}</td>
                    <td className="px-lg py-md">{row.event}</td>
                    <td className="px-lg py-md">
                      <span
                        className={`px-2 py-1 rounded-full font-status-tag text-status-tag flex items-center gap-1 w-fit ${
                          row.status === "Verified"
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-on-tertiary-fixed text-on-tertiary-container"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {row.status === "Verified" ? "check_circle" : "schedule"}
                        </span>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-2 bg-surface-container px-2 py-1 rounded w-fit font-mono text-xs text-on-surface-variant">
                        {formatAddress(row.txHash)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-lg py-md text-center text-on-surface-variant">
                    No blockchain events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-lg bg-surface-container-lowest rounded-xl shadow-[0_4_20px_rgba(13,40,29,0.05)] border border-outline-variant/30 overflow-hidden">
        <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center gap-4">
          <div>
            <h3 className="font-h3 text-h3 text-on-surface">Dataset Insights</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Preprocessed cassava simulation records used for evaluation.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDatasetApiData}
            disabled={isWorking}
            className="text-secondary font-body-sm font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
          >
            Reload Dataset <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surface-container text-on-surface-variant font-label-caps text-label-caps text-left">
              <tr>
                <th className="px-lg py-md">Record ID</th>
                <th className="px-lg py-md">Region</th>
                <th className="px-lg py-md">Year</th>
                <th className="px-lg py-md">Qty (kg)</th>
                <th className="px-lg py-md">Quality</th>
                <th className="px-lg py-md">Loss %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body-sm text-on-surface">
              {datasetRecords.length > 0 ? (
                datasetRecords.map((record) => (
                  <tr key={record.recordId} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-lg py-md">{record.recordId}</td>
                    <td className="px-lg py-md">{record.region}</td>
                    <td className="px-lg py-md">{record.year}</td>
                    <td className="px-lg py-md">{Number(record.quantityKg || 0).toLocaleString()}</td>
                    <td className="px-lg py-md">{record.qualityGrade}</td>
                    <td className="px-lg py-md">{record.lossPct}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-lg py-md text-center text-on-surface-variant">
                    No dataset records loaded yet.
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
