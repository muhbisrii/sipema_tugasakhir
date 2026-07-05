import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { MessageSquare, Phone, CheckCircle, Loader2, X, AlertTriangle, User, Clock, Eye, Calendar, Send, Info, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function KonselorComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal & Action States
  const [activeModal, setActiveModal] = useState(null); // 'detail' | 'logbook' | 'status' | 'jadwal' | 'chat' | null
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // State Konfirmasi Khusus Selesai
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);

  // State untuk form Buat Jadwal
  const [scheduleData, setScheduleData] = useState({
    title: '', date: '', time: '', location: '', type: 'offline', notes: ''
  });

  // Filter State (Hanya Sedang Ditangani & Selesai)
  const [filterTab, setFilterTab] = useState('saya'); // 'saya' | 'selesai'

  // Live Chat States 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // State untuk fungsi Typing Indicator
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeoutId, setTypingTimeoutId] = useState(null);
  
  // State untuk mendeteksi apakah klien sedang mengetik
  const [isClientTyping, setIsClientTyping] = useState(false);

  // Auto-scroll referensi
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeModal === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, isClientTyping, activeModal]);

  // Bersihkan timeout saat komponen unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutId) clearTimeout(typingTimeoutId);
    };
  }, [typingTimeoutId]);

  // Fungsi hitung umur
  const calculateAge = (birthDateData) => {
    if (!birthDateData) return '-';
    try {
      let date;
      if (typeof birthDateData === 'string') {
        date = new Date(birthDateData);
      } else if (typeof birthDateData.toDate === 'function') {
        date = birthDateData.toDate();
      } else {
        return '-';
      }

      if (isNaN(date.getTime())) return '-';
      
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const m = today.getMonth() - date.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      return age;
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return '-';
    }
  };

  // Fetch Data Laporan (DIOPTIMASI UNTUK KECEPATAN TINGGI)
  useEffect(() => {
    const fetchComplaintsData = async () => {
      if (!auth.currentUser) return;
      const currentUserId = auth.currentUser.uid;
      
      setLoading(true);
      try {
        // A. Tarik memori user (sekali saja) agar tidak N+1
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap = {};
        usersSnap.forEach(doc => {
          usersMap[doc.id] = doc.data();
        });

        // B. Tarik laporan
        const laporanSnap = await getDocs(collection(db, "laporan"));
        const fetchedData = [];

        for (const docSnap of laporanSnap.docs) {
          const reportId = docSnap.id;
          const data = docSnap.data();
          
          let isAssignedToMe = false;
          let assignedCounselorName = null;
          
          // Mengecek penugasan konselor
          if (data.konselor_id && data.konselor_id === currentUserId) {
             isAssignedToMe = true;
             assignedCounselorName = usersMap[currentUserId]?.nama || 'Anda';
          } else {
            try {
              const konselorSnap = await getDocs(collection(db, `laporan/${reportId}/konselor`));
              if (!konselorSnap.empty) {
                const assignmentData = konselorSnap.docs[0].data();
                if (assignmentData.konselor_id === currentUserId) {
                  isAssignedToMe = true;
                  assignedCounselorName = usersMap[currentUserId]?.nama || 'Anda';
                }
              }
            } catch (e) { console.error("Gagal load konselor", e); }
          }

          // HANYA AMBIL JIKA DITUGASKAN KE KONSELOR INI
          if (isAssignedToMe) {
            let reporterName = "Pengguna Anonim";
            let reporterPhone = "-";
            let reporterEdu = "-";
            let reporterAge = "-";

            if (data.user_id && usersMap[data.user_id]) {
              const uData = usersMap[data.user_id];
              reporterName = uData.nama || "Pengguna Anonim";
              reporterPhone = uData.no_hp || uData.phone || "-";
              reporterEdu = uData.tingkat_pendidikan || uData.pendidikan || "-";
              reporterAge = calculateAge(uData.tanggal_lahir);
            }

            const responses = [];
            try {
              const tanggapanRef = collection(db, `laporan/${reportId}/tanggapan`);
              const q = query(tanggapanRef, orderBy("created_at", "asc"));
              const tanggapanSnap = await getDocs(q);
              
              for (const tDoc of tanggapanSnap.docs) {
                const tData = tDoc.data();
                let responderName = "Konselor";
                if (tData.konselor_id && usersMap[tData.konselor_id]) {
                  responderName = usersMap[tData.konselor_id].nama;
                }
                responses.push({
                  id: tDoc.id,
                  message: tData.isi_tanggapan,
                  createdBy: responderName,
                  createdAt: tData.created_at ? tData.created_at.toDate() : new Date()
                });
              }
            } catch (e) { console.error("Gagal load tanggapan", e); }

            fetchedData.push({
              id: reportId,
              ...data,
              reporterName,
              reporterPhone,
              reporterEdu,
              reporterAge,
              assignedCounselorId: currentUserId,
              assignedCounselorName,
              responses,
              dateFormatted: data.created_at ? data.created_at.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
            });
          }
        }

        fetchedData.sort((a, b) => {
           const aTime = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at).getTime();
           const bTime = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at).getTime();
           return bTime - aTime;
        });
        setComplaints(fetchedData);
      } catch (error) {
        console.error("Error fetching complaints:", error);
        toast.error("Gagal memuat data laporan.");
      } finally {
        setLoading(false);
      }
    };

    fetchComplaintsData();
  }, [refreshTrigger]);

  const currentUserId = auth.currentUser?.uid;
  const complaintId = selectedComplaint?.id;

  // Real-time Listener untuk Live Chat & Typing Indicator (PERBAIKAN INFINITE LOOP)
  useEffect(() => {
    let unsubscribeChat;
    let unsubscribeTyping;
    
    // Bergantung pada complaintId, bukan seluruh object selectedComplaint
    if ((activeModal === 'detail' || activeModal === 'chat') && complaintId) {
      // Listener untuk pesan chat
      const chatRef = collection(db, `laporan/${complaintId}/chat`);
      const q = query(chatRef, orderBy("created_at", "asc"));
      
      unsubscribeChat = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().created_at?.toDate()
        }));
        setChatMessages(messages);
      });

      // Listener untuk mendeteksi apakah klien sedang mengetik
      const reportRef = doc(db, 'laporan', complaintId);
      unsubscribeTyping = onSnapshot(reportRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsClientTyping(data.is_masyarakat_typing || false);
          
          setSelectedComplaint(prev => {
            if (!prev || prev.id !== complaintId) return prev;
            return {
              ...prev,
              ...data,
            };
          });
        }
      });
    }

    return () => {
      if (unsubscribeChat) unsubscribeChat();
      if (unsubscribeTyping) unsubscribeTyping();
    };
  }, [activeModal, complaintId]); // <- Diperbaiki agar tidak render ulang terus menerus

  // Filter Data (Hanya membedakan yang Sedang Ditangani dan Selesai)
  const displayedComplaints = complaints.filter(c => {
    if (filterTab === 'saya') return c.status_id !== 'selesai';
    if (filterTab === 'selesai') return c.status_id === 'selesai';
    return true; 
  });

  // UI Helper
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'menunggu':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">MENUNGGU</span>;
      case 'diproses':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-purple-100 text-[#4B2C82] border border-purple-200">DIPROSES</span>;
      case 'telaah kasus':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-blue-100 text-blue-800 border border-blue-200">TELAAH KASUS</span>;
      case 'penjangkauan (home visit)':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">PENJANGKAUAN</span>;
      case 'pendampingan layanan':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-teal-100 text-teal-800 border border-teal-200">PENDAMPINGAN</span>;
      case 'selesai':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-800 border border-green-200">SELESAI / TERMINASI</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-800 border border-gray-200">{status || 'UNKNOWN'}</span>;
    }
  };

  // HANDLERS FIREBASE
  const handleSendResponse = async () => {
    if (!responseText.trim() || !selectedComplaint) return;
    setActionLoading(true);
    try {
      const tanggapanRef = collection(db, `laporan/${selectedComplaint.id}/tanggapan`);
      await addDoc(tanggapanRef, {
        konselor_id: currentUserId,
        isi_tanggapan: responseText,
        created_at: serverTimestamp()
      });

      if (selectedComplaint.user_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.user_id,
          title: "Catatan Penanganan Baru",
          message: `Konselor telah menambahkan catatan/arahan baru pada laporan "${selectedComplaint.judul}".`,
          type: "tanggapan",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Catatan penanganan berhasil disimpan.');
      closeModal();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal mengirim tanggapan:", error);
      toast.error('Gagal menyimpan catatan.');
    } finally {
      setActionLoading(false);
    }
  };

  const initiateUpdateStatus = () => {
    if (!newStatus || !selectedComplaint) return;
    if (newStatus === 'selesai') {
      setIsConfirmFinishOpen(true);
    } else {
      handleUpdateStatus();
    }
  };

  const handleUpdateStatus = async () => {
    setActionLoading(true);
    try {
      const laporanRef = doc(db, 'laporan', selectedComplaint.id);
      await updateDoc(laporanRef, {
        status_id: newStatus,
        updated_at: serverTimestamp()
      });

      const riwayatRef = collection(db, `laporan/${selectedComplaint.id}/riwayat_status`);
      await addDoc(riwayatRef, {
        status_id: newStatus,
        diubah_oleh: currentUserId,
        changed_at: serverTimestamp()
      });

      if (selectedComplaint.user_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.user_id,
          title: "Status Laporan Diperbarui",
          message: `Laporan Anda "${selectedComplaint.judul}" sekarang berstatus: ${newStatus.toUpperCase()}.`,
          type: "system",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Status kasus berhasil diperbarui.');
      setIsConfirmFinishOpen(false);
      closeModal();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal update status:", error);
      toast.error('Gagal memperbarui status kasus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleData.title || !scheduleData.date || !scheduleData.time || !scheduleData.location) {
      toast.error('Mohon lengkapi semua data wajib!');
      return;
    }
    setActionLoading(true);
    try {
      const jadwalRef = collection(db, `laporan/${selectedComplaint.id}/jadwal_pertemuan`);
      await addDoc(jadwalRef, {
        judul_pertemuan: scheduleData.title,
        tanggal: scheduleData.date,
        waktu: scheduleData.time,
        tipe: scheduleData.type,
        lokasi: scheduleData.location,
        catatan: scheduleData.notes,
        status: 'scheduled',
        dibuat_oleh: currentUserId,
        created_at: serverTimestamp()
      });

      if (selectedComplaint.user_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.user_id,
          title: "Jadwal Pertemuan Dibuat",
          message: `Konselor telah menjadwalkan "${scheduleData.title}" pada ${scheduleData.date} pukul ${scheduleData.time}.`,
          type: "jadwal",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Jadwal pertemuan berhasil ditambahkan!');
      closeModal();
    } catch (error) {
      console.error("Gagal simpan jadwal:", error);
      toast.error('Gagal menyimpan jadwal pertemuan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartOrApproveChat = async () => {
    if (!selectedComplaint) return;
    setIsChatLoading(true);
    try {
      const reportRef = doc(db, 'laporan', selectedComplaint.id);
      await updateDoc(reportRef, {
        chat_status: 'active',
        chat_started_at: serverTimestamp()
      });
      
      setSelectedComplaint(prev => ({ ...prev, chat_status: 'active' }));
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, chat_status: 'active' } : c));
      
      if (selectedComplaint.user_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.user_id,
          title: "Sesi Live Chat Dimulai",
          message: `Konselor Anda telah membuka ruang obrolan. Silakan mulai Live Chat sekarang.`,
          type: "chat",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Sesi Live Chat berhasil diaktifkan.');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengaktifkan chat.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!selectedComplaint || selectedComplaint.status_id === 'selesai') return;

    if (!isTyping) {
      setIsTyping(true);
      const reportRef = doc(db, 'laporan', selectedComplaint.id);
      updateDoc(reportRef, { is_konselor_typing: true }).catch(console.error);
    }

    if (typingTimeoutId) clearTimeout(typingTimeoutId);

    const timeout = setTimeout(() => {
      setIsTyping(false);
      const reportRef = doc(db, 'laporan', selectedComplaint.id);
      updateDoc(reportRef, { is_konselor_typing: false }).catch(console.error);
    }, 2000);
    
    setTypingTimeoutId(timeout);
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
        sender_role: 'konselor'
      });
      setNewMessage('');
      
      if (typingTimeoutId) clearTimeout(typingTimeoutId);
      setIsTyping(false);
      await updateDoc(doc(db, 'laporan', selectedComplaint.id), { is_konselor_typing: false });
      
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengirim pesan.');
    }
  };

  const openModal = (type, complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status_id || 'menunggu');
    setActiveModal(type);
  };

  const closeModal = () => {
    if (activeModal === 'chat' && selectedComplaint) {
      if (typingTimeoutId) clearTimeout(typingTimeoutId);
      setIsTyping(false);
      updateDoc(doc(db, 'laporan', selectedComplaint.id), { is_konselor_typing: false }).catch(console.error);
    }

    setActiveModal(null);
    setSelectedComplaint(null);
    setResponseText('');
    setScheduleData({ title: '', date: '', time: '', location: '', type: 'offline', notes: '' });
  };

  return (
    <>
      <div className="space-y-6 pb-10 animate-fade-in">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-2xl shadow-lg border-0 overflow-hidden relative p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2">Penanganan Kasus</h1>
            <p className="text-purple-200 font-medium">
              Kelola dan pantau seluruh laporan yang ditugaskan kepada Anda oleh Admin secara realtime.
            </p>
          </div>
        </div>

        {/* Tabs Filter */}
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <button 
            onClick={() => setFilterTab('saya')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterTab === 'saya' ? 'bg-[#4B2C82] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Sedang Saya Tangani
          </button>
          <button 
            onClick={() => setFilterTab('selesai')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterTab === 'selesai' ? 'bg-[#4B2C82] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Kasus Selesai (Arsip)
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 text-[#4B2C82] animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Memuat data pengaduan...</p>
          </div>
        ) : displayedComplaints.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-1">Tidak ada laporan</h3>
            <p className="text-gray-500">Belum ada tugas kasus untuk kategori ini.</p>
          </div>
        ) : (
          /* Complaints List */
          <div className="space-y-6">
            {displayedComplaints.map((complaint) => {
              const isCompleted = complaint.status_id === 'selesai';

              return (
                <div 
                  key={complaint.id} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-50">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h2 className="text-xl font-black text-gray-800">{complaint.judul}</h2>
                          {getStatusBadge(complaint.status_id)}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1.5 font-medium"><User className="w-4 h-4 text-[#4B2C82]" /> {complaint.reporterName}</span>
                          <span className="flex items-center gap-1.5 font-medium"><Phone className="w-4 h-4 text-[#4B2C82]" /> {complaint.reporterPhone || "Tidak ada data"}</span>
                          <span className="flex items-center gap-1.5 font-medium"><Clock className="w-4 h-4 text-[#4B2C82]" /> {complaint.dateFormatted}</span>
                        </div>
                        
                        <span className="bg-purple-50 text-[#4B2C82] border border-purple-100 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest inline-block">
                          {complaint.kategori_id}
                        </span>
                      </div>

                      <button 
                        onClick={() => openModal('detail', complaint)}
                        className="bg-[#4B2C82] hover:bg-purple-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 h-fit shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                        Tinjau Detail
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4 bg-gray-50/30">
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-purple-900">Kasus Ditugaskan Kepada Anda</p>
                        <p className="text-xs text-purple-700 mt-0.5">
                          {isCompleted ? 'Kasus ini telah selesai ditangani dan diarsipkan.' : 'Gunakan tombol di bawah untuk mencatat hasil penanganan atau mengupdate status.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!isCompleted && (
                        <>
                          <button 
                            onClick={() => openModal('logbook', complaint)}
                            className="bg-white border-2 border-[#4B2C82] text-[#4B2C82] hover:bg-purple-50 px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            Catatan Penanganan (Logbook)
                          </button>
                          
                          <button 
                            onClick={() => openModal('status', complaint)}
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Update Status
                          </button>

                          <button 
                            onClick={() => openModal('jadwal', complaint)}
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Buat Jadwal
                          </button>
                        </>
                      )}

                      <button 
                        onClick={() => openModal('chat', complaint)}
                        className={`border rounded-xl text-sm font-bold px-5 py-2.5 transition-all duration-200 flex items-center gap-2 relative ${
                          isCompleted 
                            ? 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:scale-105 active:scale-95'
                        }`}
                      >
                        <MessageSquare className={`w-4 h-4 ${isCompleted ? 'text-gray-500' : 'text-pink-500'}`} />
                        {isCompleted ? 'Riwayat Chat' : 'Live Chat'}
                        
                        {complaint.chat_status === 'active' && !isCompleted && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- SEMUA MODAL DITEMPATKAN DI LUAR DIV UTAMA --- */}

      {/* MODAL 1: DETAIL KASUS */}
      <AnimatePresence>
        {activeModal === 'detail' && selectedComplaint && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-2xl rounded-3xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
                <div>
                  <h2 className="text-xl font-black text-gray-800">Detail Laporan</h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Tinjau detail laporan dan riwayat tindakan.</p>
                </div>
                <button onClick={closeModal} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full hover:scale-110 active:scale-95 transition-all duration-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-gray-800">{selectedComplaint.judul}</h3>
                  <div className="w-fit">{getStatusBadge(selectedComplaint.status_id)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 text-sm">
                  <div><p className="text-gray-500 mb-1">Pelapor:</p><p className="font-bold text-gray-900">{selectedComplaint.reporterName}</p></div>
                  <div><p className="text-gray-500 mb-1">No. Handphone:</p><p className="font-bold text-gray-900">{selectedComplaint.reporterPhone || "-"}</p></div>
                  <div><p className="text-gray-500 mb-1">Tanggal:</p><p className="font-bold text-gray-900">{selectedComplaint.dateFormatted}</p></div>
                  <div><p className="text-gray-500 mb-1">Lokasi:</p><p className="font-bold text-gray-900">{selectedComplaint.lokasi || "-"}</p></div>
                  <div><p className="text-gray-500 mb-1">Kategori:</p><p className="font-bold text-gray-900">{selectedComplaint.kategori_id || "-"}</p></div>
                  <div><p className="text-gray-500 mb-1">Usia Korban:</p><p className="font-bold text-gray-900">{selectedComplaint.reporterAge !== '-' ? `${selectedComplaint.reporterAge} tahun` : "-"}</p></div>
                  <div><p className="text-gray-500 mb-1">Pendidikan:</p><p className="font-bold text-gray-900">{selectedComplaint.reporterEdu || "-"}</p></div>
                </div>

                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                  <p className="text-sm font-bold text-gray-800 mb-2">Kronologi Kejadian:</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedComplaint.kronologi}</p>
                </div>

                {selectedComplaint.responses && selectedComplaint.responses.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-800 mb-3">Catatan Penanganan / Logbook:</p>
                    <div className="space-y-3">
                      {selectedComplaint.responses.map((response) => (
                        <div key={response.id} className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                          <p className="text-sm text-gray-800 mb-2 leading-relaxed">{response.message}</p>
                          <p className="text-xs font-bold text-[#4B2C82]">
                            {response.createdBy} <span className="text-gray-400 font-normal ml-1">• {response.createdAt.toLocaleString('id-ID')}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: LOGBOOK (CATATAN PENANGANAN) */}
      <AnimatePresence>
        {activeModal === 'logbook' && selectedComplaint && selectedComplaint.status_id !== 'selesai' && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-[#4B2C82]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#4B2C82]">Catatan Penanganan</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Isi logbook tindakan yang telah dilakukan.</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full hover:scale-110 active:scale-95 transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Ceritakan detail penanganan (Misal: Melakukan home visit bersama aparat desa, atau Memberikan sesi konseling tahap 1...)"
                  className="w-full p-4 h-32 resize-none rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm leading-relaxed"
                />
                <button 
                  onClick={handleSendResponse}
                  disabled={actionLoading || !responseText.trim()}
                  className="w-full h-14 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan ke Logbook"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: UPDATE STATUS */}
      <AnimatePresence>
        {activeModal === 'status' && selectedComplaint && selectedComplaint.status_id !== 'selesai' && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <h3 className="text-lg font-black text-[#4B2C82]">Update Status Kasus</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full hover:scale-110 active:scale-95 transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
                <div className="bg-orange-50 text-orange-800 p-4 rounded-2xl flex gap-3 text-sm font-medium border border-orange-100"><AlertTriangle className="w-5 h-5 shrink-0" /><p>Memperbarui status akan mencatat riwayat perubahan dan terlihat langsung oleh pelapor.</p></div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pilih Tahapan Penanganan</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all font-bold text-gray-700"
                  >
                    <option value="diproses">Diproses (Umum)</option>
                    <option value="telaah kasus">Telaah Kasus</option>
                    <option value="penjangkauan (home visit)">Penjangkauan (Home Visit)</option>
                    <option value="pendampingan layanan">Pendampingan Layanan (Medis/Hukum)</option>
                    <option value="selesai">Selesai / Terminasi</option>
                  </select>
                </div>

                <button 
                  onClick={initiateUpdateStatus}
                  disabled={actionLoading || newStatus === selectedComplaint.status_id}
                  className="w-full h-14 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-70 flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Status"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUB-MODAL: KONFIRMASI STATUS SELESAI */}
      <AnimatePresence>
        {isConfirmFinishOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative"
            >
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-100">
                <Info className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">Terminasi Kasus?</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Tindakan ini <span className="font-bold text-orange-600">tidak dapat dibatalkan</span>. Kasus yang telah selesai akan dipindahkan ke Arsip dan Anda tidak bisa lagi menambahkan logbook atau melakukan Live Chat.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsConfirmFinishOpen(false)}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg transition-colors disabled:opacity-70 flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ya, Selesaikan"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: BUAT JADWAL PERTEMUAN */}
      <AnimatePresence>
        {activeModal === 'jadwal' && selectedComplaint && selectedComplaint.status_id !== 'selesai' && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="text-lg font-black text-[#4B2C82]">Buat Jadwal Pertemuan</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Jadwalkan konseling untuk: {selectedComplaint.reporterName}</p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full hover:scale-110 active:scale-95 transition-all duration-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agenda Pertemuan *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Konseling Lanjutan"
                      value={scheduleData.title}
                      onChange={(e) => setScheduleData({...scheduleData, title: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lokasi / Tautan *</label>
                    <input
                      type="text"
                      placeholder="Kantor DP3A / Link Zoom"
                      value={scheduleData.location}
                      onChange={(e) => setScheduleData({...scheduleData, location: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipe *</label>
                    <select 
                      value={scheduleData.type}
                      onChange={(e) => setScheduleData({...scheduleData, type: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                    >
                      <option value="offline">Offline</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tanggal *</label>
                    <input
                      type="date"
                      value={scheduleData.date}
                      onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Waktu *</label>
                    <input
                      type="time"
                      value={scheduleData.time}
                      onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                  <textarea
                    placeholder="Dokumen yang harus dibawa, dll."
                    value={scheduleData.notes}
                    onChange={(e) => setScheduleData({...scheduleData, notes: e.target.value})}
                    className="w-full p-4 h-24 resize-none rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="p-5 sm:p-6 border-t border-gray-100 bg-white shrink-0 flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 h-12 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-200"
                >
                  Batal
                </button>
                <button 
                  onClick={handleCreateSchedule}
                  disabled={actionLoading}
                  className="flex-1 h-12 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Jadwal"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: LIVE CHAT */}
      <AnimatePresence>
        {activeModal === 'chat' && selectedComplaint && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedComplaint.status_id === 'selesai' ? 'bg-gray-200' : 'bg-purple-100'}`}>
                    <MessageSquare className={`w-5 h-5 ${selectedComplaint.status_id === 'selesai' ? 'text-gray-500' : 'text-[#4B2C82]'}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black leading-tight ${selectedComplaint.status_id === 'selesai' ? 'text-gray-700' : 'text-[#4B2C82]'}`}>
                      {selectedComplaint.status_id === 'selesai' ? 'Riwayat Chat Klien' : 'Live Chat Klien'}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedComplaint.reporterName}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full hover:scale-110 active:scale-95 transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 bg-gray-50">
                {(!selectedComplaint.chat_status && selectedComplaint.status_id !== 'selesai') ? (
                  <div className="text-center py-10 px-6 m-auto">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-6">Belum ada sesi chat dengan klien ini. Anda bisa memulainya sekarang untuk memberikan konsultasi online.</p>
                    <button 
                      onClick={handleStartOrApproveChat} 
                      disabled={isChatLoading} 
                      className="bg-[#4B2C82] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-purple-900 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center mx-auto gap-2 shadow-md"
                    >
                      {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mulai Live Chat"}
                    </button>
                  </div>
                ) : (selectedComplaint.chat_status === 'pending' && selectedComplaint.status_id !== 'selesai') ? (
                  <div className="text-center py-10 px-6 m-auto">
                    <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-bounce" />
                    <h4 className="text-lg font-bold text-yellow-800 mb-2">Permintaan Chat Masuk</h4>
                    <p className="text-sm text-yellow-600 mb-6">Klien sedang menunggu Anda untuk memulai sesi obrolan langsung.</p>
                    <button 
                      onClick={handleStartOrApproveChat} 
                      disabled={isChatLoading} 
                      className="bg-[#4B2C82] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-purple-900 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center mx-auto gap-2 shadow-md"
                    >
                      {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Terima Permintaan Chat"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col h-[400px] border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 relative">
                      {chatMessages.length === 0 && (
                        <p className="text-center text-xs text-gray-400 mt-10 italic">Belum ada percakapan.</p>
                      )}
                      
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_id === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender_id === auth.currentUser.uid ? 'bg-[#4B2C82] text-white rounded-tr-none shadow-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'}`}>
                            {msg.message}
                            <p className={`text-[8px] mt-1 opacity-50 ${msg.sender_id === auth.currentUser.uid ? 'text-right text-purple-200' : 'text-left text-gray-500'}`}>
                              {msg.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Animasi Pop-up Klien Sedang Mengetik */}
                      <AnimatePresence>
                        {isClientTyping && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className="flex items-end gap-2 mt-2"
                          >
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 border border-gray-200">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm flex items-center gap-1 w-fit h-[36px]">
                              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Dummy div untuk auto-scroll point */}
                      <div ref={messagesEndRef} className="h-1" />
                    </div>

                    {selectedComplaint.status_id === 'selesai' ? (
                      <div className="p-4 bg-gray-100 border-t border-gray-200 text-center shrink-0">
                        <p className="text-xs font-bold text-gray-500">Sesi obrolan telah berakhir karena laporan berstatus Selesai/Terminasi.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                        <input 
                          type="text" 
                          value={newMessage} 
                          onChange={handleTyping} 
                          placeholder="Balas pesan klien..." 
                          className="flex-1 bg-gray-50 border-none rounded-xl px-4 text-xs focus:ring-1 focus:ring-[#4B2C82] transition-all" 
                        />
                        <button 
                          type="submit" 
                          disabled={!newMessage.trim()} 
                          className="w-10 h-10 bg-[#4B2C82] text-white rounded-xl flex items-center justify-center hover:bg-purple-900 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
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