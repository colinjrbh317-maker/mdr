import React from 'react';

const services = [
    {
        title: "Roof Replacement",
        review: "\"They did a wonderful job replacing all the roof shingles with new shingles on my house and my garage, all in one day! They had to remove two layers of shingles before they even started putting new shingles on my roof!\"",
        reviewer: "— Dawn M., Christiansburg",
        image: "/assets/web/Untitled-1800-x-1440-px.jpg",
        href: "/services/roof-replacement",
    },
    {
        title: "Metal Roofing",
        review: "\"Modern Day Roofing was the most professional team I've worked with. The metal roof looks incredible and they finished ahead of schedule. Highly recommend for any metal project.\"",
        reviewer: "— John G., Roanoke",
        image: "/assets/web/dji_fly_20250630_135406_726_1751306060507_photo.jpg",
        href: "/services/metal-roofing",
    },
    {
        title: "Roof Repair",
        review: "\"Austin was very professional and extremely kind when he came out to check a spot on our roof that had been leaking. It was a quick, easy fix which was a huge relief! Don't hesitate to check them out.\"",
        reviewer: "— Katelin N., Radford",
        image: "/assets/web/Untitled-1800-x-1440-px-2.jpg",
        href: "/services/roof-repair",
    },
    {
        title: "Storm Damage",
        review: "\"Modern Day Roofing was very professional and straightforward with what needed to be done on our roof after the storm. They worked directly with our insurance company and got everything sorted quickly.\"",
        reviewer: "— Linda S., Salem",
        image: "/assets/web/Untitled-1800-x-1440-px-3.jpg",
        href: "/services/storm-damage",
    },
    {
        title: "Gutters & Guards",
        review: "\"The crew completed the gutter cleaning, resealing and screen installation in a day! We are beyond happy with the results. Professional, efficient, and cleaned up everything after.\"",
        reviewer: "— Bonnie D., Blacksburg",
        image: "/assets/web/dji_fly_20250630_140410_766_1751306661861_photo.jpg",
        href: "/services/gutters",
    },
    {
        title: "Shingle Roofing",
        review: "\"Working with MDR made this process a breeze. They explained everything clearly, the clean up was great, the crew was very respectful. The shingles look beautiful. 10/10 recommend.\"",
        reviewer: "— Amory L., Roanoke",
        image: "/assets/web/Untitled-1800-x-1440-px.jpg",
        href: "/services/shingle-roofing",
    }
];

const ServiceGrid = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {services.map((service, index) => (
                <div key={index} className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-lg transition-shadow duration-300">
                    {/* Photo on Top */}
                    <div className="overflow-hidden h-56">
                        <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    </div>

                    {/* Text Below */}
                    <div className="flex flex-col flex-1 p-6">
                        <h3 className="text-xl font-display font-bold text-text-primary mb-3 uppercase tracking-wide">
                            {service.title}
                        </h3>
                        <p className="text-text-muted text-sm leading-relaxed flex-1 italic mb-4">
                            {service.review}
                        </p>
                        <p className="text-xs text-text-dim mb-4 not-italic">{service.reviewer}</p>
                        <a
                            href={service.href}
                            className="inline-flex items-center text-sm font-semibold text-accent hover:text-accent-dark transition-colors group"
                        >
                            Learn More
                            <svg className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ServiceGrid;
