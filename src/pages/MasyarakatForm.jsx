import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, MapPin, AlertCircle, Info, ChevronRight, ChevronLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function MasyarakatForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    date: '',
    location: '',
    description: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- LOGIKA PELINDUNG (STEP GUARD) ---
    if (step === 1) {
      nextStep();
      return;
    }
    
    // Pastikan user sudah login
    if (!auth.currentUser) {
      toast.error('Anda harus login terlebih dahulu!');
      return;
    }

    // Jika sudah di step 2 dan deskripsi kosong
    if (!formData.description.trim()) {
      toast.error('Mohon isi kronologi kejadian secara lengkap.');
      return;
    }

    setLoading(true);
    try {
      // 1. Menyimpan data ke tabel "laporan"
      await addDoc(collection(db, "laporan"), {
        user_id: auth.currentUser.uid,
        judul: formData.title,
        kategori_id: formData.category,
        tanggal_kejadian: formData.date,
        lokasi: formData.location,
        kronologi: formData.description,
        status_id: "menunggu", 
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // 2. BROADCAST NOTIFIKASI HANYA KE ADMIN (ALUR BARU)
      try {
        const rolesSnap = await getDocs(collection(db, "roles"));
        let adminRoleId = null;
        rolesSnap.forEach(roleDoc => {
          if (roleDoc.data().nama_role.toLowerCase() === 'admin') {
            adminRoleId = roleDoc.id;
          }
        });

        // Ambil semua user yang punya role admin
        const usersRef = collection(db, "users");
        let qAdmin;
        
        if (adminRoleId) {
           qAdmin = query(usersRef, where("role_id", "==", adminRoleId));
        } else {
           qAdmin = query(usersRef, where("role", "==", "admin")); 
        }
        
        const adminList = await getDocs(qAdmin);

        // Buat notifikasi untuk setiap admin
        const notifPromises = [];
        adminList.forEach(aDoc => {
          notifPromises.push(addDoc(collection(db, "notifikasi"), {
            target_user_id: aDoc.id,
            title: "Laporan Baru Masuk",
            message: `Ada laporan baru: "${formData.title}" kategori ${formData.category}. Mohon verifikasi dan teruskan ke konselor terkait.`,
            type: "laporan",
            link_to: "/admin/complaints",
            is_read: false,
            created_at: serverTimestamp()
          }));
        });

        await Promise.all(notifPromises);
      } catch (notifError) {
        console.error("Gagal mengirim notifikasi ke admin: ", notifError);
      }

      toast.success('Pengaduan berhasil dikirim! Tim kami akan segera menindaklanjuti.');
      navigate('/masyarakat/complaints'); 
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error('Gagal mengirim pengaduan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 2));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#4B2C82] mb-2">Buat Pengaduan</h1>
        <p className="text-gray-500 font-medium">Sampaikan keluhan Anda dengan detail untuk penanganan yang tepat.</p>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center gap-4 mb-10">
        {[
          { id: 1, label: 'Informasi Kejadian' },
          { id: 2, label: 'Kronologi Detail' }
        ].map((s) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s.id ? 'bg-[#4B2C82] text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {s.id}
              </div>
              <span className={`text-sm font-bold ${step >= s.id ? 'text-[#4B2C82]' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {s.id === 1 && <div className="flex-1 h-[2px] bg-gray-200 mx-2" />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
                <div className="bg-[#4B2C82]/5 border-b border-[#4B2C82]/10 p-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4B2C82] rounded-lg">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-[#4B2C82]">Data Utama</h2>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-gray-400">Judul Pengaduan</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4B2C82]/40" />
                      <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Masukkan judul singkat kejadian..."
                        className="w-full pl-12 pr-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-gray-400">Kategori Kasus</label>
                      <select 
                        id="category"
                        value={formData.category} 
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                        className="w-full px-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all appearance-none"
                      >
                        {/* MENGGUNAKAN 6 KATEGORI RESMI UPTD */}
                        <option value="" disabled>Pilih kategori kekerasan</option>
                        <option value="Kekerasan Fisik">Kekerasan Fisik</option>
                        <option value="Kekerasan Psikis">Kekerasan Psikis</option>
                        <option value="Kekerasan Seksual">Kekerasan Seksual</option>
                        <option value="Kekerasan Ekonomi">Kekerasan Ekonomi</option>
                        <option value="TPPO">TPPO (Perdagangan Orang)</option>
                        <option value="Lainnya">Lainnya (Sosial, ITE, dll)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="date" className="text-xs font-bold uppercase tracking-widest text-gray-400">Tanggal Kejadian</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4B2C82]/40" />
                        <input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full pl-12 pr-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all text-gray-600"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="location" className="text-xs font-bold uppercase tracking-widest text-gray-400">Lokasi Lengkap</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4B2C82]/40" />
                      <input
                        id="location"
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Sebutkan alamat atau lokasi kejadian secara rinci..."
                        className="w-full pl-12 pr-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
                <div className="bg-[#4B2C82]/5 border-b border-[#4B2C82]/10 p-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4B2C82] rounded-lg">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-[#4B2C82]">Kronologi Kejadian</h2>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-gray-400">Ceritakan Detail Kejadian</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tuliskan kronologi kejadian secara lengkap (Siapa, Apa, Mengapa, Dimana, Kapan)..."
                      rows={10}
                      className="w-full p-6 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all leading-relaxed resize-none"
                      required
                    />
                  </div>
                  
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-4">
                    <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800 font-medium leading-relaxed">
                      Berikan informasi sejujur-jujurnya. Informasi yang Anda berikan akan sangat menentukan langkah penanganan yang akan diambil tim kami.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 pt-4">
          {step === 2 && (
            <button 
              type="button" 
              className={`btn-modern flex-1 flex justify-center items-center py-4 rounded-2xl font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors ${loading ? 'cursor-wait' : ''}`}
              onClick={prevStep}
              disabled={loading}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Kembali
            </button>
          )}
          
          <button 
            type="submit" 
            disabled={loading || (step === 1 && (!formData.title || !formData.category || !formData.date || !formData.location))}
            className={`btn-modern flex-1 flex justify-center items-center py-4 rounded-2xl font-bold shadow-xl transition-all disabled:opacity-70 ${
              step === 1 ? 'bg-[#4B2C82] hover:bg-purple-900 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
            } ${loading ? 'cursor-wait' : ''}`}
          >
            {step === 1 ? (
              <>
                Lanjutkan
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kirim Pengaduan Sekarang"
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-purple-50 border border-purple-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-purple-100">
          <ShieldAlert className="w-6 h-6 text-[#4B2C82]" />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-sm font-bold text-[#4B2C82]">Identitas Anda Terlindungi</p>
          <p className="text-xs text-purple-700 font-medium mt-1">Sistem kami menggunakan keamanan database untuk memastikan privasi pelapor tetap terjaga dan hanya dapat diakses oleh petugas yang berwenang.</p>
        </div>
      </div>
    </div>
  );
}