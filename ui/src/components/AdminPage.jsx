export default function AdminPage({
  isWorking,
  IS_PLACEHOLDER,
  formatAddress,
  activeAccount,
  assignRoleUser,
  setAssignRoleUser,
  assignRoleId,
  setAssignRoleId,
  handleAssignRole,
  refreshNetworkData,
  contractAdmin,
  reloadDatasetInsights,
}) {
  const roleOptions = [
    { value: 1, label: "FARMER" },
    { value: 2, label: "PROCESSOR" },
    { value: 3, label: "DISTRIBUTOR" },
    { value: 4, label: "RETAILER" },
  ];

  return (
    <main className="mt-24 mb-12 max-w-7xl mx-auto px-6 w-full space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-h1 text-h1 text-primary">Admin Platform</h1>
        <p className="text-on-surface-variant font-body-md">Manage user roles and contract permissions.</p>
      </div>

      {activeAccount?.address ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-lg">
          <p className="text-body-sm text-blue-900">
            <strong>Connected as:</strong> {formatAddress(activeAccount.address)}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid-gutter">
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">admin_panel_settings</span>
            <h3 className="font-h3 text-h3 text-primary">Assign Role to User</h3>
          </div>

          <form onSubmit={handleAssignRole} className="space-y-md">
            <div className="space-y-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant">USER WALLET ADDRESS</label>
              <input
                value={assignRoleUser}
                onChange={(e) => setAssignRoleUser(e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-mono text-sm"
                placeholder="0x..."
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant">SELECT ROLE</label>
              <select
                value={assignRoleId}
                onChange={(e) => setAssignRoleId(Number(e.target.value))}
                className="w-full p-3 rounded-lg border border-emerald-100 bg-white focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isWorking || IS_PLACEHOLDER}
              className="w-full py-4 bg-primary-container text-white font-bold rounded-lg hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">check_circle</span>
              ASSIGN ROLE
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl border border-emerald-100 shadow-[0_4_20px_rgba(13,40,29,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">settings</span>
            <h3 className="font-h3 text-h3 text-primary">Network Controls</h3>
          </div>

          <div className="space-y-md">
            <p className="text-body-sm text-on-surface-variant">
              As the contract administrator, you can sync chain state and test administrative flows from here.
            </p>

            <div className="grid gap-3">
              <button
                type="button"
                className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left font-semibold text-secondary transition-all hover:bg-emerald-100 disabled:opacity-50"
                onClick={refreshNetworkData}
                disabled={isWorking}
              >
                Sync Network State
              </button>
              <button
                type="button"
                className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-left font-semibold text-on-surface transition-all hover:bg-emerald-50"
                onClick={reloadDatasetInsights}
              >
                Reload Dataset Analytics
              </button>
            </div>

            <div className="rounded-xl bg-surface-container p-md">
              <p className="text-label-caps font-label-caps text-on-surface-variant">ADMIN ADDRESS</p>
              <code className="mt-2 block break-all text-body-sm text-secondary">
                {contractAdmin || "Not available yet"}
              </code>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-amber-700 flex-shrink-0">warning</span>
          <div>
            <h4 className="font-semibold text-amber-900 mb-2">Important Security Notice</h4>
            <ul className="list-disc list-inside text-body-sm text-amber-800 space-y-1">
              <li>Only the contract deployer can assign roles to other accounts.</li>
              <li>Do not share private keys or wallet addresses in unsecured channels.</li>
              <li>Role changes are permanent on-chain transactions.</li>
              <li>Ensure you have sufficient gas balance before assigning roles.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
