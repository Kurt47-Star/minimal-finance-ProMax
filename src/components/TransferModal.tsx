"use client";
import { useState } from "react";
import { X, ArrowRightLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({ isOpen, onClose, onSuccess }: TransferModalProps) {
  const wallets = ["กรุงไทย", "TrueMoney", "ออมสิน"];
  const [fromWallet, setFromWallet] = useState("กรุงไทย");
  const [toWallet, setToWallet] = useState("TrueMoney");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      alert("กรุณาระบุจำนวนเงินที่ต้องการโอนครับ");
      return;
    }

    if (fromWallet === toWallet) {
      alert("กระเป๋าต้นทางและปลายทางต้องไม่ซ้ำกันครับ");
      return;
    }

    setIsLoading(true);
    const numAmount = Number(amount);

    // บันทึกธุรกรรมคู่: 1 รายการตัดเงินออก + 1 รายการรับเงินเข้า
    const { error } = await supabase.from("transactions").insert([
      {
        type: "transfer",
        category: "โอนออก",
        wallet: fromWallet,
        amount: numAmount,
        note: note.trim() ? `โอนไป ${toWallet} (${note.trim()})` : `โอนไป ${toWallet}`,
      },
      {
        type: "transfer",
        category: "รับโอน",
        wallet: toWallet,
        amount: numAmount,
        note: note.trim() ? `รับโอนจาก ${fromWallet} (${note.trim()})` : `รับโอนจาก ${fromWallet}`,
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert("❌ โอนเงินไม่สำเร็จ: " + error.message);
    } else {
      setAmount("");
      setNote("");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        
        {/* หัวหน้าต่าง */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">โอนเงินระหว่างกระเป๋า</h2>
              <p className="text-xs text-slate-400">ย้ายเงินข้ามบัญชี ไม่กระทบยอดรายจ่าย</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleTransfer} className="space-y-4">
          {/* เลือกกระเป๋าต้นทาง -> ปลายทาง */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                จากกระเป๋า
              </label>
              <select
                value={fromWallet}
                onChange={(e) => setFromWallet(e.target.value)}
                className="w-full bg-transparent font-semibold text-sm outline-none cursor-pointer"
              >
                {wallets.map((w) => (
                  <option key={w} value={w} className="dark:bg-slate-800 text-slate-800 dark:text-white">
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400">
              <ArrowRight size={16} />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                ไปยังกระเป๋า
              </label>
              <select
                value={toWallet}
                onChange={(e) => setToWallet(e.target.value)}
                className="w-full bg-transparent font-semibold text-sm outline-none cursor-pointer text-blue-500"
              >
                {wallets.map((w) => (
                  <option key={w} value={w} className="dark:bg-slate-800 text-slate-800 dark:text-white">
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* จำนวนเงิน */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
              จำนวนเงิน (THB)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3.5 text-center text-2xl font-bold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          {/* บันทึกช่วยจำ */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
              บันทึกช่วยจำ (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น เติมเงินมือถือ, สำรองจ่าย"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex justify-center items-center cursor-pointer"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : "ยืนยันการโอนเงิน"}
          </button>
        </form>

      </div>
    </div>
  );
}