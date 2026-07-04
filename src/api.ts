import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  increment, 
  arrayUnion, 
  arrayRemove, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  ref, 
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
import { db, storage, auth, googleProvider, handleFirestoreError, OperationType } from './firebase.js';
import { User, FileRecord, Template } from './types.js';

// Constant for the 3GB storage limit in bytes
export const MAX_STORAGE_BYTES = 3 * 1024 * 1024 * 1024; // 3,221,225,472 bytes

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

  // Get currently authenticated user and synchronize with Firestore
  async getMe(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // If user document doesn't exist, create it
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
          discordUrl: '',
          twitterUrl: '',
          instagramUrl: '',
          githubUrl: '',
          storageUsed: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        return newUser;
      }

      const userData = userSnap.data() as User;
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
      
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
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
          discordUrl: '',
          twitterUrl: '',
          instagramUrl: '',
          githubUrl: '',
          storageUsed: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, currentUser);
      } else {
        currentUser = userSnap.data() as User;
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
      
      const userRef = doc(db, 'users', firebaseUser.uid);
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
        discordUrl: '',
        twitterUrl: '',
        instagramUrl: '',
        githubUrl: '',
        storageUsed: 0,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(userRef, currentUser);
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

      // Query to check if the username is already taken
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        // Double check it's not owned by the current user
        const alreadyOwned = querySnap.docs.some(doc => doc.id === firebaseUser.uid);
        if (!alreadyOwned) {
          return { error: 'Username is already taken by another creator!' };
        }
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, { username: cleanUsername });

      const updatedSnap = await getDoc(userRef);
      return { user: updatedSnap.data() as User };
    } catch (err) {
      return { error: 'Failed to claim username. Please try again.' };
    }
  },

  // Update complete profile settings (e.g. bios, template, social links, background music)
  async updateProfileSettings(updates: Partial<User>): Promise<User> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated');

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, updates);
      const userSnap = await getDoc(userRef);
      return userSnap.data() as User;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      throw err;
    }
  },

  // Increment profile view count
  async incrementProfileViews(username: string) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const creatorDoc = snap.docs[0];
        await updateDoc(doc(db, 'users', creatorDoc.id), {
          views: increment(1)
        });
      }
    } catch (err) {
      console.error('Failed to increment views', err);
    }
  },

  // Get list of top creators based on overall view count
  async getTopCreators(limitCount = 5): Promise<User[]> {
    try {
      const q = query(
        collection(db, 'users'), 
        where('username', '!=', null),
        orderBy('username'),
        limit(100)
      );
      const querySnap = await getDocs(q);
      const creators = querySnap.docs.map(d => d.data() as User);
      // Sort in-memory by views since Firestore requires complex indexes for != null and orderBy views
      return creators
        .filter(c => c.username && !c.banned)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, limitCount);
    } catch (err) {
      console.error('getTopCreators error', err);
      return [];
    }
  },

  // Get list of public uploads (with support for best performing/most viewed files)
  async getPublicUploads(): Promise<FileRecord[]> {
    try {
      const q = query(collection(db, 'files'), where('isPublic', '==', true), orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      return querySnap.docs.map(doc => doc.data() as FileRecord);
    } catch (err) {
      console.error('getPublicUploads error', err);
      return [];
    }
  },

  // Get list of best performing/most downloaded public uploads
  async getTopPerformingFiles(limitCount = 6): Promise<FileRecord[]> {
    try {
      const q = query(
        collection(db, 'files'), 
        where('isPublic', '==', true), 
        orderBy('downloads', 'desc'), 
        limit(limitCount)
      );
      const querySnap = await getDocs(q);
      return querySnap.docs.map(doc => doc.data() as FileRecord);
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
      const q = query(collection(db, 'files'), where('userId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      return querySnap.docs.map(doc => doc.data() as FileRecord);
    } catch (err) {
      console.error('getUserFiles error', err);
      return [];
    }
  },

  // Get a creator profile and their files by username
  async getCreatorByUsername(username: string): Promise<{ creator: User | null; files: FileRecord[] }> {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        return { creator: null, files: [] };
      }
      const creator = snap.docs[0].data() as User;
      
      const filesQ = query(
        collection(db, 'files'), 
        where('userId', '==', creator.id), 
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );
      const filesSnap = await getDocs(filesQ);
      const files = filesSnap.docs.map(d => d.data() as FileRecord);
      
      return { creator, files };
    } catch (err) {
      console.error('getCreatorByUsername error', err);
      return { creator: null, files: [] };
    }
  },

  // Upload file to Firebase Storage and write metadata to Firestore
  async uploadFile(file: File, isPublic: boolean): Promise<FileRecord> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated.');

    // 1. Check if user is banned
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User profile not found.');
    const userData = userSnap.data() as User;
    if (userData.banned) {
      throw new Error('Your account has been banned due to repeated policy violations.');
    }

    // 2. Check if user is temporarily flagged/restricted (5-minute lock)
    const { flagged, remainingSeconds } = this.isUserFlagged(userData);
    if (flagged) {
      throw new Error(`Your account is temporarily locked for another ${remainingSeconds} seconds due to suspicious uploads.`);
    }

    // 3. Check 3GB storage limit
    const currentStorage = userData.storageUsed || 0;
    if (currentStorage + file.size > MAX_STORAGE_BYTES) {
      throw new Error('Storage limit exceeded! Each creator is limited to 3GB of total storage.');
    }

    // 4. Check for suspicious files (automatic policy screening)
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
      
      await updateDoc(userRef, {
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

    // 5. Categorize the file type
    let fileCategory = 'other';
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) fileCategory = 'image';
    else if (mime.startsWith('audio/')) fileCategory = 'audio';
    else if (mime.startsWith('video/')) fileCategory = 'video';
    else if (fileNameLower.endsWith('.glb') || fileNameLower.endsWith('.gltf') || fileNameLower.endsWith('.fbx') || fileNameLower.endsWith('.obj')) {
      fileCategory = '3d';
    }

    // 6. Upload file to Firebase Storage
    const fileId = Math.random().toString(36).substring(2, 15);
    const storagePath = `uploads/${firebaseUser.uid}/${fileId}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    let fileUrl = '';
    try {
      const uploadResult = await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(uploadResult.ref);
    } catch (uploadErr) {
      console.error('Storage upload failed', uploadErr);
      throw new Error('Failed to upload file to storage. Please check storage bucket permissions.');
    }

    // 7. Write record to Firestore
    const newFile: FileRecord = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: fileCategory,
      isPublic: isPublic,
      objectKey: fileId, // backwards compatibility
      userId: firebaseUser.uid,
      username: userData.username || 'unclaimed',
      downloads: 0,
      createdAt: new Date().toISOString(),
      fileUrl: fileUrl,
      storagePath: storagePath,
      likesCount: 0,
      reportsCount: 0,
      reportedBy: [],
      likedBy: []
    };

    try {
      await setDoc(doc(db, 'files', fileId), newFile);
      
      // Update creator storageUsed metrics
      await updateDoc(userRef, {
        storageUsed: increment(file.size)
      });
    } catch (dbErr) {
      handleFirestoreError(dbErr, OperationType.CREATE, `files/${fileId}`);
    }

    return newFile;
  },

  // Toggle file visibility (Public/Private)
  async updateFileVisibility(fileId: string, isPublic: boolean): Promise<FileRecord> {
    try {
      const fileRef = doc(db, 'files', fileId);
      await updateDoc(fileRef, { isPublic });
      const snap = await getDoc(fileRef);
      return snap.data() as FileRecord;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
      throw err;
    }
  },

  // Delete file from Storage and Firestore
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const fileRef = doc(db, 'files', fileId);
      const fileSnap = await getDoc(fileRef);
      if (!fileSnap.exists()) return false;
      const fileData = fileSnap.data() as FileRecord;

      // 1. Delete from Storage
      if (fileData.storagePath) {
        const storageRef = ref(storage, fileData.storagePath);
        try {
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Storage deletion failed or file already missing', storageErr);
        }
      }

      // 2. Delete document from Firestore
      await deleteDoc(fileRef);

      // 3. Subtract from creator's storageUsed metrics
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userRef, {
          storageUsed: increment(-fileData.size)
        });
      }

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `files/${fileId}`);
      throw err;
    }
  },

  // Increment download counter
  async incrementDownloadCount(fileId: string): Promise<number> {
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          const { flagged, remainingSeconds } = this.isUserFlagged(userData);
          if (flagged) {
            throw new Error(`Your downloads are temporarily restricted for another ${remainingSeconds} seconds due to suspension.`);
          }
        }
      }

      const fileRef = doc(db, 'files', fileId);
      await updateDoc(fileRef, {
        downloads: increment(1)
      });
      const snap = await getDoc(fileRef);
      return (snap.data() as FileRecord).downloads;
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
      const fileRef = doc(db, 'files', fileId);
      const snap = await getDoc(fileRef);
      if (!snap.exists()) throw new Error('File not found');
      
      const file = snap.data() as FileRecord;
      const likedBy = file.likedBy || [];
      const isLiked = likedBy.includes(firebaseUser.uid);

      if (isLiked) {
        await updateDoc(fileRef, {
          likedBy: arrayRemove(firebaseUser.uid),
          likesCount: increment(-1)
        });
        return { liked: false, likesCount: Math.max(0, (file.likesCount || 0) - 1) };
      } else {
        await updateDoc(fileRef, {
          likedBy: arrayUnion(firebaseUser.uid),
          likesCount: increment(1)
        });
        return { liked: true, likesCount: (file.likesCount || 0) + 1 };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
      throw err;
    }
  },

  // Report a file
  async reportFile(fileId: string): Promise<boolean> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('You must be signed in to report files.');

    try {
      const fileRef = doc(db, 'files', fileId);
      const snap = await getDoc(fileRef);
      if (!snap.exists()) throw new Error('File not found');
      
      const file = snap.data() as FileRecord;
      const reportedBy = file.reportedBy || [];
      if (reportedBy.includes(firebaseUser.uid)) {
        throw new Error('You have already reported this file.');
      }

      await updateDoc(fileRef, {
        reportedBy: arrayUnion(firebaseUser.uid),
        reportsCount: increment(1)
      });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
      throw err;
    }
  },

  // Custom community-posted layout templates
  async getCommunityTemplates(): Promise<Template[]> {
    try {
      const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'), limit(20));
      const querySnap = await getDocs(q);
      return querySnap.docs.map(doc => doc.data() as Template);
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
      name: name,
      themeId: themeId,
      bgColor: bgColor,
      createdBy: firebaseUser.displayName || 'Creator',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'templates', templateId), newTemplate);
      return newTemplate;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `templates/${templateId}`);
      throw err;
    }
  }
};
