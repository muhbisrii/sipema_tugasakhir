import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updatePassword, deleteUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import { AlertCircle, User, Phone, Mail, CreditCard, Lock, ShieldAlert, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function MasyarakatEditProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    no_hp: '',
    email: '',
  });

  const [password, setPassword] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              nama: data.nama || '',
              nik: data.nik || '',
              no_hp: data.no_hp || '',
              email: data.email || auth.currentUser.email || '',
            });
          }
        } catch (error) {
          console.error("Gagal menarik data profil:", error);
          toast.error("Gagal memuat profil.");
        }
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        nama: formData.nama,
        nik: formData.nik,
        no_hp: formData.no_hp,
        updated_at: new Date()
      });

      setSuccess('Profil Anda berhasil diperbarui!');
      toast.success('Profil berhasil disimpan');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Gagal memperbarui profil. Mohon periksa koneksi Anda.');
      toast.error('Gagal menyimpan profil');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || password.length < 6) {
      toast.error("Password baru minimal 6 karakter!");
      return;
    }

    try {
      await updatePassword(auth.currentUser, password);
      toast.success("Password berhasil diubah!");
      setPassword('');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Sesi Anda sudah lama. Silakan logout dan login kembali untuk mengubah password.");
      } else {
        toast.error("Gagal mengubah password.");
        console.error(error);
      }
    }
  };

  const confirmDeleteAccount = async () => {
    if (!auth.currentUser) return;
    
    setIsDeleting(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await deleteDoc(userRef);
      await deleteUser(auth.currentUser);
      
      toast.success("Akun berhasil dihapus permanen.");
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Sesi sudah usang. Silakan logout dan login kembali untuk menghapus akun.");
      } else {
        toast.error('Gagal menghapus akun. Silakan hubungi admin.');
      }
      console.error(err);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 relative">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 font-bold text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" /> {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-[2rem] overflow-hidden">
            <div className="bg-[#4B2C82]/5 border-b border-purple-50 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#4B2C82] rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#4B2C82]">Data Profil</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Identitas Pengguna</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="text"
                        name="nama" 
                        value={formData.nama} 
                        onChange={handleInputChange} 
                        className="w-full pl-12 pr-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIK (Sesuai KTP)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="text"
                        name="nik" 
                        value={formData.nik} 
                        onChange={handleInputChange} 
                        className="w-full pl-12 pr-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Handphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="tel"
                        name="no_hp" 
                        value={formData.no_hp} 
                        onChange={handleInputChange} 
                        className="w-full pl-12 pr-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="email"
                        value={formData.email} 
                        disabled 
                        className="w-full pl-12 pr-4 h-14 rounded-2xl border-gray-100 bg-gray-100 text-gray-500 opacity-60 cursor-not-allowed" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full flex justify-center items-center bg-[#4B2C82] hover:bg-purple-900 text-white h-14 rounded-2xl font-bold shadow-xl transition-all disabled:opacity-70"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Perbarui Profil'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white border border-gray-100 shadow-sm rounded-[2rem] overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 p-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-gray-800">Keamanan</h2>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password Baru</label>
                    <input 
                      type="password" 
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none transition-all" 
                    />
                  </div>
                  <button 
                    onClick={handleChangePassword}
                    className="w-full flex justify-center items-center h-14 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Ubah Password
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-[2rem] overflow-hidden">
              <div className="p-8 space-y-4 text-center">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-red-100">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-red-900 font-black">Zona Bahaya</h3>
                <p className="text-xs text-red-700 font-medium leading-relaxed">Hapus akun secara permanen akan menghapus seluruh data dan riwayat laporan Anda.</p>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex justify-center items-center bg-red-600 hover:bg-red-700 text-white h-14 rounded-2xl font-bold shadow-lg shadow-red-200 transition-all"
                >
                  Hapus Akun Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POP-UP MODERN HAPUS AKUN (Menutupi Layar) */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              /* Hapus overflow-hidden di sini agar ikon bisa keluar dari kotak */
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative mt-8"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto border-4 border-white shadow-sm -mt-16 absolute top-0 left-1/2 transform -translate-x-1/2">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                
                <div className="pt-10">
                  <h3 className="text-2xl font-black text-gray-800 mb-3">Hapus Akun Permanen?</h3>
                  <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8">
                    Tindakan ini <strong className="text-red-500">tidak dapat dibatalkan</strong>. Seluruh data profil dan riwayat pengaduan Anda akan dihapus secara permanen dari sistem DP3A Banjarmasin.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 flex justify-center items-center py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-70"
                  >
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ya, Hapus!'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}