import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface BeforeAfterProps {
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
}

const BeforeAfter: React.FC<BeforeAfterProps> = ({
    beforeImage,
    afterImage,
    beforeLabel = "Before",
    afterLabel = "After"
}) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        // Calculate position
        const rect = containerRef.current.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const width = rect.width;
        const position = Math.max(0, Math.min(100, (x / width) * 100));

        setSliderPosition(position);
    };

    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);

    // Allow interaction on hover/move without click for ease of use on desktop? 
    // Refined plan says "Handle slider to reveal... intuitive". 
    // Let's stick to drag or click-move. simpler is strictly "move on hover" but that can be annoying. 
    // Drag is standard.

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-2xl cursor-col-resize select-none bg-bg-warm"
            onMouseMove={handleMouseMove}
            onTouchMove={(e) => { e.preventDefault(); handleMouseMove(e); }}
            onTouchStart={(e) => { e.preventDefault(); handleMouseMove(e); }}
        >
            {/* After Image (Background - Full Width) */}
            <img
                src={afterImage}
                alt="After"
                className="absolute inset-0 w-full h-full object-cover"
                draggable="false"
            />

            {/* After Label */}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold z-10 shadow-lg">
                {afterLabel}
            </div>

            {/* Before Image (Foreground - Clipped) */}
            <div
                className="absolute inset-0 overflow-hidden w-full h-full"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img
                    src={beforeImage}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable="false"
                />

                {/* Before Label */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold z-10 shadow-lg">
                    {beforeLabel}
                </div>
            </div>

            {/* Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                style={{ left: `${sliderPosition}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-accent">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12H3m18 0l-4 4m4-4l-4-4M3 12l4 4m-4-4l4-4" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default BeforeAfter;
