import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { Edit, Trash2, UserPlus, Search, X, Loader2, ShieldCheck, User, Star, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [rolesIdMap, setRolesIdMap] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // States Modal Tambah
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', email: '', role: 'masyarakat', phone: '', address: '', spesialisasi: [],
  });

  // States Modal Edit
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "roles"));
        const tempRolesMap = {}; 
        const tempRolesIdMap = {};
        
        rolesSnap.forEach(doc => {
          const roleName = doc.data().nama_role.toLowerCase();
          tempRolesMap[doc.id] = doc.data().nama_role; 
          tempRolesIdMap[roleName] = doc.id;
        });
        
        setRolesIdMap(tempRolesIdMap); 

        const usersSnap = await getDocs(collection(db, "users"));
        const fetchedUsers = [];
        
        for (const docSnap of usersSnap.docs) {
          const userData = docSnap.data();
          const userId = docSnap.id;
          let roleName = tempRolesMap[userData.role_id] || 'Unknown';
          
          if (userData.role_id === 'ID_ROLE_MASYARAKAT' || roleName.toLowerCase() === 'id_role_masyarakat') {
            roleName = 'masyarakat';
          }
          
          if (roleName.toLowerCase() !== 'admin') {
            let averageRating = 0;
            let totalReviews = 0;

            if (roleName.toLowerCase() === 'konselor') {
              try {
                const laporanSnap = await getDocs(collection(db, "laporan"));
                for (const lDoc of laporanSnap.docs) {
                  const lData = lDoc.data();
                  const kRef = collection(db, `laporan/${lDoc.id}/konselor`);
                  const qKonselor = query(kRef, where("konselor_id", "==", userId));
                  const kSnap = await getDocs(qKonselor);

                  if (!kSnap.empty && lData.is_rated && lData.rating) {
                    averageRating += lData.rating;
                    totalReviews += 1;
                  }
                }
                if (totalReviews > 0) {
                  averageRating = (averageRating / totalReviews).toFixed(1);
                }
              } catch (e) {
                console.error("Gagal mengambil rating konselor:", e);
              }
            }

            fetchedUsers.push({
              id: userId,
              ...userData,
              roleName: roleName,
              averageRating: averageRating,
              totalReviews: totalReviews,
              spesialisasi: userData.spesialisasi || '' 
            });
          }
        }
        
        fetchedUsers.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Gagal memuat data:", error);
        toast.error("Gagal memuat data pengguna.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsersData();
  }, [refreshTrigger]); 

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.roleName?.toLowerCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (user) => {
    const role = user.roleName?.toLowerCase();
    if (role === 'masyarakat') {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-blue-100 text-blue-800 border border-blue-200 w-fit">MASYARAKAT</span>;
    } else if (role === 'konselor') {
      return (
        <div className="flex flex-col gap-1.5 w-fit">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-purple-100 text-[#4B2C82] border border-purple-200 flex items-center gap-1 w-fit">
            <ShieldCheck className="w-3 h-3"/> 
            KONSELOR {user.spesialisasi ? `- ${user.spesialisasi}` : ''}
          </span>
          {user.totalReviews > 0 ? (
             <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-md w-fit" title={`${user.totalReviews} Ulasan`}>
               <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
               {user.averageRating}
             </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md w-fit">
               <Star className="w-3 h-3 text-gray-300" /> Belum dinilai
            </div>
          )}
        </div>
      );
    }
    return <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-800 border border-gray-200">{user.roleName}</span>;
  };

  const getStatusBadge = (status) => {
    return status === 'aktif' 
      ? <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-800 border border-green-200">AKTIF</span>
      : <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-red-100 text-red-800 border border-red-200">NONAKTIF</span>;
  };

  // --- HANDLER TAMBAH USER ---
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone) {
      toast.error("Mohon lengkapi semua data yang wajib!");
      return;
    }

    if (newUser.role === 'konselor') {
      if (!newUser.email.endsWith('@konselor.com')) {
        toast.error("Email Konselor WAJIB menggunakan akhiran @konselor.com!");
        return;
      }
      if (!newUser.spesialisasi || newUser.spesialisasi.length === 0) {
        toast.error("Mohon pilih Bidang Keahlian / Spesialisasi untuk Konselor ini!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let targetRoleId = rolesIdMap[newUser.role];
      if (newUser.role === 'masyarakat' && !targetRoleId) {
        targetRoleId = 'ID_ROLE_MASYARAKAT'; 
      } else if (!targetRoleId) {
        throw new Error(`Role '${newUser.role}' belum dibuat di tabel 'roles' Firebase.`);
      }

      const apps = getApps();
      let secondaryApp = apps.find(a => a.name === "SecondaryApp");
      if (!secondaryApp) {
        secondaryApp = initializeApp(auth.app.options, "SecondaryApp");
      }
      const secondaryAuth = getAuth(secondaryApp);

      const defaultPassword = "password123";
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, defaultPassword);
      await signOut(secondaryAuth); 

      const newUid = userCredential.user.uid;

      await setDoc(doc(db, "users", newUid), {
        role_id: targetRoleId,
        nama: newUser.name,
        email: newUser.email,
        password: defaultPassword, 
        no_hp: newUser.phone,
        alamat: newUser.address || "",
        spesialisasi: newUser.role === 'konselor' ? newUser.spesialisasi : null,
        status_akun: "aktif",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      toast.success(`Akun ${newUser.role} berhasil dibuat dengan password: ${defaultPassword}`);
      setIsAddDialogOpen(false);
      setNewUser({ name: '', email: '', role: 'masyarakat', phone: '', address: '', spesialisasi: [] });
      setRefreshTrigger(prev => prev + 1); 
    } catch (error) {
      console.error("Gagal tambah user:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email tersebut sudah terdaftar di sistem!");
      } else {
        toast.error(error.message || "Terjadi kesalahan sistem saat membuat akun.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLER EDIT USER ---
  const handleEditClick = (user) => {
    setEditingUser({
      id: user.id,
      name: user.nama || '',
      phone: user.no_hp || '',
      role: user.roleName?.toLowerCase() || '',
      spesialisasi: user.spesialisasi || [],
      status_akun: user.status_akun || 'aktif',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser.name || !editingUser.phone) {
      toast.error("Mohon lengkapi Nama dan No. Telepon!");
      return;
    }

    if (editingUser.role === 'konselor' && (!editingUser.spesialisasi || editingUser.spesialisasi.length === 0)) {
      toast.error("Spesialisasi konselor tidak boleh kosong!");
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", editingUser.id);
      
      const updateData = {
        nama: editingUser.name,
        no_hp: editingUser.phone,
        status_akun: editingUser.status_akun,
        updated_at: serverTimestamp()
      };

      if (editingUser.role === 'konselor') {
        updateData.spesialisasi = editingUser.spesialisasi;
      }

      await updateDoc(userRef, updateData);
      
      toast.success("Data pengguna berhasil diperbarui!");
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal update user:", error);
      toast.error("Terjadi kesalahan saat memperbarui data pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLER HAPUS USER ---
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Hapus pengguna "${userName}" dari database sistem secara permanen?\n\nPerhatian: Data ini tidak dapat dikembalikan!`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("Pengguna berhasil dihapus!");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Gagal hapus user:", error);
      toast.error("Terjadi kesalahan saat menghapus pengguna.");
    }
  };

  return (
    <>
      {/* 
        PERBAIKAN: Konten utama dibungkus terpisah dari modal 
        agar modal bisa menggunakan fixed position yang benar (relatif ke viewport)
      */}
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#4B2C82]">Manajemen Akun Pengguna</h2>
            <p className="text-gray-500 font-medium text-sm mt-1">Kelola akun akses masyarakat dan konselor dalam sistem.</p>
          </div>
          <button 
            onClick={() => setIsAddDialogOpen(true)}
            className="btn-modern bg-[#4B2C82] hover:bg-purple-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/20 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-[#4B2C82]" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pengguna</p>
            <p className="text-3xl font-black text-[#4B2C82]">{filteredUsers.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Masyarakat</p>
            <p className="text-3xl font-black text-blue-600">
              {filteredUsers.filter(u => u.roleName?.toLowerCase() === 'masyarakat').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-[#4B2C82]" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Konselor</p>
            <p className="text-3xl font-black text-[#4B2C82]">
              {filteredUsers.filter(u => u.roleName?.toLowerCase() === 'konselor').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
              />
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 h-12 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
            >
              <option value="all">Semua Role</option>
              <option value="masyarakat">Masyarakat</option>
              <option value="konselor">Konselor</option>
            </select>
            <button 
              onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}
              className="w-full h-12 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#4B2C82]/5 border-b border-purple-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Nama & Alamat</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Email</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest">Role & Keahlian</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Telepon</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="py-4 px-6 text-xs font-black text-[#4B2C82] uppercase tracking-widest text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <Loader2 className="w-8 h-8 text-[#4B2C82] animate-spin mx-auto mb-4" />
                      <p className="text-sm font-medium text-gray-500">Memuat data pengguna...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-gray-500 font-medium">Tidak ada data pengguna ditemukan.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-gray-800">{user.nama}</p>
                        {user.alamat && (
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5 truncate max-w-[200px]">📍 {user.alamat}</p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-gray-700">{user.email}</p>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getRoleBadge(user)}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-gray-700 whitespace-nowrap">
                        {user.no_hp || '-'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(user.status_akun || 'aktif')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditClick(user)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Pengguna"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.nama)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* =======================================
          PERBAIKAN: MODAL DI LUAR ANIMATE DIV 
          ======================================= */}
      {/* Modal Tambah Pengguna */}
      <AnimatePresence>
        {isAddDialogOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-[#4B2C82]">Tambah Pengguna</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Daftarkan akun masyarakat atau konselor baru.</p>
                </div>
                <button onClick={() => setIsAddDialogOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 h-11 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder={newUser.role === 'konselor' ? "nama@konselor.com" : "email@contoh.com"}
                    className="w-full px-4 h-11 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                  />
                  {newUser.role === 'konselor' && (
                    <p className="text-[10px] text-orange-500 font-bold">* Email konselor harus diakhiri dengan @konselor.com</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Role (Hak Akses)</label>
                  <select 
                    value={newUser.role} 
                    onChange={(e) => {
                      setNewUser({ ...newUser, role: e.target.value, spesialisasi: [] }) 
                    }}
                    className="w-full px-4 h-11 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm font-bold text-[#4B2C82]"
                  >
                    <option value="masyarakat">Masyarakat</option>
                    <option value="konselor">Konselor</option>
                  </select>
                </div>

                {newUser.role === 'konselor' && (
                  <div className="space-y-2 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <label className="text-xs font-bold text-purple-900 uppercase tracking-widest block mb-2">Pilih Keahlian (Bisa Lebih Dari Satu)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['Hukum / Paralegal', 'Psikologi / Klinis', 'Agama / Rohani', 'Pekerja Sosial'].map(skill => (
                        <label key={skill} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newUser.spesialisasi?.includes(skill)}
                            onChange={(e) => {
                              const current = newUser.spesialisasi || [];
                              const updated = e.target.checked 
                                ? [...current, skill] 
                                : current.filter(s => s !== skill);
                              setNewUser({ ...newUser, spesialisasi: updated });
                            }}
                            className="w-4 h-4 text-[#4B2C82] rounded focus:ring-[#4B2C82]"
                          />
                          {skill}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-4 h-11 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                  />
                </div>
                
                {newUser.role === 'masyarakat' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alamat (Khusus Masyarakat)</label>
                    <textarea
                      value={newUser.address}
                      onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                      placeholder="Alamat lengkap tempat tinggal"
                      className="w-full p-3 h-20 resize-none rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#4B2C82] focus:ring-1 focus:ring-[#4B2C82] text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 bg-white shrink-0">
                <button 
                  onClick={handleAddUser}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[#4B2C82] hover:bg-purple-900 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Pengguna & Buat Akun"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edit Pengguna */}
      <AnimatePresence>
        {isEditDialogOpen && editingUser && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-blue-600">Edit Pengguna</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Perbarui profil dan status pengguna.</p>
                </div>
                <button onClick={() => setIsEditDialogOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
                <div className="bg-orange-50 text-orange-800 p-3 rounded-xl border border-orange-100 flex items-start gap-2 mb-2 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
                  <p>Email dan Hak Akses (Role) sengaja dikunci untuk mencegah kerusakan kredensial login pengguna.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-4 h-11 rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-4 h-11 rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>

                {editingUser.role === 'konselor' && (
                  <div className="space-y-2 p-4 bg-purple-50 rounded-xl border border-purple-100 mt-2">
                    <label className="text-xs font-bold text-purple-900 uppercase tracking-widest block mb-2">Pilih Keahlian (Bisa Lebih Dari Satu)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['Hukum / Paralegal', 'Psikologi / Klinis', 'Agama / Rohani', 'Pekerja Sosial'].map(skill => (
                        <label key={skill} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={editingUser.spesialisasi?.includes(skill)}
                            onChange={(e) => {
                              const current = editingUser.spesialisasi || [];
                              const updated = e.target.checked 
                                ? [...current, skill] 
                                : current.filter(s => s !== skill);
                              setEditingUser({ ...editingUser, spesialisasi: updated });
                            }}
                            className="w-4 h-4 text-[#4B2C82] rounded focus:ring-[#4B2C82]"
                          />
                          {skill}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-4 border-t border-gray-100 pt-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Akun</label>
                  <select 
                    value={editingUser.status_akun} 
                    onChange={(e) => setEditingUser({ ...editingUser, status_akun: e.target.value })}
                    className={`w-full px-4 h-11 rounded-xl border focus:outline-none text-sm font-bold ${editingUser.status_akun === 'aktif' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                  >
                    <option value="aktif">Aktif (Dapat Login)</option>
                    <option value="nonaktif">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleUpdateUser}
                  disabled={isSubmitting}
                  className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Perubahan"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}