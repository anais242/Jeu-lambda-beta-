// ═══════════════════════════════════════════
//  POKO — auth.js avec Supabase (multi-appareils)
// ═══════════════════════════════════════════

const SUPABASE_URL = 'https://agghgyidejzlxidrjswv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2hneWlkZWp6bHhpZHJqc3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ3MjcsImV4cCI6MjA4Nzg1MDcyN30.tS050ZrnbmwLWo4sWbt85fyy_em3g7_BjL7PF5acIhg';

// ── Client Supabase léger (fetch natif, sans SDK) ──────────
const SB = {
  headers: {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Prefer':        'return=representation'
  },
  async get(table, filters) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${table}?${filters||''}`;
      const r = await fetch(url, { headers: this.headers });
      return r.ok ? r.json() : [];
    } catch(e) { return []; }
  },
  async insert(table, data) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST', headers: this.headers, body: JSON.stringify(data)
      });
      return r.ok ? r.json() : null;
    } catch(e) { return null; }
  },
  async update(table, data, filters) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
        method: 'PATCH',
        headers: { ...this.headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(data)
      });
      return r.ok;
    } catch(e) { return false; }
  },
  async upsert(table, data) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(data)
      });
      return r.ok ? r.json() : null;
    } catch(e) { return null; }
  },
  async delete(table, filters) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
        method: 'DELETE', headers: this.headers
      });
      return r.ok;
    } catch(e) { return false; }
  }
};

// ── Session locale ─────────────────────────────────────────
function getSession()  { try { return JSON.parse(sessionStorage.getItem('poko_session')||'null'); } catch(e) { return null; } }
function setSession(u) { sessionStorage.setItem('poko_session', JSON.stringify(u)); }
function clearSession(){ sessionStorage.removeItem('poko_session'); }

// ── Cache utilisateur ──────────────────────────────────────
let _userCache = null;
let _userCacheTime = 0;

// ═══════════════════════════════════════════
//  POKO_DB
// ═══════════════════════════════════════════
const POKO_DB = {

  _toUser(row) {
    return {
      username:        row.username,
      email:           row.email,
      avatar:          row.avatar || '🃏',
      password:        row.password_hash,
      balance:         row.balance || 0,
      totalGames:      row.total_games || 0,
      totalWins:       row.total_wins || 0,
      totalEarned:     row.total_earned || 0,
      totalLost:       row.total_lost || 0,
      longestWinStreak:row.longest_streak || 0,
      currentStreak:   row.current_streak || 0,
      lastDailyBonus:  row.last_daily_bonus || null,
      banned:          row.banned || false,
      vip:             row.vip || false,
      createdAt:       row.created_at,
      lastLogin:       row.last_login,
      transactions: [],
      history: []
    };
  },

  async currentUserAsync() {
    const s = getSession();
    if (!s) return null;
    if (_userCache && _userCache.username === s.username && Date.now() - _userCacheTime < 10000) {
      return _userCache;
    }
    const rows = await SB.get('poko_users', `username=eq.${encodeURIComponent(s.username)}&select=*`);
    if (!rows || !rows.length) return null;
    _userCache = this._toUser(rows[0]);
    _userCacheTime = Date.now();
    return _userCache;
  },

  // Synchrone — retourne le cache (pour compatibilité code existant)
  currentUser() { return _userCache; },

  async register(username, password, email, avatar) {
    if (username.length < 3)  return { ok:false, msg:'Pseudo trop court (3 car. min).' };
    if (password.length < 4)  return { ok:false, msg:'Mot de passe trop court (4 car. min).' };
    if (!/\S+@\S+\.\S+/.test(email)) return { ok:false, msg:'Adresse e-mail invalide.' };
    const existing = await SB.get('poko_users', `username=eq.${encodeURIComponent(username)}&select=username`);
    if (existing && existing.length) return { ok:false, msg:'Ce pseudo est déjà pris.' };
    const now = Date.now();
    const result = await SB.insert('poko_users', {
      username, email, avatar: avatar||'🃏',
      password_hash: btoa(unescape(encodeURIComponent(password))),
      balance:5000, total_games:0, total_wins:0, total_earned:0, total_lost:0,
      longest_streak:0, current_streak:0, last_daily_bonus:null,
      banned:false, vip:false, created_at:now, last_login:now
    });
    if (!result) return { ok:false, msg:'Erreur serveur. Réessaie.' };
    await SB.insert('poko_transactions', {
      id:now, username, type:'bonus', amount:5000,
      label:'🎁 Bonus de bienvenue', date:now, balance:5000
    });
    _userCache = this._toUser(result[0]||{username,email,avatar:avatar||'🃏',password_hash:'',balance:5000,total_games:0,total_wins:0,total_earned:0,total_lost:0,longest_streak:0,current_streak:0,last_daily_bonus:null,banned:false,vip:false,created_at:now,last_login:now});
    _userCacheTime = Date.now();
    setSession({ username });
    return { ok:true, user:_userCache };
  },

  async login(username, password) {
    const rows = await SB.get('poko_users', `username=eq.${encodeURIComponent(username)}&select=*`);
    if (!rows || !rows.length) return { ok:false, msg:'Compte introuvable.' };
    const row = rows[0];
    if (row.password_hash !== btoa(unescape(encodeURIComponent(password)))) return { ok:false, msg:'Mot de passe incorrect.' };
    if (row.banned) return { ok:false, msg:'Ce compte a été suspendu.' };
    const now = Date.now();
    await SB.update('poko_users', { last_login:now }, `username=eq.${encodeURIComponent(username)}`);
    _userCache = this._toUser(row);
    _userCacheTime = Date.now();
    setSession({ username });
    return { ok:true, user:_userCache };
  },

  logout() {
    _userCache = null; _userCacheTime = 0;
    clearSession();
    window.location.href = 'login.html';
  },

  async claimDailyBonus() {
    const user = await this.currentUserAsync();
    if (!user) return { ok:false };
    const now = Date.now();
    const today = new Date(now).toDateString();
    if (user.lastDailyBonus && new Date(user.lastDailyBonus).toDateString()===today) {
      return { ok:false, msg:"Bonus déjà réclamé aujourd'hui." };
    }
    const amount = 500;
    const newBal = user.balance + amount;
    await SB.update('poko_users', { balance:newBal, last_daily_bonus:now }, `username=eq.${encodeURIComponent(user.username)}`);
    await SB.insert('poko_transactions', { id:now, username:user.username, type:'bonus', amount, label:'☀️ Bonus quotidien', date:now, balance:newBal });
    _userCache = null;
    return { ok:true, amount };
  },

  async canClaimDaily() {
    const user = await this.currentUserAsync();
    if (!user) return false;
    if (!user.lastDailyBonus) return true;
    return new Date(user.lastDailyBonus).toDateString() !== new Date().toDateString();
  },

  async deposit(amount) {
    const user = await this.currentUserAsync();
    if (!user || amount <= 0) return { ok:false, msg:'Montant invalide.' };
    const now = Date.now();
    const newBal = user.balance + amount;
    await SB.update('poko_users', { balance:newBal }, `username=eq.${encodeURIComponent(user.username)}`);
    await SB.insert('poko_transactions', { id:now, username:user.username, type:'deposit', amount, label:'💳 Dépôt', date:now, balance:newBal });
    _userCache = null;
    return { ok:true, balance:newBal };
  },

  async withdraw(amount) {
    const user = await this.currentUserAsync();
    if (!user) return { ok:false, msg:'Non connecté.' };
    if (amount <= 0) return { ok:false, msg:'Montant invalide.' };
    if (amount > user.balance) return { ok:false, msg:'Solde insuffisant.' };
    const now = Date.now();
    const newBal = user.balance - amount;
    await SB.update('poko_users', { balance:newBal }, `username=eq.${encodeURIComponent(user.username)}`);
    await SB.insert('poko_transactions', { id:now, username:user.username, type:'withdraw', amount:-amount, label:'🏦 Retrait', date:now, balance:newBal });
    _userCache = null;
    return { ok:true, balance:newBal };
  },

  async deductMise(mise) {
    const user = await this.currentUserAsync();
    if (!user) return { ok:false };
    if (user.balance < mise) return { ok:false, msg:'Solde insuffisant (' + user.balance.toLocaleString('fr-FR') + ' FCFA disponible).' };
    const newBal = user.balance - mise;
    await SB.update('poko_users', { balance:newBal }, `username=eq.${encodeURIComponent(user.username)}`);
    _userCache = null;
    return { ok:true, balance:newBal };
  },

  async recordGame({ mise, result, stage }) {
    const user = await this.currentUserAsync();
    if (!user) return;
    const now = Date.now();
    let change = 0, label = '', type = '';
    const updates = { total_games: user.totalGames + 1 };
    if (result === 'win') {
      change = mise * 3;
      updates.balance        = user.balance + change;
      updates.total_wins     = user.totalWins + 1;
      updates.total_earned   = user.totalEarned + change;
      updates.current_streak = user.currentStreak + 1;
      updates.longest_streak = Math.max(user.longestWinStreak, updates.current_streak);
      label = '🏆 Victoire — Pot ' + (mise*4).toLocaleString('fr-FR') + ' FCFA';
      type  = 'win';
    } else {
      change = -mise;
      updates.total_lost     = user.totalLost + mise;
      updates.current_streak = 0;
      updates.balance        = user.balance;
      label = result==='gameover' ? '💀 Éliminé — Étape '+stage : '❌ Défaite — Étape '+stage;
      type  = 'loss';
    }
    await SB.update('poko_users', updates, `username=eq.${encodeURIComponent(user.username)}`);
    await SB.insert('poko_transactions', { id:now, username:user.username, type, amount:change, label, date:now, balance:updates.balance });
    await SB.insert('poko_game_history', { id:now, username:user.username, date:now, mise, result, stage, change, balance_after:updates.balance, label });
    _userCache = null;
    return { change, label };
  },

  async getTransactions(username) {
    return await SB.get('poko_transactions', `username=eq.${encodeURIComponent(username)}&order=date.desc&limit=50`) || [];
  },

  async getGameHistory(username) {
    return await SB.get('poko_game_history', `username=eq.${encodeURIComponent(username)}&order=date.desc&limit=30`) || [];
  },

  async leaderboard() {
    const rows = await SB.get('poko_users', 'banned=eq.false&select=username,avatar,total_wins,total_games,total_earned,longest_streak&order=total_wins.desc&limit=20') || [];
    return rows.map(u => ({
      username:u.username, avatar:u.avatar||'🃏',
      totalWins:u.total_wins||0, totalGames:u.total_games||0,
      totalEarned:u.total_earned||0,
      winRate:u.total_games>0?Math.round((u.total_wins/u.total_games)*100):0,
      longestStreak:u.longest_streak||0
    }));
  },

  async getAllUsers() {
    const rows = await SB.get('poko_users', 'select=*&order=created_at.desc') || [];
    return rows.map(r => this._toUser(r));
  },

  formatDate(ts) {
    return new Date(ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  },
  formatAmount(n) {
    return (n>=0?'+':'-') + Math.abs(n).toLocaleString('fr-FR') + ' FCFA';
  }
};

// ── Guards ─────────────────────────────────────────────────
async function requireAuth(to) {
  to = to || 'login.html';
  if (!getSession()) { window.location.href = to; return false; }
  await POKO_DB.currentUserAsync();
  return true;
}
function requireGuest(to) {
  to = to || 'index.html';
  if (getSession()) { window.location.href = to; return false; }
  return true;
}
