import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FileText, CheckCircle, Loader2, Star, User, BookOpen, Printer, X, Eye, FileDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function KonselorHistory() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk pencarian
  const [searchQuery, setSearchQuery] = useState('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMonth, setPrintMonth] = useState('all');

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

  useEffect(() => {
    const fetchHistoryData = async () => {
      if (!auth.currentUser) return;
      const currentUserId = auth.currentUser.uid;
      setLoading(true);

      try {
        const laporanSnap = await getDocs(collection(db, 'laporan'));
        let allHistory = [];

        for (const docSnap of laporanSnap.docs) {
          const laporanId = docSnap.id;
          const lData = docSnap.data();

          if (lData.status_id === 'selesai') {
            let isMyCase = false;
            try {
              const konselorSnap = await getDocs(collection(db, `laporan/${laporanId}/konselor`));
              konselorSnap.forEach(kDoc => {
                if (kDoc.data().konselor_id === currentUserId) {
                  isMyCase = true;
                }
              });
            } catch (e) { 
              console.error("Error cek konselor:", e); 
            }

            if (isMyCase) {
              let clientName = 'Anonim';
              if (lData.user_id) {
                try {
                  const uSnap = await getDoc(doc(db, 'users', lData.user_id));
                  if (uSnap.exists()) clientName = uSnap.data().nama;
                // eslint-disable-next-line no-unused-vars
                } catch (e) { /* empty */ }
              }

              let finalNote = 'Diselesaikan tanpa catatan penanganan tertulis.';
              try {
                const tanggapanRef = collection(db, `laporan/${laporanId}/tanggapan`);
                const qTanggapan = query(tanggapanRef, orderBy("created_at", "desc"));
                const tSnap = await getDocs(qTanggapan);
                
                if (!tSnap.empty) {
                  finalNote = tSnap.docs[0].data().isi_tanggapan;
                }
              } catch (e) { 
                console.error("Error fetch tanggapan:", e); 
              }

              allHistory.push({
                id: laporanId,
                title: lData.judul || 'Tanpa Judul',
                client: clientName,
                kronologi: lData.kronologi || 'Tidak ada kronologi.',
                lokasi: lData.lokasi || '-',
                category: lData.kategori_id || '-',
                notes: finalNote,
                completedAtMillis: lData.updated_at?.toMillis() || lData.created_at?.toMillis() || 0,
                completedAt: lData.updated_at ? lData.updated_at.toDate() : (lData.created_at ? lData.created_at.toDate() : new Date()),
                isRated: lData.is_rated || false,
                rating: lData.rating || 0,
                ulasan: lData.ulasan || ''
              });
            }
          }
        }

        allHistory.sort((a, b) => b.completedAtMillis - a.completedAtMillis);
        setHistoryList(allHistory);
      } catch (error) {
        console.error("Gagal memuat riwayat:", error);
        toast.error("Terjadi kesalahan saat memuat riwayat penanganan.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, []);

  // --- LOGIKA FILTER PENCARIAN ---
  const filteredHistoryList = historyList.filter((history) => {
    const query = searchQuery.toLowerCase();
    return (
      history.title.toLowerCase().includes(query) ||
      history.client.toLowerCase().includes(query) ||
      history.id.toLowerCase().includes(query) ||
      history.category.toLowerCase().includes(query)
    );
  });

  // --- FUNGSI 1: CETAK REKAPITULASI (LANDSCAPE) ---
  const executePrintRecap = async () => {
    setIsPrinting(true);
    
    const dataToPrint = historyList.filter(h => {
      if (printMonth !== 'all') {
        const hMonth = h.completedAt.getMonth() + 1;
        return hMonth.toString() === printMonth;
      }
      return true;
    });

    if (dataToPrint.length === 0) {
      toast.error("Tidak ada riwayat pada bulan yang dipilih.");
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

      // KOP SURAT
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("PEMERINTAH KOTA BANJARMASIN", pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(15);
      doc.text("DINAS PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK", pageWidth / 2, 23, { align: 'center' });
      
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Gedung Capil, Jl. Sultan Adam No.49, Surgi Mufti, Kec. Banjarmasin Utara, Kota Banjarmasin, Kalimantan Selatan 70122", pageWidth / 2, 29, { align: 'center' });
      
      // GARIS KOP
      doc.setLineWidth(1.0); doc.line(15, 36, pageWidth - 15, 36);
      doc.setLineWidth(0.3); doc.line(15, 37.5, pageWidth - 15, 37.5);

      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("LAPORAN KINERJA PENANGANAN KASUS (KONSELOR)", pageWidth / 2, 50, { align: 'center' });

      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Dicetak pada : ${printDate}`, 15, 60);
      doc.text(`Total Kasus  : ${dataToPrint.length} Selesai`, 15, 65);
      
      const getMonthName = (m) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(m)-1];
      doc.text(`Filter Bulan : ${printMonth === 'all' ? 'Semua Waktu' : getMonthName(printMonth)}`, pageWidth - 60, 60);

      const tableColumn = ["No", "Tanggal Selesai", "ID Laporan", "Nama Klien", "Kategori Kasus", "Rating Klien"];
      const tableRows = [];

      dataToPrint.forEach((h, index) => {
        const date = h.completedAt.toLocaleDateString('id-ID');
        const shortId = h.id.substring(0, 8).toUpperCase();
        const ratingStr = h.isRated ? `${h.rating} Bintang` : 'Belum dinilai';
        tableRows.push([index + 1, date, shortId, h.client, h.category || '-', ratingStr]);
      });

      autoTable(doc, {
        head: [tableColumn], body: tableRows, startY: 72, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [75, 44, 130], textColor: 255, halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 35 }, 2: { halign: 'center', cellWidth: 30 }, 5: { halign: 'center', cellWidth: 30 } }
      });

      const finalY = doc.lastAutoTable.finalY || 75; 
      if (finalY > 140) doc.addPage();
      const currentY = doc.lastAutoTable.finalY > 140 ? 30 : finalY + 20;

      doc.setFont("helvetica", "normal");
      doc.text(`Banjarmasin, ${printDate}`, pageWidth - 50, currentY, { align: 'center' });
      doc.text("Dibuat oleh,", pageWidth - 50, currentY + 6, { align: 'center' });
      doc.setFont("helvetica", "bold");
      doc.text("Konselor Pendamping", pageWidth - 50, currentY + 30, { align: 'center' });

      doc.save(`Laporan_Kinerja_Konselor_${Date.now()}.pdf`);
      toast.success("Rekap kinerja berhasil diunduh!");
      setIsPrintModalOpen(false);
    // eslint-disable-next-line no-unused-vars
    } catch (error) { 
      toast.error("Terjadi kesalahan saat mencetak PDF."); 
    } finally { 
      setIsPrinting(false); 
    }
  };

  // --- FUNGSI 2: CETAK BERKAS SPESIFIK 1 KASUS (PORTRAIT) ---
  const executePrintSingleCase = async (history) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;

      const loadLogo = (url) => new Promise((resolve) => {
        const img = new Image(); img.src = url;
        img.onload = () => resolve(img); img.onerror = () => resolve(null);
      });
      const logoImg = await loadLogo('/pemkot.png');
      
      if (logoImg) doc.addImage(logoImg, 'PNG', 15, 10, 20, 24); 

      // KOP SURAT
      doc.setFontSize(14); 
      doc.setFont("helvetica", "bold");
      doc.text("PEMERINTAH KOTA BANJARMASIN", pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text("DINAS PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK", pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(9); 
      doc.setFont("helvetica", "normal");
      doc.text("Gedung Capil, Jl. Sultan Adam No.49, Surgi Mufti, Kec. Banjarmasin Utara,", pageWidth / 2, 27, { align: 'center' });
      doc.text("Kota Banjarmasin, Kalimantan Selatan 70122", pageWidth / 2, 31, { align: 'center' });
      
      // GARIS KOP
      doc.setLineWidth(1.0); doc.line(15, 36, pageWidth - 15, 36);
      doc.setLineWidth(0.3); doc.line(15, 37.5, pageWidth - 15, 37.5);

      // JUDUL DOKUMEN
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("BERKAS RIWAYAT PENANGANAN KASUS", pageWidth / 2, 50, { align: 'center' });

      // KONTEN
      doc.setFontSize(10);
      doc.text("Informasi Umum", 15, 65);
      doc.setFont("helvetica", "normal");
      doc.text(`ID Laporan       : ${history.id}`, 15, 72);
      doc.text(`Nama Klien      : ${history.client}`, 15, 78);
      doc.text(`Kategori Kasus : ${history.category}`, 15, 84);
      doc.text(`Tgl Selesai      : ${history.completedAt.toLocaleDateString('id-ID')}`, 15, 90);

      doc.setFont("helvetica", "bold");
      doc.text("Kronologi Kejadian", 15, 105);
      doc.setFont("helvetica", "normal");
      const kronologiSplit = doc.splitTextToSize(history.kronologi, pageWidth - 30);
      doc.text(kronologiSplit, 15, 112);

      const kronologiHeight = kronologiSplit.length * 5;
      
      doc.setFont("helvetica", "bold");
      doc.text("Catatan Penanganan (Logbook) Terakhir", 15, 112 + kronologiHeight + 10);
      doc.setFont("helvetica", "normal");
      const notesSplit = doc.splitTextToSize(history.notes, pageWidth - 30);
      doc.text(notesSplit, 15, 112 + kronologiHeight + 17);

      doc.save(`Berkas_Kasus_${history.id.substring(0,6)}.pdf`);
      toast.success("Berkas penanganan berhasil diunduh!");
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Gagal mencetak berkas.");
    }
  };

  return (
    <>
      <div className="space-y-6 pb-10 animate-fade-in">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-2xl shadow-lg border-0 overflow-hidden relative p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black mb-1">Riwayat Penanganan</h1>
                <p className="text-purple-200 font-medium">
                  Arsip laporan masyarakat yang telah berhasil Anda selesaikan.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-white text-[#4B2C82] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-50 transition-colors shadow-lg"
            >
              <Printer className="w-5 h-5" /> Cetak Rekap
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 text-[#4B2C82] animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Menarik data riwayat kasus...</p>
          </div>
        ) : (
          <>
            {/* Statistics Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-[#4B2C82]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Kasus Selesai</p>
                  <p className="text-2xl font-black text-gray-800">{historyList.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Ulasan Diterima</p>
                  <p className="text-2xl font-black text-gray-800">{historyList.filter(h => h.isRated).length}</p>
                </div>
              </div>
            </div>

            {/* List Riwayat Kasus */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#4B2C82]">Arsip Kasus Selesai</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Laporan yang sudah mencapai tahap akhir penanganan.</p>
                </div>
                
                {/* SEARCH BAR (Added) */}
                <div className="relative w-full sm:w-72 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari ID, Klien, atau Judul..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] transition-colors"
                  />
                </div>
              </div>
              
              <div className="p-6 bg-gray-50/50">
                {historyList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">Belum ada riwayat kasus yang diselesaikan.</p>
                  </div>
                ) : filteredHistoryList.length === 0 ? (
                  // State kosong ketika pencarian tidak ditemukan
                  <div className="text-center py-12 text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">Kasus tidak ditemukan untuk pencarian "{searchQuery}".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Looping data yang sudah di-filter */}
                    {filteredHistoryList.map((history) => (
                      <div key={history.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-black text-gray-800 text-lg">{history.title}</h3>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-800 border border-green-200">
                              SELESAI
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500 mb-4">
                            <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-[#4B2C82]" /> {history.client}</span>
                            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-[#4B2C82]" /> ID Laporan: {history.id.substring(0, 8).toUpperCase()}</span>
                            <span className="flex items-center gap-1.5 bg-purple-50 text-[#4B2C82] px-2 py-0.5 rounded text-xs font-bold border border-purple-100">{history.category}</span>
                          </div>

                          <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-[#4B2C82]" />
                              <p className="text-xs font-bold text-[#4B2C82] uppercase tracking-widest">Catatan Penanganan Terakhir</p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-2">{history.notes}</p>
                          </div>

                          {history.isRated && (
                            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-xl p-3 w-fit">
                              <div className="flex items-center gap-0.5 text-yellow-500">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={`w-3.5 h-3.5 ${star <= history.rating ? 'fill-yellow-500' : 'text-gray-300 fill-transparent'}`} />
                                ))}
                              </div>
                              <p className="text-xs text-gray-600 font-medium italic line-clamp-1 border-l border-yellow-200 pl-3">
                                "{history.ulasan || 'Tanpa ulasan'}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row lg:flex-col gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-6">
                          <button 
                            onClick={() => { setSelectedHistory(history); setIsDetailOpen(true); }}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm"
                          >
                            <Eye className="w-4 h-4 text-blue-500" /> Detail Kasus
                          </button>
                          <button 
                            onClick={() => executePrintSingleCase(history)}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-purple-50 border border-purple-100 text-[#4B2C82] px-4 py-2.5 rounded-xl font-bold hover:bg-purple-100 transition-colors text-sm"
                          >
                            <FileDown className="w-4 h-4" /> Cetak Berkas
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-[#4B2C82]">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#4B2C82] leading-tight">Cetak Rekap Kinerja</h3>
                  </div>
                </div>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 bg-white">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bulan Penyelesaian</label>
                  <select 
                    value={printMonth} 
                    onChange={(e) => setPrintMonth(e.target.value)}
                    className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-gray-700"
                  >
                    <option value="all">Semua Waktu</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={String(i+1)}>Bulan {i+1}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 font-medium">Sistem akan menyusun tabel rekapitulasi klien yang berhasil Anda tangani ke dalam format PDF.</p>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors">
                  Batal
                </button>
                <button onClick={executePrintRecap} disabled={isPrinting} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#4B2C82] hover:bg-purple-900 transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-70 flex items-center justify-center gap-2">
                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailOpen && selectedHistory && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0 z-10">
                <h3 className="text-lg font-black text-[#4B2C82]">Detail Riwayat Kasus</h3>
                <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-gray-200/50 hover:bg-red-50 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Judul Laporan</h4>
                  <p className="text-xl font-black text-gray-800">{selectedHistory.title}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Nama Klien</h4>
                    <p className="font-bold text-[#4B2C82]">{selectedHistory.client}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Tanggal Selesai</h4>
                    <p className="font-bold text-green-800">{selectedHistory.completedAt.toLocaleDateString('id-ID')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lokasi Kejadian</h4>
                  <p className="text-sm font-medium text-gray-700">{selectedHistory.lokasi}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kronologi Lengkap</h4>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {selectedHistory.kronologi}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Catatan Penanganan Terakhir</h4>
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-sm leading-relaxed text-purple-900 whitespace-pre-wrap">
                    {selectedHistory.notes}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}