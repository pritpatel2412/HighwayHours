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
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(35,36,39,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 11px;
        font-family: Inter, sans-serif;
      ">
        ${label}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapRecenter({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
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
      case 'pickup': return { color: '#171719', label: 'P' };
      case 'dropoff': return { color: '#E34A32', label: 'D' };
      case 'fuel': return { color: '#F05A3C', label: '⛽' };
      case 'rest': return { color: '#55575c', label: '🌙' };
      case 'break': return { color: '#8a8c91', label: '☕' };
      case 'cycle_restart': return { color: '#E34A32', label: '🔄' };
      default: return { color: '#232427', label: '•' };
    }
  };

  return (
    <div className="card-surface rounded-[28px] overflow-hidden shadow-xl border border-black/5 relative">
      <div className="p-4 md:p-5 bg-white border-b border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#232427] flex items-center gap-2 tracking-tight">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E34A32]"></span> Interactive Route Map & HOS Stops
        </h3>

        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="px-2.5 py-0.5 rounded-full bg-[#F4F5F5] text-[#171719] border border-black/5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#171719]"></span> Start
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#F4F5F5] text-[#171719] border border-black/5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#171719]"></span> Pickup
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#E34A32]/10 text-[#E34A32] border border-[#E34A32]/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E34A32]"></span> Dropoff
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#F05A3C]/10 text-[#F05A3C] border border-[#F05A3C]/20 flex items-center gap-1.5">
            <span>⛽</span> Fuel Stop
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#F4F5F5] text-[#55575c] border border-black/5 flex items-center gap-1.5">
            <span>🌙</span> 10-Hr Rest
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#E34A32]/10 text-[#E34A32] border border-[#E34A32]/20 flex items-center gap-1.5">
            <span>🔄</span> 34-Hr Restart
          </span>
        </div>
      </div>

      <div className="h-[440px] w-full relative z-0">
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
              color="#E34A32"
              weight={5}
              opacity={0.85}
            />
          )}

          {currentLoc && (
            <Marker position={[currentLoc.lat, currentLoc.lng]} icon={createCustomIcon('#171719', 'S')}>
              <Popup className="text-[#232427]">
                <div className="font-bold text-sm">Start / Current Location</div>
                <div className="text-xs text-[#55575c]">{currentLoc.display_name}</div>
              </Popup>
            </Marker>
          )}

          {pickupLoc && (
            <Marker position={[pickupLoc.lat, pickupLoc.lng]} icon={createCustomIcon('#171719', 'P')}>
              <Popup className="text-[#232427]">
                <div className="font-bold text-sm">Pickup Location (1 Hr On-Duty)</div>
                <div className="text-xs text-[#55575c]">{pickupLoc.display_name}</div>
              </Popup>
            </Marker>
          )}

          {dropoffLoc && (
            <Marker position={[dropoffLoc.lat, dropoffLoc.lng]} icon={createCustomIcon('#E34A32', 'D')}>
              <Popup className="text-[#232427]">
                <div className="font-bold text-sm text-[#E34A32]">Dropoff Location (1 Hr On-Duty)</div>
                <div className="text-xs text-[#55575c]">{dropoffLoc.display_name}</div>
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
                <Popup className="text-[#232427]">
                  <div className="font-bold uppercase text-[10px] tracking-wider text-[#8a8c91]">{stop.stop_type.replace('_', ' ')}</div>
                  <div className="font-semibold text-sm">{stop.remark}</div>
                  <div className="text-xs text-[#55575c] mt-1">
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

