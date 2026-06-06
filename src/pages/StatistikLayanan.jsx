import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 
import { 
  ArrowLeft, Activity, BarChart2, Clock, 
  Settings, FileSearch, Home, ShieldPlus, 
  CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatistikLayanan({ onBack }) {
  const [stats, setStats] = useState({
    total: 0, menunggu: 0, diproses: 0, telaah: 0, 
    penjangkauan: 0, pendampingan: 0, selesai: 0, ditolak: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null); // State baru untuk menangkap error

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setErrorMsg(null);

    const unsubscribe = onSnapshot(collection(db, 'laporan'), (snapshot) => {
      let currentStats = {
        total: 0, menunggu: 0, diproses: 0, telaah: 0, 
        penjangkauan: 0, pendampingan: 0, selesai: 0, ditolak: 0
      };

      snapshot.forEach((doc) => {
        currentStats.total += 1;
        const status = (doc.data().status_id || '').toLowerCase();

        if (status.includes('menunggu')) currentStats.menunggu += 1;
        else if (status.includes('ditolak')) currentStats.ditolak += 1;
        else if (status.includes('selesai') || status.includes('terminasi')) currentStats.selesai += 1;
        else if (status.includes('telaah')) currentStats.telaah += 1;
        else if (status.includes('penjangkauan') || status.includes('home visit')) currentStats.penjangkauan += 1;
        else if (status.includes('pendampingan') || status.includes('medis') || status.includes('hukum')) currentStats.pendampingan += 1;
        else if (status.includes('proses')) currentStats.diproses += 1; 
      });

      setStats(currentStats);
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal mengambil data statistik:", error);
      // Menangkap pesan error dari Firebase dan menampilkannya
      setErrorMsg(error.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const statCards = [
    { label: 'Total Laporan', count: stats.total, icon: BarChart2, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-100' },
    { label: 'Menunggu', count: stats.menunggu, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-100' },
    { label: 'Diproses (Umum)', count: stats.diproses, icon: Settings, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-100' },
    { label: 'Telaah Kasus', count: stats.telaah, icon: FileSearch, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-100' },
    { label: 'Penjangkauan', count: stats.penjangkauan, icon: Home, color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-100' },
    { label: 'Pendampingan', count: stats.pendampingan, icon: ShieldPlus, color: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-100' },
    { label: 'Selesai', count: stats.selesai, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-100' },
    { label: 'Ditolak', count: stats.ditolak, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-100' },
  ];

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <div className="w-full bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 font-bold hover:text-[#4B2C82] transition-colors">
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Kembali ke Beranda</span>
          <span className="sm:hidden">Kembali</span>
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Activity size={18} className="text-blue-500 animate-pulse" />
          Data Real-Time
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="h-0.5 w-8 sm:w-16 bg-blue-600 rounded-full"></div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-widest uppercase text-center">Ringkasan Statistik</h2>
          <div className="h-0.5 w-8 sm:w-16 bg-blue-600 rounded-full"></div>
        </div>

        {/* --- TAMPILAN ERROR OTOMATIS --- */}
        {errorMsg ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl max-w-2xl mx-auto shadow-sm">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-red-500 shrink-0 w-8 h-8" />
              <div>
                <h3 className="font-black text-red-800 text-lg mb-1">Akses Database Diblokir!</h3>
                <p className="text-red-600 font-medium text-sm mb-3">Firebase merespons: <span className="font-mono bg-red-100 px-1 rounded">{errorMsg}</span></p>
                <p className="text-sm text-red-700 leading-relaxed">
                  Ini terjadi karena aturan <b>Firebase Rules</b> belum diizinkan untuk publik. <br/>
                  Masuk ke Firebase Console -{'>'} Firestore Database -{'>'} Rules. Ganti kodenya menjadi:<br/><br/>
                  <code className="block bg-white p-3 rounded text-xs text-slate-800 border border-red-200">
                    rules_version = '2';<br/>
                    service cloud.firestore {'{'}<br/>
                    &nbsp;&nbsp;match /databases/{"{database}"}/documents {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;match /{"{document=**}"} {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read: if true;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow write: if request.auth != null;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br/>
                    &nbsp;&nbsp;{'}'}<br/>
                    {'}'}
                  </code>
                  <br/>Jangan lupa klik tombol <b>Publish</b> dan tunggu 1 menit.
                </p>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4B2C82]"></div>
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6" variants={containerVariants} initial="hidden" animate="visible">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div key={index} variants={itemVariants} className={`bg-white rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border ${card.border} hover:shadow-lg transition-shadow duration-300`}>
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${card.bg} ${card.color} mb-4 sm:mb-6`}>
                    <Icon size={28} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-800 mb-2">{card.count}</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div className="text-center mt-12 sm:mt-16">
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Data diperbarui secara otomatis dari server DP3A Kota Banjarmasin.</p>
        </div>
      </div>
    </div>
  );
}