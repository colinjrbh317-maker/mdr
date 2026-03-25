import React, { useState, useRef, useCallback } from 'react';

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
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const updatePosition = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(position);
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updatePosition(e.clientX);
    }, [updatePosition]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        e.preventDefault();
        updatePosition(e.clientX);
    }, [updatePosition]);

    const handlePointerUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden select-none"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* After Image (Background) */}
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

            {/* Before Image (Clipped) */}
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
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold z-10 shadow-lg">
                    {beforeLabel}
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                style={{ left: `${sliderPosition}%`, cursor: 'col-resize' }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-accent">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#C0392B' }}>
                        <path d="M21 12H3m18 0l-4 4m4-4l-4-4M3 12l4 4m-4-4l4-4" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default BeforeAfter;
