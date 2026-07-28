import { useState, useEffect } from 'react';
import { TripForm } from './components/TripForm';
import { RouteMap } from './components/RouteMap';
import { DailyLogGrid } from './components/DailyLogGrid';
import { TripItinerary } from './components/TripItinerary';
import { LogExporter } from './components/LogExporter';
import { createTrip, getRecentTrips, PlanTripParams } from './services/api';
import { Trip } from './types/trip';
import { Truck, ShieldCheck, MapPin, Clock, Calendar, AlertTriangle, RefreshCw, FileCheck, Layers } from 'lucide-react';

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
    <div className="min-h-screen bg-[#ECEDEE] text-[#232427] font-sans antialiased pb-20 selection:bg-[#E34A32] selection:text-white">
      {/* SprintForge Floating Glassmorphic Nav */}
      <header className="sticky top-4 z-50 px-4 max-w-7xl mx-auto mb-6">
        <nav className="nav-floating rounded-full px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#171719] flex items-center justify-center text-white shadow-md">
              <Truck className="w-5 h-5 text-[#E34A32]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#232427] flex items-center gap-2">
                Highway<span className="font-serif-accent text-[#E34A32]">Hours</span>
                <span className="status-chip text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full">
                  FMCSA § 395
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F5F5] border border-black/5 text-[#55575c]">
              <ShieldCheck className="w-4 h-4 text-[#E34A32]" />
              <span>70-Hr / 8-Day HOS Engine</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Outer Container - Shell in Shell Strategy */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="shell-container rounded-[40px] p-6 md:p-10 space-y-8">
          
          {/* Editorial Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3 pt-2 pb-4">
            <span className="status-chip rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest inline-block">
              Industrial AI Driver Operations
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#232427] leading-tight">
              Precision HOS Route & <br className="hidden sm:inline" />
              <span className="font-serif-accent text-[#E34A32] italic font-normal">ELD Log Generator</span>
            </h2>
            <p className="text-sm text-[#55575c] leading-relaxed max-w-xl mx-auto">
              Automated 1,000-mile fuel stops, 10-hr off-duty resets, 34-hr restarts, and 24-hour FMCSA RODS grid visualization.
            </p>
          </div>

          {/* Input Form Section */}
          <section>
            <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
          </section>

          {/* Global Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-[#E34A32]/10 border border-[#E34A32]/30 text-[#E34A32] text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">Dismiss</button>
            </div>
          )}

          {/* Calculated Trip Results */}
          {trip ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* 34-Hour Restart Alert Banner */}
              {trip.cycle_restart_required && (
                <div className="card-surface rounded-[24px] p-5 border-l-4 border-l-[#E34A32] flex items-start gap-4 shadow-md">
                  <div className="w-10 h-10 rounded-full bg-[#E34A32]/10 text-[#E34A32] flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#232427] text-sm">34-Hour Cycle Restart Inserted</h4>
                    <p className="text-xs text-[#55575c] mt-1">
                      Your starting accumulated cycle hours ({trip.current_cycle_used} hrs) combined with this route exceeded the 70-hour / 8-day rolling limit. A mandatory 34-consecutive-hour Off-Duty restart was added to reset your available cycle clock back to 0.0 hrs.
                    </p>
                  </div>
                </div>
              )}

              {/* Trip Stats Overview Feature Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-surface rounded-[24px] p-5 flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-black/5 flex items-center justify-center text-[#E34A32] shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#8a8c91] block uppercase tracking-wider">TOTAL DISTANCE</span>
                    <span className="text-xl font-extrabold text-[#232427]">{trip.summary.total_distance_miles.toFixed(0)} <span className="text-xs font-normal text-[#55575c]">miles</span></span>
                  </div>
                </div>

                <div className="card-surface rounded-[24px] p-5 flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-black/5 flex items-center justify-center text-[#171719] shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#8a8c91] block uppercase tracking-wider">DRIVING TIME</span>
                    <span className="text-xl font-extrabold text-[#232427]">{trip.summary.total_driving_hours.toFixed(1)} <span className="text-xs font-normal text-[#55575c]">hrs</span></span>
                  </div>
                </div>

                <div className="card-surface rounded-[24px] p-5 flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-black/5 flex items-center justify-center text-[#E34A32] shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#8a8c91] block uppercase tracking-wider">TOTAL DURATION</span>
                    <span className="text-xl font-extrabold text-[#232427]">{trip.summary.total_duration_hours.toFixed(1)} <span className="text-xs font-normal text-[#55575c]">hrs</span></span>
                  </div>
                </div>

                <div className="card-surface rounded-[24px] p-5 flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-black/5 flex items-center justify-center text-[#171719] shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#8a8c91] block uppercase tracking-wider">CALENDAR DAYS</span>
                    <span className="text-xl font-extrabold text-[#232427]">{trip.summary.num_days} <span className="text-xs font-normal text-[#55575c]">days</span></span>
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
              <section className="card-surface rounded-[28px] p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#232427] flex items-center gap-2 tracking-tight">
                      <FileCheck className="w-5 h-5 text-[#E34A32]" />
                      FMCSA Daily Log Sheets ({trip.daily_logs.length} {trip.daily_logs.length === 1 ? 'Sheet' : 'Sheets'})
                    </h3>
                    <p className="text-xs text-[#55575c] mt-1">
                      Visual 24-hour RODS grids with continuous step graph, location remarks, and total hours check.
                    </p>
                  </div>

                  {/* Day Navigation Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                    {trip.daily_logs.map((log) => (
                      <button
                        key={log.day_number}
                        onClick={() => setActiveDayTab(log.day_number)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                          activeDayTab === log.day_number
                            ? 'button-orange text-white shadow-md'
                            : 'bg-[#F4F5F5] hover:bg-white text-[#55575c] border border-black/5'
                        }`}
                      >
                        Day {log.day_number}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveDayTab(0)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                        activeDayTab === 0
                          ? 'button-primary text-white shadow-md'
                          : 'bg-[#F4F5F5] hover:bg-white text-[#55575c] border border-black/5'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> View All Stacked
                      </span>
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
                            <h4 className="text-sm font-bold text-[#232427] flex items-center gap-2">
                              <span>Day {log.day_number} Log Sheet</span>
                              <span className="text-xs font-normal text-[#8a8c91]">({new Date(log.log_date).toLocaleDateString()})</span>
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
            <div className="card-surface rounded-[28px] p-12 text-center text-[#55575c] space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#F7F7F5] border border-black/5 text-[#E34A32] flex items-center justify-center mx-auto shadow-sm">
                <Truck className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-[#232427]">No Active Trip Calculated</h3>
                <p className="text-xs text-[#55575c] leading-relaxed">
                  Enter your current location, pickup location, dropoff location, and starting cycle hours above to calculate your HOS route and generate visual FMCSA daily driver log sheets.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;


