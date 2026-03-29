/**
 * AccuLynx API v2 client for creating contacts and jobs.
 * Used by the form submission endpoint to push leads into the CRM.
 */

const API_URL = import.meta.env.ACCULYNX_API_URL || "https://api.acculynx.com/api/v2";
const API_KEY = import.meta.env.ACCULYNX_API_KEY || "";

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
    contactType: "Customer",
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

  // Build mailing address
  if (data.address || data.city || data.state || data.zip) {
    body.mailingAddress = {
      street1: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
    };
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
  leadSource?: string;
  serviceType?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
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
    contactId: data.contactId,
  };

  // Location address (required for job creation)
  if (data.address || data.city || data.state || data.zip) {
    body.locationAddress = {
      street1: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
    };
  }

  // Lead source
  if (data.leadSource) {
    body.leadSource = data.leadSource;
  }

  // Work type / service type
  if (data.serviceType) {
    body.workType = data.serviceType;
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

/**
 * Full lead creation flow: Create contact → Create job.
 * Returns both IDs or null if contact creation fails.
 * Job creation failure is non-fatal (contact still exists in CRM).
 */
export async function createLead(data: ContactData & {
  leadSource?: string;
  serviceType?: string;
}): Promise<{ contactId: string; jobId: string | null } | null> {
  // Step 1: Create contact
  const contact = await createContact(data);
  if (!contact) {
    console.error("[AccuLynx] Lead creation failed: could not create contact");
    return null;
  }

  // Step 2: Create job with the new contact
  const job = await createJob({
    contactId: contact.contactId,
    leadSource: data.leadSource || "Website Form Submission",
    serviceType: data.serviceType,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
  });

  return {
    contactId: contact.contactId,
    jobId: job?.jobId || null,
  };
}
