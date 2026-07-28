function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
              HH
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">HighwayHours</h1>
              <p className="text-xs text-slate-500">Trip Planner &amp; ELD Log Generator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Welcome</h2>
          <p className="mt-2 text-slate-600">
            Plan FMCSA-compliant routes and generate Driver&apos;s Daily Log sheets.
            Trip planning form coming in the next step.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
