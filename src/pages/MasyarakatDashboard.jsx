import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, Bot, ArrowRight, Shield, ShieldAlert, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function MasyarakatDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Warga');
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  // Mengambil Data User & Statistik Pengaduan dari Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Ambil Nama User
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserName(docSnap.data().nama.split(' ')[0]); // Ambil nama depan saja
          }

          // 2. Hitung Statistik Pengaduan (Mencari di tabel "pengaduan" milik user ini)
          const q = query(collection(db, "pengaduan"), where("user_id", "==", user.uid));
          const querySnapshot = await getDocs(q);
          
          let total = 0;
          let pending = 0;
          let completed = 0;

          querySnapshot.forEach((doc) => {
            total++;
            const status = doc.data().status_pengaduan; // Sesuaikan dengan field di databasemu nanti
            if (status === 'menunggu' || status === 'diproses') pending++;
            if (status === 'selesai') completed++;
          });

          setStats({ total, pending, completed });

        } catch (error) {
          console.error("Gagal memuat data dashboard:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <div className="bg-[#4B2C82] text-white border-0 overflow-hidden relative shadow-2xl rounded-3xl group animate-smooth-entry">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700 animate-float" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full -ml-10 -mb-10 animate-soft-float" style={{animationDelay: '0.5s'}} />
          
          <div className="p-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <motion.h1 
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  className="text-4xl font-black mb-4 leading-tight capitalize animate-slide-left delay-100"
                >
                  Halo, {userName}! <span className="animate-wave inline-block">👋</span>
                </motion.h1>
                <p className="text-purple-100 text-lg mb-8 opacity-90 leading-relaxed font-medium animate-slide-left delay-200">
                  Suara Anda sangat berarti bagi kami. Kami hadir untuk memberikan perlindungan dan bantuan bagi perempuan dan anak di Kota Banjarmasin.
                </p>
                <div className="flex flex-wrap gap-4 animate-slide-left delay-300">
                  <button 
                    className="btn-modern flex items-center bg-white text-[#4B2C82] hover:bg-purple-50 px-8 py-4 rounded-2xl font-bold shadow-xl transition-all hover:-translate-y-1 active:scale-95 hover:shadow-2xl hover:scale-105"
                    onClick={() => navigate('/masyarakat/form')}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Buat Pengaduan
                  </button>
                  <button 
                    className="btn-modern flex items-center text-white hover:bg-white/10 px-8 py-4 rounded-2xl font-bold border border-white/20 transition-all hover:border-white hover:scale-105 transform"
                    onClick={() => navigate('/masyarakat/ai-consult')}
                  >
                    <Bot className="w-5 h-5 mr-2 animate-gentle-pulse" />
                    Konsultasi AI
                  </button>
                </div>
              </div>
              <div className="hidden lg:block animate-slide-right delay-300">
                <div className="w-48 h-48 bg-white/10 rounded-[3rem] backdrop-blur-md border border-white/20 flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-500 animate-float hover:animate-none">
                  <Shield className="w-24 h-24 text-white opacity-80 animate-gentle-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Pengaduan', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Sedang Diproses', value: stats.pending, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Laporan Selesai', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <div className={`bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all rounded-2xl overflow-hidden p-6 transform hover:scale-105 hover:-translate-y-2 animate-slide-up delay-${idx * 100}`} style={{animationDelay: `${idx * 100}ms`}}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center shadow-inner group hover:animate-scale-bounce`}>
                  <stat.icon className={`w-7 h-7 ${stat.color} animate-gentle-pulse`} style={{animationDelay: `${idx * 200}ms`}} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-gray-800 animate-glow">{stat.value}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions / Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col p-8 transform hover:shadow-lg transition-all animate-fade-in hover:scale-102">
            <div className="flex items-center gap-3 mb-2 animate-slide-down">
              <div className="p-2 bg-purple-50 rounded-lg animate-soft-float">
                <ShieldAlert className="w-6 h-6 text-[#4B2C82] animate-gentle-pulse" />
              </div>
              <h2 className="text-2xl font-black text-[#4B2C82]">Panduan Cepat</h2>
            </div>
            <p className="text-gray-400 font-medium mb-6 animate-slide-down delay-100">Langkah perlindungan untuk Anda</p>
            
            <div className="space-y-6 flex-1 mt-2">
              {[
                { title: 'Sampaikan Keluhan', desc: 'Isi formulir pengaduan dengan detail kronologi kejadian.' },
                { title: 'Lampirkan Bukti', desc: 'Sertakan foto atau dokumen pendukung untuk memperkuat laporan.' },
                { title: 'Konsultasi Privat', desc: 'Dapatkan bantuan psikologis dari konselor profesional kami.' }
              ].map((step, i) => (
                <div key={i} className={`flex gap-5 group cursor-default transform hover:translate-x-2 transition-transform animate-slide-up delay-${(i + 2) * 100}`} style={{animationDelay: `${(i + 2) * 100}ms`}}>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-[#4B2C82]/5 border-2 border-[#4B2C82]/20 flex items-center justify-center text-sm font-black text-[#4B2C82] group-hover:bg-[#4B2C82] group-hover:text-white transition-colors group-hover:scale-110 transform">
                      {i + 1}
                    </div>
                    {i < 2 && <div className="w-0.5 h-10 bg-purple-100 mt-2 group-hover:h-14 transition-all" />}
                  </div>
                  <div className="pt-1">
                    <h4 className="font-bold text-gray-800 mb-1 group-hover:text-[#4B2C82] transition-colors">{step.title}</h4>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl border border-gray-100 shadow-sm h-full overflow-hidden relative p-8 transform hover:shadow-lg transition-all hover:scale-102 animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#4B2C82]/5 rounded-full -mr-16 -mt-16 animate-float" />
            
            <div className="flex items-center gap-3 mb-2 relative z-10 animate-slide-down">
              <div className="p-2 bg-purple-100 rounded-lg animate-soft-float">
                <HeartHandshake className="w-6 h-6 text-[#4B2C82] animate-gentle-pulse" />
              </div>
              <h2 className="text-2xl font-black text-[#4B2C82]">Kami Ada Untuk Anda</h2>
            </div>
            <p className="text-gray-400 font-medium mb-6 relative z-10 animate-slide-down delay-100">Kerahasiaan Anda adalah prioritas kami</p>
            
            <div className="space-y-6 relative z-10">
              <p className="text-gray-600 leading-relaxed font-medium italic animate-slide-up delay-200">
                "Kekerasan bukan rahasia keluarga, melainkan pelanggaran hak asasi. Jangan biarkan ketakutan menghentikan langkah Anda untuk mendapatkan keadilan."
              </p>
              <div className="bg-white/60 backdrop-blur-sm border border-white p-6 rounded-2xl shadow-sm space-y-4 transform hover:scale-105 transition-all animate-bounce-in delay-300">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Jam Operasional</span>
                  <span className="font-bold text-[#4B2C82] animate-glow">Senin - Jumat | 08:00 - 16:00 WITA</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-purple-50 pt-4">
                  <span className="text-gray-500 font-medium">Layanan Darurat (24/7)</span>
                  <span className="font-bold text-red-600 animate-glow">Call Center 112</span>
                </div>
              </div>
              <button 
                className="btn-modern w-full flex justify-center items-center bg-[#4B2C82] hover:bg-purple-900 text-white py-4 rounded-2xl font-bold shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 transform animate-scale-bounce hover:animate-none"
                onClick={() => navigate('/masyarakat/ai-consult')}
              >
                Mulai Konsultasi Gratis
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Support Section */}
      <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 border border-purple-50 shadow-sm flex flex-col md:flex-row items-center gap-8 transform hover:shadow-lg hover:scale-102 transition-all animate-smooth-entry">
        <div className="w-20 h-20 bg-purple-50 rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner transform hover:scale-110 hover:rotate-6 transition-transform animate-float">
          <Shield className="w-10 h-10 text-[#4B2C82] animate-gentle-pulse" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black text-[#4B2C82] mb-2 animate-slide-left delay-100">Perlindungan Saksi & Korban</h3>
          <p className="text-gray-500 font-medium leading-relaxed animate-slide-left delay-200">
            DP3A Banjarmasin menjamin perlindungan identitas bagi setiap pelapor. Anda tidak perlu khawatir, kerahasiaan data Anda terlindungi oleh sistem kami dan undang-undang yang berlaku.
          </p>
        </div>
        <div className="shrink-0 flex gap-4 animate-slide-right delay-100">
          <div className="flex flex-col items-center gap-1 transform hover:scale-110 transition-transform">
            <span className="text-2xl font-bold text-[#4B2C82] animate-glow">100%</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Privat</span>
          </div>
          <div className="w-[1px] h-12 bg-purple-100" />
          <div className="flex flex-col items-center gap-1 transform hover:scale-110 transition-transform">
            <span className="text-2xl font-bold text-[#4B2C82] animate-glow">Aman</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sistem</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}