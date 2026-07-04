import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import crypto from 'crypto';
import { dbManager } from './server/db.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate a unique file name to avoid collisions
    const ext = path.extname(file.originalname);
    const uniqueName = crypto.randomUUID() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // Limit: 100MB
});

// Helper: Get user from authorization header
function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const session = dbManager.getSession(token);
  if (!session) return null;
  return dbManager.getUserById(session.userId);
}

// Helper: Get base Redirect URI for OAuth
function getRedirectUri(req: express.Request) {
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  return `${appUrl.replace(/\/$/, '')}/api/auth/callback`;
}

// --- AUTHENTICATION ENDPOINTS ---

// GET /api/auth/url
app.get('/api/auth/url', (req, res) => {
  const provider = req.query.provider as string;
  const redirectUri = getRedirectUri(req);
  
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Credentials not set, fallback to sandbox mode
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      return res.json({ url: `${appUrl.replace(/\/$/, '')}/auth/sandbox?provider=google` });
    }
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: 'google'
    }).toString();
    return res.json({ url: authUrl });
  } else if (provider === 'discord') {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      // Credentials not set, fallback to sandbox mode
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      return res.json({ url: `${appUrl.replace(/\/$/, '')}/auth/sandbox?provider=discord` });
    }
    const authUrl = `https://discord.com/api/oauth2/authorize?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email',
      state: 'discord'
    }).toString();
    return res.json({ url: authUrl });
  }

  return res.status(400).json({ error: 'Invalid provider specified' });
});

// GET /auth/sandbox - Developer sign-in screen
app.get('/auth/sandbox', (req, res) => {
  const provider = (req.query.provider as string) || 'google';
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
  const accentColor = '#3b82f6'; // Blue-500
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Developer Sandbox Login - ${providerLabel}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                bgDeep: '#020617',
                surface: '#0f172a',
                accent: '#3b82f6',
                accentHover: '#60a5fa'
              }
            }
          }
        }
      </script>
    </head>
    <body class="bg-bgDeep text-white min-h-screen flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-surface border border-white/[0.06] rounded-3xl p-8 shadow-2xl">
        <div class="text-center mb-6">
          <div class="inline-flex size-14 items-center justify-center bg-accent/10 text-accent rounded-2xl mb-4">
            <svg class="size-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">Sandbox Sign In: ${providerLabel}</h1>
          <p class="text-gray-400 text-sm mt-2">
            No <strong>${providerLabel} Client ID</strong> detected in .env. Example mode enabled for instant sandbox testing!
          </p>
        </div>

        <form action="/api/auth/sandbox/callback" method="POST" class="space-y-4">
          <input type="hidden" name="provider" value="${provider}">
          
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Simulate Profile</label>
            <select name="preset" id="presetSelect" class="w-full bg-bgDeep border border-white/[0.08] rounded-xl px-4 py-3 outline-none focus:border-accent">
              <option value="custom">-- Custom Profile --</option>
              <option value="alex">Alex Mercer (alex@example.com)</option>
              <option value="sarah">Sarah Connor (sarah@example.com)</option>
              <option value="gamer">Gamer123 (gamer123@discord.gg)</option>
            </select>
          </div>

          <div id="customFields" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
              <input type="text" name="name" id="fullName" value="John Doe" required class="w-full bg-bgDeep border border-white/[0.08] rounded-xl px-4 py-3 outline-none focus:border-accent">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
              <input type="email" name="email" id="email" value="john@example.com" required class="w-full bg-bgDeep border border-white/[0.08] rounded-xl px-4 py-3 outline-none focus:border-accent">
            </div>
          </div>

          <button type="submit" class="w-full bg-accent text-white py-3.5 rounded-xl font-bold tracking-wide hover:bg-accentHover transition-colors shadow-lg shadow-accent/20">
            Sign In with Sandbox
          </button>
        </form>
      </div>

      <script>
        const select = document.getElementById('presetSelect');
        const customFields = document.getElementById('customFields');
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');

        const presets = {
          custom: { name: 'John Doe', email: 'john@example.com' },
          alex: { name: 'Alex Mercer', email: 'alex@example.com' },
          sarah: { name: 'Sarah Connor', email: 'sarah@example.com' },
          gamer: { name: 'Gamer123', email: 'gamer123@discord.gg' }
        };

        select.addEventListener('change', (e) => {
          const val = e.target.value;
          fullNameInput.value = presets[val].name;
          emailInput.value = presets[val].email;
          
          if (val === 'custom') {
            customFields.style.opacity = '1';
            fullNameInput.readOnly = false;
            emailInput.readOnly = false;
          } else {
            customFields.style.opacity = '0.6';
            fullNameInput.readOnly = true;
            emailInput.readOnly = true;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// POST /api/auth/sandbox/callback
app.post('/api/auth/sandbox/callback', express.urlencoded({ extended: true }), (req, res) => {
  const provider = (req.body.provider as 'google' | 'discord' | 'sandbox') || 'sandbox';
  const email = (req.body.email as string) || 'john@example.com';
  const name = (req.body.name as string) || 'John Doe';
  
  // Find or create user
  let user = dbManager.getUserByEmailAndProvider(email, provider);
  if (!user) {
    user = dbManager.createUser({
      id: crypto.randomUUID(),
      username: null, // User claims username on dashboard setup
      email,
      provider,
      name,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
    });
  }

  // Create session
  const session = dbManager.createSession(user.id);

  // Return success message to parent window and close popup
  res.send(`
    <html>
      <head>
        <title>Sign-in Success</title>
      </head>
      <body style="background: #020617; color: white; font-family: sans-serif; display: flex; align-items: center; justify-center; height: 100vh; margin: 0; text-align: center;">
        <div>
          <h2 style="color: #3b82f6;">Authenticated Successfully!</h2>
          <p>This window will close automatically...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                token: '${session.token}',
                user: ${JSON.stringify(user)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// GET /api/auth/callback (Real Google/Discord OAuth Callback)
app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string; // 'google' or 'discord'
  const redirectUri = getRedirectUri(req);

  if (!code || !state) {
    return res.status(400).send('Invalid request params');
  }

  try {
    let email = '';
    let name = '';
    let avatarUrl = '';
    let provider: 'google' | 'discord' = 'google';

    if (state === 'google') {
      provider = 'google';
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      // Exchange authorization code for access tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user profile info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch Google userinfo');
      }

      const userData = await userResponse.json();
      email = userData.email;
      name = userData.name || userData.given_name || 'Google User';
      avatarUrl = userData.picture || '';

    } else if (state === 'discord') {
      provider = 'discord';
      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Discord token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user details
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch Discord user profile');
      }

      const userData = await userResponse.json();
      email = userData.email || `${userData.username}@discord.com`;
      name = userData.global_name || userData.username || 'Discord User';
      if (userData.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
      } else {
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`;
      }
    } else {
      return res.status(400).send('Invalid state provider value');
    }

    // Find or create user
    let user = dbManager.getUserByEmailAndProvider(email, provider);
    if (!user) {
      user = dbManager.createUser({
        id: crypto.randomUUID(),
        username: null,
        email,
        provider,
        name,
        avatarUrl
      });
    }

    // Create session
    const session = dbManager.createSession(user.id);

    // Close popup and post result
    res.send(`
      <html>
        <head><title>Success</title></head>
        <body style="background: #020617; color: white; font-family: sans-serif; display: flex; align-items: center; justify-center; height: 100vh; margin: 0; text-align: center;">
          <div>
            <h2 style="color: #3b82f6;">Authenticated Successfully!</h2>
            <p>This window will close automatically...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_SUCCESS',
                  token: '${session.token}',
                  user: ${JSON.stringify(user)}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    res.status(500).send(`Authentication failed: ${err.message || err}`);
  }
});


// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user });
});

// POST /api/auth/claim-username
app.post('/api/auth/claim-username', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const username = (req.body.username as string || '').trim().toLowerCase();
  
  // Validation: alpha-numeric and underscores, 3-20 characters
  const validRegex = /^[a-z0-9_]{3,20}$/;
  if (!validRegex.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores.' });
  }

  // Reserved names list to avoid routing conflicts
  const reservedUsernames = new Set([
    'login', 'logout', 'dashboard', 'setup', 'api', 'uploads', 'auth', 'files', 'admin', 'index', 'null', 'undefined'
  ]);
  if (reservedUsernames.has(username)) {
    return res.status(400).json({ error: 'This username is reserved and cannot be used.' });
  }

  // Check if username is already claimed
  const existingUser = dbManager.getUserByUsername(username);
  if (existingUser && existingUser.id !== user.id) {
    return res.status(400).json({ error: 'Username has already been claimed by another user.' });
  }

  const updatedUser = dbManager.updateUser(user.id, { username });
  res.json({ user: updatedUser });
});


// --- FILE SHARING ENDPOINTS ---

// GET /api/public-uploads - Global feed of all public files
app.get('/api/public-uploads', (req, res) => {
  // Return all files marked public in the system, sorted by upload date
  const publicFiles = dbManager.getPublicUserFiles('default'); // Wait, dbManager has a helper
  // Let's filter files in DB directly
  const rawDb = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'db.json'), 'utf8'));
  const allPublic = (rawDb.files as any[]).filter(f => f.isPublic === true);
  
  // Sort by date descending
  allPublic.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(allPublic);
});

// GET /api/uploads/:username - User public files list
app.get('/api/uploads/:username', (req, res) => {
  const username = req.params.username;
  const publicFiles = dbManager.getPublicUserFiles(username);
  res.json(publicFiles);
});

// GET /api/files - Get authenticated user's uploaded files (public and private)
app.get('/api/files', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const files = dbManager.getUserFiles(user.id);
  // Sort descending
  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(files);
});

// POST /api/upload - Handle file upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    // If upload was on disk, remove it to save space
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(401).json({ error: 'Unauthorized. You must sign in to upload files.' });
  }

  if (!user.username) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(400).json({ error: 'You must set up a username before uploading files.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const isPublic = req.body.isPublic === 'true';

  const fileRecord = dbManager.createFile({
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype,
    isPublic,
    objectKey: req.file.filename,
    userId: user.id,
    username: user.username,
    fileUrl: `/uploads/${req.file.filename}`, // dummy fallback for server compilation
  });

  res.status(201).json(fileRecord);
});

// PATCH /api/files/:id - Toggle public/private
app.patch('/api/files/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const file = dbManager.getFileById(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (file.userId !== user.id) return res.status(403).json({ error: 'Forbidden. You do not own this file.' });

  const isPublic = req.body.isPublic === true;
  const updated = dbManager.updateFile(file.id, { isPublic });
  res.json(updated);
});

// DELETE /api/files/:id - Delete a file
app.delete('/api/files/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const file = dbManager.getFileById(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (file.userId !== user.id) return res.status(403).json({ error: 'Forbidden' });

  dbManager.deleteFile(file.id);
  res.json({ success: true });
});

// GET /api/files/download/:id - Secure file download
app.get('/api/files/download/:id', (req, res) => {
  const file = dbManager.getFileById(req.params.id);
  if (!file) return res.status(404).send('File not found');

  // If file is private, only owner can access
  if (!file.isPublic) {
    const user = getAuthUser(req);
    // If not logged in or not owner
    if (!user || user.id !== file.userId) {
      return res.status(403).send('Forbidden. This file is private.');
    }
  }

  const filePath = path.join(process.cwd(), 'uploads', file.objectKey);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File physical storage not found on server');
  }

  // Increment download counter
  dbManager.updateFile(file.id, { downloads: file.downloads + 1 });

  // Serve file as a download/attachment with original name
  res.download(filePath, file.name);
});

// --- CLIENT ROUTING & PRODUCTION STATIC FILES ---

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
