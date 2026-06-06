import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Calendar, Clock, MapPin, Video, User, Plus, Trash2, CheckCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function KonselorSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [myCases, setMyCases] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    laporanId: '',
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'offline',
    notes: ''
  });

  // Fetch Data Kasus & Jadwal (Hanya untuk konselor yang sedang login)
  useEffect(() => {
    const fetchSchedulesAndCases = async () => {
      if (!auth.currentUser) return;
      const currentUserId = auth.currentUser.uid;
      setLoading(true);

      try {
        const laporanSnap = await getDocs(collection(db, 'laporan'));
        let fetchedCases = [];
        let fetchedSchedules = [];

        for (const docSnap of laporanSnap.docs) {
          const laporanId = docSnap.id;
          const lData = docSnap.data();

          // 1. Cek apakah laporan ini ditangani oleh konselor yang sedang login (PRIVASI)
          let isMyCase = false;
          try {
            const konselorSnap = await getDocs(collection(db, `laporan/${laporanId}/konselor`));
            konselorSnap.forEach(kDoc => {
              if (kDoc.data().konselor_id === currentUserId) {
                isMyCase = true;
              }
            });
          } catch (e) { console.error("Error cek konselor:", e); }

          if (isMyCase) {
            // Ambil nama klien (pelapor)
            let clientName = 'Anonim';
            if (lData.user_id) {
              try {
                const uSnap = await getDoc(doc(db, 'users', lData.user_id));
                if (uSnap.exists()) clientName = uSnap.data().nama;
              // eslint-disable-next-line no-unused-vars
              } catch (e) { /* empty */ }
            }

            // Simpan ke daftar kasus untuk dropdown form (Hanya kasus yang belum selesai)
            if (lData.status_id !== 'selesai') {
              fetchedCases.push({
                id: laporanId,
                judul: lData.judul,
                clientName: clientName,
                userId: lData.user_id // Disimpan untuk keperluan notifikasi nanti
              });
            }

            // 2. Ambil semua jadwal dari subcollection jadwal_pertemuan
            try {
              const jadwalSnap = await getDocs(collection(db, `laporan/${laporanId}/jadwal_pertemuan`));
              jadwalSnap.forEach(jDoc => {
                const jData = jDoc.data();
                fetchedSchedules.push({
                  id: jDoc.id,
                  laporanId: laporanId,
                  title: jData.judul_pertemuan || 'Konseling',
                  client: clientName,
                  date: jData.tanggal,
                  time: jData.waktu,
                  location: jData.lokasi,
                  type: jData.tipe || 'offline',
                  status: jData.status || 'scheduled',
                  notes: jData.catatan || '',
                  createdAtMillis: jData.created_at?.toMillis() || 0
                });
              });
            } catch (e) { console.error("Error fetch jadwal:", e); }
          }
        }

        // Urutkan jadwal (terbaru dibuat)
        fetchedSchedules.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
        
        setMyCases(fetchedCases);
        setSchedules(fetchedSchedules);
      } catch (error) {
        console.error("Gagal memuat jadwal:", error);
        toast.error("Terjadi kesalahan saat memuat jadwal pertemuan.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedulesAndCases();
  }, [refreshTrigger]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validasi Form
    if (!formData.laporanId || !formData.title || !formData.date || !formData.time || !formData.location) {
      toast.error('Mohon lengkapi semua data wajib!');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUserId = auth.currentUser.uid;
      const jadwalRef = collection(db, `laporan/${formData.laporanId}/jadwal_pertemuan`);
      
      await addDoc(jadwalRef, {
        judul_pertemuan: formData.title,
        tanggal: formData.date,
        waktu: formData.time,
        tipe: formData.type,
        lokasi: formData.location,
        catatan: formData.notes,
        status: 'scheduled',
        dibuat_oleh: currentUserId,
        created_at: serverTimestamp()
      });

      // --- KIRIM NOTIFIKASI KE PELAPOR ---
      const selectedCase = myCases.find(c => c.id === formData.laporanId);
      if (selectedCase && selectedCase.userId) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedCase.userId,
          title: "Jadwal Pertemuan Dibuat",
          message: `Konselor telah menjadwalkan "${formData.title}" pada ${formData.date} pukul ${formData.time}.`,
          type: "jadwal",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Jadwal pertemuan berhasil ditambahkan dan dinotifikasikan ke klien!');
      setIsDialogOpen(false);
      setFormData({ laporanId: '', title: '', date: '', time: '', location: '', type: 'offline', notes: '' });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal simpan jadwal:", error);
      toast.error('Gagal menyimpan jadwal pertemuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (laporanId, scheduleId) => {
    if (!window.confirm('Hapus jadwal pertemuan ini secara permanen?')) return;
    
    try {
      await deleteDoc(doc(db, `laporan/${laporanId}/jadwal_pertemuan`, scheduleId));
      toast.success('Jadwal berhasil dihapus!');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal hapus:", error);
      toast.error('Gagal menghapus jadwal.');
    }
  };

  const handleMarkAsCompleted = async (laporanId, scheduleId) => {
    try {
      const jadwalRef = doc(db, `laporan/${laporanId}/jadwal_pertemuan`, scheduleId);
      await updateDoc(jadwalRef, {
        status: 'completed'
      });
      toast.success('Pertemuan ditandai telah selesai!');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal update status:", error);
      toast.error('Gagal memperbarui status pertemuan.');
    }
  };

  const getTypeBadge = (type) => {
    return type === 'online' 
      ? <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit"><Video className="w-3 h-3" /> ONLINE</span>
      : <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-pink-100 text-pink-800 border border-pink-200 flex items-center gap-1 w-fit"><MapPin className="w-3 h-3" /> OFFLINE</span>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">TERJADWAL</span>;
      case 'completed':
        return <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-800 border border-green-200">SELESAI</span>;
      case 'cancelled':
        return <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-red-100 text-red-800 border border-red-200">DIBATALKAN</span>;
      default:
        return <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-800 border border-gray-200">{status}</span>;
    }
  };

  const scheduledMeetings = schedules.filter(s => s.status === 'scheduled');
  const completedMeetings = schedules.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-2xl shadow-lg border-0 overflow-hidden relative p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black mb-1">Jadwal Pertemuan</h1>
            <p className="text-purple-200 font-medium">
              Kelola jadwal konseling dan pendampingan tatap muka dengan klien.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsDialogOpen(true)}
          className="relative z-10 bg-white text-[#4B2C82] hover:bg-purple-50 px-6 py-3 rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Jadwal
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total Jadwal Dibuat</p>
          <p className="text-4xl font-black text-[#4B2C82]">{schedules.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mb-2">Terjadwal (Akan Datang)</p>
          <p className="text-4xl font-black text-yellow-600">{scheduledMeetings.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-2">Selesai Dilaksanakan</p>
          <p className="text-4xl font-black text-green-600">{completedMeetings.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-[#4B2C82] animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat jadwal pertemuan...</p>
        </div>
      ) : (
        <>
          {/* Jadwal Mendatang */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-black text-[#4B2C82]">Jadwal Mendatang</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Daftar agenda pertemuan yang belum terlaksana.</p>
            </div>
            <div className="p-6 bg-gray-50/50">
              {scheduledMeetings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">Tidak ada jadwal pertemuan yang akan datang.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {scheduledMeetings.map((schedule) => (
                    <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative">
                      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-bold text-gray-800 text-lg">{schedule.title}</h3>
                            {getTypeBadge(schedule.type)}
                            {getStatusBadge(schedule.status)}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 font-medium">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#4B2C82]" />
                              <span>Klien: <span className="text-gray-900 font-bold">{schedule.client}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#4B2C82]" />
                              <span>{new Date(schedule.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#4B2C82]" />
                              <span>{schedule.time} WITA</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#4B2C82]" />
                              <span>{schedule.location}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 md:flex-col md:items-end">
                          <button 
                            onClick={() => handleMarkAsCompleted(schedule.laporanId, schedule.id)}
                            className="bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 w-full justify-center md:w-auto"
                            title="Tandai Selesai"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="md:hidden">Selesai</span>
                          </button>
                          <div className="flex gap-2 w-full md:w-auto">
                            <button 
                              onClick={() => handleDelete(schedule.laporanId, schedule.id)}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors flex-1 md:flex-none flex justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {schedule.notes && (
                        <div className="bg-yellow-50/50 border border-yellow-100 p-3 rounded-lg mt-2">
                          <p className="text-xs font-bold text-yellow-800 mb-1">Catatan Tambahan:</p>
                          <p className="text-sm text-gray-700">{schedule.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Pertemuan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-black text-[#4B2C82]">Riwayat Pertemuan</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Daftar agenda pertemuan yang telah diselesaikan.</p>
            </div>
            <div>
              {completedMeetings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
                  </div>
                  <p className="font-medium">Belum ada riwayat pertemuan yang diselesaikan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#4B2C82]/5 border-b border-purple-100">
                      <tr>
                        <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Tanggal & Waktu</th>
                        <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Klien</th>
                        <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest">Agenda</th>
                        <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Tipe</th>
                        <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {completedMeetings.map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap">
                            <p className="text-sm font-bold text-gray-800">{new Date(schedule.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <p className="text-xs text-gray-500 font-medium">{schedule.time}</p>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#4B2C82]" />
                              <span className="text-sm font-bold text-gray-800">{schedule.client}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{schedule.title}</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{schedule.location}</p>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            {getTypeBadge(schedule.type)}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            {getStatusBadge(schedule.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL TAMBAH JADWAL */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-[#4B2C82]">Tambah Jadwal Pertemuan</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Buat agenda pendampingan atau mediasi baru.</p>
                </div>
                <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 rounded-full p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Pilih Kasus yang sedang ditangani */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pilih Laporan Klien *</label>
                  <select 
                    value={formData.laporanId}
                    onChange={(e) => handleInputChange('laporanId', e.target.value)}
                    className="w-full px-4 h-12 rounded-xl bg-purple-50 border border-purple-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-[#4B2C82]"
                  >
                    <option value="" disabled>-- Pilih kasus yang sedang Anda tangani --</option>
                    {myCases.map(c => (
                      <option key={c.id} value={c.id}>{c.judul} (Klien: {c.clientName})</option>
                    ))}
                  </select>
                  {myCases.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold">Anda belum menerima penugasan kasus yang aktif.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agenda Pertemuan *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Pendampingan Medis / Pemeriksaan Psikologis"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lokasi / Tautan *</label>
                    <input
                      type="text"
                      placeholder="Contoh: RSUD Ulin / Kantor DP3A"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipe *</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    >
                      <option value="offline">Offline (Tatap Muka)</option>
                      <option value="online">Online (Video Call/Telpon)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tanggal *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Waktu *</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                  <textarea
                    placeholder="Dokumen yang harus dibawa oleh klien, dll."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full p-4 h-24 resize-none rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white shrink-0 flex gap-3">
                <button 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || myCases.length === 0}
                  className="flex-1 h-12 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan & Beritahu Klien"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}