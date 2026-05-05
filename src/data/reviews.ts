/**
 * Real Google reviews for Modern Day Roofing.
 *
 * Source: Apify Google Reviews scrape pulled May 5, 2026 from the
 * Modern Day Roofing Google Business Profile (Place ID:
 * ChIJF1B6XsCTTYgRhBfUE2iAeoI).
 *
 * Reviewer names are anonymized to "Verified Google Review" because
 * Apify redacts them. The 7 entries with real names were
 * cross-matched between the Apify scrape and a previously curated
 * list, so those names + city tags are verified.
 *
 * City tagging:
 *   - Reviews where the customer or owner reply explicitly mentions
 *     a city are tagged with that city
 *   - Reviews matching the curated set are tagged with the
 *     human-curated city
 *   - All others are tagged "Service Area" and used as supplementary
 *     credibility on city pages
 *
 * Used by:
 *   - src/components/home/GoogleReviews.astro
 *   - src/components/common/CityReviews.astro
 *
 * To refresh: re-run scripts/process-google-reviews.mjs against a
 * fresh Apify export.
 */

export interface Review {
  name: string;
  initials: string;
  color: string;
  city: string;
  rating: number;
  quote: string;
  date: string;
  verified: boolean;
  reviewedAt: string;
}

export const reviews: Review[] = [
  {
    "name": "Sarah T.",
    "initials": "ST",
    "color": "bg-violet-500",
    "city": "Blacksburg",
    "rating": 5,
    "quote": "Phenomenal. The pricing, service and installation. They are true professionals from start to finish.",
    "date": "6 months ago",
    "verified": true,
    "reviewedAt": "2025-11-06T16:19:28.270000Z"
  },
  {
    "name": "Chris D.",
    "initials": "CD",
    "color": "bg-green-600",
    "city": "Floyd",
    "rating": 5,
    "quote": "Chris was great to work with from start to finish. The entire process was easy and everyone was professional and prompt. We went with the metal roof and it turned out better then expected. The roofers and gutter installers were fast and efficient and cleaned as they went. We will definitely recommend them to anyone looking for a roof.",
    "date": "6 months ago",
    "verified": true,
    "reviewedAt": "2025-11-05T18:13:52.856000Z"
  },
  {
    "name": "Paul W.",
    "initials": "PW",
    "color": "bg-cyan-600",
    "city": "Salem",
    "rating": 5,
    "quote": "Paul and crew did a wonderful job with my roof, chimney flashing, and all new windows and casings for them! Great communication and fair pricing! Highly recommend! Having them help with some siding needs as well!",
    "date": "7 months ago",
    "verified": true,
    "reviewedAt": "2025-10-30T20:47:23.563000Z"
  },
  {
    "name": "Bonnie D.",
    "initials": "BD",
    "color": "bg-indigo-500",
    "city": "Smith Mountain Lake",
    "rating": 5,
    "quote": "Working with MDR was fantastic, they were professional and on time. Our roof looks great and now I no longer have to worry about future roofing projects due to the warranty they were able to offer. Thanks a lot Modern Day Roofing I will recommend you to friends and family!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-08-26T14:56:49.489000Z"
  },
  {
    "name": "Katelin N.",
    "initials": "KN",
    "color": "bg-pink-500",
    "city": "Radford",
    "rating": 5,
    "quote": "Austin was very professional and extremely kind when he came out to check a spot on our roof that had been leaking. It was a quick, easy fix which was a huge relief! Don’t hesitate to check them out when you need something done. Thanks so much!!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-06-21T17:18:51.766000Z"
  },
  {
    "name": "Dawn M.",
    "initials": "DM",
    "color": "bg-rose-700",
    "city": "Christiansburg",
    "rating": 5,
    "quote": "The crew was on time, actually a few minutes early and they immediately started working. The roof replacement and the gutter cleaning, resealing and screen installation was completed in a day! We are beyond happy with the results and highly recommend Modern Day Roofing!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-06-07T22:23:54.299000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "These guys worked with us and provided what appears to be a very high quality roof (I guess we will find out in 20 years). They were patient and planned with us to get this taken care of in a reasonable period at a lower cost than others quoted us. Give these people a try if you are in need of roof work.",
    "date": "1 month ago",
    "verified": true,
    "reviewedAt": "2026-04-28T12:53:44.480000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Excellent work! Repairs (worker's mishap) done at their cost. Very pleased with roof and repairs.",
    "date": "1 month ago",
    "verified": true,
    "reviewedAt": "2026-04-18T21:28:45.587000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "i would highly give Modern Day Roofing a a plus for their roofing job, from the representive that quoted us a price, Trey Hylton is as honest as he can be, told us exactly what to expect from the company and they followed it too the letter. The job was finished in one day's time as promised. our job cost a little more than Trey quoted us but they run into some unexpected problems. after they finished i went out to clean up to find it was cleaner than before they started work. IF YOU NEED A ROOF I HIGHLY RECOMMED THIS COMPANY. THANKS GUYS OUR HOME HAS NEVER LOOKED BETTER. DOROTHY & LARRY BOWLES",
    "date": "1 month ago",
    "verified": true,
    "reviewedAt": "2026-04-13T21:25:50.318000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "This company is as good as it gets! Excellent communication and quality of work. AJ and Rodrigo were amazing to work with! The crew got the work done quickly and left zero mess! Even the people in the main office are super helpful and friendly. 10/10 recommend this company! We honestly paid a lot less than we had expected, and now have a 25 year warranty. Thank you for being amazing at what you do!",
    "date": "1 month ago",
    "verified": true,
    "reviewedAt": "2026-04-10T22:53:33.203000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing is one of the best contractors I have worked with. Extremely helpful the entire process. Did a great job on the install and cleanup. Everything was completed in one day. I would recommend to anyone needing a roof.",
    "date": "1 month ago",
    "verified": true,
    "reviewedAt": "2026-04-10T16:22:34.047000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Joe Furrow gave us a very comprehensive overview of the project and answered all our questions. He's very knowledgeable. The crew showed up on time and worked diligently throughout the day. They did an excellent job of protecting plants/shrubbery/windows, etc. to minimize any damage to existing items. They cleaned up our yard and all their materials well. It was definitely a turn-key job.",
    "date": "2 months ago",
    "verified": true,
    "reviewedAt": "2026-03-30T20:44:32.790000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "All around excellent service. From the initial quote with Paul, thoroughly explaining all my options, and providing competitive options. I’ve been very pleased with the work and service. I definitely recommend Modern Day Roofing.",
    "date": "2 months ago",
    "verified": true,
    "reviewedAt": "2026-03-27T15:11:21.878000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great experience with Modern Day Roofing! The communication was excellent from start to finish. The crew was polite and did a fantastic job. Cleanup was done with no issues.",
    "date": "2 months ago",
    "verified": true,
    "reviewedAt": "2026-03-26T13:24:59.063000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great service, very courteous, THANKS ALOT",
    "date": "2 months ago",
    "verified": true,
    "reviewedAt": "2026-03-04T20:16:29.906000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "They did an amazing job from start to finish. They have a great internal team who prepared me well for what to expect and making the decision on which path I wanted to choose. They stayed closely in touch each step of the way. The installation crew was professional, thorough, and clean. I’m so glad I chose Modern Day for my new roof!",
    "date": "4 months ago",
    "verified": true,
    "reviewedAt": "2026-01-06T16:32:38.387000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did an awesome job for me! Not pushy. Very accommodating. Able to replace rotten boards when found at a reasonable price while keeping project on schedule. Professional, personable, dependable. I am very happy knowing my family home is secure from the elements and it looks beautiful with the shingles I chose and the skilled installation by Modern Day! Highly recommend!",
    "date": "5 months ago",
    "verified": true,
    "reviewedAt": "2025-12-11T14:34:16.739000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Every team member kept in touch, gave updates, and generally just made me feel like my project was important to them. They were flexible as well. I highly recommend Modern Day Roofing.\n\nThey are large part of our community as well, they give back in meaningful ways.",
    "date": "5 months ago",
    "verified": true,
    "reviewedAt": "2025-12-06T21:29:30.217000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "The roof looks perfect and was completed in one day. They really cleaned up, and the whole crew was very diligent, friendly, and professional. I really couldn't be happier.",
    "date": "6 months ago",
    "verified": true,
    "reviewedAt": "2025-11-26T13:47:41.252000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We are so pleased with our new roof and gutters!!!! When Paul came to look at our roof and talk with us, we had so many questions but at the end we new that we wanted Modern Day roofing! From then on every person we talked to from the company was friendly, informative, and respectful. Our roof and gutter-system were installed and everything cleaned up in 2 days. Wesley and Allen would stop and answer any questions we had and you could tell the crew had worked together alot and knew their job. Thank you for all your hard work!!!\nThe roof looks great!!!!",
    "date": "6 months ago",
    "verified": true,
    "reviewedAt": "2025-11-25T01:34:09.406000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The crew Modern Day Roofing sent to do my roof were comprised of some of the most professional and kind construction workers I have ever met. They took great care of my house during the project and their craftsmanship could not be better.",
    "date": "6 months ago",
    "verified": true,
    "reviewedAt": "2025-11-04T23:13:01.407000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "New Roof with repairs. They did a wonderful job. Very satisfied with the work. Very neat, quick and quality work. Best price apples for apples. We would defiantly hire them again.",
    "date": "7 months ago",
    "verified": true,
    "reviewedAt": "2025-10-28T16:01:05.811000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great customer service! They were able to install a day before scheduled and complete it same day. We are very pleased with the work they did.",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-30T18:53:10.668000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We had a lot of damage from hail. These guys came and helped me with my insurance claim. I was so happy how it all turned out. It was in a timely manner. And they came back on there own to check for any warranty issue a year later. Never had a roofing company come back and do that. I like my experience and will use them again.",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-23T16:39:02.944000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Paul Vanwagoner was great. The whole process from beginning estimate to finale product was amazing. We have a 150 year old house with an old roof that was in need of repairs. The finale product was amazing. So happy with our new roof.",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-23T15:59:46.280000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing replaced the shingles on our roof. Material arrived on schedule to site and then the crew arrived at agreed upon time. Job was completed in one day with crew cleaning up site after completing work with the yard as clean as when they arrived. I would highly recommend Modern Day Roofing for any roofing needs you may have.\n\nSteven Simmons",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-21T22:27:14.537000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The roofing process was well done and completed on time. I especially appreciated the excellent cleanup at my address. My deck was actually cleaner than before the roof work began. Thank you!",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-15T14:19:05.492000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "They did great work. On the installation day, they showed up at 7 am, as advertised, and were finished before the end of the day. They were polite, professional, and the results look fantastic.",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-12T15:24:07.330000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Chris Duncan was very professional and answered all my questions, the two other contractors I talked to didn't impress me.Chris took his time to explain the company and there product. I was very pleased with him ,all the guys that installed the roof was nice and worked very hard .Several of my family and friends said that it made my house a new house. I have given out several of Chris's business card's. I am very pleased with Modern Day Roofing .",
    "date": "8 months ago",
    "verified": true,
    "reviewedAt": "2025-09-08T18:25:45.853000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing and Chris Duncan are top notch! They explained everything I needed to know about the roof to be installed. Everything was on time and it looks fantastic! Highly recommend!!",
    "date": "9 months ago",
    "verified": true,
    "reviewedAt": "2025-08-22T19:37:31.474000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "The new roof looks great and they did a great job at the cleanup afterwards",
    "date": "10 months ago",
    "verified": true,
    "reviewedAt": "2025-07-25T16:52:33.592000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The team showed up at 630, was setup by 700, started working and was done by 1230!!! AWESOME JOB GUYS!!!!!! They removed two layers of shingles prior to install the new one and I have yet to fine a nail on the ground, they cleaned all the debris up before leaving and about an hour after leaving another member showed up to go over the yard and around the house in case they missed something. AMAZING!\nThey replaced three sheets of board that had leaked and replaced all the vent boots, which look amazing.\nAll in all, YES! I would definitely recommend them to anyone!!!!\nThank you all so much for the roof, It looks awesome!!!",
    "date": "10 months ago",
    "verified": true,
    "reviewedAt": "2025-07-22T15:36:37.367000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "My experience with this company was nothing short of awesome. I have a 6 year old metal roof that had a persistent leak around a vent pipe despite a recent boot replacement by another company. The repair estimate from that other company involved replacing half the roof, which seemed extreme to say the least since they suggested it might be leaking at the margin of the boot. Trey Hylton of MDR listened to my concerns and caulked around all the boots and other potential problem areas at no charge during my estimate appointment! He was courteous, punctual, and professional and I most highly recommend him and MDR for repair and maintenance work.",
    "date": "10 months ago",
    "verified": true,
    "reviewedAt": "2025-07-08T19:51:18.870000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing is simply the best! Professional yet friendly office personnel and an extremely competent roofing crew, I would highly recommend their services.",
    "date": "11 months ago",
    "verified": true,
    "reviewedAt": "2025-06-21T15:24:11.067000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Very pleased. Chris Duncan was professional, very knowledgeable and a pleasure to deal with.\nSierra kept us informed and answered all of our questions. The crew was great and completed the work quickly.",
    "date": "11 months ago",
    "verified": true,
    "reviewedAt": "2025-06-11T16:32:18.032000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great job! Crew was fast, efficient, and thorough. Roof looks great and clean up complete. I highly recommend Modern Day Roofing for your next roof replacement.",
    "date": "11 months ago",
    "verified": true,
    "reviewedAt": "2025-06-05T21:25:19.943000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I was very pleased with the work that was done! I highly recommend Modern Day Roofing!!",
    "date": "11 months ago",
    "verified": true,
    "reviewedAt": "2025-06-04T13:09:02.364000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Jake Perdue did an excellent job. Great salesman. Nice and personable. Good person to have on staff.",
    "date": "11 months ago",
    "verified": true,
    "reviewedAt": "2025-06-03T15:11:47.758000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I love my new roof!! My roof was severely damaged from age and hurricane Helene. MDR did an excellent job fixing the damage and replacing the roof!",
    "date": "11 months ago",
    "verified": true,
    "reviewedAt": "2025-06-02T14:50:09.648000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Absolutely amazing Karman was the best she really took the time to answer every single question I had. When walking into the office I was promptly greeted and definitely felt welcomed I would highly recommend them.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-30T15:34:32.844000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Did a great job! Highly recommend!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-27T21:00:16.358000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "After talking with a few roofing companies we settled on Modern Day Roofing. Price was not a factor in that the jobs were all in line with each other. For us, it was the presentation. Modern Day had a much more pulled together presentation that included copies of the contracts for all 3 price options and actual samples of ALL the materials. Trey was very professional and answered all of our questions. On the day of install the roofers arrived promptly at 7am and the job was finished by 1130am. Our roof was a standard ranch . We are very satisfied with our new roof.\nThank you Modern Day",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-27T19:14:00.257000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Sierra in the main office and Trey a field sales representative and consultant are amazing. I can’t say enough good things about this company and the people that are working for the company. They were genuine down to earth respectful, professional, punctual what they said they would do, they did. I would recommend this company to anybody",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-16T18:23:59.741000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "The team tackled a tough project that another contractor had messed up and left me with. They were great and their work was just as promised and on time. I highly recommend!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-13T21:08:37.811000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Just wanted to say thanks to Modern Day Roofing. They did a fantastic job, the crew was great and the roof looks awesome. If you are trying to find a roofing company I would highly recommend you!!\nThanks Robert",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-12T21:22:37.414000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "The men worked hard all day and did an excellent job. I would recommend this contractor to anyone",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-05-05T20:32:43.320000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Workers showed up on time and were able to get the job done in 1 day. They were professional and efficient. Trey was my salesman and he did a great job showing and explaining all of the products and packages.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-04-30T16:42:18.598000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We recently had a new roof installed by Modern Day Roofing, and we couldn't be happier with the results! From start to finish, the entire process was smooth, professional, and efficient. The team was punctual, respectful of our property, and kept us informed every step of the way.\n\nNot only does the new roof look fantastic, but the quality of workmanship and attention to detail really stood out. It’s clear that Modern Day Roofing takes pride in what they do. We highly recommend them to anyone looking for a reliable, honest, and skilled roofing company. Thank you for a job well done!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-04-25T18:25:45.632000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Chris and Diaz were great. Roof kept leaking and they stayed with me to make sure it was fixed. Worker’s were neat and answered questions I had!\nI will recommend them to anybody.\nKen Alderman",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-04-18T20:04:27.153000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I would strongly recommend Modern Day Roofing for all your roofing needs. Great service, timely response to questions, on time work, and quality craftsmanship. Call today for a quote and tell them Shannon Roope SENT YA.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-04-17T21:46:33.637000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great company to work with. I highly recommend!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-04-16T16:44:17.942000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "I had a great experience with Modern-Day Roofing. Once my roof was inspected and it was determined there was enough hail damage to warrant an insurance claim to replace it, the process went super smooth. They took care of all the paperwork and correspondence with my homeowners insurance. Payments were received very quickly. Once we set a date for work to begin, they showed up bright and early and completed the roof within a day, not only that...I was able to get my whole house repainted as well. Altogether, it took two days to complete everything. They worked very efficiently and everything looked amazing from the roof, paint job, gutters, and everything else in between...it turned out great. Once they were done they cleaned up all the debris as if they were...",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-03-31T18:20:12.231000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Thanks Karmen and Chris for your service!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-03-27T15:09:36.580000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "The entire process was smooth and easy. Jake was friendly and timely, he came out to inspect the roof and brought estimates to help me find the option that best suited my needs. The crew came out on the day of install and knocked it out and had it all cleaned up pretty quick and the roof looks great.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-03-26T16:20:30.310000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Trey was amazing to work with, he got my estimates to me quickly and was very good to work with overall.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-03-22T18:09:44.206000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Joe & Austin were the representatives that met with us. They were very professional, courteous and came prepared with information to answer all of our questions thoroughly. I highly recommend Modern-Day Roofing.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-26T17:51:26.112000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I had a roof put on. Austin, Joe and team did a fantastic job! When they were done the only way you could tell they had been there was a new roof. The crew worked clean and efficiently. This company is amazing!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-26T13:39:58.722000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Thanks Joe Furrow with Modern Day Roofing!! We appreciate all you’ve helped us do!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-26T11:50:50.420000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Joe Furrow with Modern Day Roofing has excellent customer service. Wouldn’t choose any other company!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-26T01:53:35.526000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "MDR is one of the best companies in the NRV. They care so much about the community and their clients. Joe Furrow is phenomenal and focuses on exactly what his clients need! 10/10 recommend for ALL roofing needs!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-26T00:30:55.122000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Whole process went smooth. Chris performed an inspection of my roof, walked me through his findings, explained replacements options in a way that I could understand. The install crew was timely, respectful, and clean. Every part of the process was what I expect from a reputable and professional company.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-08T21:06:08.252000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Best EVER to work with! So amazing in every way possible!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-02-05T18:54:16.654000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great service. Awesome job with the roof we are satisfied.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-01-27T16:51:18.920000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Everyone from Modern Day Roofing was a pleasure to work with! They gave us a start date 6 wks out and kept the exact date and time for our project - impressive. Thank you Trey, Wesley and Cierra for all of your guidance. Top quality work for a fair price!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-01-21T22:37:24.648000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Met with jake for a roof inspection and it was found we needed a new roof. Jake was great and explained everything that needed to be done and the types of shingle choices we had. He gave a very itemized quote that broke down all cost. After deciding which one we wanted to go with our roof was installed in September. The crew did an amazing job from tear off to installation. When finished they cleaned up and it looked like they were never here. Highly recommend jake if you are looking for someone who can explain and guide you through the process of a new roof. The installers are second to none on the quality of their work!!!!!!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-01-17T20:42:40.756000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Fast, honest and reliable. My roof was gone and they reached out to me saying they could help. The guys was here helping me under 24hrs . I experienced Consistent communication and care the entire time. 10/10 recommend. I am grateful for your time and work. And I think the roof looks great for it being emergency care.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-01-14T20:29:08.498000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Our roof was damaged during Helene and this company responded quickly. Everything they did was professional and competent. Trey was excellent and kept us on track from start to finish. Salvador and his crew started at 8 am and finished at 5pm - amazing. Five stars to everyone!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-01-14T17:56:16.765000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I highly recommend Modern Day Roofing! My call was taken by a very helpful person who scheduled me that same day! Trey was prompt, professional, and very compassionate regarding a frustrating roofing situation. These factors along with Trey’s solution oriented approach, make him and this company worthy of a five star rating. Thank you, Modern Day Roofing and thank you, Trey.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2025-01-04T19:34:29.289000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Very fast! Great communication! Left job site very clean! Would recommend this company to anyone! Crew did a very good job!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-12-21T01:06:38.052000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "We had a small amount of wind damage to our roof that was installed by another contractor. After one call to Modern Day Roofing, we had a professional, courteous, and knowledgeable roofing technician come out and tell us what we need. The scheduler found out that the shingles we had on our roof were discontinued and went really out of his way to find a distributor that still had a few bundles left. After obtaining the shingles our technician showed up on time and did an excellent job replacing the damaged shingles. Modern Day Roofing will be our go-to roofer and will be enthusiastically recommended.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-11-08T22:06:33.684000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "They were very nice and helpful. They completed the job quickly and efficiently.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-11-07T23:46:35.921000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "I called Modern Day Roofing at the beginning of October 2024 and had an issue with an exhaust pipe in my roof. Chris Duncan called me in a timely manner and set up an appointment for us to meet. Chris was very prompt, professional and performed the repairs in no time at all. I highly recommend Modern Day Roofing for your roofing installation / repairs.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-10-31T16:41:30.027000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I highly recommend Modern Day Roofing! We were in a tight spot and needed a roof inspection to close on our mortgage. They managed to fit us in the same day and provided the report immediately. They even went the extra mile to revise the wording of the report to satisfy our picky lenders.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-10-17T00:54:56.143000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We are very happy with our new roof. They were on time, efficient, friendly and cleaned up after themselves. Highly recommend them.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-09-28T23:16:52.105000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The receptionist, Sierra , is so helpful and sweet! I def recommend this company!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-09-19T18:50:12.405000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Excellent company! Chris is great to work with. From a timely quote to the finished product, communication from Chris and his team was second to none! Modern needed two days for our installation and they had to reschedule a few times due to weather issues (extreme heat and rain). We are glad that they didn’t want to expose their roofers to extreme heat and appreciate that they didn’t want to risk our roof being exposed to the elements if there was a risk of rain. They closely monitored the weather and our roof ended up being installed on two beautiful consecutive days. They protected decking and landscaped areas and cleaned up very well when finished. The roofers were very focused, skilled and their teamwork was evident. We have already received several...",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-09-16T22:46:40.241000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great Experience. Chris and the team helped me navigate the whole process and were extremely helpful throughout the process. They helped with general insurance questions and were extremely patient as I worked with my insurance company to get everything handled. I would absolutely recommend Modern Day Roofing to anyone who asks about roofing work.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-09-12T12:56:36.946000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Chris and team at Modern Day Roofing were fantastic to work with. From the beginning, Chris stepped us through the entire process, from what was failing on our old roof to how the new roofing system and service warranties would protect our home for decades to come. Chris did an excellent job at answering our questions and making sure we felt confident with what has happening each step of the way. The roofing team also did an excellent job and had the entire project completed before we got home. Highly recommend this company to anyone needing roof work done!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-09-09T16:27:23.779000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "We are very pleased with our new roof and everyone was easy to work with and very professional. They finished in a timely manner and cleaned up very well.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-09-04T22:15:12.478000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing came highly recommended from friends and acquaintances and we had a wonderful experience with them. They communicated well, their price point was less than other roofers, and did a fantastic job!\nWe highly recommend them!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-08-30T21:14:48.126000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did a fantastic job replacing the gutters on my home. Phillip and the whole team were skilled, competent and communicated exactly what to expect throughout the process. The cost was reasonable and my home looks so much cleaner and more elegant now. Highly recommend this company!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-08-24T10:51:02.429000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "We were very pleased with the whole process of replacing our roof.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-08-16T13:15:59.862000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We had Modern Day Roofing put our new roof on in July 2024. They came over early in the morning, laid down the net to catch nails and debris. By 11:00 they had the old roof off and started putting the new one on. They also did one of our storage buildings and they had everything done by 8:00 that night. They came back the next day and finished cleaning up and making sure everything was to our satisfaction. GREAT GROUP to work with. Very courteous, nice bunch of workmen who came to the house. Highly recommend this company.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-08-08T20:06:43.842000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Five stars doesn't even come close to how happy we are with our new roof by Modern Day Roofing! Nor does it come close to how much everything about the process was exceeded beyond our expectations. After 3 estimates and much research we chose the best offer, the best shingle, and by far the best installer company one could wish for. Our representative from Modern Day Roofing was Chris, who was so helpful and easy to talk to, not to mention quite willing to climb up our insanely high peaked roof, and climb around an unfloored attic in order to discover any issues. Always helpful, answered every question, visually showed us how the components work together: our new GAF Timberline UDHZ roof system has transformed our home from the inside out. Austin and Chris love what...",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-08-01T15:43:25.880000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Excellent customer service from describing the roof system with Chris Duncan, to scheduling with Karman & always getting a call from company personnel (ie. project manager)when a drop off or stop in to plan the job. The day of the roof replacement, I got a knock on the door around 7 am and the anticipated banging and roof removal began. It was a little tough on our 3 dogs, but we stayed home with them for the day to help them cope with noise. They got used to the noise after an hour or so and settled. We left for dinner around 6 and they were in the clean up process around the house. The roof looks amazing and the clean up was great to where we felt comfortable enough to let our dogs out in the backyard when we got home from dinner. We anticipated a much higher cost...",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-08-01T13:29:32.328000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Had my roof done back in march. It looks GREAT! Everything was done quick and professionally. Thank you modern day roofing!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-07-25T11:35:25.543000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "MDR is a Great Roofing Company. From the initial Rep inspection and estimate of our roof replacement to the final shingle install - Modern Day Roofing has been on-top of every aspect of the process. They provide a exceptional roofing product and their representatives, both admin and crew are easy to work with and very concerned in providing the customer the best roofing project available. MDR pricing is in-line with other roofing companies and we are very pleased with our new roof, therefore we Highly Recommend Modern Day Roofing.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-07-24T11:01:38.239000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Fast, Fair, Friendly, Quality service. The sales person worked with me and my budget for a solution to my leaking roof. The repair crew was so quick I didn't have time to make them tea. It took a bit to get on their appointment schedule but when you want the best and done right it is worth it. The email updates were quite helpful. The follow up phone call again is a sign of a company that cares about the work and service they provide. Thank you!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-07-23T17:09:41.030000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Had them put on a roof in 2021. They finished the job quickly and the roof looks great. This year I thought there was a leak and within 1 hr of contacting them an inspector was onsite to evaluate the problem. It turned out the leak was not from the roof after all, but had it been a roof leak they were on top of it! Great experience!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-07-18T16:25:50.053000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "The team at Modern Day Roofing, and their representative Chris Duncan, were an absolute pleasure to work with on our roofing project. They clearly explained all of our options, answered our many questions, and even worked with us to find a convenient time to start the project. Their workers were prompt, and did a thorough job cleaning up the site once they were done. The roof looks amazing, and we couldn't be happier. We'd recommend Modern Day Roofing to anyone looking for roof-work!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-07-09T13:44:23.487000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We had our roof replaced by Modern Day Roofing in June, and the experience was excellent. The team was efficient and friendly. Our representative, Chris, was exceptionally kind and patient. The warranty plan they offered was reasonably priced and very comprehensive. The crew who worked on the roof were hardworking and considerate, ensuring the job was done to our satisfaction.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-26T17:28:18.484000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did an excellent job on my roof! Chris especially was great. He explained everything well, was very kind, and I never felt pressured or anything of the sort. Prices were also very fair in my opinion. I would definitely recommend them and will use them in the future!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-18T23:01:39.928000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Fast and easy to work with. Roof was badly damaged during a wind storm. They did a fast temporary covering until they could replace the whole thing. Very happy with the results!",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-14T17:21:52.295000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great fast work. And awesome followup",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-12T21:07:55.339000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Christiansburg",
    "rating": 5,
    "quote": "My husband and I had a new roof put on our home in early 2023 by Modern Day Roofing. We have been so pleased with it… the roof is beautiful and they did a wonderful job. I would totally recommend them to anyone who needs a new roof. They were very professional and nice to work with. We would absolutely use them again and recommend them to anyone who needs a new roof. \nPaul and Sharon Sarver-Christiansburg",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-12T19:40:22.400000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Andrew and Cory were great to work with and extremely knowledgeable. They were very professional and willing to help. We will definitely call Modern Day Roofing for our future needs.",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-07T18:40:23.882000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing is professional , detailed with every aspect of their work, clean up spotless and remarkable salesmen and workers. I highly recommend them",
    "date": "1 year ago",
    "verified": true,
    "reviewedAt": "2024-06-05T18:57:15.701000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "I was very pleased with their service",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-31T14:29:30.424000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "They fixed part of our roof that was causing a leaky skylight. They were able to get the work scheduled and completed fast.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-28T15:47:08.634000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "It was a wonderful experience. They were very quick, thorough and their prices were lower than area competitors.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-23T21:26:26.191000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did a great job! Timely, clean, and honest.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-23T21:05:55.081000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day was a dream to work with from start to finish - friendly and eager but not aggressive. The price was spot-on for the value. The crew was efficient and hard working, and considering the mess that is a full roof replacement, my yard was pristine when they finished. I highly recommend Modern Day! Professional, honest, and 100% committed to doing it right. You won’t regret using them!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-23T20:53:21.728000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Guys done an excellent job on the roof! They showed up ready to work and never missed a beat. Cleaned everything up when job was done and it looked great!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-15T21:08:39.363000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We are very impressed with the quality of work and materials as well as the integrity of this company. Everything went as scheduled and even the unplanned was well taken care of. While they were taking off the old roof, a shingle broke one of our ground level windows and Modern Day Roofing was very quick in getting it replaced. We highly recommend this roofing company!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-15T17:47:07.831000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing was really easy to work with good communication. They replaced my roof in on Day excellent job cleaning up after finishing. Highly Recommend them for your next roof replace!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-14T17:47:50.629000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "All of our interactions with Modern Day have been stellar. Joe has been great to work with. Low pressure sales, personal communication that answered all our questions and concerns, easy scheduling, and super fast installation! We went with the Gold plan: 30 year warranty on workmanship and 50 years on the shingles. I loved the roofing system. Things have come so far from the “tar paper” days. And the fact that the warranty is transferable, well that sealed the deal. We had friends who had referred us and our experience mirrored theirs. While our roof isn’t overly complex, it’s 30 feet off the ground in places. We counted eight guys working. They arrived at 6:30 in the morning and started preparing. The shingles had arrived the day before. By 11:00 that same morning,...",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-10T21:03:48.085000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The MDR staff is very knowledgeable and professional. The crew that replaced my roof did a great job and was very quick. I highly recommend MDR.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-05-03T14:49:04.528000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "New River Valley",
    "rating": 5,
    "quote": "Thank you Modern Day Roofing for becoming a business sponsor of the New River Valley Garden Tour. The Friends of the Library appreciate your investment in our community.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-04-30T16:33:50.679000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We investigated several roofing companies before deciding on a company for a major roofing project for our home.\n\nAfter meeting Joe Furrow, he described the Modern Day Roofing process and explained the philosophy of the company. He was able to clearly explain the process from start to finish.\n\nWe compared notes from all the companies reviewed but we were very impressed with the information provided by Modern Day Roofing.\n\nOn the day of service, the workers arrived promptly that morning and the workers continued until the work was completed.\n\nWe are very satisfied with the end product. The new roof is a great addition to the Look, Style, and Protection of our home and we have received many compliments from our neighbors.\n\nWe are happy to recommend Modern Day Roofing....",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-04-23T15:16:02.565000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We were so impressed with this company! Not only were they professional, courteous, and friendly, but they were also super fast. We had our new roof completely installed in less than 3 weeks from the time we first reached out to get a free estimate. Thanks to Joe and the rest of the team at Modern Day Roofing for a job well done!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-04-11T23:44:17.917000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day was fantastic to work with! From the beginning stages of walking me through all their materials and what I could expect (even before I chose them), my sales Representative, Chris Duncan, gave the best customer service. They also gave a competitive bid for the work and completed the whole roof replacement in just one day.\n\nI highly recommend Modern Day Roofing to anyone needing commercial or residential work done. Here are some pictures of the work they did for us from The Salvation Army Church Building. The last photo is of Chris Duncan walking around our property with a magnet to make sure no nails or debris were left behind. Amazing customer service!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-04-10T13:31:18.023000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day was very professional and accommodating! I would definitely recommend their services!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-03-29T21:07:30.033000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Awesome company. Would highly recommend to all my family and friends.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-03-22T01:32:47.367000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I highly recommend Modern Day Roofing. The owner and staff are so sweet and nice. You won't regret this company!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-03-20T21:04:14.794000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Chris and Modern Day Roofing were excellent to work with. Responsive and informative, but not pushing. Very professional, got the job done effeciently, and now our home looks brighter and practically brand new. I appreciate that they also work with a contractor to provide soffit, fascia, and gable work without my having to find a separate contractor. I highly recommend Modern Day Roofing.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-03-20T16:58:36.028000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "I operate a remodeling service specializing in interior remodeling. When one of my clients requested the addition of a skylight to a bathroom I called Modern Day Roofing to complete that portion of the project. Austin and Bowman were responsive to my needs, and they helped me select the right size and materials. They executed the work efficiently and cleanly, collecting the debris stripped off the roof. We will be happy to have them return for a future project.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-03-18T20:18:37.934000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Wonderful work! They brought in a crew and completed our roof in 4 1/2 hours. They were kind and respectful. The guys cleaned up nicely after finishing the work as well. Very impressed!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-02-29T19:10:40.516000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Joe was just awesome! Arrived the very next day ..said he was going to get the new roof on the very next week and it was DONE!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-02-12T17:18:43.022000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "So friendly. Chris is great guy. He helped so much.\nRoof looks great. I appreciate you all. I could not gotten any better service.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-02-09T20:37:22.472000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I just had the best experience getting a roofing estimate from Chris. He was very thorough, explained everything, and was super patient answering my many questions. I never thought I'd be excited at the prospect of a new roof, but I am now.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-02-05T16:16:18.102000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Did great job, and fixed the problem thanks",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-02-02T21:10:01.012000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Had a roof replacement done last Fall by Modern Day. The process was easy. Great consultation with leadership to explain our options and help us make a good choice. The work was done expertly a few weeks after we signed the agreement. The roof looks great and quality is top notch. I highly recommend you consider this company - sometimes you get what you pay for and I very much feel that way in this case. Don't take a chance with your roof, rather just hire the professionals at Modern Day Roofing and you will get an awesome result!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-02-01T18:53:14.744000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The sales team did a better job than anyone else I contacted to explain the products, process, and warranty. The work crew was quick and efficient but did an excellent job. When there was a minor issue with the fit of two skylights, they arranged for it to be taken care of and the work was well done. They are a very professional company and I would recommend them to anyone needing a roof.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-01-18T18:47:10.666000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Bowman was extremely respectful I have nothing but nice things with this company the owner is definitely training his staff with respect and polite much recommended",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-01-16T20:08:59.075000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did an excellent job with my full roof replacement. My insurance company tried to make things difficult but Chris was excellent to work with and kept communications rolling with the insurance company so that we could get done what was needed in as timely a manner as possible. It's good to have the old wind damaged roof finally gone and the new tiles look way better.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-01-16T18:05:47.680000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "MDR did a wonderful job handling my roof replacement after a tree caused some major damage. The team was quick to get out to survey the damage and get a plan together. Once the insurance issues were worked out, they had my roof off and replaced in less than 12 hours. Karman, in the office, was great to correspond with regarding the paperwork and insurance processes. Great experience all-around!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-01-16T15:36:19.091000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "After awaiting quotes and responses from several other roofing companies, Modern Day Roofing not only communicated quickly, but promptly offered quotes, an abundance of information and options and scheduled our roof replacement as soon as possible. All employees are professional and knowledgable and our roof was complete in no time, with no disruptions in our daily schedules. We highly recommend Modern Day Roofing due to their quality work, combined with great follow-up and professionalism.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2024-01-15T17:07:38.679000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I needed Bowman to take a look at a small leak on my roof and he said he would come out to look at it on the same day I called. After he finished repairing my roof, he said I didn’t owe him anything and charged me nothing. They will always have my business. Great company!!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-12-30T03:23:56.084000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Thanks for a wonderful job in taking care of my roofing, guttering and trim needs. Our home looks much better, and will be durable and protected for years to come. Everyone listened to my needs, was excellent to work with, timely, neat, professional and efficient.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-12-09T02:39:38.528000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "We want to thank the entire Modern Day Roofing team for their high quality work and integrity. My wife and I highly recommend Modern Day Roofing to provide all your roofing needs!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-12-01T20:09:01.902000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did an amazing job replacing my roof. And the warranty is awesome! Check them out. Give them a call when you need a new roof !!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-29T17:51:03.755000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I couldn’t be happier with the job done on my roof by modern day roofing.\nThe crew arrived a few minutes early and immediately began preparing for the roof tear off. In less than an hour the old roof was removed and whatever repairs needed were done. Everyone knew their job and did it very professionally. The guys on the ground kept the debris picked up and thrown into the dump truck. By the time they were finished the only evidence of them even being there were faint tracks in the grass from the truck.\nChris Duncan was the first salesman to schedule coming by to give me an estimate and I knew when he left that Modern day roofing was going to get the job even though I had 2other companies scheduled to come and give estimates. Chris kept me in the loop and answered...",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-18T03:44:27.822000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Our experience with Modern Day Roofing was positive from the start! Chris arrived on time to provide a quote and answer any questions that we had. The shingles were delivered the day before installation and the work crew managed to get the house and separate garage done in 1 day! The guys cleaned up everything and left the yard as they found it. Chris came back the following week to make sure everything was done to our satisfaction. Well done MDR!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-14T20:56:38.552000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "The crew did an excellent job of replacing the bad sections of our leaking roof and an excellent job of replacing the siding between the 2 levels of our roof. Looks great!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-12T02:08:30.920000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "These guys are great . Professional and did the best job !!! Highly recommend them . The best ! They cleaned up every morsel you would had never known they were here . Craftsman are excellent",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-10T21:42:26.793000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "The job was done on time, with quality workmanship.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-10T21:27:11.648000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day did a great job on my chimney flashing and pipe boot replacements. They were very responsive and were on the job within two days of signing the contract to do the work. Highly recommend these guys!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-11-08T16:46:14.713000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "My parents, Carvel and Agnes Brumfield, recently had a new roof installed by your company. They were extremely pleased with Chris Duncan from the beginning to the end of the roofing process. He was very thorough in his explanation of explaining everything to them. He was polite, professional and very helpful and willing to answer any of their questions.\nChris-Keep up the good work!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-10-30T18:04:59.163000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Corey and Karman were great to work with. Great job on the roof. They cleaned up after the roof was completed not leaving any nails or debris and were careful not to hurt any of the bushes and plants around my house.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-10-29T14:56:01.833000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "It has made this older home look so much better for an older home. Modern Day cleaned up and no mess was left. I would recommend them and have already.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-10-17T23:10:48.508000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Extremely professional and showed up on time. Willing to meet all my needs and expectations for a roof. They have been an absolute pleasure to work with. Highly recommend to anybody who needs a high quality roof for the rest of your life.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-10-12T20:41:34.709000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "My husband and I were at our wit's end after dealing with a no-show and unresponsive roofer who had not properly repaired our problem. We then found Modern Day Roofing and they were a breath of fresh air! When we called and explained our problem\nand concern about a forecast of rain and possible leak, they sent\nover the very next morning, the friendliest and most professional worker with all right knowledge and tools to investigate and fix our problem! Not only did he quickly identify and fix leak, he also went above and beyond by walking our entire roof and doing a courtesy evaluation to ensure no other issues.\nWe shared a cup of coffee afterwards and he shared company pics and jobs--what customer service! Modern Day Roofing isn't just a roofing company--they're...",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-10-12T16:37:44.086000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Chris came by a few days ago, took a full review of our roof. I was very impressed with him, he was professional. He went through everything he saw on the roof. And it is not perfect, but he was honest with me and said, we could probably hold on another 5 years. He could have said you need another roof now, it won't hold another winter, and I wouldn't have knowen any difference. But he didn't do that to me.\nThank you Chris for your honestly and your kindness.\nVicki Hudson",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-09-19T22:37:54.708000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Was great to work with everyone at Modern Day! Austin and Chris were easy to work with and super helpful with navigating an insurance claim for the first time, and the crew who installed the roof were great. I would highly recommend!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-08-30T19:37:35.227000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "They did an outstanding job all around. They explained the process very well, completed the job when expected and installed a quality roof that looks great on our house. I really appreciated the detailed photos and proposal they provided. It helped us better understand what our options were and exactly what they would be installing.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-08-02T13:20:41.165000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "I am truly grateful for the hard work from this team. They did an excellent job removing my old roof and installing the new roof system. My house is now standing out from others in my neighborhood. Don’t go with the cheapest bidder on something that is as important as your homes roof. This team uses quality materials and have great attention to detail. Thank you so much!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-07-29T14:59:26.871000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Took great care of replacing my roof. Made my life easier on several occasions, and did not charge me too much.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-07-24T01:10:00.850000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did great work on our new roof in a timely manner and communicated well all along the way.\nKent Tarbutton",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-07-18T19:46:05.662000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "They are just great,quick,and very good at what they do.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-07-14T21:20:13.306000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great experience! Completely satisfied with work! Would definitely call them again and refer others to them! Thank you!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-07-14T17:25:44.267000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "After roof damage, this team stepped in and worked with me to get the highest quality single. Joe was awesome from start to finish. The team that came and installed the roof made it look easy but worked hard and was done in 1/2 a day. Highly recommend this crew, there simply the best 👌 👍 I also had a small add on during the time they were working on my roof. Joe has it quoted, added on and done fast. That awesome service that goes above and beyond",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-07-06T02:12:53.574000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "They finished less than a week ago and I already recommended them to two friends that's how good they are.\n\nThe crew showed up, got ready, and got my roof done so efficiently.\n\nIf you need a roof, hire them.",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-06-28T03:47:49.151000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "This company is simply the best. From the time I got a quote, they answered all my questions. The crew was professional, friendly and finished the job in one day. Super recommend. Got my roof done a couple of weeks ago !!!",
    "date": "2 years ago",
    "verified": true,
    "reviewedAt": "2023-06-06T18:35:10.944000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "I am very happy with the work that Modern Day Roofing did!! They said it would be done in six weeks but they called and said they would be at my house 3 weeks earlier.They were honest and open with all the issues they found with my roof and the repairs that should be done. There was no pressure from them to fix the problems but I wanted to have my roof fixed the right way and have no issues years from now. The workers worked hard. They found 2 layers of shingles and half the roof had to be replaced because of rotten wood. They completed everything in one day before it rain the entire weekend. I highly recommend this company for replacing a roof. Everyone was super nice and friendly. They workmanship was excellent!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-05-30T19:41:09.413000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Very impressed with the work, speed of installation, and warranty. I would definitely recommend to others!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-05-04T01:47:54.851000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We are very pleased with our roof and gutter protectors. The crew was very efficient. Would highly recommend this company.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-05-02T22:14:13.825000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Very satisfied with Modern day roofing. These guys installed and worked with record speed. Did a fantastic job. Highly recommend.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-05-02T19:02:52.613000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day installed a new roof. It was a simple process and the new architectural shingles looks great! I would highly recommend them for any roofing job.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-05-01T18:56:41.199000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing did an excellent job Installing our roof- They answered the phone call within 24 hrs. like there ad said- They was fast efficient, and we would definitely recommend them.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-04-29T02:25:07.504000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Competitive prices. Unbeatable work. They put a roof on my mother in laws house in less than a day. We could not believe how fast and easy they made this process.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-04-27T23:08:25.817000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "One of the best decision I’ve made so far concerning my roof is going with modern day roofing. They do a great job.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-04-27T21:48:47.765000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-fuchsia-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "I messaged modern day roofing asking if they could donate a few shingles for my chicken coop. Expecting a no as I have heard from other roofing companies they actually said yes. Not only that they can match the shingles I already had!! Although my roof was replaced just before I bought my house they will definitely be my 1st call for any roofing needs!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-04-26T21:36:11.630000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "We had them come replace our old leaky roof! They showed up at 8:30 am and finished at 5pm!\nThey made sure there was no trash anywhere, even in my flowers!\nThey asked if we needed them to do anything else before they left!\nVery impressed and highly recommend them to anyone needing any roof work done!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-04-26T17:46:34.903000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Austin and his team came to look at our roof after it had leaked during a storm. We had several companies come out, and Modern Day was the best! They were knowledgeable and responsive. They fixed our roof in advance of the next storm and we have had no more leaks to date.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-02-20T19:44:49.970000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "So professional. Everyone was so polite and friendly. The employees went far and above their responsibilities. I asked them to paint my white tubes on the roof, they did so without hesation. I would recommend them to anyone. Well worth the price I paid. Thanks to everyone. God bless.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2023-02-15T22:07:59.550000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "These guys knocked it out of the park! I needed a new roof on my house in a hurry and they did not let me down! They were quick, clean, and professional. They installed a great roof with a 50 year warranty. I will definitely use them again!\nAlways use Modern Day Roofing!\nFrank K",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-10-16T17:49:10.979000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Our old roof/skylights were removed and replaced while we were traveling. Crew returned to finish and do a final walk after we returned.\nVery pleased with whole project.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-10-11T15:20:58.384000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Business is responsive and professional. Our new roof looks beautiful! There was a delay on a back ordered part, but they communicated about the timeline and kept us waterproof in the interim. I love the fact that the owner answers the phone when you call!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-10-08T11:04:25.396000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-rose-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Highly recommend! Super professional, great value, and really quick. They have all 5 stars for a reason :)",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-10-05T18:53:26.966000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-orange-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing recently came and installed a new roof on my mother’s house. They did an amazing job and I have been incredibly pleased with the results. Austin and another technician were a pleasure to work with! We will definitely be using Modern Day for all of our roofing needs in the future!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-10-04T17:42:16.124000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day roofing did an excellent job of installing a new black metal roof on our old farmhouse. They kept us updated and informed on everything throughout the process and were great to work with. We would definitely recommend them for all of your roofing needs.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-09-30T18:28:36.732000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Quick work, good value, roof doesn't leak anymore!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-09-29T18:26:46.166000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Clear and transparent through the whole process, got it done with no drama or fuss. Super friendly people, too!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-09-29T16:58:33.179000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "They are great to work with and did an awesome job replacing the roof\nStarted the job quickly due to leaking roof.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-09-29T16:24:52.979000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day Roofing installed vinyl siding and gutters on our building. Austin was very professional and prompt in getting our estimate and samples to us. Once the project was underway his crew worked hard and did an excellent job. The entire team was wonderful to work with and I have already started recommending them. Thanks for a great experience!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-09-29T14:46:42.488000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-sky-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "They were able to quickly get on the job to prevent further wind and rain damage after a previous storm. They sent me pics through the day while I was at work on the progress of the work. End of the job we walked around the job and made sure all my needs were completed. 100% professional contractors. I will use them again for any of my roofing needs.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-09-06T18:35:05.294000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-emerald-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Quality service and professionalism. Highly recommend for personal and professional repairs.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-08-26T16:11:15.692000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-violet-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Best price around! Zero complaints",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-08-26T15:59:00.752000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-red-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great customer service n good quality work made me feel like family",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-08-26T15:14:07.693000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-lime-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern Day roofing was very professional and straight forward with what needed to be done on our roof. We ran into a snag with our chimney we weren’t expecting and they found someone to address the problem and got it all done very well. I would definitely recommend them!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-08-19T13:19:24.627000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-yellow-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "These people are the bomb! Great work, on time, and competitively priced. Can’t ask for more than that.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-08-03T21:50:48.447000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-slate-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The crew was on time. They were cordial and professional. The clean up couldn't have been any better.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-07-19T16:56:25.854000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-purple-700",
    "city": "Service Area",
    "rating": 5,
    "quote": "Roof looks great! Did a good job with the old roof removal, new installation and cleanup. Basically completed the home roof in one day. A little bit of a scheduling issue because of rain, but I appreciate that they did not want to open a roof when there was a possibility of rain. Pretty easy to work with. Thanks for a great job!",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-07-13T22:23:20.322000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-teal-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "The roof was inspected and several helpful suggestions were provided regarding options. Scheduling and paperwork was handled efficiently. The crew came out and took care of the issue and got things back to normal in no time at all. During the process any questions were resolved with a quick email or phone call. Overall, very respectful and professional folks to work with, and that was much appreciated.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-06-22T21:07:08.318000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-blue-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Guys did great! Replaced my roof! On time, very professional, clean up was great. Call Modern Day Roofing to get your roof fixed or replaced. Recommend them to all my friends and family. Thanks Austin.",
    "date": "3 years ago",
    "verified": true,
    "reviewedAt": "2022-06-21T22:17:33.092000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-green-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Austin and his crew were on time did a great job very professional and they clean up everything before they leave thanks again guys",
    "date": "4 years ago",
    "verified": true,
    "reviewedAt": "2022-05-21T15:11:33.783000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-indigo-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Modern day roofing has exceptional customer service! Not only did they call me with all the questions and answers but they also followed up by email. The work crew showed up right on time and completed the job in a day! The house looks beautiful and we would highly recommend them!",
    "date": "4 years ago",
    "verified": true,
    "reviewedAt": "2022-05-11T23:43:35.526000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-cyan-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Great work, quick to schedule, & great pricing. I will use again if needed.",
    "date": "4 years ago",
    "verified": true,
    "reviewedAt": "2021-09-06T00:46:03.174000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-amber-600",
    "city": "Service Area",
    "rating": 5,
    "quote": "Workers arrived promptly, worked efficiently and did a very nice job with our roof installation. I was very impressed by their efforts to clean up after finishing the job. Found Austin (project manager) to be informative, supportive and very respectful throughout all our interactions. Now receiving compliments on my new roof from friends and neighbors.",
    "date": "5 years ago",
    "verified": true,
    "reviewedAt": "2021-04-02T19:17:19.264000Z"
  },
  {
    "name": "Verified Google Review",
    "initials": "G",
    "color": "bg-pink-500",
    "city": "Service Area",
    "rating": 5,
    "quote": "Austin was kind, professional and timely. I wanted the roof done quickly so I could get my house on the market and he got me in within a few days of my request. And the new roof looks great!\nApparently he also has a landscaping business which I also hope to use.",
    "date": "5 years ago",
    "verified": true,
    "reviewedAt": "2021-03-20T09:26:34.360000Z"
  }
];


export const reviewCities = ["Christiansburg", "Roanoke", "Salem", "Radford", "Blacksburg"];

export function reviewsForCity(city: string): Review[] {
  const needle = city.toLowerCase();
  return reviews.filter((r) => r.city.toLowerCase() === needle);
}

export function reviewsForCityWithFallback(city: string, count = 6, min = 3): Review[] {
  const exact = reviewsForCity(city);
  if (exact.length >= count) return exact.slice(0, count);

  // Fill remaining slots with general "Service Area" reviews (anonymous
  // verified-Google customers whose review didn't mention a city). These
  // read more naturally on a city page than reviews tagged for OTHER
  // cities ("Sarah T., Blacksburg" on a Roanoke page would be confusing).
  const serviceArea = reviews.filter((r) => r.city === "Service Area");
  const remaining = count - exact.length;
  return [...exact, ...serviceArea.slice(0, remaining)];
}
