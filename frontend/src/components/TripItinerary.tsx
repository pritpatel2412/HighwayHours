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
          icon: <MapPin className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          title: 'Pickup Location',
        };
      case 'dropoff':
        return {
          icon: <MapPin className="w-4 h-4 text-purple-400" />,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          title: 'Dropoff Location',
        };
      case 'fuel':
        return {
          icon: <Fuel className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          title: '1,000-Mile Fuel Stop',
        };
      case 'rest':
        return {
          icon: <Moon className="w-4 h-4 text-indigo-400" />,
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          title: '10-Hour Off-Duty Reset',
        };
      case 'break':
        return {
          icon: <Coffee className="w-4 h-4 text-cyan-400" />,
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          title: '30-Min Rest Break',
        };
      case 'cycle_restart':
        return {
          icon: <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />,
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-bold',
          title: '34-Hour Cycle Restart',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-slate-400" />,
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          title: 'Scheduled Stop',
        };
    };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
        Trip Route Itinerary & Mandatory HOS Stops
      </h3>

      <div className="space-y-4">
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
              className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0 mt-0.5">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-full flex items-center gap-1.5 ${badge.bg}`}>
                      {badge.icon}
                      {badge.title}
                    </span>
                    {stop.mile_marker !== null && (
                      <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        Mile {stop.mile_marker.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                </div>

                <div className="text-sm font-semibold text-white truncate">{stop.remark}</div>

                <div className="text-xs text-slate-400 mt-1 flex items-center gap-4">
                  <span>Duration: <strong className="text-slate-200">{stop.duration_minutes} mins</strong></span>
                  <span>Coordinates: <strong className="font-mono text-slate-300">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
