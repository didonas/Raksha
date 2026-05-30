import React from 'react';
import { Phone, Navigation, Star, Bed, AlertTriangle, MapPin } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  emergency_capacity: number;
  current_patients: number;
  icu_beds: number;
  icu_available: number;
  trauma_support: boolean;
  rating: number;
  specialties?: string[];
  distance?: number;
  available_capacity?: number;
  occupancy_percent?: number;
}

interface HospitalCardProps {
  hospital: Hospital;
  onAlert?: () => void;
}

export default function HospitalCard({ hospital, onAlert }: HospitalCardProps) {
  const occupancy = hospital.occupancy_percent || Math.round((hospital.current_patients / hospital.emergency_capacity) * 100);
  const occupancyColor = occupancy > 80 ? 'bg-red-500' : occupancy > 60 ? 'bg-orange-500' : 'bg-green-500';
  const occupancyTextColor = occupancy > 80 ? 'text-red-400' : occupancy > 60 ? 'text-orange-400' : 'text-green-400';

  const openDirections = () => {
    window.open(`https://maps.google.com/?q=${hospital.lat},${hospital.lng}`, '_blank');
  };

  return (
    <div className="glass rounded-2xl p-4 card-hover">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-semibold text-white text-sm leading-tight">{hospital.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <p className="text-xs text-gray-400 truncate">{hospital.address}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {hospital.distance !== undefined && (
            <span className="text-xs font-medium text-blue-400">{hospital.distance.toFixed(1)} km</span>
          )}
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-yellow-400">{hospital.rating}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {hospital.trauma_support && (
          <span className="px-2 py-0.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
            🚨 Trauma
          </span>
        )}
        {hospital.icu_available > 0 && (
          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
            🛏 ICU: {hospital.icu_available}
          </span>
        )}
        {hospital.specialties?.slice(0, 2).map((s) => (
          <span key={s} className="px-2 py-0.5 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-full text-xs">
            {s}
          </span>
        ))}
      </div>

      {/* Capacity bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Emergency Capacity</span>
          <span className={occupancyTextColor}>{occupancy}% full</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${occupancyColor} rounded-full transition-all`} style={{ width: `${Math.min(100, occupancy)}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-500">
          <span>{hospital.current_patients} patients</span>
          <span>{hospital.available_capacity || hospital.emergency_capacity - hospital.current_patients} available</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={`tel:${hospital.phone}`}
          className="flex-1 py-2 bg-green-600/20 border border-green-500/30 rounded-xl flex items-center justify-center gap-1.5 text-green-400 text-xs font-medium"
        >
          <Phone className="w-3.5 h-3.5" />
          Call
        </a>
        <button
          onClick={openDirections}
          className="flex-1 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center gap-1.5 text-blue-400 text-xs font-medium"
        >
          <Navigation className="w-3.5 h-3.5" />
          Directions
        </button>
        {onAlert && (
          <button
            onClick={onAlert}
            className="flex-1 py-2 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center justify-center gap-1.5 text-red-400 text-xs font-medium"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Alert
          </button>
        )}
      </div>
    </div>
  );
}
