# Architecture Decision Records (ADR)

Dokumen ini mencatat keputusan teknis penting dalam proyek PCOSmart sesuai API Contract section 13.

---

## ADR-001: Database Schema Evolution (Migrations 001-011)

**Status**: Implemented  
**Date**: November 2026  
**Context**: Schema evolved dari initial design ke contract compliance

**Decision**:
- Migrations 001-004: Initial setup (profiles, check-ins, chat, articles)
- Migrations 005-008: RLS debugging iterations (preserved for history)
- Migration 009: Contract alignment (renamed check_date → checkin_date, symptoms as text[], energy/mood as integers 1-5)
- Migration 010: Role constraint updated (added 'system' - later found incorrect)
- Migration 011: **Fix role constraint to only 'user'|'model' per contract**

**Consequences**:
- ✅ Schema now matches contract exactly
- ⚠️ Orphan columns remain: `profiles.full_name`, `profiles.avatar_url` (not in contract, kept for backward compatibility)
- Migrations 005-008 retained as historical record (do NOT delete)

---

## ADR-002: Safety Filter Logic

**Status**: Implemented  
**Date**: November 2026

**Decision**: 
- Crisis level: Skip LLM entirely, return canned response immediately
- Severe/Warning level: Skip LLM, return help text with banner (contract 6.7.4c)
- None level: Proceed to LLM

**Implementation**: `_shared/safety.ts` + early returns in `chat/index.ts` lines 132-164

**Consequences**:
- ✅ No LLM quota wasted on crisis/severe cases
- ✅ Faster response time for safety cases
- ⚠️ Keyword list needs periodic review/expansion

---

## ADR-003: Recommendation Mode Without Check-in

**Status**: Implemented  
**Date**: November 2026

**Decision**: 
Mode `recommendation` requires today's check-in data. If absent, immediately return `suggested_action: 'open_checkin'` WITHOUT calling Gemini.

**Rationale**: 
- Contract requirement
- Gemini cannot give personalized recommendations without data
- Saves LLM quota

**Implementation**: Check at line 177 in `chat/index.ts`, before context assembly for Gemini

---

## ADR-004: Authentication Key Management

**Status**: In Progress  
**Date**: November 2026

**Context**: 
Initial `.env` used `service_role` key (bypasses RLS). Audit found this security risk.

**Decision**: 
- Frontend/tests MUST use `anon` key (validates RLS)
- Backend Edge Functions use `service_role` internally (isolated to Supabase)
- `.env.example` updated with clear instructions

**Verification**: 
Check key role via: 
```bash
node --env-file=.env -e "const k=process.env.VITE_SUPABASE_ANON_KEY||''; console.log(JSON.parse(Buffer.from(k.split('.')[1],'base64url')).role)"
```

---

## ADR-005: Test Suite Structure

**Status**: Implemented  
**Date**: November 2026

**Decision**: 
Retain focused test scripts:
- Core: test-anon, test-rls, test-chat, test-safety
- LLM: test-gemini-direct, test-gemini
- Integration: test-real-scenario (npm test)

Remove debug scripts (check-chat-data, debug-chat-rls, debug-function, list-gemini-models) - single-use, historical value only in git history.

---

## ADR-006: Manual Testing Tools

**Status**: Implemented  
**Date**: November 2026

**Decision**: 
Place manual test tools in `tools/` folder:
- `test-ui.html` - Browser-based UI testing
- `postman_collection.json` - Postman API tests

**Rationale**: 
Separate manual tools from automated scripts for clearer organization.

---

## Future Decisions to Document

- [ ] Delete account implementation (contract 8.2)
- [ ] Rate limit storage strategy (in-memory vs database)
- [ ] Gemini fallback to GROQ (when to enable)
- [ ] Article recommendation algorithm
- [ ] Task prioritization logic in recommendation mode

---

**Note**: All decisions must align with "API Contract PCOSmart v1.0.pdf" (docs/API Contract PCOSmart v1.0.pdf).
