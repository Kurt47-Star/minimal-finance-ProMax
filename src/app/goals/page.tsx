"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2, Trash2, Coins } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ฟอร์มเพิ่มเป้าหมายใหม่
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");

  // ระบบฝากเงินเข้าเป้าหมายด่วน
  const [depositGoal, setDepositGoal] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  // ดึงข้อมูลเป้าหมายจาก Supabase
  const fetchGoals = async () => {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setGoals(data);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // บันทึกเป้าหมายใหม่
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) {
      alert("กรุณากรอกชื่อและจำนวนเงินเป้าหมายครับ");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.from("goals").insert([
      {
        name,
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount) || 0,
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setIsAddOpen(false);
      fetchGoals();
    }
  };

  // ฝากเงินสะสมเพิ่มเข้าเป้าหมาย
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) {
      alert("กรุณากรอกจำนวนเงินที่ต้องการฝากครับ");
      return;
    }

    setIsDepositing(true);
    const newTotal = (Number(depositGoal.current_amount) || 0) + Number(depositAmount);

    const { error } = await supabase
      .from("goals")
      .update({ current_amount: newTotal })
      .eq("id", depositGoal.id);

    setIsDepositing(false);

    if (error) {
      alert("❌ ฝากเงินไม่สำเร็จ: " + error.message);
    } else {
      setDepositAmount("");
      setDepositGoal(null);
      fetchGoals();
    }
  };

  // ลบเป้าหมาย
  const handleDeleteGoal = async (id: string) => {
    if (window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมายนี้?")) {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (!error) fetchGoals();
    }
  };

  const formatMoney = (amount: number) =>
    amount.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* หัวกระดาษ */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">เป้าหมายการออม (Goals)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ตั้งเป้าหมายและสะสมเงินอย่างเป็นระบบ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#f9744b] text-white rounded-2xl font-semibold shadow-lg shadow-[#f9744b]/30 hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer"
          >
            <Plus size={18} />
            เพิ่มเป้าหมาย
          </button>
        </header>

        {/* รายการเป้าหมาย */}
        {goals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl mb-4">
              🎯
            </div>
            <p className="font-semibold text-base mb-1">ยังไม่มีเป้าหมายการออม</p>
            <p className="text-slate-400 text-xs mb-6">
              กดปุ่ม &quot;เพิ่มเป้าหมาย&quot; ด้านบนเพื่อเริ่มวางแผนการออมเงิน
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const current = Number(g.current_amount) || 0;
              const target = Number(g.target_amount) || 1;
              const percent = Math.min(Math.round((current / target) * 100), 100);

              return (
                <div
                  key={g.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl">
                          🎯
                        </div>
                        <div>
                          <h3 className="font-bold text-base">{g.name}</h3>
                          <p className="text-xs text-slate-400">
                            เป้าหมาย: ฿{formatMoney(target)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 my-4">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">
                          สะสมแล้ว ฿{formatMoney(current)}
                        </span>
                        <span className="text-[#f9744b] font-bold">{percent}%</span>
                      </div>

                      {/* หลอดเปอร์เซ็นต์ */}
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-[#f9744b] rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* ปุ่มฝากเงินเพิ่ม */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                    <button
                      onClick={() => setDepositGoal(g)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Coins size={14} />
                      + ฝากเงินเพิ่ม
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal เพิ่มเป้าหมายใหม่ */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <header className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">สร้างเป้าหมายใหม่</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  ชื่อเป้าหมาย
                </label>
                <input
                  type="text"
                  placeholder="เช่น กล้องใหม่, เงินฉุกเฉิน"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  ยอดเงินเป้าหมาย (THB)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  เงินเริ่มต้นที่มีอยู่แล้ว (ไม่ใส่ได้)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 rounded-xl bg-[#f9744b] text-white font-semibold text-sm shadow-lg shadow-[#f9744b]/30 hover:brightness-110 active:scale-95 transition-all flex justify-center items-center cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "บันทึกเป้าหมาย"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal ฝากเงินด่วนเข้าเป้าหมาย */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <header className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold">ฝากเงินเข้าเป้าหมาย</h2>
                <p className="text-xs text-amber-500 font-medium">{depositGoal.name}</p>
              </div>
              <button
                onClick={() => setDepositGoal(null)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  จำนวนเงินที่ต้องการเติม (THB)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-3 text-lg font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500 text-center"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isDepositing}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 transition-all flex justify-center items-center cursor-pointer"
              >
                {isDepositing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "ยืนยันการฝากเงิน"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}