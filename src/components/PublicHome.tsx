import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { FileRecord, User } from '../types.js';
import { 
  FileCode, 
  FileImage, 
  FileAudio, 
  FileVideo, 
  FileText, 
  FileArchive, 
  File, 
  Search, 
  Copy, 
  Download, 
  User as UserIcon, 
  Eye, 
  Compass, 
  HardDrive, 
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface PublicHomeProps {
  onNavigate: (path: string) => void;
  onSignInClick: () => void;
  hasUser: boolean;
}

export const PublicHome: React.FC<PublicHomeProps> = ({ onNavigate, onSignInClick, hasUser }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [topPerforming, setTopPerforming] = useState<FileRecord[]>([]);
  const [topCreators, setTopCreators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Security Acceptance Disclaimer State
  const [disclaimerFile, setDisclaimerFile] = useState<FileRecord | null>(null);

  useEffect(() => {
    loadHomepageData();
  }, []);

  const loadHomepageData = async () => {
    setLoading(true);
    try {
      const publicUploads = await api.getPublicUploads();
      setFiles(publicUploads);

      const trending = await api.getTopPerformingFiles(6);
      setTopPerforming(trending);

      const creators = await api.getTopCreators(5);
      setTopCreators(creators);
    } catch (err) {
      console.error('Failed to load home feed', err);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.glb') || name.endsWith('.gltf') || name.endsWith('.obj') || name.endsWith('.fbx')) {
      return <Compass className="size-6 text-purple-500" />;
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

  const triggerDownload = async (file: FileRecord) => {
    setDisclaimerFile(null);
    try {
      const newDownloadsCount = await api.incrementDownloadCount(file.id);
      
      // Update counts locally
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, downloads: newDownloadsCount } : f));
      setTopPerforming(prev => prev.map(f => f.id === file.id ? { ...f, downloads: newDownloadsCount } : f));
      
      // Proceed to download
      window.open(file.fileUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Download was blocked.');
    }
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-grow container mx-auto px-6 py-12 max-w-7xl space-y-16">
      
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-slide-in">
        <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full text-xs font-semibold text-accent mb-2">
          <Sparkles className="size-4.5 animate-pulse" />
          <span>The Decentralized Creator Share Matrix</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-800 leading-[1.05]">
          A beautiful share portal <br className="hidden sm:inline" />
          for <span className="text-accent underline decoration-wavy decoration-accent/30 decoration-2 underline-offset-8">creative asset assets</span>.
        </h1>
        
        <p className="text-slate-500 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Upload audio, video, images, or 3D models with 3GB free allocation. Build your customizable portfolio directory link and show off template aesthetics.
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onNavigate(hasUser ? '/dashboard' : '/login')}
            className="bg-accent hover:bg-accent-hover text-white font-bold px-8 py-3.5 rounded-2xl transition-all duration-150 ease-out-quart cursor-pointer shadow-lg shadow-accent/20 hover:-translate-y-0.5"
          >
            {hasUser ? 'Go to Dashboard' : 'Claim Your Page Now'}
          </button>
          
          <button
            onClick={() => {
              const el = document.getElementById('directory');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-8 py-3.5 rounded-2xl transition-all cursor-pointer"
          >
            Explore Assets
          </button>
        </div>

        {/* Global Stats bar */}
        <div className="pt-4 flex justify-center items-center gap-6 sm:gap-12 text-slate-400 font-mono text-xs border-t border-slate-100 max-w-lg mx-auto">
          <div>
            <span className="font-bold text-slate-700 text-base">{topCreators.length}+</span> Active Creators
          </div>
          <div className="bg-slate-200 w-px h-4" />
          <div>
            <span className="font-bold text-slate-700 text-base">{files.length}+</span> Total Files
          </div>
          <div className="bg-slate-200 w-px h-4" />
          <div>
            <span className="font-bold text-slate-700 text-base">3.0 GB</span> Allocation / Person
          </div>
        </div>
      </div>

      {/* Top Performing/Trending Assets Block (YouTube style asset spotlight) */}
      {!loading && topPerforming.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-1">
            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
              <TrendingUp className="size-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Trending Assets</h2>
              <p className="text-xs text-slate-500">The most downloaded, liked, and utilized open files on our platform.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topPerforming.map((file) => (
              <div 
                key={file.id} 
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4"
              >
                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3 items-start min-w-0">
                    <div className="p-3 bg-accent/10 text-accent rounded-2xl shrink-0">
                      {getFileIcon(file.type, file.name)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm truncate block font-mono text-slate-800" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {formatBytes(file.size)} · {file.downloads || 0} download{file.downloads === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micro Previews on homepage */}
                {file.type === 'image' && (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-100">
                    <img 
                      src={file.fileUrl} 
                      alt={file.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}

                {file.type === 'audio' && (
                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <audio src={file.fileUrl} controls className="w-full h-8 outline-none" />
                  </div>
                )}

                {/* Creator card connection */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <button 
                    onClick={() => onNavigate(`/${file.username}`)}
                    className="flex items-center gap-2 text-left cursor-pointer hover:opacity-85 transition-all min-w-0"
                  >
                    <div className="size-6.5 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <UserIcon className="size-3.5" />
                    </div>
                    <span className="text-xs font-bold text-accent truncate font-mono">
                      @{file.username}
                    </span>
                  </button>
                  <span className="text-[10px] bg-slate-200/50 text-slate-500 font-bold px-2 py-0.5 rounded-lg font-mono uppercase">
                    {file.type}
                  </span>
                </div>

                {/* Download Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyLink(file)}
                    className="flex-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-2.5 rounded-2xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <Copy className="size-3.5" />
                    <span>{copiedId === file.id ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <button
                    onClick={() => setDisclaimerFile(file)}
                    className="flex-1 bg-accent hover:bg-accent-hover text-white font-bold py-2.5 rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-accent/15 flex items-center justify-center gap-1"
                  >
                    <Download className="size-3.5" />
                    <span>Get Asset</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Creators spotlight slider list */}
      {!loading && topCreators.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-1">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
              <UserIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Active Top Creators</h2>
              <p className="text-xs text-slate-500">The most visited portfolio sites on goshare.lol with live custom layouts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topCreators.map((creator) => (
              <div 
                key={creator.id}
                onClick={() => onNavigate(`/${creator.username}`)}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center flex flex-col items-center gap-3.5 relative"
              >
                {/* Avatar */}
                <img 
                  src={creator.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${creator.id}`} 
                  alt={creator.name} 
                  className="size-16 rounded-2xl object-cover border border-slate-200"
                />

                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 tracking-tight truncate max-w-[150px]">
                    {creator.name}
                  </h3>
                  <span className="text-[10px] text-accent font-bold font-mono">
                    @{creator.username}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans line-clamp-2 max-w-xs px-2">
                  {creator.bio || "A content creator sharing fine assets on goshare.lol."}
                </p>

                {/* Stats badge */}
                <div className="w-full border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5 text-accent" />
                    <span>{creator.views || 0} views</span>
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <HardDrive className="size-3.5 text-accent" />
                    <span>{formatBytes(creator.storageUsed || 0)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory Section with Search Filter */}
      <div id="directory" className="border-t border-slate-200 pt-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Public Assets Directory</h2>
            <p className="text-xs text-slate-500">Search and discover public files uploaded by our decentralized community.</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400">
              <Search className="size-5" />
            </span>
            <input 
              type="text" 
              placeholder="Search files or creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-800 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all text-sm placeholder:text-slate-400 shadow-sm font-sans"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="custom-spinner"></div>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div 
                key={file.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm transition-all duration-150 ease-out-quart hover:-translate-y-0.5 hover:shadow-md flex flex-col gap-4"
              >
                {/* File Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-150 shrink-0">
                      {getFileIcon(file.type, file.name)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-slate-800 block truncate font-mono" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {formatBytes(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Creator Section */}
                <div className="flex justify-between items-center bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                  <button 
                    onClick={() => onNavigate(`/${file.username}`)}
                    className="flex items-center gap-2 text-left cursor-pointer hover:opacity-85 transition-opacity min-w-0"
                  >
                    <div className="size-6.5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <UserIcon className="size-3.5 text-accent" />
                    </div>
                    <span className="text-xs font-bold text-accent block truncate font-mono">
                      @{file.username}
                    </span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {file.downloads} download{file.downloads === 1 ? '' : 's'}
                  </span>
                </div>

                {/* File Actions */}
                <div className="flex gap-2.5 mt-auto">
                  <button
                    onClick={() => handleCopyLink(file)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-600 font-bold py-2.5 rounded-2xl transition-all cursor-pointer relative"
                  >
                    <Copy className="size-4" />
                    <span>{copiedId === file.id ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <button
                    onClick={() => setDisclaimerFile(file)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2.5 rounded-2xl transition-all cursor-pointer shadow-md shadow-accent/15 text-center"
                  >
                    <Download className="size-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl bg-white shadow-inner">
            <p className="text-slate-500 text-sm font-mono italic">
              {searchTerm ? 'No files match your search criteria.' : 'The directory is empty. Be the first to share!'}
            </p>
          </div>
        )}
      </div>

      {/* Safety Acceptance Disclaimer Modal */}
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
