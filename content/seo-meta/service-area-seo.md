# Service Area SEO Metadata — Ready to Apply

All 17 service area pages need SEO meta titles and descriptions added in Sanity.
Apply via Sanity Studio or mutation script once write access is available.

---

## Hub Pages

### New River Valley (Hub)
- **Document ID:** `d01e04d1-ee9b-46e4-a794-31feaef39548`
- **Meta Title:** `Roofing Contractor in the New River Valley, VA | Modern Day Roofing`
- **Meta Description:** `Trusted roofing contractor serving the New River Valley — Christiansburg, Blacksburg, Radford & beyond. GAF Master Elite certified. Free estimates. (540) 553-6007`

### Roanoke Area (Hub)
- **Document ID:** `821df988-76dc-4178-a38d-af8460991d25`
- **Meta Title:** `Roofing Services in the Roanoke Area, VA | Modern Day Roofing`
- **Meta Description:** `Professional roofing for the greater Roanoke area. Roof replacement, repair, metal roofing & storm damage. GAF Master Elite contractor. Free inspections.`

---

## New River Valley Cities

### Christiansburg
- **Document ID:** `c75d5490-ad92-4da8-925e-6800fca43395`
- **Meta Title:** `Roofing Contractor in Christiansburg, VA | Modern Day Roofing`
- **Meta Description:** `Local Christiansburg roofer — headquartered right on College St. Roof replacement, repair, metal roofing & gutters. GAF Master Elite certified. Free estimates.`

### Blacksburg
- **Document ID:** `1da75e58-d3af-4352-b52f-1e39ba9eb3c8`
- **Meta Title:** `Roofing Services in Blacksburg, VA | Modern Day Roofing`
- **Meta Description:** `Blacksburg's trusted roofing contractor. From Virginia Tech campus-area homes to downtown, we handle roof replacement, repair & storm damage. Free estimates.`

### Radford
- **Document ID:** `9613b7c2-aaa9-40a9-8757-4281d0fcc224`
- **Meta Title:** `Roofing Contractor in Radford, VA | Modern Day Roofing`
- **Meta Description:** `Professional roofing services for Radford homeowners. Roof replacement, repair, metal roofing & gutters. GAF Master Elite certified. Free estimates available.`

### Pulaski
- **Document ID:** `78761b5d-5814-46cd-93fe-9d3abdc96fdd`
- **Meta Title:** `Roofing Services in Pulaski, VA | Modern Day Roofing`
- **Meta Description:** `Trusted roofing contractor serving Pulaski County. Roof replacement, shingle & metal roofing, storm damage repair. GAF Master Elite. Free estimates.`

### Dublin
- **Document ID:** `4f099917-02d3-4242-8238-677ff45ed709`
- **Meta Title:** `Roofing Contractor in Dublin, VA | Modern Day Roofing`
- **Meta Description:** `Reliable roofing for Dublin and the I-81 corridor. Roof replacement, repair, metal roofing & storm damage. GAF lifetime warranties. Free inspections.`

### Floyd
- **Document ID:** `7c1c8558-5f09-446e-9c74-4a458787ef49`
- **Meta Title:** `Roofing Services in Floyd, VA | Modern Day Roofing`
- **Meta Description:** `Expert roofing for Floyd County mountain homes. Durable roof replacement, metal roofing & repairs built for Blue Ridge weather. Free estimates available.`

### Wytheville
- **Document ID:** `6ba8f34e-2abf-4bf2-96b6-5432f84504aa`
- **Meta Title:** `Roofing Contractor in Wytheville, VA | Modern Day Roofing`
- **Meta Description:** `Professional roofing for Wytheville and Wythe County. Roof replacement, repair, metal roofing & storm damage. GAF Master Elite certified. Free estimates.`

---

## Roanoke Area Cities

### Roanoke
- **Document ID:** `37c9b8e0-17a8-4228-b81b-5b57fabc47d1`
- **Meta Title:** `Roofing Contractor in Roanoke, VA | Modern Day Roofing`
- **Meta Description:** `Roanoke's trusted roofing contractor. Roof replacement, repair, metal roofing & storm damage restoration. GAF Master Elite certified. Call (540) 553-6007.`

### Salem
- **Document ID:** `8d09aece-c80f-4ed6-87e4-74b19f2e1db7`
- **Meta Title:** `Roofing Services in Salem, VA | Modern Day Roofing`
- **Meta Description:** `Professional roofing for Salem homeowners. Roof replacement, shingle & metal roofing, storm damage repair. GAF Master Elite contractor. Free estimates.`

### Vinton
- **Document ID:** `aab2e2e6-2758-473c-bff3-12ea0b963e9b`
- **Meta Title:** `Roofing Contractor in Vinton, VA | Modern Day Roofing`
- **Meta Description:** `Trusted roofing services for Vinton neighborhoods. Roof replacement, repair, gutters & storm damage. GAF lifetime warranties available. Free inspections.`

### Troutville
- **Document ID:** `50466c01-5f3e-463f-90dd-f853610d7ca1`
- **Meta Title:** `Roofing Services in Troutville, VA | Modern Day Roofing`
- **Meta Description:** `Expert roofing for Troutville and northern Botetourt County. Roof replacement, metal roofing & storm damage repair. GAF Master Elite. Free estimates.`

### Bedford
- **Document ID:** `faf4eaf4-5382-4a4a-8548-031763eea2ba`
- **Meta Title:** `Roofing Contractor in Bedford, VA | Modern Day Roofing`
- **Meta Description:** `Professional roofing for Bedford homeowners. Roof replacement, repair, metal roofing & storm damage. GAF Master Elite certified. Free estimates available.`

### Lexington
- **Document ID:** `f1c07002-3641-4631-b961-d5f4b754bd69`
- **Meta Title:** `Roofing Services in Lexington, VA | Modern Day Roofing`
- **Meta Description:** `Roofing for Lexington's historic and modern homes. Roof replacement, repair & preservation roofing. GAF Master Elite contractor. Free inspections.`

### Covington
- **Document ID:** `77cb115e-9049-478b-9e6b-1716da03bbcb`
- **Meta Title:** `Roofing Contractor in Covington, VA | Modern Day Roofing`
- **Meta Description:** `Durable roofing solutions for Covington and the Alleghany Highlands. Roof replacement, metal roofing & repairs built for mountain weather. Free estimates.`

### Smith Mountain Lake
- **Document ID:** `9dbd7723-a1eb-40a1-aa58-b090a5464b21`
- **Meta Title:** `Roofing at Smith Mountain Lake, VA | Modern Day Roofing`
- **Meta Description:** `Specialized roofing for Smith Mountain Lake waterfront homes. Wind-resistant roof replacement, metal roofing & storm damage repair. Free lakeside estimates.`

---

## Apply Script (run when write access is available)

```javascript
// Run with: npx sanity exec scripts/apply-area-seo.mjs --with-user-token
import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'cy8sc3xd', // switch to 2rj2jdb4 for production
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

const areaSeo = [
  { id: 'd01e04d1-ee9b-46e4-a794-31feaef39548', title: 'Roofing Contractor in the New River Valley, VA | Modern Day Roofing', desc: 'Trusted roofing contractor serving the New River Valley — Christiansburg, Blacksburg, Radford & beyond. GAF Master Elite certified. Free estimates. (540) 553-6007' },
  { id: '821df988-76dc-4178-a38d-af8460991d25', title: 'Roofing Services in the Roanoke Area, VA | Modern Day Roofing', desc: 'Professional roofing for the greater Roanoke area. Roof replacement, repair, metal roofing & storm damage. GAF Master Elite contractor. Free inspections.' },
  { id: 'c75d5490-ad92-4da8-925e-6800fca43395', title: 'Roofing Contractor in Christiansburg, VA | Modern Day Roofing', desc: 'Local Christiansburg roofer — headquartered right on College St. Roof replacement, repair, metal roofing & gutters. GAF Master Elite certified. Free estimates.' },
  { id: '1da75e58-d3af-4352-b52f-1e39ba9eb3c8', title: 'Roofing Services in Blacksburg, VA | Modern Day Roofing', desc: "Blacksburg's trusted roofing contractor. From Virginia Tech campus-area homes to downtown, we handle roof replacement, repair & storm damage. Free estimates." },
  { id: '9613b7c2-aaa9-40a9-8757-4281d0fcc224', title: 'Roofing Contractor in Radford, VA | Modern Day Roofing', desc: 'Professional roofing services for Radford homeowners. Roof replacement, repair, metal roofing & gutters. GAF Master Elite certified. Free estimates available.' },
  { id: '78761b5d-5814-46cd-93fe-9d3abdc96fdd', title: 'Roofing Services in Pulaski, VA | Modern Day Roofing', desc: 'Trusted roofing contractor serving Pulaski County. Roof replacement, shingle & metal roofing, storm damage repair. GAF Master Elite. Free estimates.' },
  { id: '4f099917-02d3-4242-8238-677ff45ed709', title: 'Roofing Contractor in Dublin, VA | Modern Day Roofing', desc: 'Reliable roofing for Dublin and the I-81 corridor. Roof replacement, repair, metal roofing & storm damage. GAF lifetime warranties. Free inspections.' },
  { id: '7c1c8558-5f09-446e-9c74-4a458787ef49', title: 'Roofing Services in Floyd, VA | Modern Day Roofing', desc: 'Expert roofing for Floyd County mountain homes. Durable roof replacement, metal roofing & repairs built for Blue Ridge weather. Free estimates available.' },
  { id: '6ba8f34e-2abf-4bf2-96b6-5432f84504aa', title: 'Roofing Contractor in Wytheville, VA | Modern Day Roofing', desc: 'Professional roofing for Wytheville and Wythe County. Roof replacement, repair, metal roofing & storm damage. GAF Master Elite certified. Free estimates.' },
  { id: '37c9b8e0-17a8-4228-b81b-5b57fabc47d1', title: 'Roofing Contractor in Roanoke, VA | Modern Day Roofing', desc: "Roanoke's trusted roofing contractor. Roof replacement, repair, metal roofing & storm damage restoration. GAF Master Elite certified. Call (540) 553-6007." },
  { id: '8d09aece-c80f-4ed6-87e4-74b19f2e1db7', title: 'Roofing Services in Salem, VA | Modern Day Roofing', desc: 'Professional roofing for Salem homeowners. Roof replacement, shingle & metal roofing, storm damage repair. GAF Master Elite contractor. Free estimates.' },
  { id: 'aab2e2e6-2758-473c-bff3-12ea0b963e9b', title: 'Roofing Contractor in Vinton, VA | Modern Day Roofing', desc: 'Trusted roofing services for Vinton neighborhoods. Roof replacement, repair, gutters & storm damage. GAF lifetime warranties available. Free inspections.' },
  { id: '50466c01-5f3e-463f-90dd-f853610d7ca1', title: 'Roofing Services in Troutville, VA | Modern Day Roofing', desc: 'Expert roofing for Troutville and northern Botetourt County. Roof replacement, metal roofing & storm damage repair. GAF Master Elite. Free estimates.' },
  { id: 'faf4eaf4-5382-4a4a-8548-031763eea2ba', title: 'Roofing Contractor in Bedford, VA | Modern Day Roofing', desc: 'Professional roofing for Bedford homeowners. Roof replacement, repair, metal roofing & storm damage. GAF Master Elite certified. Free estimates available.' },
  { id: 'f1c07002-3641-4631-b961-d5f4b754bd69', title: 'Roofing Services in Lexington, VA | Modern Day Roofing', desc: "Roofing for Lexington's historic and modern homes. Roof replacement, repair & preservation roofing. GAF Master Elite contractor. Free inspections." },
  { id: '77cb115e-9049-478b-9e6b-1716da03bbcb', title: 'Roofing Contractor in Covington, VA | Modern Day Roofing', desc: 'Durable roofing solutions for Covington and the Alleghany Highlands. Roof replacement, metal roofing & repairs built for mountain weather. Free estimates.' },
  { id: '9dbd7723-a1eb-40a1-aa58-b090a5464b21', title: 'Roofing at Smith Mountain Lake, VA | Modern Day Roofing', desc: 'Specialized roofing for Smith Mountain Lake waterfront homes. Wind-resistant roof replacement, metal roofing & storm damage repair. Free lakeside estimates.' },
]

let tx = client.transaction()
for (const {id, title, desc} of areaSeo) {
  tx = tx.patch(id, p => p.set({
    seo: { metaTitle: title, metaDescription: desc }
  }))
}

const result = await tx.commit()
console.log(`Updated ${areaSeo.length} service area SEO fields. TX: ${result.transactionId}`)
```

## Blog Publish Dates (also needs write access)

```javascript
const blogDates = [
  { id: 'fb95ff60-70cb-44b4-9b07-fb25966854db', date: '2025-09-15T10:00:00Z' },
  { id: 'd412ad07-ab44-436f-b945-809c64be7c8c', date: '2025-10-01T10:00:00Z' },
  { id: '5e51dfdf-4518-4b53-a1ed-00fdd404883d', date: '2025-08-20T10:00:00Z' },
  { id: '68150500-4161-461b-972b-59a6ca9fea15', date: '2025-10-15T10:00:00Z' },
  { id: '6ffdab1c-08ee-4982-b108-63bd24f217ad', date: '2025-10-28T10:00:00Z' },
  { id: '0109e537-3e83-409b-9e7a-8841a542b3cd', date: '2025-11-05T10:00:00Z' },
  { id: 'bce09101-442d-4952-9f36-2a401d3345ff', date: '2025-12-01T10:00:00Z' },
  { id: '0ef19a05-1717-4cf8-bcd6-d2bd7f7067be', date: '2025-12-15T10:00:00Z' },
  { id: '55fd8ea5-7b68-432d-b1d0-c627b35a75d2', date: '2026-01-05T10:00:00Z' },
  { id: '35961a84-173b-4652-890e-172a57159e7f', date: '2026-01-15T10:00:00Z' },
  { id: '6819bee3-df51-496a-8707-76ee371f6f99', date: '2026-01-28T10:00:00Z' },
  { id: '8fd4aa72-a98f-4f11-b1ee-0a24fc9cdf78', date: '2026-02-10T10:00:00Z' },
  { id: '7fb87305-74b7-4dba-b04c-5629e3bc38cd', date: '2026-02-20T10:00:00Z' },
  { id: '5fd17432-cb4a-4e08-9d38-58e98e3418f5', date: '2026-03-01T10:00:00Z' },
  { id: '2b0ba50d-e7a2-40a7-a659-4983f595c27f', date: '2026-03-10T10:00:00Z' },
]

let tx2 = client.transaction()
for (const {id, date} of blogDates) {
  tx2 = tx2.patch(id, p => p.set({publishedAt: date}))
}
await tx2.commit()
```
