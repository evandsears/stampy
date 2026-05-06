import { useEffect } from 'react';

interface AdBannerProps {
  adSlot: string;
}

export default function AdBanner({ adSlot }: AdBannerProps) {
  useEffect(() => {
    try {
      // This tells Google to find the placeholder below and fill it with an ad
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdMob error:", e);
    }
  }, []);

  return (
    <div className="w-full flex justify-center py-2 bg-surface border-t border-on-surface/5 min-h-[66px]">
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '320px', height: '50px' }}
        data-ad-client="ca-pub-5109081999190590" // Your actual Publisher ID
        data-ad-slot={adSlot.split('/')[1]} // This grabs just the number after the slash
      ></ins>
    </div>
  );
}
