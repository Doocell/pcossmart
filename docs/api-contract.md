# API Contract PCOSmart v1.0

> **Source of Truth**: [docs/API Contract PCOSmart v1.0.pdf](./API%20Contract%20PCOSmart%20v1.0.pdf)
> 
> This is a quick reference. For full details, refer to the PDF.

---

## Overview

PCOSmart backend provides AI-powered health assistant for women with PCOS, built on Supabase + Edge Functions + Gemini AI.

**Base URL**: `https://<project-id>.supabase.co/functions/v1`

---

## Endpoints

### 1. POST /chat

**Purpose**: Send message to AI assistant

**Auth**: JWT Bearer token (from Supabase Auth)

**Request Body**:
```json
{
  "message": "string (1-1000 chars, required)",
  "mode": "free | recommendation (default: free)",
  "context_article_id": "uuid | null",
  "tasks": ["string (max 10 items, each max 100 chars)"]
}
```

**Response 200 OK**:
```json
{
  "user_message_id": "uuid",
  "reply": {
    "id": "uuid",
    "text": "string",
    "card": {
      "beban": "ringan | sedang | normal",
      "aktivitas": ["string"],
      "tips_istirahat": "string",
      "prioritas_tugas": ["string"] | null
    } | null,
    "sources": [
      {
        "title": "string",
        "article_id": "uuid | null",
        "url": "string | null"
      }
    ],
    "suggested_action": "open_checkin | null"
  },
  "flag": {
    "level": "none | warning | severe | crisis",
    "banner": {
      "type": "see_doctor | crisis",
      "title": "string",
      "body": "string"
    } | null
  },
  "usage": {
    "remaining_this_hour": "integer (0-20)"
  }
}
```

**Error Responses**:
- `401 UNAUTHENTICATED` - Token invalid/expired
- `403 CONSENT_REQUIRED` - User belum selesai onboarding
- `400 VALIDATION_ERROR` - Input tidak valid
- `429 RATE_LIMITED` - Lebih dari 20 pesan per jam (header `Retry-After`)
- `503 LLM_UNAVAILABLE` - Gemini tidak tersedia (temporary)
- `500 INTERNAL` - Server error

**Business Rules**:
1. Rate limit: 20 messages per user per hour (rolling window)
2. Safety filter:
   - **Crisis** → Skip LLM, return canned response, flag = crisis
   - **Severe/Warning** → Skip LLM, return help text, flag = severe/warning
   - **None** → Call LLM normally
3. Mode `recommendation` without today's check-in → return `suggested_action: "open_checkin"` WITHOUT calling LLM
4. LLM timeout: 20 seconds
5. LLM unavailable → 503, do NOT save messages
6. Role in database: only `'user'` or `'model'`
7. Do NOT log message content (only error.message)

---

## Database Schema

### profiles

| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK, FK auth.users |
| nickname | text | NOT NULL, 2-30 chars |
| age_range | text | NOT NULL, values: '15-17'\|'18-24'\|'25-34'\|'35-44' |
| consent_at | timestamptz | NULL if not consented |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: User can only read/update own profile.

---

### daily_checkins

| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK auth.users, NOT NULL |
| checkin_date | date | NOT NULL, default today |
| on_period | boolean | NOT NULL |
| period_intensity | text | 'ringan'\|'sedang'\|'deras', NULL if !on_period |
| sleep_hours | numeric(4,2) | 0-24 |
| energy | integer | NOT NULL, 1-5 |
| mood | integer | NOT NULL, 1-5 |
| symptoms | text[] | NOT NULL, subset of: 'nyeri_perut', 'jerawat', 'rambut_rontok', 'rambut_berlebih', 'lelah', 'cemas', 'kembung', 'sulit_tidur' |
| notes | text | max 500 chars |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE(user_id, checkin_date) | | One check-in per day |

**RLS**: User can only CRUD own check-ins.

---

### chat_messages

| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK auth.users, NOT NULL |
| role | text | NOT NULL, 'user'\|'model' |
| content | text | NOT NULL |
| flag_level | text | NOT NULL, 'none'\|'warning'\|'severe'\|'crisis' |
| meta | jsonb | Stores card, sources |
| created_at | timestamptz | |

**RLS**: User can only SELECT own messages. INSERT via Edge Function only (service_role).

---

### education_articles

| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| category | text | NOT NULL |
| title | text | NOT NULL |
| body | text | NOT NULL |
| published | boolean | default false |
| created_at | timestamptz | |

**RLS**: Published articles readable by authenticated users.

---

## Security

1. **Row Level Security (RLS)** enabled on all tables
2. Frontend uses **anon key** (validates RLS)
3. Edge Functions use **service_role key** internally
4. JWT must contain valid user ID
5. Consent check required before chat access
6. No PII logging (only error types, not content)

---

## Testing

**Test Scripts**:
- `npm test` - Full integration test (test-real-scenario.mjs)
- `scripts/test-anon.mjs` - Verify anon key blocks direct DB access
- `scripts/test-rls.mjs` - Verify user isolation
- `scripts/test-chat.mjs` - Verify chat endpoint logic
- `scripts/test-safety.mjs` - Verify crisis handling

**Manual Tools**:
- `tools/test-ui.html` - Browser UI for testing
- `tools/postman_collection.json` - Postman tests

---

## Deployment

**Database Migrations**:
```bash
npx supabase db push
```

**Edge Functions**:
```bash
npx supabase functions deploy chat
```

**Secrets** (set via CLI):
```bash
npx supabase secrets set GEMINI_API_KEY=your_key
npx supabase secrets set GEMINI_MODEL=gemini-3.5-flash
```

---

## Known Limitations

1. **Delete account** endpoint not yet implemented (contract 8.2)
2. **Gemini intermittent availability** (external dependency)
3. **Rate limit** stored in-memory (resets on function restart)
4. **Safety keyword list** requires periodic updates

---

## Contract Compliance Checklist (Section 12)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | JWT auth + consent check | ✅ |
| 2 | Input validation (1-1000 chars, mode, etc) | ✅ |
| 3 | Rate limit 20/hour | ✅ |
| 4 | Safety filter (crisis/severe/warning skip LLM) | ✅ |
| 5 | Context assembly (messages, check-in, 7-day, articles) | ✅ |
| 6 | Gemini timeout 20s | ✅ |
| 7 | 503 on LLM fail without saving | ✅ |
| 8 | Save messages with flag_level | ✅ |
| 9 | Banner format {type, title, body} | ✅ |
| 10 | Role 'user'\|'model' only | ✅ (fixed in migration 011) |
| 11 | Recommendation without check-in → open_checkin | ✅ |
| 12 | No message content logging | ✅ |

**All requirements met** ✅

---

## References

- Full Contract: [docs/API Contract PCOSmart v1.0.pdf](./API%20Contract%20PCOSmart%20v1.0.pdf)
- Architecture Decisions: [docs/decisions.md](./decisions.md)
- Team Handover: [docs/HANDOVER.md](./HANDOVER.md)
- Testing Guide: [docs/TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

**Last Updated**: November 2026 (Post-Audit)
