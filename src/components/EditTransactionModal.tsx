"use client";
import { useState, useEffect } from "react";
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TxType = "expense" | "income" | "transfer" | "saving";

export default function EditTransactionModal({ 
  isOpen, 
  onClose, 
  transaction,
  onUpdated
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  transaction: any;
  onUpdated: () => void;
}) {
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // เพิ่ม state สำหรับควบคุมการเปิดกล่องยืนยันการลบแบบ Custom ของเราเอง
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
      setTxType(transaction.type);
      setAmount(transaction.amount.toString());
      setWallet(transaction.wallet);
      setCategory(transaction.category);
      setNote(transaction.note === "-" ? "" : transaction.note);
      setShowDeleteConfirm(false); // รีเซ็ตกล่องยืนยันทุกครั้งที่เปิด Modal
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const colors = {
    expense: { bg: 'bg-[#f9744b]', shadow: 'shadow-[#f9744b]/30' },
    income: { bg: 'bg-[#2a9d8f]', shadow: 'shadow-[#2a9d8f]/30' },
    transfer: { bg: 'bg-slate-700', shadow: 'shadow-slate-700/30' },
    saving: { bg: 'bg-[#457b9d]', shadow: 'shadow-[#457b9d]/30' }
  };
  const activeColor = colors[txType];

  const handleUpdate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert("กรุณากรอกจำนวนเงินให้ถูกต้องครับ");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase
      .from('transactions')
      .update({
        type: txType,
        amount: Number(amount),
        wallet: wallet,
        category: category,
        note: note || "-"
      })
      .eq('id', transaction.id);

    setIsLoading(false);
    if (error) {
      alert("❌ แก้ไขไม่สำเร็จ: " + error.message);
    } else {
      onUpdated();
      onClose();
    }
  };

  // ฟังก์ชันลบจริงจัง เชื่อมต่อ Supabase โดยตรง ไม่พึ่ง window.confirm
  const executeDelete = async () => {
    setIsDeleting(true);
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transaction.id);
    
    setIsDeleting(false);
    
    if (error) {
      alert("❌ ลบไม่สำเร็จ: " + error.message);
    } else {
      onUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* กล่องยืนยันการลบแบบซ้อนทับ (Custom Delete Dialog) ป้องกันการโดนเบราว์เซอร์บล็อก */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">ยืนยันการลบรายการนี้?</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm">ข้อมูลรายการนี้จะถูกลบออกจากฐานข้อมูลอย่างถาวรและไม่สามารถกู้คืนได้</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex justify-center items-center shadow-lg shadow-red-500/30"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        )}

        <header className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">แก้ไขรายการ</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

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

        <div className="mb-6 text-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">จำนวนเงิน (THB)</label>
          <div className="flex justify-center items-end gap-1">
            <span className="text-3xl text-slate-400 font-bold mb-1">฿</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full max-w-[250px] text-5xl md:text-6xl font-bold bg-transparent text-center text-slate-800 dark:text-white outline-none placeholder-slate-300 dark:placeholder-slate-700" 
            />
          </div>
          <div className={`h-0.5 w-32 mx-auto mt-2 rounded-full transition-colors ${activeColor.bg}`}></div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">กระเป๋าเงิน</label>
              <select value={wallet} onChange={(e) => setWallet(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm">
                <option>กรุงไทย</option>
                <option>TrueMoney</option>
                <option>ออมสิน</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">หมวดหมู่</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm">
                <option>อาหาร/เครื่องดื่ม</option>
                <option>เดินทาง</option>
                <option>ของใช้ส่วนตัว</option>
                <option>เงินเดือน</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">บันทึกช่วยจำ (Note)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm" />
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            type="button"
            onClick={() => setShowDeleteConfirm(true)} // เปิดหน้าต่างยืนยันการลบของเราเอง
            className="w-16 flex justify-center items-center rounded-2xl bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <Trash2 size={24} />
          </button>
          
          <button 
            type="button"
            onClick={handleUpdate}
            disabled={isLoading}
            className={`flex-1 py-4 rounded-2xl text-white font-semibold text-lg shadow-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${activeColor.bg} ${activeColor.shadow} ${isLoading ? 'opacity-70' : ''}`}
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : "บันทึกการแก้ไข"}
          </button>
        </div>

      </div>
    </div>
  );
}