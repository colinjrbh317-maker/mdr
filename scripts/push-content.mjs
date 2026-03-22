/**
 * Push all enhanced content to Sanity CMS
 * Run: npx sanity exec scripts/push-content.mjs --with-user-token
 *
 * This script:
 * 1. Updates 8 service page body content (enhanced 1500+ word versions)
 * 2. Sets publishedAt dates on all 15 blog posts
 * 3. Adds SEO metadata to all 17 service area pages
 */
import { getCliClient } from 'sanity/cli'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const client = getCliClient({ apiVersion: '2024-01-01' })
const __dirname = dirname(fileURLToPath(import.meta.url))
const contentDir = join(__dirname, '..', 'content')

// Helper: Convert markdown to portable text blocks (simplified)
function markdownToBlocks(md) {
  const lines = md.split('\n')
  const blocks = []
  let currentList = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip empty lines and horizontal rules
    if (line.trim() === '' || line.trim() === '---') {
      if (currentList) {
        blocks.push(...currentList)
        currentList = null
      }
      continue
    }

    // Headings
    const h2Match = line.match(/^## (.+)/)
    const h3Match = line.match(/^### (.+)/)
    if (h2Match) {
      if (currentList) { blocks.push(...currentList); currentList = null }
      blocks.push({
        _type: 'block',
        _key: `h2_${i}`,
        style: 'h2',
        children: [{ _type: 'span', _key: `s_${i}`, text: h2Match[1], marks: [] }],
        markDefs: []
      })
      continue
    }
    if (h3Match) {
      if (currentList) { blocks.push(...currentList); currentList = null }
      blocks.push({
        _type: 'block',
        _key: `h3_${i}`,
        style: 'h3',
        children: [{ _type: 'span', _key: `s_${i}`, text: h3Match[1], marks: [] }],
        markDefs: []
      })
      continue
    }

    // List items
    const listMatch = line.match(/^- (.+)/)
    if (listMatch) {
      if (!currentList) currentList = []
      // Parse bold within list items
      const children = parseBoldText(listMatch[1], i)
      currentList.push({
        _type: 'block',
        _key: `li_${i}`,
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children,
        markDefs: []
      })
      continue
    }

    // Regular paragraph
    if (currentList) { blocks.push(...currentList); currentList = null }
    const children = parseBoldText(line, i)
    blocks.push({
      _type: 'block',
      _key: `p_${i}`,
      style: 'normal',
      children,
      markDefs: []
    })
  }

  if (currentList) blocks.push(...currentList)
  return blocks
}

function parseBoldText(text, lineIdx) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.filter(p => p).map((part, j) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) {
      return { _type: 'span', _key: `b_${lineIdx}_${j}`, text: boldMatch[1], marks: ['strong'] }
    }
    return { _type: 'span', _key: `t_${lineIdx}_${j}`, text: part, marks: [] }
  })
}

// Strip the title/frontmatter from markdown files (first # heading and any --- lines before content)
function stripTitle(md) {
  const lines = md.split('\n')
  let start = 0
  // Skip initial # heading
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) { start = i + 1; break }
  }
  // Skip any blank lines or --- after title
  while (start < lines.length && (lines[start].trim() === '' || lines[start].trim() === '---')) {
    start++
  }
  return lines.slice(start).join('\n')
}

// ─── 1. Service Page Body Content ───────────────────────────────
const serviceUpdates = [
  { id: '41774878-72f0-4063-a528-d228a8cc0b35', file: 'services/roof-replacement.md', name: 'Roof Replacement' },
  { id: '25a9ca60-d442-44cd-9822-9aeb8f1ab665', file: 'services/shingle-roofing.md', name: 'Shingle Roofing' },
  { id: '6061d327-0d5c-4968-a762-6c2f8a66d129', file: 'services/metal-roofing.md', name: 'Metal Roofing' },
  { id: '64ff1390-faff-420d-bd2c-df54816c1e2c', file: 'services/timber-seal.md', name: 'Timber Seal' },
  { id: 'ff1b70bc-ccdf-45e0-99f5-265500b1d4d3', file: 'services/roof-repair.md', name: 'Roof Repair' },
  { id: 'afd53081-da55-400d-9ac4-ca121be30f8e', file: 'services/roof-maintenance.md', name: 'Roof Maintenance' },
  { id: '1ef11d3c-94ab-4516-8ad7-403ed1d5c4c2', file: 'services/gutters.md', name: 'Gutters' },
  { id: '26fdc1df-50c6-481b-8a47-406dd1a36308', file: 'services/storm-damage.md', name: 'Storm Damage' },
]

console.log('═══ Pushing Service Page Content ═══')
let tx = client.transaction()

for (const svc of serviceUpdates) {
  try {
    const md = readFileSync(join(contentDir, svc.file), 'utf-8')
    const body = markdownToBlocks(stripTitle(md))
    tx = tx.patch(svc.id, p => p.set({ body }))
    console.log(`  ✓ ${svc.name} (${body.length} blocks)`)
  } catch (err) {
    console.log(`  ✗ ${svc.name}: ${err.message}`)
  }
}

// ─── 2. Blog Publish Dates ──────────────────────────────────────
console.log('\n═══ Setting Blog Publish Dates ═══')
const blogDates = [
  { id: 'fb95ff60-70cb-44b4-9b07-fb25966854db', date: '2025-09-15T10:00:00Z', title: 'Storm Damaged Roof' },
  { id: 'd412ad07-ab44-436f-b945-809c64be7c8c', date: '2025-10-01T10:00:00Z', title: 'Insurance Claim' },
  { id: '5e51dfdf-4518-4b53-a1ed-00fdd404883d', date: '2025-08-20T10:00:00Z', title: 'Hurricane Prep' },
  { id: '68150500-4161-461b-972b-59a6ca9fea15', date: '2025-10-15T10:00:00Z', title: 'GAF Master Elite' },
  { id: '6ffdab1c-08ee-4982-b108-63bd24f217ad', date: '2025-10-28T10:00:00Z', title: 'GAF Warranty' },
  { id: '0109e537-3e83-409b-9e7a-8841a542b3cd', date: '2025-11-05T10:00:00Z', title: 'Warning Signs' },
  { id: 'bce09101-442d-4952-9f36-2a401d3345ff', date: '2025-12-01T10:00:00Z', title: 'Ice Dams' },
  { id: '0ef19a05-1717-4cf8-bcd6-d2bd7f7067be', date: '2025-12-15T10:00:00Z', title: 'Metal vs Shingles' },
  { id: '55fd8ea5-7b68-432d-b1d0-c627b35a75d2', date: '2026-01-05T10:00:00Z', title: 'Best Materials SW VA' },
  { id: '35961a84-173b-4652-890e-172a57159e7f', date: '2026-01-15T10:00:00Z', title: 'Arch vs 3-Tab' },
  { id: '6819bee3-df51-496a-8707-76ee371f6f99', date: '2026-01-28T10:00:00Z', title: 'How Long Roof Last' },
  { id: '8fd4aa72-a98f-4f11-b1ee-0a24fc9cdf78', date: '2026-02-10T10:00:00Z', title: 'Replacement Cost' },
  { id: '7fb87305-74b7-4dba-b04c-5629e3bc38cd', date: '2026-02-20T10:00:00Z', title: 'Questions to Ask' },
  { id: '5fd17432-cb4a-4e08-9d38-58e98e3418f5', date: '2026-03-01T10:00:00Z', title: 'Avoid Scams' },
  { id: '2b0ba50d-e7a2-40a7-a659-4983f595c27f', date: '2026-03-10T10:00:00Z', title: 'Spring Checklist' },
]

for (const blog of blogDates) {
  tx = tx.patch(blog.id, p => p.set({ publishedAt: blog.date }))
  console.log(`  ✓ ${blog.title} → ${blog.date.split('T')[0]}`)
}

// ─── 3. Service Area SEO Metadata ───────────────────────────────
console.log('\n═══ Adding Service Area SEO Metadata ═══')
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

for (const area of areaSeo) {
  tx = tx.patch(area.id, p => p.set({
    seo: { _type: 'seo', metaTitle: area.title, metaDescription: area.desc }
  }))
  console.log(`  ✓ ${area.title.split('|')[0].trim()}`)
}

// ─── Commit Everything ──────────────────────────────────────────
console.log('\n═══ Committing Transaction ═══')
try {
  const result = await tx.commit()
  console.log(`\n✅ SUCCESS — All content pushed!`)
  console.log(`   Transaction ID: ${result.transactionId}`)
  console.log(`   • 8 service pages updated with enhanced content`)
  console.log(`   • 15 blog posts given publish dates`)
  console.log(`   • 17 service area pages given SEO metadata`)
} catch (err) {
  console.error(`\n❌ FAILED: ${err.message}`)
  console.log('\nIf you see "Insufficient permissions", run:')
  console.log('  npx sanity login')
  console.log('Then re-run this script.')
}
