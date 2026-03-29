import React from 'react';
import { motion } from 'framer-motion';

interface HeroBackgroundProps {
  videoUrl?: string;
  posterUrl?: string; // Fallback image
}

const HeroBackground: React.FC<HeroBackgroundProps> = ({ videoUrl, posterUrl }) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-bg-darker">
      {/* Video Background */}
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.0, ease: "easeOut" }}
        className="relative w-full h-full"
      >
        {videoUrl ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={posterUrl}
            // @ts-ignore -- fetchpriority not yet in React types
            fetchpriority="high"
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
        
        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Top gradient — prevents light-wash behind transparent header */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />

        {/* Left-side gradient for headline contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />

        {/* Bottom gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-darker via-transparent to-transparent opacity-70" />
      </motion.div>
    </div>
  );
};

export default HeroBackground;
