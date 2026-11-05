/**
 * AetherVerse Private & Group Messaging Center
 * End-to-end conversations, configurable disappearing timers, media attachments, and real-time delivery.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Conversation, Message, UserProfile } from '../types/index';
import { api } from '../services/api';
import {
  Send,
  Image as ImageIcon,
  Clock,
  Mic,
  Smile,
  Shield,
  Search,
  Users,
  CheckCheck,
  Check,
  Plus,
  AlertCircle
} from 'lucide-react';

interface MessagesViewProps {
  currentUser: UserProfile;
}

const TIMER_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '30 Seconds', seconds: 30 },
  { label: '5 Minutes', seconds: 300 },
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 }
];

export const MessagesView: React.FC<MessagesViewProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchUsersList, setSearchUsersList] = useState<UserProfile[]>([]);
  const [mediaAttachmentUrl, setMediaAttachmentUrl] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
      if (res.conversations.length > 0 && !activeConv) {
        selectConversation(res.conversations[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    try {
      const res = await api.getMessages(conv.id);
      setMessages(res.messages);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || (!inputText.trim() && !mediaAttachmentUrl)) return;

    const text = inputText.trim();
    const media = mediaAttachmentUrl;
    setInputText('');
    setMediaAttachmentUrl(null);

    try {
      const res = await api.sendMessage({
        conversationId: activeConv.id,
        text,
        mediaUrl: media || undefined,
        mediaType: media ? 'image' : undefined
      });
      setMessages(prev => [...prev, res.message]);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const handleSetTimer = async (seconds: number) => {
    if (!activeConv) return;
    try {
      const res = await api.setDisappearingTimer(activeConv.id, seconds);
      setActiveConv(res.conversation);
      setConversations(prev => prev.map(c => c.id === activeConv.id ? res.conversation : c));
    } catch (err: any) {
      alert(err.message || 'Failed to update timer');
    }
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchUsersList([]);
      return;
    }
    try {
      const res = await api.searchUsers(q);
      setSearchUsersList(res.users.filter(u => u.id !== currentUser.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChatWith = (user: UserProfile) => {
    // Check if conversation already exists
    const existing = conversations.find(c => !c.isGroup && c.participantIds.includes(user.id));
    if (existing) {
      selectConversation(existing);
      setShowNewChatModal(false);
      return;
    }

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      isGroup: false,
      participantIds: [currentUser.id, user.id],
      participants: [currentUser, user],
      updatedAt: new Date().toISOString(),
      disappearingTimerSeconds: 0
    };

    setConversations([newConv, ...conversations]);
    selectConversation(newConv);
    setShowNewChatModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] md:h-[calc(100vh-40px)] p-2 md:p-6 flex flex-col">
      <div className="flex-1 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
        {/* Left Conversations Sidebar */}
        <div className="w-full md:w-80 border-r border-neutral-800 flex flex-col bg-neutral-950/60">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-purple-400" /> Messages
            </h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md transition-colors"
              title="New Conversation"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-850">
            {conversations.map(conv => {
              const otherUser = conv.participants.find(p => p.id !== currentUser.id) || conv.participants[0];
              const isSelected = activeConv?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-purple-950/40 border-l-4 border-purple-500' : 'hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={conv.isGroup ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80' : otherUser?.avatarUrl}
                      alt="Avatar"
                      className="w-11 h-11 rounded-full object-cover border border-neutral-700"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs truncate">
                        {conv.isGroup ? conv.title : otherUser?.displayName}
                      </span>
                      {conv.disappearingTimerSeconds > 0 && (
                        <span className="text-[10px] text-pink-400 flex items-center gap-0.5">
                          <Clock size={10} /> {conv.disappearingTimerSeconds}s
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Conversation Chat Panel */}
        {activeConv ? (
          <div className="flex-1 flex flex-col justify-between bg-neutral-950/40">
            {/* Chat Top Bar */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <img
                  src={activeConv.isGroup ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80' : activeConv.participants.find(p => p.id !== currentUser.id)?.avatarUrl}
                  alt="Chat"
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/50"
                />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {activeConv.isGroup ? activeConv.title : activeConv.participants.find(p => p.id !== currentUser.id)?.displayName}
                  </h3>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active in Metaverse
                  </div>
                </div>
              </div>

              {/* Disappearing Timer Dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
                  <Clock size={13} className="text-pink-400" />
                  <span className="text-[11px]">Disappearing:</span>
                  <select
                    value={activeConv.disappearingTimerSeconds}
                    onChange={(e) => handleSetTimer(Number(e.target.value))}
                    className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {TIMER_OPTIONS.map(opt => (
                      <option key={opt.seconds} value={opt.seconds} className="bg-neutral-900 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;

                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderUsername}
                        className="w-7 h-7 rounded-full object-cover mb-1 border border-neutral-700"
                      />
                    )}

                    <div className={`max-w-[70%] rounded-2xl p-3.5 text-xs shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                        : 'bg-neutral-800 text-neutral-200 rounded-bl-none'
                    }`}>
                      {msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden max-h-60">
                          <img src={msg.mediaUrl} alt="Attachment" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <p className="leading-relaxed">{msg.text}</p>

                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-white/70">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck size={12} className="text-cyan-300" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Media Attachment Preview if selected */}
            {mediaAttachmentUrl && (
              <div className="p-2 px-4 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-300 truncate max-w-sm">Attached: {mediaAttachmentUrl}</span>
                <button
                  onClick={() => setMediaAttachmentUrl(null)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  ✕ Remove
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 flex items-center gap-2 bg-neutral-900/50">
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter media/image URL to send:');
                  if (url) setMediaAttachmentUrl(url);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                title="Attach Media"
              >
                <ImageIcon size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRecordingVoice(!isRecordingVoice);
                  if (!isRecordingVoice) {
                    setInputText('🎙️ [Voice Audio Memo - 0:08]');
                  }
                }}
                className={`p-2 rounded-xl transition-colors ${
                  isRecordingVoice ? 'text-red-400 bg-red-950/60 animate-pulse' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title="Voice Memo"
              >
                <Mic size={18} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeConv.disappearingTimerSeconds > 0 ? `Message (disappears in ${activeConv.disappearingTimerSeconds}s)...` : 'Write a message...'}
                className="flex-1 bg-neutral-900 text-white text-xs px-4 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !mediaAttachmentUrl}
                className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8">
            <Users size={48} className="opacity-30 mb-2" />
            <div className="text-base font-semibold text-neutral-300">Select a Conversation</div>
            <p className="text-xs text-neutral-500 mt-1">Chat in real-time or start a new private message.</p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h3 className="font-extrabold text-white text-base">New Conversation</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search user by username or name..."
                  className="w-full bg-neutral-900 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {searchUsersList.map(u => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWith(u)}
                    className="p-2.5 rounded-xl hover:bg-neutral-900 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatarUrl} alt={u.username} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="font-bold text-white text-xs">{u.displayName}</div>
                        <div className="text-[10px] text-neutral-400">@{u.username}</div>
                      </div>
                    </div>
                    <span className="text-xs text-purple-400 font-semibold">Start Chat →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
