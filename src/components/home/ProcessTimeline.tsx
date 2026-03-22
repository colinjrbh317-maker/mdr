import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

const steps = [
    {
        title: "Detailed Inspection",
        description: "We start with a comprehensive 21-point roof assessment. No guessing—just honest, documented findings showing exactly what your roof needs.",
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    },
    {
        title: "Transparent Quote",
        description: "You get a clear, itemized estimate with no hidden fees. We explain your options, from materials to warranties, so you can make an educated choice.",
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    },
    {
        title: "Master Elite Installation",
        description: "Our certified crew arrives on time, protects your property, and installs your new roof system to GAF's highest standards. Most jobs finished in 1-2 days.",
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.385-5.385a1.032 1.032 0 010-1.46l6.926-6.926A1.028 1.028 0 0113.672 1H21v7.328c0 .274-.11.538-.304.73l-6.926 6.926a1.032 1.032 0 01-1.46 0zm0 0l4.02 4.02M8.5 14.5l-1.414 1.414a2 2 0 000 2.828l.586.586a2 2 0 002.828 0L11.914 17.914" /></svg>,
    },
    {
        title: "Lifetime Peace of Mind",
        description: "We register your Golden Pledge® Warranty and perform a final quality walk-through. You're protected for decades, not just years.",
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    }
];

const ProcessTimeline = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <div ref={containerRef} className="relative max-w-4xl mx-auto px-4 py-20 md:py-32">
            {/* Main Vertical Line (Background) */}
            <div className="absolute left-[28px] md:left-1/2 top-24 bottom-24 w-1 bg-border rounded-full transform md:-translate-x-1/2" />

            {/* Animated Vertical Line (Foreground Fill) */}
            <motion.div
                className="absolute left-[28px] md:left-1/2 top-24 bottom-24 w-1 bg-accent origin-top rounded-full transform md:-translate-x-1/2"
                style={{ scaleY }}
            />

            <div className="space-y-20">
                {steps.map((step, index) => (
                    <TimelineNode key={index} step={step} index={index} />
                ))}
            </div>
        </div>
    );
};

const TimelineNode = ({ step, index }: { step: typeof steps[0], index: number }) => {
    const isEven = index % 2 === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`relative flex items-center md:justify-between ${isEven ? 'flex-row' : 'flex-row md:flex-row-reverse'}`}
        >
            {/* Icon Node */}
            <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 flex items-center justify-center w-14 h-14 rounded-full bg-white border-4 border-bg-light shadow-xl z-10">
                {step.icon}
            </div>

            {/* Content Space (Empty half) */}
            <div className="hidden md:block w-5/12" />

            {/* Text Content */}
            <div className={`w-full md:w-5/12 pl-20 md:pl-0 ${isEven ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
                <h3 className="text-2xl font-display font-bold text-text-primary mb-3">
                    {step.title}
                </h3>
                <p className="text-text-body font-sans leading-relaxed text-lg">
                    {step.description}
                </p>
            </div>
        </motion.div>
    );
};

export default ProcessTimeline;
