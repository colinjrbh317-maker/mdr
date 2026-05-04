/**
 * AccuLynx API v2 client for creating contacts and jobs.
 * Used by the form submission endpoint to push leads into the CRM.
 */

const API_URL = import.meta.env.ACCULYNX_API_URL || "https://api.acculynx.com/api/v2";
const API_KEY = import.meta.env.ACCULYNX_API_KEY || "";

// --- AccuLynx ID mappings (from GET /company-settings/* endpoints) ---

/**
 * Lead source IDs — must match GUIDs from AccuLynx settings (Lead Sources).
 * The "Form Submission Website" parent has 5 children (sub-sources) Alicia
 * configured so reports can break web leads down by where they came from.
 * GUIDs pulled from GET /company-settings/leads/lead-sources/{id}.
 */
const LEAD_SOURCES: Record<string, string> = {
  // Top-level
  "website":            "0d0f692b-f016-4328-acc0-6080e0a46817", // Form Submission Website (parent — fallback)
  "facebook":           "388292df-ee5b-4a5a-9caf-a2fba4d1e947", // Form Facebook Submission
  "google-ads":         "a4d84415-9551-4811-9378-5be20fa20238", // Google Ads
  "referral":           "b9e4f996-1b60-4bf5-8cc7-df5e0fcbffb3", // Referral (parent)
  // Children of "Form Submission Website"
  "contact-form":       "95937140-1a8e-4c6f-add0-85029f0c91ce", // /Contact
  "chat-bot":           "1df55dce-5d72-4b1b-8086-d24875e22b19", // Chat Bot
  "emergency-form":     "3e6d411b-b905-4fb7-93da-2596a61bd69e", // Emergency Roof Repair
  "financing-form":     "fd6586e5-a2a2-4ae3-92f8-b90009629a81", // Financing Form
  "mobile-sticky":      "6b44f3d9-07e3-479f-a847-0418290523cb", // Mobile sticky
  // Children of "Referral"
  "referral-page-form": "01644a31-4a6f-4804-8381-21dc124ec33e", // Referral Page Form
};

/**
 * Map a form's `source` literal (sent from the frontend) to a LEAD_SOURCES key.
 * Order matters: granular sources resolve first, then PPC overrides (gclid/fclid)
 * fire on top in createJob() if present.
 */
const FORM_SOURCE_TO_LEAD_SOURCE: Record<string, string> = {
  "contact-page":           "contact-form",
  "ai-chatbot":             "chat-bot",
  "emergency":              "emergency-form",
  "financing-funnel":       "financing-form",
  "mobile-sticky-cta":      "mobile-sticky",
  "referral-outbound":      "referral-page-form",
  "referral-inbound":       "referral-page-form",
  // Sources without a dedicated AccuLynx child fall through to "website" (Form Submission Website parent).
  // If Alicia adds children for these later (e.g. "Roof Quiz", "Exit Intent", "Phone Rescue", "Mobile Retention", "LP Hero"), add the mapping here.
};

/** Work type IDs — numeric IDs from AccuLynx */
const WORK_TYPES: Record<string, number> = {
  "Roof Replacement":  3,     // Retail
  "Roof Repair":       10454, // Roofing Repair
  "Storm Damage":      1,     // Insurance
  "Metal Roofing":     3,     // Retail
  "Gutters":           3,     // Retail
  "Roof Inspection":   6,     // Inspection
  "Other":             3,     // Retail (default)
};

/** Trade type GUIDs — from GET /company-settings/job-file-settings/trade-types */
const TRADE_TYPES: Record<string, string> = {
  "Roof Replacement":  "62520283-8160-4723-b76e-35096af275b9", // Roof Replacement – Shingle
  "Roof Repair":       "d6d5666e-4d0c-4026-99b4-895d3c7b1c80", // Repair
  "Storm Damage":      "d6d5666e-4d0c-4026-99b4-895d3c7b1c80", // Repair
  "Metal Roofing":     "3c4d3d25-6a9a-4c0e-a9f3-f4daa8bcc38c", // Roof Replacement – Metal
  "Gutters":           "2d7087f7-40e2-445b-b8bd-f8b2980c8b28", // Gutter Install 5",6"
  "Roof Inspection":   "f5d4e85f-3e66-491e-8408-a327de638ea5", // Inspection Only
};

const CUSTOMER_TYPE_ID = "52ba94c5-3ecf-4e7f-90cd-a91de12a72f5";

/** Default company representative for new web leads (Sierra Duncan — front desk/sales manager) */
const DEFAULT_COMPANY_REP_ID = "a13f80c0-3ce2-4f96-8476-ada53589b697";

/**
 * Build an AccuLynx-format address object from parsed fields.
 * Contact mailingAddress requires state as { abbreviation: "VA" }.
 * Job locationAddress requires state as a plain string "VA".
 */
function buildAddress(street1: string, city: string, state: string, zip: string, context: "contact" | "job"): Record<string, unknown> | null {
  const addr: Record<string, unknown> = {};
  if (street1) addr.street1 = street1;
  if (city) addr.city = city;
  if (state) {
    addr.state = context === "contact"
      ? { abbreviation: state.toUpperCase() }
      : state.toUpperCase();
  }
  if (zip) addr.zip = zip;
  return Object.keys(addr).length > 0 ? addr : null;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Make a POST request to AccuLynx API with 1 retry on 5xx */
async function post(path: string, body: Record<string, unknown>): Promise<Response | null> {
  const url = `${API_URL}${path}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (res.ok) return res;

      // Retry on 5xx server errors
      if (res.status >= 500 && attempt === 0) {
        console.error(`[AccuLynx] ${path} returned ${res.status}, retrying...`);
        continue;
      }

      const errorBody = await res.text().catch(() => "");
      console.error(`[AccuLynx] ${path} failed: ${res.status} ${errorBody}`);
      return null;
    } catch (err) {
      if (attempt === 0) {
        console.error(`[AccuLynx] ${path} network error, retrying...`, err);
        continue;
      }
      console.error(`[AccuLynx] ${path} network error (final):`, err);
      return null;
    }
  }

  return null;
}

/**
 * Parse a combined address string into structured fields.
 * Handles formats like:
 *   "123 Main St, Blacksburg, VA 24060"
 *   "123 Main St, Christiansburg, VA"
 *   "123 Main St"
 */
export function parseAddress(combined: string): {
  street1: string;
  city: string;
  state: string;
  zip: string;
} {
  const result = { street1: "", city: "", state: "", zip: "" };
  if (!combined?.trim()) return result;

  const parts = combined.split(",").map((p) => p.trim());

  if (parts.length >= 1) {
    result.street1 = parts[0];
  }

  if (parts.length >= 2) {
    result.city = parts[1];
  }

  if (parts.length >= 3) {
    // Last part might be "VA 24060" or just "VA" or "24060"
    const lastPart = parts[parts.length - 1].trim();
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      result.state = stateZipMatch[1];
      result.zip = stateZipMatch[2];
    } else if (/^[A-Z]{2}$/.test(lastPart)) {
      result.state = lastPart;
    } else if (/^\d{5}/.test(lastPart)) {
      result.zip = lastPart;
    }
  }

  return result;
}

/** Resolve a form source string to an AccuLynx lead source ID */
function resolveLeadSourceId(source?: string): string {
  if (!source) return LEAD_SOURCES["website"];

  const exactKey = FORM_SOURCE_TO_LEAD_SOURCE[source];
  if (exactKey) return LEAD_SOURCES[exactKey];

  const s = source.toLowerCase();
  if (s.includes("facebook") || s.includes("meta") || s.includes("fclid")) {
    return LEAD_SOURCES["facebook"];
  }
  if (s.includes("google") || s.includes("gclid")) {
    return LEAD_SOURCES["google-ads"];
  }
  if (s.includes("referral")) {
    return LEAD_SOURCES["referral-page-form"];
  }
  return LEAD_SOURCES["website"];
}

export interface ContactData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface CreateContactResult {
  contactId: string;
}

/** Create a new contact in AccuLynx. Returns contactId or null on failure. */
export async function createContact(data: ContactData): Promise<CreateContactResult | null> {
  if (!API_KEY) {
    console.error("[AccuLynx] No API key configured");
    return null;
  }

  const body: Record<string, unknown> = {
    contactTypeIds: [CUSTOMER_TYPE_ID],
    firstName: data.firstName,
    lastName: data.lastName,
  };

  // Build phone numbers array
  if (data.phone) {
    body.phoneNumbers = [
      {
        number: data.phone,
        type: "Mobile",
      },
    ];
  }

  // Build email addresses array
  if (data.email) {
    body.emailAddresses = [
      {
        address: data.email,
      },
    ];
  }

  // Build mailing address from structured fields or parse combined string
  let street1 = data.address || "";
  let city = data.city || "";
  let stateAbbr = data.state || "";
  let zip = data.zip || "";

  // If we have a combined address but no city/state, try to parse it
  if (street1 && !city && !stateAbbr) {
    const parsed = parseAddress(street1);
    street1 = parsed.street1;
    city = parsed.city;
    stateAbbr = parsed.state;
    zip = parsed.zip || zip;
  }

  const mailingAddress = buildAddress(street1, city, stateAbbr, zip, "contact");
  if (mailingAddress) {
    body.mailingAddress = mailingAddress;
  }

  const res = await post("/contacts", body);
  if (!res) return null;

  try {
    const json = await res.json();
    const contactId = json.id || json.contactId;
    if (!contactId) {
      console.error("[AccuLynx] No contactId in response:", json);
      return null;
    }
    return { contactId };
  } catch (err) {
    console.error("[AccuLynx] Failed to parse contact response:", err);
    return null;
  }
}

export interface JobData {
  contactId: string;
  contactName?: string;
  leadSource?: string;
  serviceType?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  formSource?: string;
  gclid?: string;
  fclid?: string;
  /** "urgent" sets AccuLynx jobPriority = "Urgent" — used for /emergency form */
  priority?: "urgent" | "normal";
}

export interface CreateJobResult {
  jobId: string;
}

/** Create a new job in AccuLynx. Returns jobId or null on failure. */
export async function createJob(data: JobData): Promise<CreateJobResult | null> {
  if (!API_KEY) {
    console.error("[AccuLynx] No API key configured");
    return null;
  }

  const body: Record<string, unknown> = {
    contact: { id: data.contactId },
  };

  // Job name — visible in CRM list and automation emails
  // Format: "Web Lead — FirstName LastName — ServiceType"
  if (data.contactName) {
    const service = data.serviceType || "General Inquiry";
    body.name = `Web Lead — ${data.contactName} — ${service}`;
  }

  // Location address — parse combined string if no structured fields
  let street1 = data.address || "";
  let city = data.city || "";
  let stateAbbr = data.state || "";
  let zip = data.zip || "";

  if (street1 && !city && !stateAbbr) {
    const parsed = parseAddress(street1);
    street1 = parsed.street1;
    city = parsed.city;
    stateAbbr = parsed.state;
    zip = parsed.zip || zip;
  }

  const locationAddress = buildAddress(street1, city, stateAbbr, zip, "job");
  if (locationAddress) {
    body.locationAddress = locationAddress;
  }

  // Lead source — use AccuLynx ID, auto-detect from form source, gclid, fclid
  let leadSourceId = resolveLeadSourceId(data.formSource);
  if (data.fclid) leadSourceId = LEAD_SOURCES["facebook"];
  if (data.gclid) leadSourceId = LEAD_SOURCES["google-ads"];
  body.leadSource = { id: leadSourceId };

  // Work type — map service selection to AccuLynx work type ID
  const workTypeId = WORK_TYPES[data.serviceType || ""] || WORK_TYPES["Other"];
  body.workType = { id: workTypeId };

  // Trade type — map service selection to AccuLynx trade type GUID
  const tradeTypeId = TRADE_TYPES[data.serviceType || ""];
  if (tradeTypeId) {
    body.tradeTypes = [{ id: tradeTypeId }];
  }

  // Job priority — emergency leads land as Urgent so Sierra's queue surfaces them.
  // AccuLynx's API field is `priority` (not `jobPriority` — the GET response uses
  // `jobPriority` but POST takes `priority`). Verified by round-trip on 2026-05-03.
  if (data.priority === "urgent") {
    body.priority = "Urgent";
  }

  const res = await post("/jobs", body);
  if (!res) return null;

  try {
    const json = await res.json();
    const jobId = json.id || json.jobId;
    if (!jobId) {
      console.error("[AccuLynx] No jobId in response:", json);
      return null;
    }
    return { jobId };
  } catch (err) {
    console.error("[AccuLynx] Failed to parse job response:", err);
    return null;
  }
}

/** Assign the default company representative (Sierra Duncan) to a job. */
export async function assignCompanyRep(jobId: string, userId: string = DEFAULT_COMPANY_REP_ID): Promise<boolean> {
  if (!API_KEY) {
    console.error("[AccuLynx] No API key configured");
    return false;
  }

  const res = await post(`/jobs/${jobId}/representatives/company`, { id: userId });
  if (!res) return false;

  console.log(`[AccuLynx] Company rep assigned to job ${jobId}`);
  return true;
}

/** Add a note to an existing job. Returns true on success. */
export async function addJobNote(jobId: string, text: string): Promise<boolean> {
  if (!API_KEY) {
    console.error("[AccuLynx] No API key configured");
    return false;
  }

  const res = await post(`/jobs/${jobId}/messages`, { message: text });
  if (!res) return false;

  console.log(`[AccuLynx] Note added to job ${jobId}`);
  return true;
}

/** Add a message to a job's message thread. Used to log Twilio SMS in CRM. */
export async function addJobMessage(jobId: string, message: string): Promise<boolean> {
  if (!API_KEY) {
    console.error("[AccuLynx] No API key configured");
    return false;
  }

  const res = await post(`/jobs/${jobId}/messages`, { message });
  if (!res) return false;

  console.log(`[AccuLynx] Message logged to job ${jobId}`);
  return true;
}

/**
 * Build a formatted financing lead note for AccuLynx.
 * Human-readable, not JSON — so sales reps can scan it instantly.
 */
export function formatFinancingNote(data: {
  name: string;
  phone: string;
  email: string;
  service?: string;
  address?: string;
  budget?: string;
  timeline?: string;
  homeowner?: string;
  propertyType?: string;
  credit?: string;
  income?: string;
  employment?: string;
  qualificationTier?: string;
  skipped?: boolean;
}): string {
  const lines: string[] = [
    "HOT FINANCING LEAD -- CALL WITHIN 5 MINUTES",
    "=============================================",
    "",
    `Contact: ${data.name}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email || "Not provided"}`,
    "",
    "-- PROJECT DETAILS --",
    `Service: ${data.service || "Not specified"}`,
    `Address: ${data.address || "Not provided"}`,
    `Budget: ${data.budget || "Not provided"}`,
    `Timeline: ${data.timeline || "Not provided"}`,
    `Homeowner: ${data.homeowner || "Not answered"}`,
    `Property Type: ${data.propertyType || "Not answered"}`,
  ];

  if (!data.skipped) {
    lines.push(
      "",
      "-- FINANCIAL PROFILE --",
      `Credit Range: ${data.credit || "Not provided"}`,
      `Income Range: ${data.income || "Not provided"}`,
      `Employment: ${data.employment || "Not provided"}`,
    );
  } else {
    lines.push(
      "",
      "-- FINANCIAL PROFILE --",
      "Customer skipped financial questions -- prefers phone consultation",
    );
  }

  const tierLabels: Record<string, string> = {
    excellent: "EXCELLENT -- Strong candidate, send Hearth application",
    good: "GOOD -- Solid candidate, send Hearth application",
    fair: "FAIR -- May qualify via Hearth (12+ lenders, flexible credit)",
    "needs-review": "NEEDS REVIEW -- Discuss options by phone",
    "call-us": "PHONE CONSULTATION -- Customer wants to discuss by phone",
  };

  lines.push(
    "",
    "-- QUALIFICATION RESULT --",
    `Tier: ${tierLabels[data.qualificationTier || "call-us"] || data.qualificationTier}`,
    "",
    "-- ACTION REQUIRED --",
    "1. Call this lead ASAP -- they just completed the financing form",
    "2. Confirm project details and schedule free inspection",
    "3. Guide them to the recommended lender application",
    "",
    `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
    "Source: Website Financing Funnel",
  );

  return lines.join("\n");
}

/**
 * Full lead creation flow: Create contact → Create job.
 * Returns both IDs or null if contact creation fails.
 * Job creation failure is non-fatal (contact still exists in CRM).
 */
export async function createLead(data: ContactData & {
  leadSource?: string;
  serviceType?: string;
  formSource?: string;
  gclid?: string;
  fclid?: string;
  priority?: "urgent" | "normal";
}): Promise<{ contactId: string; jobId: string | null } | null> {
  // Step 1: Create contact
  const contact = await createContact(data);
  if (!contact) {
    console.error("[AccuLynx] Lead creation failed: could not create contact");
    return null;
  }

  // Step 2: Create job with the new contact
  const contactName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const job = await createJob({
    contactId: contact.contactId,
    contactName,
    serviceType: data.serviceType,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    formSource: data.formSource,
    gclid: data.gclid,
    fclid: data.fclid,
    priority: data.priority,
  });

  // Step 3: Assign company representative (Sierra Duncan) so the lead isn't unassigned
  if (job?.jobId) {
    assignCompanyRep(job.jobId).catch((err) => {
      console.error("[AccuLynx] Failed to assign company rep:", err);
    });
  }

  return {
    contactId: contact.contactId,
    jobId: job?.jobId || null,
  };
}
