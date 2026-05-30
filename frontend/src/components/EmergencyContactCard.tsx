import React from 'react';
import { Phone } from 'lucide-react';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
  is_primary?: boolean;
}

interface EmergencyContactCardProps {
  contact: EmergencyContact;
}

export default function EmergencyContactCard({ contact }: EmergencyContactCardProps) {
  return (
    <div className="flex-shrink-0 w-32 glass rounded-xl p-3 flex flex-col items-center gap-2">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-white truncate w-full">{contact.name}</p>
        <p className="text-xs text-gray-500">{contact.relationship || 'Contact'}</p>
      </div>
      <a
        href={`tel:${contact.phone}`}
        className="w-full py-1.5 bg-green-600/20 border border-green-500/30 rounded-lg flex items-center justify-center gap-1"
      >
        <Phone className="w-3 h-3 text-green-400" />
        <span className="text-xs text-green-400">Call</span>
      </a>
    </div>
  );
}
