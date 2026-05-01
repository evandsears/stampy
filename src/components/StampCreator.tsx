import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Scissors, X } from 'lucide-react';
import { motion } from 'motion/react';
import { createStampImage } from '../lib/image-utils';

interface StampCreatorProps {
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function StampCreator({ onComplete, onCancel }: StampCreatorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const url = reader.result?.toString();
        if (!url) return;
        
        // Downscale large images before cropping
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round(height * (MAX_DIM / width));
              width = MAX_DIM;
            } else {
              width = Math.round(width * (MAX_DIM / height));
              height = MAX_DIM;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setImageSrc(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setImageSrc(url);
          }
        };
        img.src = url;
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCut = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const output = await createStampImage(imageSrc, croppedAreaPixels);
      onComplete(output);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  if (!imageSrc) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full min-h-[60vh] space-y-6 text-center">
        <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center mb-4">
          <Camera className="w-10 h-10 text-secondary" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-on-surface">Capture Today</h2>
        <p className="text-on-surface/60 max-w-sm mb-8">
          Choose a photo to immortalize as today's stamp. You only get one.
        </p>
        <motion.label 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="cursor-pointer bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg inline-block"
        >
          Select Photo
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </motion.label>
        <button onClick={onCancel} className="text-on-surface/40 hover:text-on-surface/60 text-sm mt-4 font-medium">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      <div className="flex items-center justify-between p-4 bg-surface/80 backdrop-blur-sm z-10 border-b border-on-surface/5">
        <button onClick={onCancel} className="p-2 text-on-surface/60 hover:text-on-surface transition-colors rounded-full hover:bg-on-surface/5">
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-serif font-bold text-lg text-on-surface">Position Stamp</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="relative flex-1 bg-on-surface/5">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          // typical stamp ratio ~ 4:5
          aspect={4 / 5}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          classes={{
            containerClassName: 'bg-transparent',
            cropAreaClassName: 'stamp-crop-area'
          }}
        />
      </div>

      <div className="bg-surface p-6 pb-safe flex flex-col items-center shadow-[0_-10px_40px_-5px_rgba(49,17,29,0.05)] z-10">
        <p className="text-on-surface/50 text-sm mb-6 font-medium">Pinch to zoom, drag to move</p>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCut}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-secondary text-on-secondary px-10 py-4 rounded-full font-bold text-lg shadow-lg disabled:opacity-50"
        >
          {isProcessing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Scissors className="w-5 h-5" />
            </motion.div>
          ) : (
            <Scissors className="w-5 h-5" />
          )}
          <span>Cut Stamp</span>
        </motion.button>
      </div>
    </div>
  );
}
