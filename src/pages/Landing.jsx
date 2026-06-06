import { useState, useEffect } from "react";
import { 
  Menu, X, ChevronRight, MapPin, Phone, Mail, Clock, 
  Hash, PlayCircle, 
  Calendar, ArrowRight,
  Smartphone, Zap,
  ChevronUp, ChevronDown, Loader2
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion"; 
import BannerSlider from "../components/BannerSlider"; 
// --- 1. IMPORT WIDGET AI DI SINI ---
import AiChatWidget from "../components/AiChatWidget"; 
import "./Landing.css";

export default function Landing({ onStart, onAbout, onHelp, onStats }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  
  // --- STATE ---
  const [visibleNewsCount, setVisibleNewsCount] = useState(3);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE BERITA DINAMIS ---
  // --- STATE BERITA DINAMIS ---
  const [newsData, setNewsData] = useState([{ id: 1, title: "Memuat berita trending...", link: "#" }]);
  const [fullNewsData, setFullNewsData] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // --- DATA CADANGAN (FALLBACK) ---
  // Data ini akan otomatis muncul jika API web dinas gagal diakses (CORS/Offline)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fallbackNews = [
    {
      id: 1,
      image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj20v8yoRstj0ilYUFdsD4loc1CtBU1ByrKSpqCoKGPGOofhG6SLycEzaMGyT2Ttf8LZ_5dQXbiXTXX53xU9k106H1v7r6_fEUwl801XLLII4odZBS1heQj2krmxLMi2sN1T8f8RQF-unT72tUQS052sAxFwTlwBsQYK5S_oXjMBwUjFfNLymKq-W_7edo/w640-h480-rw/IMG_1178.HEIC",
      title: "Kampanye 16 Hari Anti Kekerasan Terhadap Perempuan dan Anak",
      date: "Desember 02, 2025",
      desc: "DPPPA Kota Banjarmasin menggelar kampanye serentak sebagai bentuk komitmen mengakhiri kekerasan terhadap perempuan dan anak.",
      link: "https://dpppa.banjarmasinkota.go.id/2025/12/kampanye-16-hari-anti-kekerasan.html"
    },
    {
      id: 2,
      image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgTAPaBvpAkHgDWXQgvlNgkcFOvQw40xa44c92AoFz5bNVb5BYApdPMl469VUr9BvyiWmWa1gwvyZoa3oxGYlZzq-9wYlsAxS7NhwJVyRWGhSsuSRn8NDLjIAxWH5F59DhIeqtXykHz1aoFB4PpMAU_6M46dDUim3IVE2Zp3I-rWtr4oTGsBIlBe-LJymg/w512-h640-rw/SnapInsta.to_588512863_18175237591367406_4792646108763604928_n.jpg",
      title: "Pendampingan Unit Penyedia Layanan Teknis Berkelanjutan",
      date: "November 28, 2025",
      desc: "Optimalisasi peran unit layanan dalam penanganan kasus melalui pendampingan teknis yang berkelanjutan.",
      link: "https://dpppa.banjarmasinkota.go.id/2025/11/pendampingan-unit-penyedia-layanan.html"
    },
    {
      id: 3,
      image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhvumMWDBTpXCnXcdl09GwmGNnFkKzCy9NM7NI1IIXMFFKrhgrGsIOwNxR3X6Nw4KMchCI9oBaHSZmyPtzFXICGPNLTzIWzclMCCEghc__8-7lV1Eq-MeYOrMuhzhVAERFcXBWUvlPhqcXg4Z1lnvpygeCJTZU3ZyTCmgrv_4fhUkR0dJ7kTN9wevWZ_UQ/w640-h428-rw/WhatsApp%20Image%202025-11-26%20at%2013.32.07.jpeg",
      title: "Penetapan Peraturan Daerah Kota Banjarmasin Terbaru",
      date: "November 28, 2025",
      desc: "Penetapan regulasi daerah terbaru untuk memperkuat landasan hukum perlindungan anak dan pemberdayaan perempuan di Banjarmasin.",
      link: "https://dpppa.banjarmasinkota.go.id/2025/11/penetapan-peraturan-daerah-kota.html"
    }
  ];

  // --- FETCH BERITA DARI WEB RESMI (BLOGGER API) ---
  useEffect(() => {
    const fetchBloggerNews = async () => {
      try {
        const response = await fetch('https://dpppa.banjarmasinkota.go.id/feeds/posts/default?alt=json');
        
        if (!response.ok) {
          throw new Error("Jaringan memblokir request (CORS) atau web lambat.");
        }

        const data = await response.json();
        
        if (data && data.feed && data.feed.entry) {
          const parsedNews = data.feed.entry.map((entry, index) => {
            const linkObj = entry.link.find(l => l.rel === 'alternate');
            const link = linkObj ? linkObj.href : '#';

            const pubDate = new Date(entry.published.$t);
            const options = { year: 'numeric', month: 'long', day: '2-digit' };
            const formattedDate = pubDate.toLocaleDateString('id-ID', options);

            let imageUrl = '/pemkot.png';
            if (entry.media$thumbnail) {
               imageUrl = entry.media$thumbnail.url.replace(/\/s\d+-c/, '/w640');
            } else if (entry.content && entry.content.$t) {
               const imgRegex = /<img[^>]+src="([^">]+)"/;
               const match = entry.content.$t.match(imgRegex);
               if (match) imageUrl = match[1];
            }

            let desc = '';
            if (entry.content && entry.content.$t) {
               const tmp = document.createElement("DIV");
               tmp.innerHTML = entry.content.$t;
               desc = tmp.textContent || tmp.innerText || "";
               desc = desc.substring(0, 120) + '...';
            }

            return {
              id: index + 1,
              title: entry.title.$t,
              link: link,
              date: formattedDate,
              image: imageUrl,
              desc: desc
            };
          });

          setFullNewsData(parsedNews);
          setNewsData(parsedNews.slice(0, 5)); 
        }
      } catch (error) {
        console.warn("API Gagal ditarik, menggunakan data cadangan:", error);
        // JIKA GAGAL: Masukkan data dummy yang sudah kamu siapkan
        setFullNewsData(fallbackNews);
        setNewsData(fallbackNews.slice(0, 5));
      } finally {
        setIsLoadingNews(false);
      }
    };

    fetchBloggerNews();
  }, [fallbackNews]);

  // --- LOGIKA DARK MODE ---
  // (Removed dark/light mode state and toggle)

  // --- FETCH BERITA DARI WEB RESMI (BLOGGER API) ---
  useEffect(() => {
    const fetchBloggerNews = async () => {
      try {
        const response = await fetch('https://dpppa.banjarmasinkota.go.id/feeds/posts/default?alt=json');
        const data = await response.json();
        
        if (data && data.feed && data.feed.entry) {
          const parsedNews = data.feed.entry.map((entry, index) => {
            // 1. Ambil Link Berita
            const linkObj = entry.link.find(l => l.rel === 'alternate');
            const link = linkObj ? linkObj.href : '#';

            // 2. Format Tanggal
            const pubDate = new Date(entry.published.$t);
            const options = { year: 'numeric', month: 'long', day: '2-digit' };
            const formattedDate = pubDate.toLocaleDateString('id-ID', options);

            // 3. Ambil Gambar
            let imageUrl = '/pemkot.png';
            if (entry.media$thumbnail) {
               imageUrl = entry.media$thumbnail.url.replace(/\/s\d+-c/, '/w640');
            } else if (entry.content && entry.content.$t) {
               const imgRegex = /<img[^>]+src="([^">]+)"/;
               const match = entry.content.$t.match(imgRegex);
               if (match) imageUrl = match[1];
            }

            // 4. Ambil Deskripsi Singkat
            let desc = '';
            if (entry.content && entry.content.$t) {
               const tmp = document.createElement("DIV");
               tmp.innerHTML = entry.content.$t;
               desc = tmp.textContent || tmp.innerText || "";
               desc = desc.substring(0, 120) + '...';
            }

            return {
              id: index + 1,
              title: entry.title.$t,
              link: link,
              date: formattedDate,
              image: imageUrl,
              desc: desc
            };
          });

          setFullNewsData(parsedNews);
          setNewsData(parsedNews.slice(0, 5)); // Ambil 5 terbaru untuk trending
        }
      } catch (error) {
        console.error("Gagal mengambil berita otomatis:", error);
      } finally {
        setIsLoadingNews(false);
      }
    };

    fetchBloggerNews();
  }, []);

  // --- LOGIKA TRENDING ---
  const handleNextNews = () => {
    if (newsData.length > 0) {
      setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % newsData.length);
    }
  };

  const handlePrevNews = () => {
    if (newsData.length > 0) {
      setCurrentNewsIndex((prevIndex) => (prevIndex === 0 ? newsData.length - 1 : prevIndex - 1));
    }
  };

  useEffect(() => {
    if (newsData.length === 0) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % newsData.length);
    }, 4000); 
    return () => clearInterval(interval);
  }, [newsData.length]);

  const currentNews = newsData.length > 0 ? newsData[currentNewsIndex] : null;

  // --- LOGIKA LOAD MORE BERITA ---
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleNewsCount((prev) => prev + 3);
      setIsLoadingMore(false);
    }, 1500);
  };

  // --- VARIAN ANIMASI ---
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const fadeInDown = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setSidebarOpen(false);
    }
  };

  // ============================================
  // --- HANDLER NAVIGASI ---
  // ============================================

  const handleLoginClick = () => {
    setSidebarOpen(false);
    setIsLoading(true); 
    setTimeout(() => {
      setIsLoading(false);
      onStart(); 
    }, 2000);
  };

  const handleInstantNav = (action) => {
    setSidebarOpen(false);
    if (action) action();
  };

  const handleAbout = () => handleInstantNav(onAbout);
  const handleHelp = () => handleInstantNav(onHelp);
  const handleStats = () => handleInstantNav(onStats);
  
  // ============================================

  const sidebarVideos = [
    { id: "qOep768DpOg", title: "Kegiatan DP3A" },
    { id: "Qc5l3FLxzF0", title: "Sosialisasi" }
  ];

  const mainTags = [
    "Kekerasan Anak", "KDRT", "Perempuan", "Konseling", 
    "Hukum", "Banjarmasin", "Pengaduan", "Sosialisasi", "Edukasi"
  ];

  return (
    <div className="landing-container overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="custom-loading-screen">
          <div className="custom-loader-content">
            <div className="sipd-loader">
              <div className="sipd-rect sipd-shape"></div>
              <div className="sipd-square sipd-shape"></div>
              <div className="sipd-square sipd-shape"></div>
            </div>
            <p className="loading-text-main">
              Mohon tunggu... Sedang menyiapkan halaman masuk. 
              <span className="loading-link"> Selengkapnya</span>
            </p>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <motion.nav 
        className="landing-navbar bg-white dark:bg-[#0f172a] shadow-lg border-b border-gray-200 dark:border-slate-800"
        initial="hidden" animate="visible" variants={fadeInDown}
      >
        <div className="nav-left flex items-center">
          <img src="/pemkot.png" alt="logo" className="logo w-10 h-10 sm:w-12 sm:h-12" />
          
          <div className="nav-divider h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div> 

          <div className="nav-text flex flex-col justify-center text-left">
            <h1 
              className="text-sm font-black sm:text-lg text-[#4B2C82] dark:text-purple-400 leading-none !block"
              style={{ display: 'block', opacity: 1, visibility: 'visible' }}
            >
              Portal DP3A
            </h1>
            <p 
              className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight mt-0.5 !block"
              style={{ display: 'block', opacity: 1, visibility: 'visible' }}
            >
              Layanan Pengaduan Masyarakat
            </p>
          </div>
        </div>

        {/* MENU DESKTOP */}
        <div className="nav-right desktop-menu flex items-center">
          <ul className="nav-links flex gap-4 text-[14px] font-medium mr-5 items-center text-slate-600 dark:text-slate-300">
            <li className="nav-item cursor-pointer hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors" onClick={handleAbout}>Tentang Aplikasi</li>
            <li className="nav-item cursor-pointer hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors" onClick={handleStats}>Statistik Layanan</li>
            <li className="nav-item cursor-pointer hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors" onClick={() => scrollToSection('berita')}>Berita</li>
            <li className="nav-item cursor-pointer hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors" onClick={() => scrollToSection('profil')}>Profil Dinas</li>
            <li className="nav-item cursor-pointer hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors" onClick={() => scrollToSection('kontak')}>Kontak</li>
            <li className="nav-item cursor-pointer hover:text-[#4B2C82] dark:hover:text-purple-400 transition-colors" onClick={handleHelp}>Bantuan</li>
          </ul>
          
          <div className="flex items-center gap-3">
            <button 
              className="px-5 py-2.5 bg-[#4B2C82] hover:bg-purple-900 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all" 
              onClick={handleLoginClick}
            >
              Masuk / Daftar
            </button>
          </div>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex items-center gap-3 md:hidden">
          <button className="mobile-menu-btn text-[#4B2C82] dark:text-purple-400" onClick={() => setSidebarOpen(true)}>
            <Menu size={28} />
          </button>
        </div>

        <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>

        {/* SIDEBAR MOBILE */}
        <div className={`mobile-sidebar ${isSidebarOpen ? 'active' : ''}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title text-[#4B2C82] dark:text-purple-400 font-black">Menu Utama</h3>
            <button onClick={() => setSidebarOpen(false)} className="close-btn text-gray-500"><X size={24} /></button>
          </div>
          <ul className="sidebar-list">
            <li onClick={handleAbout}><span>Tentang Aplikasi</span><ChevronRight size={16} /></li>
            <li onClick={handleStats}><span>Statistik Layanan</span><ChevronRight size={16} /></li>
            <li onClick={() => { scrollToSection('berita'); setSidebarOpen(false); }}><span>Berita</span><ChevronRight size={16} /></li>
            <li onClick={() => { scrollToSection('profil'); setSidebarOpen(false); }}><span>Profil Dinas</span><ChevronRight size={16} /></li>
            <li onClick={() => { scrollToSection('kontak'); setSidebarOpen(false); }}><span>Kontak</span><ChevronRight size={16} /></li>
            <li onClick={handleHelp}><span>Bantuan</span><ChevronRight size={16} /></li>
            <li className="sidebar-btn-container">
              <button className="sidebar-login-btn !bg-[#4B2C82] hover:!bg-purple-900 font-bold" onClick={handleLoginClick}>
                Masuk / Daftar
              </button>
            </li>
          </ul>
          <div className="sidebar-footer"><p>© 2025 DPPPA Banjarmasin</p></div>
        </div>
      </motion.nav>

      {/* BANNER SLIDER */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        whileInView={{ opacity: 1, scale: 1 }} 
        viewport={{ once: true }} 
        transition={{ duration: 0.8 }} 
        className="relative z-0"
      >
        <BannerSlider />
      </motion.div>

      {/* BOX TRENDING */}
      <div className="w-full py-6 relative z-10 -mt-10 mb-4 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="trending-box rounded-xl p-4 flex items-center shadow-lg relative overflow-hidden transition-colors duration-300 h-16 bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700">
            <div className="text-[#4B2C82] dark:text-purple-400 font-black text-sm md:text-base mr-4 shrink-0 flex items-center">
              <Zap size={18} className="mr-2 fill-current" />
              Trending:
            </div>
            <div className="flex-1 h-[24px] md:h-[28px] overflow-hidden relative">
              <AnimatePresence mode="wait">
                {currentNews && (
                  <motion.a
                    key={currentNews?.id}
                    href={currentNews?.link}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="trending-text absolute truncate w-full text-xs md:text-sm font-semibold block leading-normal transition-colors text-gray-700 hover:text-[#4B2C82] dark:text-slate-300 dark:hover:text-purple-400"
                  >
                    {currentNews?.title}
                  </motion.a>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col gap-1 ml-4 shrink-0 justify-center">
               <button onClick={handlePrevNews} className="trending-arrow transition-colors p-0.5 text-gray-400 hover:text-[#4B2C82]" title="Berita Sebelumnya"><ChevronUp size={16} /></button>
               <button onClick={handleNextNews} className="trending-arrow transition-colors p-0.5 text-gray-400 hover:text-[#4B2C82]" title="Berita Selanjutnya"><ChevronDown size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* ===========================
          HERO SECTION
      =========================== */}
      <section className="landing-hero relative z-0">
        <motion.div 
          className="hero-box-container"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={staggerContainer}
        >
          <motion.div className="hero-left-img" variants={fadeInUp}>
            <motion.img 
              src="/vektor.png" 
              alt="illustration" 
              className="hero-img"
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          
          <motion.div 
            className="hero-right-text flex flex-col items-center sm:items-start text-center sm:text-left" 
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 text-[#4B2C82] border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 text-sm font-bold mb-4">
              <Smartphone size={16} />
              <span>Portal Resmi DP3A Banjarmasin</span>
            </div>

            <h3 className="hero-subtitle !text-[#4B2C82] dark:!text-purple-400 font-black">DPPPA KOTA BANJARMASIN</h3>
            <h2 className="hero-title text-slate-800 dark:text-white">Ayo <span>Berani</span> Bicara</h2>
            <p className="hero-desc text-slate-600 dark:text-slate-300">
              Layanan Pengaduan Kekerasan Terhadap Perempuan & Anak Kota Banjarmasin. Bersama kita lindungi dan ciptakan lingkungan yang aman.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto items-center sm:items-start justify-center sm:justify-start">
              <motion.button 
                className="flex items-center justify-center px-10 py-3.5 rounded-full font-black bg-[#4B2C82] hover:bg-purple-900 text-white shadow-lg shadow-purple-900/30 transition-all w-full sm:w-auto min-w-[200px]"
                onClick={handleLoginClick} 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                Lapor Sekarang!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* BERITA SECTION */}
      <motion.section 
        className="news-section relative z-0" id="berita" 
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}
      >
        <div className="profile-container">
          <div className="section-header text-center mb-10">
            <h2 className="profile-title !text-[#4B2C82] dark:!text-purple-400 font-black">Berita Terkini</h2>
            <div className="title-underline mx-auto !bg-[#4B2C82]"></div>
            <p className="text-slate-500 mt-2 text-sm dark:text-slate-400 font-medium">Informasi terbaru seputar kegiatan dan layanan DPPPA</p>
          </div>

          {isLoadingNews ? (
            <div className="flex justify-center items-center w-full py-16">
               <Loader2 className="animate-spin text-[#4B2C82] dark:text-purple-400" size={48} />
               <span className="ml-3 text-slate-600 dark:text-slate-300 font-medium">Menarik data terbaru dari website dinas...</span>
            </div>
          ) : (
            <>
              <div className="news-grid">
                {fullNewsData.slice(0, visibleNewsCount).map((item) => (
                  <motion.div 
                    key={item.id} 
                    className="news-card group border border-gray-100 dark:border-slate-800"
                    whileHover={{ y: -5 }}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
                  >
                    <div className="news-image-wrapper">
                      <img src={item.image} alt={item.title} className="news-image" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                      <div className="news-overlay"><a href={item.link} target="_blank" rel="noreferrer" className="read-more-btn !bg-[#4B2C82] hover:!bg-purple-900">Baca Berita</a></div>
                    </div>
                    <div className="news-content bg-white dark:bg-slate-800">
                      <div className="news-date text-[#4B2C82] dark:text-purple-400 font-bold"><Calendar size={14} className="mr-1" />{item.date}</div>
                      <h3 className="news-title text-gray-800 dark:text-white font-bold hover:text-[#4B2C82] transition-colors"><a href={item.link} target="_blank" rel="noreferrer">{item.title}</a></h3>
                      <p className="news-desc text-gray-500 dark:text-gray-400">{item.desc}</p>
                      <a href={item.link} target="_blank" rel="noreferrer" className="news-link text-[#4B2C82] dark:text-purple-400 font-bold hover:text-purple-900 transition-colors">Selengkapnya <ArrowRight size={14} className="ml-1" /></a>
                    </div>
                  </motion.div>
                ))}
              </div>

              {visibleNewsCount < fullNewsData.length && (
                <div className="text-center mt-10">
                  <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-6 py-2.5 bg-purple-50 dark:bg-slate-800 text-[#4B2C82] dark:text-purple-400 border border-purple-200 dark:border-slate-700 rounded-full font-bold hover:bg-purple-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center mx-auto">
                    {isLoadingMore ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    {isLoadingMore ? "Memuat..." : "Muat postingan lainnya!"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.section>

      {/* PROFIL & SIDEBAR */}
      <motion.section 
        className="profile-section relative z-0 bg-white dark:bg-[#0f172a]" id="profil"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8 }} variants={fadeInUp}
      >
        <div className="profile-container">
          <div className="profile-layout">
            <div className="profile-main">
              <div className="section-header">
                <h2 className="profile-title !text-[#4B2C82] dark:!text-purple-400 font-black">Profil DPPPA Kota Banjarmasin</h2>
                <div className="title-underline !bg-[#4B2C82]"></div>
              </div>
              <div className="video-wrapper rounded-2xl overflow-hidden shadow-lg border border-purple-100 dark:border-slate-800">
                <iframe src="https://drive.google.com/file/d/1gS9xtQnsRaMc4lKkD9sUnJEvrJw1fBiA/preview?usp=sharing" title="Video Profil DPPPA" allow="autoplay" allowFullScreen></iframe>
              </div>
              <p className="profile-desc text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Dinas Pemberdayaan Perempuan dan Perlindungan Anak (DPPPA) Kota Banjarmasin merupakan unsur pelaksana urusan pemerintahan yang menjadi kewenangan daerah di bidang pemberdayaan perempuan dan perlindungan anak.
                <br /><br />
                Kami berkomitmen mewujudkan kesetaraan gender, perlindungan hak perempuan, serta pemenuhan hak anak demi terciptanya masyarakat kota yang inklusif, aman, dan sejahtera.
              </p>
            </div>
            <div className="profile-sidebar">
              <div className="sidebar-widget bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                <h3 className="widget-title flex items-start text-gray-800 dark:text-white font-bold border-b border-gray-200 dark:border-slate-700 pb-3 mb-4">
                  <PlayCircle size={24} className="inline mr-2 text-red-600 flex-shrink-0" />
                  <span className="text-sm md:text-base leading-tight">Komunikasi FISIP ULM x DPPPA Kota Banjarmasin</span>
                </h3>
                <div className="sidebar-video-list space-y-4">
                  {sidebarVideos.map((video, index) => (
                    <div key={index} className="sidebar-video-item rounded-xl overflow-hidden shadow-md">
                      <iframe src={`https://www.youtube.com/embed/${video.id}`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sidebar-widget bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm mt-6">
                <h3 className="widget-title text-gray-800 dark:text-white font-bold border-b border-gray-200 dark:border-slate-700 pb-3 mb-4"><Hash size={20} className="inline mr-2 text-[#4B2C82] dark:text-purple-400" />Tag Utama</h3>
                <div className="tags-cloud flex flex-wrap gap-2">
                  {mainTags.map((tag, index) => (
                    <motion.span key={index} className="tag-item bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" whileHover={{ scale: 1.05, backgroundColor: "#4B2C82", color: "#fff", borderColor: "#4B2C82" }}>{tag}</motion.span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FOOTER */}
      <motion.footer 
        className="landing-footer relative z-0 bg-[#4B2C82] text-white pt-16 pb-6 mt-10" id="kontak"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeInUp}
      >
        <div className="footer-content max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="footer-map rounded-2xl overflow-hidden shadow-xl border-4 border-purple-900">
            <iframe title="Lokasi Kantor DP3A Banjarmasin" src="https://maps.google.com/maps?q=Dinas%20Pemberdayaan%20Perempuan%20dan%20Perlindungan%20Anak%20Kota%20Banjarmasin&t=&z=15&ie=UTF8&iwloc=&output=embed" width="100%" height="250" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
          <div className="footer-info space-y-4">
            <h3 className="footer-title text-2xl font-black text-purple-200 border-b border-purple-700 pb-3">KONTAK KAMI</h3>
            <p className="footer-agency font-bold text-lg">Dinas Pemberdayaan Perempuan dan Perlindungan Anak (DP3A)</p>
            <div className="contact-item flex items-start gap-3"><MapPin className="contact-icon text-purple-300 shrink-0 mt-1" size={20} /><span className="text-sm font-medium leading-relaxed">Gedung Capil, Jl. Sultan Adam No.49, Surgi Mufti, Kec. Banjarmasin Utara, Kota Banjarmasin, Kalimantan Selatan 70122</span></div>
            <div className="contact-item flex items-center gap-3"><Phone className="contact-icon text-purple-300 shrink-0" size={20} /><span className="text-sm font-medium leading-relaxed">(0511) 3307-788 / 0895-0388-6767</span></div>
            <div className="contact-item flex items-center gap-3"><Mail className="contact-icon text-purple-300 shrink-0" size={20} /><span className="text-sm font-medium leading-relaxed">dpppa@banjarmasinkota.go.id</span></div>
            <div className="contact-item flex items-center gap-3"><Clock className="contact-icon text-purple-300 shrink-0" size={20} /><span className="text-sm font-medium leading-relaxed">Senin - Jumat: 08.00 - 16.00 WITA</span></div>
            
            <div className="footer-socials pt-4 border-t border-purple-700 mt-4">
              <p className="social-label font-bold text-sm mb-3">Ikuti Kami:</p>
              <div className="social-icons flex gap-4">
                {/* SVG ICONS MANUAL MENGGANTIKAN FACEBOOK, INSTAGRAM, YOUTUBE */}
                <a href="https://web.facebook.com/people/DPPPA-KOTA-BANJARMASIN/100063900066891/" target="_blank" rel="noreferrer" className="social-link bg-white/10 p-2.5 rounded-full hover:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="https://www.instagram.com/dpppa.banjarmasin?igsh=MWM1bTNzNXI2cjllZg==" target="_blank" rel="noreferrer" className="social-link bg-white/10 p-2.5 rounded-full hover:bg-pink-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="https://youtube.com/@dpppakotabanjarmasin?si=MY5B0asTqG1Pp8Tr" target="_blank" rel="noreferrer" className="social-link bg-white/10 p-2.5 rounded-full hover:bg-red-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom text-center pt-8 mt-10 border-t border-purple-900">
          <p className="text-xs font-medium text-purple-300">© 2025 Pemerintah Kota Banjarmasin - Portal DP3A. All rights reserved.</p>
        </div>
      </motion.footer>

      {/* --- 2. WIDGET AI DITAMPILKAN DI SINI --- */}
      <AiChatWidget /> 
    </div>
  );
}