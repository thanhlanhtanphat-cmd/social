import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import { Layout, Eye, Settings, LogIn, LogOut } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc, limit } from 'firebase/firestore';
import MobilePreview from './components/MobilePreview';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { DEFAULT_PROFILE, DEFAULT_LINKS } from './constants';
import { Profile, Link } from './types';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';

function AppContent() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [links, setLinks] = useState<Link[]>(DEFAULT_LINKS);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState({ profile: false, links: false });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === '1' && loginForm.password === '1') {
      // Create a mock user object for the session
      const mockUser = {
        uid: 'admin-mock-uid',
        email: 'thanhlanh.tanphat@gmail.com',
        emailVerified: true,
        displayName: 'Admin',
        photoURL: 'https://picsum.photos/seed/admin/200/200'
      } as User;
      setUser(mockUser);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  useEffect(() => {
    // Listen to profile
    const profileRef = doc(db, 'settings', 'profile');
    const unsubProfile = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as Profile);
      }
      setDataLoaded(prev => ({ ...prev, profile: true }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/profile');
    });

    // Listen to links
    const linksRef = collection(db, 'links');
    const q = query(linksRef, orderBy('order', 'asc'));
    const unsubLinks = onSnapshot(q, (snapshot) => {
      const fetchedLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Link));
      setLinks(fetchedLinks);
      setDataLoaded(prev => ({ ...prev, links: true }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'links'));

    return () => {
      unsubProfile();
      unsubLinks();
    };
  }, []);

  // Separate effect for seeding - only runs for the admin
  useEffect(() => {
    if (!loading && user && user.email === "thanhlanh.tanphat@gmail.com" && user.emailVerified) {
      const seedData = async () => {
        // Check if profile exists
        const profileRef = doc(db, 'settings', 'profile');
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, DEFAULT_PROFILE).catch(console.error);
        }

        // Check if links collection is empty
        const linksRef = collection(db, 'links');
        // We use a simple check to see if there are any documents at all
        const unsub = onSnapshot(query(linksRef, limit(1)), (snapshot) => {
          if (snapshot.empty) {
            // Only seed if the collection is truly empty
            DEFAULT_LINKS.forEach(async (link) => {
              const { id, ...data } = link;
              await setDoc(doc(db, 'links', id), data).catch(console.error);
            });
          }
          unsub(); // Stop listening after check
        });
      };
      seedData();
    }
  }, [user, loading]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const updateProfile = async (newProfile: Profile) => {
    try {
      await setDoc(doc(db, 'settings', 'profile'), newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/profile');
    }
  };

  const updateLinks = async (newLinks: Link[]) => {
    // This is a bit complex because we need to sync with Firestore
    // For simplicity in this demo, we'll handle individual updates in AdminDashboard
    setLinks(newLinks);
  };

  if (loading || !dataLoaded.profile || !dataLoaded.links) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <Routes>
        <Route path="/" element={<MobilePreview profile={profile} links={links} />} />
        <Route 
          path="/admin" 
          element={
            user ? (
              <AdminDashboard 
                profile={profile} 
                setProfile={updateProfile} 
                links={links} 
                setLinks={updateLinks} 
                user={user}
                onLogout={handleLogout}
              />
            ) : (
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LogIn className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">Admin Access</h1>
                  <p className="text-slate-500 mb-6 text-sm">Enter your credentials to manage your BioLink.</p>
                  
                  <form onSubmit={handleCustomLogin} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Username</label>
                      <input 
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Password</label>
                      <input 
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter password"
                        required
                      />
                    </div>
                    
                    {loginError && (
                      <p className="text-red-500 text-xs font-medium ml-1">{loginError}</p>
                    )}

                    <button 
                      type="submit"
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all mt-2"
                    >
                      Login
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <button 
                      onClick={handleLogin}
                      className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                      Sign in with Google
                    </button>
                  </div>
                </div>
              </div>
            )
          } 
        />
      </Routes>

      {/* Floating Navigation for Demo */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {!isAdminPage ? (
          <RouterLink 
            to="/admin" 
            className="flex items-center justify-center bg-slate-900/80 backdrop-blur-sm text-white p-2.5 rounded-full shadow-lg hover:bg-slate-800 transition-all"
            title="Admin Panel"
          >
            <Settings className="w-4 h-4" />
          </RouterLink>
        ) : (
          <RouterLink 
            to="/" 
            className="flex items-center justify-center bg-blue-600/80 backdrop-blur-sm text-white p-2.5 rounded-full shadow-lg hover:bg-blue-500 transition-all"
            title="View Live Page"
          >
            <Eye className="w-4 h-4" />
          </RouterLink>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
