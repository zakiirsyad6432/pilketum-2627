import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, onSnapshot, 
  updateDoc, increment, addDoc, deleteDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Users, Lock, CheckCircle2, BarChart3, LogOut, ChevronRight,
  UserPlus, Star, Trash2, ShieldCheck, Zap, Copyright
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAMLXjSMp9-f_0JKq8ahaHzl3TTxzdXy_8",
  authDomain: "pilketum-2627.firebaseapp.com",
  projectId: "pilketum-2627",
  storageBucket: "pilketum-2627.firebasestorage.app",
  messagingSenderId: "947985045516",
  appId: "1:947985045516:web:8684ae1dc73121dd4ef629"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = '1:947985045516:web:8684ae1dc73121dd4ef629';

const LOGOS = {
  man1: "https://i.imgur.com/qD2CUmb.png",
  maperka: "https://i.imgur.com/bbGg6Hw.png",
  osmantsa: "https://i.imgur.com/4wud19i.png"
};

const ADMIN_CREDENTIALS = [
  { username: 'maperka24', password: 'maperkajaya44730', type: 'full' },
  { username: 'test1', password: 'test1', type: 'preview' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [voterData, setVoterData] = useState(null);
  const [view, setView] = useState('login'); 
  const [candidates, setCandidates] = useState({ osis: [], mpk: [] });
  const [selections, setSelections] = useState({ osis: null, mpk: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cek "Ingat Saya" saat pertama buka
  useEffect(() => {
    const savedAdmin = localStorage.getItem('admin_session');
    if (savedAdmin) {
      const adminData = JSON.parse(savedAdmin);
      setUserRole(adminData.role);
      setView(adminData.role === 'admin' ? 'admin_panel' : 'login');
    }

    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubOsis = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'candidates_osis'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0)); 
      setCandidates(prev => ({ ...prev, osis: docs }));
    });
    const unsubMpk = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'candidates_mpk'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0));
      setCandidates(prev => ({ ...prev, mpk: docs }));
    });
    return () => { unsubOsis(); unsubMpk(); };
  }, [user]);

  const handleLogin = async (type, identifier, secret, rememberMe) => {
    setError('');
    if (type === 'admin') {
      const admin = ADMIN_CREDENTIALS.find(acc => acc.username === identifier && acc.password === secret);
      if (admin) {
        if (admin.type === 'preview') {
          setUserRole('admin_preview');
          setVoterData({ token: 'PREVIEW_MODE', angkatan: 'ADMIN' });
          setView('voting_osis');
        } else {
          setUserRole('admin');
          setView('admin_panel');
          if (rememberMe) {
            localStorage.setItem('admin_session', JSON.stringify({ role: 'admin', user: identifier }));
          }
        }
      } else { setError('Akses Admin Ditolak.'); }
    } else {
      try {
        const tokenDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', identifier));
        if (tokenDoc.exists()) {
          const data = tokenDoc.data();
          if (data.password === secret && data.angkatan === type) {
            const voterDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'voters', identifier));
            if (voterDoc.exists()) { setError('Token sudah digunakan.'); } 
            else { setUserRole('voter'); setVoterData({ token: identifier, angkatan: type }); setView('voting_osis'); }
          } else { setError('Password atau ID salah.'); }
        } else { setError('ID tidak ditemukan.'); }
      } catch (err) { setError('Masalah koneksi database.'); }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setUserRole(null);
    setView('login');
    setSelections({ osis: null, mpk: null });
  };

  const submitVote = async () => {
    if (!selections.osis || !selections.mpk) return;
    if (userRole === 'admin_preview') { setView('finish'); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'candidates_osis', selections.osis), { votes: increment(1) });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'candidates_mpk', selections.mpk), { votes: increment(1) });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'voters', voterData.token), { votedAt: new Date().toISOString(), angkatan: voterData.angkatan });
      setView('finish');
    } catch (err) { setError('Gagal mengirim suara.'); } 
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">Sinkronisasi Sistem...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-red-100 selection:text-red-600">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="flex items-center gap-2 md:gap-3">
              <img src={LOGOS.man1} alt="MAN 1" className="h-10 md:h-14 w-auto drop-shadow-sm" />
              <img src={LOGOS.maperka} alt="MAPERKA" className="h-10 md:h-14 w-auto drop-shadow-sm" />
              <img src={LOGOS.osmantsa} alt="OSMANTSA" className="h-10 md:h-14 w-auto drop-shadow-sm" />
            </div>
            <div className="h-10 w-px bg-slate-200 mx-1"></div>
            <div>
              <h1 className="text-[9px] md:text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase leading-none mb-1">E-Voting</h1>
              <p className="text-[12px] md:text-base font-black text-red-600 uppercase whitespace-nowrap tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">MAN 1 T.Agung</p>
            </div>
          </div>
          {userRole && (
            <button onClick={handleLogout} className="p-2.5 md:px-5 md:py-3 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 border border-transparent hover:border-red-100">
              <LogOut size={16} /><span className="hidden md:block">Keluar</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5 md:p-12">
        {view === 'login' && <LoginView onLogin={handleLogin} error={error} />}
        {view === 'voting_osis' && <VotingStep title="Ketua Umum OSIS" candidates={candidates.osis} selection={selections.osis} onSelect={(id) => setSelections(s => ({...s, osis: id}))} onNext={() => setView('voting_mpk')} step={1} isPreview={userRole === 'admin_preview'} />}
        {view === 'voting_mpk' && <VotingStep title="Ketua Umum MPK" candidates={candidates.mpk} selection={selections.mpk} onSelect={(id) => setSelections(s => ({...s, mpk: id}))} onNext={submitVote} step={2} isLast isPreview={userRole === 'admin_preview'} />}
        {view === 'finish' && <SuccessView isPreview={userRole === 'admin_preview'} />}
        {view === 'admin_panel' && <AdminPanel candidates={candidates} onAdd={async (cat, name, photo, no) => { const col = cat === 'osis' ? 'candidates_osis' : 'candidates_mpk'; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', col), { name, photo, no: parseInt(no), votes: 0 }); }} onDelete={async (cat, id) => { const col = cat === 'osis' ? 'candidates_osis' : 'candidates_mpk'; await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id)); }} />}
      </main>

      <footer className="py-16 text-center opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          <Copyright size={14} /> MAPERKA MAN 1 TULUNGAGUNG
        </div>
      </footer>
    </div>
  );
}

// --- Sub Components ---
function LoginView({ onLogin, error }) {
  const [role, setRole] = useState('26'); 
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="max-w-xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-600/20 to-transparent opacity-50"></div>
          <img src={LOGOS.maperka} alt="MAPERKA" className="h-20 w-auto mx-auto mb-6 relative z-10 drop-shadow-2xl" />
          <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight relative z-10 leading-tight">
            Selamat Datang di Halaman Pemilihan Calon Ketua Umum Pengurus OSMANTSA Masa Bakti 2026/2027
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-4 tracking-[0.2em] relative z-10 px-4">
            "Suaramu adalah awal dari perubahan besar. Mari wujudkan demokrasi sekolah yang jujur, adil, dan berintegritas."
          </p>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Kategori Siswa</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold outline-none focus:border-red-600 focus:bg-white transition-all appearance-none cursor-pointer">
              <option value="26">Angkatan 26</option><option value="25">Angkatan 25</option><option value="24">Angkatan 24</option><option value="admin">Administrator</option>
            </select>
          </div>
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID / Token Siswa" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold outline-none focus:border-red-600 focus:bg-white transition-all" />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold outline-none focus:border-red-600 focus:bg-white transition-all" />
          
          {role === 'admin' && (
            <div className="flex items-center gap-3 px-4 py-2">
              <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-5 h-5 accent-red-600" />
              <label htmlFor="remember" className="text-[10px] font-black uppercase text-slate-400 cursor-pointer">Ingat Saya</label>
            </div>
          )}

          {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl text-center border border-red-100 uppercase animate-bounce">{error}</div>}
          <button onClick={() => onLogin(role, id, pass, rememberMe)} className="w-full py-7 bg-red-600 hover:bg-red-700 text-white font-black rounded-[2rem] uppercase text-sm tracking-[0.2em] shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3">
            Masuk Sekarang <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function VotingStep({ title, candidates, selection, onSelect, onNext, step, isLast, isPreview }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-12 duration-700">
      <div className="text-center mb-16">
        <span className="px-5 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-full tracking-[0.3em] mb-6 inline-block shadow-md shadow-red-100">Tahap {step} / 2 {isPreview && "(PREVIEW)"}</span>
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {candidates.map((c) => (
          <div key={c.id} onClick={() => onSelect(c.id)} className={`group relative cursor-pointer bg-white rounded-[3.5rem] p-5 border-4 transition-all duration-500 ${selection === c.id ? 'border-red-600 shadow-2xl scale-[1.05]' : 'border-transparent shadow-xl hover:shadow-2xl hover:-translate-y-2'}`}>
            <div className="relative overflow-hidden rounded-[2.5rem] aspect-[3/4] mb-8">
              <img src={c.photo} alt={c.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className={`absolute inset-0 bg-red-600/20 transition-opacity duration-500 ${selection === c.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}></div>
              <div className="absolute top-6 left-6 w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl">{c.no}</div>
            </div>
            <h3 className="text-center font-black text-2xl uppercase tracking-tight px-4 leading-tight mb-4">{c.name}</h3>
            {selection === c.id && <div className="flex justify-center"><CheckCircle2 className="text-red-600 animate-in zoom-in" size={32} /></div>}
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-20">
        <button disabled={!selection} onClick={onNext} className={`group px-20 py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] transition-all flex items-center gap-4 ${selection ? 'bg-slate-900 text-white shadow-2xl hover:bg-black hover:px-24 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          {isLast ? 'Kirim Suara' : 'Lanjut Pilih MPK'} <Zap size={20} className={selection ? 'text-yellow-400 fill-yellow-400' : ''} />
        </button>
      </div>
    </div>
  );
}

function SuccessView({ isPreview }) {
  return (
    <div className="text-center py-20 animate-in zoom-in-95 duration-700">
      <div className="max-w-2xl mx-auto bg-white rounded-[5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] p-20 border border-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-red-600 to-red-900"></div>
        <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-12 animate-bounce">
          <CheckCircle2 size={80} className="text-green-500" />
        </div>
        <h2 className="text-5xl font-black uppercase mb-6 tracking-tighter">{isPreview ? 'Selesai Preview' : 'Berhasil!'}</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-12">{isPreview ? 'Ini adalah simulasi, suara tidak dihitung.' : 'Suara Anda telah tercatat secara permanen.'}</p>
        <button onClick={() => window.location.reload()} className="w-full py-8 bg-slate-900 hover:bg-black text-white font-black rounded-[2.5rem] uppercase text-[10px] tracking-[0.5em] transition-all shadow-xl">Selesai & Keluar</button>
      </div>
    </div>
  );
}

function AdminPanel({ candidates, onAdd, onDelete }) {
  const [activeTab, setActiveTab] = useState('osis');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [newNo, setNewNo] = useState('');
  const [newTokenId, setNewTokenId] = useState('');
  const [newTokenPass, setNewTokenPass] = useState('');
  const [newTokenAngkatan, setNewTokenAngkatan] = useState('26');

  useEffect(() => {
    if (activeTab === 'tokens') return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tokens'), (s) => setTokens(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [activeTab]);

  const stats = useMemo(() => {
    if (activeTab === 'tokens') return { total: tokens.length };
    const data = candidates[activeTab] || [];
    return { data, total: data.reduce((s, c) => s + (c.votes || 0), 0) };
  }, [candidates, activeTab, tokens]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
        <div>
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">Panel Kontrol</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Manajemen Data & Hasil Real-time</p>
        </div>
        <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
          {['osis', 'mpk', 'tokens'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === t ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-slate-400 hover:bg-slate-50'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform"><BarChart3 size={120} /></div>
          <h4 className="text-7xl font-black tracking-tighter mb-2">{stats.total}</h4>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Total Suara / Item</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-slate-900 hover:bg-black text-white p-10 rounded-[3.5rem] font-black uppercase text-xl flex justify-between items-center transition-all hover:scale-[1.02] active:scale-95 shadow-2xl">
          Tambah {activeTab} <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center"><UserPlus /></div>
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-10 py-8">Identitas / No</th>
                <th className="px-10 py-8">Status / Perolehan</th>
                <th className="px-10 py-8 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeTab === 'tokens' ? tokens.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8 font-black uppercase tracking-tight">{t.id} <br/><span className="text-[10px] text-slate-300 font-bold">PASS: {t.password}</span></td>
                  <td className="px-10 py-8"><span className="bg-amber-50 text-amber-600 border border-amber-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Angkatan {t.angkatan}</span></td>
                  <td className="px-10 py-8 text-center"><button onClick={() => setDeleteTarget({...t, type: 'token'})} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-all inline-flex items-center justify-center"><Trash2 size={18}/></button></td>
                </tr>
              )) : stats.data.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8 flex items-center gap-6"><div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm"><img src={c.photo} className="w-full h-full object-cover"/></div><div><p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Kandidat {c.no}</p><p className="font-black uppercase tracking-tight">{c.name}</p></div></td>
                  <td className="px-10 py-8 font-black text-2xl tracking-tighter text-red-600">{c.votes || 0} <span className="text-[10px] text-slate-400 tracking-widest ml-1 font-black">SUARA</span></td>
                  <td className="px-10 py-8 text-center"><button onClick={() => setDeleteTarget({...c, type: 'candidate', name: c.name})} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-all inline-flex items-center justify-center"><Trash2 size={18}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 space-y-8 animate-in zoom-in-95 duration-300 shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black uppercase tracking-tight">Tambah {activeTab}</h3>
            <div className="space-y-4">
              {activeTab === 'tokens' ? (
                <>
                  <input type="text" placeholder="ID Siswa" value={newTokenId} onChange={(e) => setNewTokenId(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-600" />
                  <input type="text" placeholder="Password" value={newTokenPass} onChange={(e) => setNewTokenPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-600" />
                  <select value={newTokenAngkatan} onChange={(e) => setNewTokenAngkatan(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-600 appearance-none">
                    <option value="26">Angkatan 26</option><option value="25">Angkatan 25</option><option value="24">Angkatan 24</option>
                  </select>
                </>
              ) : (
                <>
                  <input type="number" placeholder="Nomor Urut" value={newNo} onChange={(e) => setNewNo(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-600" />
                  <input type="text" placeholder="Nama Lengkap" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-600" />
                  <input type="url" placeholder="Link Foto" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-600" />
                </>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 font-black uppercase text-[10px] text-slate-400">Batal</button>
              <button onClick={async () => {
                if (activeTab === 'tokens') { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', newTokenId), { password: newTokenPass, angkatan: newTokenAngkatan }); setNewTokenId(''); setNewTokenPass(''); } 
                else { await onAdd(activeTab, newName, newPhoto, newNo); setNewName(''); setNewPhoto(''); setNewNo(''); }
                setShowAddModal(false);
              }} className="flex-1 py-5 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px] shadow-lg shadow-red-100 active:scale-95 transition-all">Simpan Data</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-12 text-center shadow-2xl border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8"><Trash2 className="text-red-600" size={32}/></div>
            <h3 className="text-xl font-black uppercase mb-4 tracking-tight text-slate-900">Hapus Data?</h3>
            <p className="text-slate-400 font-bold uppercase text-[10px] leading-relaxed mb-10 tracking-widest">Data ini akan dihilangkan selamanya dari database.</p>
            <div className="flex flex-col gap-3">
              <button onClick={async () => { if (deleteTarget.type === 'token') { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', deleteTarget.id)); } else { await onDelete(activeTab, deleteTarget.id); } setDeleteTarget(null); }} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px] shadow-lg shadow-red-100 active:scale-95 transition-all">Ya, Hapus Sekarang</button>
              <button onClick={() => setDeleteTarget(null)} className="w-full py-5 text-slate-400 font-black uppercase text-[10px]">Batalkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
