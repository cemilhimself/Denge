const config = window.DENGE_SUPABASE_CONFIG || {};
const publishableKey = config.publishableKey || config.anonKey;
const configured = /^https:\/\//.test(config.url || "") && !!publishableKey;
let client;
let syncReady = false;
let pendingConflict = null;
let saveTimer;

const status = (text, state = "") => window.dispatchEvent(new CustomEvent("denge:cloud-status", { detail: { text, state } }));
const message = (text, open = false) => window.dispatchEvent(new CustomEvent("denge:cloud-message", { detail: { text, open } }));
const loginMessage = text => window.dispatchEvent(new CustomEvent("denge:login-message", { detail: { text } }));
const sessionEvent = user => window.dispatchEvent(new CustomEvent("denge:cloud-session", { detail: user || null }));
const lockApp = text => { document.documentElement.classList.add("auth-pending"); if (text) loginMessage(text); };
const unlockApp = () => { document.documentElement.classList.remove("auth-pending"); loginMessage(""); };
const hasContent = payload => Object.values(payload?.months || {}).some(month =>
  Number(month.income) || Number(month.card) || Number(month.savings) ||
  Object.values(month.fixedItems || {}).some(Number) || (month.transactions || []).length ||
  (month.categories || []).some(category => Number(category.limit))
);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function push(payload) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;
  const { error } = await client.from("denge_data").upsert({ user_id: user.id, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

async function pullAndReconcile(user) {
  syncReady = false;
  status("Bulut kontrol ediliyor…", "warn");
  const { data, error } = await client.from("denge_data").select("payload").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  const local = window.dengeStorage.get();
  const remote = data?.payload;
  if (!remote) {
    await push(local);
  } else {
    const localHas = hasContent(local);
    const remoteHas = hasContent(remote);
    if (remoteHas && !localHas) window.dengeStorage.replace(remote);
    else if (remoteHas && localHas && !same(local, remote)) {
      pendingConflict = { local, remote };
      syncReady = false;
      status("Seçim bekleniyor", "warn");
      window.dispatchEvent(new CustomEvent("denge:cloud-conflict"));
      return;
    } else if (localHas && !remoteHas) await push(local);
    else if (!same(local, remote)) window.dengeStorage.replace(remote);
  }
  syncReady = true;
  status("Eşitlendi", "online");
  unlockApp();
}

async function boot() {
  if (location.protocol === "file:") {
    unlockApp();
    status("Yalnızca bu cihaz", "");
    document.getElementById("cloudSignedOut").hidden = true;
    document.getElementById("cloudHelp").textContent = "Bulut girişi yayınlanan HTTPS adresinde kullanılabilir. Bu dosya sürümü yalnızca bu cihazda çalışır.";
    return;
  }
  if (!configured) {
    unlockApp();
    status("Bulut kurulumu bekliyor", "warn");
    document.getElementById("cloudSignedOut").hidden = true;
    document.getElementById("cloudHelp").textContent = "Supabase projesi bu uygulamaya henüz bağlanmadı. Kurulum adımları README.md dosyasında.";
    document.getElementById("cloudAccountBtn").addEventListener("click", () => {
      document.getElementById("cloudHelp").textContent = "Supabase Project URL ve publishable/anon key, supabase-config.js dosyasına eklenince giriş açılır. Şimdilik verilerin bu cihazda kalır.";
      message("Kurulum için README.md dosyasını aç.");
    });
    return;
  }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    client = createClient(config.url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    window.dengeCloud = {
      async signIn(email, password) {
        loginMessage("Giriş kontrol ediliyor…");
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) loginMessage("Giriş başarısız. E-posta ve şifreni kontrol et.");
        else loginMessage("Giriş başarılı; bütçen yükleniyor…");
      },
      async signOut() {
        const { error } = await client.auth.signOut();
        if (error) message(`Çıkış yapılamadı: ${error.message}`);
      },
      async resolveConflict(choice) {
        if (!pendingConflict) return;
        try {
          if (choice === "cloud") window.dengeStorage.replace(pendingConflict.remote);
          await push(choice === "cloud" ? pendingConflict.remote : pendingConflict.local);
          pendingConflict = null;
          syncReady = true;
          status("Eşitlendi", "online");
          unlockApp();
          message(choice === "cloud" ? "Bulut kaydı bu cihaza alındı." : "Bu cihazdaki kayıt buluta yüklendi.");
        } catch (error) { loginMessage("Bulut eşitlemesi tamamlanamadı. İnternet bağlantını ve tablo ayarını kontrol et."); status("Eşitleme hatası", "warn"); message(`Kayıt eşitlenemedi: ${error.message}`); }
      }
    };
    client.auth.onAuthStateChange((event, session) => {
      sessionEvent(session?.user);
      if (session?.user) {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          lockApp("Hesap kontrol ediliyor…");
          setTimeout(() => pullAndReconcile(session.user).catch(error => { lockApp("Bulut kaydı yüklenemedi. İnternetini veya veritabanı kurulumunu kontrol et."); status("Bağlantı sorunu", "warn"); message(`Bulut kaydı okunamadı: ${error.message}`); }), 0);
        }
      } else {
        syncReady = false;
        lockApp("Giriş için e-posta adresini ve şifreni yaz.");
        status("Yalnızca bu cihaz", "");
      }
    });
    window.addEventListener("denge:local-save", event => {
      if (!syncReady || !navigator.onLine) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => push(event.detail).then(() => status("Eşitlendi", "online")).catch(error => { status("Eşitleme bekliyor", "warn"); console.error("Denge cloud sync:", error); }), 700);
    });
    window.addEventListener("online", () => client.auth.getSession().then(({ data }) => data.session?.user && pullAndReconcile(data.session.user).catch(() => status("Bağlantı sorunu", "warn"))));
    window.dispatchEvent(new CustomEvent("denge:cloud-ready", { detail: { ready: true } }));
    const { data: { session } } = await client.auth.getSession();
    sessionEvent(session?.user);
    if (!session) { lockApp("Giriş için e-posta adresini ve şifreni yaz."); status("Giriş yapınca eşitlenir", ""); }
  } catch (error) {
    if (!window.dengeCloud) {
      status("Bulut bağlantısı açılamadı", "warn");
      loginMessage("Güvenli giriş bağlantısı yüklenemedi. İnternet bağlantını kontrol et.");
      window.dispatchEvent(new CustomEvent("denge:cloud-ready", { detail: { ready: false } }));
    } else {
      status("Oturum kontrol ediliyor", "warn");
      console.error("Denge session initialization:", error);
    }
    console.error("Denge cloud setup:", error);
  }
}

boot();

