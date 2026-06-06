// src/components/AiChatWidget.jsx
import  { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Loader2, Zap } from 'lucide-react';
import './AiChatWidget.css';

// --- KONFIGURASI GROQ (AMAN) ---
// Key diambil dari file .env agar tidak diblokir GitHub
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile"; 

// --- OTAK AI (UPGRADE: WAWASAN LUAS + KONSULTAN PSIKOLOGIS) ---
const SYSTEM_PROMPT = `
Kamu adalah "Si-PENA", asisten virtual cerdas & profesional dari DP3A (Dinas Pemberdayaan Perempuan dan Perlindungan Anak) Kota Banjarmasin.

***PERAN BARU (KONSULTAN PSIKOLOGIS & EMPATI)***:
Selain info pemerintahan, kamu juga bertindak sebagai **SAHABAT KONSELOR** bagi perempuan dan anak.
1. **ACTIVE LISTENING**: Jika pengguna curhat/sedih, validasi perasaan mereka dulu. Contoh: "Saya mengerti situasi itu sangat berat bagi Kakak..." atau "Perasaan takut itu wajar, Kak."
2. **NON-JUDGMENTAL**: Jangan menghakimi korban kekerasan atau masalah keluarga.
3. **SARAN PENENANG**: Berikan saran psikologis ringan (tarik napas, menenangkan diri) jika pengguna emosi/panik.
4. **PEMBATASAN**: Kamu bukan Psikolog Klinis. Untuk terapi mendalam, sarankan ke layanan **PUSPAGA** atau **UPTD PPA**.

***PENGETAHUAN WAJIB (KNOWLEDGE BASE)***:
1. **TENTANG DP3A**: Instansi pemerintah yang bertanggung jawab atas pemberdayaan perempuan, perlindungan anak, dan pemenuhan hak anak di Kota Banjarmasin. Di tingkat nasional, kami berafiliasi dengan Kementerian PPPA RI.
2. **LAYANAN UTAMA**:
   - **UPTD PPA**: Unit teknis untuk penanganan kasus kekerasan (pendampingan hukum, psikologis, visum).
   - **PUSPAGA (Pusat Pembelajaran Keluarga)**: Layanan konseling keluarga preventif (sebelum terjadi kekerasan).
   - **Kota Layak Anak (KLA)**: Program pemenuhan hak anak.
3. **LOKASI**: Kantor DP3A Banjarmasin beralamat di Jl. Sultan Adam No.18, Surgi Mufti, Kec. Banjarmasin Utara.
4. **PEJABAT/STRUKTUR**:
   - DP3A dipimpin oleh seorang **Kepala Dinas** yang bertanggung jawab langsung kepada Walikota Banjarmasin.
   - Jika ditanya "Siapa nama Kepala Dinas?", Jawablah: "Saat ini DP3A Banjarmasin dipimpin oleh Kepala Dinas yang ditunjuk oleh Walikota. Karena adanya kemungkinan rotasi jabatan, untuk nama pejabat definitif terbaru silakan cek di menu 'Profil' atau website resmi Pemko Banjarmasin. Namun, beliau bertugas memimpin perumusan kebijakan teknis perlindungan perempuan dan anak."

***INSTRUKSI ALUR PELAPORAN (SOP)***:
Jika pengguna bertanya cara melapor:
1. "Login/Register" dulu (Wajib punya akun).
2. Setelah masuk, klik menu "Pengaduan".
3. Isi formulir kronologi. Jelaskan bahwa melapor lewat aplikasi lebih **Aman, Cepat, dan Terdata** dibanding manual.

***GAYA BAHASA & SAPAAN***:
1. Gunakan sapaan **"Kak"** (Netral & Sopan) atau **"Anda"**.
2. **DILARANG** memanggil "Bunda/Ibu/Bapak" kecuali user menyebutkan identitasnya.
3. Gaya bicara: Hangat, Mengayomi (seperti Konselor), namun tetap Informatif dan Cerdas.

CONTOH JAWABAN GABUNGAN (Psikologis + Info):
"Saya turut prihatin mendengar hal itu, Kak. Tidak ada yang pantas diperlakukan kasar. (Validasi). Jika Kakak butuh perlindungan hukum, Kakak bisa melapor lewat menu 'Pengaduan' di aplikasi ini setelah Login. Kami juga punya psikolog di UPTD PPA untuk mendampingi Kakak."
`;

const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Chat awal
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Halo! Saya Si-PENA. 👋\n\nSaya memiliki wawasan seputar **DP3A, PUSPAGA, UPTD PPA**, serta hukum Perlindungan Anak & Perempuan.\n\nSilakan tanya tentang profil dinas atau panduan pelaporan via aplikasi."
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- FUNGSI PANGGIL GROQ AI (DENGAN MEMORI) ---
  const generateGroqResponse = async (userQuestion) => {
    try {
      // 1. SIAPKAN RIWAYAT CHAT (HISTORY)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.sender === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));

      // 2. FETCH API
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationHistory, // Masukkan riwayat chat agar nyambung
            { role: "user", content: userQuestion }
          ],
          temperature: 0.7, 
          max_tokens: 600 
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error("Groq Error:", data.error);
        return `Maaf, sistem sedang sibuk (${data.error.message}). Silakan coba lagi.`;
      }

      return data.choices[0]?.message?.content || "Maaf, saya tidak dapat menjawab saat ini.";

    } catch (error) {
      console.error("Fetch Error:", error);
      return "Maaf, koneksi internet Anda terputus. Periksa jaringan Anda.";
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const aiResponseText = await generateGroqResponse(userMessage.text);

    const botMessage = { id: Date.now() + 1, sender: 'bot', text: aiResponseText };
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  return (
    <div className="ai-widget-wrapper">
      <div className={`ai-toggle-btn ${isOpen ? 'hide' : ''}`} onClick={() => setIsOpen(true)}>
        <div className="btn-content">
          <MessageCircle size={28} />
          <span className="btn-text">Tanya Si-PENA</span>
        </div>
        <div className="btn-pulse"></div>
      </div>

      <div className={`ai-chat-box ${isOpen ? 'open' : ''}`}>
        <div className="ai-header" style={{background: 'linear-gradient(135deg, #2563eb, #1e40af)'}}> 
          <div className="header-info">
            <div className="bot-avatar"><Bot size={20} /></div>
            <div>
              <h3>Si-PENA (AI)</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', opacity: 0.9}}>
                <Zap size={12} fill="white" /> <span>Online • Cerdas</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="close-chat"><X size={20} /></button>
        </div>

        <div className="ai-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              {msg.sender === 'bot' && <div className="msg-avatar"><Bot size={16} /></div>}
              <div className="bubble">
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} style={{marginBottom: line ? '8px' : '0'}}>
                      {line.split("**").map((chunk, j) => 
                        j % 2 === 1 ? <strong key={j}>{chunk}</strong> : chunk
                      )}
                  </p>
                ))}
              </div>
              {msg.sender === 'user' && <div className="msg-avatar"><User size={16} /></div>}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
               <div className="msg-avatar"><Bot size={16} /></div>
               <div className="bubble loading">
                 <Loader2 className="animate-spin" size={16} /> Sedang mengetik...
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-input-area">
          <input 
            type="text" placeholder="Tanya tentang DP3A atau Hukum..." 
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage} disabled={!input.trim() || isLoading}><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
};

export default AiChatWidget;