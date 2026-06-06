import 'react';
import { ArrowLeft } from 'lucide-react';
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
        
        {/* Logos (Hanya 2 Logo Sesuai Permintaan) */}
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
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-8">
          Versi 1.0.0 (Build 1)
        </p>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 leading-relaxed max-w-2xl">
          Aplikasi ini dibuat untuk memudahkan masyarakat Kota Banjarmasin dalam melaporkan kejadian kekerasan terhadap perempuan dan anak. Dikelola oleh Dinas Pemberdayaan Perempuan dan Perlindungan Anak Kota Banjarmasin.
        </p>

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