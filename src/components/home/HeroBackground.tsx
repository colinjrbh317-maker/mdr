import React from 'react';

interface HeroBackgroundProps {
  videoUrl?: string;
  posterUrl?: string; // Fallback image
}

const HeroBackground: React.FC<HeroBackgroundProps> = ({ videoUrl, posterUrl }) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-bg-darker">
      {/* Video Background */}
      <div className="relative w-full h-full animate-hero-zoom">
        {videoUrl ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={posterUrl}
            fetchPriority="high"
          >
            <source src={videoUrl} type="video/mp4" />
            <track kind="captions" label="No dialogue" default />
          </video>
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt="Aerial view of a completed Modern Day Roofing project"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2c2a26] to-[#1c1917] w-full h-full" />
        )}
        
        {/* Dark Overlay for Text Readability — lighter on mobile so video motion reads */}
        <div className="absolute inset-0 bg-black/30 md:bg-black/50" />

        {/* Top gradient — prevents light-wash behind transparent header */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 md:from-black/70 to-transparent" />

        {/* Left-side gradient for headline contrast (desktop-weighted) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 md:from-black/40 via-black/10 md:via-black/20 to-transparent" />

        {/* Bottom gradient for depth — heavier on mobile to anchor CTAs over imagery */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 md:from-bg-darker via-black/20 md:via-transparent to-transparent opacity-90 md:opacity-70" />
      </div>
    </div>
  );
};

export default HeroBackground;
