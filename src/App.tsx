import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import { Layout, Eye, Settings, LogIn, LogOut } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
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
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen to profile
    const profileRef = doc(db, 'settings', 'profile');
    const unsubProfile = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as Profile);
      }
    }, (error) => {
      // Only report error if it's not a permission issue (guests might not have read access to some parts, 
      // though our rules allow public read for profile)
      handleFirestoreError(error, OperationType.GET, 'settings/profile');
    });

    // Listen to links
    const linksRef = collection(db, 'links');
    const q = query(linksRef, orderBy('order', 'asc'));
    const unsubLinks = onSnapshot(q, (snapshot) => {
      const fetchedLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Link));
      if (fetchedLinks.length > 0) {
        setLinks(fetchedLinks);
      }
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

        // Check if links exist
        const linksRef = collection(db, 'links');
        const q = query(linksRef);
        const linksSnap = await getDoc(doc(db, 'links', '1')); // Just check one
        if (!linksSnap.exists()) {
          for (const link of DEFAULT_LINKS) {
            const { id, ...data } = link;
            await setDoc(doc(db, 'links', id), data).catch(console.error);
          }
        }
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

  if (loading) {
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
                  <p className="text-slate-500 mb-8">Please sign in with your Google account to manage your BioLink.</p>
                  <button 
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Sign in with Google
                  </button>
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
