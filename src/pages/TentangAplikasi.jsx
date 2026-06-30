import 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TentangAplikasi({ onBack }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Header / Topbar */}
      <div className="w-full bg-white dark:bg-[#0f172a] shadow-sm border-b border-gray-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
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
        className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        
        {/* Logos */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
            <img src="/pemkot.png" alt="Logo Pemkot Banjarmasin" className="w-full h-full object-contain" />
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
            <img src="/logo-dp3a.png" alt="Logo DP3A" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none' }} />
          </div>
        </div>

        {/* App Info */}
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2">
          Layanan Pengaduan DPPPA Banjarmasin
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-6">
          Versi 1.0.0 (Build 1)
        </p>

        {/* --- Section Tim Pengembang (Sekarang di Atas) --- */}
        <div className="w-full mb-10">
          <div className="flex items-center justify-center gap-2 mb-4 text-gray-500 dark:text-slate-400">
            <Users size={18} />
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase">Tim Pengembang</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
            
            {/* Profil Muhammad Bisri */}
            <div className="bg-white/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col items-center hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700/60 transition-all group">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-gray-200 dark:border-slate-700 group-hover:border-[#4B2C82] dark:group-hover:border-purple-500 transition-colors shadow-sm">
                <img 
                  src="/bisri.jpeg" 
                  alt="Muhammad Bisri" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" }} 
                />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-200 mb-1 group-hover:text-[#4B2C82] dark:group-hover:text-purple-400 transition-colors">
                Muhammad Bisri
              </h3>
              <p className="text-xs font-semibold text-[#4B2C82] dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full mb-2">
                C030323139
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                D3 Teknik Informatika, Poliban
              </p>
            </div>

            {/* Profil Rizky Pratama Atmadhani */}
            <div className="bg-white/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col items-center hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700/60 transition-all group">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-gray-200 dark:border-slate-700 group-hover:border-[#4B2C82] dark:group-hover:border-purple-500 transition-colors shadow-sm">
                <img 
                  src="/rizky.jpeg" 
                  alt="Rizky Pratama Atmadhani" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" }} 
                />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-200 mb-1 group-hover:text-[#4B2C82] dark:group-hover:text-purple-400 transition-colors">
                Rizky Pratama Atmadhani
              </h3>
              <p className="text-xs font-semibold text-[#4B2C82] dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full mb-2">
                C030323149
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                D3 Teknik Informatika, Poliban
              </p>
            </div>

          </div>
        </div>

        {/* Description (Sekarang di Bawah dengan Garis Pembatas) */}
        <div className="w-full border-t border-gray-200 dark:border-slate-800 pt-8 max-w-2xl mx-auto">
          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 leading-relaxed">
            Aplikasi ini dibuat untuk memudahkan masyarakat Kota Banjarmasin dalam melaporkan kejadian kekerasan terhadap perempuan dan anak. Dikelola oleh Dinas Pemberdayaan Perempuan dan Perlindungan Anak Kota Banjarmasin.
          </p>
        </div>

      </motion.div>

      {/* Footer */}
      <div className="w-full text-center p-6 mt-auto">
        <p className="text-xs sm:text-sm font-medium text-gray-400 dark:text-slate-500">
          © 2026 - DPPPA Kota Banjarmasin
        </p>
      </div>

    </div>
  );
}