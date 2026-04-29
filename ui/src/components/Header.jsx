export default function Header({
  activePage,
  setActivePage,
  navItems,
  activeAccount,
  formatAddress,
  isConnecting,
  onConnectWallet,
  onDisconnect,
  isWorking,
  isWalletMenuOpen,
  setIsWalletMenuOpen,
  walletMenuRef,
  chainLabel,
  onOpenNotifications,
  activeRoleLabel,
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(13,40,29,0.05)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3 text-emerald-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-white shadow-[0_10px_24px_rgba(13,40,29,0.24)]">
            <span className="material-symbols-outlined text-secondary-container">token</span>
          </div>
          <div>
            <div className="font-h3 text-body-lg text-primary">CassavaTrace</div>
            <div className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Blockchain Supply Chain</div>
          </div>
        </div>

        <nav className="order-3 flex w-full items-center gap-2 overflow-x-auto pb-1 md:order-2 md:w-auto md:justify-center">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActivePage(item.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                activePage === item.key
                  ? "bg-secondary text-white shadow-[0_10px_24px_rgba(0,109,51,0.22)]"
                  : "bg-white text-emerald-900/70 hover:bg-emerald-50 hover:text-secondary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="order-2 flex items-center gap-3 md:order-3" ref={walletMenuRef}>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="rounded-full p-2 text-emerald-800/70 transition-all hover:bg-emerald-50"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button
            type="button"
            onClick={() => setIsWalletMenuOpen((current) => !current)}
            className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">account_balance_wallet</span>
            {activeAccount ? formatAddress(activeAccount.address) : "Connect Wallet"}
          </button>

          {isWalletMenuOpen ? (
            <div className="absolute right-6 top-[calc(100%+8px)] w-[290px] rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_16px_40px_rgba(13,40,29,0.18)]">
              <div className="space-y-1">
                <p className="font-semibold text-on-surface">
                  {activeAccount ? `Connected: ${formatAddress(activeAccount.address)}` : "Wallet not connected"}
                </p>
                <p className="text-sm text-on-surface-variant">Network: {chainLabel}</p>
                {activeAccount ? <p className="text-sm text-on-surface-variant">Role: {activeRoleLabel}</p> : null}
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={onConnectWallet}
                  disabled={isWorking || isConnecting}
                  className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {activeAccount ? "Switch / Reconnect" : "Connect MetaMask"}
                </button>

                {activeAccount ? (
                  <button
                    type="button"
                    onClick={onDisconnect}
                    disabled={isWorking}
                    className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-secondary transition-all hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
