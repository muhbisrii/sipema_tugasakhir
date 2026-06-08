import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle, ArrowLeft, Send, ShieldCheck, Lock } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase'; 

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Tautan reset password telah dikirim! Silakan cek Inbox atau folder Spam Anda.');
      setEmail(''); 
    } catch (error) {
      if (error.code === 'auth/invalid-email') setErrorMsg('Format email tidak valid.');
      else setErrorMsg('Terjadi kesalahan. Pastikan email benar atau coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col md:flex-row overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#4B2C82]/10 rounded-full blur-[100px] animate-soft-float" style={{animationDelay: '0.5s'}} />

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

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10 my-auto">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 animate-fade-in">
          <form onSubmit={handleReset} className="space-y-6 animate-slide-down">
            <div className="mb-6">
              <Link to="/login" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-[#4B2C82] mb-6 transition-colors hover:-translate-x-1 transform animate-slide-left delay-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Login
              </Link>
              <h2 className="text-2xl font-black text-gray-800 mb-2 animate-slide-left delay-200">Lupa Password? 🔐</h2>
              <p className="text-gray-500 font-medium text-sm animate-slide-left delay-300">
                Masukkan alamat email Anda dan kami akan mengirimkan tautan untuk mengatur ulang password.
              </p>
            </div>

            {message && (
              <div className="bg-green-50 text-green-600 border border-green-200 p-4 rounded-xl text-sm mb-4 flex gap-3 items-start font-medium animate-bounce-in">
                <CheckCircle className="h-5 w-5 shrink-0 animate-scale-bounce" />
                <p>{message}</p>
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 text-red-500 border border-red-200 p-3 rounded-xl text-sm mb-4 font-medium animate-bounce-in">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2 animate-slide-up delay-100">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email Terdaftar</label>
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

            <button 
              disabled={loading}
              type="submit" 
              className={`btn-modern w-full h-14 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-2xl text-base font-bold shadow-lg shadow-purple-900/20 disabled:opacity-70 disabled:cursor-not-allowed animate-slide-up delay-200 ${loading ? 'cursor-wait' : ''}`}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Send className="w-4 h-4 mr-2" /> Kirim Tautan Reset</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}