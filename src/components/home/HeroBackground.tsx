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
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
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
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt="Aerial view of a completed Modern Day Roofing project"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2c2a26] to-[#1c1917] w-full h-full" />
        )}
        
        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Left-side gradient for headline contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />

        {/* Bottom gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-darker via-transparent to-transparent opacity-70" />
      </motion.div>
    </div>
  );
};

export default HeroBackground;
