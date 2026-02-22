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

  useEffect(() => {
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
      docs.sort((a, b) => (a.no || 0) - (b.no || 0)); 
      setCandidates(prev => ({ ...prev, osis: docs }));
    });
    
    const unsubMpk = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'candidates_mpk'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (a.no || 0) - (b.no || 0));
      setCandidates(prev => ({ ...prev, mpk: docs }));
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
        const tokenDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', identifier));
        if (tokenDoc.exists()) {
          const data = tokenDoc.data();
          if (data.password === secret && data.angkatan === type) {
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
      }
    }
  };

  const submitVote = async () => {
    if (!selections.osis || !selections.mpk) return;
    if (userRole === 'admin_preview') { setView('finish'); return; }
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 uppercase tracking-widest">Memuat Sistem...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-4 flex justify-between items-center">
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
          {userRole && (
            <button onClick={() => { setUserRole(null); setView('login'); }} className="px-3 py-2 md:px-5 md:py-2.5 bg-slate-100 rounded-xl text-slate-600 font-black text-[9px] flex items-center gap-2">
              <LogOut size={14} /> Keluar
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10">
        {view === 'login' && <LoginView onLogin={handleLogin} error={error} />}
        {view === 'voting_osis' && <VotingStep title="Calon Ketua Umum OSIS" candidates={candidates.osis} selection={selections.osis} onSelect={(id) => setSelections(s => ({...s, osis: id}))} onNext={() => setView('voting_mpk')} step={1} isPreview={userRole === 'admin_preview'} />}
        {view === 'voting_mpk' && <VotingStep title="Calon Ketua Umum MPK" candidates={candidates.mpk} selection={selections.mpk} onSelect={(id) => setSelections(s => ({...s, mpk: id}))} onNext={submitVote} step={2} isLast isPreview={userRole === 'admin_preview'} />}
        {view === 'finish' && <SuccessView isPreview={userRole === 'admin_preview'} />}
        {view === 'admin_panel' && (
          <AdminPanel 
            candidates={candidates} 
            onAdd={async (cat, name, photo, no) => {
              const col = cat === 'osis' ? 'candidates_osis' : 'candidates_mpk';
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', col), { name, photo, no: parseInt(no), votes: 0 });
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
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">© PLATFORM VOTING MAPERKA 2026</p>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-Komponen ---
function LoginView({ onLogin, error }) {
  const [role, setRole] = useState('26'); 
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="max-w-lg mx-auto mt-10 animate-in fade-in slide-in-from-bottom-8">
      <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-12 text-center text-white">
          <Star className="text-yellow-400 fill-yellow-400 mx-auto mb-6" size={56} />
          <h2 className="text-3xl font-black uppercase mb-4">Akses Pemilihan</h2>
        </div>
        <div className="p-10 space-y-8">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-red-600">
            <option value="26">Angkatan 26</option><option value="25">Angkatan 25</option><option value="24">Angkatan 24</option><option value="admin">Administrator</option>
          </select>
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID / Token" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-red-600" />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-red-600" />
          {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-xl text-center uppercase">{error}</div>}
          <button onClick={() => onLogin(role, id, pass)} className="w-full py-8 bg-red-600 text-white font-black rounded-[2.5rem] uppercase text-sm tracking-widest">Masuk Sekarang</button>
        </div>
      </div>
    </div>
  );
}

function VotingStep({ title, candidates, selection, onSelect, onNext, step, isLast, isPreview }) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10">
      <div className="text-center space-y-4">
        <span className="px-6 py-2 bg-white rounded-full text-red-600 text-[10px] font-black uppercase border">TAHAP {step} / 2</span>
        <h2 className="text-3xl md:text-5xl font-black uppercase">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {candidates.map((c) => (
          <div key={c.id} onClick={() => onSelect(c.id)} className={`cursor-pointer bg-white rounded-[3.5rem] p-6 border-4 transition-all ${selection === c.id ? 'border-red-600 shadow-2xl scale-[1.03]' : 'border-white shadow-xl'}`}>
            <img src={c.photo} alt={c.name} className="aspect-[3/4] w-full object-cover rounded-[2.5rem] mb-6" />
            <h3 className="text-center font-black text-xl uppercase px-4">{c.name}</h3>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-12">
        <button disabled={!selection} onClick={onNext} className={`px-16 py-8 rounded-[2.5rem] font-black uppercase text-sm ${selection ? 'bg-slate-900 text-white shadow-2xl' : 'bg-slate-200 text-slate-400'}`}>
          {isLast ? 'Selesaikan Memilih' : 'Lanjut Pilih MPK'}
        </button>
      </div>
    </div>
  );
}

function SuccessView({ isPreview }) {
  return (
    <div className="text-center py-20 animate-in zoom-in-95">
      <div className="max-w-xl mx-auto bg-white rounded-[4rem] shadow-2xl p-16 border">
        <CheckCircle2 size={80} className="text-green-500 mx-auto mb-10" />
        <h2 className="text-4xl font-black uppercase mb-6">{isPreview ? 'Preview Selesai!' : 'Pilihan Terkirim!'}</h2>
        <button onClick={() => window.location.reload()} className="w-full py-8 bg-slate-900 text-white font-black rounded-[2rem] uppercase text-[10px]">Log Out</button>
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'tokens') {
      return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tokens'), (snap) => {
        setTokens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
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
        <h2 className="text-4xl font-black uppercase">Panel Kendali</h2>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('osis')} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] border-2 ${activeTab === 'osis' ? 'bg-red-600 text-white border-red-600' : 'bg-white'}`}>OSIS</button>
          <button onClick={() => setActiveTab('mpk')} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] border-2 ${activeTab === 'mpk' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>MPK</button>
          <button onClick={() => setActiveTab('tokens')} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] border-2 ${activeTab === 'tokens' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white'}`}>Tokens</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border"><h4 className="text-5xl font-black">{stats.total}</h4><p className="text-[10px] font-black uppercase text-slate-400">Total {activeTab}</p></div>
        <button onClick={() => setShowAddModal(true)} className="bg-red-600 text-white p-8 rounded-[2.5rem] font-black uppercase text-xl flex justify-between items-center">Tambah Baru <UserPlus /></button>
      </div>

      <div className="bg-white rounded-[3rem] border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50"><tr className="text-[10px] font-black uppercase text-slate-400"><th className="px-10 py-6">Profil / ID</th><th className="px-10 py-6">Status / Suara</th><th className="px-10 py-6 text-center">Aksi</th></tr></thead>
          <tbody className="divide-y">
            {activeTab === 'tokens' ? tokens.map(t => (
              <tr key={t.id}><td className="px-10 py-6 font-black">{t.id} <br/><span className="text-[10px] text-slate-400">Pass: {t.password}</span></td><td className="px-10 py-6"><span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Angkatan {t.angkatan}</span></td><td className="px-10 py-6 text-center"><button onClick={() => setDeleteTarget({...t, type:'token'})} className="text-slate-300 hover:text-red-600"><Trash2/></button></td></tr>
            )) : stats.data.map(c => (
              <tr key={c.id}><td className="px-10 py-6 flex items-center gap-4"><img src={c.photo} className="w-12 h-12 rounded-xl object-cover"/><span className="font-black uppercase">{c.name}</span></td><td className="px-10 py-6 font-black">{c.votes || 0} Suara</td><td className="px-10 py-6 text-center"><button onClick={() => setDeleteTarget({...c, type:'candidate'})} className="text-slate-300 hover:text-red-600"><Trash2/></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-6">
            <h3 className="text-xl font-black uppercase">Tambah {activeTab}</h3>
            {activeTab === 'tokens' ? (
              <>
                <input type="text" placeholder="ID Siswa" value={newTokenId} onChange={(e) => setNewTokenId(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
                <input type="text" placeholder="Password" value={newTokenPass} onChange={(e) => setNewTokenPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
                <select value={newTokenAngkatan} onChange={(e) => setNewTokenAngkatan(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold">
                  <option value="26">26</option><option value="25">25</option><option value="24">24</option>
                </select>
              </>
            ) : (
              <>
                <input type="number" placeholder="No Urut" value={newNo} onChange={(e) => setNewNo(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
                <input type="text" placeholder="Nama" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
                <input type="url" placeholder="Link Foto" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
              </>
            )}
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 font-black uppercase text-[10px]">Batal</button>
              <button onClick={async () => {
                setIsSaving(true);
                if (activeTab === 'tokens') {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', newTokenId), { password: newTokenPass, angkatan: newTokenAngkatan });
                  setNewTokenId(''); setNewTokenPass('');
                } else {
                  await onAdd(activeTab, newName, newPhoto, newNo);
                  setNewName(''); setNewPhoto(''); setNewNo('');
                }
                setIsSaving(false); setShowAddModal(false);
              }} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px]">{isSaving ? 'Saving...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 text-center">
            <h3 className="text-xl font-black uppercase mb-8">Hapus Data?</h3>
            <div className="flex flex-col gap-2">
              <button onClick={async () => {
                if (deleteTarget.type === 'token') {
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tokens', deleteTarget.id));
                } else {
                  await onDelete(activeTab, deleteTarget.id);
                }
                setDeleteTarget(null);
              }} className="w-full py-4 bg-red-600 text-white font-black rounded-xl uppercase text-[10px]">Ya, Hapus</button>
              <button onClick={() => setDeleteTarget(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
