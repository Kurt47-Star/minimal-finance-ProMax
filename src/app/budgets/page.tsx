"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2, Trash2, PieChart, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categorySpent, setCategorySpent] = useState<Record<string, number>>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ฟอร์มตั้งงบใหม่
  const [category, setCategory] = useState("อาหาร/เครื่องดื่ม");
  const [amountLimit, setAmountLimit] = useState("");

  const categories = [
    "อาหาร/เครื่องดื่ม",
    "เดินทาง",
    "ของใช้ส่วนตัว",
    "ค่าห้อง/บิล",
    "บันเทิง/ช้อปปิ้ง",
    "อุปกรณ์การเรียน/งาน",
    "อื่น ๆ"
  ];

  // ดึงข้อมูลทั้งงบประมาณและรายจ่ายจริง
  const fetchData = async () => {
    // 1. ดึงงบประมาณ
    const { data: bData } = await supabase
      .from("budgets")
      .select("*")
      .order("created_at", { ascending: false });

    if (bData) setBudgets(bData);

    // 2. ดึงรายการธุรกรรมประเภทรายจ่าย เพื่อมาคำนวณยอดใช้จริงแยกรายหมวด
    const { data: txData } = await supabase
      .from("transactions")
      .select("category, amount, type")
      .eq("type", "expense");

    if (txData) {
      const spentMap: Record<string, number> = {};
      txData.forEach((tx) => {
        const cat = tx.category || "อื่น ๆ";
        const amt = Number(tx.amount) || 0;
        spentMap[cat] = (spentMap[cat] || 0) + amt;
      });
      setCategorySpent(spentMap);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // บันทึกงบประมาณใหม่
  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amountLimit || Number(amountLimit) <= 0) {
      alert("กรุณากรอกข้อมูลจำนวนงบประมาณให้ถูกต้องครับ");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.from("budgets").insert([
      {
        category,
        amount_limit: Number(amountLimit),
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } else {
      setAmountLimit("");
      setIsAddOpen(false);
      fetchData();
    }
  };

  // ลบงบประมาณ
  const handleDeleteBudget = async (id: string) => {
    const isConfirm = window.confirm("ต้องการลบงบประมาณของหมวดหมู่นี้หรือไม่?");
    if (isConfirm) {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (!error) fetchData();
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
              <h1 className="text-2xl font-bold">งบประมาณรายจ่าย (Budgets)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ตั้งเพดานค่าใช้จ่ายรายหมวดหมู่ และคุมการใช้เงินไม่ให้เกินงบ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#f9744b] text-white rounded-2xl font-semibold shadow-lg shadow-[#f9744b]/30 hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer"
          >
            <Plus size={18} />
            ตั้งงบประมาณ
          </button>
        </header>

        {/* รายการงบประมาณ */}
        {budgets.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl mb-4">
              📊
            </div>
            <p className="font-semibold text-base mb-1">ยังไม่มีการตั้งงบประมาณ</p>
            <p className="text-slate-400 text-xs mb-6">
              กดปุ่ม &quot;ตั้งงบประมาณ&quot; ด้านบนเพื่อกำหนดขีดจำกัดค่าใช้จ่าย
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => {
              const limit = Number(b.amount_limit) || 1;
              const spent = categorySpent[b.category] || 0;
              const remaining = limit - spent;
              const percent = Math.min(Math.round((spent / limit) * 100), 100);
              const isOver = spent > limit;

              return (
                <div
                  key={b.id}
                  className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border shadow-sm relative overflow-hidden flex flex-col justify-between ${
                    isOver
                      ? "border-red-400 dark:border-red-500/50"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                            isOver
                              ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          <PieChart size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-base">{b.category}</h3>
                          <p className="text-xs text-slate-400">
                            งบที่ตั้งไว้: ฿{formatMoney(limit)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 my-4">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">
                          ใช้ไปแล้ว ฿{formatMoney(spent)}
                        </span>
                        <span
                          className={`font-bold ${
                            isOver ? "text-red-500" : percent > 80 ? "text-amber-500" : "text-emerald-500"
                          }`}
                        >
                          {percent}% {isOver && "(เกินงบ!)"}
                        </span>
                      </div>

                      {/* หลอดแสดงผลตามระดับการใช้ */}
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver
                              ? "bg-red-500"
                              : percent > 80
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* สรุปเงินคงเหลือของหมวดนี้ */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-xs">
                    <span className="text-slate-400">คงเหลือใช้ได้:</span>
                    <span
                      className={`font-bold text-sm ${
                        remaining < 0 ? "text-red-500" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {remaining < 0 ? "-" : ""}฿{formatMoney(Math.abs(remaining))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal เพิ่มงบประมาณใหม่ */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <header className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">กำหนดงบประมาณใหม่</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  หมวดหมู่ค่าใช้จ่าย
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  เพดานงบประมาณ (THB)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 3000"
                  value={amountLimit}
                  onChange={(e) => setAmountLimit(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm font-semibold"
                  required
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
                  "บันทึกงบประมาณ"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}