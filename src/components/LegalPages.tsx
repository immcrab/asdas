import React from 'react';

interface LegalPageProps {
  onNavigate: (path: string) => void;
}

export const Privacy: React.FC<LegalPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-grow container mx-auto px-6 py-12 max-w-3xl animate-slide-in">
      <div className="mb-8 border-b border-slate-200 pb-8">
        <span className="text-accent text-xs font-bold uppercase tracking-wider">Legal Notice</span>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mt-1">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mt-2">Last updated: July 4, 2026</p>
      </div>

      <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
        <p>
          At <strong>goshare.lol</strong>, we respect your privacy. This Privacy Policy describes how we handle the personal and files information you provide while using our web application.
        </p>

        <section>
          <h2 className="text-slate-800 font-bold text-lg mb-2">1. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account Information:</strong> When you connect via Google or Discord OAuth, we obtain your verified email address, full name, and avatar URL to link your created uploads to your account.
            </li>
            <li>
              <strong>Uploaded Files:</strong> We store the physical files you upload up to 100MB on our servers, along with metadata such as filenames, file sizes, and visibility settings (public or private).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-slate-800 font-bold text-lg mb-2">2. How Your Files Are Shared</h2>
          <p>
            Any file you mark as <strong>Public</strong> is listed on our public directory feed and your custom public page (<code>/{'yourname'}</code>). Anyone can browse, access, and download public files.
          </p>
          <p className="mt-2">
            Files marked as <strong>Private</strong> are secured on our server. They are not listed anywhere and can only be accessed or downloaded by you while you are actively logged into your account.
          </p>
        </section>

        <section>
          <h2 className="text-slate-800 font-bold text-lg mb-2">3. Storage and Deletion</h2>
          <p>
            Files and accounts can be permanently deleted from your dashboard at any time. When you click Delete, the file is immediately and permanently wiped from our server's storage disk and database records.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-slate-200 pt-6">
        <button 
          onClick={() => onNavigate('/')}
          className="text-xs text-accent hover:underline font-semibold cursor-pointer"
        >
          ← Return Home
        </button>
      </div>
    </div>
  );
};

export const Terms: React.FC<LegalPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-grow container mx-auto px-6 py-12 max-w-3xl animate-slide-in">
      <div className="mb-8 border-b border-slate-200 pb-8">
        <span className="text-accent text-xs font-bold uppercase tracking-wider">Legal Agreement</span>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mt-1">Terms of Service</h1>
        <p className="text-slate-500 text-sm mt-2">Last updated: July 4, 2026</p>
      </div>

      <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
        <p>
          Welcome to <strong>goshare.lol</strong>. By using our file-sharing platform, you agree to comply with and be bound by the following terms.
        </p>

        <section>
          <h2 className="text-slate-800 font-bold text-lg mb-2">1. Acceptable Use Policy</h2>
          <p>
            You are entirely responsible for the files you upload. You are strictly forbidden from uploading any malicious software, viruses, copyrighted content that you do not own the license for, or any materials that violate international laws.
          </p>
        </section>

        <section>
          <h2 className="text-slate-800 font-bold text-lg mb-2">2. Dynamic User Handles</h2>
          <p>
            You are granted the right to claim a single, unique, custom username to serve files from your page. We reserve the right to reclaim or rename any username in cases of copyright infringement, offensive wording, or impersonation.
          </p>
        </section>

        <section>
          <h2 className="text-slate-800 font-bold text-lg mb-2">3. Limit of Liability</h2>
          <p>
            The service is provided “as is” without warranties of any kind. We are not liable for any lost files, data corruption, server outages, or down-time. We recommend keeping secondary backups of any critical content.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-slate-200 pt-6">
        <button 
          onClick={() => onNavigate('/')}
          className="text-xs text-accent hover:underline font-semibold cursor-pointer"
        >
          ← Return Home
        </button>
      </div>
    </div>
  );
};
