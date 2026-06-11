import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset paths in Vite
// We use CDN URLs for default Leaflet icons to ensure they load reliably without local bundling issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapLocation {
  id?: number | string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

interface LeafletMapProps {
  locations: MapLocation[];
  zoom?: number;
  center?: [number, number];
}

// Sub-component to fit the map boundaries to the markers dynamically
const FitBounds: React.FC<{ locations: MapLocation[] }> = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 10);
    } else {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [locations, map]);

  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({ 
  locations, 
  zoom = 3, 
  center = [20, 0] // Default world center
}) => {
  const polylineCoords = locations.map(loc => [loc.lat, loc.lng] as [number, number]);

  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // We can invert tiles slightly in dark mode via CSS filters, but standard OSM is fully functional and responsive
        />

        {locations.map((loc, idx) => (
          <Marker 
            key={loc.id || idx} 
            position={[loc.lat, loc.lng]}
          >
            <Popup>
              <div className="text-slate-800 font-sans p-1">
                <h4 className="font-bold text-sm leading-tight">{loc.name}</h4>
                {loc.description && <p className="text-xs text-slate-600 mt-1">{loc.description}</p>}
                <div className="text-[10px] text-slate-400 mt-1.5">
                  Lat: {loc.lat.toFixed(4)}, Lng: {loc.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {locations.length > 1 && (
          <Polyline 
            positions={polylineCoords} 
            color="#10b981" // Emerald
            weight={3}
            opacity={0.8}
            dashArray="8, 6"
          />
        )}

        <FitBounds locations={locations} />
      </MapContainer>
    </div>
  );
};
export default LeafletMap;
