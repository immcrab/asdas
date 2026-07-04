import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, FileRecord, Session } from '../src/types.js';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  users: User[];
  files: FileRecord[];
  sessions: Session[];
}

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    const defaultDb: DatabaseSchema = { users: [], files: [], sessions: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
    return defaultDb;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, creating a fresh one', err);
    const defaultDb: DatabaseSchema = { users: [], files: [], sessions: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
    return defaultDb;
  }
}

// Global in-memory cache synchronized with the JSON file
let db: DatabaseSchema = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database to disk', err);
  }
}

export const dbManager = {
  // --- USERS ---
  getUserById(id: string): User | null {
    return db.users.find((u) => u.id === id) || null;
  },

  getUserByUsername(username: string): User | null {
    const cleanUsername = username.toLowerCase().trim();
    return db.users.find((u) => u.username?.toLowerCase() === cleanUsername) || null;
  },

  getUserByEmailAndProvider(email: string, provider: 'google' | 'discord' | 'sandbox'): User | null {
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.provider === provider) || null;
  },

  createUser(user: Omit<User, 'createdAt'>): User {
    const newUser: User = {
      ...user,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb();
    return newUser;
  },

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
    const userIndex = db.users.findIndex((u) => u.id === id);
    if (userIndex === -1) return null;

    db.users[userIndex] = {
      ...db.users[userIndex],
      ...updates,
    };
    saveDb();
    
    // Also sync the username inside FileRecords if username changed
    if (updates.username) {
      db.files = db.files.map((file) => {
        if (file.userId === id) {
          return { ...file, username: updates.username! };
        }
        return file;
      });
      saveDb();
    }

    return db.users[userIndex];
  },

  // --- FILES ---
  getFileById(id: string): FileRecord | null {
    return db.files.find((f) => f.id === id) || null;
  },

  createFile(file: Omit<FileRecord, 'id' | 'createdAt' | 'downloads'>): FileRecord {
    const newFile: FileRecord = {
      ...file,
      id: crypto.randomUUID(),
      downloads: 0,
      createdAt: new Date().toISOString(),
    };
    db.files.push(newFile);
    saveDb();
    return newFile;
  },

  updateFile(id: string, updates: Partial<Pick<FileRecord, 'name' | 'isPublic' | 'downloads'>>): FileRecord | null {
    const index = db.files.findIndex((f) => f.id === id);
    if (index === -1) return null;

    db.files[index] = {
      ...db.files[index],
      ...updates,
    };
    saveDb();
    return db.files[index];
  },

  deleteFile(id: string): boolean {
    const index = db.files.findIndex((f) => f.id === id);
    if (index === -1) return false;

    const file = db.files[index];
    db.files.splice(index, 1);
    saveDb();

    // Attempt to delete physical file from storage
    const filePath = path.join(process.cwd(), 'uploads', file.objectKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete file from disk:', filePath, err);
      }
    }
    return true;
  },

  getUserFiles(userId: string): FileRecord[] {
    return db.files.filter((f) => f.userId === userId);
  },

  getPublicUserFiles(username: string): FileRecord[] {
    const cleanUsername = username.toLowerCase().trim();
    return db.files.filter((f) => f.username.toLowerCase() === cleanUsername && f.isPublic);
  },

  // --- SESSIONS ---
  createSession(userId: string): Session {
    // Clean old sessions for this user to avoid clutter
    db.sessions = db.sessions.filter((s) => s.userId !== userId);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    
    const newSession: Session = {
      token,
      userId,
      expiresAt,
    };
    
    db.sessions.push(newSession);
    saveDb();
    return newSession;
  },

  getSession(token: string): Session | null {
    const session = db.sessions.find((s) => s.token === token) || null;
    if (!session) return null;

    // Check if session has expired
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveDb();
      return null;
    }
    return session;
  },

  deleteSession(token: string): void {
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDb();
  }
};
