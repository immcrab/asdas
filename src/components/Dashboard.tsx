import React, { useEffect, useState, useRef } from 'react';
import { api, MAX_STORAGE_BYTES } from '../api.js';
import { User, FileRecord, Template } from '../types.js';
import { 
  FileCode, 
  FileImage, 
  FileAudio, 
  FileVideo, 
  FileText, 
  FileArchive, 
  File, 
  Upload, 
  Trash2, 
  Globe, 
  Lock, 
  Copy, 
  Download, 
  User as UserIcon, 
  Check,
  Sparkles,
  Palette,
  Music,
  Share2,
  HardDrive,
  Eye,
  ShieldAlert
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onUserUpdate, onNavigate }) => {
  // Username claim state
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Profile customization state
  const [bioInput, setBioInput] = useState(user.bio || '');
  const [themeIdInput, setThemeIdInput] = useState(user.themeId || 'solid');
  const [musicUrlInput, setMusicUrlInput] = useState(user.backgroundMusicUrl || '');
  const [discordInput, setDiscordInput] = useState(user.discordUrl || '');
  const [twitterInput, setTwitterInput] = useState(user.twitterUrl || '');
  const [instagramInput, setInstagramInput] = useState(user.instagramUrl || '');
  const [githubInput, setGithubInput] = useState(user.githubUrl || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Community templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [sharingTemplate, setSharingTemplate] = useState(false);

  // File management state
  const [userFiles, setUserFiles] = useState<FileRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isPublicUpload, setIsPublicUpload] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account flag countdown
  const [flagRemainingSeconds, setFlagRemainingSeconds] = useState(0);

  useEffect(() => {
    if (user.username) {
      loadUserFiles();
      loadCommunityTemplates();
    }
  }, [user.username]);

  // Handle countdown for temporary suspension / flagged status
  useEffect(() => {
    const checkFlagStatus = () => {
      const { flagged, remainingSeconds } = api.isUserFlagged(user);
      if (flagged) {
        setFlagRemainingSeconds(remainingSeconds);
      } else {
        setFlagRemainingSeconds(0);
      }
    };

    checkFlagStatus();
    const interval = setInterval(checkFlagStatus, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const loadUserFiles = async () => {
    setLoadingFiles(true);
    const data = await api.getUserFiles();
    setUserFiles(data);
    setLoadingFiles(false);
  };

  const loadCommunityTemplates = async () => {
    const list = await api.getCommunityTemplates();
    setTemplates(list);
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.glb') || name.endsWith('.gltf') || name.endsWith('.obj') || name.endsWith('.fbx')) {
      return <Sparkles className="size-5 text-purple-500" />;
    }
    if (!mimeType) return <File className="size-5 text-slate-400" />;
    if (mimeType.startsWith('image/')) return <FileImage className="size-5 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="size-5 text-emerald-500" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="size-5 text-rose-500" />;
    if (mimeType.startsWith('text/')) return <FileText className="size-5 text-amber-500" />;
    if (name.endsWith('.zip') || name.endsWith('.tar') || name.endsWith('.rar') || name.endsWith('.gz')) {
      return <FileArchive className="size-5 text-indigo-500" />;
    }
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.html') || name.endsWith('.json')) {
      return <FileCode className="size-5 text-cyan-500" />;
    }
    return <File className="size-5 text-slate-400" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // --- Claim Username logic ---
  const handleClaimUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);

    const cleanUsername = usernameInput.trim().toLowerCase();
    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(cleanUsername)) {
      setUsernameError('3-20 characters. Lowercase letters, numbers, and underscores only.');
      return;
    }

    setClaiming(true);
    const res = await api.claimUsername(cleanUsername);
    setClaiming(false);

    if (res.error) {
      setUsernameError(res.error);
    } else if (res.user) {
      onUserUpdate(res.user);
    }
  };

  // --- Save custom profile customization settings ---
  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);

    try {
      const updatedUser = await api.updateProfileSettings({
        bio: bioInput.trim(),
        themeId: themeIdInput,
        backgroundMusicUrl: musicUrlInput.trim(),
        discordUrl: discordInput.trim(),
        twitterUrl: twitterInput.trim(),
        instagramUrl: instagramInput.trim(),
        githubUrl: githubInput.trim(),
      });
      onUserUpdate(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Post Current Theme Layout as Template to community ---
  const handleShareTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    setSharingTemplate(true);
    try {
      await api.shareTemplate(
        newTemplateName.trim(),
        themeIdInput,
        '#ffffff' // default primary visual
      );
      setNewTemplateName('');
      alert('Template shared successfully to community library!');
      loadCommunityTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to share template.');
    } finally {
      setSharingTemplate(false);
    }
  };

  // --- Apply community template selection ---
  const handleApplyTemplate = async (tpl: Template) => {
    const confirmApply = window.confirm(`Apply the shared template "${tpl.name}" from ${tpl.createdBy}?`);
    if (!confirmApply) return;

    setSavingSettings(true);
    try {
      const updatedUser = await api.updateProfileSettings({
        themeId: tpl.themeId
      });
      setThemeIdInput(tpl.themeId);
      onUserUpdate(updatedUser);
      alert('Community style template applied instantly!');
    } catch (err: any) {
      alert('Failed to apply template.');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Upload logic ---
  const handleUploadFile = async (file: File) => {
    // Basic frontend protection against massive files
    if (file.size > 150 * 1024 * 1024) {
      alert('File exceeds maximum size limit of 150MB!');
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const newFile = await api.uploadFile(file, isPublicUpload);
      
      // Sync user profile stats
      const me = await api.getMe();
      if (me) onUserUpdate(me);

      setUploadProgress('Asset uploaded successfully!');
      setTimeout(() => {
        setUploadProgress(null);
        setUploading(false);
      }, 1500);
      loadUserFiles();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'File upload failed due to size limit or policy filter.');
      
      // Update stats in case they got banned or flagged
      const me = await api.getMe();
      if (me) onUserUpdate(me);
      
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (flagRemainingSeconds > 0) {
      alert('Your account is currently restricted from uploading. Please wait for the countdown.');
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // --- Visibility & Delete logic ---
  const handleToggleVisibility = async (fileId: string, currentPublic: boolean) => {
    try {
      await api.updateFileVisibility(fileId, !currentPublic);
      loadUserFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to update visibility');
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"? This will free up your 3GB storage capacity.`)) {
      return;
    }

    try {
      await api.deleteFile(fileId);
      
      // Sync user profile storage stats
      const me = await api.getMe();
      if (me) onUserUpdate(me);

      loadUserFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleCopyLink = (file: FileRecord) => {
    navigator.clipboard.writeText(file.fileUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Render claim setup view if no username claimed yet
  if (!user.username) {
    const previewUrl = usernameInput.trim() 
      ? `${window.location.origin}/${usernameInput.trim().toLowerCase()}`
      : `${window.location.origin}/[yourname]`;

    return (
      <div className="flex-grow container mx-auto px-6 py-12 max-w-xl flex flex-col justify-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl animate-slide-in">
          <div className="inline-flex size-14 items-center justify-center bg-accent/10 text-accent rounded-2xl mb-6">
            <UserIcon className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">Claim your username</h1>
          <p className="text-slate-500 text-sm mb-6">
            Set up your custom link address to activate your dynamic creator profile. 
            Others will be able to browse all your shared public assets at this URL.
          </p>

          <form onSubmit={handleClaimUsername} className="space-y-6">
            <div>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl pl-4 py-1.5 focus-within:ring-2 focus-within:ring-accent/15 transition-all">
                <span className="text-slate-400 font-mono select-none text-sm">goshare.lol/</span>
                <input
                  type="text"
                  placeholder="username"
                  required
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  className="w-full bg-transparent border-none outline-none py-2 px-1 text-slate-800 font-mono text-base placeholder:text-slate-400"
                />
              </div>
              
              {usernameError ? (
                <p className="text-red-600 text-xs mt-2.5 font-mono" role="alert">
                  {usernameError}
                </p>
              ) : (
                <div className="text-slate-400 text-xs mt-2.5 font-mono">
                  <span>Preview URL: </span>
                  <span className={usernameInput.trim() ? 'text-accent font-semibold' : 'italic'}>
                    {previewUrl}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={claiming || !usernameInput.trim()}
              className="w-full bg-accent hover:bg-accent-hover text-white py-3.5 rounded-2xl font-bold tracking-wide transition-all duration-150 ease-out-quart disabled:opacity-50 shadow-md shadow-accent/15 cursor-pointer"
            >
              {claiming ? 'Claiming...' : 'Claim & Launch Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalFiles = userFiles.length;
  const totalDownloads = userFiles.reduce((acc, file) => acc + file.downloads, 0);
  const storageUsedBytes = user.storageUsed || 0;
  const storagePercent = Math.min(100, Math.round((storageUsedBytes / MAX_STORAGE_BYTES) * 100));

  // Determine progress bar color based on usage
  let progressBarColor = 'bg-emerald-500';
  if (storagePercent > 85) progressBarColor = 'bg-rose-500';
  else if (storagePercent > 60) progressBarColor = 'bg-amber-500';

  return (
    <div className="flex-grow container mx-auto px-6 py-12 max-w-7xl animate-slide-in">
      
      {/* Dynamic Account Suspended banner warning */}
      {flagRemainingSeconds > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <ShieldAlert className="size-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Account Flagged & Suspended</h3>
            <p className="text-xs leading-relaxed opacity-90 font-mono">
              Suspicious or policy-violating file was detected! Your account has been temporarily restricted from uploading or downloading files. 
              Your suspension ends in <span className="font-bold text-red-600 text-sm">{flagRemainingSeconds}</span> seconds.
            </p>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block mt-2 font-mono">
              Policy Violations: {user.flagCount}/3. Next violation leads to permanent ban!
            </span>
          </div>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">Creator Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Logged in as <span className="text-slate-800 font-semibold">{user.name}</span> · Your dynamic page:{' '}
            <button
              onClick={() => onNavigate(`/${user.username}`)}
              className="text-accent hover:underline font-mono text-xs font-semibold cursor-pointer"
            >
              goshare.lol/{user.username} ↗
            </button>
          </p>
        </div>

        {/* Short Stats Grid */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center min-w-[90px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Files</span>
            <span className="text-xl font-bold text-slate-800 font-mono mt-0.5 block">{totalFiles}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center min-w-[100px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold font-sans">Downloads</span>
            <span className="text-xl font-bold text-accent font-mono mt-0.5 block">{totalDownloads}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center min-w-[100px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold font-sans">Page Views</span>
            <span className="text-xl font-bold text-purple-600 font-mono mt-0.5 block">{user.views || 0}</span>
          </div>
        </div>
      </div>

      {/* Layout Grid: Profile Customization (Left) / File Management (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Profile Customization Section (Left) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Storage Capacity Visualizer Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <HardDrive className="size-4.5 text-accent" />
              <span>Personal Storage Allocation</span>
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500">{formatBytes(storageUsedBytes)} Used</span>
                <span className="font-semibold text-slate-800">{storagePercent}% of 3.0 GB Limit</span>
              </div>
              
              {/* Progress Bar Container */}
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${progressBarColor} transition-all duration-500`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>

              <span className="text-[10px] text-slate-400 block font-mono leading-normal">
                Deleting files instantly frees up your storage allocation. Each creator is limited to 3GB.
              </span>
            </div>
          </div>

          {/* Profile Customizer Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <Palette className="size-5 text-accent" />
              <span>Customize Profile (guns.lol style)</span>
            </h2>

            <form onSubmit={handleSaveProfileSettings} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Profile Bio</label>
                <textarea
                  placeholder="Tell your fans who you are or what assets you build..."
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-sans h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Theme Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'solid', name: 'Solid Slate' },
                    { id: 'glass', name: 'Glassmorphism' },
                    { id: 'glow', name: 'Glow Purple' },
                    { id: 'retro', name: 'Retro CRT' }
                  ].map((themeItem) => (
                    <button
                      key={themeItem.id}
                      type="button"
                      onClick={() => setThemeIdInput(themeItem.id)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        themeIdInput === themeItem.id
                          ? 'bg-accent border-accent text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {themeItem.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1">
                  <Music className="size-3.5 text-accent" />
                  <span>Background Music (Raw MP3 URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://example.com/ambient.mp3"
                  value={musicUrlInput}
                  onChange={(e) => setMusicUrlInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-mono"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Social Networks</span>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="url"
                    placeholder="Discord link"
                    value={discordInput}
                    onChange={(e) => setDiscordInput(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-accent font-sans"
                  />
                  <input
                    type="url"
                    placeholder="Twitter link"
                    value={twitterInput}
                    onChange={(e) => setTwitterInput(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-accent font-sans"
                  />
                  <input
                    type="url"
                    placeholder="Instagram link"
                    value={instagramInput}
                    onChange={(e) => setInstagramInput(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-accent font-sans"
                  />
                  <input
                    type="url"
                    placeholder="GitHub link"
                    value={githubInput}
                    onChange={(e) => setGithubInput(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-accent font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingSettings ? 'Saving...' : saveSuccess ? 'Profile Customized! ✓' : 'Save Customizations'}
              </button>
            </form>
          </div>

          {/* Share/Apply Community Templates */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1.5 flex items-center gap-1.5">
              <Share2 className="size-4 text-accent" />
              <span>Community Style Library</span>
            </h3>
            <p className="text-[10px] text-slate-400 mb-4 font-mono leading-normal">
              Apply visual template arrangements shared by other creators, or upload your current style to the feed!
            </p>

            {/* Post current layout template form */}
            <form onSubmit={handleShareTemplate} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Name your template layout..."
                required
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={sharingTemplate}
                className="bg-accent hover:bg-accent-hover text-white px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Post
              </button>
            </form>

            {/* Templates List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {templates.length > 0 ? (
                templates.map((tpl) => (
                  <div key={tpl.id} className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">{tpl.name}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">By @{tpl.createdBy} · Style: {tpl.themeId}</span>
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="bg-slate-200 hover:bg-accent hover:text-white text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wide"
                    >
                      Use
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 italic font-mono text-center py-4">
                  No community templates shared yet. Be the first to post one!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* File Upload & Management Section (Right) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Upload Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4">Upload Asset / File</h2>
            
            {/* Drag & Drop Zone */}
            <form 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => {
                if (flagRemainingSeconds > 0) {
                  alert('Your account is currently restricted due to suspension. Please wait for the countdown.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[190px] ${
                flagRemainingSeconds > 0
                  ? 'border-red-100 bg-red-50/10 cursor-not-allowed'
                  : dragActive 
                    ? 'border-accent bg-accent/5' 
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={onFileInputChange}
                disabled={uploading || flagRemainingSeconds > 0}
                className="hidden" 
              />
              <Upload className={`size-8 mb-3 ${flagRemainingSeconds > 0 ? 'text-red-400' : dragActive ? 'text-accent' : 'text-slate-400'}`} />
              <p className="text-sm font-semibold text-slate-700">
                {uploading ? 'Uploading...' : flagRemainingSeconds > 0 ? 'Upload Blocked' : 'Drag & drop asset here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {flagRemainingSeconds > 0 ? `Your suspension expires in ${flagRemainingSeconds}s` : 'or click to browse from device'}
              </p>
              <p className="text-[10px] text-slate-400 mt-3 font-mono leading-normal">
                Audio (MP3/WAV), Images, Videos (MP4), 3D Models (GLB/GLTF), and more. 
                <br />
                All uploads must strictly comply with our Acceptable Use Policy.
              </p>
            </form>

            {/* Status text */}
            {uploadProgress && (
              <div className="mt-4 bg-accent/10 border border-accent/15 rounded-xl px-4 py-3 text-xs text-accent font-mono animate-pulse">
                {uploadProgress}
              </div>
            )}

            {/* Toggle public upload */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                {isPublicUpload ? (
                  <Globe className="size-4 text-accent" />
                ) : (
                  <Lock className="size-4 text-slate-400" />
                )}
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Visibility: {isPublicUpload ? 'Public' : 'Private'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isPublicUpload ? 'Show asset on your public guns.lol style page' : 'Only you can download via creator dashboard'}
                  </span>
                </div>
              </div>

              {/* Custom Toggle Switch */}
              <button
                onClick={() => setIsPublicUpload(!isPublicUpload)}
                type="button"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  isPublicUpload ? 'bg-accent' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPublicUpload ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Files List Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4">My Uploaded Assets</h2>

            {loadingFiles ? (
              <div className="flex justify-center py-16">
                <div className="custom-spinner"></div>
              </div>
            ) : userFiles.length > 0 ? (
              <div className="divide-y divide-slate-100 space-y-4">
                {userFiles.map((file) => (
                  <div key={file.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* File Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 shrink-0">
                        {getFileIcon(file.type, file.name)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-slate-800 block truncate font-mono" title={file.name}>
                          {file.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {formatBytes(file.size)} · {file.downloads} download{file.downloads === 1 ? '' : 's'} · {file.likesCount || 0} ♥
                          </span>
                          <span className="text-slate-300 font-mono text-[10px]">•</span>
                          <button
                            onClick={() => handleToggleVisibility(file.id, file.isPublic)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold font-mono hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            {file.isPublic ? (
                              <span className="text-green-600 flex items-center gap-0.5 font-bold">
                                <Globe className="size-3" /> Public
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-0.5">
                                <Lock className="size-3" /> Private
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyLink(file)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 p-2 rounded-xl transition-all cursor-pointer relative"
                        title="Copy direct storage link"
                        aria-label="Copy direct storage link"
                      >
                        {copiedId === file.id ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                      </button>
                      
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={async () => {
                          await api.incrementDownloadCount(file.id);
                          loadUserFiles();
                        }}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 p-2 rounded-xl transition-all inline-block cursor-pointer"
                        title="Download file"
                        aria-label="Download file"
                      >
                        <Download className="size-4" />
                      </a>
                      
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-600 p-2 rounded-xl transition-all cursor-pointer"
                        title="Delete file permanently"
                        aria-label="Delete file permanently"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-slate-400 text-xs font-mono italic">
                  No files uploaded yet. Select visibility then drop files on the left to start!
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
