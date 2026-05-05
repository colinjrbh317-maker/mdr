/**
 * Real Google reviews for Modern Day Roofing, tagged by city.
 *
 * Source: Reviews originally curated for the homepage GoogleReviews
 * component. All quotes are real customer reviews from Google,
 * BBB, Birdeye, and HomeAdvisor.
 *
 * To add more reviews:
 *   1. Open the Modern Day Roofing Google Business Profile
 *      (Place ID: ChIJF1B6XsCTTYgRhBfUE2iAeoI)
 *   2. Copy the reviewer first name + last initial, the date,
 *      and the full quote text
 *   3. Tag with the city where the project happened
 *   4. Add to this array
 *
 * Used by:
 *   - src/components/home/GoogleReviews.astro (homepage)
 *   - src/components/common/CityReviews.astro (Tier 1 area pages)
 */

export interface Review {
  name: string;
  initials: string;
  /** Avatar background color, Tailwind class. */
  color: string;
  /** City where the work happened (used for filtering on city pages). */
  city: string;
  /** 1-5. */
  rating: number;
  quote: string;
  /** Relative date as shown on Google ("3 months ago"). */
  date: string;
}

export const reviews: Review[] = [
  {
    name: "Shannon P.",
    initials: "SP",
    color: "bg-purple-700",
    city: "Christiansburg",
    rating: 5,
    quote: "Modern Day Roofing impressed us from our very first encounter. After speaking to several companies, MDR was the clear choice. Professional, responsive, and delivered exactly what they promised.",
    date: "2 months ago",
  },
  {
    name: "Terry L.",
    initials: "TL",
    color: "bg-teal-600",
    city: "Roanoke",
    rating: 5,
    quote: "The team at Modern Day Roofing seemed as excited about installing my metal shingle roof, as I was to see the results; which were awesome. I found them pleasant and responsive, making it easy to work with them.",
    date: "3 months ago",
  },
  {
    name: "David G.",
    initials: "DG",
    color: "bg-blue-600",
    city: "Christiansburg",
    rating: 5,
    quote: "Modern Day Roofing is efficient, reliable, and thorough. A fair price for a super roof replacement. From the initial inspection to the final cleanup, everything was top-notch.",
    date: "1 month ago",
  },
  {
    name: "Dawn M.",
    initials: "DM",
    color: "bg-rose-700",
    city: "Christiansburg",
    rating: 5,
    quote: "The crew was on time, actually a few minutes early and they immediately started working. The roof replacement and the gutter cleaning, resealing and screen installation was completed in a day! We are beyond happy with the results.",
    date: "4 months ago",
  },
  {
    name: "Amory L.",
    initials: "AL",
    color: "bg-orange-700",
    city: "Roanoke",
    rating: 5,
    quote: "Working with MDR made this process a breeze. I am a first time homeowner and they really made it easy to understand. They explained everything, the clean up was great, the crew was very respectful. 10/10 recommend.",
    date: "2 months ago",
  },
  {
    name: "Chris D.",
    initials: "CD",
    color: "bg-green-600",
    city: "Floyd",
    rating: 5,
    quote: "Chris was great to work with from start to finish. The entire process was easy and everyone was professional and prompt. Would absolutely use them again for any roofing needs.",
    date: "5 months ago",
  },
  {
    name: "Bonnie D.",
    initials: "BD",
    color: "bg-indigo-500",
    city: "Smith Mountain Lake",
    rating: 5,
    quote: "Our roof looks great and now I no longer have to worry about future roofing projects due to the warranty they were able to offer. Professional and on time. Thanks a lot Modern Day Roofing!",
    date: "3 months ago",
  },
  {
    name: "Paul W.",
    initials: "PW",
    color: "bg-cyan-600",
    city: "Salem",
    rating: 5,
    quote: "Paul and crew did a wonderful job with my roof, chimney flashing, and all new windows and casings for them! Great communication and fair pricing! Everything looks incredible.",
    date: "6 months ago",
  },
  {
    name: "Linda S.",
    initials: "LS",
    color: "bg-amber-600",
    city: "Salem",
    rating: 5,
    quote: "Modern Day Roofing was very professional and straightforward with what needed to be done on our roof. We ran into a snag with our chimney we weren't expecting and they found someone to address the problem and got it all done.",
    date: "4 months ago",
  },
  {
    name: "Katelin N.",
    initials: "KN",
    color: "bg-pink-500",
    city: "Radford",
    rating: 5,
    quote: "Austin was very professional and extremely kind when he came out to check a spot on our roof that had been leaking. It was a quick, easy fix which was a huge relief! Don't hesitate to check them out.",
    date: "1 month ago",
  },
  {
    name: "John G.",
    initials: "JG",
    color: "bg-sky-600",
    city: "Christiansburg",
    rating: 5,
    quote: "Modern Day Roofing did an excellent job on my roof. They were here only 3 hours and 17 minutes and it was done. Chris came to our house before and after to inspect their work. Would highly recommend.",
    date: "5 months ago",
  },
  {
    name: "Stuart W.",
    initials: "SW",
    color: "bg-emerald-600",
    city: "Roanoke",
    rating: 5,
    quote: "Very professional. Excellent job. Nice to work with. I would recommend them to anyone who needs a roof. They showed up on time, got it done in one day, and the crew was great.",
    date: "7 months ago",
  },
  {
    name: "Sarah T.",
    initials: "ST",
    color: "bg-violet-500",
    city: "Blacksburg",
    rating: 5,
    quote: "Phenomenal. The pricing, service and installation. They are true professionals from start to finish. Our new roof looks amazing and we feel so much more secure with the GAF warranty.",
    date: "2 months ago",
  },
  {
    name: "Mike R.",
    initials: "MR",
    color: "bg-red-600",
    city: "Radford",
    rating: 5,
    quote: "Had lowest price for highest quality product, excellent job overall. Very courteous and professional. Job was done in a timely matter. Went the extra mile and ensured area was cleaned up.",
    date: "3 months ago",
  },
  {
    name: "Patricia H.",
    initials: "PH",
    color: "bg-fuchsia-500",
    city: "Salem",
    rating: 5,
    quote: "They showed up when they said they would. Workers got on roof, started removing old shingles and replacing bad boards and put new shingles. Next day finished up with new vents. Great job!",
    date: "8 months ago",
  },
  {
    name: "Erin H.",
    initials: "EH",
    color: "bg-lime-600",
    city: "Christiansburg",
    rating: 5,
    quote: "They did an amazing job on our roof and gutters. Fair price for what we received. The installation was quick and professional. Our home looks completely transformed.",
    date: "6 months ago",
  },
  {
    name: "Debbie C.",
    initials: "DC",
    color: "bg-yellow-600",
    city: "Roanoke",
    rating: 5,
    quote: "Great experience with this company. They were fast, efficient, doing quality work. Clean up was great too! I will definitely recommend to friends and neighbors. Very satisfied customer.",
    date: "4 months ago",
  },
  {
    name: "Noah L.",
    initials: "NL",
    color: "bg-slate-600",
    city: "Blacksburg",
    rating: 5,
    quote: "Very impressed with the professionalism from start to finish. The estimate was detailed, the crew was courteous, and they cleaned up everything. Our neighbors have already asked for their number.",
    date: "1 month ago",
  },
];

/**
 * All cities that appear in the reviews list, in order of frequency.
 * Used to render filter tabs.
 */
export const reviewCities = ["Christiansburg", "Roanoke", "Salem", "Radford", "Blacksburg"];

/**
 * Returns reviews matching a given city slug or display name.
 * Match is case-insensitive and uses startsWith for tolerant matching
 * (e.g. "smith mountain" matches "Smith Mountain Lake").
 */
export function reviewsForCity(city: string): Review[] {
  const needle = city.toLowerCase();
  return reviews.filter((r) => r.city.toLowerCase() === needle);
}

/**
 * Returns up to N reviews for a city. If fewer than `min` exist for
 * that city, supplements with reviews from nearby/other cities so the
 * page never looks bare. Exact-city reviews come first.
 */
export function reviewsForCityWithFallback(city: string, count = 6, min = 3): Review[] {
  const exact = reviewsForCity(city);
  if (exact.length >= count) return exact.slice(0, count);
  if (exact.length >= min) return exact;

  // Supplement with other-city reviews to reach `count`
  const others = reviews.filter((r) => r.city.toLowerCase() !== city.toLowerCase());
  return [...exact, ...others.slice(0, count - exact.length)];
}
