import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  increment,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  Users, 
  Lock, 
  CheckCircle2, 
  BarChart3, 
  LogOut, 
  ChevronRight,
  UserPlus,
  ChevronDown,
  Star,
  Image as ImageIcon,
  X,
  Trash2,
  AlertTriangle,
  Eye
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAMLXjSMp9-f_0JKq8ahaHzl3TTxzdXy_8",
  authDomain: "pilketum-2627.firebaseapp.com",
  projectId: "pilketum-2627",
  storageBucket: "pilketum-2627.firebasestorage.app",
  messagingSenderId: "947985045516",
  appId: "1:947985045516:web:8684ae1dc73121dd4ef629",
  measurementId: "G-S7ZBKTXSLG"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : '1:947985045516:web:8684ae1dc73121dd4ef629';

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

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubOsis = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'candidates_osis'), (snapshot) => {
      setCandidates(prev => ({ ...prev, osis: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubMpk = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'candidates_mpk'), (snapshot) => {
      setCandidates(prev => ({ ...prev, mpk: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    return () => { unsubOsis(); unsubMpk(); };
  }, [user]);

  const handleLogin = async (type, identifier, secret) => {
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
      }
    } else {
      setError('Akses Admin Ditolak.');
    }
  } else {
    try {
      // 1. Cek apakah Token/ID ada di koleksi 'tokens' di Firestore
      const tokenDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', identifier));
      
      if (tokenDoc.exists()) {
        const data = tokenDoc.data();
        
        // 2. Validasi Password & Angkatan
        if (data.password === secret && data.angkatan === type) {
          
          // 3. Cek apakah sudah pernah voting (di koleksi 'voters')
          const voterDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'voters', identifier));
          
          if (voterDoc.exists()) {
            setError('Anda sudah menggunakan hak pilih.');
          } else {
            setUserRole('voter');
            setVoterData({ token: identifier, angkatan: type });
            setView('voting_osis');
          }
        } else {
          setError('Password atau Angkatan tidak sesuai.');
        }
      } else {
        setError('ID / Token tidak terdaftar.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi.');
      console.error(err);
    }
  }
};

  const submitVote = async () => {
    if (!selections.osis || !selections.mpk) return;
    
    // Jika admin preview, jangan simpan data ke database
    if (userRole === 'admin_preview') {
      setView('finish');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'candidates_osis', selections.osis), { votes: increment(1) });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'candidates_mpk', selections.mpk), { votes: increment(1) });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'voters', voterData.token), {
        votedAt: new Date().toISOString(),
        angkatan: voterData.angkatan
      });
      setView('finish');
    } catch (err) {
      setError('Gagal mengirim suara.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
  <div className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-4 flex justify-between items-center">
    
    {/* SISI KIRI: LOGO & TEKS */}
    <div className="flex items-center gap-2 md:gap-4">
      <div className="flex items-center gap-1.5 md:gap-3">
        <img src={LOGOS.man1} alt="MAN 1" className="h-9 md:h-14 w-auto object-contain" />
        <img src={LOGOS.maperka} alt="MAPERKA" className="h-9 md:h-14 w-auto object-contain" />
        <img src={LOGOS.osmantsa} alt="OSMANTSA" className="h-9 md:h-14 w-auto object-contain" />
      </div>
      
      <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2"></div>
      
      <div>
        <h1 className="text-[8px] md:text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none">E-Voting</h1>
        <p className="text-[11px] md:text-sm font-black text-red-600 uppercase whitespace-nowrap">MAN 1 T.Agung</p>
      </div>
    </div>

    {/* SISI KANAN: TOMBOL KELUAR */}
    {userRole && (
      <div className="flex items-center">
        <button 
          onClick={() => { setUserRole(null); setView('login'); }} 
          className="px-3 py-2 md:px-5 md:py-2.5 bg-slate-100 hover:bg-red-50 rounded-xl md:rounded-full text-slate-600 hover:text-red-600 font-black text-[9px] md:text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 md:gap-2 shadow-sm border border-slate-200/50"
        >
          <LogOut size={14} className="md:w-4 md:h-4" />
          <span className="leading-none">Keluar</span>
        </button>
      </div>
    )}
    
  </div>
</header>

      <main className="max-w-6xl mx-auto p-4 md:p-10">
        {view === 'login' && <LoginView onLogin={handleLogin} error={error} />}
        {view === 'voting_osis' && (
          <VotingStep 
            title="Calon Ketua Umum OSIS"
            candidates={candidates.osis}
            selection={selections.osis}
            onSelect={(id) => setSelections(s => ({...s, osis: id}))}
            onNext={() => setView('voting_mpk')}
            step={1}
            isPreview={userRole === 'admin_preview'}
          />
        )}
        {view === 'voting_mpk' && (
          <VotingStep 
            title="Calon Ketua Umum MPK"
            candidates={candidates.mpk}
            selection={selections.mpk}
            onSelect={(id) => setSelections(s => ({...s, mpk: id}))}
            onNext={submitVote}
            step={2}
            isLast
            isPreview={userRole === 'admin_preview'}
          />
        )}
        {view === 'finish' && <SuccessView isPreview={userRole === 'admin_preview'} />}
        {view === 'admin_panel' && (
          <AdminPanel 
            candidates={candidates} 
            onAdd={async (cat, name, photo) => {
              const col = cat === 'osis' ? 'candidates_osis' : 'candidates_mpk';
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', col), { name, photo, votes: 0 });
            }}
            onDelete={async (cat, id) => {
              const col = cat === 'osis' ? 'candidates_osis' : 'candidates_mpk';
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
            }}
          />
        )}
      </main>

      <footer className="mt-10 py-12 text-center">
        <div className="inline-block px-12 py-4 bg-white rounded-full border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">
            © PLATFORM VOTING MAPERKA 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

function LoginView({ onLogin, error }) {
  const [role, setRole] = useState('26'); 
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="max-w-lg mx-auto mt-4 md:mt-10 animate-in fade-in slide-in-from-bottom-8">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-white overflow-hidden">
        <div className="bg-slate-900 p-12 md:p-16 text-center text-white">
          <Star className="text-yellow-400 fill-yellow-400 mx-auto mb-6" size={56} />
          <h2 className="text-3xl font-black tracking-tight uppercase mb-4">Akses Pemilihan</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            Gunakan Hak Suara Anda Untuk <br/> <span className="text-white underline decoration-red-600 decoration-2 underline-offset-8 uppercase">Masa Depan Organisasi</span>
          </p>
        </div>

        <div className="p-10 md:p-14 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Kategori</label>
            <div className="relative">
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full appearance-none bg-slate-50 border-2 border-slate-100 px-6 py-5 rounded-2xl font-bold text-slate-700 outline-none focus:border-red-600 transition-all">
                <option value="26">Angkatan 26</option>
                <option value="25">Angkatan 25</option>
                <option value="24">Angkatan 24</option>
                <option value="admin">Administrator</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID / Token</label>
              <div className="relative flex items-center">
                <Users className="absolute left-6 text-slate-300" size={22} />
                <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="Masukkan ID" className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-600 font-bold" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-6 text-slate-300" size={22} />
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-600 font-bold" />
              </div>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-xl border border-red-100 text-center uppercase tracking-widest">{error}</div>}

          <button onClick={() => onLogin(role, id, pass)} className="w-full py-8 md:py-10 bg-red-600 hover:bg-red-700 text-white font-black rounded-[2.5rem] shadow-2xl shadow-red-100 transition-all active:scale-[0.98] uppercase tracking-[0.4em] text-sm">
            Masuk Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

function VotingStep({ title, candidates, selection, onSelect, onNext, step, isLast, isPreview }) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="text-center space-y-4">
        <div className="flex flex-col items-center gap-3">
           {isPreview && (
              <span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-[0.3em] rounded-lg border border-amber-200 animate-pulse">
                Preview Mode - No Data Saved
              </span>
           )}
           <span className="px-6 py-2 bg-white rounded-full text-red-600 text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">TAHAP {step} / 2</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">{title}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {candidates.map((c) => (
          <div key={c.id} onClick={() => onSelect(c.id)} className={`group cursor-pointer bg-white rounded-[3.5rem] p-6 border-4 transition-all duration-500 ${selection === c.id ? 'border-red-600 shadow-2xl scale-[1.03] ring-8 ring-red-50' : 'border-white shadow-xl hover:border-slate-100'}`}>
            <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-slate-50 mb-6 relative">
              <img src={c.photo} alt={c.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`; }} />
              {selection === c.id && (
                <div className="absolute inset-0 bg-red-600/30 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in zoom-in">
                  <div className="bg-white text-red-600 p-6 rounded-full shadow-2xl">
                    <CheckCircle2 size={48} strokeWidth={3} />
                  </div>
                </div>
              )}
            </div>
            <h3 className="text-center font-black text-xl text-slate-800 uppercase tracking-tight truncate px-4">{c.name}</h3>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <button disabled={!selection} onClick={onNext} className={`flex items-center gap-4 px-16 py-8 rounded-[2.5rem] font-black transition-all text-sm uppercase tracking-[0.4em] ${selection ? 'bg-slate-900 text-white shadow-2xl hover:bg-red-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          {isLast ? 'Selesaikan Memilih' : 'Lanjut Pilih MPK'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

function SuccessView({ isPreview }) {
  return (
    <div className="text-center py-20 animate-in zoom-in-95">
      <div className="max-w-xl mx-auto bg-white rounded-[4rem] shadow-2xl p-16 md:p-24 border border-white">
        <CheckCircle2 size={80} className="text-green-500 mx-auto mb-10" />
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-6">
          {isPreview ? 'Preview Selesai!' : 'Pilihan Terkirim!'}
        </h2>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
          {isPreview ? 'Simulasi pemilihan berhasil diselesaikan tanpa menyimpan data.' : 'Terima kasih atas partisipasi Anda.'}
        </p>
        <button onClick={() => window.location.reload()} className="mt-12 w-full py-8 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-red-600 transition-all shadow-xl uppercase tracking-widest text-[10px]">Log Out</button>
      </div>
    </div>
  );
}

function AdminPanel({ candidates, onAdd, onDelete }) {
  const [activeTab, setActiveTab] = useState('osis'); // 'osis', 'mpk', atau 'tokens'
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tokens, setTokens] = useState([]);
  
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [newTokenId, setNewTokenId] = useState('');
  const [newTokenPass, setNewTokenPass] = useState('');
  const [newTokenAngkatan, setNewTokenAngkatan] = useState('26');
  const [isSaving, setIsSaving] = useState(false);

  // Load data token secara real-time jika tab token dibuka
  useEffect(() => {
    if (activeTab === 'tokens') {
      const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tokens'), (snap) => {
        setTokens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [activeTab]);

  const stats = useMemo(() => {
    if (activeTab === 'tokens') return { total: tokens.length };
    const data = candidates[activeTab] || [];
    const total = data.reduce((sum, c) => sum + (c.votes || 0), 0);
    return { data, total };
  }, [candidates, activeTab, tokens]);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <BarChart3 size={24} />
            <span className="font-black uppercase tracking-[0.5em] text-[10px]">ADMINISTRATOR CONTROL</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">Panel Kendali</h2>
        </div>
        
        {/* Navigasi Tab */}
        <div className="flex flex-wrap gap-4 w-full">
          <button onClick={() => setActiveTab('osis')} className={`flex-1 min-w-[150px] py-5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest border-2 ${activeTab === 'osis' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-red-200'}`}>Kandidat OSIS</button>
          <button onClick={() => setActiveTab('mpk')} className={`flex-1 min-w-[150px] py-5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest border-2 ${activeTab === 'mpk' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Kandidat MPK</button>
          <button onClick={() => setActiveTab('tokens')} className={`flex-1 min-w-[150px] py-5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest border-2 ${activeTab === 'tokens' ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Manajemen Token</button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Total {activeTab.toUpperCase()}</p>
          <h4 className="text-5xl font-black text-slate-900 tracking-tighter">{stats.total}</h4>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-red-600 text-white p-8 rounded-[2.5rem] flex items-center justify-between hover:bg-slate-900 transition-all shadow-xl shadow-red-100">
          <div className="text-left">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Tambah Data</p>
            <span className="text-xl font-black uppercase tracking-tight">{activeTab === 'tokens' ? 'Token Baru' : 'Kandidat Baru'}</span>
          </div>
          <UserPlus size={32} />
        </button>
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'tokens' ? 'ID & Password' : 'Profil Kandidat'}</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'tokens' ? 'Angkatan' : 'Hasil Suara'}</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'tokens' ? (
                tokens.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm">{t.id}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pass: {t.password}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase">Angkatan {t.angkatan}</span>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <button onClick={() => setDeleteTarget({ ...t, type: 'token' })} className="p-4 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={20} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                stats.data.map((c) => {
                  const percent = stats.total > 0 ? ((c.votes || 0) / stats.total * 100).toFixed(1) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-6 flex items-center gap-4">
                        <img src={c.photo} className="w-12 h-12 rounded-xl object-cover" alt="" />
                        <span className="font-black text-slate-900 uppercase text-sm">{c.name}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-red-600" style={{ width: `${percent}%` }}></div>
                           </div>
                           <span className="text-[10px] font-black text-slate-400">{c.votes || 0} ({percent}%)</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <button onClick={() => setDeleteTarget({ ...c, type: 'candidate' })} className="p-4 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={20} /></button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH (KANDIDAT ATAU TOKEN) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase mb-8">Tambah {activeTab === 'tokens' ? 'Token' : 'Kandidat'}</h3>
            <div className="space-y-6">
              {activeTab === 'tokens' ? (
                <>
                  <input type="text" placeholder="ID Siswa (Contoh: 26001)" value={newTokenId} onChange={(e) => setNewTokenId(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-600 font-bold" />
                  <input type="text" placeholder="Password (Contoh: A7B9)" value={newTokenPass} onChange={(e) => setNewTokenPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-600 font-bold" />
                  <select value={newTokenAngkatan} onChange={(e) => setNewTokenAngkatan(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                    <option value="26">Angkatan 26</option>
                    <option value="25">Angkatan 25</option>
                    <option value="24">Angkatan 24</option>
                  </select>
                </>
              ) : (
                <>
                  <input type="text" placeholder="Nama Lengkap" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-600 font-bold" />
                  <input type="url" placeholder="Link Foto" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-600 font-bold" />
                </>
              )}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Batal</button>
                <button 
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    if (activeTab === 'tokens') {
                      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', newTokenId), { password: newTokenPass, angkatan: newTokenAngkatan });
                      setNewTokenId(''); setNewTokenPass('');
                    } else {
                      await onAdd(activeTab, newName, newPhoto);
                      setNewName(''); setNewPhoto('');
                    }
                    setIsSaving(false); setShowAddModal(false);
                  }}
                  className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px]"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-4 uppercase">Hapus {deleteTarget.type}?</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-8">Data {deleteTarget.id || deleteTarget.name} akan dihapus permanen.</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={async () => {
                  if (deleteTarget.type === 'token') {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', deleteTarget.id));
                  } else {
                    await onDelete(activeTab, deleteTarget.id);
                  }
                  setDeleteTarget(null);
                }}
                className="w-full py-4 bg-red-600 text-white font-black rounded-xl uppercase text-[10px]"
              >
                Ya, Hapus
              </button>
              <button onClick={() => setDeleteTarget(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

