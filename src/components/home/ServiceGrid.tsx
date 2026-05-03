import React from 'react';

interface Service {
    title: string;
    description: string;
    testimonial?: { quote: string; name: string };
    image: string;
    href: string;
}

const services: Service[] = [
    {
        title: "Roof Replacement",
        description: "Complete tear-off and replacement with premium GAF roofing systems. Lifetime warranty available from a GAF Master Elite contractor.",
        image: "/assets/drive/mdr-after-heritage.webp",
        href: "/services/roof-replacement",
    },
    {
        title: "Metal Roofing",
        description: "Durable standing seam and metal panel systems built to last 50+ years with minimal maintenance.",
        image: "/assets/web/dji_fly_20250630_135406_726_1751306060507_photo.webp",
        href: "/services/metal-roofing",
    },
    {
        title: "Shingle Roofing",
        description: "GAF Timberline HDZ and designer shingle options with the industry's strongest warranty coverage.",
        image: "/assets/drive/mdr-after-4plex.webp",
        href: "/services/shingle-roofing",
    },
    {
        title: "Roof Repair",
        description: "Fast emergency repairs and leak fixes. Same-day assessments available for urgent situations.",
        image: "/assets/drive/mdr-repair-12.webp",
        href: "/services/roof-repair",
    },
    {
        title: "Storm Damage",
        description: "Insurance claim assistance and emergency tarping. We work directly with your insurer from start to finish.",
        image: "/assets/drive/mdr-storm-damage-1.jpg",
        href: "/services/storm-damage",
    },
    {
        title: "Gutters & Guards",
        description: "Seamless aluminum gutter installation with leaf protection options to keep your system flowing.",
        image: "/assets/drive/mdr-system-drip-edge-detail.jpg",
        href: "/services/gutters",
    }
];

const ServiceGrid = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {services.map((service, index) => (
                <a
                    key={index}
                    href={service.href}
                    className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-lg transition-shadow duration-300 group"
                >
                    {/* Photo on Top */}
                    <div className="overflow-hidden h-56">
                        <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    </div>

                    {/* Text Below */}
                    <div className="flex flex-col flex-1 p-6">
                        <h3 className="text-xl font-display font-bold text-text-primary mb-3 uppercase tracking-wide">
                            {service.title}
                        </h3>
                        <p className="text-text-muted text-sm leading-relaxed flex-1 mb-4">
                            {service.description}
                        </p>
                        {service.testimonial && (
                            <div className="mb-4 pl-3 border-l-2 border-accent/30">
                                <p className="text-xs text-text-muted italic leading-relaxed">
                                    &ldquo;{service.testimonial.quote}&rdquo;
                                </p>
                                <p className="text-xs text-accent font-semibold mt-1">
                                    — {service.testimonial.name}
                                </p>
                            </div>
                        )}
                        <span className="inline-flex items-center text-sm font-semibold text-accent group-hover:text-accent-dark transition-colors">
                            Learn More
                            <svg className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </span>
                    </div>
                </a>
            ))}
        </div>
    );
};

export default ServiceGrid;
