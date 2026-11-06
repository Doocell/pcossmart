# Changelog

All notable changes to PCOSmart Backend will be documented in this file.

## [1.0.0] - 2026-11-07

### Added - Backend Complete ✅

#### Database
- **Migration 001**: Base schema (profiles, daily_checkins, chat_messages, education_articles)
- **Migration 002**: Constraints and RLS policies enforcement
- **Migration 003**: Seed education articles (2 sample articles)
- **Migration 004**: Add consent tracking (consent_at field)

#### Edge Functions
- **chat function**: AI-powered chatbot with Gemini integration
  - JWT verification and authentication
  - Consent requirement check
  - Input validation (message 1-1000 chars, mode, tasks)
  - Rate limiting (20 messages per hour per user)
  - Safety filtering (crisis keyword detection)
  - Context assembly (recent messages, today's check-in, 7-day summary, relevant articles)
  - Gemini API integration (model: gemini-3.5-flash)
  - GROQ fallback support (optional)
  - Automatic message storage with metadata
  - Flag levels: none, warning, severe, crisis

#### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Server-only write access for chat_messages
- Public read access for published education articles
- JWT token verification on all protected endpoints
- API keys stored in Supabase secrets (never in code)

#### Testing
- `test-rls.mjs` - Verify RLS policies
- `test-chat.mjs` - Test authentication & authorization flows
- `test-safety.mjs` - Test crisis detection system
- `test-gemini.mjs` - Test Gemini AI integration
- `test-gemini-direct.mjs` - Direct Gemini API testing
- `debug-function.mjs` - Function debugging utilities
- `list-gemini-models.mjs` - List available Gemini models

#### Documentation
- `README.md` - Project overview and quick start
- `docs/SETUP.md` - Comprehensive setup guide
- `docs/API Contract PCOSmart v1.0.pdf` - API specification
- `.env.example` - Environment variables template

#### Features Implemented
- ✅ User authentication (email/password)
- ✅ Onboarding with consent tracking
- ✅ Daily health check-ins (period, symptoms, energy, mood, sleep)
- ✅ AI chatbot with context awareness
- ✅ Crisis detection and safety response
- ✅ Education articles with categories
- ✅ Rate limiting per user
- ✅ Message history storage
- ✅ Source attribution for AI responses

### Configuration
- **Supabase Project**: zhreisaigvyyhogudpld
- **AI Model**: gemini-3.5-flash (Google Gemini)
- **API Version**: v1
- **Timeout**: 20 seconds
- **Rate Limit**: 20 messages/hour per user

### Known Limitations
- No local development (Docker not required, uses Supabase remote)
- Delete account function not yet implemented
- Warning/severe safety keywords need expansion
- Recommendation mode card parsing needs enhancement

### Dependencies
- Supabase (PostgreSQL, Auth, Edge Functions)
- Deno runtime for Edge Functions
- Google Gemini API (gemini-3.5-flash)
- Node.js 18+ for testing scripts

### Testing Results
All tests passing ✅:
- RLS policies: 4/4 tests passed
- Authentication: 6/6 tests passed  
- Safety system: 3/3 tests passed
- Gemini integration: Working with real AI responses

---

## [Unreleased]

### Planned Features
- Delete account function (POST /functions/v1/delete-account)
- Enhanced safety keywords (warning and severe levels)
- Recommendation mode with task prioritization
- Export user data function
- Rate limit warning notifications
- Enhanced article recommendation algorithm
- Image support for chat responses

### Potential Improvements
- Caching for frequently accessed articles
- Database query optimization
- Batch operations for check-ins
- Webhook support for external integrations
- Multi-language support
- Voice input support for chat
