import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Halaman Landing Page
import Landing from './pages/Landing';

// Halaman Autentikasi
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Layout & Halaman Masyarakat
import MasyarakatLayout from './layouts/MasyarakatLayout';
import MasyarakatDashboard from './pages/MasyarakatDashboard';
import MasyarakatForm from './pages/MasyarakatForm';
import MasyarakatComplaints from './pages/MasyarakatComplaints';
import MasyarakatEditProfile from './pages/MasyarakatEditProfile';
import MasyarakatAIConsult from './pages/MasyarakatAIConsult';
import TentangAplikasi from './pages/TentangAplikasi';
import StatistikLayanan from './pages/StatistikLayanan';
import Bantuan from './pages/Bantuan';

// Layout & Halaman Admin
import AdminLayout from './layouts/AdminLayout';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminUsers from './pages/admin/AdminUsers';

// Layout & Halaman Konselor
import KonselorLayout from './layouts/KonselorLayout';
import KonselorDashboard from './pages/konselor/KonselorDashboard';
import KonselorComplaints from './pages/konselor/KonselorComplaints';
import KonselorSchedule from './pages/konselor/KonselorSchedule';
import KonselorHistory from './pages/konselor/KonselorHistory';

// --- WRAPPER UNTUK LANDING PAGE ---
// Ini berfungsi agar Landing Page bisa menggunakan fitur navigasi ke halaman Login
const LandingWrapper = () => {
  const navigate = useNavigate();

  return (
    <Landing 
      // Arahkan tombol Lapor/Login ke halaman /login
      onStart={() => navigate('/login')} 
      
      // Arahkan menu "Tentang Aplikasi" ke halaman TentangAplikasi
      onAbout={() => navigate('/tentang')}
      // Arahkan menu "Statistik Layanan" ke halaman StatistikLayanan
      onStats={() => navigate('/statistik')}
      // Arahkan menu "Bantuan" ke halaman Bantuan
      onHelp={() => navigate('/bantuan')}
    />
  );
};

// Wrapper agar komponen TentangAplikasi bisa menerima aksi navigasi "kembali"
const TentangWrapper = () => {
  const navigate = useNavigate();
  return <TentangAplikasi onBack={() => navigate(-1)} />;
};

// Wrapper untuk Statistik agar komponen menerima prop `onBack`
const StatistikWrapper = () => {
  const navigate = useNavigate();
  return <StatistikLayanan onBack={() => navigate(-1)} />;
};

// Wrapper untuk Bantuan agar komponen menerima prop `onBack`
const BantuanWrapper = () => {
  const navigate = useNavigate();
  return <Bantuan onBack={() => navigate(-1)} />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen w-full font-sans bg-[#F8F9FE]">
        <Routes>
          {/* Rute Landing Page */}
          <Route path="/" element={<LandingWrapper />} />
          <Route path="/tentang" element={<TentangWrapper />} />
          <Route path="/statistik" element={<StatistikWrapper />} />
          <Route path="/bantuan" element={<BantuanWrapper />} />

          {/* Rute Autentikasi */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Rute Masyarakat (Warga) */}
          <Route path="/masyarakat/*" element={
            <MasyarakatLayout>
              <Routes>
                <Route path="/" element={<MasyarakatDashboard />} />
                <Route path="/dashboard" element={<MasyarakatDashboard />} />
                <Route path="/form" element={<MasyarakatForm />} />
                <Route path="/complaints" element={<MasyarakatComplaints />} />
                <Route path="/edit-profile" element={<MasyarakatEditProfile />} />
                <Route path="/ai-consult" element={<MasyarakatAIConsult />} />
              </Routes>
            </MasyarakatLayout>
          } />

          {/* Rute Administrator */}
          <Route path="/admin/*" element={
            <AdminLayout>
              <Routes>
                {/* Default redirect Admin ke Data Pengaduan */}
                <Route path="/" element={<AdminComplaints />} />
                <Route path="/complaints" element={<AdminComplaints />} />
                <Route path="/users" element={<AdminUsers />} />
              </Routes>
            </AdminLayout>
          } />

          {/* Rute Konselor */}
          <Route path="/konselor/*" element={
            <KonselorLayout>
              <Routes>
                <Route path="/" element={<KonselorDashboard />} />
                <Route path="/dashboard" element={<KonselorDashboard />} />
                <Route path="/complaints" element={<KonselorComplaints />} />
                <Route path="/schedule" element={<KonselorSchedule />} />
                <Route path="/history" element={<KonselorHistory />} />
              </Routes>
            </KonselorLayout>
          } />
        </Routes>
        
        {/* Notifikasi Toast Global */}
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;