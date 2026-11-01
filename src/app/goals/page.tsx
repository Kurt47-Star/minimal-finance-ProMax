"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2, Trash2, Coins, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRIORITY_LEVELS, calculateSavingsMetrics } from "@/lib/financeHelpers";

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [wallets, setWallets] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ตัวเลขสรุปคลังเงินออม
  const [totalSavNow, setTotalSavNow] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [remainingUnallocated, setRemainingUnallocated] = useState(0);

  // ฟอร์มเพิ่มเป้าหมายใหม่
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [priority, setPriority] = useState<string>("⭐ ปานกลาง (Medium)");

  // ระบบฝากเงินเข้าเป้าหมายด่วน
  const [depositGoal, setDepositGoal] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositWallet, setDepositWallet] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  // ดึงข้อมูลเป้าหมายและรายการธุรกรรมจาก Supabase
  const fetchData = async () => {
    const [gRes, tRes, wRes] = await Promise.all([
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*"),
      supabase.from("wallets").select("name"),
    ]);

    let loadedGoals: any[] = [];
    if (gRes.data) {
      loadedGoals = gRes.data;
      setGoals(loadedGoals);
    }

    if (wRes.data && wRes.data.length > 0) {
      const wNames = wRes.data.map((w: any) => w.name);
      setWallets(wNames);
      setDepositWallet(wNames[0]);
    } else {
      setWallets(["🏦 กรุงไทย", "📱 TrueMoney Wallet", "🌸 ออมสิน"]);
      setDepositWallet("🏦 กรุงไทย");
    }

    // คำนวณคลังเงินออมจริงจากประวัติธุรกรรม
    const savMetrics = calculateSavingsMetrics(tRes.data || []);
    setTotalSavNow(savMetrics.totalSavNow);

    // ยอดจัดสรรแล้ว
    const allocated = loadedGoals.reduce(
      (sum, g) => sum + (Number(g.current_amount || g.saved_amount) || 0),
      0
    );
    setTotalAllocated(allocated);
    setRemainingUnallocated(savMetrics.totalSavNow - allocated);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // บันทึกเป้าหมายใหม่
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) {
      alert("กรุณากรอกชื่อและจำนวนเงินเป้าหมายครับ");
      return;
    }

    setIsLoading(true);
    const startAmt = Number(currentAmount) || 0;
    const targetAmt = Number(targetAmount);

    const { error } = await supabase.from("goals").insert([
      {
        name: name.trim(),
        icon: icon.trim() || "🎯",
        target_amount: targetAmt,
        current_amount: startAmt,
        saved_amount: startAmt,
        priority: priority || "⭐ ปานกลาง (Medium)",
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } else {
      setName("");
      setIcon("🎯");
      setTargetAmount("");
      setCurrentAmount("");
      setPriority("⭐ ปานกลาง (Medium)");
      setIsAddOpen(false);
      fetchData();
    }
  };

  // ฝากเงินสะสมเพิ่มเข้าเป้าหมาย พร้อมผูก Transaction หักบัญชีจริง
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      alert("กรุณากรอกจำนวนเงินที่ต้องการฝากครับ");
      return;
    }

    setIsDepositing(true);
    const currentVal = Number(depositGoal.current_amount || depositGoal.saved_amount) || 0;
    const newTotal = currentVal + amt;
    const nowIso = new Date().toISOString();

    // 1. อัปเดตยอดสะสมในตาราง goals
    const { error: goalErr } = await supabase
      .from("goals")
      .update({ current_amount: newTotal, saved_amount: newTotal })
      .eq("id", depositGoal.id);

    // 2. บันทึก Transaction เพื่อหักเงินจากกระเป๋าที่เลือก
    await supabase.from("transactions").insert({
      type: "เงินออม",
      category: `บริหารเงินออม: ฝากเงินเพิ่ม [${depositGoal.name}]`,
      amount: amt,
      wallet: depositWallet || wallets[0] || "🏦 กรุงไทย",
      note: `ฝากเงินสะสมเข้าเป้าหมาย ${depositGoal.name}`,
      created_at: nowIso,
    });

    setIsDepositing(false);

    if (goalErr) {
      alert("❌ ฝากเงินไม่สำเร็จ: " + goalErr.message);
    } else {
      setDepositAmount("");
      setDepositGoal(null);
      fetchData();
    }
  };

  // ลบเป้าหมาย
  const handleDeleteGoal = async (id: string | number) => {
    if (window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมายนี้?")) {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (!error) fetchData();
    }
  };

  const formatMoney = (amount: number) =>
    (amount || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // จัดเรียงเป้าหมายตามความสำคัญ (Priority Ranking)
  const priorityScore: Record<string, number> = {
    "🚀 ด่วนที่สุด (Critical)": 1,
    "🔥 สูง (High)": 2,
    "⭐ ปานกลาง (Medium)": 3,
    "🟢 ต่ำ (Low)": 4,
    "🧊 เผื่อไว้ (Optional)": 5,
  };

  const sortedGoals = [...goals].sort((a, b) => {
    const scoreA = priorityScore[a.priority] || 3;
    const scoreB = priorityScore[b.priority] || 3;
    return scoreA - scoreB;
  });

  const getPriorityBadge = (p: string) => {
    if (p?.includes("ด่วนที่สุด")) return "bg-rose-500/15 text-rose-500 border-rose-500/30";
    if (p?.includes("สูง")) return "bg-[#f9744b]/15 text-[#f9744b] border-[#f9744b]/30";
    if (p?.includes("ปานกลาง")) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    if (p?.includes("ต่ำ")) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    return "bg-blue-500/15 text-blue-500 border-blue-500/30";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* หัวกระดาษ */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">🎯 ระบบเป้าหมายออมเงิน (Goals)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                จัดสรรคลังเงินออมออกเป็นสล็อตเป้าหมาย พร้อมจัดลำดับความสำคัญ
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

        {/* 3 การ์ดคำนวณคลังเงินออมจริง */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              💰 คลังเงินออมจริง (Savings Total)
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#457b9d] mt-1">
              ฿{formatMoney(totalSavNow)}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              📦 จัดสรรเข้าเป้าหมายแล้ว
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#2a9d8f] mt-1">
              ฿{formatMoney(totalAllocated)}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ⚖️ เงินออมที่ยังไม่จัดสรร
            </span>
            <h3
              className={`text-xl sm:text-2xl font-extrabold mt-1 ${
                remainingUnallocated < 0 ? "text-rose-500" : "text-[#8ab17d]"
              }`}
            >
              ฿{formatMoney(remainingUnallocated)}
            </h3>
          </div>
        </section>

        {/* รายการเป้าหมาย */}
        {sortedGoals.length === 0 ? (
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
            {sortedGoals.map((g) => {
              const current = Number(g.current_amount || g.saved_amount) || 0;
              const target = Number(g.target_amount) || 1;
              const percent = Math.min(Math.round((current / target) * 100), 100);
              const isCompleted = current >= target;

              return (
                <div
                  key={g.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all hover:border-[#f9744b]/40"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f9744b]/10 text-2xl flex items-center justify-center shadow-inner">
                          {g.icon || "🎯"}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-800 dark:text-white">
                            {g.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                                g.priority
                              )}`}
                            >
                              {g.priority || "⭐ ปานกลาง"}
                            </span>
                            <span className="text-xs text-slate-400">
                              เป้าหมาย: ฿{formatMoney(target)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="ลบเป้าหมาย"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 my-4">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">
                          สะสมแล้ว ฿{formatMoney(current)}
                        </span>
                        <span
                          className={`font-bold ${
                            isCompleted ? "text-emerald-500" : "text-[#f9744b]"
                          }`}
                        >
                          {isCompleted ? "🎉 บรรลุเป้าแล้ว!" : `${percent}%`}
                        </span>
                      </div>

                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-amber-500 to-[#f9744b]"
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">
                      ขาดอีก: ฿{formatMoney(Math.max(0, target - current))}
                    </span>
                    <button
                      onClick={() => setDepositGoal(g)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f9744b]/10 hover:bg-[#f9744b]/20 text-[#f9744b] rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <header className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-[#f9744b]" />
                สร้างเป้าหมายใหม่
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleAddGoal} className="space-y-3.5">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                    ไอคอน
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full p-2.5 text-center text-xl rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b]"
                    placeholder="🎯"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                    ชื่อเป้าหมาย
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น กองทุนสอบ GRE, ซื้อ iPad"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  ยอดเงินเป้าหมาย (THB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  เงินเริ่มต้นที่มีอยู่แล้ว (ไม่ใส่ได้)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  ระดับความสำคัญ (Priority)
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-xs font-semibold"
                >
                  {PRIORITY_LEVELS.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 rounded-xl bg-[#f9744b] text-white font-semibold text-sm shadow-lg shadow-[#f9744b]/30 hover:brightness-110 active:scale-95 transition-all flex justify-center items-center cursor-pointer"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : "💾 บันทึกเป้าหมาย"}
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
                <p className="text-xs text-[#f9744b] font-medium flex items-center gap-1">
                  <span>{depositGoal.icon || "🎯"}</span> {depositGoal.name}
                </p>
              </div>
              <button
                onClick={() => setDepositGoal(null)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleDeposit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  จำนวนเงินที่ต้องการเติม (THB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-3 text-xl font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-center"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  หักเงินออกจากกระเป๋าไหน?
                </label>
                <select
                  value={depositWallet}
                  onChange={(e) => setDepositWallet(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-xs font-semibold"
                >
                  {wallets.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isDepositing}
                className="w-full py-3 rounded-xl bg-[#f9744b] text-white font-semibold text-sm shadow-lg shadow-[#f9744b]/30 hover:brightness-110 active:scale-95 transition-all flex justify-center items-center cursor-pointer"
              >
                {isDepositing ? <Loader2 className="animate-spin" size={18} /> : "ยืนยันการฝากเงิน"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}