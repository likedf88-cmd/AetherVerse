/**
 * AetherVerse Unified Type Definitions
 */

export type UserRole = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  role: UserRole;
  isVerified: boolean;
  isBanned?: boolean;
  followersCount: number;
  followingCount: number;
  totalLikesCount: number;
  coins: number;
  onlineStatus: 'online' | 'idle' | 'offline';
  lastActive: string;
  avatarConfig: AvatarConfig;
  inventoryItemIds: string[];
  equippedItemIds: string[];
  equippedEmoteWheelIds?: string[];
}

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  faceStyle?: string;
  eyeColor?: string;
  outfit: string;
  outfitColor: string;
  pantsColor?: string;
  shoeStyle?: string;
  hatStyle?: string;
  backAccessory?: string;
  visorStyle: string;
  visorColor: string;
  glowColor: string;
  bodyProportion?: number; // scale multiplier 0.8 to 1.2
  modelUrl?: string; // Custom uploaded or auto-rigged GLB/GLTF model
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userAvatar: string;
  isVerified: boolean;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption: string;
  hashtags: string[];
  location?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  category: 'foryou' | 'following' | 'trending' | 'latest';
}

export interface ShortVideo {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userAvatar: string;
  isVerified: boolean;
  videoUrl: string;
  posterUrl: string;
  description: string;
  hashtags: string[];
  musicTrackTitle: string;
  musicArtist: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewers: { userId: string; username: string; userAvatar: string; viewedAt: string }[];
  isCloseFriendsOnly?: boolean;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  createdAt: string;
  expiresAt?: string; // For disappearing messages
  readBy: string[];
  reactions: MessageReaction[];
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  title?: string;
  participantIds: string[];
  participants: UserProfile[];
  lastMessage?: Message;
  updatedAt: string;
  disappearingTimerSeconds: number; // 0 = off, 30, 300, 3600, 86400
}

export type ShopCategory =
  | 'avatar'
  | 'skin'
  | 'clothing'
  | 'accessories'
  | 'emote'
  | 'music'
  | 'theme'
  | 'effect';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  price: number;
  thumbnailUrl: string;
  modelUrl?: string;
  isFeatured?: boolean;
  isLimited?: boolean;
  isPublished: boolean;
  itemAttributes?: Record<string, string | number>;
  createdAt: string;
}

export type EmoteRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'exclusive';

export type EmoteCategory =
  | 'dances'
  | 'celebrations'
  | 'funny'
  | 'reactions'
  | 'greetings'
  | 'victory'
  | 'relaxed'
  | 'special'
  | 'seasonal'
  | 'premium';

export interface EmoteItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionCode: string;
  category: EmoteCategory;
  rarity: EmoteRarity;
  price: number;
  isUnlocked: boolean;
  isLooping: boolean;
  durationSeconds: number;
  soundName?: string;
  bpm?: number;
  isGroupEmote?: boolean;
}

export type ModelRiggingStatus =
  | 'uploaded'
  | 'analyzing'
  | 'rigging'
  | 'skin_weighting'
  | 'retargeting'
  | 'generating_previews'
  | 'testing_animations'
  | 'ready_for_approval'
  | 'published'
  | 'failed';

export interface MixamoLandmark {
  name: 'chin' | 'leftWrist' | 'rightWrist' | 'leftElbow' | 'rightElbow' | 'leftKnee' | 'rightKnee' | 'groin';
  label: string;
  position: { x: number; y: number; z: number };
  confirmed: boolean;
}

export interface MixamoWorkflowConfig {
  symmetry: boolean;
  skeletonResolution: 'standard_20' | 'full_fingers_65' | 'three_finger_45';
  landmarks: Record<string, { x: number; y: number; z: number }>;
}

export interface ModelProcessingJob {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  status: ModelRiggingStatus;
  progressPercent: number;
  meshCount: number;
  materialCount: number;
  textureCount: number;
  hasSkeleton: boolean;
  boneCount: number;
  detectedBones: string[];
  animationCount: number;
  riggingMethod: 'existing_skeleton' | 'auto_humanoid_weights' | 'mixamo_guided';
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string | null;
  logs: string[];
  createdAt: string;
  mixamoConfig?: MixamoWorkflowConfig;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  audioUrl: string;
  duration: number;
  genre: string;
  price: number;
}

export interface LobbyPlayer {
  id: string;
  username: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  position: { x: number; y: number; z: number };
  rotationY: number;
  isMoving: boolean;
  isRunning: boolean;
  isJumping: boolean;
  currentEmote: string | null;
  lastChatBubble?: { text: string; timestamp: number };
  role: UserRole;
}

export interface LobbyRoom {
  id: string;
  name: string;
  theme: 'cyber_plaza' | 'neon_club' | 'zen_garden' | 'sky_tower';
  maxPlayers: number;
  currentPlayersCount: number;
  activeMusicTrack: MusicTrack;
  description: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'reward' | 'system' | 'mention';
  actorUsername?: string;
  actorAvatar?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: 'post' | 'video' | 'comment' | 'profile' | 'conversation';
  targetId: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedBy?: string;
  moderationNotes?: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  reason?: string;
  timestamp: string;
}

export interface PlatformConfig {
  maintenanceMode: boolean;
  globalAnnouncement: string | null;
  maxUploadSizeMB: number;
  allowNewRegistrations: boolean;
  allowCustom3DModelUpload: boolean;
}
