import { useEffect } from 'react';

interface AdBannerProps {
  adSlot: string;
}

export default function AdBanner({ adSlot }: AdBannerProps) {
  useEffect(() => {
    try {
      // This triggers the actual ad load once the component is visible
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdMob error:", e);
    }
  }, []);

  return (
    <div className="w-full flex justify-center py-2 bg-surface border-t border-on-surface/5">
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '320px', height: '50px' }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID" // Replace with your Pub ID
        data-ad-slot={adSlot}
      ></ins>
    </div>
  );
}
