import React from 'react';
import { motion } from 'framer-motion';

const services = [
    {
        title: "Roof Replacement",
        description: "Complete tear-off and replacement with premium GAF roofing systems. Lifetime warranty available.",
        image: "/assets/web/Untitled-1800-x-1440-px.jpg",
        href: "/services/roof-replacement",
        colSpan: "md:col-span-2"
    },
    {
        title: "Metal Roofing",
        description: "Durable standing seam and metal panel systems built to last 50+ years.",
        image: "/assets/web/dji_fly_20250630_135406_726_1751306060507_photo.jpg",
        href: "/services/metal-roofing",
        colSpan: "md:col-span-1"
    },
    {
        title: "Roof Repair",
        description: "Fast emergency repairs and storm damage restoration. Same-day assessment available.",
        image: "/assets/web/Untitled-1800-x-1440-px-2.jpg",
        href: "/services/roof-repair",
        colSpan: "md:col-span-1"
    },
    {
        title: "Storm Damage",
        description: "Insurance claim assistance and emergency tarping. We work directly with your insurer.",
        image: "/assets/web/Untitled-1800-x-1440-px-3.jpg",
        href: "/services/storm-damage",
        colSpan: "md:col-span-1"
    },
    {
        title: "Gutters & Guards",
        description: "Seamless aluminum gutter installation with leaf protection options.",
        image: "/assets/web/dji_fly_20250630_140410_766_1751306661861_photo.jpg",
        href: "/services/gutters",
        colSpan: "md:col-span-1"
    }
];

const ServiceGrid = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
            {services.map((service, index) => (
                <motion.a
                    key={index}
                    href={service.href}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`relative group overflow-hidden rounded-2xl bg-bg-light shadow-sm hover:shadow-xl transition-all duration-500 ${service.colSpan || ''}`}
                >
                    {/* Real Project Photo Background */}
                    <div className="aspect-[4/3] md:aspect-auto md:h-80 overflow-hidden">
                        <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/75 to-black/20 transition-opacity duration-300" />
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 border-l-4 border-[#C0392B]" style={{ textShadow: '0 2px 16px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.8)' }}>
                        <h3 className="text-2xl md:text-3xl font-display font-extrabold mb-2 drop-shadow-lg" style={{ color: '#FFFFFF' }}>
                            {service.title}
                        </h3>
                        <p className="font-sans text-sm md:text-base mb-4 line-clamp-2 drop-shadow-md" style={{ color: 'rgba(255,255,255,0.95)' }}>
                            {service.description}
                        </p>
                        <span className="inline-flex items-center text-sm font-semibold uppercase tracking-wider border-b-2 border-transparent group-hover:border-[#C0392B] transition-all" style={{ color: '#FFFFFF' }}>
                            Learn More
                            <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </span>
                    </div>
                </motion.a>
            ))}
        </div>
    );
};

export default ServiceGrid;
