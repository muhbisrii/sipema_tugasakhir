import { useState } from "react";
import { ArrowLeft, ChevronDown, Mail, PhoneCall, HelpCircle, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Bantuan({ onBack }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqData = [
    {
      question: "Bagaimana cara membuat laporan?",
      answer: "Anda dapat membuat laporan dengan menekan tombol 'Masuk / Daftar' di halaman utama, masuk ke akun Anda, lalu isi formulir pengaduan yang tersedia di dashboard masyarakat."
    },
    {
      question: "Apa saja yang bisa saya laporkan?",
      answer: "Anda dapat melaporkan tindak kekerasan fisik, psikis, seksual, penelantaran, serta eksploitasi terhadap perempuan dan anak yang terjadi di wilayah administrasi Kota Banjarmasin."
    },
    {
      question: "Apakah data dan identitas saya aman?",
      answer: "Ya, sangat aman. Identitas pelapor dan korban dilindungi secara ketat serta dirahasiakan oleh sistem sesuai dengan undang-undang perlindungan saksi dan korban."
    },
    {
      question: "Berapa lama laporan saya ditanggapi?",
      answer: "Laporan yang masuk akan diverifikasi oleh petugas admin kami dalam waktu maksimal 1x24 jam pada hari dan jam kerja dinas."
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
      
      {/* Topbar */}
      <div className="w-full bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 font-bold hover:text-[#4B2C82] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Kembali ke Beranda</span>
          <span className="sm:hidden">Kembali</span>
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-[#4B2C82]">
          <HelpCircle size={18} />
          Pusat Bantuan
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 w-full flex-1">
        
        {/* Header Title */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3">
            Ada yang bisa kami bantu?
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            Temukan jawaban untuk pertanyaan umum atau hubungi kontak layanan kami.
          </p>
        </div>

        {/* Section FAQ */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6 px-2">
            <MessageCircle className="text-[#4B2C82] w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-800">Pertanyaan Sering Diajukan (FAQ)</h3>
          </div>
          
          <div className="space-y-3">
            {faqData.map((item, index) => (
              <div 
                key={index} 
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:border-purple-200 transition-colors"
              >
                <button 
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className={`font-bold text-sm sm:text-base pr-4 ${activeIndex === index ? 'text-[#4B2C82]' : 'text-slate-700'}`}>
                    {item.question}
                  </span>
                  <motion.div
                    animate={{ rotate: activeIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`shrink-0 ${activeIndex === index ? 'text-[#4B2C82]' : 'text-slate-400'}`}
                  >
                    <ChevronDown size={20} />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {activeIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 pt-1 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-gray-50 mt-2">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Section Kontak */}
        <div>
          <div className="flex items-center gap-3 mb-6 px-2">
            <PhoneCall className="text-[#4B2C82] w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-800">Butuh Bantuan Lebih Lanjut?</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Kartu Email */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Mail className="text-[#4B2C82] w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kirim Email</p>
                <p className="text-sm sm:text-base font-bold text-slate-800 break-all">
                  dpppa@banjarmasinkota.go.id
                </p>
              </div>
            </div>

            {/* Kartu Telepon */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <PhoneCall className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Telepon Kantor</p>
                <p className="text-sm sm:text-base font-bold text-slate-800">
                  (0511) 3307-788
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}