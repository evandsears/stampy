import { Stamp } from '../lib/storage';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';

interface GalleryProps {
  stamps: Stamp[];
  onSelect: (stamp: Stamp) => void;
}

export default function Gallery({ stamps, onSelect }: GalleryProps) {
  if (stamps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-16 h-16 border border-dashed border-on-surface/20 rounded-lg mb-6 flex items-center justify-center -rotate-6 shadow-sm">
           <div className="w-10 h-10 bg-on-surface/5 rounded-sm" />
        </div>
        <p className="text-on-surface/60 font-serif text-xl font-medium">Your gallery is empty.</p>
        <p className="text-on-surface/40 text-sm mt-2">Start your collection by creating today's stamp.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 pb-32">
      <h2 className="font-serif text-3xl font-bold text-on-surface mb-8">
        {stamps.length} Stamp{stamps.length !== 1 ? 's' : ''} Collected
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
        {stamps.map((stamp, index) => {
          const dateObj = parseISO(stamp.date);
          const month = format(dateObj, 'MMM');
          const day = format(dateObj, 'dd');

          return (
              <motion.div
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 14, stiffness: 100, mass: 0.8, delay: index * 0.08 }}
                className="flex flex-col items-center justify-center group cursor-pointer w-full max-w-[160px]"
                onClick={() => onSelect(stamp)}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div 
                  layoutId={`stamp-${stamp.id}`}
                  className="relative mb-4"
                  initial={{ rotate: index % 2 === 0 ? 5 : -5, y: 10 }}
                  animate={{ rotate: index % 2 === 0 ? -2 : 2, y: 0 }}
                  whileHover={{ rotate: index % 2 === 0 ? -4 : 4, scale: 1.05 }}
                  transition={{ type: "spring", damping: 12, stiffness: 80, mass: 0.8 }}
                >
                  <img 
                    src={stamp.imageDataUrl} 
                    alt={`Stamp from ${stamp.date}`} 
                    className="w-full max-w-[140px] drop-shadow-lg group-hover:drop-shadow-xl transition-all relative z-0"
                    loading="lazy"
                  />
                  {/* Subtle paper texture using mask-image */}
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
                </motion.div>
                <div className="flex flex-col items-center bg-surface-container/50 px-4 py-2 rounded-2xl w-full group-hover:bg-surface-container transition-colors">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">{month}</span>
                  <span className="font-serif text-xl font-bold text-on-surface">{day}</span>
                </div>
              </motion.div>
          );
        })}
      </div>
    </div>
  );
}
