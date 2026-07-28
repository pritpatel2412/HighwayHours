import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteStop, LocationInfo } from '../types/trip';

// Fix Leaflet default marker icons issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RouteMapProps {
  routeGeometry: [number, number][];
  locations: Record<string, LocationInfo>;
  stops: RouteStop[];
}

function createCustomIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapRecenter({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export const RouteMap: React.FC<RouteMapProps> = ({ routeGeometry, locations, stops }) => {
  const polylineCoords: [number, number][] = routeGeometry && routeGeometry.length > 0
    ? routeGeometry
    : Object.values(locations).map(loc => [loc.lat, loc.lng]);

  const bounds: L.LatLngBoundsExpression | null = polylineCoords.length > 0
    ? L.latLngBounds(polylineCoords.map(c => [c[0], c[1]]))
    : null;

  const currentLoc = locations.current;
  const pickupLoc = locations.pickup;
  const dropoffLoc = locations.dropoff;

  const getStopMarkerStyle = (stopType: string) => {
    switch (stopType) {
      case 'pickup': return { color: '#10b981', label: 'P' };
      case 'dropoff': return { color: '#a855f7', label: 'D' };
      case 'fuel': return { color: '#f59e0b', label: '⛽' };
      case 'rest': return { color: '#6366f1', label: '🌙' };
      case 'break': return { color: '#06b6d4', label: '☕' };
      case 'cycle_restart': return { color: '#f43f5e', label: '🔄' };
      default: return { color: '#64748b', label: '•' };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between z-10 backdrop-blur-md">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>🗺️</span> Interactive Route Map & HOS Stops
        </h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Start</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Pickup</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Dropoff</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Fuel (1000m)</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> 10-Hr Rest</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> 34-Hr Restart</span>
        </div>
      </div>

      <div className="h-[420px] w-full relative z-0">
        <MapContainer
          center={polylineCoords.length > 0 ? polylineCoords[0] : [39.8283, -98.5795]}
          zoom={5}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {bounds && <MapRecenter bounds={bounds} />}

          {polylineCoords.length > 0 && (
            <Polyline
              positions={polylineCoords}
              color="#6366f1"
              weight={5}
              opacity={0.8}
            />
          )}

          {currentLoc && (
            <Marker position={[currentLoc.lat, currentLoc.lng]} icon={createCustomIcon('#3b82f6', 'S')}>
              <Popup className="text-slate-900">
                <div className="font-bold">Start / Current Location</div>
                <div className="text-xs text-slate-600">{currentLoc.display_name}</div>
              </Popup>
            </Marker>
          )}

          {pickupLoc && (
            <Marker position={[pickupLoc.lat, pickupLoc.lng]} icon={createCustomIcon('#10b981', 'P')}>
              <Popup className="text-slate-900">
                <div className="font-bold">Pickup Location (1 Hr On-Duty)</div>
                <div className="text-xs text-slate-600">{pickupLoc.display_name}</div>
              </Popup>
            </Marker>
          )}

          {dropoffLoc && (
            <Marker position={[dropoffLoc.lat, dropoffLoc.lng]} icon={createCustomIcon('#a855f7', 'D')}>
              <Popup className="text-slate-900">
                <div className="font-bold">Dropoff Location (1 Hr On-Duty)</div>
                <div className="text-xs text-slate-600">{dropoffLoc.display_name}</div>
              </Popup>
            </Marker>
          )}

          {stops.map((stop, idx) => {
            if (['pickup', 'dropoff'].includes(stop.stop_type)) return null;
            const style = getStopMarkerStyle(stop.stop_type);
            return (
              <Marker
                key={idx}
                position={[stop.lat, stop.lng]}
                icon={createCustomIcon(style.color, style.label)}
              >
                <Popup className="text-slate-900">
                  <div className="font-bold uppercase text-xs tracking-wider text-slate-500">{stop.stop_type.replace('_', ' ')}</div>
                  <div className="font-semibold text-sm">{stop.remark}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Duration: {stop.duration_minutes} mins
                    {stop.mile_marker !== null && ` • Mile Marker: ${stop.mile_marker.toFixed(0)}`}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
