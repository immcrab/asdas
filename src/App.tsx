import { useEffect, useState } from 'react';
import { api } from './api.js';
import { User } from './types.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { PublicHome } from './components/PublicHome.js';
import { Dashboard } from './components/Dashboard.js';
import { UserPage } from './components/UserPage.js';
import { Privacy, Terms } from './components/LegalPages.js';
import { LoginModal } from './components/LoginModal.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [path, setPath] = useState(window.location.pathname);

  // Sync state with browser back/forward buttons
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    
    // Fetch initial user session if token exists
    checkSession();

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const checkSession = async () => {
    setLoading(true);
    const currentUser = await api.getMe();
    setUser(currentUser);
    setLoading(false);
  };

  const navigate = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    setPath(newPath);
  };

  const handleSignInSuccess = (token: string, loggedUser: User) => {
    setUser(loggedUser);
    // If user hasn't claimed a username yet, send them to dashboard to set it up
    if (!loggedUser.username) {
      navigate('/dashboard');
    } else if (path === '/' || path === '/login') {
      navigate('/dashboard');
    }
  };

  const handleSignOut = () => {
    api.logout();
    setUser(null);
    navigate('/');
  };

  // Determine which page component to render based on path
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-grow flex items-center justify-center min-h-[50vh]">
          <div className="custom-spinner"></div>
        </div>
      );
    }

    if (path === '/' || path === '/login') {
      return (
        <PublicHome 
          onNavigate={navigate} 
          onSignInClick={() => setShowLoginModal(true)} 
          hasUser={user !== null}
        />
      );
    }

    if (path === '/privacy') {
      return <Privacy onNavigate={navigate} />;
    }

    if (path === '/terms') {
      return <Terms onNavigate={navigate} />;
    }

    if (path === '/dashboard') {
      if (!user) {
        // Force authentication
        return (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              You must sign in with Google before you can access the creator dashboard and upload files.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-2.5 rounded-full cursor-pointer transition-all duration-150"
            >
              Sign In
            </button>
          </div>
        );
      }
      return (
        <Dashboard 
          user={user} 
          onUserUpdate={setUser} 
          onNavigate={navigate}
        />
      );
    }

    // Dynamic routing: Treat any other path as a creator username
    const username = path.slice(1);
    return <UserPage username={username} />;
  };

  // Automatically trigger login modal if path is explicitly "/login"
  useEffect(() => {
    if (path === '/login' && !user && !loading) {
      setShowLoginModal(true);
    }
  }, [path, user, loading]);

  return (
    <div className="bg-bg-deep text-slate-900 min-h-screen flex flex-col font-sans antialiased">
      {/* Background radial gradient overlay matching the beautiful template */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-bg-deep to-bg-deep"
        aria-hidden="true"
      />

      <div className="relative z-10 flex-grow flex flex-col">
        <Navbar 
          user={user}
          onSignInClick={() => setShowLoginModal(true)}
          onSignOut={handleSignOut}
          currentPath={path}
          onNavigate={navigate}
        />

        {renderContent()}

        <Footer onNavigate={navigate} />
      </div>

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => {
            setShowLoginModal(false);
            if (path === '/login') navigate('/');
          }}
          onSuccess={handleSignInSuccess}
        />
      )}
    </div>
  );
}
