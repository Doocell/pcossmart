import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getBackendMode, supabase } from "../lib/supabase";

const AuthContext = createContext(null);

function readOAuthCallbackError() {
  try {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const rawDesc =
      search.get("error_description") ||
      hash.get("error_description") ||
      search.get("error") ||
      hash.get("error");
    return rawDesc ? decodeURIComponent(rawDesc.replace(/\+/g, " ")) : "";
  } catch {
    return "";
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [oauthError, setOauthError] = useState(readOAuthCallbackError);

  const hadSessionRef = useRef(false);
  const explicitLogoutRef = useRef(false);
  const initialGetSessionDoneRef = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nickname, age_range, consent_at, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error.message);
      setProfile(null);
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      hadSessionRef.current = Boolean(initialSession?.user);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      }
      initialGetSessionDoneRef.current = true;
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setSessionExpired(false);
        setOauthError("");
        explicitLogoutRef.current = false;
        hadSessionRef.current = true;
      }
      if (event === "SIGNED_OUT") {
        if (hadSessionRef.current && !explicitLogoutRef.current) {
          setSessionExpired(true);
        }
        hadSessionRef.current = false;
      }
      if (event === "INITIAL_SESSION" && !nextSession && !initialGetSessionDoneRef.current) {
        return;
      }
      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async ({ email, password, nickname }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    explicitLogoutRef.current = false;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setSessionExpired(false);
    hadSessionRef.current = true;
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    return data;
  };

  const signInWithGoogle = async () => {
    explicitLogoutRef.current = false;
    setSessionExpired(false);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    explicitLogoutRef.current = true;
    setSessionExpired(false);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const saveOnboardingProfile = async ({ nickname, age_range, consent_at }) => {
    if (!user) throw new Error("Pengguna belum masuk.");

    const rawCandidate =
      nickname ||
      profile?.nickname ||
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Sahabat";
    const safeNickname = String(rawCandidate).trim().slice(0, 30);

    const payload = {
      id: user.id,
      nickname: safeNickname.length >= 2 ? safeNickname : "Sahabat",
      age_range,
      consent_at: consent_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const updateProfileNickname = async (nickname) => {
    const clean = (nickname || "").trim();
    if (clean.length < 2 || clean.length > 30) {
      throw new Error("Nama panggilan harus terdiri dari 2 hingga 30 karakter.");
    }
    const targetUserId = user?.id || profile?.id;
    if (!targetUserId) {
      throw new Error("Sesi pengguna tidak ditemukan. Silakan masuk kembali.");
    }
    const payload = {
      id: targetUserId,
      nickname: clean,
      age_range: profile?.age_range || "18-24",
      consent_at: profile?.consent_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const deleteAccount = async () => {
    const targetUserId = user?.id || profile?.id;
    if (targetUserId) {
      const tasks = [
        supabase.from("daily_checkins").delete().eq("user_id", targetUserId),
        supabase.from("chat_messages").delete().eq("user_id", targetUserId),
        supabase.from("profiles").delete().eq("id", targetUserId),
      ];
      if (
        getBackendMode() === "local" &&
        targetUserId !== "11111111-1111-4111-8111-111111111111"
      ) {
        tasks.push(supabase.from("users").delete().eq("id", targetUserId));
      }
      await Promise.allSettled(tasks);
    }
    await signOut();
  };

  const needsOnboarding = Boolean(
    user && (!profile || !profile.age_range || !profile.consent_at)
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        sessionExpired,
        setSessionExpired,
        oauthError,
        setOauthError,
        needsOnboarding,
        fetchProfile,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        saveOnboardingProfile,
        updateProfileNickname,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
