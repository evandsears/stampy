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
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        await syncLocalStampsToCloud();
      }
      
      const data = await getStamps();
      setStamps(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const handleCreateComplete = async (imageDataUrl: string) => {
    // Show flying animation immediately over home
    setFlyingStamp(imageDataUrl);
    setView('home');

    // Add saving to background / microtask queue to not block UI thread during animation
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

    // Remove flying stamp overlay after animation
    setTimeout(() => {
      setFlyingStamp(null);
    }, 1500);
  };

  const handleDeleteStamp = async (id: string) => {
    await deleteStamp(id);
    setStamps(await getStamps());
    if (view === 'view_stamp') {
      setView('gallery'); // or home if it's today's stamp, but gallery is safer or we can check
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
      setStamps(await getStamps()); // Refresh to local
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
          onClick={() => {
            setView(activeTab);
          }}
          className="p-2 -ml-2 text-on-surface/60 hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      ) : (
        <div className="relative">
          <button 
            onClick={() => {
              if (user) {
                setShowProfileMenu(!showProfileMenu);
              } else {
                handleLogin();
              }
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
                 {user ? (
                   <>
                     <p className="font-medium text-on-surface truncate">{user.displayName || "User"}</p>
                     <p className="text-xs text-on-surface/50 truncate max-w-full">{user.email}</p>
                   </>
                 ) : (
                   <p className="font-medium text-on-surface">Not logged in</p>
                 )}
              </div>
              <div className="p-2">
                {user ? (
                   <button 
                     onClick={handleLogout}
                     className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-on-surface/80 hover:bg-on-surface/5 rounded-xl transition-colors"
                   >
                     <LogOut className="w-4 h-4" /> Sign out
                   </button>
                ) : (
                   <button 
                     onClick={handleLogin}
                     className="w-full text-left px-3 py-2 text-sm bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors"
                   >
                     Sign in with Google
                   </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div 
        className="flex items-center gap-3 cursor-pointer" 
        onClick={() => { setView('home'); setShowProfileMenu(false); }}
      >
        <img src="/favicon.svg" alt="Stampy Icon" className="w-8 h-8 filter drop-shadow-sm" />
        <h1 className="font-serif text-3xl font-black tracking-tight text-on-surface">
          Stampy
        </h1>
      </div>

      <div className="w-10" />
    </header>
  );

 const BottomNav = () => {
  if (view === 'creating') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40">
      {/* 1. The AdMob Banner sits on top of the nav buttons */}
      <div className="w-full flex justify-center bg-surface pb-2 pt-2 border-t border-on-surface/5">
        <div className="w-[320px] h-[50px] bg-on-surface/5 rounded flex items-center justify-center border border-on-surface/10 border-dashed">
          <span className="text-on-surface/40 text-xs font-mono">AdMob Banner Space</span>
        </div>
      </div>

      {/* 2. Your existing Navigation Bar */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-none h-24 bottom-0 top-auto" />
      <div className="bg-surface-container/90 backdrop-blur-md border border-on-surface/5 mx-2 mb-6 rounded-full p-1.5 flex items-center justify-around shadow-xl relative z-10 text-on-surface/60 gap-1">
        <button
          onClick={() => setView('home')}
          className={cn(
             "flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all duration-300",
             activeTab === 'home' ? "bg-primary text-on-primary font-bold shadow-md scale-100" : "hover:bg-on-surface/5 hover:text-on-surface font-medium"
          )}
        >
          <div className="w-6 h-6 border-2 border-current rounded-sm border-dashed opacity-80" />
          <span className="text-xs">Today</span>
        </button>
        <button
          onClick={() => setView('gallery')}
          className={cn(
             "flex-1 py-3 px-2 rounded-full flex flex-col items-center gap-1 transition-all duration-300",
             activeTab === 'gallery' ? "bg-primary text-on-primary font-bold shadow-md scale-100" : "hover:bg-on-surface/5 hover:text-on-surface font-medium"
          )}
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
    <div 
      className="min-h-screen flex flex-col font-sans max-w-md mx-auto bg-surface"
      onClick={(e) => {
        // Simple way to close profile menu when clicked outside
        if (showProfileMenu && !(e.target as Element).closest('.relative')) {
          setShowProfileMenu(false);
        }
      }}
    >
      {view !== 'creating' && <TopNav />}

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full overflow-y-auto pb-24"
            >
              <div className="flex flex-col items-center pt-4 pb-12 gap-8">
                {todaysStamp ? (
                  <StampView stamp={todaysStamp} isToday onDelete={handleDeleteStamp} />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-10 px-6">
                    <div className="relative w-32 h-32 mb-6 rounded-full bg-surface-container shadow-sm flex items-center justify-center group cursor-pointer" onClick={() => setView('creating')}>
                      <img src="/favicon.svg" alt="Create Stamp" className="w-16 h-16 opacity-60 group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute bottom-4 right-4 bg-primary text-on-primary rounded-full p-1.5 shadow-md border-[3px] border-surface">
                        <Plus className="w-5 h-5 bg-primary text-on-primary rounded-full" />
                      </div>
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-on-surface mb-3">Today's Memory</h2>
                    <p className="text-on-surface/60 mb-10 max-w-xs">
                      You haven't cut out a stamp today. Capture a moment before the day ends.
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setView('creating')}
                      className="flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create Stamp</span>
                    </motion.button>
                  </div>
                )}
                
                <div className="w-full flex justify-center opacity-30 my-2">
                  <svg width="120" height="20" viewBox="0 0 120 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                
                <div className="w-full flex flex-col items-center gap-12">
                  {pastStamps.map(stamp => (
                    <StampView key={stamp.id} stamp={stamp} isToday={false} onDelete={handleDeleteStamp} />
                  ))}
                  
                  {pastStamps.length === 0 && (
                    <div className="flex flex-col items-center gap-12 w-full px-6">
                       {[1, 2].map(i => (
                         <div key={i} className="flex flex-col items-center w-full max-w-md">
                           <div className="w-32 h-4 bg-surface-container rounded-full mb-6 opacity-50" />
                           <div className="w-64 max-w-[80vw] aspect-[3/4] bg-surface-container border border-dashed border-on-surface/20 rounded-md flex items-center justify-center opacity-50">
                             <span className="font-serif text-on-surface/40 text-sm">Past Memory</span>
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'creating' && (
            <motion.div 
              key="creating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 z-50 bg-surface"
            >
              <StampCreator 
                onComplete={handleCreateComplete} 
                onCancel={() => setView('home')} 
              />
            </motion.div>
          )}

          {view === 'gallery' && (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              <Gallery 
                stamps={stamps} 
                onSelect={(stamp) => {
                  setSelectedStamp(stamp);
                  setView('view_stamp');
                }} 
              />
            </motion.div>
          )}

          {view === 'view_stamp' && selectedStamp && (
            <motion.div 
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full overflow-y-auto pt-4 pb-32"
            >
              <StampView 
                stamp={selectedStamp} 
                isToday={selectedStamp.date === todayStr} 
                onDelete={handleDeleteStamp}
                initialExpanded={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {flyingStamp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, times: [0, 0.1, 0.8, 1], ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-surface/90 backdrop-blur-sm flex items-center justify-center pointer-events-none p-8"
        >
          <motion.div
            animate={{ 
              scale: [0.5, 1.1, 1, 1, 0.2], 
              rotate: [-15, 5, 0, 0, 15], 
              y: [100, -20, 0, 0, -400] 
            }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.8, 1], ease: "easeInOut" }}
            className="relative"
          >
            <img 
              src={flyingStamp} 
              alt="Final stamp" 
              className="max-w-[280px] w-full h-auto drop-shadow-2xl"
            />
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1, 0], opacity: [0, 1, 0.8, 0] }}
              transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1] }}
              className="absolute -top-4 -right-4 w-8 h-8 text-primary"
            >
              ✨
            </motion.div>
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1, 0], opacity: [0, 1, 0.8, 0] }}
              transition={{ delay: 0.1, duration: 1.4, times: [0, 0.2, 0.8, 1] }}
              className="absolute top-10 -left-6 w-6 h-6 text-primary"
            >
              ✨
            </motion.div>
          </motion.div>
        </motion.div>
      )}


      <BottomNav />
    </div>
  );
}
