import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase'; 

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State untuk mengontrol munculnya petunjuk pendaftaran
  const [showRegisterHint, setShowRegisterHint] = useState(false);

  // Mengecek apakah pengguna sudah pernah melihat petunjuk ini sebelumnya
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('hasSeenLoginHint');
    if (!hasSeenHint) {
      // Memberikan jeda 1 detik sebelum petunjuk muncul agar terlihat natural
      const timer = setTimeout(() => setShowRegisterHint(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fungsi untuk menutup dan menyimpan status petunjuk ke browser
  const handleDismissHint = () => {
    setShowRegisterHint(false);
    localStorage.setItem('hasSeenLoginHint', 'true');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');    
    setLoading(true);   

    try {
      // 1. Autentikasi User
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Ambil data user dari Firestore TERLEBIH DAHULU untuk mengetahui Role-nya
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let roleName = 'masyarakat'; // Default role

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const roleId = userData.role_id;

        // Ambil nama role dari collection 'roles' berdasarkan role_id
        if (roleId) {
          const roleDocRef = doc(db, 'roles', roleId);
          const roleDocSnap = await getDoc(roleDocRef);

          if (roleDocSnap.exists()) {
            roleName = roleDocSnap.data().nama_role.toLowerCase();
          }
        }
      }

      // ==========================================
      // PENGECEKAN SATPAM (HANYA UNTUK MASYARAKAT)
      // ==========================================
      // Jika rolenya masyarakat DAN email belum diverifikasi, maka blokir!
      if (roleName === 'masyarakat' && !user.emailVerified) {
        await signOut(auth); // Logout paksa
        setErrorMsg("Login gagal: Harap verifikasi email Anda terlebih dahulu. Cek kotak masuk atau folder Spam Anda.");
        setLoading(false);
        return; // Hentikan proses eksekusi kode
      }
      // ==========================================

      // 3. Arahkan pengguna berdasarkan Hak Akses (Role)
      // Admin dan Konselor akan lolos dari pengecekan di atas dan langsung masuk ke sini
      if (roleName === 'admin') {
        navigate('/admin/complaints');
      } else if (roleName === 'konselor') {
        navigate('/konselor/dashboard'); 
      } else {
        navigate('/masyarakat');
      }

    } catch (error) {
      if (error.code === 'auth/user-not-found') setErrorMsg('Akun tidak terdaftar.');
      else if (error.code === 'auth/wrong-password') setErrorMsg('Password salah.');
      else if (error.code === 'auth/invalid-credential') setErrorMsg('Akun tidak terdaftar atau password salah.');
      else if (error.code === 'auth/too-many-requests') setErrorMsg('Terlalu banyak percobaan. Coba lagi nanti.');
      else setErrorMsg('Terjadi kesalahan pada sistem. Silakan coba lagi.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col md:flex-row overflow-hidden relative">
      {/* Decorative Background Elements */}
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
          
          {/* Header Mobile Only */}
          <div className="md:hidden flex flex-col items-center mb-8 animate-slide-down">
            <div className="w-16 h-16 bg-[#4B2C82] rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-soft-float">
              <img src="/dpppa.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h2 className="text-2xl font-black text-[#4B2C82]">Portal DP3A</h2>
            <p className="font-medium text-gray-500 text-sm">Banjarmasin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="text-center md:text-left mb-8 hidden md:block animate-slide-left delay-100">
              <h2 className="text-3xl font-black text-gray-800 mb-2">Selamat Datang <span className="animate-wave inline-block">👋</span></h2>
              <p className="text-gray-500 font-medium">Silakan masuk ke akun Anda</p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-500 border border-red-200 p-3 rounded-xl text-sm mb-4 font-medium animate-bounce-in">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2 animate-slide-left delay-200">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                <input
                  type="email"
                  placeholder="contoh@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-300/50 transition-all text-base outline-none hover:bg-gray-100"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 animate-slide-left delay-300">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#4B2C82] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-300/50 transition-all text-base outline-none hover:bg-gray-100"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors hover:scale-110"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs font-bold text-[#4B2C82] hover:underline hover:text-purple-900 transition-colors mt-2 inline-block hover:scale-105 transform">
                  Lupa Password?
                </Link>
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className={`btn-modern w-full h-14 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-2xl text-base font-bold shadow-lg shadow-purple-900/20 mt-8 disabled:opacity-70 disabled:cursor-not-allowed animate-slide-left delay-400 ${loading ? 'cursor-wait' : ''}`}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Masuk Sistem"}
            </button>

            {/* Bagian Link Register dengan Tooltip Hint */}
            <div className="text-center mt-6 animate-slide-up delay-300 relative">
              <span className="text-sm text-gray-500 font-medium">Belum punya akun? </span>
              
              <div className="inline-block relative">
                <Link 
                  to="/register" 
                  onClick={handleDismissHint} // Menutup hint kalau link beneran diklik
                  className="text-sm text-[#4B2C82] font-black hover:underline hover:text-purple-900 transition-colors hover:scale-105 transform inline-block"
                >
                  Daftar Sekarang
                </Link>

                {/* Komponen Tooltip yang muncul untuk memandu pengguna */}
                {showRegisterHint && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-gradient-to-r from-[#6b42b9] to-[#4B2C82] text-white text-xs py-2.5 px-3 rounded-xl shadow-2xl animate-bounce z-50 flex items-center justify-between gap-2">
                    <span className="font-semibold leading-relaxed">
                      Belum punya akun? Daftar akun di sini!
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault(); 
                        handleDismissHint();
                      }}
                      className="text-white hover:bg-white/20 p-1 rounded-full transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {/* Segitiga panah ke bawah */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-[#4B2C82] border-r-[8px] border-r-transparent"></div>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}