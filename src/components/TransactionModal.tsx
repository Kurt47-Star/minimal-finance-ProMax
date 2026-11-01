"use client";
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TxType = "expense" | "income" | "transfer" | "saving";

export default function TransactionModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("กรุงไทย");
  const [category, setCategory] = useState("อาหาร/เครื่องดื่ม");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const colors = {
    expense: { bg: 'bg-[#f9744b]', shadow: 'shadow-[#f9744b]/30', text: 'text-[#f9744b]', lightBg: 'bg-[#f9744b]/10' },
    income: { bg: 'bg-[#2a9d8f]', shadow: 'shadow-[#2a9d8f]/30', text: 'text-[#2a9d8f]', lightBg: 'bg-[#2a9d8f]/10' },
    transfer: { bg: 'bg-slate-700', shadow: 'shadow-slate-700/30', text: 'text-slate-700', lightBg: 'bg-slate-700/10' },
    saving: { bg: 'bg-[#457b9d]', shadow: 'shadow-[#457b9d]/30', text: 'text-[#457b9d]', lightBg: 'bg-[#457b9d]/10' }
  };
  const activeColor = colors[txType];

  // ฟังก์ชันยิงข้อมูลเข้าฐานข้อมูล Supabase
  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("กรุณากรอกจำนวนเงินให้ถูกต้องครับ");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          type: txType,
          amount: Number(amount),
          wallet: wallet,
          category: category,
          note: note || "-"
        }
      ]);

    setIsLoading(false);

    if (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } else {
      // เคลียร์ค่าฟอร์มกลับเป็นค่าเริ่มต้นหลังบันทึกเสร็จ
      setAmount("");
      setNote("");
      onClose();
      // แจ้งเตือนแบบด่วน
      alert("✅ บันทึกข้อมูลสำเร็จ!");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl p-5 md:p-8 shadow-2xl animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-200">
        
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">New Transaction</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

        {/* เลือกประเภท (Toggle) */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-6 no-scrollbar">
          {[
            { id: "expense", label: "💸 รายจ่าย" },
            { id: "income", label: "📥 รายรับ" },
            { id: "transfer", label: "🔄 โอนย้าย" },
            { id: "saving", label: "🐷 เงินออม" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setTxType(type.id as TxType)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                txType === type.id 
                  ? `${activeColor.bg} text-white shadow-md${activeColor.shadow}` 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* ช่องกรอกตัวเลข */}
        <div className="mb-6 text-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">จำนวนเงิน (THB)</label>
          <div className="flex justify-center items-end gap-1">
            <span className="text-3xl text-slate-400 font-bold mb-1">฿</span>
            <input 
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full max-w-[250px] text-5xl md:text-6xl font-bold bg-transparent text-center text-slate-800 dark:text-white outline-none placeholder-slate-300 dark:placeholder-slate-700" 
            />
          </div>
          <div className={`h-0.5 w-32 mx-auto mt-2 rounded-full transition-colors ${activeColor.bg}`}></div>
        </div>

        {/* รายละเอียดเพิ่มเติม (หมวดหมู่ / กระเป๋า / โน้ต) */}
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">กระเป๋าเงิน</label>
              <select 
                value={wallet} 
                onChange={(e) => setWallet(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
              >
                <option>กรุงไทย</option>
                <option>TrueMoney</option>
                <option>ออมสิน</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">หมวดหมู่</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
              >
                <option>อาหาร/เครื่องดื่ม</option>
                <option>เดินทาง</option>
                <option>ของใช้ส่วนตัว</option>
                <option>เงินเดือน</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">บันทึกช่วยจำ (Note)</label>
            <input 
              type="text" 
              placeholder="เช่น ข้าวกะเพราไก่..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
            />
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button 
          onClick={handleSave}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${activeColor.bg} ${activeColor.shadow} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? <Loader2 className="animate-spin" size={24} /> : "บันทึกรายการ"}
        </button>

      </div>
    </div>
  );
}