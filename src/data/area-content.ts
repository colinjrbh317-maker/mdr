/**
 * Verified city-level facts for Tier 1 service area pages.
 *
 * Every fact in this file is sourced from a public, authoritative
 * reference (Wikipedia city article, NWS Blacksburg, USPS, City of
 * Roanoke, etc). Do not add unverified claims. If you need to add
 * a city, source each field before committing.
 *
 * Used by:
 *   - src/pages/areas/[slug].astro
 *   - src/pages/areas/[area]/[service].astro
 *
 * SOURCES:
 *   Wikipedia: en.wikipedia.org/wiki/{City},_Virginia (2026 retrieval)
 *   NWS Blacksburg past events: weather.gov/rnk/pastevents
 */

export interface AreaFacts {
  /** Most common residential ZIP codes (verified via Wikipedia). */
  zipCodes: string[];
  /** Verified neighborhood / district names (cite source per city). */
  neighborhoods: string[];
  /** Population from most recent US Census. */
  population: string;
  /** Elevation in feet (Wikipedia). */
  elevationFt: number;
  /** Average annual snowfall in inches (Wikipedia 1991-2020 normals). */
  annualSnowfallIn: number;
  /** Average annual rainfall in inches (Wikipedia 1991-2020 normals). */
  annualRainfallIn: number;
  /** Köppen climate classification + USDA hardiness zone. */
  climateZone: string;
  /** Single-paragraph local roofing context, ONLY using verified facts. */
  localRoofingContext: string;
  /** Notable recent severe weather events (NWS-documented only). */
  recentSevereWeather?: string;
  /** Driving distance / time from Christiansburg HQ (Wikipedia or Google Maps confirmed). */
  fromHQ?: string;
}

export const areaFacts: Record<string, AreaFacts> = {
  "roanoke": {
    zipCodes: ["24012", "24013", "24014", "24015", "24016", "24017", "24018"],
    neighborhoods: [
      "Old Southwest",
      "Raleigh Court",
      "Grandin Village",
      "Grandin Court",
      "Wasena",
      "South Roanoke",
      "Williamson Road",
      "Gainsboro",
      "Northeast Roanoke",
    ],
    population: "100,011 (2020 U.S. Census)",
    elevationFt: 974,
    annualSnowfallIn: 14.8,
    annualRainfallIn: 42.82,
    climateZone: "humid subtropical (Köppen Cfa), USDA hardiness zone 7b",
    localRoofingContext:
      "Roanoke sits at 974 feet of elevation in a humid subtropical climate that averages 42.82 inches of rain and 14.8 inches of snow each year. Per the city, Roanoke is divided into 49 separate neighborhoods, including historic districts like Old Southwest and Gainsboro alongside long-established residential areas such as Raleigh Court, Grandin Court, Wasena, and South Roanoke. According to the City of Roanoke, flooding has historically been the area's primary weather-related hazard, often associated with heavy rains from hurricane remnants. That climate profile shapes how we install ice and water shield, ventilation, and drainage on every Roanoke roof we touch.",
    recentSevereWeather:
      "April 11, 2024 tornado outbreak affected the NWS Blacksburg forecast area, which covers Roanoke. (Source: weather.gov/rnk/pastevents)",
    fromHQ: "Roughly 45 minutes from our Christiansburg office via I-81 North and Route 581.",
  },

  "christiansburg": {
    zipCodes: ["24068", "24073"],
    neighborhoods: [
      "Cambria",
      "Belmont Farms",
      "Spradlin Farms",
      "Falling Branch",
    ],
    population: "23,348 (2020 U.S. Census)",
    elevationFt: 2133,
    annualSnowfallIn: 21.7,
    annualRainfallIn: 42.12,
    climateZone: "humid temperate (1991-2020 normals)",
    localRoofingContext:
      "Christiansburg sits at 2,133 feet of elevation, more than twice as high as Roanoke. That elevation pushes annual snowfall to 21.7 inches and creates more freeze-thaw cycling between December and March than nearby low-elevation cities see. Annual rainfall of 42.12 inches arrives in the same intense bursts the rest of the New River Valley experiences. Interstate 81 runs along the southern edge of town, with U.S. Routes 11 and 460 connecting Christiansburg directly to Roanoke. The town consolidated with the former town of Cambria in 1965, so older homes in the Cambria area sit on streets that pre-date most of the surrounding subdivisions and often need ventilation and ice-barrier upgrades on re-roofs.",
    fromHQ: "Our headquarters at 80 College St STE R, Christiansburg, VA 24073.",
  },

  "blacksburg": {
    zipCodes: ["24060", "24061", "24062", "24063"],
    neighborhoods: [
      "Hethwood",
      "Foxridge",
      "Draper's Meadow",
    ],
    population: "44,826 (2020 U.S. Census); Blacksburg-Christiansburg metro area 181,863",
    elevationFt: 2080,
    annualSnowfallIn: 24.7,
    annualRainfallIn: 42.64,
    climateZone: "hot-summer humid continental (Köppen Dfa), atypical for Virginia, driven by elevation",
    localRoofingContext:
      "Blacksburg, home to Virginia Tech, sits at 2,080 feet of elevation. That elevation gives Blacksburg a hot-summer humid continental climate (Köppen Dfa) that is unusual for Virginia, where most of the state is humid subtropical. The practical impact for roofing: 24.7 inches of average annual snow (the most of any city in our service area), only about 5 days a year of 90°F-plus highs, and roughly one night a year of below-zero lows. Blacksburg, Christiansburg, and Radford together form the Blacksburg-Christiansburg metropolitan statistical area. Verified neighborhoods on Wikipedia include Hethwood and Foxridge, with Draper's Meadow named for the area's earliest 1755 settlement. The combination of heavy snow loading and routine freeze-thaw cycling makes ice-and-water shield, attic ventilation, and ridge-cap detailing especially important here.",
    fromHQ: "Approximately 10 minutes from our Christiansburg office.",
  },
};

/**
 * Returns formatted ZIP code list for display.
 * Example: ["24060", "24061"] => "24060, 24061"
 */
export function formatZipList(zips: string[]): string {
  if (zips.length <= 2) return zips.join(" and ");
  return zips.slice(0, -1).join(", ") + ", and " + zips[zips.length - 1];
}

/**
 * Returns first N neighborhoods formatted as a sentence.
 * Example: ["A", "B", "C"] => "A, B, and C"
 */
export function formatNeighborhoodList(hoods: string[], max = 6): string {
  const list = hoods.slice(0, max);
  if (list.length <= 2) return list.join(" and ");
  return list.slice(0, -1).join(", ") + ", and " + list[list.length - 1];
}
