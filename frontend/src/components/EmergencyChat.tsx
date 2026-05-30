import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { SocketContext } from '../App';
import { emergencyAPI } from '../services/api';
import { socketEvents } from '../services/socket';

interface ChatMessage {
  id: string;
  emergency_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  timestamp: string;
}

interface EmergencyChatProps {
  emergencyId: string;
  onClose: () => void;
}

export default function EmergencyChat({ emergencyId, onClose }: EmergencyChatProps) {
  const { user } = useAuthStore();
  const { socket } = useContext(SocketContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    emergencyAPI.getChatMessages(emergencyId)
      .then((res) => setMessages(res.data.messages || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [emergencyId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.emergency_id === emergencyId) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on('new_chat_message', handleNewMessage);
    return () => { socket.off('new_chat_message', handleNewMessage); };
  }, [socket, emergencyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setIsSending(true);
    const text = input.trim();
    setInput('');
    try {
      await emergencyAPI.sendChatMessage(emergencyId, text);
      // Also emit via socket
      if (socket) {
        socket.emit('chat_message', {
          emergencyId,
          senderId: user.id,
          senderRole: user.role,
          message: text,
        });
      }
    } catch {
      setInput(text);
    } finally {
      setIsSending(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver': return 'text-blue-400';
      case 'hospital_admin': return 'text-green-400';
      case 'system_admin': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'driver': return '🚑 Driver';
      case 'hospital_admin': return '🏥 Hospital';
      case 'system_admin': return '⚙️ Admin';
      default: return '👤 Patient';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 flex flex-col bg-dark-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h3 className="font-semibold text-white">Emergency Chat</h3>
          <p className="text-xs text-gray-400 font-mono">{emergencyId.slice(0, 20)}...</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center">
          <X className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isOwn && (
                    <span className={`text-xs ${getRoleColor(msg.sender_role)}`}>
                      {getRoleLabel(msg.sender_role)}
                    </span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isOwn
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 input-dark py-2.5"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isSending}
          className="w-11 h-11 rounded-xl bg-red-600 disabled:bg-red-900 flex items-center justify-center flex-shrink-0"
        >
          {isSending ? <Loader className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>
    </motion.div>
  );
}
