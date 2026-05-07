/**
 * Find/replace stale phone numbers in Sanity body content.
 * Run: npx sanity exec scripts/fix-stale-phone-numbers.mjs --with-user-token
 *
 * Replaces (540) 204-5597, (540) 616-2488, (540) 559-249x, (540) 537-207x
 * with the canonical (540) 553-6007 across every block of body[] in every doc
 * that has the legacy values.
 */
import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2024-01-01" });

const STALE_PATTERNS = [
  { pattern: /\(540\)\s*204-5597/g, replacement: "(540) 553-6007" },
  { pattern: /540-204-5597/g, replacement: "540-553-6007" },
  { pattern: /5402045597/g, replacement: "5405536007" },
  { pattern: /\(540\)\s*616-2488/g, replacement: "(540) 553-6007" },
  { pattern: /540-616-2488/g, replacement: "540-553-6007" },
  { pattern: /5406162488/g, replacement: "5405536007" },
  { pattern: /\(540\)\s*559-\d{4}/g, replacement: "(540) 553-6007" },
  { pattern: /\(540\)\s*537-\d{4}/g, replacement: "(540) 553-6007" },
];

function rewriteText(text) {
  if (!text) return text;
  let out = text;
  for (const { pattern, replacement } of STALE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const QUERY = `*[(body[].children[].text match "*204-5597*") || (body[].children[].text match "*616-2488*") || (body[].children[].text match "*559-249*") || (body[].children[].text match "*537-207*")]{_id, _type, "slug": slug.current, body}`;

async function main() {
  const docs = await client.fetch(QUERY);
  console.log(`Found ${docs.length} documents with stale phone numbers.`);

  let totalSpans = 0;
  let docsTouched = 0;

  for (const doc of docs) {
    if (!doc.body || !Array.isArray(doc.body)) continue;
    let txn = client.transaction();
    let docChanged = false;

    for (const block of doc.body) {
      if (!block.children || !Array.isArray(block.children)) continue;
      for (const child of block.children) {
        const original = child.text;
        const updated = rewriteText(original);
        if (original !== updated && updated != null) {
          totalSpans++;
          docChanged = true;
          const path = `body[_key=="${block._key}"].children[_key=="${child._key}"].text`;
          txn = txn.patch(doc._id, (p) => p.set({ [path]: updated }));
        }
      }
    }

    if (docChanged) {
      docsTouched++;
      console.log(`  Patching ${doc._type}/${doc.slug || doc._id} ...`);
      await txn.commit({ visibility: "async" });
    }
  }

  console.log(`\n✓ Done. Updated ${totalSpans} text spans across ${docsTouched} documents.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
