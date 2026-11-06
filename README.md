# 🌸 PCOSmart Backend

> AI-powered PCOS health tracking system with intelligent chatbot assistance

[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Backend](https://img.shields.io/badge/backend-complete-blue)]()
[![Tests](https://img.shields.io/badge/tests-passing-success)]()

**PCOSmart** is a comprehensive health tracking application designed for individuals managing Polycystic Ovary Syndrome (PCOS). This repository contains the complete backend infrastructure with AI-powered chatbot integration.

---

## ✨ Features

- 🔐 **Secure Authentication** - Email/password with JWT tokens
- 📊 **Daily Health Check-ins** - Track period, mood, energy, sleep, symptoms
- 🤖 **AI Chatbot** - Context-aware assistance powered by Google Gemini
- 🚨 **Crisis Detection** - Automatic safety response for concerning messages
- 📚 **Education Articles** - PCOS health information and tips
- 🔒 **Row Level Security** - User data isolation and protection
- ⏱️ **Rate Limiting** - 20 messages/hour per user
- 💬 **Message History** - Conversation tracking with metadata

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Gemini API key (optional, for local testing)

### Setup
```bash
# Clone repository
git clone https://github.com/Doocell/pcossmart.git
cd pcossmart

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run tests
npm test
```

---

## 📚 Documentation

- **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** - Complete project overview & stats
- **[docs/HANDOVER.md](docs/HANDOVER.md)** - Comprehensive team handover guide
- **[docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** - Testing instructions & examples
- **[docs/QUICK_START_TEAM.md](docs/QUICK_START_TEAM.md)** - Quick start for team members
- **[CHANGELOG.md](CHANGELOG.md)** - Version history & known issues

---

## 🏗️ Architecture

### Tech Stack
- **Database**: PostgreSQL (Supabase)
- **Runtime**: Deno (Edge Functions)
- **AI**: Google Gemini 3.5 Flash
- **Auth**: Supabase Auth (JWT)
- **Security**: Row Level Security (RLS)

### Project Structure
```
pcossmart/
├── supabase/
│   ├── functions/          # Edge Functions (API endpoints)
│   │   ├── chat/          # AI chatbot endpoint
│   │   └── _shared/       # Shared utilities
│   └── migrations/        # Database schema & migrations
├── scripts/               # Test scripts
├── docs/                  # Documentation
└── .env                   # Environment variables (local)
```

---

## 🔌 API Endpoints

**Base URL**: `https://zhreisaigvyyhogudpld.supabase.co`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/v1/signup` | POST | Register new user |
| `/auth/v1/token` | POST | Login (get JWT) |
| `/rest/v1/profiles` | GET/POST | User profile |
| `/rest/v1/daily_checkins` | GET/POST | Health check-ins |
| `/functions/v1/chat` | POST | AI chatbot |
| `/rest/v1/education_articles` | GET | Educational content |

**Full API docs**: See [docs/HANDOVER.md](docs/HANDOVER.md)

---

## 🧪 Testing

```bash
# Run all tests
npm test                    # Production scenario test (RLS)
npm run test:chat           # Authentication & authorization
npm run test:safety         # Crisis detection
npm run test:gemini         # AI integration
npm run test:rls            # Row Level Security
```

**Test Results**: 20+ test cases, all passing ✅

**Security Verified**:
- ✅ User A cannot see User B's data
- ✅ Chat messages isolated per user
- ✅ RLS policies enforced correctly

---

## 🔐 Security

### Row Level Security (RLS)
All tables protected with PostgreSQL RLS policies:
- Users can only access their own data
- Cross-user data access blocked
- Admin access via service role only

### Authentication
- JWT token-based authentication
- 1-hour token expiration
- Secure password hashing (bcrypt)

### Input Validation
- Message length limits (1-1000 chars)
- SQL injection protection
- XSS protection
- Type checking on all inputs

### Rate Limiting
- 20 messages per hour per user
- Prevents API abuse
- Tracked in database

---

## 👥 Team Roles

### Frontend Developer
**Task**: Build UI connecting to this backend

**Recommended Stack**: React + Supabase JS Client

**Quick Setup**:
```bash
npm install @supabase/supabase-js
```

**Read**: [docs/HANDOVER.md](docs/HANDOVER.md) - "Frontend Development" section

---

### Backend Developer
**Task**: Implement additional features

**To-Do**:
- Delete account endpoint
- Enhanced safety keywords
- Recommendation mode improvements

**Read**: [docs/HANDOVER.md](docs/HANDOVER.md) - "Known Issues" section

---

### QA/Tester
**Task**: Comprehensive testing

**Quick Test**: `npm test`

**Read**: [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

---

## 📊 Project Status

| Component | Status | Coverage |
|-----------|--------|----------|
| Database | ✅ Deployed | 8 migrations |
| Edge Functions | ✅ Live | Chat API |
| Authentication | ✅ Working | Email/password |
| RLS Security | ✅ Verified | User isolation |
| AI Integration | ✅ Working | Gemini 3.5 |
| Testing | ✅ Complete | 20+ tests |
| Documentation | ✅ Complete | 4 guides |

**Overall**: 100% Backend Complete 🎉

---

## 🛣️ Roadmap

### Completed ✅
- [x] Database schema & migrations
- [x] Authentication system
- [x] AI chatbot integration
- [x] Crisis detection
- [x] Row Level Security
- [x] Testing suite
- [x] Documentation

### Planned 📋
- [ ] Delete account endpoint
- [ ] Enhanced safety keywords (warning/severe levels)
- [ ] Recommendation mode improvements
- [ ] Rate limit notifications
- [ ] Image support in chat
- [ ] Multi-language support (i18n)

---

## 📄 License

This project is part of academic coursework.

**Course**: Pemrograman Web (Web Programming)  
**Semester**: 5  
**Institution**: [Your Institution]  
**Team**: PCOS Smart Development Team

---

## 👨‍💻 Contributors

- **Backend Lead**: danyr
- **Project**: PCOSmart
- **Duration**: November 2026

---

## 🆘 Support

**Issues**: [GitHub Issues](https://github.com/Doocell/pcossmart/issues)  
**Documentation**: See [docs/](docs/) folder  
**Contact**: Open an issue for questions

---

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Google Gemini** - AI integration
- **Deno** - Edge runtime

---

<div align="center">

**Built with ❤️ for PCOS health management**

[Documentation](docs/) • [API Reference](docs/HANDOVER.md) • [Testing Guide](docs/TESTING_GUIDE.md)

</div>
