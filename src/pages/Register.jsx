import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, CreditCard, Calendar, GraduationCap, Users, CheckCircle, Loader2, EyeOff, Eye, ShieldCheck } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase'; 

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    nama: '', nik: '', email: '', no_hp: '', tanggal_lahir: '', jenis_kelamin: '', tingkat_pendidikan: '', password: '', konfirmasi: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (formData.password !== formData.konfirmasi) return setErrorMsg("Password dan Konfirmasi tidak cocok!");

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const [nikSnap, emailSnap, hpSnap] = await Promise.all([
        getDocs(query(usersRef, where("nik", "==", formData.nik))),
        getDocs(query(usersRef, where("email", "==", formData.email))),
        getDocs(query(usersRef, where("no_hp", "==", formData.no_hp)))
      ]);

      if (!nikSnap.empty) { setLoading(false); return setErrorMsg("Pendaftaran gagal: NIK tersebut sudah terdaftar!"); }
      if (!emailSnap.empty) { setLoading(false); return setErrorMsg("Pendaftaran gagal: Email tersebut sudah terdaftar!"); }
      if (!hpSnap.empty) { setLoading(false); return setErrorMsg("Pendaftaran gagal: Nomor Handphone tersebut sudah terdaftar!"); }

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        role_id: "ID_ROLE_MASYARAKAT",
        nama: formData.nama, email: formData.email, nik: formData.nik, no_hp: formData.no_hp,
        tanggal_lahir: formData.tanggal_lahir, jenis_kelamin: formData.jenis_kelamin, tingkat_pendidikan: formData.tingkat_pendidikan,
        status_akun: "aktif", created_at: serverTimestamp(), updated_at: serverTimestamp()
      });

      // --- BROADCAST NOTIFIKASI KE SEMUA ADMIN ---
      try {
        const rolesSnap = await getDocs(collection(db, "roles"));
        let adminRoleId = null;
        rolesSnap.forEach(roleDoc => {
          if (roleDoc.data().nama_role.toLowerCase() === 'admin') {
            adminRoleId = roleDoc.id;
          }
        });

        let qAdmin = adminRoleId 
          ? query(usersRef, where("role_id", "==", adminRoleId))
          : query(usersRef, where("role", "==", "admin"));
        
        const adminList = await getDocs(qAdmin);

        const notifPromises = [];
        adminList.forEach(aDoc => {
          notifPromises.push(addDoc(collection(db, "notifikasi"), {
            target_user_id: aDoc.id,
            title: "Pengguna Baru Bergabung!",
            message: `Masyarakat dengan nama "${formData.nama}" baru saja mendaftarkan akun.`,
            type: "new_user",
            link_to: "/admin/users",
            is_read: false,
            created_at: serverTimestamp()
          }));
        });

        await Promise.all(notifPromises);
      } catch (notifError) {
        console.error("Gagal mengirim notif ke admin: ", notifError);
      }

      await sendEmailVerification(user);
      setStep(2);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') setErrorMsg('Pendaftaran gagal: Email tersebut sudah terdaftar!');
      else setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (step === 2) {
      interval = setInterval(async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) { clearInterval(interval); setStep(3); }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    let timeout;
    if (step === 3) timeout = setTimeout(() => navigate('/'), 3000);
    return () => clearTimeout(timeout);
  }, [step, navigate]);

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col md:flex-row overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#4B2C82]/10 rounded-full blur-[100px] animate-soft-float" style={{animationDelay: '0.5s'}} />

      {/* Panel Kiri (Branding) */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 p-12 relative z-10 bg-[#4B2C82] text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#4B2C82] to-transparent opacity-80" />
        
        <div className="relative z-20 flex flex-col items-center text-center max-w-lg animate-fade-in">
          <div className="w-28 h-28 bg-white/10 backdrop-blur-xl p-4 rounded-3xl mb-8 shadow-2xl border border-white/20 transform hover:-translate-y-2 transition-transform duration-500 animate-float">
            <img src="/dpppa.png" alt="Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight tracking-tight animate-slide-up delay-100">
            Portal Layanan <br/>
            <span className="text-purple-300">DP3A Banjarmasin</span>
          </h1>
          <p className="text-lg text-purple-100 font-medium leading-relaxed opacity-90 mb-10 animate-slide-up delay-200">
            Dinas Pemberdayaan Perempuan dan Perlindungan Anak Kota Banjarmasin hadir untuk memberikan perlindungan dan pelayanan terbaik.
          </p>
          <div className="flex gap-4 animate-slide-up delay-300">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all hover:scale-105 cursor-pointer">
              <ShieldCheck className="w-4 h-4 text-green-400 animate-gentle-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Aman</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all hover:scale-105 cursor-pointer">
              <Lock className="w-4 h-4 text-purple-400 animate-gentle-pulse" style={{animationDelay: '0.5s'}} />
              <span className="text-xs font-bold uppercase tracking-wider">Rahasia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Kanan (Form) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10 my-auto">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 animate-fade-in">
          
          {step === 1 && (
            <form onSubmit={handleRegister} className="space-y-5 animate-slide-down">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-gray-800 mb-1 animate-slide-left delay-100">Buat Akun Baru ✨</h2>
                <p className="text-gray-500 font-medium text-sm animate-slide-left delay-200">Lengkapi data diri Anda di bawah ini</p>
              </div>

              {errorMsg && <div className="bg-red-50 text-red-500 border border-red-200 p-3 rounded-xl text-sm mb-4 font-medium animate-bounce-in">{errorMsg}</div>}

              {/* Scrollable Form Area dari Desain Figma */}
              <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-purple-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-400">
                
                <div className="space-y-2 animate-slide-up delay-100">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nama Lengkap</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                    <input name="nama" value={formData.nama} onChange={handleChange} required placeholder="Sesuai KTP" className="w-full pl-10 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm hover:bg-gray-100 transition-colors" />
                  </div>
                </div>
                
                <div className="space-y-2 animate-slide-up delay-200">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="email@contoh.com" className="w-full pl-10 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm hover:bg-gray-100 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 animate-slide-up delay-300">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">NIK</label>
                    <div className="relative group">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                      <input name="nik" value={formData.nik} onChange={handleChange} required placeholder="16 digit NIK" className="w-full pl-10 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm hover:bg-gray-100 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-2 animate-slide-up delay-300">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No. HP</label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                      <input name="no_hp" type="tel" value={formData.no_hp} onChange={handleChange} required placeholder="08..." className="w-full pl-10 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm hover:bg-gray-100 transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 animate-slide-up delay-400">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Lahir</label>
                    <div className="relative group">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                      <input name="tanggal_lahir" type="date" value={formData.tanggal_lahir} onChange={handleChange} required className="w-full pl-10 pr-2 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm text-gray-600 hover:bg-gray-100 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-2 animate-slide-up delay-400">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Kelamin</label>
                    <div className="relative group">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                      <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange} required className="w-full pl-10 pr-2 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm text-gray-600 appearance-none hover:bg-gray-100 transition-colors">
                        <option value="" disabled>Pilih</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 animate-slide-up delay-500">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tingkat Pendidikan</label>
                  <div className="relative group">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                    <select name="tingkat_pendidikan" value={formData.tingkat_pendidikan} onChange={handleChange} required className="w-full pl-10 pr-2 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm text-gray-600 appearance-none hover:bg-gray-100 transition-colors">
                      <option value="" disabled>Pilih</option>
                      <option value="SD">SD Sederajat</option>
                      <option value="SMP">SMP Sederajat</option>
                      <option value="SMA">SMA Sederajat</option>
                      <option value="D3">Diploma (D3)</option>
                      <option value="S1">Sarjana (S1)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 animate-slide-up delay-600">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} required minLength={6} placeholder="Min. 6 Kar" className="w-full pl-10 pr-8 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Konfirmasi</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="konfirmasi" type={showPassword ? "text" : "password"} value={formData.konfirmasi} onChange={handleChange} required placeholder="Ulangi Pass" className="w-full pl-10 pr-8 h-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] outline-none text-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button disabled={loading} type="submit" className={`btn-modern w-full h-14 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-2xl text-base font-bold shadow-lg shadow-purple-900/20 mt-6 disabled:opacity-70 disabled:cursor-not-allowed animate-slide-up delay-700 ${loading ? 'cursor-wait' : ''}`}>
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Daftar Akun"}
              </button>
              
              <div className="text-center mt-4 animate-slide-up delay-300">
                <span className="text-sm text-gray-500 font-medium">Sudah punya akun? </span>
                <Link to="/login" className="btn-modern text-sm text-[#4B2C82] font-black hover:underline hover:text-purple-900 transition-colors transform inline-block">Masuk di sini</Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center text-center py-8 animate-fade-in">
              <div className="bg-yellow-50 p-5 rounded-full relative mb-6 animate-scale-bounce">
                <Mail className="text-yellow-500 h-10 w-10 animate-gentle-pulse" />
                <span className="absolute top-3 right-3 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white animate-glow-pulse"></span>
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2 animate-slide-down">Cek Email Anda!</h2>
              <p className="text-gray-500 text-sm mb-6 animate-slide-up delay-100">Kami telah mengirim verifikasi ke <strong>{formData.email}</strong>.</p>
              <div className="bg-purple-50 text-[#4B2C82] px-6 py-3 rounded-xl text-sm mb-6 inline-block font-bold animate-float delay-200">Jangan tutup halaman ini.</div>
              <p className="text-gray-500 text-sm mb-12 animate-slide-up delay-300">Buka Tab Baru/HP, cek Inbox/Spam, lalu klik linknya.</p>
              <div className="flex items-center gap-2 text-gray-400 text-sm font-medium animate-slide-up delay-400"><Loader2 className="h-4 w-4 animate-spin" /> Mendeteksi verifikasi...</div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center text-center py-8 animate-fade-in">
              <div className="bg-green-100 p-5 rounded-full mb-6 animate-bounce-in">
                <CheckCircle className="text-green-500 h-12 w-12 animate-scale-bounce" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2 animate-slide-down">Berhasil!</h2>
              <p className="text-gray-500 text-sm mb-8 font-medium animate-slide-up delay-100">Email Anda terverifikasi.<br/>Mengarahkan ke Login...</p>
              <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden animate-slide-up delay-200">
                <div className="h-full bg-green-500 animate-gradient-shift w-full"></div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}