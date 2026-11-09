# 🚀 Quick UI Setup Guide (5 Menit)

Kalau mau UI cepat untuk testing, ini langkah tercepat:

## Option A: Test UI HTML (Sudah Ada!)

```bash
# Buka di browser
start tools/test-ui.html
```

✅ **Sudah include**:
- Register/Login
- Chat interface
- Check-in form
- Article viewer

---

## Option B: React App Mini (Buat Baru)

### Step 1: Create React App

```bash
# Di folder lain (bukan di repo backend)
cd ..
npx create-react-app pcossmart-test-ui
cd pcossmart-test-ui
```

### Step 2: Install Supabase

```bash
npm install @supabase/supabase-js
```

### Step 3: Create `.env`

```env
REACT_APP_SUPABASE_URL=https://zhreisaigvyyhogudpld.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Replace `src/App.js`

```jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else setUser(data.user);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session.access_token;
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message, mode: 'free' }),
        }
      );
      const data = await res.json();
      if (data.reply) {
        setReply(data.reply.text);
      } else {
        setReply('Error: ' + JSON.stringify(data));
      }
    } catch (err) {
      setReply('Error: ' + err.message);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
        <h1>PCOSmart Test</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Use: tester-a@example.com / TestPassword123!
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '50px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>PCOSmart Chat Test</h1>
        <button onClick={handleLogout} style={{ padding: '10px' }}>Logout</button>
      </div>

      <form onSubmit={handleChat} style={{ marginBottom: '20px' }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ width: '100%', padding: '10px', minHeight: '80px', marginBottom: '10px' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      {reply && (
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3>AI Reply:</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{reply}</p>
        </div>
      )}
    </div>
  );
}

export default App;
```

### Step 5: Run

```bash
npm start
```

✅ **Working React app dengan**:
- Login
- Chat interface
- Real-time responses

**Waktu**: 5 menit total!

---

## Option C: Supabase Dashboard (No Code!)

Kamu juga bisa test langsung di Supabase Dashboard:

### 1. SQL Editor

**URL**: https://supabase.com/dashboard/project/zhreisaigvyyhogudpld/sql

**Test Query**:
```sql
-- Lihat semua profiles
select * from profiles;

-- Lihat check-ins hari ini
select * from daily_checkins 
where checkin_date = current_date;

-- Lihat chat messages
select * from chat_messages 
order by created_at desc 
limit 10;
```

### 2. Table Editor

**URL**: https://supabase.com/dashboard/project/zhreisaigvyyhogudpld/editor

**Actions**:
- ✅ View data
- ✅ Insert rows manual
- ✅ Edit records
- ✅ Delete records

### 3. Authentication

**URL**: https://supabase.com/dashboard/project/zhreisaigvyyhogudpld/auth/users

**Actions**:
- ✅ See all users
- ✅ Create test users
- ✅ Reset passwords
- ✅ Delete users

---

## 📊 Testing Checklist

Sebelum demo/presentasi, test ini:

### ✅ Authentication
- [ ] Register user baru
- [ ] Login dengan user tersebut
- [ ] Logout
- [ ] Login lagi

### ✅ Profile
- [ ] Set nickname & age_range
- [ ] View profile

### ✅ Check-in
- [ ] Create check-in hari ini
- [ ] View check-in history
- [ ] Update check-in
- [ ] Delete check-in

### ✅ Chat - Free Mode
- [ ] Send normal message
- [ ] Get AI response
- [ ] See message in history

### ✅ Chat - Recommendation Mode
- [ ] Send with task list
- [ ] Get recommendation card
- [ ] Verify beban kerja & aktivitas

### ✅ Safety Filter
- [ ] Send crisis message ("bunuh diri")
- [ ] Verify banner appears
- [ ] Verify no LLM call (instant response)

### ✅ Rate Limiting
- [ ] Send 21 messages rapid
- [ ] Verify 429 error on 21st

### ✅ Articles
- [ ] View published articles
- [ ] Filter by category

---

## 🎬 Demo Script (5 Menit)

**Scenario**: Demo ke Dosen/Client

1. **Open test-ui.html** (10 detik)
2. **Register**: `demo@pcosmart.com` (20 detik)
3. **Login** (10 detik)
4. **Create Check-in**: Fill form, submit (30 detik)
5. **Chat Free**: "Apa tips diet untuk PCOS?" (30 detik)
6. **Chat Recommendation**: 
   - Message: "Kasih rekomendasi dong"
   - Tasks: "Meeting, Olahraga, Belanja"
   - (60 detik)
7. **Safety Test**: "saya depresi berat" → Show banner (30 detik)
8. **View Articles**: Browse education content (30 detik)

**Total**: 4 menit  
**Buffer**: 1 menit untuk tanya jawab

---

## 🚀 Kesimpulan

**Paling Mudah & Cepat**: 
→ **`tools/test-ui.html`** (sudah ada, tinggal buka!)

**Paling Professional**:
→ **Postman Collection** (import & test)

**Paling Automated**:
→ **Command Line Scripts** (npm test)

**Paling Real**:
→ **React App Mini** (5 menit setup)

**Pilih sesuai kebutuhan!** 🎯
