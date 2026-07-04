import {
  ref as dbRef,
  child,
  get,
  set,
  update,
  remove,
  query as dbQuery,
  orderByChild,
  equalTo,
  limitToFirst,
  limitToLast
} from 'firebase/database';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  signInAnonymously,
  signInWithPopup,
  signOut,
  GoogleAuthProvider
} from 'firebase/auth';
import { db, storage, auth, googleProvider } from './firebase.js';
import { User, FileRecord, Template } from './types.js';

// Constant for the 3GB storage limit in bytes
export const MAX_STORAGE_BYTES = 3 * 1024 * 1024 * 1024; // 3,221,225,472 bytes

const usersRef = () => dbRef(db, 'users');
const userRefById = (uid: string) => dbRef(db, `users/${uid}`);
const filesRef = () => dbRef(db, 'files');
const fileRefById = (fileId: string) => dbRef(db, `files/${fileId}`);
const templatesRef = () => dbRef(db, 'templates');
const templateRefById = (templateId: string) => dbRef(db, `templates/${templateId}`);

const snapshotToArray = <T>(snapshot: any): T[] => {
  const value = snapshot.val();
  if (!value) return [];
  return Object.entries(value).map(([key, item]) => ({ id: key, ...(item as object) } as T));
};

const snapshotToValue = <T>(snapshot: any): T | null => {
  if (!snapshot.exists()) return null;
  return snapshot.val() as T;
};

const OperationType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
} as const;

const handleDatabaseError = (error: unknown, operation: string, path: string) => {
  console.error(`${operation} failed at ${path}`, error);
};

export const api = {
  // Check if a user is currently flagged/restricted (5-minute lock)
  isUserFlagged(user: User | null): { flagged: boolean; remainingSeconds: number } {
    if (!user || !user.flaggedAt) return { flagged: false, remainingSeconds: 0 };

    const flaggedTime = new Date(user.flaggedAt).getTime();
    const currentTime = Date.now();
    const diffMs = currentTime - flaggedTime;
    const fiveMinutesMs = 5 * 60 * 1000;

    if (diffMs < fiveMinutesMs) {
      const remaining = Math.ceil((fiveMinutesMs - diffMs) / 1000);
      return { flagged: true, remainingSeconds: remaining };
    }

    return { flagged: false, remainingSeconds: 0 };
  },

  // Get currently authenticated user and synchronize with Realtime Database
  async getMe(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userSnap = await get(userRefById(firebaseUser.uid));
      if (!userSnap.exists()) {
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Creator',
          email: firebaseUser.email || `${firebaseUser.uid.substring(0, 8)}@goshare.lol`,
          avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
          provider: firebaseUser.isAnonymous ? 'sandbox' : 'google',
          username: null,
          views: 0,
          flagCount: 0,
          flaggedAt: null,
          banned: false,
          bio: 'A digital creator sharing high quality assets.',
          themeId: 'solid',
          backgroundMusicUrl: '',
          twitterUrl: '',
          instagramUrl: '',
          githubUrl: '',
          storageUsed: 0,
          createdAt: new Date().toISOString()
        };

        await set(userRefById(firebaseUser.uid), newUser);
        return newUser;
      }

      const userData = userSnap.val() as User;
      if (userData.banned) {
        await signOut(auth);
        throw new Error('This account has been banned due to repeated suspicious uploads.');
      }

      return userData;
    } catch (err) {
      console.error('getMe error', err);
      return null;
    }
  },

  // Perform Google Sign-In with Popup
  async signInWithGoogle(): Promise<User | null> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userSnap = await get(userRefById(firebaseUser.uid));
      let currentUser: User;

      if (!userSnap.exists()) {
        currentUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Google Creator',
          email: firebaseUser.email || '',
          avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
          provider: 'google',
          username: null,
          views: 0,
          flagCount: 0,
          flaggedAt: null,
          banned: false,
          bio: 'A digital creator sharing high quality assets.',
          themeId: 'solid',
          backgroundMusicUrl: '',
          twitterUrl: '',
          instagramUrl: '',
          githubUrl: '',
          storageUsed: 0,
          createdAt: new Date().toISOString()
        };

        await set(userRefById(firebaseUser.uid), currentUser);
      } else {
        currentUser = userSnap.val() as User;
        if (currentUser.banned) {
          await signOut(auth);
          throw new Error('This account has been banned due to repeated suspicious uploads.');
        }
      }

      return currentUser;
    } catch (err) {
      console.error('signInWithGoogle error', err);
      throw err;
    }
  },

  // Perform Sandbox Demo Sign-In
  async signInSandbox(customName: string, customEmail: string): Promise<User | null> {
    try {
      const result = await signInAnonymously(auth);
      const firebaseUser = result.user;

      const currentUser: User = {
        id: firebaseUser.uid,
        name: customName || 'Sandbox Creator',
        email: customEmail || `${firebaseUser.uid.substring(0, 8)}@sandbox.goshare.lol`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
        provider: 'sandbox',
        username: null,
        views: 0,
        flagCount: 0,
        flaggedAt: null,
        banned: false,
        bio: 'A digital creator sharing high quality assets.',
        themeId: 'solid',
        backgroundMusicUrl: '',
        twitterUrl: '',
        instagramUrl: '',
        githubUrl: '',
        storageUsed: 0,
        createdAt: new Date().toISOString()
      };

      await set(userRefById(firebaseUser.uid), currentUser);
      return currentUser;
    } catch (err) {
      console.error('signInSandbox error', err);
      throw err;
    }
  },

  // Log the current user out
  async logout() {
    await signOut(auth);
  },

  // Claim a unique creator username
  async claimUsername(username: string): Promise<{ user?: User; error?: string }> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return { error: 'You must be signed in to claim a username.' };

      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      if (!cleanUsername) return { error: 'Username must contain valid letters or numbers.' };

      const q = dbQuery(usersRef(), orderByChild('username'), equalTo(cleanUsername));
      const querySnap = await get(q);
      if (querySnap.exists()) {
        const users = querySnap.val();
        const entry = Object.entries(users)[0] as [string, any];
        const [existingId] = entry;
        if (existingId !== firebaseUser.uid) {
          return { error: 'Username is already taken by another creator!' };
        }
      }

      await update(userRefById(firebaseUser.uid), { username: cleanUsername });
      const updatedSnap = await get(userRefById(firebaseUser.uid));
      return { user: updatedSnap.val() as User };
    } catch (err) {
      return { error: 'Failed to claim username. Please try again.' };
    }
  },

  // Update complete profile settings (e.g. bios, template, social links, background music)
  async updateProfileSettings(updates: Partial<User>): Promise<User> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated');

    try {
      await update(userRefById(firebaseUser.uid), updates);
      const userSnap = await get(userRefById(firebaseUser.uid));
      return userSnap.val() as User;
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      throw err;
    }
  },

  async incrementProfileViews(username: string) {
    try {
      const q = dbQuery(usersRef(), orderByChild('username'), equalTo(username.trim().toLowerCase()));
      const snap = await get(q);
      if (snap.exists()) {
        const users = snap.val();
        const [creatorId, creatorData] = Object.entries(users)[0] as [string, any];
        await update(userRefById(creatorId), { views: (creatorData.views || 0) + 1 });
      }
    } catch (err) {
      console.error('Failed to increment views', err);
    }
  },

  // Get list of top creators based on overall view count
  async getTopCreators(limitCount = 5): Promise<User[]> {
    try {
      const snap = await get(usersRef());
      const creators = snapshotToArray<User>(snap).filter(c => c.username && !c.banned);
      return creators.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, limitCount);
    } catch (err) {
      console.error('getTopCreators error', err);
      return [];
    }
  },

  // Get list of public uploads (with support for best performing/most viewed files)
  async getPublicUploads(): Promise<FileRecord[]> {
    try {
      const q = dbQuery(filesRef(), orderByChild('isPublic'), equalTo(true));
      const snap = await get(q);
      const uploads = snapshotToArray<FileRecord>(snap);
      return uploads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error('getPublicUploads error', err);
      return [];
    }
  },

  // Get list of best performing/most downloaded public uploads
  async getTopPerformingFiles(limitCount = 6): Promise<FileRecord[]> {
    try {
      const q = dbQuery(filesRef(), orderByChild('downloads'), limitToLast(limitCount));
      const snap = await get(q);
      const uploads = snapshotToArray<FileRecord>(snap).filter(file => file.isPublic);
      return uploads.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } catch (err) {
      console.error('getTopPerformingFiles error', err);
      return [];
    }
  },

  // Get list of files uploaded by the current user
  async getUserFiles(): Promise<FileRecord[]> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return [];

    try {
      const q = dbQuery(filesRef(), orderByChild('userId'), equalTo(firebaseUser.uid));
      const snap = await get(q);
      const uploads = snapshotToArray<FileRecord>(snap);
      return uploads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error('getUserFiles error', err);
      return [];
    }
  },

  // Get a creator profile and their files by username
  async getCreatorByUsername(username: string): Promise<{ creator: User | null; files: FileRecord[] }> {
    try {
      const q = dbQuery(usersRef(), orderByChild('username'), equalTo(username.trim().toLowerCase()));
      const snap = await get(q);
      if (!snap.exists()) {
        return { creator: null, files: [] };
      }

      const [creatorId, creatorData] = Object.entries(snap.val())[0] as [string, any];
      const creator = { id: creatorId, ...(creatorData as object) } as User;

      const filesQuery = dbQuery(filesRef(), orderByChild('userId'), equalTo(creator.id));
      const filesSnap = await get(filesQuery);
      const files = snapshotToArray<FileRecord>(filesSnap)
        .filter(file => file.isPublic)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return { creator, files };
    } catch (err) {
      console.error('getCreatorByUsername error', err);
      return { creator: null, files: [] };
    }
  },

  // Upload file to Firebase Storage and write metadata to Realtime Database
  async uploadFile(file: File, isPublic: boolean): Promise<FileRecord> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated.');

    const userSnap = await get(userRefById(firebaseUser.uid));
    if (!userSnap.exists()) throw new Error('User profile not found.');

    const userData = userSnap.val() as User;
    if (userData.banned) {
      throw new Error('Your account has been banned due to repeated policy violations.');
    }

    const { flagged, remainingSeconds } = this.isUserFlagged(userData);
    if (flagged) {
      throw new Error(`Your account is temporarily locked for another ${remainingSeconds} seconds due to suspicious uploads.`);
    }

    const currentStorage = userData.storageUsed || 0;
    if (currentStorage + file.size > MAX_STORAGE_BYTES) {
      throw new Error('Storage limit exceeded! Each creator is limited to 3GB of total storage.');
    }

    const fileNameLower = file.name.toLowerCase();
    const isSuspicious =
      fileNameLower.endsWith('.exe') ||
      fileNameLower.endsWith('.bat') ||
      fileNameLower.endsWith('.sh') ||
      fileNameLower.endsWith('.cmd') ||
      fileNameLower.endsWith('.com') ||
      fileNameLower.endsWith('.vbs') ||
      fileNameLower.includes('virus') ||
      fileNameLower.includes('malware') ||
      fileNameLower.includes('trojan') ||
      fileNameLower.includes('hack') ||
      fileNameLower.includes('exploit') ||
      fileNameLower.includes('suspicious') ||
      fileNameLower.includes('sus');

    if (isSuspicious) {
      const newFlagCount = (userData.flagCount || 0) + 1;
      const shouldBan = newFlagCount >= 3;

      await update(userRefById(firebaseUser.uid), {
        flagCount: newFlagCount,
        flaggedAt: new Date().toISOString(),
        banned: shouldBan
      });

      if (shouldBan) {
        await signOut(auth);
        throw new Error('ALERT: Suspicious file detected! This is your 3rd violation. Your account has been permanently BANNED.');
      } else {
        throw new Error(`ALERT: Suspicious file detected! Your account has been flagged and suspended from downloading or uploading for 5 minutes. (Violation ${newFlagCount}/3)`);
      }
    }

    let fileCategory = 'other';
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) fileCategory = 'image';
    else if (mime.startsWith('audio/')) fileCategory = 'audio';
    else if (mime.startsWith('video/')) fileCategory = 'video';
    else if (fileNameLower.endsWith('.glb') || fileNameLower.endsWith('.gltf') || fileNameLower.endsWith('.fbx') || fileNameLower.endsWith('.obj')) {
      fileCategory = '3d';
    }

    const fileId = Math.random().toString(36).substring(2, 15);
    const storagePath = `uploads/${firebaseUser.uid}/${fileId}_${file.name}`;
    const assetRef = storageRef(storage, storagePath);

    let fileUrl = '';
    try {
      const uploadResult = await uploadBytes(assetRef, file);
      fileUrl = await getDownloadURL(uploadResult.ref);
    } catch (uploadErr) {
      console.error('Storage upload failed', uploadErr);
      throw new Error('Failed to upload file to storage. Please check storage bucket permissions.');
    }

    const newFile: FileRecord = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: fileCategory,
      isPublic,
      objectKey: fileId,
      userId: firebaseUser.uid,
      username: userData.username || 'unclaimed',
      downloads: 0,
      createdAt: new Date().toISOString(),
      fileUrl,
      storagePath,
      likesCount: 0,
      reportsCount: 0,
      reportedBy: [],
      likedBy: []
    };

    try {
      await set(fileRefById(fileId), newFile);
      await update(userRefById(firebaseUser.uid), {
        storageUsed: currentStorage + file.size
      });
    } catch (dbErr) {
      handleDatabaseError(dbErr, OperationType.CREATE, `files/${fileId}`);
      throw dbErr;
    }

    return newFile;
  },

  // Toggle file visibility (Public/Private)
  async updateFileVisibility(fileId: string, isPublic: boolean): Promise<FileRecord> {
    try {
      await update(fileRefById(fileId), { isPublic });
      const snap = await get(fileRefById(fileId));
      return snap.val() as FileRecord;
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `files/${fileId}`);
      throw err;
    }
  },

  // Delete file from Storage and Realtime Database
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const fileSnap = await get(fileRefById(fileId));
      if (!fileSnap.exists()) return false;
      const fileData = fileSnap.val() as FileRecord;

      if (fileData.storagePath) {
        const assetRef = storageRef(storage, fileData.storagePath);
        try {
          await deleteObject(assetRef);
        } catch (storageErr) {
          console.warn('Storage deletion failed or file already missing', storageErr);
        }
      }

      await remove(fileRefById(fileId));

      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const userSnap = await get(userRefById(firebaseUser.uid));
        if (userSnap.exists()) {
          const userData = userSnap.val() as User;
          await update(userRefById(firebaseUser.uid), {
            storageUsed: Math.max(0, (userData.storageUsed || 0) - fileData.size)
          });
        }
      }

      return true;
    } catch (err) {
      handleDatabaseError(err, OperationType.DELETE, `files/${fileId}`);
      throw err;
    }
  },

  // Increment download counter
  async incrementDownloadCount(fileId: string): Promise<number> {
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const userSnap = await get(userRefById(firebaseUser.uid));
        if (userSnap.exists()) {
          const userData = userSnap.val() as User;
          const { flagged, remainingSeconds } = this.isUserFlagged(userData);
          if (flagged) {
            throw new Error(`Your downloads are temporarily restricted for another ${remainingSeconds} seconds due to suspension.`);
          }
        }
      }

      const fileSnap = await get(fileRefById(fileId));
      if (!fileSnap.exists()) throw new Error('File not found');
      const fileData = fileSnap.val() as FileRecord;
      const newCount = (fileData.downloads || 0) + 1;

      await update(fileRefById(fileId), { downloads: newCount });
      return newCount;
    } catch (err) {
      console.error('incrementDownloadCount error', err);
      throw err;
    }
  },

  // Like or unlike a file
  async toggleLikeFile(fileId: string): Promise<{ liked: boolean; likesCount: number }> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('You must be signed in to like files.');

    try {
      const fileSnap = await get(fileRefById(fileId));
      if (!fileSnap.exists()) throw new Error('File not found');
      const file = fileSnap.val() as FileRecord;
      const likedBy = file.likedBy || [];
      const isLiked = likedBy.includes(firebaseUser.uid);
      const updatedList = isLiked ? likedBy.filter(uid => uid !== firebaseUser.uid) : [...likedBy, firebaseUser.uid];
      const likesCount = Math.max(0, (file.likesCount || 0) + (isLiked ? -1 : 1));

      await update(fileRefById(fileId), {
        likedBy: updatedList,
        likesCount
      });

      return { liked: !isLiked, likesCount };
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `files/${fileId}`);
      throw err;
    }
  },

  // Report a file
  async reportFile(fileId: string): Promise<boolean> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('You must be signed in to report files.');

    try {
      const fileSnap = await get(fileRefById(fileId));
      if (!fileSnap.exists()) throw new Error('File not found');
      const file = fileSnap.val() as FileRecord;
      const reportedBy = file.reportedBy || [];
      if (reportedBy.includes(firebaseUser.uid)) {
        throw new Error('You have already reported this file.');
      }

      await update(fileRefById(fileId), {
        reportedBy: [...reportedBy, firebaseUser.uid],
        reportsCount: (file.reportsCount || 0) + 1
      });

      return true;
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `files/${fileId}`);
      throw err;
    }
  },

  // Custom community-posted layout templates
  async getCommunityTemplates(): Promise<Template[]> {
    try {
      const q = dbQuery(templatesRef(), orderByChild('createdAt'), limitToLast(20));
      const snap = await get(q);
      const templates = snapshotToArray<Template>(snap);
      return templates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error('getCommunityTemplates error', err);
      return [];
    }
  },

  // Share/Post a custom template to community list
  async shareTemplate(name: string, themeId: string, bgColor: string): Promise<Template> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated');

    const templateId = Math.random().toString(36).substring(2, 15);
    const newTemplate: Template = {
      id: templateId,
      name,
      themeId,
      bgColor,
      createdBy: firebaseUser.displayName || 'Creator',
      createdAt: new Date().toISOString()
    };

    try {
      await set(templateRefById(templateId), newTemplate);
      return newTemplate;
    } catch (err) {
      handleDatabaseError(err, OperationType.CREATE, `templates/${templateId}`);
      throw err;
    }
  }
};
