import { useState, useEffect } from 'react';
import { TripForm } from './components/TripForm';
import { RouteMap } from './components/RouteMap';
import { DailyLogGrid } from './components/DailyLogGrid';
import { TripItinerary } from './components/TripItinerary';
import { LogExporter } from './components/LogExporter';
import { createTrip, getRecentTrips, PlanTripParams } from './services/api';
import { Trip } from './types/trip';
import { Truck, ShieldCheck, MapPin, Clock, Calendar, AlertTriangle, RefreshCw, FileCheck } from 'lucide-react';

export function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setRecentTrips] = useState<Array<any>>([]);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);


  useEffect(() => {
    fetchRecentTripsList();
  }, []);

  const fetchRecentTripsList = async () => {
    try {
      const trips = await getRecentTrips();
      setRecentTrips(trips);
    } catch {
      // Non-blocking background fetch
    }
  };

  const handlePlanTrip = async (params: PlanTripParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createTrip(params);
      setTrip(result);
      setActiveDayTab(1);
      fetchRecentTripsList();
    } catch (err: any) {
      setError(err.message || 'An error occurred while calculating the route and logs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                HighwayHours
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-md">
                  FMCSA § 395 ELD
                </span>
              </h1>
              <p className="text-xs text-slate-400">Smart HOS Trip Planner & Daily Driver Log Generator</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>70-Hr / 8-Day Compliant</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Input Form Section */}
        <section>
          <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
        </section>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Calculated Trip Results */}
        {trip ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 34-Hour Restart Alert Banner if applicable */}
            {trip.cycle_restart_required && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm flex items-start gap-3">
                <RefreshCw className="w-5 h-5 shrink-0 mt-0.5 text-amber-400 animate-spin" />
                <div>
                  <h4 className="font-bold text-amber-200">34-Hour Cycle Restart Required</h4>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    Your starting accumulated cycle hours ({trip.current_cycle_used} hrs) combined with this route exceeded the 70-hour / 8-day rolling threshold. A mandatory 34-consecutive-hour Off-Duty restart was inserted to reset your available cycle clock to 0.0 hrs.
                  </p>
                </div>
              </div>
            )}

            {/* Trip Stats Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">TOTAL DISTANCE</span>
                  <span className="text-lg font-black text-white">{trip.summary.total_distance_miles.toFixed(0)} <span className="text-xs font-normal text-slate-400">miles</span></span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">DRIVING TIME</span>
                  <span className="text-lg font-black text-white">{trip.summary.total_driving_hours.toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs</span></span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">TOTAL DURATION</span>
                  <span className="text-lg font-black text-white">{trip.summary.total_duration_hours.toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs</span></span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">CALENDAR DAYS</span>
                  <span className="text-lg font-black text-white">{trip.summary.num_days} <span className="text-xs font-normal text-slate-400">days</span></span>
                </div>
              </div>
            </div>

            {/* Interactive Route Map */}
            <RouteMap
              routeGeometry={trip.route_geometry}
              locations={trip.locations}
              stops={trip.stops}
            />

            {/* Route Itinerary */}
            <TripItinerary stops={trip.stops} dutyEvents={trip.duty_events} />

            {/* Daily Driver Logs Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-indigo-400" />
                    FMCSA Driver's Daily Logs ({trip.daily_logs.length} {trip.daily_logs.length === 1 ? 'Sheet' : 'Sheets'})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Auto-generated 24-hour RODS grids with step graph, location remarks, and 24-hr totals validation.
                  </p>
                </div>

                {/* Day Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {trip.daily_logs.map((log) => (
                    <button
                      key={log.day_number}
                      onClick={() => setActiveDayTab(log.day_number)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap ${
                        activeDayTab === log.day_number
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Day {log.day_number}
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveDayTab(0)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap ${
                      activeDayTab === 0
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/25'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    View All Days Stacked
                  </button>
                </div>
              </div>

              {/* Render Selected Day Log(s) */}
              <div className="space-y-8">
                {trip.daily_logs
                  .filter((log) => activeDayTab === 0 || log.day_number === activeDayTab)
                  .map((log) => {
                    const logId = `daily-log-sheet-day-${log.day_number}`;
                    return (
                      <div key={log.day_number} className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <span>Day {log.day_number} Log Sheet</span>
                            <span className="text-xs font-normal text-slate-400">({new Date(log.log_date).toLocaleDateString()})</span>
                          </h4>
                          <LogExporter
                            logElementId={logId}
                            dayNumber={log.day_number}
                            dateStr={log.log_date}
                          />
                        </div>

                        <div id={logId}>
                          <DailyLogGrid log={log} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </div>
        ) : (
          /* Empty / Initial State */
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Truck className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white">No Active Trip Calculated</h3>
              <p className="text-xs text-slate-400">
                Enter your starting location, pickup location, dropoff location, and current cycle hours in the form above to generate an interactive route map and compliant FMCSA daily driver log sheets.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

