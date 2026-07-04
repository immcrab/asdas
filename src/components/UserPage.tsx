import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api.js';
import { FileRecord, User } from '../types.js';
import { auth } from '../firebase.js';
import { 
  FileCode, 
  FileImage, 
  FileAudio, 
  FileVideo, 
  FileText, 
  FileArchive, 
  File, 
  Copy, 
  Download, 
  Heart, 
  AlertTriangle, 
  Eye, 
  HardDrive, 
  Compass, 
  Play, 
  Pause, 
  Music, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface UserPageProps {
  username: string;
}

export const UserPage: React.FC<UserPageProps> = ({ username }) => {
  const [creator, setCreator] = useState<User | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Interaction states
  const [likedFiles, setLikedFiles] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [reportedFiles, setReportedFiles] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Unclaimed claiming state
  const [claimInputValue, setClaimInputValue] = useState('');

  // Audio background music states
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  
  // Download Responsibility Disclaimer Modal
  const [disclaimerFile, setDisclaimerFile] = useState<FileRecord | null>(null);

  useEffect(() => {
    loadCreatorProfile();
    // Reset music state
    setIsMusicPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [username]);

  const loadCreatorProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCreatorByUsername(username);
      if (!data.creator) {
        setCreator(null);
        setFiles([]);
      } else {
        setCreator(data.creator);
        setFiles(data.files);
        
        // Setup initial likes mapping
        const initialLikes: Record<string, boolean> = {};
        const initialCounts: Record<string, number> = {};
        const firebaseUser = auth.currentUser;
        
        data.files.forEach(f => {
          initialCounts[f.id] = f.likesCount || 0;
          if (firebaseUser && f.likedBy) {
            initialLikes[f.id] = f.likedBy.includes(firebaseUser.uid);
          }
        });
        setLikedFiles(initialLikes);
        setLikesCount(initialCounts);

        // Record profile view
        await api.incrementProfileViews(username);
      }
    } catch (err: any) {
      setError(err.message || `Could not find a creator named @${username}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle background profile music
  const toggleMusic = () => {
    if (!creator?.backgroundMusicUrl) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(creator.backgroundMusicUrl);
      audioRef.current.loop = true;
      audioRef.current.addEventListener('error', () => {
        alert('Could not load the creator background music URL. Please ensure it is a direct audio link (mp3, wav, ogg).');
        setIsMusicPlaying(false);
      });
    }

    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch((err) => {
        console.error('Audio play blocked or failed', err);
        alert('Browsers require user interaction before playing audio. Click OK to try playing again.');
        audioRef.current?.play().then(() => setIsMusicPlaying(true));
      });
    }
  };

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getFileIcon = (mimeType: string, fileName: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.glb') || name.endsWith('.gltf') || name.endsWith('.obj') || name.endsWith('.fbx')) {
      return <Compass className="size-6 text-purple-500 animate-pulse" />;
    }
    if (!mimeType) return <File className="size-6 text-slate-400" />;
    if (mimeType.startsWith('image/')) return <FileImage className="size-6 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="size-6 text-emerald-500" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="size-6 text-rose-500" />;
    if (mimeType.startsWith('text/')) return <FileText className="size-6 text-amber-500" />;
    if (name.endsWith('.zip') || name.endsWith('.tar') || name.endsWith('.rar') || name.endsWith('.gz')) {
      return <FileArchive className="size-6 text-indigo-500" />;
    }
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.html') || name.endsWith('.json')) {
      return <FileCode className="size-6 text-cyan-500" />;
    }
    return <File className="size-6 text-slate-400" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyLink = (file: FileRecord) => {
    navigator.clipboard.writeText(file.fileUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleLike = async (fileId: string) => {
    try {
      const result = await api.toggleLikeFile(fileId);
      setLikedFiles(prev => ({ ...prev, [fileId]: result.liked }));
      setLikesCount(prev => ({ ...prev, [fileId]: result.likesCount }));
    } catch (err: any) {
      alert(err.message || 'You must be signed in to like files.');
    }
  };

  const handleReport = async (fileId: string) => {
    if (reportedFiles[fileId]) return;
    const confirmReport = window.confirm('Are you sure you want to report this file for policy violation?');
    if (!confirmReport) return;

    try {
      await api.reportFile(fileId);
      setReportedFiles(prev => ({ ...prev, [fileId]: true }));
      alert('Thank you. This file has been reported and sent to moderators for review.');
    } catch (err: any) {
      alert(err.message || 'Failed to file report.');
    }
  };

  // Trigger file download after accept disclaimer
  const triggerDownload = async (file: FileRecord) => {
    setDisclaimerFile(null); // Close disclaimer modal
    try {
      const newCount = await api.incrementDownloadCount(file.id);
      
      // Update UI counts locally
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, downloads: newCount } : f));
      
      // Open file URL directly to trigger browser download
      window.open(file.fileUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to download the file.');
    }
  };

  // Render claim username screen if creator is null
  if (!loading && !creator) {
    return (
      <div className="flex-grow flex items-center justify-center p-6 bg-slate-50 min-h-[70vh]">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center animate-slide-in">
          {/* Unclaimed badge */}
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent mb-6">
            <Sparkles className="size-3.5" />
            <span>Claim your page today!</span>
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-3">
            <span className="text-accent font-mono">goshare.lol/{username}</span> is unclaimed.
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
            Be the first to claim it and connect everything you do from one simple link. Start sharing assets, tools, and files under your custom portfolio page.
          </p>

          {/* Screenshot style mock claimant block */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 font-mono">
              <span className="text-slate-400">goshare.lol/</span>
              <input 
                type="text" 
                placeholder="example" 
                value={claimInputValue}
                onChange={(e) => setClaimInputValue(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-accent text-slate-800 w-36 text-center"
              />
            </div>
            <button 
              onClick={() => {
                const claimPath = claimInputValue.trim() ? `/${claimInputValue.trim()}` : '/dashboard';
                window.location.href = `/login?claim=${username}`;
              }}
              className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-accent/15 cursor-pointer"
            >
              Claim now
            </button>
          </div>

          <div className="flex items-center justify-center gap-2.5 text-xs text-slate-400 font-mono">
            <span>Powered by</span>
            <span className="font-bold text-slate-600">goshare.lol</span>
          </div>
        </div>
      </div>
    );
  }

  // Choose styling classes based on theme template selected by user
  const theme = creator?.themeId || 'solid';
  let themeContainerClass = "bg-slate-50 text-slate-900";
  let cardClass = "bg-white border border-slate-200/80 shadow-md";
  let headingClass = "text-slate-800";
  let subtextClass = "text-slate-500 font-mono";
  let accentBorder = "border-slate-100";

  if (theme === 'glass') {
    themeContainerClass = "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-indigo-950 text-white min-h-screen relative";
    cardClass = "bg-white/10 backdrop-blur-md border border-white/10 shadow-2xl shadow-indigo-950/40 text-white";
    headingClass = "text-white drop-shadow-sm";
    subtextClass = "text-indigo-200 font-mono";
    accentBorder = "border-white/5";
  } else if (theme === 'glow') {
    themeContainerClass = "bg-slate-950 text-slate-100 min-h-screen relative";
    cardClass = "bg-slate-900/90 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-slate-100";
    headingClass = "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 drop-shadow-md font-extrabold";
    subtextClass = "text-purple-300 font-mono";
    accentBorder = "border-purple-950";
  } else if (theme === 'retro') {
    themeContainerClass = "bg-black text-emerald-400 min-h-screen relative font-mono";
    cardClass = "bg-zinc-950 border-2 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)] text-emerald-400";
    headingClass = "text-emerald-300 uppercase tracking-widest font-mono";
    subtextClass = "text-emerald-500/80 font-mono";
    accentBorder = "border-emerald-950";
  }

  return (
    <div className={`flex-grow py-12 px-6 ${themeContainerClass}`}>
      {/* Dynamic scanlines for Retro CRT style theme */}
      {theme === 'retro' && (
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-15" />
      )}

      {/* Floating music control widget */}
      {creator?.backgroundMusicUrl && (
        <div className="fixed bottom-6 right-6 z-40 animate-slide-in">
          <button 
            onClick={toggleMusic}
            className={`flex items-center gap-2.5 px-4.5 py-3 rounded-full font-semibold text-xs tracking-wider uppercase transition-all duration-300 shadow-xl border cursor-pointer ${
              isMusicPlaying 
                ? 'bg-accent border-accent-hover text-white scale-105 animate-pulse' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isMusicPlaying ? (
              <>
                <div className="flex gap-0.5 items-center size-3.5">
                  <span className="bg-white w-0.5 h-3.5 rounded-full animate-[bounce_0.8s_infinite_100ms]" />
                  <span className="bg-white w-0.5 h-2 rounded-full animate-[bounce_0.8s_infinite_300ms]" />
                  <span className="bg-white w-0.5 h-4 rounded-full animate-[bounce_0.8s_infinite_200ms]" />
                  <span className="bg-white w-0.5 h-1.5 rounded-full animate-[bounce_0.8s_infinite_400ms]" />
                </div>
                <span>Music Playing</span>
              </>
            ) : (
              <>
                <Music className="size-4 text-accent" />
                <span>Play Profile Music</span>
              </>
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="custom-spinner"></div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-in relative z-10">
          {/* Creator Profile Card */}
          <div className={`${cardClass} rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8`}>
            {/* Creator Avatar */}
            <div className="relative shrink-0">
              <img 
                src={creator?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${creator?.id}`}
                alt={creator?.name}
                className="size-24 sm:size-28 rounded-2xl object-cover border border-slate-200/50 shadow-inner"
              />
              {creator?.flagCount && creator.flagCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white size-6 flex items-center justify-center rounded-full text-xs font-bold shadow-md" title="Has community flags">
                  !
                </span>
              )}
            </div>

            {/* Profile Info Details */}
            <div className="flex-grow text-center md:text-left space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2">
                <h1 className={`text-3.5xl font-extrabold tracking-tight ${headingClass}`}>
                  {creator?.name}
                </h1>
                <span className={`text-xs px-3 py-1 rounded-full font-bold self-center bg-accent/10 text-accent`}>
                  @{creator?.username}
                </span>
              </div>

              <p className="text-sm leading-relaxed max-w-xl opacity-80">
                {creator?.bio || "A content creator sharing fine assets on goshare.lol."}
              </p>

              {/* View Counter and Space Metric Indicator */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-mono pt-1">
                <span className="flex items-center gap-1.5">
                  <Eye className="size-4 text-accent" />
                  <span>{creator?.views || 0} profile view{creator?.views === 1 ? '' : 's'}</span>
                </span>
                
                <span className="flex items-center gap-1.5">
                  <HardDrive className="size-4 text-accent" />
                  <span>{formatBytes(creator?.storageUsed || 0)} / 3.0 GB used</span>
                </span>
              </div>
            </div>

            {/* Social Link Platforms */}
            <div className="flex flex-row md:flex-col gap-3 justify-center">
              {creator?.discordUrl && (
                <a 
                  href={creator.discordUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 rounded-xl border border-slate-200 bg-white/5 hover:bg-slate-100/10 hover:scale-105 transition-all text-indigo-500 font-semibold text-xs flex items-center justify-center"
                  title="Discord"
                >
                  Discord
                </a>
              )}
              {creator?.twitterUrl && (
                <a 
                  href={creator.twitterUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 rounded-xl border border-slate-200 bg-white/5 hover:bg-slate-100/10 hover:scale-105 transition-all text-sky-400 font-semibold text-xs flex items-center justify-center"
                  title="Twitter / X"
                >
                  Twitter
                </a>
              )}
              {creator?.instagramUrl && (
                <a 
                  href={creator.instagramUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 rounded-xl border border-slate-200 bg-white/5 hover:bg-slate-100/10 hover:scale-105 transition-all text-pink-500 font-semibold text-xs flex items-center justify-center"
                  title="Instagram"
                >
                  Instagram
                </a>
              )}
              {creator?.githubUrl && (
                <a 
                  href={creator.githubUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 rounded-xl border border-slate-200 bg-white/5 hover:bg-slate-100/10 hover:scale-105 transition-all text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center justify-center"
                  title="GitHub"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* Files Grid Section */}
          <div className="space-y-4">
            <h2 className={`text-xl font-bold tracking-tight px-1 flex items-center gap-2 ${headingClass}`}>
              <span>Active Creator Assets</span>
              <span className="text-xs bg-accent/10 text-accent px-2.5 py-0.5 rounded-full font-semibold">
                {files.length} Total
              </span>
            </h2>

            {files.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className={`${cardClass} p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5`}
                  >
                    {/* Header: Title and Type */}
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-start min-w-0">
                        <div className="p-3 bg-accent/10 text-accent rounded-xl shrink-0">
                          {getFileIcon(file.type, file.name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm truncate font-mono block" title={file.name}>
                            {file.name}
                          </h3>
                          <span className={`text-[10px] block mt-0.5 ${subtextClass}`}>
                            {formatBytes(file.size)} · {file.downloads || 0} download{file.downloads === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      {/* Flag suspicious content / reports indicator */}
                      <button 
                        onClick={() => handleReport(file.id)}
                        disabled={reportedFiles[file.id]}
                        className={`text-slate-400 hover:text-amber-500 p-1.5 rounded-lg transition-colors cursor-pointer ${reportedFiles[file.id] ? 'text-amber-500' : ''}`}
                        title="Report file"
                      >
                        <AlertTriangle className="size-4" />
                      </button>
                    </div>

                    {/* Previews inside file cards for instant experience */}
                    {file.type === 'image' && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200/20">
                        <img 
                          src={file.fileUrl} 
                          alt={file.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}

                    {file.type === 'audio' && (
                      <div className="p-2 bg-slate-100/50 rounded-xl">
                        <audio src={file.fileUrl} controls className="w-full h-8 outline-none" />
                      </div>
                    )}

                    {file.type === 'video' && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200/20">
                        <video src={file.fileUrl} controls className="w-full h-full object-cover" />
                      </div>
                    )}

                    {file.type === '3d' && (
                      <div className="bg-slate-100/5 p-4 rounded-xl border border-dashed border-slate-200/30 text-center flex flex-col items-center justify-center gap-1.5">
                        <Compass className="size-8 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
                        <span className="text-xs font-semibold">3D Model File Included</span>
                        <span className="text-[10px] opacity-60">Compatible with glTF, GLB, and OBJ model clients</span>
                      </div>
                    )}

                    {/* Footer: User Interactions & Actions */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100/5">
                      <div className="flex gap-2">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(file.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            likedFiles[file.id] 
                              ? 'bg-rose-50 text-rose-500 border border-rose-200' 
                              : 'bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <Heart className={`size-3.5 ${likedFiles[file.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span>{likesCount[file.id] || 0}</span>
                        </button>

                        {/* Copy Link */}
                        <button
                          onClick={() => handleCopyLink(file)}
                          className="bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                          title="Copy download url"
                        >
                          {copiedId === file.id ? <span className="text-[10px] text-green-600 font-bold px-1.5">Copied!</span> : <Copy className="size-3.5" />}
                        </button>
                      </div>

                      {/* Download disclaimer-gated trigger */}
                      <button
                        onClick={() => setDisclaimerFile(file)}
                        className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-accent/15 cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="size-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${cardClass} text-center py-16 rounded-3xl border-dashed`}>
                <p className="text-sm italic opacity-70">
                  This creator hasn't published any public assets yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer Responsibility Modal */}
      {disclaimerFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-slide-in">
            <div className="text-center space-y-4">
              <div className="inline-flex size-14 items-center justify-center bg-amber-50 text-amber-500 rounded-2xl">
                <ShieldAlert className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Security Disclaimer</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-mono">
                goshare.lol is a community-driven open-source asset platform. Downloading files uploaded by users is at your own risk. 
              </p>
              <div className="bg-amber-50 border border-amber-200/60 text-amber-800 text-left rounded-2xl p-4 text-xs font-medium space-y-1">
                <p>• Make sure to virus scan the asset file locally.</p>
                <p>• Files downloaded from goshare.lol are your **full responsibility**.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setDisclaimerFile(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => triggerDownload(disclaimerFile)}
                className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-2xl text-xs transition-all shadow-md shadow-accent/15 cursor-pointer"
              >
                Accept & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
