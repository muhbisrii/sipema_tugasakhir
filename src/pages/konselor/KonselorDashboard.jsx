import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FileText, Eye, BarChart3, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function KonselorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [assignedComplaints, setAssignedComplaints] = useState([]);
  
  // Stats States (Untuk Grafik)
  const [violenceTypeData, setViolenceTypeData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [educationData, setEducationData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  
  // Rating States
  const [counselorRating, setCounselorRating] = useState({
    average: 0,
    totalReviews: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!auth.currentUser) return;
      const currentUserId = auth.currentUser.uid;

      try {
        const reportsSnap = await getDocs(collection(db, 'laporan'));
        
        let tempAssigned = [];
        
        // Accumulators for Statistics (Tetap memproses semua data untuk grafik Global)
        let catStats = {};
        let ageStats = {
          '0-11 tahun': 0,
          '12-17 tahun': 0,
          '18-24 tahun': 0,
          '25-39 tahun': 0,
          '40-59 tahun': 0,
          '60+ tahun': 0,
          'Tidak Diketahui': 0
        };
        let eduStats = {};
        let monthStats = {};

        // Accumulators for Rating
        let totalRatingSum = 0;
        let reviewCount = 0;

        // Helper untuk menghitung umur
        const getAgeGroup = (age) => {
          if (age === null || age === undefined || isNaN(age)) return 'Tidak Diketahui';
          if (age < 12) return '0-11 tahun';
          if (age < 18) return '12-17 tahun';
          if (age < 25) return '18-24 tahun';
          if (age < 40) return '25-39 tahun';
          if (age < 60) return '40-59 tahun';
          return '60+ tahun';
        };

        // Proses setiap dokumen laporan
        for (const reportDoc of reportsSnap.docs) {
          const report = reportDoc.data();
          const reportId = reportDoc.id;

          let ageGroup = 'Tidak Diketahui';
          let edu = 'Tidak Diketahui';
          let reporterName = 'Pengguna Anonim';
          let reporterEmail = '-';

          // 1. Fetch data User pelapor untuk grafik Umur & Pendidikan
          if (report.user_id) {
            try {
              const userSnap = await getDoc(doc(db, 'users', report.user_id));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                reporterName = uData.nama || 'Pengguna Anonim';
                reporterEmail = uData.email || '-';
                edu = uData.tingkat_pendidikan || 'Tidak Diketahui';

                if (uData.tanggal_lahir) {
                  let birthDate;
                  if (typeof uData.tanggal_lahir === 'string') {
                    birthDate = new Date(uData.tanggal_lahir); 
                  } else if (typeof uData.tanggal_lahir.toDate === 'function') {
                    birthDate = uData.tanggal_lahir.toDate();
                  }

                  if (birthDate && !isNaN(birthDate.getTime())) {
                    const age = new Date().getFullYear() - birthDate.getFullYear();
                    ageGroup = getAgeGroup(age);
                  }
                }
              }
            } catch (err) {
              console.error("Gagal memuat profil user", err);
            }
          }

          // Kumpulkan Statistik Global untuk Grafik
          const kategori = report.kategori_id || 'Lainnya';
          catStats[kategori] = (catStats[kategori] || 0) + 1;
          ageStats[ageGroup] = (ageStats[ageGroup] || 0) + 1;
          eduStats[edu] = (eduStats[edu] || 0) + 1;

          if (report.created_at) {
            let date;
            if (typeof report.created_at.toDate === 'function') {
                date = report.created_at.toDate();
            } else {
                date = new Date(report.created_at);
            }
            
            if (date && !isNaN(date.getTime())) {
                const month = date.toLocaleString('id-ID', { month: 'short' });
                if (!monthStats[month]) monthStats[month] = { bulan: month, kasus: 0, selesai: 0 };
                
                monthStats[month].kasus += 1;
                if (report.status_id === 'selesai') {
                  monthStats[month].selesai += 1;
                }
            }
          }

          // 2. Cek apakah kasus ini ditugaskan ke konselor yang sedang login
          let isAssignedToMe = false;
          
          try {
            const konselorSnap = await getDocs(collection(db, `laporan/${reportId}/konselor`));
            konselorSnap.forEach(kDoc => {
              if (kDoc.data().konselor_id === currentUserId) {
                isAssignedToMe = true; 
              }
            });
          } catch (err) {
            console.error("Gagal cek subcollection konselor", err);
          }

          let dateFormatted = '-';
          if (report.created_at) {
              if (typeof report.created_at.toDate === 'function') {
                  dateFormatted = report.created_at.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              } else {
                  dateFormatted = new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              }
          }

          const finalReportData = {
            id: reportId,
            ...report,
            reporterName,
            reporterEmail,
            dateFormatted
          };

          // 3. Masukkan ke daftar jika ini adalah kasus miliknya
          if (isAssignedToMe) {
            tempAssigned.push(finalReportData);
            
            // Hitung Rating Jika Laporan Ini Dinilai
            if (report.is_rated && report.rating) {
              totalRatingSum += report.rating;
              reviewCount += 1;
            }
          }
        }

        // Hitung Rata-rata Rating
        if (reviewCount > 0) {
          setCounselorRating({
            average: (totalRatingSum / reviewCount).toFixed(1),
            totalReviews: reviewCount
          });
        }

        // Format data untuk Recharts (Grafik tidak dihapus!)
        setViolenceTypeData(Object.entries(catStats).map(([name, jumlah]) => ({ name, jumlah })));
        setAgeData(Object.entries(ageStats).filter(([, val]) => val > 0).map(([name, jumlah]) => ({ name, jumlah })));
        setEducationData(Object.entries(eduStats).map(([name, jumlah]) => ({ name, jumlah })));
        setMonthlyData(Object.values(monthStats));

        // Urutkan laporan terbaru di atas
        tempAssigned.sort((a, b) => {
            const aTime = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at).getTime();
            const bTime = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at).getTime();
            return bTime - aTime;
        });
        
        setAssignedComplaints(tempAssigned);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-800 border border-green-200">SELESAI</span>;
      case 'ditolak':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-red-100 text-red-800 border border-red-200">DITOLAK</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-800 border border-gray-200">{status || 'UNKNOWN'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#4B2C82] animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Menganalisis data laporan masyarakat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-2xl shadow-lg border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
        <div className="p-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black mb-1">Dashboard Analisis</h1>
              <p className="text-purple-200 font-medium">
                Pusat statistik dan ringkasan prioritas penanganan pengaduan Anda.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards (Disesuaikan menjadi 4 kartu terkait beban kerja konselor) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* WIDGET RATING */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-sm border border-yellow-200 p-6 flex flex-col justify-center items-center text-center">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <p className="text-xs font-black text-yellow-700 uppercase tracking-widest">Rating Anda</p>
          </div>
          <div className="flex items-end gap-1 mb-1">
            <p className="text-4xl font-black text-yellow-600">{counselorRating.average}</p>
            <p className="text-sm font-bold text-yellow-500 mb-1">/ 5</p>
          </div>
          <p className="text-xs font-medium text-yellow-600 bg-white px-2 py-0.5 rounded-md border border-yellow-100 shadow-sm">
            {counselorRating.totalReviews} Ulasan Klien
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Tugas Kasus</p>
          <p className="text-4xl font-black text-gray-800">{assignedComplaints.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-[#4B2C82] uppercase tracking-widest mb-2">Sedang Aktif Ditangani</p>
          <p className="text-4xl font-black text-[#4B2C82]">
            {assignedComplaints.filter(c => c.status_id !== 'selesai' && c.status_id !== 'ditolak').length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Kasus Selesai</p>
          <p className="text-4xl font-black text-green-600">
            {assignedComplaints.filter(c => c.status_id === 'selesai').length}
          </p>
        </div>
      </div>

      {/* Grafik Statistik Tetap Dipertahankan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Kekerasan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 min-h-[105px] flex flex-col justify-center">
            <h3 className="text-lg font-black text-[#4B2C82] leading-tight">Statistik Laporan Berdasarkan Jenis Kekerasan</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Grafik jumlah laporan berdasarkan jenis kekerasan secara keseluruhan.</p>
          </div>
          <div className="p-6 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violenceTypeData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <Tooltip cursor={{ fill: '#f5f3ff' }} contentStyle={{ borderRadius: '8px' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="jumlah" fill="#8b5cf6" name="jumlah" maxBarSize={50} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Usia */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 min-h-[105px] flex flex-col justify-center">
            <h3 className="text-lg font-black text-[#4B2C82] leading-tight">Statistik Laporan Berdasarkan Usia</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Grafik jumlah laporan berdasarkan usia pelapor secara keseluruhan.</p>
          </div>
          <div className="p-6 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <Tooltip cursor={{ fill: '#f5f3ff' }} contentStyle={{ borderRadius: '8px' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="jumlah" fill="#8b5cf6" name="jumlah" maxBarSize={50} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Pendidikan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 min-h-[105px] flex flex-col justify-center">
            <h3 className="text-lg font-black text-[#4B2C82] leading-tight">Statistik Laporan Berdasarkan Pendidikan</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Grafik jumlah laporan berdasarkan pendidikan terakhir pelapor.</p>
          </div>
          <div className="p-6 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={educationData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <Tooltip cursor={{ fill: '#f5f3ff' }} contentStyle={{ borderRadius: '8px' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="jumlah" fill="#8b5cf6" name="jumlah" maxBarSize={50} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Tren Bulanan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 min-h-[105px] flex flex-col justify-center">
            <h3 className="text-lg font-black text-[#4B2C82] leading-tight">Trend Laporan Bulanan</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Grafik jumlah keseluruhan laporan masuk dan kasus selesai per bulan.</p>
          </div>
          <div className="p-6 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={true} tickLine={true} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="kasus" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="kasus" activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="selesai" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="selesai" activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Kasus yang Saya Tangani (Sekarang Tabel Utamanya Hanya Ini) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="text-lg font-black text-[#4B2C82]">Tugas Kasus Saat Ini</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Daftar laporan masyarakat di bawah pendampingan Anda.</p>
        </div>
        <div>
          {assignedComplaints.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#4B2C82] opacity-50" />
              </div>
              <p className="font-medium">Anda belum menerima penugasan kasus apapun dari Admin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#4B2C82]/5 border-b border-purple-100">
                  <tr>
                    <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Tanggal Masuk</th>
                    <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Pelapor</th>
                    <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest">Judul & Kategori</th>
                    <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Status Penanganan</th>
                    <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assignedComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-800">{complaint.dateFormatted}</p>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-800">{complaint.reporterName}</p>
                        <p className="text-xs text-gray-500 font-medium">{complaint.reporterEmail}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{complaint.judul}</p>
                        <span className="bg-purple-50 text-[#4B2C82] border border-purple-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest inline-block">
                          {complaint.kategori_id}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(complaint.status_id)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          className="bg-purple-50 hover:bg-[#4B2C82] text-[#4B2C82] hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-2"
                          onClick={() => navigate('/konselor/complaints')}
                        >
                          <Eye className="w-4 h-4" />
                          Kelola
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}