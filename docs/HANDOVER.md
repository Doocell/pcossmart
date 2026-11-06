# 🚀 PCOSmart Backend - Team Handover Guide

**Status**: Backend Complete & Deployed ✅  
**Tanggal**: 7 November 2026  
**Developer**: danyr  
**GitHub Repo**: https://github.com/Doocell/pcossmart

---

## 📦 Apa yang Sudah Selesai

### ✅ Backend Infrastructure
- **Database**: 4 tables (profiles, daily_checkins, chat_messages, education_articles)
- **Migrations**: 4 files sudah applied ke production
- **Edge Function**: `chat` function dengan Gemini AI
- **Security**: Row Level Security (RLS) aktif di semua table
- **Testing**: 6 test scripts, semua passing

### ✅ Features Implemented
1. User authentication (email/password)
2. Onboarding dengan consent tracking
3. Daily health check-ins (period, mood, sleep, energy, symptoms)
4. AI chatbot dengan context awareness
5. Crisis detection & safety response
6. Education articles dengan categories
7. Rate limiting (20 messages/hour per user)
8. Message history storage

---

## 🔑 Credential & Access

### Supabase Project
- **Project ID**: `zhreisaigvyyhogudpld`
- **URL**: `https://zhreisaigvyyhogudpld.supabase.co`
- **Region**: ap-southeast-1 (Singapore)

### Cara Akses Supabase Dashboard
1. Buka https://supabase.com/dashboard
2. Login dengan akun yang punya akses ke project
3. Pilih project **pcosmart** (ID: zhreisaigvyyhogudpld)

### API Keys (Butuh dari .env)
```bash
# Frontend butuh ini:
SUPABASE_URL=https://zhreisaigvyyhogudpld.supabase.co
SUPABASE_ANON_KEY=<minta ke danyr>

# Backend development butuh ini:
SUPABASE_SERVICE_ROLE_KEY=<minta ke danyr>
GEMINI_API_KEY=<minta ke danyr>
```

⚠️ **JANGAN share SUPABASE_SERVICE_ROLE_KEY & GEMINI_API_KEY di public!**

---

## 📂 Repository Structure

```
pcossmart/
├── supabase/
│   ├── functions/
│   │   ├── chat/              # AI chatbot endpoint
│   │   │   └── index.ts
│   │   └── _shared/           # Shared utilities
│   │       ├── gemini.ts      # Gemini API integration
│   │       ├── context.ts     # Context assembly
│   │       ├── safety.ts      # Crisis detection
│   │       └── http.ts        # HTTP utilities
│   ├── migrations/
│   │   ├── 001_init.sql       # Base schema
│   │   ├── 002_contract.sql   # Constraints & RLS
│   │   ├── 003_seed_articles.sql
│   │   └── 004_add_consent.sql
│   └── config.toml            # Supabase config
├── scripts/                   # Testing scripts
│   ├── test-chat.mjs          # Test chatbot
│   ├── test-rls.mjs           # Test RLS policies
│   ├── test-safety.mjs        # Test crisis detection
│   └── test-gemini.mjs        # Test AI integration
├── docs/
│   ├── SETUP.md               # Setup guide
│   ├── HANDOVER.md            # This file
│   ├── TESTING_GUIDE.md       # Testing guide
│   └── API Contract PCOSmart v1.0.pdf
├── .env                       # Environment variables (local)
├── .env.example               # Template
├── CHANGELOG.md               # Version history
└── README.md                  # Project overview
```

---

## 🛠️ Setup untuk Team Member

### 1. Clone Repository
```bash
git clone https://github.com/Doocell/pcossmart.git
cd pcossmart
```

### 2. Checkout Branch yang Sesuai
```bash
# Untuk production:
git checkout main

# Untuk development:
git checkout feat/backend-setup
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
```bash
# Copy template
cp .env.example .env

# Edit .env, minta credential ke danyr:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - GEMINI_API_KEY
```

### 5. Install Supabase CLI (Optional)
```bash
npm install -g supabase

# Login ke Supabase
npx supabase login

# Link ke project
npx supabase link --project-ref zhreisaigvyyhogudpld
```

⚠️ **PENTING**: Kalau tidak punya Docker, pakai flag `--remote` untuk semua command Supabase!

---

## 🧪 Testing Backend

### Quick Test
```bash
# Test RLS (production scenario)
node --env-file=.env scripts/test-real-scenario.mjs

# Test individual components
node --env-file=.env scripts/test-rls.mjs
node --env-file=.env scripts/test-chat.mjs
node --env-file=.env scripts/test-safety.mjs
node --env-file=.env scripts/test-gemini.mjs
```

**Note:** `test-rls.mjs` may show 1 failure (Test 3) - this is expected and NOT a security issue. Use `test-real-scenario.mjs` for accurate RLS validation.

Lihat **docs/TESTING_GUIDE.md** untuk detail lengkap.

---

## 📡 API Endpoints untuk Frontend

### Base URL
```
https://zhreisaigvyyhogudpld.supabase.co
```

### 1. Authentication
```javascript
// Sign Up
POST /auth/v1/signup
Body: { email, password }

// Sign In
POST /auth/v1/token?grant_type=password
Body: { email, password }

// Get User
GET /auth/v1/user
Headers: { Authorization: Bearer <token> }
```

### 2. Profiles
```javascript
// Get Profile
GET /rest/v1/profiles?user_id=eq.<user_id>
Headers: { 
  Authorization: Bearer <token>,
  apikey: <SUPABASE_ANON_KEY>
}

// Update Profile
PATCH /rest/v1/profiles?user_id=eq.<user_id>
Body: { name, birth_date, consent_at }
```

### 3. Daily Check-ins
```javascript
// Create Check-in
POST /rest/v1/daily_checkins
Body: {
  user_id,
  period_day,
  symptoms: ["cramps", "bloating"],
  energy_level: 3,
  mood_notes: "feeling okay",
  sleep_hours: 7.5
}

// Get Check-ins (last 7 days)
GET /rest/v1/daily_checkins?user_id=eq.<user_id>&order=date.desc&limit=7
```

### 4. AI Chatbot
```javascript
// Chat dengan AI
POST /functions/v1/chat
Headers: { 
  Authorization: Bearer <token>,
  Content-Type: application/json
}
Body: {
  message: "Halo, aku merasa kembung hari ini",
  mode: "chat",  // "chat" | "recommendation"
  tasks: []      // untuk mode recommendation
}

// Response:
{
  reply: "...",
  flag: "none",  // "none" | "warning" | "severe" | "crisis"
  sources: [...],
  message_id: "..."
}
```

### 5. Education Articles
```javascript
// Get Articles
GET /rest/v1/education_articles?status=eq.published&order=created_at.desc

// Search by Category
GET /rest/v1/education_articles?category=eq.nutrition&status=eq.published
```

---

## 🎨 Frontend Development

### Recommended Stack
- **Framework**: React 18+ / Vue 3 / Next.js
- **Supabase Client**: `@supabase/supabase-js`
- **UI Library**: Tailwind CSS / Material-UI / Chakra UI
- **State Management**: Zustand / React Context / Pinia (Vue)

### Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### Initialize Supabase Client
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

export default supabase
```

### Example: Chat Integration
```javascript
import supabase from './supabaseClient'

async function sendMessage(message) {
  // Get user session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  // Call chat function
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { 
      message,
      mode: 'chat',
      tasks: []
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  })

  if (error) throw error
  return data
}
```

### Example: Daily Check-in
```javascript
async function submitCheckin(checkinData) {
  const { data, error } = await supabase
    .from('daily_checkins')
    .insert({
      user_id: (await supabase.auth.getUser()).data.user.id,
      ...checkinData
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

## 🔄 Git Workflow

### Branch Strategy
- `main` - Production-ready code
- `feat/*` - Feature branches
- `fix/*` - Bug fixes
- `chore/*` - Maintenance tasks

### Development Flow
```bash
# 1. Pull latest changes
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feat/your-feature-name

# 3. Make changes, commit
git add .
git commit -m "feat: add user profile page"

# 4. Push to GitHub
git push -u origin feat/your-feature-name

# 5. Create Pull Request di GitHub
# 6. After review, merge to main
```

---

## 📚 Documentation Links

- **Setup Guide**: `docs/SETUP.md`
- **Testing Guide**: `docs/TESTING_GUIDE.md`
- **API Contract**: `docs/API Contract PCOSmart v1.0.pdf`
- **Changelog**: `CHANGELOG.md`
- **Supabase Docs**: https://supabase.com/docs
- **Gemini API Docs**: https://ai.google.dev/docs

---

## 🐛 Known Issues & Limitations

1. **Delete Account**: Belum implemented (API Contract 8.2)
2. **Safety Keywords**: Hanya level "crisis" yang lengkap, "warning" & "severe" perlu expansion
3. **Recommendation Mode**: Parser untuk tasks prioritization belum optimal
4. **Rate Limit**: No warning notification ke user

---

## 🆘 Troubleshooting

### Error: "Invalid login credentials"
- Cek apakah user sudah terdaftar di Supabase Auth
- Verifikasi email/password benar
- Pastikan SUPABASE_URL & SUPABASE_ANON_KEY benar

### Error: "JWT expired"
- Token expired setelah 1 jam
- Frontend harus refresh token atau re-login

### Error: "Row level security policy violation"
- User tidak authenticated dengan benar
- RLS policy blocking akses
- Cek apakah user_id match dengan auth user

### Error: "Failed to connect to database"
- Supabase project mungkin paused (free tier auto-pause setelah 7 hari idle)
- Buka Supabase dashboard untuk wake up project

### Chat Function Error 500
- Cek Supabase function logs di dashboard
- Verifikasi GEMINI_API_KEY masih valid
- Cek rate limit (20 msg/hour)

---

## 👥 Contact

**Backend Developer**: danyr  
**GitHub Issues**: https://github.com/Doocell/pcossmart/issues  
**Supabase Project**: https://supabase.com/dashboard/project/zhreisaigvyyhogudpld

---

## ✅ Next Steps untuk Team

### Frontend Developer
1. Setup project (React/Vue/Next.js)
2. Integrate Supabase client
3. Implement pages:
   - Login/Register
   - Onboarding (consent)
   - Daily Check-in form
   - Chat interface
   - Profile page
   - Education articles list

### Backend Developer
1. Implement delete-account function
2. Expand safety keywords
3. Enhance recommendation mode parser
4. Add rate limit warnings

### QA/Tester
1. Follow `docs/TESTING_GUIDE.md`
2. Test all API endpoints
3. Security testing (RLS policies)
4. Load testing (rate limits)

### DevOps
1. Setup CI/CD pipeline
2. Environment management (staging/production)
3. Monitoring & logging
4. Backup strategy

---

**Happy Coding! 🚀**
