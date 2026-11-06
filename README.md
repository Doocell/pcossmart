# PCOSmart Backend

Backend untuk aplikasi PCOSmart - aplikasi pendukung kesehatan untuk perempuan dengan PCOS.

## Tech Stack

- **Database**: Supabase (PostgreSQL)
- **Edge Functions**: Deno (TypeScript)
- **AI Integration**: Google Gemini (with GROQ fallback)
- **Authentication**: Supabase Auth (Email/Password)
- **Security**: Row Level Security (RLS)

## Quick Start

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_DB_PASSWORD=your_db_password
```

### 3. Setup Database

```bash
# Link to Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push --remote --yes
```

### 4. Set API Secrets

```bash
# Gemini API Key (required)
npx supabase secrets set GEMINI_API_KEY="your_key" --remote
npx supabase secrets set GEMINI_MODEL="gemini-1.5-flash" --remote

# GROQ API Key (optional, for fallback)
npx supabase secrets set GROQ_API_KEY="your_key" --remote
```

### 5. Deploy Functions

```bash
npx supabase functions deploy chat --remote=your-project-ref
```

### 6. Run Tests

```bash
# Test RLS policies
node --env-file=.env scripts/test-rls.mjs

# Test chat function
node --env-file=.env scripts/test-chat.mjs

# Test safety system
node --env-file=.env scripts/test-safety.mjs
```

## Features

### ✅ Implemented

- **Authentication & Authorization**
  - Email/password signup and login
  - JWT verification
  - Consent-based onboarding flow
  
- **Row Level Security (RLS)**
  - Users can only access their own data
  - Public read access for education articles
  - Server-only write access for chat messages

- **Daily Check-ins**
  - Track period, symptoms, energy, mood, sleep
  - One check-in per day per user
  - Data validation with constraints

- **AI Chatbot**
  - Context-aware responses (recent messages, check-in data, articles)
  - Safety filtering (crisis detection)
  - Rate limiting (20 messages/hour)
  - Mode: free chat & daily recommendation
  - 20-second timeout with fallback provider

- **Safety System**
  - Keyword-based crisis detection
  - Automatic crisis response with helpline info
  - Flag levels: none, warning, severe, crisis
  - No LLM call for crisis messages

- **Education Articles**
  - Markdown-formatted articles
  - Category filtering
  - Search functionality
  - Source attribution

### 🚧 To Be Implemented

- **Account Management**
  - Export user data (JSON)
  - Delete account function
  
- **Enhanced Recommendations**
  - Task prioritization
  - Activity suggestions based on check-in

## API Endpoints

### Edge Functions

#### POST `/functions/v1/chat`

Send message to chatbot.

**Request:**
```json
{
  "message": "Aku capek banget hari ini",
  "mode": "free",
  "context_article_id": null,
  "tasks": []
}
```

**Response:**
```json
{
  "user_message_id": "uuid",
  "reply": {
    "id": "uuid",
    "text": "Response text...",
    "card": null,
    "sources": [],
    "suggested_action": null
  },
  "flag": { "level": "none", "banner": null },
  "usage": { "remaining_this_hour": 19 }
}
```

**Error Codes:**
- `400 VALIDATION_ERROR` - Invalid input
- `401 UNAUTHENTICATED` - Not logged in or token expired
- `403 CONSENT_REQUIRED` - Onboarding not completed
- `429 RATE_LIMITED` - Exceeded 20 messages/hour
- `503 LLM_UNAVAILABLE` - AI service unavailable
- `500 INTERNAL` - Server error

### Database Tables (via Supabase Client)

#### `profiles`
- User profiles with consent tracking
- Public read, own profile update

#### `daily_checkins`
- Daily health check-ins
- RLS: users can only access own check-ins

#### `chat_messages`
- Chat history with AI assistant
- RLS: users can only read own messages
- Server-only write (via Edge Function)

#### `education_articles`
- Health education content
- Public read access for published articles

## Database Schema

See migrations in `supabase/migrations/`:
- `001_init.sql` - Base schema
- `002_contract.sql` - Constraints and RLS policies
- `003_seed_articles.sql` - Sample education articles
- `004_add_consent.sql` - Add consent tracking

## Testing

All test scripts are in `scripts/`:
- `test-rls.mjs` - Verify Row Level Security
- `test-chat.mjs` - Test authentication & authorization
- `test-safety.mjs` - Test crisis detection

## Documentation

- **Setup Guide**: `docs/SETUP.md`
- **API Contract**: `docs/API Contract PCOSmart v1.0.pdf`
- **Supabase Dashboard**: https://supabase.com/dashboard

## Project Structure

```
├── docs/                  # Documentation
├── scripts/               # Test scripts
├── supabase/
│   ├── functions/         # Edge Functions (Deno/TypeScript)
│   │   ├── chat/          # Main chatbot function
│   │   └── _shared/       # Shared utilities
│   └── migrations/        # Database migrations
├── .env                   # Local environment (gitignored)
├── .env.example           # Environment template
└── README.md             # This file
```

## Security Best Practices

- ✅ All sensitive keys in Supabase Secrets (never in code)
- ✅ Row Level Security enabled on all tables
- ✅ JWT verification on all protected endpoints
- ✅ Input validation on all requests
- ✅ Rate limiting to prevent abuse
- ✅ Crisis detection with immediate response
- ✅ No user message content logged in functions

## Contributing

1. Create feature branch: `git checkout -b feat/feature-name`
2. Make changes and test
3. Commit: `git commit -m "feat: description"`
4. Push: `git push origin feat/feature-name`
5. Create Pull Request

## License

Private project for educational purposes.

## Support

For issues or questions:
- Check `docs/SETUP.md` for setup instructions
- Review API Contract for endpoint specifications
- Check Supabase logs for function errors
