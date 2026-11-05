/**
 * AetherVerse Ultra Admin Control Center
 * Accessible ONLY to SUPER_ADMIN accounts (likedf88@gmail.com and cmoney20262626@gmail.com).
 * Features Dashboard Metrics, User Role Enforcement, Moderation, Documented Chat Audits,
 * 3D Shop Manager with GLB Inspector, Economy Controls, Platform Flags, and Immutable Audit Logs.
 */

import React, { useEffect, useState } from 'react';
import {
  UserProfile,
  ReportItem,
  AdminAuditLog,
  PlatformConfig,
  ShopItem,
  UserRole
} from '../types/index';
import { isSuperAdmin } from '../utils/security';
import { api } from '../services/api';
import {
  ShieldAlert,
  Users,
  Activity,
  AlertTriangle,
  ShoppingBag,
  DollarSign,
  Settings,
  FileText,
  Lock,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Eye,
  Megaphone,
  Radio,
  Zap,
  Clock,
  Cpu,
  Layers
} from 'lucide-react';
import { AdminAutoRiggingStudio } from './AdminAutoRiggingStudio';
import { RiggingPipeline } from './RiggingPipeline';

interface AdminViewProps {
  currentUser: UserProfile;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'rigging_pipeline' | 'auto_rigging' | 'users' | 'moderation' | 'chat_audit' | 'shop' | 'economy' | 'config' | 'audit_logs'
  >('dashboard');

  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AdminAuditLog[]>([]);
  const [shopItemsList, setShopItemsList] = useState<ShopItem[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>({
    maintenanceMode: false,
    globalAnnouncement: '',
    maxUploadSizeMB: 50,
    allowNewRegistrations: true,
    allowCustom3DModelUpload: true
  });

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Chat Audit Modal with mandatory documented reason
  const [chatAuditConvId, setChatAuditConvId] = useState('');
  const [chatAuditReason, setChatAuditReason] = useState('');
  const [chatAuditResult, setChatAuditResult] = useState<any | null>(null);

  // Coin Adjustment Modal
  const [selectedUserForCoins, setSelectedUserForCoins] = useState<UserProfile | null>(null);
  const [coinAmount, setCoinAmount] = useState<number>(500);
  const [coinReason, setCoinReason] = useState('Official platform grant');

  // Shop Item Creator
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('avatar');
  const [newItemPrice, setNewItemPrice] = useState<number>(1000);
  const [newItemModelUrl, setNewItemModelUrl] = useState('');
  const [newItemThumbnail, setNewItemThumbnail] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Strictly verify SUPER_ADMIN
  const authorized = isSuperAdmin(currentUser);

  useEffect(() => {
    if (authorized) {
      loadAllAdminData();
    }
  }, [authorized]);

  const loadAllAdminData = async () => {
    try {
      const [m, u, r, l, s, sess] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminUsers(),
        api.getAdminReports(),
        api.getAdminAuditLogs(),
        api.getShopItems(),
        api.getSession()
      ]);
      setMetrics(m.metrics);
      setUsersList(u.users);
      setReportsList(r.reports);
      setAuditLogsList(l.auditLogs);
      setShopItemsList(s.items);
      setPlatformConfig(sess.config);
    } catch (err: any) {
      console.error('Error loading admin data', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const res = await api.updateAdminUserRole(userId, newRole, 'Admin Dashboard Role Adjustment');
      setFeedbackMessage(res.message);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleBanToggle = async (userId: string, currentlyBanned: boolean) => {
    try {
      const res = await api.toggleAdminUserBan(userId, !currentlyBanned, 'Admin Disciplinary Enforcement');
      setFeedbackMessage(res.message);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle ban');
    }
  };

  const handleGrantCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForCoins) return;

    try {
      const res = await api.grantAdminCoins(selectedUserForCoins.id, coinAmount, coinReason);
      setFeedbackMessage(res.message);
      setSelectedUserForCoins(null);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust coins');
    }
  };

  const handleResolveReport = async (reportId: string, status: string) => {
    const notes = prompt('Enter moderation notes for audit log:');
    try {
      const res = await api.resolveAdminReport(reportId, status, notes || undefined);
      setFeedbackMessage(res.message);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report');
    }
  };

  const handleExecuteChatAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatAuditReason || chatAuditReason.trim().length < 10) {
      alert('A detailed documented moderation reason (at least 10 characters) is legally required.');
      return;
    }

    try {
      const res = await api.inspectChatAudit(chatAuditConvId, chatAuditReason);
      setChatAuditResult(res);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Chat inspection failed');
    }
  };

  const handleCreateShopItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    try {
      const res = await api.createAdminShopItem({
        name: newItemName,
        category: newItemCategory as any,
        price: Number(newItemPrice),
        description: newItemDesc,
        thumbnailUrl: newItemThumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
        modelUrl: newItemModelUrl
      });
      setFeedbackMessage(res.message);
      setNewItemName('');
      setNewItemDesc('');
      setNewItemModelUrl('');
      setNewItemThumbnail('');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to create shop product');
    }
  };

  const handleDeleteShopItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this 3D item from the marketplace?')) return;
    try {
      const res = await api.deleteAdminShopItem(itemId);
      setFeedbackMessage(res.message);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const res = await api.updateAdminConfig(platformConfig);
      setFeedbackMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to update configuration');
    }
  };

  // If unauthorized, block access cleanly with security warning
  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-red-950/40 border border-red-800 rounded-3xl text-center space-y-4">
        <Lock size={48} className="mx-auto text-red-400" />
        <h2 className="text-xl font-bold text-white">ACCESS DENIED — SUPER_ADMIN ONLY</h2>
        <p className="text-xs text-neutral-300">
          This administration terminal is strictly restricted to designated platform administrators ({'likedf88@gmail.com'} and {'cmoney20262626@gmail.com'}). All unauthorized access attempts are logged.
        </p>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u =>
    u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Super Admin Top Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/80 via-neutral-900 to-purple-950/80 border border-red-900/60 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-black border border-red-500/40 flex items-center gap-1">
                <ShieldAlert size={13} className="text-red-400" /> ULTIMATE SUPER_ADMIN ACCESS
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Operator: {currentUser.email}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              AetherVerse Ultra Control Center
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Complete oversight over user security roles, 3D shop assets, economy minting, platform flags, and audit logs.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-neutral-950/80 px-4 py-3 rounded-2xl border border-neutral-800">
            <Radio size={16} className="text-emerald-400 animate-pulse" />
            <div className="text-left text-xs">
              <div className="text-white font-bold">Metaverse Online</div>
              <div className="text-neutral-400 text-[10px]">All Systems Operational</div>
            </div>
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs rounded-xl flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs hover:text-white">✕</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-800">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'rigging_pipeline', label: 'Rigging Pipeline', icon: Layers },
          { id: 'auto_rigging', label: 'Auto-Rigging & Mixamo', icon: Cpu },
          { id: 'users', label: 'User Roles & Bans', icon: Users },
          { id: 'moderation', label: 'Moderation Reports', icon: AlertTriangle },
          { id: 'chat_audit', label: 'Chat Investigation', icon: Lock },
          { id: 'shop', label: '3D Shop Manager', icon: ShoppingBag },
          { id: 'economy', label: 'Economy & Coins', icon: DollarSign },
          { id: 'config', label: 'Platform Config', icon: Settings },
          { id: 'audit_logs', label: 'Audit Logs', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Dashboard Overview */}
      {activeSection === 'dashboard' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase">Registered Users</div>
              <div className="text-2xl font-black text-white mt-1">{metrics.totalUsers}</div>
              <div className="text-[10px] text-emerald-400 mt-1">● {metrics.onlineUsers} Active Now</div>
            </div>

            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase">Social Feed Posts</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">{metrics.totalPostsCount}</div>
              <div className="text-[10px] text-neutral-400 mt-1">Photos & Announcements</div>
            </div>

            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase">Short Videos (Reels)</div>
              <div className="text-2xl font-black text-pink-400 mt-1">{metrics.totalVideosCount}</div>
              <div className="text-[10px] text-neutral-400 mt-1">TikTok Format Clustered</div>
            </div>

            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase">Pending Reports</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{metrics.pendingReportsCount}</div>
              <div className="text-[10px] text-neutral-400 mt-1">Requires Moderation</div>
            </div>

            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase">Coin Circulation</div>
              <div className="text-2xl font-black text-yellow-400 mt-1">
                {metrics.totalCoinsInCirculation?.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">Virtual Economy Volume</div>
            </div>

            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase">Active 3D Lobbies</div>
              <div className="text-2xl font-black text-purple-400 mt-1">{metrics.activeLobbiesCount}</div>
              <div className="text-[10px] text-neutral-400 mt-1">{metrics.connectedLobbyPlayers} Avatars in World</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Rigging Pipeline Component */}
      {activeSection === 'rigging_pipeline' && (
        <RiggingPipeline onJobPublished={loadAllAdminData} />
      )}

      {/* 3. Auto-Rigging & Mixamo Engine Studio */}
      {activeSection === 'auto_rigging' && (
        <AdminAutoRiggingStudio />
      )}

      {/* 2. User Management & Roles */}
      {activeSection === 'users' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-purple-400" /> Platform Accounts & Authority
              </h2>
              <p className="text-xs text-neutral-400">
                Grant or revoke administrator roles, suspend accounts, and distribute promotional coins.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search username or email..."
                className="w-full bg-neutral-950 text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/80 uppercase text-[10px] text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredUsers.map(u => {
                  const isHardcodedAdmin = u.email === 'likedf88@gmail.com' || u.email === 'cmoney20262626@gmail.com';

                  return (
                    <tr key={u.id} className="hover:bg-neutral-950/40">
                      <td className="p-3 flex items-center gap-2.5">
                        <img src={u.avatarUrl} alt={u.username} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-white">{u.displayName}</div>
                          <div className="text-[10px] text-neutral-400">@{u.username}</div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-yellow-400">{u.coins.toLocaleString()}</td>
                      <td className="p-3">
                        {u.isBanned ? (
                          <span className="text-red-400 font-bold">SUSPENDED</span>
                        ) : (
                          <span className="text-emerald-400">Active</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {/* Adjust Coins */}
                        <button
                          onClick={() => setSelectedUserForCoins(u)}
                          className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded text-[11px] font-medium"
                        >
                          ± Coins
                        </button>

                        {/* Role Change (Protected against demoting hardcoded admins) */}
                        {!isHardcodedAdmin && (
                          <button
                            onClick={() => handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                          >
                            {u.role === 'ADMIN' ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                        )}

                        {/* Ban / Suspend */}
                        {!isHardcodedAdmin && (
                          <button
                            onClick={() => handleBanToggle(u.id, Boolean(u.isBanned))}
                            className={`px-2 py-1 rounded text-[11px] font-medium ${
                              u.isBanned
                                ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
                                : 'bg-red-950 text-red-300 hover:bg-red-900'
                            }`}
                          >
                            {u.isBanned ? 'Unsuspend' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Moderation Reports */}
      {activeSection === 'moderation' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" /> Moderation Review Center
          </h2>

          <div className="space-y-3">
            {reportsList.map(rep => (
              <div
                key={rep.id}
                className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                      {rep.targetType}
                    </span>
                    <span className="text-xs font-bold text-white">{rep.reason}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      rep.status === 'pending' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1">{rep.details || 'No additional details provided.'}</p>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    Reported by @{rep.reporterUsername} • Target ID: {rep.targetId}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolveReport(rep.id, 'resolved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Take Action & Remove
                  </button>
                  <button
                    onClick={() => handleResolveReport(rep.id, 'dismissed')}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Documented Chat Moderation Audit */}
      {activeSection === 'chat_audit' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-pink-400">
            <Lock size={18} />
            <h2 className="text-base font-bold text-white">Privileged Chat Investigation Terminal</h2>
          </div>
          <p className="text-xs text-neutral-400 max-w-2xl">
            To safeguard user privacy, conversations cannot be inspected without providing a documented reason. Every single inspection creates a permanent, immutable record in the audit log.
          </p>

          <form onSubmit={handleExecuteChatAudit} className="space-y-4 max-w-lg bg-neutral-950/70 p-5 rounded-2xl border border-neutral-800">
            <div>
              <label className="text-xs font-semibold text-neutral-400 block mb-1">Conversation ID</label>
              <input
                type="text"
                required
                value={chatAuditConvId}
                onChange={(e) => setChatAuditConvId(e.target.value)}
                placeholder="conv_1"
                className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-400 block mb-1">Mandatory Moderation Reason</label>
              <textarea
                rows={3}
                required
                value={chatAuditReason}
                onChange={(e) => setChatAuditReason(e.target.value)}
                placeholder="Document legal or safety cause (minimum 10 characters)..."
                className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Authorize & Inspect Conversation
            </button>
          </form>

          {/* Inspection Output */}
          {chatAuditResult && (
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl mt-4">
              <h3 className="font-bold text-white text-sm mb-3">Audit Results: {chatAuditResult.messages.length} Messages Decrypted</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {chatAuditResult.messages.map((m: any) => (
                  <div key={m.id} className="text-xs p-2 bg-neutral-900 rounded-lg">
                    <strong className="text-purple-400">@{m.senderUsername}: </strong>
                    <span className="text-neutral-200">{m.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. 3D Shop Manager */}
      {activeSection === 'shop' && (
        <div className="space-y-6">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <ShoppingBag size={18} className="text-cyan-400" /> Upload & Publish 3D Shop Products
            </h2>

            <form onSubmit={handleCreateShopItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Apex Cyber Katana"
                  className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Category</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                >
                  <option value="avatar">3D Avatar</option>
                  <option value="skin">Avatar Skin</option>
                  <option value="clothing">Clothing</option>
                  <option value="accessories">Accessories</option>
                  <option value="emote">Emote</option>
                  <option value="music">Lobby Music</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Price (COINS)</label>
                <input
                  type="number"
                  required
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(Number(e.target.value))}
                  className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={newItemThumbnail}
                  onChange={(e) => setNewItemThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-neutral-400 block mb-1">3D GLB Model Asset URL</label>
                <input
                  type="text"
                  value={newItemModelUrl}
                  onChange={(e) => setNewItemModelUrl(e.target.value)}
                  placeholder="/models/item_asset.glb"
                  className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Item lore, attributes, and visual features..."
                  className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2 rounded-xl border border-neutral-700 focus:outline-none resize-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                >
                  Publish 3D Item to Catalog
                </button>
              </div>
            </form>
          </div>

          {/* Active Items Table */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">Active Shop Inventory ({shopItemsList.length} items)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shopItemsList.map(item => (
                <div key={item.id} className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={item.thumbnailUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <div className="font-bold text-white text-xs">{item.name}</div>
                      <div className="text-[10px] text-yellow-400 font-bold">{item.price} COINS</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteShopItem(item.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-900"
                    title="Delete Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Economy Administration */}
      {activeSection === 'economy' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign size={18} className="text-yellow-400" /> Virtual Currency Operations
          </h2>
          <p className="text-xs text-neutral-400">
            Select any user in the 'User Roles & Bans' tab to credit or debit coins. All transactions are logged with timestamps.
          </p>

          <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 max-w-md">
            <div className="text-xs font-semibold text-neutral-300">Quick Mint Promotional Rewards</div>
            <p className="text-[11px] text-neutral-500 mt-0.5">Air drop coins to all active registered users simultaneously.</p>
            <button
              onClick={() => alert('Air drop event simulated! 500 bonus coins credited to all active players.')}
              className="mt-3 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-bold rounded-xl border border-yellow-500/30 transition-all flex items-center gap-1.5"
            >
              <Zap size={14} /> Distribute +500 Coins to All
            </button>
          </div>
        </div>
      )}

      {/* 7. Platform Configuration */}
      {activeSection === 'config' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings size={18} className="text-purple-400" /> Platform Settings & Global Announcements
          </h2>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-xs font-semibold text-neutral-400 block mb-1">Global Announcement Banner</label>
              <input
                type="text"
                value={platformConfig.globalAnnouncement || ''}
                onChange={(e) => setPlatformConfig({ ...platformConfig, globalAnnouncement: e.target.value })}
                className="w-full bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div>
                <div className="text-xs font-bold text-white">Emergency Maintenance Mode</div>
                <div className="text-[11px] text-neutral-400">Only SUPER_ADMIN users can access metaverse while active.</div>
              </div>
              <input
                type="checkbox"
                checked={platformConfig.maintenanceMode}
                onChange={(e) => setPlatformConfig({ ...platformConfig, maintenanceMode: e.target.checked })}
                className="w-5 h-5 accent-purple-600"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div>
                <div className="text-xs font-bold text-white">Allow New Registrations</div>
                <div className="text-[11px] text-neutral-400">Permit new visitors to create accounts.</div>
              </div>
              <input
                type="checkbox"
                checked={platformConfig.allowNewRegistrations}
                onChange={(e) => setPlatformConfig({ ...platformConfig, allowNewRegistrations: e.target.checked })}
                className="w-5 h-5 accent-purple-600"
              />
            </div>

            <button
              onClick={handleUpdateConfig}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* 8. Immutable Admin Audit Logs */}
      {activeSection === 'audit_logs' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-cyan-400" /> Immutable Super Admin Audit Log
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/80 uppercase text-[10px] text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Details & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {auditLogsList.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-950/40">
                    <td className="p-3 font-mono text-[10px] text-neutral-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-white">{log.adminEmail}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-cyan-300">{log.targetType}:{log.targetId}</td>
                    <td className="p-3 text-[11px] text-neutral-300">
                      <div>{log.details}</div>
                      {log.reason && (
                        <div className="text-[10px] text-neutral-500 italic mt-0.5">Reason: {log.reason}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Coins Modal */}
      {selectedUserForCoins && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base">Adjust Coins for @{selectedUserForCoins.username}</h3>
            <p className="text-xs text-neutral-400 mt-1">Current Balance: {selectedUserForCoins.coins} COINS</p>

            <form onSubmit={handleGrantCoins} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Coin Delta (+ or -)</label>
                <input
                  type="number"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(Number(e.target.value))}
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  value={coinReason}
                  onChange={(e) => setCoinReason(e.target.value)}
                  placeholder="Document reason for adjustment..."
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForCoins(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Confirm Balance Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
