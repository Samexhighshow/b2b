export default function Footer({ onOpenResource }) {
  const resources = ["Privacy Policy", "Terms of Service", "Documentation", "Support"];

  return (
    <footer className="mt-auto w-full border-t border-emerald-100 bg-stone-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <div className="flex items-center gap-2 text-lg font-bold text-emerald-900">
            <span className="material-symbols-outlined text-secondary">hub</span>
            CassavaTrace
          </div>
          <p className="max-w-xs text-center text-sm font-normal text-emerald-800/60 md:text-left">
            Blockchain-powered supply chain visibility for sustainable cassava agriculture.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {resources.map((resource) => (
            <button
              key={resource}
              type="button"
              onClick={() => onOpenResource(resource)}
              className="text-sm font-normal text-emerald-800/60 underline decoration-2 underline-offset-4 transition-all hover:text-emerald-600"
            >
              {resource}
            </button>
          ))}
        </div>
        <p className="text-sm font-normal text-emerald-800/60">
          Copyright 2024 CassavaTrace Blockchain Solutions. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
