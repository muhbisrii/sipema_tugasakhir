import 'react';
import { ArrowLeft, Users, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TentangAplikasi({ onBack }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Header / Topbar */}
      <div className="w-full bg-white dark:bg-[#0f172a] shadow-sm border-b border-gray-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-20">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-gray-800 dark:text-slate-200 font-bold hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors"
        >
          <ArrowLeft size={20} />
          Tentang Aplikasi
        </button>
      </div>

      {/* Main Content */}
      <motion.div 
        className="flex-1 flex flex-col items-center p-6 text-center max-w-4xl mx-auto w-full pt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        
        {/* Logos */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
            <img src="/pemkot.png" alt="Logo Pemkot Banjarmasin" className="w-full h-full object-contain filter drop-shadow-md" />
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
            <img src="/logo-dp3a.png" alt="Logo DP3A" className="w-full h-full object-contain filter drop-shadow-md" onError={(e) => { e.target.style.display = 'none' }} />
          </div>
        </div>

        {/* App Info */}
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
          Layanan Pengaduan DP3A Banjarmasin
        </h1>
        <p className="text-sm font-bold text-[#4B2C82] dark:text-purple-400 mb-10 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full inline-block">
          Versi 1.0.0 (Build 1)
        </p>

        {/* Description & User Manual Section */}
        <div className="w-full bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 sm:p-10 shadow-sm border border-gray-100 dark:border-slate-800 mb-12">
          
          {/* Deskripsi Panjang */}
          <div className="space-y-4 text-gray-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base text-justify sm:text-center mb-10">
            <p>
              Sistem Layanan Pengaduan Terpadu ini dirancang khusus untuk memfasilitasi masyarakat Kota Banjarmasin dalam melaporkan berbagai tindak kekerasan terhadap perempuan dan anak dengan mudah, aman, dan <strong>rahasia yang terjamin</strong>.
            </p>
            <p>
              Dikelola secara langsung oleh <strong>Dinas Pemberdayaan Perempuan dan Perlindungan Anak (DP3A) Kota Banjarmasin</strong>, aplikasi ini mengintegrasikan berbagai layanan perlindungan, mulai dari pelaporan awal, sesi <em>Live Chat</em> dengan konselor pendamping, penjadwalan konseling tatap muka, hingga pemantauan status penanganan kasus secara <em>real-time</em>. Harapan kami, platform ini dapat menjadi langkah nyata untuk mewujudkan lingkungan yang lebih aman dan ramah bagi seluruh lapisan masyarakat.
            </p>
          </div>

          {/* Buku Panduan Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800 border border-purple-100 dark:border-slate-700 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-left hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Dekorasi Background */}
            <div className="absolute -right-6 -top-6 text-purple-200/50 dark:text-slate-700/50 z-0 rotate-12">
              <BookOpen size={120} />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10 w-full">
              <div className="w-14 h-14 bg-[#4B2C82] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/20">
                <BookOpen size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#4B2C82] dark:text-purple-300">Buku Panduan Sistem</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                  Masih bingung cara menggunakannya? Silakan baca atau unduh buku panduan lengkap untuk mempelajari alur aplikasi.
                </p>
              </div>
            </div>
            
            <a 
              href="https://drive.google.com/drive/folders/10xcD8OwIkdVkZ6eYSHgp4M_I4As4qQpX?usp=drive_link" 
              target="_blank" 
              rel="noopener noreferrer"
              className="shrink-0 w-full sm:w-auto bg-[#4B2C82] hover:bg-purple-900 text-white px-6 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/20 relative z-10"
            >
              Baca Panduan <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* --- Section Tim Pengembang --- */}
        <div className="w-full mb-10">
          <div className="flex items-center justify-center gap-2 mb-8 text-gray-400 dark:text-slate-500">
            <Users size={20} />
            <h2 className="text-sm font-black tracking-widest uppercase">Tim Pengembang</h2>
            <Users size={20} className="scale-x-[-1]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
            
            {/* Profil Muhammad Bisri */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 rounded-[2rem] flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-5 border-4 border-gray-50 dark:border-slate-700 group-hover:border-purple-100 dark:group-hover:border-purple-900/50 transition-colors shadow-md">
                <img 
                  src="/bisri.jpeg" 
                  alt="Muhammad Bisri" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" }} 
                />
              </div>
              <h3 className="text-lg font-black text-gray-800 dark:text-slate-200 mb-1.5 group-hover:text-[#4B2C82] dark:group-hover:text-purple-400 transition-colors">
                Muhammad Bisri
              </h3>
              <p className="text-xs font-black text-[#4B2C82] dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/50 px-3 py-1 rounded-full mb-3 tracking-widest">
                C030323139
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 font-medium">
                <ShieldCheck size={14} className="text-green-500" /> D3 Teknik Informatika, Poliban
              </div>
            </div>

            {/* Profil Rizky Pratama Atmadhani */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 rounded-[2rem] flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-5 border-4 border-gray-50 dark:border-slate-700 group-hover:border-purple-100 dark:group-hover:border-purple-900/50 transition-colors shadow-md">
                <img 
                  src="/rizky.jpeg" 
                  alt="Rizky Pratama Atmadhani" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" }} 
                />
              </div>
              <h3 className="text-lg font-black text-gray-800 dark:text-slate-200 mb-1.5 group-hover:text-[#4B2C82] dark:group-hover:text-purple-400 transition-colors">
                Rizky P. Atmadhani
              </h3>
              <p className="text-xs font-black text-[#4B2C82] dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/50 px-3 py-1 rounded-full mb-3 tracking-widest">
                C030323149
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 font-medium">
                <ShieldCheck size={14} className="text-green-500" /> D3 Teknik Informatika, Poliban
              </div>
            </div>

          </div>
        </div>

      </motion.div>

      {/* Footer */}
      <div className="w-full text-center p-6 mt-auto">
        <p className="text-xs sm:text-sm font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">
          © 2026 - DP3A Kota Banjarmasin
        </p>
      </div>

    </div>
  );
}