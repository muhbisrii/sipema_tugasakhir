import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Eye, Trash2, Search, Filter, Loader2, X, AlertTriangle, FileDown, Printer, UserCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Import jsPDF dan autoTable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [counselors, setCounselors] = useState([]); // Daftar Konselor untuk di-assign
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal States
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false); // Modal Assign Konselor
  
  // State Modal Tolak Laporan
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Print Filter States
  const [printFilters, setPrintFilters] = useState({
    month: 'all',
    category: 'all',
    ageGroup: 'all',
    gender: 'all'
  });

  // 1. Ambil Data Konselor
  useEffect(() => {
    const fetchCounselors = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "roles"));
        let konselorRoleId = null;
        rolesSnap.forEach(r => {
          if(r.data().nama_role.toLowerCase() === 'konselor') konselorRoleId = r.id;
        });

        const usersRef = collection(db, "users");
        const qC = konselorRoleId 
          ? query(usersRef, where("role_id", "==", konselorRoleId)) 
          : query(usersRef, where("role", "==", "konselor"));
          
        const cSnap = await getDocs(qC);
        const cList = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCounselors(cList);
      } catch (error) {
        console.error("Gagal load data konselor", error);
      }
    };
    fetchCounselors();
  }, []);

  // 2. Fetch Data Laporan (DIOPTIMASI UNTUK KECEPATAN TINGGI)
  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        // A. Ambil SEMUA data Laporan (1 Request)
        const querySnapshot = await getDocs(collection(db, "laporan"));
        
        // B. Ambil SEMUA data Users ke dalam memori (1 Request, menghindari N+1 Query)
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap = {};
        usersSnap.forEach(doc => {
          usersMap[doc.id] = doc.data();
        });

        // C. Proses Mapping Data secara Offline (Sangat Cepat)
        const fetchedData = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let reporterName = "Pengguna Tidak Diketahui";
          let reporterEmail = "-";
          let reporterGender = "-";
          let reporterAge = "-";

          // Cek Data Pelapor dari memori (usersMap)
          if (data.user_id && usersMap[data.user_id]) {
            const uData = usersMap[data.user_id];
            reporterName = uData.nama || reporterName;
            reporterEmail = uData.email || reporterEmail;
            reporterGender = uData.jenis_kelamin || "-";
            
            if (uData.tanggal_lahir) {
              const birthDate = new Date(uData.tanggal_lahir);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
              reporterAge = age;
            }
          }

          // Cek Data Konselor yang Ditugaskan
          let assignedCounselorName = null;
          
          // Optimasi: Jika konselor_id sudah disimpan langsung di tabel laporan
          if (data.konselor_id && usersMap[data.konselor_id]) {
            assignedCounselorName = usersMap[data.konselor_id].nama;
          } 
          // Kompatibilitas mundur: Cek sub-collection hanya jika konselor_id tidak ada di induk
          else {
            try {
              const kSnap = await getDocs(collection(db, `laporan/${docSnap.id}/konselor`));
              if (!kSnap.empty) {
                const kData = kSnap.docs[0].data();
                if (usersMap[kData.konselor_id]) {
                  assignedCounselorName = usersMap[kData.konselor_id].nama;
                }
              }
            // eslint-disable-next-line no-unused-vars
            } catch (e) { /* empty */ }
          }

          return { 
            id: docSnap.id, 
            ...data, 
            reporterName, 
            reporterEmail,
            reporterGender,
            reporterAge,
            assignedCounselorName
          };
        }));

        fetchedData.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
        setComplaints(fetchedData);
      } catch (error) {
        toast.error("Terjadi kesalahan saat memuat data laporan.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [refreshTrigger]);

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = 
      (complaint.judul || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (complaint.reporterName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || complaint.status_id === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'menunggu': return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">MENUNGGU VERIFIKASI</span>;
      case 'diproses': return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-purple-100 text-[#4B2C82] border border-purple-200">DIPROSES</span>;
      case 'selesai': return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-800 border border-green-200">SELESAI</span>;
      case 'ditolak': return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-red-100 text-red-800 border border-red-200">DITOLAK</span>;
      default: return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-800 border border-gray-200">{status || 'UNKNOWN'}</span>;
    }
  };

  const uniqueCategories = [...new Set(complaints.map(c => c.kategori_id))].filter(Boolean);

  // --- FUNGSI CETAK PDF ---
  const executePrintPDF = async () => {
    setIsPrinting(true);
    const dataToPrint = complaints.filter(c => {
      let isMatch = true;
      if (printFilters.month !== 'all') {
        const cMonth = c.created_at ? new Date(c.created_at.toMillis()).getMonth() + 1 : -1;
        if (cMonth.toString() !== printFilters.month) isMatch = false;
      }
      if (printFilters.category !== 'all' && c.kategori_id !== printFilters.category) isMatch = false;
      if (printFilters.gender !== 'all' && c.reporterGender !== printFilters.gender) isMatch = false;
      if (printFilters.ageGroup !== 'all') {
        const age = parseInt(c.reporterAge);
        if (isNaN(age)) isMatch = false;
        else {
          if (printFilters.ageGroup === 'anak' && age >= 18) isMatch = false;
          if (printFilters.ageGroup === 'dewasa' && (age < 18 || age > 59)) isMatch = false;
          if (printFilters.ageGroup === 'lansia' && age < 60) isMatch = false;
        }
      }
      return isMatch;
    });

    if (dataToPrint.length === 0) {
      toast.error("Tidak ada data laporan yang sesuai dengan filter cetak Anda.");
      setIsPrinting(false);
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;

      const loadLogo = (url) => new Promise((resolve) => {
        const img = new Image(); img.src = url;
        img.onload = () => resolve(img); img.onerror = () => resolve(null);
      });

      const logoImg = await loadLogo('/pemkot.png');
      if (logoImg) doc.addImage(logoImg, 'PNG', 20, 10, 22, 26);

      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("PEMERINTAH KOTA BANJARMASIN", pageWidth / 2, 16, { align: 'center' });
      doc.setFontSize(15);
      doc.text("DINAS PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK", pageWidth / 2, 23, { align: 'center' });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      
      // ALAMAT
      doc.text("Gedung Capil, Jl. Sultan Adam No.49, Surgi Mufti, Kec. Banjarmasin Utara, Kota Banjarmasin, Kalimantan Selatan 70122", pageWidth / 2, 29, { align: 'center' });

      doc.setLineWidth(1.0); doc.line(15, 36, pageWidth - 15, 36);
      doc.setLineWidth(0.3); doc.line(15, 37.5, pageWidth - 15, 37.5);

      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("REKAPITULASI DATA PENGADUAN KEKERASAN", pageWidth / 2, 50, { align: 'center' });

      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Dicetak pada     : ${printDate}`, 15, 60);
      doc.text(`Total Data       : ${dataToPrint.length} Laporan`, 15, 65);
      
      const getMonthName = (m) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(m)-1];
      doc.text(`Filter Bulan  : ${printFilters.month === 'all' ? 'Semua Waktu' : getMonthName(printFilters.month)}`, pageWidth - 80, 60);
      doc.text(`Kategori        : ${printFilters.category === 'all' ? 'Semua' : printFilters.category}`, pageWidth - 80, 65);

      const tableColumn = ["No", "Tanggal Lapor", "Nama Pelapor", "L/P", "Umur", "Kategori Kasus", "Status"];
      const tableRows = [];

      dataToPrint.forEach((complaint, index) => {
        const date = complaint.created_at ? complaint.created_at.toDate().toLocaleDateString('id-ID') : '-';
        const statusData = complaint.status_id ? complaint.status_id.toUpperCase() : 'UNKNOWN';
        const gender = complaint.reporterGender === 'Laki-laki' ? 'L' : complaint.reporterGender === 'Perempuan' ? 'P' : '-';
        const umur = complaint.reporterAge !== '-' ? `${complaint.reporterAge} Thn` : '-';
        tableRows.push([index + 1, date, complaint.reporterName, gender, umur, complaint.kategori_id || '-', statusData]);
      });

      autoTable(doc, {
        head: [tableColumn], body: tableRows, startY: 72, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [75, 44, 130], textColor: 255, halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 30 }, 3: { halign: 'center', cellWidth: 15 }, 4: { halign: 'center', cellWidth: 20 }, 6: { halign: 'center', cellWidth: 25 } }
      });

      const finalY = doc.lastAutoTable.finalY || 75; 
      if (finalY > 140) doc.addPage();
      const currentY = doc.lastAutoTable.finalY > 140 ? 30 : finalY + 20;

      doc.setFont("helvetica", "normal");
      doc.text(`Banjarmasin, ${printDate}`, pageWidth - 50, currentY, { align: 'center' });
      doc.text("Mengetahui,", pageWidth - 50, currentY + 6, { align: 'center' });
      doc.setFont("helvetica", "bold");
      doc.text("Admin Pengaduan DP3A", pageWidth - 50, currentY + 30, { align: 'center' });

      doc.save(`Rekap_Laporan_DP3A_${Date.now()}.pdf`);
      toast.success("Laporan PDF berhasil diunduh!");
      setIsPrintModalOpen(false);
    // eslint-disable-next-line no-unused-vars
    } catch (error) { toast.error("Terjadi kesalahan saat mencetak PDF."); } finally { setIsPrinting(false); }
  };

  // --- ACTIONS DELETE ---
  const triggerDelete = (complaint) => { setComplaintToDelete(complaint); setIsDeleteOpen(true); };
  const confirmDelete = async () => {
    if (!complaintToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "laporan", complaintToDelete.id));
      setComplaints(prev => prev.filter(c => c.id !== complaintToDelete.id));
      toast.success("Laporan berhasil dihapus secara permanen.");
      setIsDeleteOpen(false); setComplaintToDelete(null);
    // eslint-disable-next-line no-unused-vars
    } catch (error) { toast.error("Gagal menghapus laporan."); } finally { setIsDeleting(false); }
  };

  // --- FUNGSI TOLAK LAPORAN ---
  const handleRejectComplaint = async () => {
    if (!rejectReason.trim()) {
      toast.error("Mohon berikan alasan penolakan!");
      return;
    }
    
    setIsRejecting(true);
    try {
      const laporanRef = doc(db, "laporan", selectedComplaint.id);

      // 1. Update status dan alasan
      await updateDoc(laporanRef, { 
        status_id: 'ditolak', 
        alasan_penolakan: rejectReason,
        updated_at: serverTimestamp() 
      });
      
      // 2. Catat riwayat
      await addDoc(collection(laporanRef, "riwayat_status"), {
        status_id: 'ditolak', 
        diubah_oleh: auth.currentUser.uid, 
        alasan: rejectReason,
        changed_at: serverTimestamp()
      });

      // 3. Kirim notifikasi ke pelapor
      if (selectedComplaint.user_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.user_id,
          title: "Laporan Ditolak",
          message: `Laporan Anda berjudul "${selectedComplaint.judul}" tidak dapat kami proses. Alasan: ${rejectReason}`,
          type: "system",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success("Laporan berhasil ditolak dan pelapor telah diberitahu.");
      setIsRejectOpen(false);
      setRejectReason('');
      setSelectedComplaint(null);
      setRefreshTrigger(prev => prev + 1); // Refresh tabel
    } catch (error) {
      console.error(error);
      toast.error("Gagal menolak laporan.");
    } finally {
      setIsRejecting(false);
    }
  };

  // --- FUNGSI ASSIGN (TERUSKAN) KE KONSELOR ---
  const handleAssignCounselor = async () => {
    if (!selectedCounselorId || !selectedComplaint) {
      toast.error("Pilih konselor terlebih dahulu!");
      return;
    }
    setIsAssigning(true);
    try {
      // 1. Catat ke subcollection konselor
      await addDoc(collection(db, `laporan/${selectedComplaint.id}/konselor`), {
        konselor_id: selectedCounselorId,
        assigned_at: serverTimestamp(),
        assigned_by: auth.currentUser.uid
      });

      // 2. Update status jadi diproses + SIMPAN konselor_id (Optimasi Kecepatan)
      const laporanRef = doc(db, "laporan", selectedComplaint.id);
      await updateDoc(laporanRef, { 
        status_id: 'diproses', 
        konselor_id: selectedCounselorId, 
        updated_at: serverTimestamp() 
      });
      
      // 3. Catat riwayat
      await addDoc(collection(laporanRef, "riwayat_status"), {
        status_id: 'diproses', diubah_oleh: auth.currentUser.uid, changed_at: serverTimestamp()
      });

      // 4. Notifikasi ke Konselor
      await addDoc(collection(db, "notifikasi"), {
        target_user_id: selectedCounselorId,
        title: "Penugasan Kasus Baru",
        message: `Admin telah menugaskan kasus "${selectedComplaint.judul}" kepada Anda. Silakan segera ditindaklanjuti.`,
        type: "system",
        link_to: "/konselor/complaints",
        is_read: false,
        created_at: serverTimestamp()
      });

      // 5. Notifikasi ke Pelapor
      if (selectedComplaint.user_id) {
        await addDoc(collection(db, "notifikasi"), {
          target_user_id: selectedComplaint.user_id,
          title: "Laporan Sedang Diproses",
          message: `Laporan Anda telah diverifikasi Admin dan diteruskan ke Konselor Ahli untuk penanganan lebih lanjut.`,
          type: "system",
          link_to: "/masyarakat/complaints",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success("Berhasil! Kasus telah diteruskan ke Konselor yang dipilih.");
      setIsAssignOpen(false);
      setSelectedCounselorId('');
      setRefreshTrigger(prev => prev + 1); // Refresh tabel
    } catch (error) {
      toast.error("Gagal meneruskan kasus ke konselor.");
      console.error(error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#4B2C82]">Data Pengaduan Masuk</h2>
            <p className="text-gray-500 font-medium text-sm mt-1">Verifikasi laporan masyarakat dan tugaskan ke konselor ahli.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsPrintModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#4B2C82] text-white px-5 py-2.5 font-bold rounded-xl hover:bg-purple-900 transition-colors shadow-lg shadow-purple-900/20 text-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </button>
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="flex-1 md:flex-none btn-modern px-5 py-2.5 border border-purple-200 text-[#4B2C82] font-bold rounded-xl hover:bg-purple-50 transition-colors text-sm"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Judul, Pelapor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="menunggu">Menunggu Verifikasi</option>
              <option value="diproses">Diproses (Ditangani)</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium px-2">
              <Filter className="w-4 h-4" />
              <span>Tampil: {filteredComplaints.length} Laporan</span>
            </div>
          </div>
        </div>

        {/* Table - DENGAN PERBAIKAN STICKY KOLOM AKSI */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Container ini tetap bisa di-scroll ke kanan/kiri untuk melihat kolom yang panjang */}
          <div className="overflow-x-auto">
            {/* Berikan min-width agar tampilan rapi meski di layar sempit */}
            <table className="w-full text-left min-w-[800px]"> 
              <thead className="bg-[#4B2C82]/5 border-b border-purple-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Pelapor & Umur</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest">Kategori & Judul</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Status & Penanganan</th>
                  
                  {/* Kunci kolom Aksi agar lengket di kanan */}
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest text-right whitespace-nowrap sticky right-0 bg-[#f4f2f9] shadow-[-5px_0_10px_rgba(0,0,0,0.02)] border-l border-purple-100/50 z-10">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <Loader2 className="w-8 h-8 text-[#4B2C82] animate-spin mx-auto mb-4" />
                      <p className="text-sm font-medium text-gray-500">Memuat data pengaduan...</p>
                    </td>
                  </tr>
                ) : filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">Tidak ada laporan ditemukan.</p>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-purple-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-gray-800">
                          {complaint.created_at ? complaint.created_at.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">ID: {complaint.id.substring(0,6)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-gray-800">{complaint.reporterName}</p>
                        <p className="text-xs text-gray-500 font-medium">
                          {complaint.reporterGender} {complaint.reporterAge !== '-' && `• ${complaint.reporterAge} thn`}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[10px] font-bold text-[#4B2C82] uppercase tracking-widest mb-1 bg-purple-50 inline-block px-2 py-0.5 rounded border border-purple-100">
                          {complaint.kategori_id}
                        </p>
                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{complaint.judul}</p>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          {getStatusBadge(complaint.status_id)}
                          {complaint.assignedCounselorName && (
                            <p className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-gray-200">
                              <ShieldCheck className="w-3 h-3 text-purple-500"/>
                              Konselor: {complaint.assignedCounselorName}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Kunci kolom Aksi agar lengket di kanan */}
                      <td className="py-4 px-6 sticky right-0 bg-white group-hover:bg-[#fcfcff] shadow-[-5px_0_10px_rgba(0,0,0,0.02)] transition-colors z-10">
                        <div className="flex items-center justify-end gap-2">
                          {/* TOMBOL ACTION (Assign & Tolak) - Hanya muncul jika status Menunggu */}
                          {complaint.status_id === 'menunggu' && (
                            <div className="flex items-center gap-2 mr-2 border-r border-gray-200 pr-4">
                              <button 
                                onClick={() => { setSelectedComplaint(complaint); setIsAssignOpen(true); }} 
                                className="px-3 h-8 rounded-lg flex items-center justify-center gap-1 bg-[#4B2C82] text-white hover:bg-purple-900 transition-colors shadow-sm text-xs font-bold whitespace-nowrap" 
                                title="Teruskan ke Konselor"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Teruskan
                              </button>
                              
                              <button 
                                onClick={() => { setSelectedComplaint(complaint); setIsRejectOpen(true); }} 
                                className="px-3 h-8 rounded-lg flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm text-xs font-bold border border-red-100 whitespace-nowrap" 
                                title="Tolak Laporan"
                              >
                                <X className="w-3.5 h-3.5" /> Tolak
                              </button>
                            </div>
                          )}

                          <button onClick={() => { setSelectedComplaint(complaint); setIsDetailOpen(true); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors shrink-0" title="Lihat Detail"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => triggerDelete(complaint)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors shrink-0" title="Hapus Laporan"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL AREA --- */}
      
      {/* 1. Modal Assign Konselor */}
      <AnimatePresence>
        {isAssignOpen && selectedComplaint && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-[#4B2C82]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#4B2C82]">Teruskan Kasus ke Konselor</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Penugasan Berdasarkan Keahlian</p>
                  </div>
                </div>
                <button onClick={() => setIsAssignOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Kategori Kasus</p>
                  <p className="text-lg font-black text-[#4B2C82]">{selectedComplaint.kategori_id}</p>
                  <p className="text-sm font-medium text-gray-700 mt-2 line-clamp-2">"{selectedComplaint.judul}"</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pilih Konselor Ahli</label>
                  {counselors.length === 0 ? (
                    <p className="text-sm text-red-500 italic">Belum ada akun konselor terdaftar di sistem.</p>
                  ) : (
                    <select 
                      value={selectedCounselorId} 
                      onChange={(e) => setSelectedCounselorId(e.target.value)}
                      className="w-full px-4 h-14 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-2 focus:ring-purple-100 transition-all font-bold text-gray-700"
                    >
                      <option value="" disabled>-- Pilih Konselor Spesialis --</option>
                      {counselors.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nama} ({c.spesialisasi?.join(', ') || 'Umum'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm font-medium border border-yellow-100 flex gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-600" />
                  <p>Konselor yang dipilih akan menerima notifikasi dan kasus otomatis berstatus "Diproses".</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                <button 
                  onClick={handleAssignCounselor}
                  disabled={isAssigning || !selectedCounselorId}
                  className="w-full h-14 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-2xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isAssigning ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tugaskan Sekarang"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Modal Tolak Laporan */}
      <AnimatePresence>
        {isRejectOpen && selectedComplaint && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-red-600">Tolak Laporan</h3>
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-0.5">Konfirmasi Penolakan</p>
                  </div>
                </div>
                <button onClick={() => { setIsRejectOpen(false); setRejectReason(''); }} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5 overflow-y-auto">
                <p className="text-sm text-gray-600">
                  Anda akan menolak laporan berjudul <span className="font-bold">"{selectedComplaint.judul}"</span> dari <span className="font-bold">{selectedComplaint.reporterName}</span>.
                </p>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Alasan Penolakan <span className="text-red-500">*</span></label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Tuliskan alasan mengapa laporan ini ditolak (misal: Bukti tidak cukup, bukan ranah kekerasan, dll)..."
                    className="w-full p-4 h-32 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all text-sm resize-none"
                  ></textarea>
                </div>

                <div className="bg-gray-50 text-gray-500 p-4 rounded-xl text-sm font-medium border border-gray-200 flex gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-gray-400" />
                  <p>Alasan penolakan ini akan dikirimkan kepada pelapor melalui sistem notifikasi.</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white shrink-0 flex gap-3">
                <button 
                  onClick={() => { setIsRejectOpen(false); setRejectReason(''); }}
                  className="flex-1 h-14 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleRejectComplaint}
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-[2] h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isRejecting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tolak Laporan"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Modal Filter Cetak PDF */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-[#4B2C82]">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#4B2C82] leading-tight">Pengaturan Cetak Laporan</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Format Dokumen PDF</p>
                  </div>
                </div>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bulan Kejadian</label>
                    <select 
                      value={printFilters.month} 
                      onChange={(e) => setPrintFilters({...printFilters, month: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    >
                      <option value="all">Semua Bulan</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={String(i+1)}>Bulan {i+1}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jenis Kekerasan</label>
                    <select 
                      value={printFilters.category} 
                      onChange={(e) => setPrintFilters({...printFilters, category: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    >
                      <option value="all">Semua Kategori</option>
                      {uniqueCategories.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jenis Kelamin</label>
                    <select 
                      value={printFilters.gender} 
                      onChange={(e) => setPrintFilters({...printFilters, gender: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    >
                      <option value="all">Semua Jenis Kelamin</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kelompok Umur</label>
                    <select 
                      value={printFilters.ageGroup} 
                      onChange={(e) => setPrintFilters({...printFilters, ageGroup: e.target.value})}
                      className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                    >
                      <option value="all">Semua Umur</option>
                      <option value="anak">Anak-anak ({'<'} 18 thn)</option>
                      <option value="dewasa">Dewasa (18 - 59 thn)</option>
                      <option value="lansia">Lansia (60+ thn)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-start gap-3 mt-4">
                  <FileDown className="w-5 h-5 text-[#4B2C82] shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-900 font-medium leading-relaxed">
                    Sistem akan menyusun data ke dalam format tabel PDF resmi yang dilengkapi dengan kop surat Pemerintah Kota Banjarmasin dan ditandatangani oleh Admin.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={executePrintPDF}
                  disabled={isPrinting}
                  className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-[#4B2C82] hover:bg-purple-900 transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Printer className="w-4 h-4" /> Download PDF</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Modal Detail */}
      <AnimatePresence>
        {isDetailOpen && selectedComplaint && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <h3 className="text-lg font-black text-[#4B2C82]">Detail Pengaduan</h3>
                <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Judul Laporan</h4>
                    <p className="text-lg font-bold text-gray-800">{selectedComplaint.judul}</p>
                  </div>
                  
                  {/* Menampilkan Alasan Penolakan jika ditolak */}
                  {selectedComplaint.status_id === 'ditolak' && selectedComplaint.alasan_penolakan && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                      <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Alasan Penolakan
                      </h4>
                      <p className="text-sm font-medium text-red-800">{selectedComplaint.alasan_penolakan}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-4 rounded-2xl"><h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Kategori</h4><p className="font-bold text-[#4B2C82]">{selectedComplaint.kategori_id}</p></div>
                    <div className="bg-orange-50 p-4 rounded-2xl"><h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Status Saat Ini</h4>{getStatusBadge(selectedComplaint.status_id)}</div>
                  </div>
                  <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lokasi Kejadian</h4><p className="text-sm font-medium text-gray-700">{selectedComplaint.lokasi}</p></div>
                  <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kronologi Lengkap</h4><div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{selectedComplaint.kronologi}</div></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Modal Hapus Permanen */}
      <AnimatePresence>
        {isDeleteOpen && complaintToDelete && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-xl font-black text-gray-800 mb-2">Hapus Laporan?</h3>
              <p className="text-sm text-gray-500 mb-6">Apakah Anda yakin ingin menghapus laporan <span className="font-bold text-gray-700">"{complaintToDelete.judul}"</span>? Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteOpen(false)} disabled={isDeleting} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">Batal</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-70 flex justify-center items-center">
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ya, Hapus"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}