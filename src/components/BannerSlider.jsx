import 'react';
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade'; 

// Import modules
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';

// --- DATA SLIDER ---
const banners = [
  {
    id: 1,
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg0jF_6jxnbiOCs_1Lc2z1RP8hSod8_gvXSrBGPAOLRO5X4gnGoDHNPNISrmrxxggZPG3lEdu9Nz-OqJc94leZb_j108hzoMictNHXkEG5Of0qCtaZ2rwfBrqv_GvpkDAcHR1wfHV19X8yZOZwe5qvhjBsCldNyxhi5g1bAHueJTW9eiH_VFcGe4Ti4SBI/s3200/(02.18)%20BANNER%20WEBSITE.png",
    link: "https://dpppa.banjarmasinkota.go.id/p/publikasi-pariwara-antikorupsi-2025.html",
    title: "Publikasi Pariwara Antikorupsi 2025",
    subtitle: "Pariwara Antikorupsi Dinas Pemberdayaan Perempuan dan Perlindungan Anak Kota Banjarmasin",
  },
  {
    id: 2,
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgwS9ZB1m-gEFGKWKFJyleSn1H34cLfmyI0qnK3A3hkUNcsfULxtlWctrsx_o04ln_L2AN-4gSr3pzn5yhn75TgLpdff8NNQYiW4UpOQU2OHQ5W8WpejkKZQu-t_9QtNJbjWmn8nY2zDAQY6kmsbF3FgzdEQ4ebec9y_JQJPoTu1aYKmqdg_4DLtrPYW9E/s1600/Wheel21.png",
    link: null, 
    title: "Profil & Kontak Dinas",
    subtitle: "Dinas Pemberdayaan Perempuan dan Perlindungan Anak Kota Banjarmasin",
  },
  {
    id: 3,
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgHkBms3CrzKUgiyLIXoY4rjScZvpUc8RnTpQn5g8gnbb9gHtAaumgNcs71yAKYQegJaj5FzJ_80erLMGhpPfaocP4Hwi2TAOavIOj663BLj13b8RvcvFiwEw-Buhh8t_Z49VwS1KpizNVuVOhGXDaGFpnX4DYjBc9NIX3I_4JoE-czVbVt0jrEa1_AShI/s3200/(2025.08.23)%20BANNER%20WEBSITE.png", 
    link: "https://dpppa.banjarmasinkota.go.id/p/buku-data-terpilah-gender-dan-anak-kota.html",
    title: "Buku Data Terpilah",
    subtitle: "Sistem Informasi Gender dan Anak (SIGA) Kota Banjarmasin",
  }
];

export default function BannerSlider() {
  return (
    // PERBAIKAN 1: !mt-0 untuk memaksa margin atas hilang di mobile agar dempet ke header
    <div className="w-full max-w-[1400px] mx-auto !mt-0 md:mt-2 px-0 md:px-4">
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        loop={true}
        effect={'fade'}
        fadeEffect={{ crossFade: true }}
        autoplay={{
          delay: 6000, 
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={true}
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        className="mySwiper md:rounded-2xl shadow-sm overflow-hidden group bg-white relative"
      >
        {banners.map((banner) => {
          const isLink = !!banner.link;
          const Tag = isLink ? 'a' : 'div';
          const props = isLink ? { href: banner.link, target: "_blank", rel: "noreferrer" } : {};

          return (
            <SwiperSlide key={banner.id} className="bg-white">
              <Tag 
                {...props}
                // Mobile: h-[180px] agar tidak terlalu tipis, sesuaikan jika ingin 150px
                // Desktop: md:h-[400px]
                className={`block relative w-full h-[180px] md:h-[400px] flex items-center justify-center overflow-hidden ${isLink ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {/* Background Blur */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-20 scale-110"
                  style={{ backgroundImage: `url(${banner.image})` }}
                ></div>

                {/* Gambar Utama */}
                <img 
                  src={banner.image} 
                  alt={banner.title} 
                  className="relative z-10 w-full h-full object-contain object-center transition-transform duration-700 hover:scale-[1.02]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/1400x400?text=Info+DP3A+Banjarmasin";
                  }}
                />
                
                {/* Overlay Text */}
                <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end">
                  {/* PERBAIKAN 2: pb-16 (padding-bottom: 4rem) pada mobile.
                     Ini akan mengangkat teks ke atas sehingga tidak tertutup oleh Box Trending (-mt-10).
                     Di desktop (md), padding dikembalikan normal (md:pb-8).
                  */}
                  <div className="bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent p-3 pb-16 md:pb-8 md:p-8 pt-8 md:pt-16">
                    
                    <div className="max-w-4xl mx-auto text-left">
                      {/* Judul Utama */}
                      <h3 className="text-white text-xs md:text-3xl font-bold mb-0.5 md:mb-2 drop-shadow-lg tracking-tight line-clamp-1 md:line-clamp-none">
                        {banner.title}
                      </h3>

                      {/* Subjudul */}
                      {banner.subtitle && (
                        <p className="text-slate-200 text-[10px] md:text-lg font-medium drop-shadow-md leading-tight border-l-2 md:border-l-4 border-indigo-500 pl-2 md:pl-3 line-clamp-1 md:line-clamp-none">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>

                    {isLink && (
                      <div className="absolute bottom-6 right-6 hidden md:flex items-center gap-2 text-white/80 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <span className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full hover:bg-white/20 transition-colors">
                          Lihat Detail &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Tag>
            </SwiperSlide>
          );
        })}
        
        <style jsx>{`
          .swiper-button-next, .swiper-button-prev {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(4px);
            width: 44px;
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
          }
          .swiper-button-next:hover, .swiper-button-prev:hover {
            background: #4f46e5;
            border-color: #4f46e5;
            transform: scale(1.1);
            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
          }
          .swiper-button-next:after, .swiper-button-prev:after {
            font-size: 18px !important;
            font-weight: bold;
          }
          .swiper-pagination-bullet {
            width: 16px; 
            height: 3px;
            background: rgba(255,255,255,0.5);
            border-radius: 2px;
            opacity: 1;
            margin: 0 2px !important;
            transition: all 0.3s;
          }
          .swiper-pagination-bullet-active {
            background: #4f46e5 !important;
            width: 24px;
          }
          @media (min-width: 768px) {
             .swiper-pagination-bullet { width: 24px; height: 4px; margin: 0 4px !important; }
             .swiper-pagination-bullet-active { width: 32px; }
          }
          @media (max-width: 768px) {
            .swiper-button-next, .swiper-button-prev {
              display: none !important;
            }
            /* Geser pagination sedikit ke atas agar tidak tertutup trending box juga */
            .swiper-pagination {
              bottom: 45px !important; 
            }
          }
        `}</style>
      </Swiper>
    </div>
  );
}