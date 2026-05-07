/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stamp, getStamps, saveStamp, syncLocalStampsToCloud, deleteStamp } from './lib/storage';
import { getTodayDateString, generateId } from './lib/image-utils';
import StampCreator from './components/StampCreator';
import StampView from './components/StampView';
import Gallery from './components/Gallery';
import { BookImage, Plus, ArrowLeft, Loader2, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { auth, signInWithGoogle, signOut } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import AdBanner from './components/AdBanner';

type ViewState = 'home' | 'creating' | 'gallery' | 'view_stamp';

export default function App() {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewState>('home');
  const [selectedStamp, setSelectedStamp] = useState<Stamp | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [flyingStamp, setFlyingStamp] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const todaysStamp = stamps.find(s => s.date === todayStr);
  const pastStamps = stamps.filter(s => s.date !== todayStr).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    const loadLocalData = async () => {
      const data = await getStamps();
      setStamps(data);
      setIsLoading(false);
    };
    loadLocalData();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await syncLocalStampsToCloud();
        const freshData = await getStamps();
        setStamps(freshData);
      }
    });
    return unsub;
  }, []);

  const handleCreateComplete = async (imageDataUrl: string) => {
    setFlyingStamp(imageDataUrl);
    setView('home');

    setTimeout(async () => {
      const currentStamps = await getStamps();
      const isHolographic = (currentStamps.length + 1) % 5 === 0;

      const newStamp: Stamp = {
        id: generateId(),
        date: todayStr,
        imageDataUrl,
        journalEntry: '',
        isHolographic
      };
      await saveStamp(newStamp);
      setStamps(await getStamps());
    }, 100);

    setTimeout(() => {
      setFlyingStamp(null);
    }, 1500);
  };

  const handleDeleteStamp = async (id: string) => {
    await deleteStamp(id);
    setStamps(await getStamps());
    if (view === 'view_stamp') {
      setView('gallery'); 
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      setShowProfileMenu(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setShowProfileMenu(false);
      setStamps(await getStamps());
    } catch (e) {
      console.error(e);
    }
  };

  const [activeTab, setActiveTab] = useState<'home' | 'gallery'>('home');

  useEffect(() => {
    if (view === 'home' || view === 'gallery') {
      setActiveTab(view);
    }
  }, [view]);

  const TopNav = () => (
    <header className="flex items-center justify-between px-6 py-4 sticky top-0 bg-surface/80 backdrop-blur-md z-30">
      {view === 'view_stamp' ? (
        <button 
          onClick={() => { setView(activeTab); }}
          className="p-2 -ml-2 text-on-surface/60 hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      ) : (
        <div className="relative">
          <button 
            onClick={() => {
              if (user) { setShowProfileMenu(!showProfileMenu); } 
              else { handleLogin(); }
            }}
            className={cn(
              "p-2 -ml-2 transition-colors flex items-center gap-2 rounded-full",
              user ? "text-on-surface/60 hover:text-on-surface" : "bg-primary text-on-primary px-4 py-2 hover:bg-primary/90 text-sm font-bold shadow-md"
            )}
          >
            {user && user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-surface" />
            ) : user ? (
              <UserIcon className="w-6 h-6" />
            ) : (
              <span>Login with Google</span>
            )}
          </button>
          {showProfileMenu && user && (
            <div className="absolute top-12 left-0 w-48 bg-surface-container border border-on-surface/5 shadow-xl rounded-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-on-surface/5">
                 <p className="font-medium text-on-surface truncate">{user.displayName || "User"}</p>
                 <p className="text-xs text-on-surface/50 truncate max-w-full">{user.email}</p>
              </div>
              <div className="p-2">
                 <button 
                   onClick={handleLogout}
                   className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-on-surface/80 hover:bg-on-surface/5 rounded-xl transition-colors"
                 >
                   <LogOut className="w-4 h-4" /> Sign out
                 </button>
              </div>
              <div className="p-2 border-t border-on-surface/5">
                <a href="/privacy.html" target="_blank" className="block w-full text-center py-2 text-[10px] text-on-surface/40 hover:text-on-surface/60 transition-colors">
                  Privacy Policy
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('home'); setShowProfileMenu(false); }}>
        <img src="/favicon.svg" alt="Stampy Icon" className="w-8 h-8 filter drop-shadow-sm" />
        <h1 className="font-serif text-3xl font-black tracking-tight text-on-surface">Stampy</h1>
      </div>
      <div className="w-10" />
    </header>
  );

  const BottomNav = () => {
    if (view === 'creating') return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40">
        <div className="hidden [@media(min-height:600px)]:block">
          <AdBanner adSlot="ca-app-pub-5109081999190590/2485759813" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-none h-24 bottom-0 top-auto" />
        <div className="bg-surface-container/90 backdrop-blur-md border border-on-surface/5 mx-2 mb-6 rounded-full p-1.5 flex items-center justify-around shadow-xl relative z-10 text-on-surface/60 gap-1">
          <button
            onClick={() => setView('home')}
            className={cn("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all duration-300", activeTab === 'home' ? "bg-primary text-on-primary font-bold shadow-md" : "hover:bg-on-surface/5 hover:text-on-surface font-medium")}
          >
            <div className="w-6 h-6 border-2 border-current rounded-sm border-dashed opacity-80" />
            <span className="text-xs">Today</span>
          </button>
          <button
            onClick={() => setView('gallery')}
            className={cn("flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all duration-300", activeTab === 'gallery' ? "bg-primary text-on-primary font-bold shadow-md" : "hover:bg-on-surface/5 hover:text-on-surface font-medium")}
          >
            <BookImage className="w-6 h-6 opacity-80" />
            <span className="text-xs">Gallery</span>
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ink/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans max-w-md mx-auto bg-surface" onClick={(e) => { if (showProfileMenu && !(e.target as Element).closest('.relative')) { setShowProfileMenu(false); } }}>
      {view !== 'creating' && <TopNav />}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full overflow-y-auto pb-24">
              <div className="flex flex-col items-center pt-4 pb-12 gap-8">
                {todaysStamp ? ( <StampView stamp={todaysStamp} isToday onDelete={handleDeleteStamp} /> ) : (
                  <div className="flex flex-col items-center justify-center text-center py-10 px-6">
                    <div className="relative w-32 h-32 mb-6 rounded-full bg-surface-container shadow-sm flex items-center justify-center group cursor-pointer" onClick={() => setView('creating')}>
                      <img src="/favicon.svg" alt="Create Stamp" className="w-16 h-16 opacity-60 group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute bottom-4 right-4 bg-primary text-on-primary rounded-full p-1.5
