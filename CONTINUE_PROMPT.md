# 🔄 Continue Prompt - PCOSmart Project

Copy-paste prompt ini ke Claude AI session baru untuk melanjutkan project:

---

## 📍 Current Status

Saya sedang mengembangkan **PCOSmart**, aplikasi PCOS health tracking dengan AI chatbot.

**Progress saat ini:**
- ✅ Backend 100% complete (Supabase + Edge Functions)
- ✅ Database dengan 4 tables + RLS security
- ✅ AI Chatbot (Gemini integration) deployed
- ✅ Testing suite (7 scripts) all passing
- ✅ Documentation lengkap (5 guides)
- ✅ Git repository di GitHub: https://github.com/Doocell/pcossmart
- ⚠️ **Stuck di**: Testing manual via HTML test page, Gemini API kadang return "LLM_UNAVAILABLE"

**Project Path**: `d:\SEMESTER 5\PEM WEB\PCOS SETUP`

**Tech Stack:**
- Backend: Supabase (PostgreSQL, Auth, Edge Functions)
- AI: Google Gemini 3.5 Flash
- Runtime: Deno (Edge Functions)
- Testing: Node.js scripts + HTML test UI

---

## 🎯 What I Need Help With

### Primary Goal
Test backend API manually dan ensure AI chatbot working correctly.

### Immediate Issue
1. **HTML Test UI** (`test-ui.html`) sudah dibuat
2. Successfully:
   - ✅ Sign In/Sign Up working
   - ✅ Create Profile working (dengan consent)
   - ✅ Send chat message - request sent
3. Problem:
   - ❌ Kadang dapat error: `{"error": {"code": "LLM_UNAVAILABLE", "message": "Asisten sedang sibuk..."}}`
   - Gemini API key sudah di-update di Supabase secrets
   - Direct test ke Gemini API (via script) berhasil ✅
   - Tapi via Edge Function kadang gagal

### What I've Tried
- Updated `GEMINI_API_KEY` di Supabase secrets
- Verified key valid dengan `test-gemini-direct.mjs` ✅
- Fixed column names di test-ui.html (id vs user_id, check_date vs date)
- Fixed mode from 'chat' to 'free'

---

## 📂 Key Files

### Main Files to Review (if needed)
1. `supabase/functions/chat/index.ts` - Main chat endpoint
2. `supabase/functions/_shared/gemini.ts` - Gemini API integration
3. `test-ui.html` - Manual testing interface (HTML page)
4. `.env` - Environment variables (local)
5. `FINAL_SUMMARY.md` - Complete project summary

### Testing Tools Available
1. `test-ui.html` - Open in browser for visual testing
2. `scripts/test-gemini.mjs` - Test via Supabase function
3. `scripts/test-gemini-direct.mjs` - Test Gemini API directly
4. `postman_collection.json` - Postman API testing

### Credentials in `.env`
```
VITE_SUPABASE_URL=https://zhreisaigvyyhogudpld.supabase.co
VITE_SUPABASE_ANON_KEY=<legacy JWT key from .env>
GEMINI_API_KEY=<from .env file>
```

---

## 🔧 Debugging Steps Needed

### Step 1: Verify Edge Function Logs
Check Supabase function logs untuk error detail:
- Dashboard: https://supabase.com/dashboard/project/zhreisaigvyyhogudpld/functions
- Or via CLI (if available)

### Step 2: Test Flow
1. Open `test-ui.html` in browser
2. Paste anon key from `.env`
3. Sign In with existing user: `tester-tester-a@example.com` / `12345678`
4. Send chat message
5. Check if AI responds or gets `LLM_UNAVAILABLE`

### Step 3: Debug gemini.ts
Review `supabase/functions/_shared/gemini.ts`:
- Check timeout settings (currently 20s)
- Check error handling
- Check API endpoint format
- Verify model name `gemini-3.5-flash`

### Step 4: Possible Fixes
- Increase timeout di gemini.ts?
- Add retry logic?
- Check if Gemini API quota exceeded?
- Verify Edge Function has correct env vars?

---

## 📋 Project Context

### Database Schema (dari migrations)
```sql
-- profiles: id (PK), full_name, avatar_url, consent_at
-- daily_checkins: id (PK), user_id, check_date, on_period, period_intensity, energy, mood, notes, sleep_hours
-- chat_messages: id (PK), user_id, role, content, flag_level, meta, created_at
-- education_articles: id (PK), title, slug, category, content, published, created_at
```

### API Endpoints Working
- POST `/auth/v1/signup` - ✅
- POST `/auth/v1/token` - ✅
- GET/POST `/rest/v1/profiles` - ✅
- POST `/functions/v1/chat` - ⚠️ (kadang error)

### Edge Function Flow (chat)
1. Verify JWT token
2. Check profile consent
3. Validate input (message, mode, tasks)
4. Rate limiting (20 msg/hour)
5. Crisis detection (keyword-based)
6. Assemble context (last 10 messages, today's check-in, 7-day summary, articles)
7. **Call Gemini API** ← Problem di sini
8. Save messages to database
9. Return response

---

## 🎬 Commands to Run

### Test Gemini Directly (should work)
```bash
node --env-file=.env scripts/test-gemini-direct.mjs
```

### Test via Supabase Function (kadang error)
```bash
node --env-file=.env scripts/test-gemini.mjs
```

### Check Secrets
```bash
npx supabase secrets list --project-ref zhreisaigvyyhogudpld
```

### Update Secret (if needed)
```bash
npx supabase secrets set GEMINI_API_KEY="..." --project-ref zhreisaigvyyhogudpld
```

### Redeploy Function (if code changed)
```bash
npx supabase functions deploy chat --project-ref zhreisaigvyyhogudpld
```

---

## ❓ Questions to Answer

1. **Why LLM_UNAVAILABLE?**
   - Is it timeout issue?
   - Is it Gemini API quota?
   - Is it Edge Function environment issue?

2. **How to debug?**
   - Can we see Edge Function logs?
   - Can we add more logging to gemini.ts?

3. **Should we:**
   - Increase timeout?
   - Add retry logic?
   - Use different Gemini endpoint?
   - Test with GROQ as fallback?

---

## 🚀 Next Steps After Fix

Once chatbot working:
1. ✅ Mark backend 100% tested & working
2. 📝 Update documentation with testing results
3. 🎯 Decide next: Frontend setup or backend enhancements?

---

## 💬 Communication Style

- Saya Indonesian speaker, conversational tone
- Prefer step-by-step explanations
- Show commands to run
- Explain why before how
- Screenshot-friendly debugging

---

## 📞 If You Need More Info

Ask me to:
- Show specific file contents: `read_file` or `cat`
- Run specific commands: `execute_bash`
- Check logs or status
- Provide error screenshots

**Project is 95% complete, just need chatbot to work consistently! 🙏**

---

**Start with**: "Oke, aku lihat masalahnya. Mari kita debug LLM_UNAVAILABLE error step-by-step..."
