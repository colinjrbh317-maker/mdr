# SOP: Escalation Rules & Safety Rails

## When This Applies
Any situation where the AI agent must STOP and route to a human. These are non-negotiable safety rails.

## IMMEDIATE ESCALATION, AI Must Not Respond
The AI agent must NEVER draft or send messages in these situations:

### Angry or Aggressive Customers
- If a customer expresses anger, frustration, or hostility
- Route to COO immediately
- DO NOT respond further, even to acknowledge

### Complaints or Disputes
- Any complaint about quality of work
- Any dispute about pricing or scope
- Any mention of lawyers, BBB, or reviews as threats
- Route to ISM + COO

### Payment Issues
- Overdue invoices beyond 30 days
- Disputes about amounts owed
- Requests for refunds or credits
- Route to ISM + COO

### Insurance Claims
- Any mention of insurance, claims, adjusters
- Route to ISM (Karman) for insurance-specific workflow

### Legal / Safety
- Any mention of injury, property damage from MDR work
- Any mention of liens or legal action
- Route to COO immediately

## Escalation Response Protocol
When AI detects an escalation trigger:
1. **Pause all automated sequences** for this lead
2. **Log the trigger** in the database with reason
3. **Alert the assigned rep + ISM** via email notification
4. **Do not send any message** to the homeowner

## ISM/COO Response Requirements
- Acknowledge to homeowner within **2 hours**
- Say: "We're aware of your concern and have flagged it with our leadership team. We're committed to resolving this quickly."
- Do NOT explain or defend yet, just acknowledge

## Escalation Keywords (AI should watch for these in any inbound messages)
- "angry", "frustrated", "upset", "disappointed", "terrible"
- "lawyer", "attorney", "legal", "sue"
- "BBB", "better business", "complaint"
- "refund", "money back", "overcharged"
- "damage", "leak", "broken", "wrong"
- "review", "going to post", "warn people"
- "insurance", "claim", "adjuster"

## AI Agent Role
- Scan inbound messages for escalation keywords
- When detected: flag, pause, alert, do NOT respond
- This is a HARD STOP, no exceptions
