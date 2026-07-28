import React, { useState } from 'react';
import { Navigation, MapPin, Clock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
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
    <div className="card-surface rounded-[28px] p-6 md:p-8 space-y-6">
      {/* Form Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="status-chip rounded-full px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#E34A32]" /> FMCSA § 395 LOGS
            </span>
            <span className="text-xs text-[#8a8c91] font-mono">70-Hour / 8-Day Cycle</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#232427] mt-2">
            Configure Trip & <span className="font-serif-accent text-[#E34A32]">ELD Driver Logs</span>
          </h2>
          <p className="text-xs text-[#55575c] mt-1">
            Automated route calculation, 1,000-mile fuel scheduling, 10-hr rest stops, and 24-hr daily RODS generation.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8a8c91] font-medium text-[11px] uppercase tracking-wider">Presets:</span>
          <button
            type="button"
            onClick={() => setPreset('Denver, CO', 'Kansas City, MO', 'Dallas, TX', '10.0')}
            className="px-3 py-1 rounded-full bg-[#F4F5F5] hover:bg-[#171719] hover:text-white border border-black/5 text-[#55575c] font-medium transition-all"
          >
            Short Trip (1 Day)
          </button>
          <button
            type="button"
            onClick={() => setPreset('New York, NY', 'Chicago, IL', 'Los Angeles, CA', '62.0')}
            className="px-3 py-1 rounded-full bg-[#F05A3C]/10 hover:bg-[#E34A32] hover:text-white border border-[#E34A32]/20 text-[#E34A32] font-semibold transition-all"
          >
            34-Hr Restart Trip
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#E34A32]/10 border border-[#E34A32]/30 text-[#E34A32] text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Location */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#55575c] flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#E34A32]" /> Current Location
            </label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. New York, NY"
              className="w-full bg-[#F7F7F5] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#232427] placeholder-[#8a8c91] focus:outline-none focus:ring-2 focus:ring-[#E34A32] focus:border-[#E34A32] transition-all font-medium"
              required
            />
          </div>

          {/* Pickup Location */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#55575c] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#171719]" /> Pickup Location (1 Hr On-Duty)
            </label>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Chicago, IL"
              className="w-full bg-[#F7F7F5] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#232427] placeholder-[#8a8c91] focus:outline-none focus:ring-2 focus:ring-[#E34A32] focus:border-[#E34A32] transition-all font-medium"
              required
            />
          </div>

          {/* Dropoff Location */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#55575c] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E34A32]" /> Dropoff Location (1 Hr On-Duty)
            </label>
            <input
              type="text"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="e.g. Los Angeles, CA"
              className="w-full bg-[#F7F7F5] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#232427] placeholder-[#8a8c91] focus:outline-none focus:ring-2 focus:ring-[#E34A32] focus:border-[#E34A32] transition-all font-medium"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* Cycle Hours */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#55575c] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#E34A32]" /> Starting Cycle Hours Used (0 – 70 hrs)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                max="70"
                value={currentCycleUsed}
                onChange={(e) => setCurrentCycleUsed(e.target.value)}
                className="w-full bg-[#F7F7F5] border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#232427] placeholder-[#8a8c91] focus:outline-none focus:ring-2 focus:ring-[#E34A32] focus:border-[#E34A32] transition-all font-medium pr-20"
                required
              />
              <span className="absolute right-4 top-3.5 text-xs text-[#8a8c91] font-mono font-semibold">/ 70.0 hrs</span>
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="button-orange w-full py-3.5 px-8 rounded-full text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing HOS Route & Generating Logs...</span>
                </>
              ) : (
                <>
                  <span>Calculate HOS Route & Generate Logs</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

