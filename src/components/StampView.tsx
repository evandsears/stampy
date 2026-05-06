import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, PenLine, Check, Trash2 } from 'lucide-react';
import { Stamp, updateStampJournal } from '../lib/storage';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

interface StampViewProps {
  stamp: Stamp;
  isToday?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
  initialExpanded?: boolean;
  enableLayoutId?: boolean;
}

export default function StampView({ stamp, isToday, onDelete, initialExpanded, enableLayoutId }: StampViewProps & { key?: string | number }) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded || false);
  const [isEditingJournal, setIsEditingJournal] = useState(false);
  const [journalText, setJournalText] = useState(stamp.journalEntry || '');
  const [isSaving, setIsSaving] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const displayDate = format(parseISO(stamp.date), 'MMMM do, yyyy');

  const handleSaveJournal = async () => {
    setIsSaving(true);
    await updateStampJournal(stamp.id, journalText);
    stamp.journalEntry = journalText; // optimistic update
    setIsSaving(false);
    setIsEditingJournal(false);
  };

  const createExportBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 4:5 aspect ratio
      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;

      // Background color
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        // Calculate stamp size (max 85% of width or height)
        const maxStampSize = 900;
        let stampWidth = img.width;
        let stampHeight = img.height;
        const ratio = Math.min(maxStampSize / stampWidth, maxStampSize / stampHeight);
        stampWidth = stampWidth * ratio;
        stampHeight = stampHeight * ratio;

        const x = (width - stampWidth) / 2;
        const y = (height - stampHeight) / 2 - 80; // offset a bit upwards for the text

        // Add paper texture
        const paperSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E`;
        const paperImg = new Image();
        paperImg.crossOrigin = "anonymous";
        paperImg.onload = () => {
          // Use offscreen canvas to apply texture to stamp without erasing background
          const offscreen = document.createElement('canvas');
          offscreen.width = stampWidth;
          offscreen.height = stampHeight;
          const offCtx = offscreen.getContext('2d');
          
          if (offCtx) {
            // Draw stamp
            offCtx.drawImage(img, 0, 0, stampWidth, stampHeight);
            
            // Multiply texture
            offCtx.globalCompositeOperation = 'multiply';
            offCtx.globalAlpha = 0.8;
            offCtx.drawImage(paperImg, 0, 0, stampWidth, stampHeight);

            if (stamp.isHolographic) {
              offCtx.globalCompositeOperation = 'color-dodge';
              offCtx.globalAlpha = 0.5;
              const gradient = offCtx.createLinearGradient(0, 0, stampWidth, stampHeight);
              gradient.addColorStop(0, 'rgba(255, 113, 206, 1)');
              gradient.addColorStop(0.25, 'rgba(1, 205, 254, 1)');
              gradient.addColorStop(0.5, 'rgba(5, 255, 161, 1)');
              gradient.addColorStop(0.75, 'rgba(185, 103, 255, 1)');
              gradient.addColorStop(1, 'rgba(255, 251, 150, 1)');
              offCtx.fillStyle = gradient;
              offCtx.fillRect(0, 0, stampWidth, stampHeight);
            }
            
            // Mask out perforations
            offCtx.globalCompositeOperation = 'destination-in';
            offCtx.globalAlpha = 1.0;
            offCtx.drawImage(img, 0, 0, stampWidth, stampHeight);
            
            // Draw result to main canvas with drop shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 20;
            ctx.drawImage(offscreen, x, y);
            ctx.shadowColor = 'transparent';
          } else {
            // Fallback
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 20;
            ctx.drawImage(img, x, y, stampWidth, stampHeight);
            ctx.shadowColor = 'transparent';
          }
          
          // Draw date text
          ctx.fillStyle = '#31111D'; // On-Surface color
          ctx.font = '600 64px "Fredoka", sans-serif'; // App font
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(displayDate, width / 2, y + stampHeight + 100);

          // Convert the canvas to a blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            resolve(blob);
          }, 'image/jpeg', 0.9);
        };
        
        paperImg.onerror = () => {
          // fallback
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#31111D';
          ctx.font = '600 64px "Fredoka", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(displayDate, width / 2, y + stampHeight + 100);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed'));
          }, 'image/jpeg', 0.9);
        };
        
        paperImg.src = paperSvg;
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = stamp.imageDataUrl;
    });
  };

  const handleShare = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await createExportBlob();
      const file = new File([blob], `stamp-${stamp.date}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My Stamp from ${displayDate}`,
          text: stamp.journalEntry || `A memory from ${displayDate}`,
          files: [file]
        });
      } else {
        alert("Sharing is not supported on this device/browser.");
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Error sharing', e);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await createExportBlob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stamp-${stamp.date}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('Error downloading', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full px-6 py-4">
      {isToday && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary text-on-secondary px-6 py-2 rounded-full text-sm font-bold shadow-sm mb-6"
        >
          Today's Stamp
        </motion.div>
      )}

      <p className="text-center text-on-surface/50 font-serif font-medium text-sm mb-6">{displayDate}</p>

      <motion.div 
        layoutId={enableLayoutId ? `stamp-${stamp.id}` : undefined}
        initial={enableLayoutId ? false : { scale: 0.85, opacity: 0, y: -40, rotate: -8 }}
        whileInView={enableLayoutId ? undefined : { scale: 1, opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ type: "spring", damping: 14, stiffness: 80, mass: 1 }}
        className="relative group cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
           animate={isToday ? { 
             y: [0, -10, 0], 
             rotate: [0, -1, 0, 1, 0] 
           } : {}}
           transition={{ 
             duration: 4, 
             repeat: Infinity, 
             ease: "easeInOut" 
           }}
           className="relative inline-block"
        >
          <img 
            src={stamp.imageDataUrl} 
            alt={`Stamp from ${displayDate}`}
            className="w-64 max-w-[80vw] h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] group-hover:drop-shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-300 relative z-0"
          />
          {/* Subtle paper texture using mask-image to match the perforations exactly */}
          <div 
            className="absolute inset-0 pointer-events-none z-10" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E")`, 
              mixBlendMode: 'multiply',
              opacity: 0.8,
              WebkitMaskImage: `url(${stamp.imageDataUrl})`,
              WebkitMaskSize: '100% 100%',
              maskImage: `url(${stamp.imageDataUrl})`,
              maskSize: '100% 100%'
            }}
          ></div>
          {stamp.isHolographic && (
            <div 
              className="absolute inset-0 pointer-events-none z-15 holo-effect" 
              style={{ 
                WebkitMaskImage: `url(${stamp.imageDataUrl})`,
                WebkitMaskSize: '100% 100%',
                maskImage: `url(${stamp.imageDataUrl})`,
                maskSize: '100% 100%'
              }}
            ></div>
          )}
          <div className="absolute inset-0 bg-on-surface/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg pointer-events-none z-20">
            <span className="bg-surface/90 text-on-surface px-4 py-2 rounded-full text-sm font-bold drop-shadow-md">
              {isExpanded ? "Hide Details" : "View Details"}
            </span>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center mt-10 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row w-full max-w-[200px] sm:max-w-none items-stretch sm:items-center justify-center gap-3 mb-8">
              {navigator.canShare && (
                <button
                  onClick={handleShare}
                  disabled={isExporting}
                  className={cn(
                    "flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-3 sm:py-2.5 rounded-full text-sm font-bold transition-all shadow-sm",
                    isExporting ? "opacity-70 cursor-not-allowed" : "hover:scale-105"
                  )}
                >
                  <Share className="w-4 h-4" /> {isExporting ? "Preparing..." : "Share"}
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className={cn(
                  "flex items-center justify-center gap-2 bg-surface-container text-on-surface px-5 py-3 sm:py-2.5 rounded-full text-sm font-bold transition-all shadow-sm",
                  isExporting ? "opacity-70 cursor-not-allowed" : "hover:scale-105 hover:bg-surface-container/80"
                )}
              >
                <Download className="w-4 h-4" /> {isExporting ? "Preparing..." : "Save"}
              </button>
              
              {onDelete && (
                <div className="flex flex-col sm:block">
                  <button
                     onClick={() => setIsConfirmingDelete(true)}
                     className="w-full text-on-surface/50 hover:text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-sm font-bold px-5 py-3 sm:py-2.5 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>

            <div className="w-full bg-surface-container/50 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-on-surface/5 relative group transition-all duration-300 hover:shadow-md">
              {!isEditingJournal ? (
                <div className="relative">
                   <p className={cn(
                     "font-serif text-xl leading-relaxed text-on-surface flex items-center justify-center text-center",
                     !stamp.journalEntry && "text-on-surface/40 italic"
                   )}>
                     {stamp.journalEntry || "No journal entry for this memory."}
                   </p>
<button 
  onClick={() => setIsEditingJournal(true)}
  className="absolute -top-4 -right-4 p-3 bg-primary text-on-primary rounded-full hover:scale-110 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-md"
>
  <PenLine className="w-4 h-4" />
</button>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col gap-4"
                >
                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Write a few words about this memory..."
                    className="w-full bg-surface-container p-4 rounded-xl font-serif text-lg text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:italic placeholder:text-on-surface/30"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                     <button 
                       onClick={() => setIsEditingJournal(false)}
                       className="px-6 py-2 rounded-full font-bold text-sm text-on-surface/60 hover:bg-on-surface/5 hover:text-on-surface transition-colors"
                     >
                       Cancel
                     </button>
                     <motion.button 
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={handleSaveJournal}
                       disabled={isSaving}
                       className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-bold transition-shadow hover:shadow-md"
                     >
                       {isSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save</>}
                     </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfirmingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface p-6 sm:p-8 rounded-[32px] shadow-xl max-w-sm w-full border border-on-surface/5 text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-black text-on-surface tracking-tight mb-2">Delete Stamp?</h3>
              <p className="text-on-surface/60 mb-8 leading-relaxed">This memory will be lost forever. Are you sure you want to delete it?</p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    if (onDelete) onDelete(stamp.id);
                  }}
                  className="w-full bg-primary text-on-primary py-4 rounded-full font-bold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Yes, delete it
                </button>
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="w-full py-4 rounded-full font-bold text-on-surface/60 hover:bg-on-surface/5 active:scale-[0.98] transition-all"
                >
                  Keep memory
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
