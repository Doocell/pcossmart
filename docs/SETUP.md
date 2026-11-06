# PCOSmart Backend Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account and project created
- Git repository initialized

## 1. Database Setup

### 1.1 Link to Supabase Project

```bash
npx supabase link --project-ref <your-project-ref>
```

### 1.2 Push Database Migrations

```bash
npx supabase db push --remote --yes
```

This will apply all migrations:
- `001_init.sql` - Base schema (profiles, daily_checkins, chat_messages, education_articles)
- `002_contract.sql` - Constraints and updated RLS policies
- `003_seed_articles.sql` - Sample education articles
- `004_add_consent.sql` - Add consent_at field to profiles

## 2. Environment Variables

### 2.1 Local Environment (.env)

Create a `.env` file (already gitignored):

```bash
# Frontend
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase CLI (untuk db operations)
SUPABASE_DB_PASSWORD=your_database_password_here

# Test users (optional, for testing)
TEST_A_EMAIL=test-user-a@example.com
TEST_A_PASSWORD=testpassword123
TEST_B_EMAIL=test-user-b@example.com
TEST_B_PASSWORD=testpassword123

# Backend secrets (disimpan via supabase secrets, bukan di .env)
# GEMINI_API_KEY=
# GEMINI_MODEL=
# GROQ_API_KEY=
```

### 2.2 Supabase Secrets (Production)

Set secrets for Edge Functions:

```bash
# Required: Gemini API Key
npx supabase secrets set GEMINI_API_KEY="your_gemini_api_key" --remote

# Required: Gemini Model
npx supabase secrets set GEMINI_MODEL="gemini-1.5-flash" --remote

# Optional: GROQ fallback
npx supabase secrets set GROQ_API_KEY="your_groq_api_key" --remote
```

**Getting API Keys:**
- Gemini: https://aistudio.google.com/app/apikey
- GROQ: https://console.groq.com/keys

## 3. Deploy Edge Functions

### 3.1 Enable Function in Config

Function `chat` is already enabled in `supabase/config.toml`:

```toml
[functions.chat]
enabled = true
```

### 3.2 Deploy to Supabase

```bash
npx supabase functions deploy chat --remote=<your-project-ref>
```

Or deploy all functions:

```bash
npx supabase functions deploy --remote=<your-project-ref>
```

## 4. Testing

### 4.1 Install Dependencies

```bash
npm install
```

### 4.2 Run Tests

**Test RLS Policies:**
```bash
node --env-file=.env scripts/test-rls.mjs
```

**Test Chat Authentication:**
```bash
node --env-file=.env scripts/test-chat.mjs
```

**Test Safety System:**
```bash
node --env-file=.env scripts/test-safety.mjs
```

### 4.3 Expected Results

All tests should pass (✅):
- RLS policies working correctly
- Authentication & authorization enforced
- Rate limiting (20 messages/hour)
- Safety filtering (crisis detection)
- Gemini integration responding

## 5. Project Structure

```
PCOS SETUP/
├── .env                          # Local environment variables (gitignored)
├── .env.example                  # Example environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Node dependencies
├── docs/
│   ├── SETUP.md                  # This file
│   └── API Contract PCOSmart v1.0.pdf
├── scripts/
│   ├── test-rls.mjs              # Test RLS policies
│   ├── test-chat.mjs             # Test chat authentication
│   └── test-safety.mjs           # Test safety system
└── supabase/
    ├── config.toml               # Supabase configuration
    ├── functions/
    │   ├── chat/
    │   │   ├── index.ts          # Main chat function
    │   │   └── deno.json         # Deno config
    │   └── _shared/
    │       ├── http.ts           # HTTP utilities
    │       ├── safety.ts         # Safety filtering
    │       ├── context.ts        # Context assembly
    │       └── gemini.ts         # Gemini integration
    └── migrations/
        ├── 001_init.sql          # Base schema
        ├── 002_contract.sql      # Constraints & RLS
        ├── 003_seed_articles.sql # Sample articles
        └── 004_add_consent.sql   # Add consent field
```

## 6. Common Issues

### Issue: "failed to connect to postgres"
**Solution:** Make sure you've set `SUPABASE_DB_PASSWORD` in `.env`

### Issue: "GEMINI_API_KEY not configured"
**Solution:** Set the secret via `npx supabase secrets set`

### Issue: "Docker is not running"
**Solution:** This is just a warning. Add `--remote` flag to push to cloud:
```bash
npx supabase db push --remote --yes
```

### Issue: Function returns 503 LLM_UNAVAILABLE
**Solution:** 
1. Check Gemini API key is valid
2. Check Gemini quota hasn't been exceeded
3. View function logs in Supabase Dashboard

## 7. Monitoring

### View Function Logs

Dashboard: https://supabase.com/dashboard/project/<your-ref>/functions

Or via CLI:
```bash
npx supabase functions logs chat --remote=<your-project-ref>
```

### View Database in Dashboard

Editor: https://supabase.com/dashboard/project/<your-ref>/editor

## 8. Next Steps

- [ ] Set up frontend integration
- [ ] Add more education articles
- [ ] Implement delete-account function
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting alerts

## Support

For issues or questions, refer to:
- API Contract: `docs/API Contract PCOSmart v1.0.pdf`
- Supabase Docs: https://supabase.com/docs
- Gemini API Docs: https://ai.google.dev/docs
