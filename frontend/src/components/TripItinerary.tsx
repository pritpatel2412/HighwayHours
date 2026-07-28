import React from 'react';
import { RouteStop, DutyEvent } from '../types/trip';
import { MapPin, Fuel, Moon, Clock, RefreshCw, Coffee, CheckCircle2 } from 'lucide-react';

interface TripItineraryProps {
  stops: RouteStop[];
  dutyEvents?: DutyEvent[];
}

export const TripItinerary: React.FC<TripItineraryProps> = ({ stops }) => {
  const getStopBadge = (type: string) => {
    switch (type) {
      case 'pickup':
        return {
          icon: <MapPin className="w-3.5 h-3.5 text-white" />,
          bg: 'bg-[#171719] text-white font-semibold',
          title: 'Pickup Location',
        };
      case 'dropoff':
        return {
          icon: <MapPin className="w-3.5 h-3.5 text-white" />,
          bg: 'bg-[#E34A32] text-white font-semibold',
          title: 'Dropoff Location',
        };
      case 'fuel':
        return {
          icon: <Fuel className="w-3.5 h-3.5 text-[#F05A3C]" />,
          bg: 'bg-[#F05A3C]/10 border border-[#F05A3C]/20 text-[#F05A3C] font-semibold',
          title: '1,000-Mile Fuel Stop',
        };
      case 'rest':
        return {
          icon: <Moon className="w-3.5 h-3.5 text-[#55575c]" />,
          bg: 'bg-[#F4F5F5] border border-black/10 text-[#55575c] font-semibold',
          title: '10-Hour Off-Duty Reset',
        };
      case 'break':
        return {
          icon: <Coffee className="w-3.5 h-3.5 text-[#55575c]" />,
          bg: 'bg-[#F4F5F5] border border-black/10 text-[#55575c] font-semibold',
          title: '30-Min Rest Break',
        };
      case 'cycle_restart':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-[#E34A32] animate-spin" />,
          bg: 'bg-[#E34A32]/10 border border-[#E34A32]/30 text-[#E34A32] font-bold',
          title: '34-Hour Cycle Restart',
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-[#8a8c91]" />,
          bg: 'bg-[#F4F5F5] border border-black/5 text-[#55575c]',
          title: 'Scheduled Stop',
        };
    }
  };

  return (
    <div className="card-surface rounded-[28px] p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-[#232427] flex items-center gap-2 tracking-tight">
            <CheckCircle2 className="w-5 h-5 text-[#E34A32]" />
            Trip Itinerary & <span className="font-serif-accent text-[#E34A32]">HOS Stops</span>
          </h3>
          <p className="text-xs text-[#55575c] mt-0.5">Chronological list of all driving shifts, mandatory rest stops, and fuel checkpoints.</p>
        </div>
        <span className="status-chip rounded-full px-3 py-1 text-xs font-semibold">
          {stops.length} Total Stops
        </span>
      </div>

      <div className="space-y-3">
        {stops.map((stop, index) => {
          const badge = getStopBadge(stop.stop_type);
          const dateStr = new Date(stop.scheduled_at).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-2xl bg-[#F7F7F5] border border-black/5 hover:border-black/10 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-[#171719] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs rounded-full flex items-center gap-1.5 ${badge.bg}`}>
                      {badge.icon}
                      {badge.title}
                    </span>
                    {stop.mile_marker !== null && (
                      <span className="text-[11px] font-mono font-medium text-[#55575c] bg-white px-2 py-0.5 rounded-full border border-black/5">
                        Mile {stop.mile_marker.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#8a8c91] font-mono">{dateStr}</span>
                </div>

                <div className="text-sm font-semibold text-[#232427] truncate">{stop.remark}</div>

                <div className="text-xs text-[#55575c] mt-1 flex items-center gap-4">
                  <span>Duration: <strong className="text-[#232427] font-semibold">{stop.duration_minutes} mins</strong></span>
                  <span>Coordinates: <strong className="font-mono text-[#8a8c91]">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

