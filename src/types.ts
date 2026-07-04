export interface User {
  id: string;
  username: string | null;
  email: string;
  provider: 'google' | 'sandbox' | 'email';
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  
  // Custom creator properties
  views?: number;
  flagCount?: number;
  flaggedAt?: string | null; // ISO string when user was flagged (suspended for 5 mins)
  banned?: boolean;
  bio?: string | null;
  themeId?: string | null; // 'solid' | 'glass' | 'glow' | 'retro'
  backgroundMusicUrl?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  githubUrl?: string | null;
  storageUsed?: number; // bytes used, limit 3,221,225,472 bytes (3GB)
}

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string; // 'audio' | 'image' | 'video' | '3d' | 'other'
  isPublic: boolean;
  objectKey: string; // fallback
  userId: string; // uploader ID
  username: string; // uploader username
  downloads: number;
  createdAt: string;
  
  // New interaction & storage properties
  fileUrl: string; // direct download URL
  storagePath?: string;
  likesCount?: number;
  reportsCount?: number;
  reportedBy?: string[]; // array of user IDs
  likedBy?: string[]; // array of user IDs
}

export interface Template {
  id: string;
  name: string;
  themeId: string;
  bgColor: string;
  createdBy: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}
