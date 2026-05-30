import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Bell, CheckCheck, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { notificationAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  onClose: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  emergency: <AlertTriangle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  system: <Bell className="w-4 h-4 text-purple-400" />,
};

const typeBg: Record<string, string> = {
  emergency: 'border-red-500/20 bg-red-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
  success: 'border-green-500/20 bg-green-500/5',
  warning: 'border-orange-500/20 bg-orange-500/5',
  system: 'border-purple-500/20 bg-purple-500/5',
};

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationAPI.getAll()
      .then((res) => setNotifications(res.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-dark-800 border-l border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-300" />
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-red-600 rounded-full text-xs text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" />
                All read
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center">
              <X className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => !notif.is_read && markRead(notif.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  typeBg[notif.type] || typeBg.info
                } ${!notif.is_read ? 'opacity-100' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-2">
                  {typeIcons[notif.type] || typeIcons.info}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                      {!notif.is_read && <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{format(new Date(notif.created_at), 'dd MMM, HH:mm')}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
