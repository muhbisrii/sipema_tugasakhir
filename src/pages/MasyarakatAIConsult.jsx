import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Sparkles, Trash2, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Groq from "groq-sdk";
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Memastikan koneksi ke Firebase

const apiKey = import.meta.env.VITE_GROQ_API_KEY;
const groq = new Groq({ 
  apiKey: apiKey || '',
  dangerouslyAllowBrowser: true 
});

export default function MasyarakatAIConsult() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'ai',
      content: 'Halo! Saya AI Assistant DP3A Banjarmasin. 👋\n\nBagaimana perasaan Anda hari ini? Ada hal terkait perlindungan perempuan atau anak yang ingin dikonsultasikan?',
      timestamp: new Date()
    }
  ]);
  const [userData, setUserData] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // 1. Logika Mengambil Data Pribadi Pengguna dari Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Gagal mengambil profil untuk AI:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: inputMessage, 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      if (!apiKey) throw new Error("API Key Groq tidak ditemukan");

      // 2. Logika Personalisasi & Fokus Konsultasi (System Prompt)
      const systemPrompt = `
        Kamu adalah AI Assistant resmi DP3A Kota Banjarmasin.
        
        DATA PENGGUNA SAAT INI:
        - Nama: ${userData?.nama || 'Pengguna'}
        - NIK: ${userData?.nik || 'Tidak tersedia'}
        - No. HP: ${userData?.no_hp || 'Tidak tersedia'}
        
        TUGAS UTAMA:
        1. Berikan konsultasi yang sangat empatik khusus mengenai kekerasan perempuan dan anak.
        2. Gunakan nama pengguna (${userData?.nama || 'Bapak/Ibu'}) sesekali agar terasa personal.
        3. JANGAN melayani pertanyaan di luar topik perlindungan perempuan, anak, KDRT, atau prosedur DP3A.
        4. Jika pengguna dalam bahaya, arahkan untuk menghubungi 112 atau melapor melalui menu 'Buat Pengaduan'.
        5. Jawaban harus singkat, padat, dan menenangkan.
      `;

      // 3. Logika Mengingat Chat Sebelumnya (Context Memory)
      // Kita mengirimkan 6 pesan terakhir agar AI ingat alur pembicaraan.
      const chatHistory = messages.slice(-6).map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }));

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: inputMessage }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.6, // Suhu rendah agar AI lebih konsisten dan tidak melantur
      });

      const aiResponse = chatCompletion.choices[0]?.message?.content || "Mohon maaf, saya sedang kesulitan memproses pesan Anda.";

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: aiResponse, 
        timestamp: new Date() 
      }]);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: 'err', 
        role: 'ai', 
        content: 'Maaf, koneksi terputus. Silakan coba lagi.', 
        timestamp: new Date() 
      }]);
    } finally { 
      setIsTyping(false); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[82vh] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4B2C82] rounded-xl flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6 text-white"/>
          </div>
          <div>
            <p className="text-sm font-black text-[#4B2C82] leading-none">Asisten DP3A</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Sesi: {userData?.nama || 'Tamu'}</p>
          </div>
        </div>
        <button onClick={() => setMessages([messages[0]])} className="text-gray-400 hover:text-red-500 p-2">
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>

      {/* Area Chat */}
      <div className="flex-1 flex flex-col border border-purple-50 shadow-lg rounded-[2rem] overflow-hidden bg-white min-h-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-8 scroll-smooth" ref={scrollRef}>
          <div className="space-y-4 max-w-3xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'ai' && (
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0 border border-purple-100">
                      <Sparkles className="w-4 h-4 text-[#4B2C82]"/>
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm border ${
                    message.role === 'user' ? 'bg-[#4B2C82] text-white border-purple-900 rounded-tr-none' : 'bg-gray-50 text-gray-700 border-gray-100 rounded-tl-none'
                  }`}>
                    <p className="text-[13px] leading-relaxed font-medium whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[#4B2C82]/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#4B2C82]/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-[#4B2C82]/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-purple-50">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ceritakan keluhan Anda..."
              className="w-full pl-5 pr-14 py-3.5 rounded-full bg-gray-50 border border-purple-100 focus:outline-none focus:border-[#4B2C82] text-sm font-medium"
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isTyping} 
              className="absolute right-1.5 top-1.5 bg-[#4B2C82] hover:bg-purple-900 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-md disabled:opacity-30"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5"/>}
            </button>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 flex items-center justify-between gap-3 shrink-0 mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0"/>
          <p className="text-[11px] font-bold text-[#4B2C82]">Ingin membuat laporan resmi untuk ditindaklanjuti?</p>
        </div>
        <button className="text-[11px] font-black text-[#4B2C82] hover:underline" onClick={() => navigate('/masyarakat/form')}>
          Buka Form <ChevronRight className="w-3 h-3 inline ml-1"/>
        </button>
      </div>
    </div>
  );
}