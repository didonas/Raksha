import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineEvent {
  id: string;
  status: string;
  message: string;
  timestamp: string;
}

interface EmergencyTimelineProps {
  events: TimelineEvent[];
  currentStatus?: string;
}

const statusIcons: Record<string, string> = {
  gps_acquired: '📍',
  broadcast_sent: '📡',
  ambulance_assigned: '🚑',
  driver_accepted: '👤',
  en_route: '🛣️',
  arrived: '✅',
  patient_onboard: '🏥',
  reached_hospital: '🎯',
  resolved: '✅',
  cancelled: '❌',
};

export default function EmergencyTimeline({ events, currentStatus }: EmergencyTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-4">
        <Loader className="w-5 h-5 text-gray-500 animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Waiting for updates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isActive = isLast && currentStatus && !['resolved', 'cancelled'].includes(currentStatus);

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-red-600 animate-pulse' : 'bg-green-600/20 border border-green-500/30'
              }`}>
                {isActive ? (
                  <Loader className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <span className="text-sm">{statusIcons[event.status] || '✓'}</span>
                )}
              </div>
              {!isLast && <div className="w-0.5 h-6 bg-gray-700 mt-1" />}
            </div>

            {/* Content */}
            <div className="pt-1 flex-1">
              <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                {event.message}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {format(new Date(event.timestamp), 'HH:mm:ss')}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
