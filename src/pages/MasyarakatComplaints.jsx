import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Eye, Clock, MapPin, MessageSquare, AlertCircle, Search, Filter, CheckCircle, Star, Loader2, X, Calendar, Video, Send, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MasyarakatComplaints() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // PERBAIKAN 1: Tambahkan State untuk Filter
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Live Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Counselor Profile States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [counselorProfile, setCounselorProfile] = useState({ name: '', rating: 0, reviews: 0, loading: false });

  // Fetch Data Firestore
  useEffect(() => {
    const fetchComplaints = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "laporan"), where("user_id", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedData = [];

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          const reportId = docSnap.id;

          // 1. Cek konselor yang menangani
          let konselor_nama = null;
          let konselor_id = null;
          try {
            const konselorSnap = await getDocs(collection(db, `laporan/${reportId}/konselor`));
            if (!konselorSnap.empty) {
              konselor_id = konselorSnap.docs[0].data().konselor_id;
              const cSnap = await getDoc(doc(db, "users", konselor_id));
              if (cSnap.exists()) {
                konselor_nama = cSnap.data().nama;
              }
            }
          } catch (error) {
            console.error("Gagal load konselor:", error);
          }

          // 2. Cek riwayat tanggapan (logbook) dari konselor
          const responses = [];
          try {
            const tanggapanRef = collection(db, `laporan/${reportId}/tanggapan`);
            const qTanggapan = query(tanggapanRef, orderBy("created_at", "asc"));
            const tanggapanSnap = await getDocs(qTanggapan);
            
            for (const tDoc of tanggapanSnap.docs) {
              const tData = tDoc.data();
              let responderName = "Konselor";
              if (tData.konselor_id) {
                 const rSnap = await getDoc(doc(db, "users", tData.konselor_id));
                 if (rSnap.exists()) responderName = rSnap.data().nama;
              }
              responses.push({
                 id: tDoc.id,
                 message: tData.isi_tanggapan,
                 createdBy: responderName,
                 createdAt: tData.created_at ? tData.created_at.toDate() : new Date()
              });
            }
          } catch (error) {
            console.error("Gagal load tanggapan:", error);
          }

          // 3. Cek jadwal pertemuan
          const schedules = [];
          try {
            const jadwalRef = collection(db, `laporan/${reportId}/jadwal_pertemuan`);
            const qJadwal = query(jadwalRef, orderBy("created_at", "desc"));
            const jadwalSnap = await getDocs(qJadwal);
            
            for (const jDoc of jadwalSnap.docs) {
              schedules.push({
                id: jDoc.id,
                ...jDoc.data()
              });
            }
          } catch (error) {
            console.error("Gagal load jadwal:", error);
          }

          fetchedData.push({ 
            id: reportId, 
            ...data,
            konselor_id,
            konselor_nama,
            responses,
            schedules
          });
        }

        fetchedData.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
        setComplaints(fetchedData);
      } catch (error) {
        console.error("Gagal memuat data:", error);
        toast.error("Terjadi kesalahan saat memuat data pengaduan.");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchComplaints();
      else setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Listener untuk Live Chat
  useEffect(() => {
    let unsubscribe;
    if ((isDetailOpen || isChatOpen) && selectedComplaint && selectedComplaint.chat_status === 'active') {
      const chatRef = collection(db, `laporan/${selectedComplaint.id}/chat`);
      const q = query(chatRef, orderBy("created_at", "asc"));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().created_at?.toDate()
        }));
        setChatMessages(messages);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isDetailOpen, isChatOpen, selectedComplaint]);

  const handleRequestChat = async () => {
    if (!selectedComplaint) return;
    setIsChatLoading(true);
    try {
      const complaintRef = doc(db, 'laporan', selectedComplaint.id);
      await updateDoc(complaintRef, {
        chat_status: 'pending',
        chat_requested_at: serverTimestamp()
      });
      
      if (selectedComplaint.konselor_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.konselor_id,
          title: "Request Live Chat Masuk",
          message: `Klien untuk kasus "${selectedComplaint.judul}" meminta sesi Live Chat dengan Anda.`,
          type: "chat",
          link_to: "/konselor/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, chat_status: 'pending' } : c));
      setSelectedComplaint(prev => ({ ...prev, chat_status: 'pending' }));
      
      toast.success('Permintaan Live Chat telah dikirim ke konselor.');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengirim permintaan chat.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedComplaint) return;

    try {
      const chatRef = collection(db, `laporan/${selectedComplaint.id}/chat`);
      await addDoc(chatRef, {
        sender_id: auth.currentUser.uid,
        message: newMessage,
        created_at: serverTimestamp(),
        sender_role: 'masyarakat'
      });
      setNewMessage('');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengirim pesan.');
    }
  };

  const handleOpenCounselorProfile = async (konselorId, konselorNama) => {
    setIsProfileOpen(true);
    setCounselorProfile({ name: konselorNama, rating: 0, reviews: 0, loading: true });

    try {
      const laporanSnap = await getDocs(collection(db, "laporan"));
      let totalBintang = 0;
      let totalReview = 0;

      for (const lDoc of laporanSnap.docs) {
        const lData = lDoc.data();
        const kRef = collection(db, `laporan/${lDoc.id}/konselor`);
        const qKonselor = query(kRef, where("konselor_id", "==", konselorId));
        const kSnap = await getDocs(qKonselor);

        if (!kSnap.empty && lData.is_rated && lData.rating) {
          totalBintang += lData.rating;
          totalReview += 1;
        }
      }

      let avg = 0;
      if (totalReview > 0) {
        avg = (totalBintang / totalReview).toFixed(1);
      }

      setCounselorProfile({ name: konselorNama, rating: avg, reviews: totalReview, loading: false });
    } catch (error) {
      console.error("Gagal menarik rating konselor:", error);
      setCounselorProfile(prev => ({ ...prev, loading: false }));
    }
  };

  // --- PEMBARUAN KONFIGURASI STATUS BADGE ---
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'menunggu': 
        return { label: 'Menunggu Verifikasi', class: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: Clock };
      case 'diproses': 
        return { label: 'Diproses (Umum)', class: 'bg-purple-50 text-[#4B2C82] border-purple-100', icon: Search };
      case 'telaah kasus': 
        return { label: 'Telaah Kasus', class: 'bg-blue-50 text-blue-600 border-blue-100', icon: Search };
      case 'penjangkauan (home visit)': 
        return { label: 'Penjangkauan', class: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: MapPin };
      case 'pendampingan layanan': 
        return { label: 'Pendampingan', class: 'bg-teal-50 text-teal-600 border-teal-100', icon: User };
      case 'selesai': 
        return { label: 'Selesai', class: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle };
      case 'ditolak': 
        return { label: 'Ditolak', class: 'bg-red-50 text-red-600 border-red-100', icon: AlertCircle };
      default: 
        return { label: status || 'Unknown', class: 'bg-gray-50 text-gray-600 border-gray-100', icon: Clock };
    }
  };

  // PERBAIKAN 2: Logika Filtering Laporan
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.judul?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterStatus === 'Menunggu') matchesFilter = c.status_id?.toLowerCase() === 'menunggu';
    else if (filterStatus === 'Proses') matchesFilter = ['diproses', 'telaah kasus', 'penjangkauan (home visit)', 'pendampingan layanan'].includes(c.status_id?.toLowerCase());
    else if (filterStatus === 'Selesai') matchesFilter = c.status_id?.toLowerCase() === 'selesai';
    else if (filterStatus === 'Ditolak') matchesFilter = c.status_id?.toLowerCase() === 'ditolak';

    return matchesSearch && matchesFilter;
  });

  const openRatingDialog = (e, complaint) => {
    if (e) e.stopPropagation();
    setSelectedComplaint(complaint);
    setRating(complaint.rating || 0);
    setHoveredRating(0);
    setReviewText(complaint.ulasan || '');
    setIsRatingOpen(true);
  };

  const openDetailDialog = (complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailOpen(true);
  };

  const openChatDialog = (complaint) => {
    setSelectedComplaint(complaint);
    setIsChatOpen(true);
  };

  const openScheduleDialog = (complaint) => {
    setSelectedComplaint(complaint);
    setIsScheduleOpen(true);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error('Silakan berikan rating bintang terlebih dahulu');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const complaintRef = doc(db, 'laporan', selectedComplaint.id);
      await updateDoc(complaintRef, {
        rating: rating,
        ulasan: reviewText,
        is_rated: true,
        rated_at: new Date()
      });

      if (selectedComplaint.konselor_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.konselor_id,
          title: "Ulasan Baru Diterima! ⭐",
          message: `Klien memberikan rating ${rating} Bintang untuk pendampingan kasus "${selectedComplaint.judul}".`,
          type: "rating",
          link_to: "/konselor/history",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      setComplaints(prev => prev.map(c => 
        c.id === selectedComplaint.id ? { ...c, is_rated: true, rating: rating, ulasan: reviewText } : c
      ));
      setSelectedComplaint(prev => ({ ...prev, is_rated: true, rating: rating, ulasan: reviewText }));

      toast.success('Terima kasih! Ulasan Anda telah berhasil dikirim.');
      setIsRatingOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengirim ulasan.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderChatInterface = () => {
    return (
      <div className="bg-white border-2 border-purple-100 p-4 sm:p-5 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#4B2C82]" />
            <h4 className="text-sm font-black text-[#4B2C82] uppercase tracking-tighter">Live Chat Konselor</h4>
          </div>
          {selectedComplaint?.chat_status === 'active' && <span className="flex items-center gap-1 text-[10px] font-black text-green-500 animate-pulse">● AKTIF</span>}
        </div>

        {!selectedComplaint?.chat_status ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 mb-4">Anda dapat melakukan tanya jawab langsung dengan konselor terkait laporan ini.</p>
            <button onClick={handleRequestChat} disabled={isChatLoading} className="w-full bg-[#4B2C82] text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-900 transition-all flex items-center justify-center gap-2">
              {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Live Chat"}
            </button>
          </div>
        ) : selectedComplaint.chat_status === 'pending' ? (
          <div className="bg-yellow-50 p-4 rounded-2xl text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-yellow-800">Menunggu Persetujuan Konselor...</p>
          </div>
        ) : (
          <div className="flex flex-col h-[400px] border border-gray-100 rounded-2xl bg-gray-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {chatMessages.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-10 italic">Sesi chat telah dimulai. Sapa konselor Anda!</p>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender_id === auth.currentUser.uid ? 'bg-[#4B2C82] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}`}>
                    {msg.message}
                    <p className={`text-[8px] mt-1 opacity-50 ${msg.sender_id === auth.currentUser.uid ? 'text-right text-purple-200' : 'text-left text-gray-500'}`}>
                      {msg.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Tulis pesan..." className="flex-1 bg-gray-50 border-none rounded-xl px-4 text-xs focus:ring-1 focus:ring-[#4B2C82]" />
              <button type="submit" disabled={!newMessage.trim()} className="w-10 h-10 bg-[#4B2C82] text-white rounded-xl flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8 max-w-7xl mx-auto relative z-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-[#4B2C82] mb-2">Pengaduan Saya</h1>
            <p className="text-gray-500 font-medium">Pantau status penanganan laporan Anda secara real-time.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Cari pengaduan..." 
                className="w-full pl-10 pr-4 h-12 rounded-xl border border-purple-100 bg-white focus:outline-none focus:ring-2 focus:ring-[#4B2C82]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* PERBAIKAN 3: Tombol Filter Menjadi Fungsional */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`btn-modern h-12 px-4 flex items-center justify-center rounded-xl border transition-colors ${filterStatus !== 'Semua' ? 'bg-[#4B2C82] text-white border-[#4B2C82]' : 'bg-white text-[#4B2C82] border-purple-100 hover:bg-purple-50'} font-bold`}
              >
                <Filter className="w-4 h-4 mr-2" />
                {filterStatus}
              </button>

              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-purple-50 z-50 overflow-hidden"
                    >
                      <div className="p-2 flex flex-col gap-1">
                        {['Semua', 'Menunggu', 'Proses', 'Selesai', 'Ditolak'].map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              setFilterStatus(status);
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${filterStatus === status ? 'bg-purple-50 text-[#4B2C82]' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#4B2C82] animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Memuat data pengaduan Anda...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
              <div className="p-20 text-center">
                <div className="w-24 h-24 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Eye className="w-12 h-12 text-[#4B2C82] opacity-20" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">Tidak Ada Pengaduan</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                  {filterStatus !== 'Semua' || searchTerm !== '' 
                    ? "Tidak ada laporan yang sesuai dengan filter atau pencarian Anda." 
                    : "Semua pengaduan yang Anda buat akan muncul di sini. Klik tombol di bawah untuk mulai melaporkan."}
                </p>
                {filterStatus === 'Semua' && searchTerm === '' ? (
                  <button 
                    className="btn-modern bg-[#4B2C82] hover:bg-purple-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl transition-all"
                    onClick={() => navigate('/masyarakat/form')}
                  >
                    Buat Pengaduan Sekarang
                  </button>
                ) : (
                  <button 
                    className="btn-modern bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-all"
                    onClick={() => { setFilterStatus('Semua'); setSearchTerm(''); }}
                  >
                    Hapus Pencarian & Filter
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredComplaints.map((complaint, idx) => {
              const config = getStatusConfig(complaint.status_id);
              const StatusIcon = config.icon;
              
              // Logika Timeline Dinamis
              const cStatus = complaint.status_id?.toLowerCase() || '';
              const isAssigned = ['diproses', 'telaah kasus', 'penjangkauan (home visit)', 'pendampingan layanan', 'selesai'].includes(cStatus);
              const isDone = cStatus === 'selesai';
              const isRejected = cStatus === 'ditolak';

              return (
                <motion.div 
                  key={complaint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group border-l-4" style={{ borderLeftColor: '#4B2C82' }}>
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className={`${config.class} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5`}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                            <span className="text-xs font-bold text-gray-300">ID: {complaint.id.substring(0, 8).toUpperCase()}</span>
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#4B2C82] transition-colors">{complaint.judul}</h3>
                            <div className="flex flex-wrap gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                {complaint.tanggal_kejadian ? new Date(complaint.tanggal_kejadian).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                <MapPin className="w-3.5 h-3.5" />
                                {complaint.lokasi}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4B2C82]">
                                <span className="border border-purple-100 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50">{complaint.kategori_id}</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed font-medium">
                            {complaint.kronologi}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 md:pl-6 md:border-l md:border-purple-50 shrink-0">
                          {complaint.konselor_nama && (
                            <div 
                              onClick={() => handleOpenCounselorProfile(complaint.konselor_id, complaint.konselor_nama)}
                              className="flex items-center gap-3 pr-2 cursor-pointer group rounded-xl hover:bg-purple-50 p-2 transition-all"
                              title="Lihat Profil & Rating Konselor"
                            >
                              <div className="w-10 h-10 bg-purple-100 group-hover:bg-[#4B2C82] rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0">
                                <User className="w-5 h-5 text-[#4B2C82] group-hover:text-white transition-colors" />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-[#4B2C82] transition-colors">Konselor</p>
                                <p className="text-sm font-bold text-gray-800">{complaint.konselor_nama}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TIMELINE DINAMIS */}
                      {!isRejected && (
                        <div className="mt-6 pt-6 border-t border-purple-50 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                          {/* Tahap 1: Laporan Diterima (Selalu Aktif) */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">Laporan Diterima</span>
                          </div>
                          
                          <div className={`w-8 h-[2px] mt-3 shrink-0 ${isAssigned ? 'bg-green-500' : 'bg-gray-200'}`} />
                          
                          {/* Tahap 2: Verifikasi & Penugasan Konselor */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isAssigned ? 'bg-green-500' : 'bg-[#4B2C82]'}`}>
                              {isAssigned ? <CheckCircle className="w-3 h-3 text-white" /> : <Clock className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-[10px] font-bold ${isAssigned ? 'text-gray-500' : 'text-[#4B2C82]'}`}>Verifikasi Admin</span>
                          </div>
                          
                          <div className={`w-8 h-[2px] mt-3 shrink-0 ${isDone ? 'bg-green-500' : (isAssigned ? 'bg-[#4B2C82]' : 'bg-gray-200')}`} />
                          
                          {/* Tahap 3: Penanganan Konselor (Diproses/Telaah/Penjangkauan dll) */}
                          <div className={`flex items-center gap-2 shrink-0 ${!isAssigned ? 'opacity-40' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDone ? 'bg-green-500' : (isAssigned ? 'bg-[#4B2C82]' : 'bg-gray-200')}`}>
                              {isDone ? <CheckCircle className="w-3 h-3 text-white" /> : (isAssigned ? <ShieldCheck className="w-3 h-3 text-white" /> : null)}
                            </div>
                            <span className={`text-[10px] font-bold ${isDone ? 'text-gray-500' : (isAssigned ? 'text-[#4B2C82]' : 'text-gray-400')}`}>
                              {isAssigned && !isDone ? `Ditangani Konselor: ${config.label}` : 'Penanganan Konselor'}
                            </span>
                          </div>

                          <div className={`w-8 h-[2px] mt-3 shrink-0 ${isDone ? 'bg-green-500' : 'bg-gray-200'}`} />

                          {/* Tahap 4: Selesai */}
                          <div className={`flex items-center gap-2 shrink-0 ${!isDone ? 'opacity-40' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDone ? 'bg-green-500' : 'bg-gray-200'}`}>
                              {isDone ? <CheckCircle className="w-3 h-3 text-white" /> : null}
                            </div>
                            <span className={`text-[10px] font-bold ${isDone ? 'text-green-600' : 'text-gray-400'}`}>Selesai</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                        <button 
                          className="bg-white border-2 border-purple-100 hover:border-[#4B2C82] text-[#4B2C82] rounded-xl font-bold px-5 py-2.5 transition-all flex items-center text-sm"
                          onClick={() => openDetailDialog(complaint)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Buka Detail
                        </button>

                        {complaint.schedules?.length > 0 && (
                          <button 
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold px-5 py-2.5 transition-all flex items-center text-sm"
                            onClick={() => openScheduleDialog(complaint)}
                          >
                            <Calendar className="w-4 h-4 mr-2 text-blue-600" /> Lihat Jadwal
                          </button>
                        )}

                        {complaint.konselor_id && complaint.status_id !== 'selesai' && (
                          <button 
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold px-5 py-2.5 transition-all flex items-center text-sm relative"
                            onClick={() => openChatDialog(complaint)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2 text-pink-500" /> Live Chat
                            
                            {complaint.chat_status === 'active' && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                              </span>
                            )}
                          </button>
                        )}

                        {complaint.status_id === 'selesai' && complaint.konselor_nama && !complaint.is_rated && (
                          <button 
                            onClick={(e) => openRatingDialog(e, complaint)}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-xl font-bold px-5 py-2.5 transition-all flex items-center text-sm"
                          >
                            <Star className="w-4 h-4 mr-2 text-yellow-500" /> Beri Ulasan Konselor
                          </button>
                        )}
                        
                        {complaint.status_id === 'selesai' && complaint.is_rated && (
                          <div className="flex items-center gap-1 px-4 py-2.5 bg-yellow-50/80 border border-yellow-100 rounded-xl cursor-default" title="Ulasan yang Anda berikan">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= complaint.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-200 fill-transparent'}`} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL AREA --- */}

      {/* Modal Rating */}
      <AnimatePresence>
        {isRatingOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl text-center">
              <h2 className="text-xl font-black text-[#4B2C82] mb-4">Beri Ulasan Konselor</h2>
              <div className="flex justify-center gap-2 mb-6">
                {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHoveredRating(s)} onMouseLeave={() => setHoveredRating(0)}><Star className={`w-10 h-10 ${s <= (hoveredRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} /></button>)}
              </div>
              <textarea placeholder="Bagaimana pengalaman pendampingan Anda?" className="w-full p-4 bg-gray-50 rounded-2xl mb-4 h-32 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2C82]" value={reviewText} onChange={e => setReviewText(e.target.value)} />
              <div className="flex gap-2">
                <button className="flex-1 py-3 font-bold text-gray-500" onClick={() => setIsRatingOpen(false)}>Batal</button>
                <button className="flex-[2] py-3 font-bold text-white bg-[#4B2C82] rounded-xl" onClick={handleSubmitReview} disabled={isSubmittingReview}>{isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Kirim Ulasan"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Live Chat */}
      <AnimatePresence>
        {isChatOpen && selectedComplaint && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#4B2C82]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#4B2C82] leading-tight">Live Chat Konseling</h3>
                    <p className="text-xs text-gray-500 font-medium">Konselor: {selectedComplaint.konselor_nama}</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 bg-white">
                {renderChatInterface()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Jadwal Pertemuan */}
      <AnimatePresence>
        {isScheduleOpen && selectedComplaint && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-lg font-black text-[#4B2C82]">Jadwal Pertemuan Anda</h3>
                <button onClick={() => setIsScheduleOpen(false)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50">
                <div className="space-y-4">
                  {selectedComplaint.schedules.map((s) => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-bold text-indigo-900">{s.judul_pertemuan}</p>
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Tipe: {s.tipe}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {s.status === 'completed' ? 'Selesai' : 'Terjadwal'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                        <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium"><Calendar className="w-4 h-4" /><span>{s.tanggal}</span></div>
                        <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium"><Clock className="w-4 h-4" /><span>{s.waktu} WITA</span></div>
                        <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium sm:col-span-2">{s.tipe === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}<span>{s.lokasi}</span></div>
                      </div>
                      {s.catatan && (
                        <div className="mt-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-50">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Catatan Tambahan:</p>
                          <p className="text-xs text-indigo-800">{s.catatan}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detail Laporan Lengkap */}
      <AnimatePresence>
        {isDetailOpen && selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]">
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0 z-10">
                <h3 className="text-lg font-black text-[#4B2C82]">Detail Laporan Anda</h3>
                <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-gray-200/50 hover:bg-red-50 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
                <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Judul Laporan</h4><p className="text-xl font-black text-gray-800">{selectedComplaint.judul}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100"><h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Kategori</h4><p className="font-bold text-[#4B2C82]">{selectedComplaint.kategori_id}</p></div>
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Status Saat Ini</h4>
                    <div className="mt-1">
                      {(() => { const conf = getStatusConfig(selectedComplaint.status_id); const Icon = conf.icon; return (<span className={`${conf.class} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit`}><Icon className="w-3 h-3" />{conf.label}</span>);})()}
                    </div>
                  </div>
                </div>
                <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lokasi Kejadian</h4><p className="text-sm font-medium text-gray-700">{selectedComplaint.lokasi}</p></div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kronologi Lengkap</h4>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{selectedComplaint.kronologi}</div>
                </div>

                {selectedComplaint.konselor_id && selectedComplaint.status_id !== 'selesai' && (
                  renderChatInterface()
                )}

                {selectedComplaint.schedules && selectedComplaint.schedules.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Jadwal Pertemuan / Konseling</h4>
                    <div className="space-y-3">
                      {selectedComplaint.schedules.map((schedule) => (
                        <div key={schedule.id} className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                          <div className="flex justify-between items-start mb-3">
                            <div><p className="text-sm font-bold text-indigo-900">{schedule.judul_pertemuan}</p><span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Tipe: {schedule.tipe}</span></div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${schedule.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{schedule.status === 'completed' ? 'Selesai' : 'Terjadwal'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                            <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium"><Calendar className="w-4 h-4" /><span>{schedule.tanggal}</span></div>
                            <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium"><Clock className="w-4 h-4" /><span>{schedule.waktu} WITA</span></div>
                            <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium sm:col-span-2">{schedule.tipe === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}<span>{schedule.lokasi}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedComplaint.responses && selectedComplaint.responses.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Catatan / Arahan Konselor</h4>
                    <div className="space-y-3">
                      {selectedComplaint.responses.map((response) => (
                        <div key={response.id} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                          <p className="text-sm text-gray-700 leading-relaxed mb-2">{response.message}</p>
                          <p className="text-[10px] font-bold text-blue-600">Oleh: {response.createdBy} <span className="text-gray-400 mx-1">•</span> {response.createdAt.toLocaleString('id-ID')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedComplaint.konselor_nama && (
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Konselor Pendamping</h4>
                    <div 
                      onClick={() => { setIsDetailOpen(false); setTimeout(() => handleOpenCounselorProfile(selectedComplaint.konselor_id, selectedComplaint.konselor_nama), 300); }}
                      className="bg-purple-50 hover:bg-purple-100 border border-purple-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-colors"
                    >
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <User className="w-6 h-6 text-[#4B2C82]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800">{selectedComplaint.konselor_nama}</p>
                        <p className="text-xs font-medium text-gray-500">Ketuk untuk melihat rating konselor.</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComplaint.status_id === 'selesai' && selectedComplaint.konselor_nama && (
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Penilaian Layanan DP3A</h4>
                    {selectedComplaint.is_rated ? (
                      <div className="bg-yellow-50 border border-yellow-100 p-5 rounded-2xl">
                        <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-yellow-800">Ulasan Anda</p><div className="flex items-center gap-1 text-yellow-500">{[1, 2, 3, 4, 5].map(star => (<Star key={star} className={`w-4 h-4 ${star <= selectedComplaint.rating ? 'fill-yellow-500' : 'text-gray-300 fill-transparent'}`} />))}</div></div>
                        <p className="text-sm text-gray-700 italic bg-white p-3 rounded-lg border border-yellow-100">"{selectedComplaint.ulasan || "Tidak ada ulasan tertulis."}"</p>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-purple-50 to-gray-50 border border-purple-100 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3"><Star className="w-6 h-6 text-yellow-400 fill-yellow-400" /></div>
                        <p className="text-base font-black text-[#4B2C82] mb-1">Bagaimana kinerja konselor kami?</p>
                        <button onClick={(e) => { setIsDetailOpen(false); setTimeout(() => openRatingDialog(e, selectedComplaint), 300); }} className="bg-[#4B2C82] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-purple-900 transition-colors w-full mt-4">Beri Ulasan Sekarang</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Profil Konselor */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="bg-[#4B2C82] h-24 w-full relative">
                 <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1.5 rounded-full text-white transition-colors">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="flex justify-center -mt-12 relative z-10">
                <div className="w-24 h-24 bg-white rounded-full p-1.5 shadow-lg">
                  <div className="w-full h-full bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-[#4B2C82]" />
                  </div>
                </div>
              </div>
              <div className="text-center p-6 pt-3">
                <h3 className="text-xl font-black text-gray-800">{counselorProfile.name}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 mb-5">Konselor Pendamping</p>
                {counselorProfile.loading ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <Loader2 className="w-6 h-6 animate-spin text-[#4B2C82] mb-2" />
                    <p className="text-xs text-gray-500 font-medium">Memuat rating performa...</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Penilaian Masyarakat</p>
                    {counselorProfile.reviews > 0 ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-end gap-1 mb-2">
                          <span className="text-4xl font-black text-yellow-500 leading-none">{counselorProfile.rating}</span>
                          <span className="text-sm font-bold text-yellow-500/70 mb-1">/ 5</span>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                           {[1,2,3,4,5].map(s => <Star key={s} className={`w-5 h-5 ${s <= Math.round(counselorProfile.rating) ? 'fill-yellow-500 text-yellow-500' : 'fill-gray-200 text-gray-200'}`} />)}
                        </div>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">Berdasarkan {counselorProfile.reviews} ulasan</span>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-500">Belum ada penilaian.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}