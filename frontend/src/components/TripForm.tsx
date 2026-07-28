import React, { useState } from 'react';
import { MapPin, Navigation, Truck, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { PlanTripParams } from '../services/api';

interface TripFormProps {
  onSubmit: (params: PlanTripParams) => void;
  isLoading: boolean;
}

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [currentLocation, setCurrentLocation] = useState('New York, NY');
  const [pickupLocation, setPickupLocation] = useState('Chicago, IL');
  const [dropoffLocation, setDropoffLocation] = useState('Los Angeles, CA');
  const [currentCycleUsed, setCurrentCycleUsed] = useState('15.0');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentLocation.trim() || !pickupLocation.trim() || !dropoffLocation.trim()) {
      setError('Please fill in all location fields.');
      return;
    }

    const cycleHrs = parseFloat(currentCycleUsed);
    if (isNaN(cycleHrs) || cycleHrs < 0 || cycleHrs > 70) {
      setError('Current cycle used must be a number between 0 and 70 hours.');
      return;
    }

    onSubmit({
      current_location: currentLocation.trim(),
      pickup_location: pickupLocation.trim(),
      dropoff_location: dropoffLocation.trim(),
      current_cycle_used: cycleHrs,
    });
  };

  const setPreset = (curr: string, pick: string, drop: string, cycle: string) => {
    setCurrentLocation(curr);
    setPickupLocation(pick);
    setDropoffLocation(drop);
    setCurrentCycleUsed(cycle);
    setError(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            Plan Trip & Generate Daily Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Calculate HOS §395 compliant routes, fuel stops, and 24-hr daily logs.
          </p>
        </div>
        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 70-Hr / 8-Day Cycle
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-blue-400" /> Current Location
            </label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. New York, NY"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Pickup Location
            </label>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Chicago, IL"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Dropoff Location
            </label>
            <input
              type="text"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="e.g. Los Angeles, CA"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Current Cycle Hours Used (0 – 70 hrs)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                max="70"
                value={currentCycleUsed}
                onChange={(e) => setCurrentCycleUsed(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">/ 70.0 hrs</span>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span>Quick Presets:</span>
              <button
                type="button"
                onClick={() => setPreset('Denver, CO', 'Kansas City, MO', 'Dallas, TX', '10.0')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              >
                Short Trip
              </button>
              <button
                type="button"
                onClick={() => setPreset('New York, NY', 'Chicago, IL', 'Los Angeles, CA', '62.0')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded transition-colors"
              >
                34-Hr Restart
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Calculating Route & Generating HOS Logs...</span>
            </>
          ) : (
            <>
              <Truck className="w-5 h-5" />
              <span>Plan Trip & Build Logs</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
