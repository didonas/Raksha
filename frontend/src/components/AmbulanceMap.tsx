import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createAmbulanceIcon = () => L.divIcon({
  html: `<div class="ambulance-moving" style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))">🚑</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const createUserIcon = () => L.divIcon({
  html: `
    <div style="position:relative;width:24px;height:24px">
      <div style="position:absolute;inset:0;background:rgba(220,38,38,0.3);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
      <div style="position:absolute;inset:4px;background:#dc2626;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(220,38,38,0.6)"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createHospitalIcon = () => L.divIcon({
  html: `<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏥</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface MapProps {
  userLat: number;
  userLng: number;
  ambulanceLat?: number;
  ambulanceLng?: number;
  hospitalLat?: number;
  hospitalLng?: number;
  ambulanceInfo?: { vehicle_number: string; driver?: { name: string } };
  hospitalInfo?: { name: string };
  height?: string;
}

function MapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function AmbulanceMap({
  userLat,
  userLng,
  ambulanceLat,
  ambulanceLng,
  hospitalLat,
  hospitalLng,
  ambulanceInfo,
  hospitalInfo,
  height = '400px',
}: MapProps) {
  const centerLat = ambulanceLat || userLat;
  const centerLng = ambulanceLng || userLng;

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={14}
      style={{ height, width: '100%', borderRadius: '16px' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {ambulanceLat && ambulanceLng && (
        <MapCenter lat={centerLat} lng={centerLng} />
      )}

      {/* User location */}
      <Marker position={[userLat, userLng]} icon={createUserIcon()}>
        <Popup>
          <div style={{ color: '#000' }}>
            <strong>Your Location</strong>
            <br />
            {userLat.toFixed(5)}, {userLng.toFixed(5)}
          </div>
        </Popup>
      </Marker>

      {/* Ambulance */}
      {ambulanceLat && ambulanceLng && (
        <Marker position={[ambulanceLat, ambulanceLng]} icon={createAmbulanceIcon()}>
          <Popup>
            <div style={{ color: '#000' }}>
              <strong>🚑 {ambulanceInfo?.vehicle_number || 'Ambulance'}</strong>
              {ambulanceInfo?.driver && <><br />Driver: {ambulanceInfo.driver.name}</>}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Hospital */}
      {hospitalLat && hospitalLng && (
        <Marker position={[hospitalLat, hospitalLng]} icon={createHospitalIcon()}>
          <Popup>
            <div style={{ color: '#000' }}>
              <strong>🏥 {hospitalInfo?.name || 'Hospital'}</strong>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Route: Ambulance → User */}
      {ambulanceLat && ambulanceLng && (
        <Polyline
          positions={[[ambulanceLat, ambulanceLng], [userLat, userLng]]}
          color="#dc2626"
          weight={3}
          dashArray="10, 8"
          opacity={0.8}
        />
      )}

      {/* Route: User → Hospital */}
      {hospitalLat && hospitalLng && (
        <Polyline
          positions={[[userLat, userLng], [hospitalLat, hospitalLng]]}
          color="#3b82f6"
          weight={2}
          dashArray="6, 6"
          opacity={0.5}
        />
      )}
    </MapContainer>
  );
}
