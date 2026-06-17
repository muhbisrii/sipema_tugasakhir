import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  History, LogOut, BarChart3, Calendar, ClipboardList, User, Bell, Menu, X, Loader2, Clock, Info, MessageSquare, Star, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';

export default function KonselorLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // PERBAIKAN 1: Deteksi layar. Buka sidebar jika di Laptop, tutup otomatis jika di HP
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // State untuk data user dan modal logout
  const [userName, setUserName] = useState('Konselor');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isClearingNotifs, setIsClearingNotifs] = useState(false); 
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // PERBAIKAN 2: Listener untuk mendeteksi perubahan ukuran layar (misal rotate HP)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');

  // Minta Izin Notifikasi Perangkat (Laptop/HP) saat web dimuat
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Mengambil data konselor dan notifikasi dari Firestore saat komponen dimuat
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserName(docSnap.data().nama);
          } else {
            setUserName(user.email.split('@')[0]);
          }

          // Listener Notifikasi Real-time
          const notifRef = collection(db, "notifikasi");
          const qNotif = query(
            notifRef, 
            where("target_user_id", "==", user.uid),
            orderBy("created_at", "desc")
          );

          const unsubNotif = onSnapshot(qNotif, (snapshot) => {
            const fetchedNotifs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().created_at?.toDate()
            }));
            setNotifications(fetchedNotifs);

            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const newNotif = change.doc.data();
                
                const now = Date.now();
                const notifTime = newNotif.created_at?.toMillis() || 0;
                
                if (now - notifTime < 5000) {
                  if ("Notification" in window && Notification.permission === "granted") {
                    const systemNotif = new Notification("Portal DP3A (Konselor): " + newNotif.title, {
                      body: newNotif.message,
                      icon: '/dpppa.png',
                      badge: '/dpppa.png'
                    });

                    systemNotif.onclick = function() {
                      window.focus();
                      if (newNotif.link_to) {
                        navigate(newNotif.link_to);
                      }
                      this.close();
                    };
                  }
                }
              }
            });
          });

          return () => unsubNotif();

        } catch (error) {
          console.error("Gagal mengambil data user/notif:", error);
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      navigate('/');
      toast.success('Berhasil keluar dari sesi Konselor.');
    } catch (error) {
      console.error("Gagal logout:", error);
      toast.error('Gagal keluar. Silakan coba lagi.');
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  const handleReadNotification = async (notif) => {
    setIsNotifOpen(false);
    if (!notif.is_read) {
      try {
        await updateDoc(doc(db, "notifikasi", notif.id), { is_read: true });
      } catch (e) {
        console.error("Gagal update status notif", e);
      }
    }
    if (notif.link_to) {
      navigate(notif.link_to);
    }
  };

  const handleClearAllNotifs = async () => {
    if (notifications.length === 0) return;
    setIsClearingNotifs(true);
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        const notifRef = doc(db, "notifikasi", notif.id);
        batch.delete(notifRef);
      });
      await batch.commit();
      toast.success("Semua notifikasi berhasil dibersihkan");
      setIsNotifOpen(false); 
    } catch (error) {
      console.error("Gagal menghapus notifikasi:", error);
      toast.error("Gagal membersihkan notifikasi");
    } finally {
      setIsClearingNotifs(false);
    }
  };

  const menuItems = [
    { path: '/konselor/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/konselor/complaints', label: 'Penanganan Kasus', icon: ClipboardList },
    { path: '/konselor/schedule', label: 'Jadwal Pertemuan', icon: Calendar },
    { path: '/konselor/history', label: 'Riwayat Konseling', icon: History },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FE] overflow-hidden relative">
      
      {/* PERBAIKAN 3: Overlay (Gelap) di HP saat sidebar terbuka agar mudah ditutup */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth <= 768 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#4B2C82] text-white flex-shrink-0 overflow-hidden absolute md:relative h-full z-50 shadow-2xl md:shadow-xl"
      >
        <div className="w-[280px] h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0">
              <img src="/dpppa.png" alt="DP3A" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Portal DP3A</h1>
              <p className="text-[10px] text-purple-200 uppercase tracking-widest font-semibold">Banjarmasin</p>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-10 p-4 bg-white/10 rounded-2xl border border-white/10 transition-all hover:bg-white/15">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate capitalize">{userName}</p>
                <p className="text-[10px] text-purple-200 uppercase tracking-wider mt-0.5">Konselor / Psikolog</p>
              </div>
            </div>
          </div>

          {/* Menu Utama */}
          <nav className="flex-1 space-y-2">
            <p className="text-[10px] text-purple-300 mb-4 px-4 font-bold tracking-[0.2em] uppercase opacity-60">Menu Penanganan</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.includes(item.path) || (location.pathname === '/konselor' && item.path === '/konselor/dashboard');
              
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.path);
                    // PERBAIKAN 4: Tutup otomatis di HP jika menu ditekan
                    if (window.innerWidth <= 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white text-[#4B2C82] shadow-lg shadow-purple-900/20' 
                      : 'text-purple-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#4B2C82]' : 'text-purple-200'}`} />
                  <span className="text-sm font-semibold">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeKonselorTab"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4B2C82]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="mt-auto pt-6 border-t border-white/10">
            <button
              className="w-full flex items-center justify-start text-purple-100 hover:bg-white/10 hover:text-white rounded-xl py-4 px-4 transition-all font-semibold group"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <LogOut className="w-5 h-5 mr-4 transition-transform group-hover:-translate-x-1" />
              <span>Keluar Sistem</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white border-b border-purple-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-[#4B2C82] hover:bg-purple-50 rounded-lg transition-all focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xl font-bold text-[#4B2C82]">
                {menuItems.find(i => location.pathname.includes(i.path))?.label || 'Panel Konselor'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">Ruang Kerja & Pendampingan</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 text-right bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Clock className="w-4 h-4 text-[#4B2C82]" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formattedDate}</p>
                <p className="text-sm font-black text-[#4B2C82] font-mono tracking-wider">
                  {formattedTime} <span className="text-[10px] text-purple-400">WITA</span>
                </p>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-purple-100 hidden sm:block" />
            
            {/* NOTIFIKASI BELL */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2.5 rounded-xl transition-all ${isNotifOpen ? 'bg-purple-100 text-[#4B2C82]' : 'text-gray-400 hover:text-[#4B2C82] hover:bg-purple-50'}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-purple-100 z-50 overflow-hidden flex flex-col max-h-[80vh]"
                    >
                      <div className="p-4 border-b border-purple-50 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-[#4B2C82]">Notifikasi Konselor</h3>
                          {unreadCount > 0 && (
                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {unreadCount} Baru
                            </span>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <button 
                            onClick={handleClearAllNotifs}
                            disabled={isClearingNotifs}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 bg-white border border-gray-200 hover:border-red-200 px-2 py-1 rounded-md"
                          >
                            {isClearingNotifs ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3" /> Bersihkan</>}
                          </button>
                        )}
                      </div>
                      
                      <div className="overflow-y-auto flex-1 p-2">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center flex flex-col items-center">
                            <Bell className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-500">Belum ada notifikasi masuk</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => handleReadNotification(notif)}
                              className={`p-3 mb-1 rounded-xl cursor-pointer transition-all border-l-4 ${notif.is_read ? 'bg-white border-transparent hover:bg-gray-50' : 'bg-purple-50/50 border-[#4B2C82] hover:bg-purple-50'}`}
                            >
                              <div className="flex gap-3">
                                <div className="mt-0.5 shrink-0">
                                  {notif.type === 'system' ? <Info className="w-5 h-5 text-blue-500" /> :
                                   notif.type === 'laporan' ? <ClipboardList className="w-5 h-5 text-purple-500" /> :
                                   notif.type === 'rating' ? <Star className="w-5 h-5 text-yellow-500" /> :
                                   notif.type === 'chat' ? <MessageSquare className="w-5 h-5 text-green-500" /> :
                                   <Bell className="w-5 h-5 text-[#4B2C82]" />}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm ${notif.is_read ? 'text-gray-700' : 'text-gray-900 font-bold'}`}>{notif.title}</p>
                                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                  <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-wider">
                                    {notif.createdAt ? notif.createdAt.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto bg-[#FDFEFE] p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* MODAL LOGOUT KONSELOR */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center relative"
            >
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-20 h-20 bg-purple-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 mt-4 relative">
                <div className="absolute inset-0 bg-[#4B2C82] opacity-20 blur-xl rounded-full" />
                <LogOut className="w-10 h-10 text-[#4B2C82] relative z-10 translate-x-1" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-800 mb-2">Akhiri Sesi?</h3>
              <p className="text-gray-500 font-medium mb-8">
                Pastikan Anda telah menyimpan semua progres pendampingan dan tanggapan klien sebelum keluar.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleLogoutConfirm}
                  disabled={isLoggingOut}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-[#4B2C82] hover:bg-purple-900 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ya, Keluar"}
                </button>
                <button 
                  onClick={() => setIsLogoutModalOpen(false)}
                  disabled={isLoggingOut}
                  className="w-full py-4 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}