/**
 * AetherVerse Frontend API Client
 */

import {
  UserProfile,
  Post,
  ShortVideo,
  Story,
  Conversation,
  Message,
  ShopItem,
  MusicTrack,
  EmoteItem,
  LobbyRoom,
  ReportItem,
  AdminAuditLog,
  PlatformConfig,
  ModelProcessingJob
} from '../types/index';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('aether_token') || 'usr_superadmin_likedf88';
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('aether_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('aether_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Network request failed');
    }

    return data as T;
  }

  // --- Auth & Session ---
  async getSession(): Promise<{ user: UserProfile; config: PlatformConfig }> {
    return this.request<{ user: UserProfile; config: PlatformConfig }>('/auth/session');
  }

  async login(email: string, password?: string): Promise<{ token: string; user: UserProfile }> {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  }

  async register(data: { email: string; username: string; displayName?: string; password?: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token);
    return res;
  }

  async switchUser(userId: string): Promise<{ token: string; user: UserProfile }> {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    this.setToken(res.token);
    return res;
  }

  async updateProfile(profileData: Partial<UserProfile>): Promise<{ user: UserProfile }> {
    return this.request<{ user: UserProfile }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async searchUsers(query: string): Promise<{ users: UserProfile[] }> {
    return this.request<{ users: UserProfile[] }>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // --- Posts & Feed ---
  async getPosts(category: string = 'foryou'): Promise<{ posts: Post[] }> {
    return this.request<{ posts: Post[] }>(`/posts?category=${category}`);
  }

  async createPost(postData: Partial<Post>): Promise<{ post: Post }> {
    return this.request<{ post: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async toggleLikePost(postId: string): Promise<{ post: Post; isLiked: boolean; likesCount: number }> {
    return this.request<{ post: Post; isLiked: boolean; likesCount: number }>(`/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  async getComments(postId: string): Promise<{ comments: any[] }> {
    return this.request<{ comments: any[] }>(`/posts/${postId}/comments`);
  }

  async addComment(postId: string, content: string): Promise<{ comment: any }> {
    return this.request<{ comment: any }>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  // --- Videos ---
  async getVideos(): Promise<{ videos: ShortVideo[] }> {
    return this.request<{ videos: ShortVideo[] }>('/videos');
  }

  async createVideo(videoData: Partial<ShortVideo>): Promise<{ video: ShortVideo }> {
    return this.request<{ video: ShortVideo }>('/videos', {
      method: 'POST',
      body: JSON.stringify(videoData)
    });
  }

  async toggleLikeVideo(videoId: string): Promise<{ video: ShortVideo; isLiked: boolean; likesCount: number }> {
    return this.request<{ video: ShortVideo; isLiked: boolean; likesCount: number }>(`/videos/${videoId}/like`, {
      method: 'POST'
    });
  }

  async recordVideoView(videoId: string): Promise<void> {
    try {
      await this.request(`/videos/${videoId}/view`, { method: 'POST' });
    } catch {
      // Non-blocking view count
    }
  }

  // --- Stories ---
  async getStories(): Promise<{ stories: Story[] }> {
    return this.request<{ stories: Story[] }>('/stories');
  }

  async createStory(storyData: Partial<Story>): Promise<{ story: Story }> {
    return this.request<{ story: Story }>('/stories', {
      method: 'POST',
      body: JSON.stringify(storyData)
    });
  }

  async viewStory(storyId: string): Promise<{ story: Story }> {
    return this.request<{ story: Story }>(`/stories/${storyId}/view`, {
      method: 'POST'
    });
  }

  // --- Messaging ---
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request<{ conversations: Conversation[] }>('/conversations');
  }

  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    return this.request<{ messages: Message[] }>(`/conversations/${conversationId}/messages`);
  }

  async sendMessage(data: { conversationId: string; text?: string; mediaUrl?: string; mediaType?: string }): Promise<{ message: Message }> {
    return this.request<{ message: Message }>('/messages/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async setDisappearingTimer(conversationId: string, seconds: number): Promise<{ conversation: Conversation }> {
    return this.request<{ conversation: Conversation }>(`/conversations/${conversationId}/timer`, {
      method: 'POST',
      body: JSON.stringify({ seconds })
    });
  }

  // --- Shop & Rewards ---
  async getShopItems(category?: string): Promise<{ items: ShopItem[]; musicTracks: MusicTrack[]; emotes: EmoteItem[] }> {
    const query = category ? `?category=${category}` : '';
    return this.request<{ items: ShopItem[]; musicTracks: MusicTrack[]; emotes: EmoteItem[] }>(`/shop/items${query}`);
  }

  async purchaseItem(itemId: string): Promise<{ success: boolean; newBalance: number; inventory: string[]; message: string }> {
    return this.request<{ success: boolean; newBalance: number; inventory: string[]; message: string }>('/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId })
    });
  }

  async equipItem(itemId: string, equip: boolean): Promise<{ equippedItemIds: string[] }> {
    return this.request<{ equippedItemIds: string[] }>('/inventory/equip', {
      method: 'POST',
      body: JSON.stringify({ itemId, equip })
    });
  }

  async getRewardsStatus(): Promise<{ eligible: boolean; currentStreak: number; potentialReward: number; cooldownRemainingMs: number; coinsBalance: number }> {
    return this.request<{ eligible: boolean; currentStreak: number; potentialReward: number; cooldownRemainingMs: number; coinsBalance: number }>('/rewards/status');
  }

  async claimDailyReward(): Promise<{ success: boolean; rewardAwarded: number; newStreak: number; newBalance: number; message: string }> {
    return this.request<{ success: boolean; rewardAwarded: number; newStreak: number; newBalance: number; message: string }>('/rewards/claim', {
      method: 'POST'
    });
  }

  // --- Lobby ---
  async getLobbyRooms(): Promise<{ rooms: LobbyRoom[] }> {
    return this.request<{ rooms: LobbyRoom[] }>('/lobby/rooms');
  }

  // --- Reports ---
  async submitReport(data: { targetType: string; targetId: string; reason: string; details?: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/reports/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Super Admin Endpoints ---
  async getAdminMetrics(): Promise<{ metrics: any }> {
    return this.request<{ metrics: any }>('/admin/metrics');
  }

  async getAdminUsers(): Promise<{ users: UserProfile[] }> {
    return this.request<{ users: UserProfile[] }>('/admin/users');
  }

  async updateAdminUserRole(userId: string, newRole: string, reason?: string): Promise<{ user: UserProfile; message: string }> {
    return this.request<{ user: UserProfile; message: string }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ newRole, reason })
    });
  }

  async toggleAdminUserBan(userId: string, banned: boolean, reason?: string): Promise<{ user: UserProfile; message: string }> {
    return this.request<{ user: UserProfile; message: string }>(`/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ banned, reason })
    });
  }

  async grantAdminCoins(userId: string, amount: number, reason?: string): Promise<{ user: UserProfile; message: string }> {
    return this.request<{ user: UserProfile; message: string }>(`/admin/users/${userId}/coins`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    });
  }

  async getAdminReports(): Promise<{ reports: ReportItem[] }> {
    return this.request<{ reports: ReportItem[] }>('/admin/reports');
  }

  async resolveAdminReport(reportId: string, status: string, moderationNotes?: string): Promise<{ report: ReportItem; message: string }> {
    return this.request<{ report: ReportItem; message: string }>(`/admin/reports/${reportId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ status, moderationNotes })
    });
  }

  async inspectChatAudit(conversationId: string, auditReason: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    return this.request<{ conversation: Conversation; messages: Message[] }>('/admin/chat-audit', {
      method: 'POST',
      body: JSON.stringify({ conversationId, auditReason })
    });
  }

  async createAdminShopItem(itemData: Partial<ShopItem>): Promise<{ item: ShopItem; message: string }> {
    return this.request<{ item: ShopItem; message: string }>('/admin/shop/items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  }

  async deleteAdminShopItem(itemId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/shop/items/${itemId}`, {
      method: 'DELETE'
    });
  }

  async updateAdminConfig(config: Partial<PlatformConfig>): Promise<{ config: PlatformConfig; message: string }> {
    return this.request<{ config: PlatformConfig; message: string }>('/admin/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async getAdminAuditLogs(): Promise<{ auditLogs: AdminAuditLog[] }> {
    return this.request<{ auditLogs: AdminAuditLog[] }>('/admin/audit-logs');
  }

  // --- AvatarEngine & Guided Mixamo Rigging Pipeline ---
  async getAvatarEngineJobs(): Promise<{ jobs: ModelProcessingJob[] }> {
    return this.request<{ jobs: ModelProcessingJob[] }>('/admin/avatar-engine/jobs');
  }

  async getAvatarEngineJob(jobId: string): Promise<{ job: ModelProcessingJob }> {
    return this.request<{ job: ModelProcessingJob }>(`/admin/avatar-engine/jobs/${jobId}`);
  }

  async uploadAvatarModel(data: {
    fileName: string;
    fileSizeBytes?: number;
    fileBase64?: string;
    format?: string;
    isSample?: boolean;
    sampleId?: string;
  }): Promise<{ job: ModelProcessingJob; validation: any; message: string }> {
    return this.request<{ job: ModelProcessingJob; validation: any; message: string }>('/admin/avatar-engine/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAvatarEngineLandmarks(
    jobId: string,
    landmarks: Record<string, { x: number; y: number; z: number }>
  ): Promise<{ job: ModelProcessingJob; message: string }> {
    return this.request<{ job: ModelProcessingJob; message: string }>(`/admin/avatar-engine/jobs/${jobId}/landmarks`, {
      method: 'POST',
      body: JSON.stringify({ landmarks })
    });
  }

  async startAvatarEnginePipeline(
    jobId: string,
    landmarks?: Record<string, { x: number; y: number; z: number }>
  ): Promise<{ job: ModelProcessingJob; message: string }> {
    return this.request<{ job: ModelProcessingJob; message: string }>(`/admin/avatar-engine/jobs/${jobId}/pipeline`, {
      method: 'POST',
      body: JSON.stringify({ landmarks })
    });
  }

  async approveAvatarEngineJob(
    jobId: string,
    itemData?: { name?: string; price?: number; category?: string }
  ): Promise<{ job: ModelProcessingJob; shopItem: ShopItem; message: string }> {
    return this.request<{ job: ModelProcessingJob; shopItem: ShopItem; message: string }>(`/admin/avatar-engine/jobs/${jobId}/approve`, {
      method: 'POST',
      body: JSON.stringify(itemData || {})
    });
  }
}

export const api = new ApiClient();
