"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";

export default function PinLogin() {
  const [pin, setPin] = useState("");
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter(); // <--- เพิ่มบรรทัดนี้

  // เช็คว่าเคยตั้ง PIN ไว้ในเครื่องนี้หรือยัง
  useEffect(() => {
    setIsClient(true);
    const localPin = localStorage.getItem("mfpro_pin");
    if (localPin) setSavedPin(localPin);
  }, []);

  const handlePress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      // เมื่อกดครบ 6 ตัว
      if (newPin.length === 6) {
        if (!savedPin) {
          // กรณีเข้ามาครั้งแรก: บันทึก PIN ใหม่
          localStorage.setItem("mfpro_pin", newPin);
          setSavedPin(newPin);
          setPin("");
          alert("🎉 ตั้งรหัส PIN สำเร็จ! ลองกดรหัสเพื่อเข้าแอปเลยครับ");
        } else {
          // กรณีมี PIN แล้ว: ตรวจสอบความถูกต้อง
       if (newPin === savedPin) {
         router.push("/dashboard"); // <--- สั่งให้เด้งไปหน้า Dashboard
       } else {
         setError(true);
         setTimeout(() => setPin(""), 500); // รหัสผิดให้เคลียร์ทิ้ง
       }
        }
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  if (!isClient) return null;

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        
        {/* หัวข้อ */}
        <div className="mb-8 flex flex-col items-center">
          <div className={`p-4 rounded-full mb-4 transition-colors ${error ? 'bg-red-500/20 text-red-500' : 'bg-brand-500/20 text-[#f9744b]'}`}>
            {savedPin && pin.length === 6 && !error ? <Unlock size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="text-2xl font-bold tracking-wider mb-2">
  Finance Pro Max<span className="text-[#f9744b]">.</span>
</h1>
          <p className="text-slate-400 text-sm">
            {!savedPin ? "ตั้งรหัส PIN 6 หลักสำหรับเครื่องนี้" : (error ? "❌ รหัสผ่านไม่ถูกต้อง" : "กรุณากดรหัส PIN เพื่อเข้าใช้งาน")}
          </p>
        </div>

        {/* จุดไข่ปลา 6 จุด */}
        <div className="flex gap-4 mb-12 h-6">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < pin.length 
                  ? "bg-[#f9744b] scale-110 shadow-[0_0_10px_rgba(249,116,75,0.5)]" 
                  : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* แป้นพิมพ์ตัวเลข (Numpad) */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full px-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              onClick={() => handlePress(num.toString())}
              className="w-20 h-20 flex justify-center items-center text-3xl font-medium rounded-full hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <div className="w-20 h-20"></div> {/* ช่องว่าง */}
          <button 
            onClick={() => handlePress("0")}
            className="w-20 h-20 flex justify-center items-center text-3xl font-medium rounded-full hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all"
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="w-20 h-20 flex justify-center items-center text-xl font-medium rounded-full hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all text-slate-400"
          >
            ⌫
          </button>
        </div>

      </div>
    </main>
  );
}