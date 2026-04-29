export default function AcademicPage({
  ganacheChain,
  datasetSummary,
  datasetChallenges,
  traceabilityCoverage,
  integrityScore,
  efficiencyScore,
}) {
  return (
    <main className="mt-24 mb-12 max-w-7xl mx-auto px-6 w-full space-y-8">
      <section className="rounded-[28px] bg-gradient-to-br from-primary-container via-[#123524] to-secondary p-8 text-white shadow-[0_24px_50px_rgba(13,40,29,0.22)]">
        <p className="text-xs uppercase tracking-[0.28em] text-secondary-container">Academic Evaluation</p>
        <h1 className="mt-3 font-h1 text-h1">Project Objectives Overview</h1>
        <p className="mt-3 max-w-3xl text-body-md text-white/80">
          Mapping the blockchain-enabled cassava traceability system to the core objectives of the Master&apos;s project.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-grid-gutter">
        <article className="rounded-xl border border-emerald-100 bg-white p-lg shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
          <p className="text-label-caps font-label-caps text-on-surface-variant">Obj (i) &amp; (ii)</p>
          <h3 className="mt-3 font-h3 text-h3 text-primary">Blockchain &amp; Smart Contracts</h3>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Solidity smart contracts are deployed and simulated on {ganacheChain.name}.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-secondary-container px-3 py-1 text-status-tag font-status-tag text-on-secondary-container">
            Verified On-Chain
          </span>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-lg shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
          <p className="text-label-caps font-label-caps text-on-surface-variant">Obj (iii)</p>
          <h3 className="mt-3 font-h3 text-h3 text-primary">Stakeholder Interaction</h3>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            React, Thirdweb, and MetaMask provide role-aware interaction for farmers, processors, distributors, and retailers.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-secondary-container px-3 py-1 text-status-tag font-status-tag text-on-secondary-container">
            UI Operational
          </span>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-lg shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
          <p className="text-label-caps font-label-caps text-on-surface-variant">Obj (iv)</p>
          <h3 className="mt-3 font-h3 text-h3 text-primary">Dataset Processing</h3>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Cassava simulation data has been preprocessed and exposed through the dataset API for evaluation workflows.
          </p>
          <div className="mt-4 text-body-sm text-secondary">
            Total records: <strong>{datasetSummary?.totalRecords || 0}</strong>
          </div>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-lg shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
          <p className="text-label-caps font-label-caps text-on-surface-variant">Obj (v)</p>
          <h3 className="mt-3 font-h3 text-h3 text-primary">Performance Evaluation</h3>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Live system metrics quantify traceability coverage, data integrity, and operational efficiency.
          </p>
          <div className="mt-4 space-y-1 text-body-sm text-secondary">
            <div>Traceability: {traceabilityCoverage}%</div>
            <div>Integrity: {integrityScore}%</div>
            <div>Efficiency: {efficiencyScore}%</div>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-emerald-100 bg-white p-lg shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
        <h2 className="font-h3 text-h3 text-primary">Objective (vi): Addressing Supply Chain Challenges</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-grid-gutter">
          {(datasetChallenges?.length ? datasetChallenges : [
            "A shared immutable ledger reduces siloed reporting and keeps every stakeholder aligned on the same batch history.",
            "Every cassava batch has a verifiable journey that can be queried directly from the blockchain by batch ID.",
            "Wallet signatures and role-based smart contract controls help ensure only authorized actors can mutate supply chain state.",
          ]).map((insight, index) => (
            <div key={insight} className="rounded-xl bg-surface-container p-md">
              <h3 className="font-semibold text-secondary">
                {index === 0 ? "Transparency" : index === 1 ? "Traceability" : "Security"}
              </h3>
              <p className="mt-2 text-body-sm text-on-surface-variant">{insight}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
