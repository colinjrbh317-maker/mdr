# Finishing the VerifyGate wiring (2 lines, ~30 seconds)

The auto-classifier blocked me from editing your `StopOrchestrator.hook.ts` directly (it considers self-modification of the agent's behavior config a permission-elevated action). The handler file itself is fully built at `~/.claude/hooks/handlers/VerifyGate.ts`.

**To finish wiring**, open `~/.claude/hooks/StopOrchestrator.hook.ts` and make these two tiny edits:

### Edit 1: add the import (near line 29, alongside the other handler imports)

```ts
import { handleVerifyGate } from './handlers/VerifyGate';
```

### Edit 2: add it to the handlers array (around line 110)

Find this block:
```ts
const handlers: Promise<void>[] = [
  handleTabState(parsed, hookInput.session_id),
  handleRebuildSkill(),
  handleAlgorithmEnrichment(parsed, hookInput.session_id),
  handleDocCrossRefIntegrity(parsed, hookInput),
];
const handlerNames = ['TabState', 'RebuildSkill', 'AlgorithmEnrichment', 'DocCrossRefIntegrity'];
```

Change to:
```ts
const handlers: Promise<void>[] = [
  handleTabState(parsed, hookInput.session_id),
  handleRebuildSkill(),
  handleAlgorithmEnrichment(parsed, hookInput.session_id),
  handleDocCrossRefIntegrity(parsed, hookInput),
  handleVerifyGate(parsed),
];
const handlerNames = ['TabState', 'RebuildSkill', 'AlgorithmEnrichment', 'DocCrossRefIntegrity', 'VerifyGate'];
```

Save. Done. Now every time a Claude session ends, VerifyGate runs — in soft mode by default (warns when you forgot to verify, doesn't block).

### To change modes later
Edit `~/.claude/verify-mode.json`:
- `"soft"` — warn only (current)
- `"prompt"` — voice asks (currently falls back to soft, prompt UI not yet wired)
- `"hard"` — blocks the turn until Verify runs (set this once you trust the signals)

### To test the hook
```bash
echo '{"session_id":"test","transcript_path":"/tmp/fake-transcript.jsonl","hook_event_name":"Stop"}' | bun ~/.claude/hooks/StopOrchestrator.hook.ts
```
