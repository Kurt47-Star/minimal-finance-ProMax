"use client";
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // <-- เติมบรรทัดนี้เพิ่มเข้าไป
}
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Plus,
} from "lucide-react";
import TransactionModal from "@/components/TransactionModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import TransferModal from "@/components/TransferModal";
import { supabase } from "@/lib/supabase";
import {
  computeWalletBalances,
  calculateSavingsMetrics,
} from "@/lib/financeHelpers";

export default function Dashboard() {
  const [isDark, setIsDark] = useState(true);
  const router = useRouter();

  // Modals
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);

  // โหมดการกรอง: "monthly" (รายเดือนตามปฏิทิน) หรือ "cycle" (รอบบัญชี)
  const [viewMode, setViewMode] = useState<"monthly" | "cycle">("monthly");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // ข้อมูลจากฐานข้อมูล
  const [walletsList, setWalletsList] = useState<string[]>([
    "🏦 กรุงไทย",
    "📱 TrueMoney Wallet",
    "🌸 ออมสิน",
  ]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");

  // ตัวแปรสรุปยอดตัวเลข
  const [netWealth, setNetWealth] = useState(0);
  const [periodIncome, setPeriodIncome] = useState(0);
  const [periodExpense, setPeriodExpense] = useState(0);
  const [periodSavings, setPeriodSavings] = useState(0);
  const [periodInvest, setPeriodInvest] = useState(0);
  const [totalSavNow, setTotalSavNow] = useState(0);
  const [outstandingLoan, setOutstandingLoan] = useState(0);

  const [walletsBalances, setWalletsBalances] = useState<Record<string, number>>({});
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [totalBudgetLimit, setTotalBudgetLimit] = useState(0);
  const [totalBudgetSpent, setTotalBudgetSpent] = useState(0);

  // Calibrate Form & Cycle Form
  const [calibrateInputs, setCalibrateInputs] = useState<Record<string, string>>({});
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [isCycleSubmitting, setIsCycleSubmitting] = useState(false);

  // กำหนดเวลาเริ่มต้นฝั่ง Client ป้องกัน Hydration Error
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // สลับโหมด Dark/Light
  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  // ฟังก์ชันเลื่อนเดือน
  const handlePrevMonth = () => {
    if (!currentDate) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!currentDate) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthYearLabel = currentDate
    ? currentDate.toLocaleDateString("th-TH", {
        month: "long",
        year: "numeric",
      })
    : "กำลังโหลด...";

  // ดึงข้อมูลและคำนวณยอดทั้งหมด
  const fetchData = async () => {
    const [txRes, wRes, cRes, bRes, gRes] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("name"),
      supabase.from("cycles").select("*").order("created_at", { ascending: false }),
      supabase.from("budgets").select("*"),
      supabase.from("goals").select("*").order("created_at", { ascending: false }).limit(2),
    ]);

    // 1. กระเป๋าเงิน
    let wList = ["🏦 กรุงไทย", "📱 TrueMoney Wallet", "🌸 ออมสิน"];
    if (wRes.data && wRes.data.length > 0) {
      wList = wRes.data.map((w: any) => w.name);
      setWalletsList(wList);
    }

    // 2. รอบบัญชี (Cycles)
    if (cRes.data && cRes.data.length > 0) {
      setCycles(cRes.data);
      const active = cRes.data.find((c: any) => c.status === "ACTIVE") || cRes.data[0];
      setActiveCycle(active);
      if (selectedCycleId === "all") {
        setSelectedCycleId(String(active.id));
      }
    }

    // 3. ธุรกรรม (Transactions)
    const txData = txRes.data || [];
    setAllTransactions(txData);

    // คำนวณยอดกระเป๋าและ Net Wealth รวมทั้งหมดผ่าน helper function
    const { balances, netWealth: totalWealth } = computeWalletBalances(txData, wList);
    setWalletsBalances(balances);
    setNetWealth(totalWealth);

    // คำนวณคลังเงินออมและยอดหนี้คงค้างทั้งหมด
    const savMetrics = calculateSavingsMetrics(txData);
    setTotalSavNow(savMetrics.totalSavNow);
    setOutstandingLoan(savMetrics.outstandingLoan);

    // 4. กรองรายการตามช่วงเวลาที่ผู้ใช้เลือก (รายเดือน หรือ รอบบัญชี)
    let filteredTxs = txData;
    const selectedYear = currentDate ? currentDate.getFullYear() : new Date().getFullYear();
    const selectedMonth = currentDate ? currentDate.getMonth() : new Date().getMonth();

    if (viewMode === "monthly") {
      filteredTxs = txData.filter((tx: any) => {
        const d = new Date(tx.created_at);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      });
    } else {
      const currentSelectedCycle = cRes.data?.find((c: any) => String(c.id) === selectedCycleId);
      if (currentSelectedCycle && selectedCycleId !== "all") {
        const startTime = new Date(currentSelectedCycle.start_date).getTime();
        const endTime = currentSelectedCycle.end_date
          ? new Date(currentSelectedCycle.end_date).getTime()
          : Infinity;
        filteredTxs = txData.filter((tx: any) => {
          const t = new Date(tx.created_at).getTime();
          return t >= startTime && t <= endTime;
        });
      }
    }

    // คำนวณยอดประจำช่วงเวลานั้นๆ
    let mInc = 0;
    let mExp = 0;
    let mSav = 0;
    let mInv = 0;
    const monthlySpentByCategory: Record<string, number> = {};

    filteredTxs.forEach((tx: any) => {
      const amt = Number(tx.amount) || 0;
      const t = String(tx.type || "").trim();
      const cat = String(tx.category || "อื่น ๆ").trim();

      const isInc = t === "income" || /รายรับ|ถอนเงินออม|กู้เงินออม|รับคืน|ปรับยอดเพิ่ม/i.test(t);
      const isExp =
        t === "expense" ||
        (/รายจ่าย|ปรับยอดลด/i.test(t) && !/ลงทุน|ออม/i.test(cat));
      const isSav = /เงินออม/i.test(t) && !/ถอน|กู้/i.test(t);
      const isInv = /ลงทุน/i.test(t) || /ลงทุน/i.test(cat);

      if (isInc) mInc += amt;
      if (isExp) {
        mExp += amt;
        const mainCat = cat.split(":")[0]?.trim() || cat;
        monthlySpentByCategory[mainCat] = (monthlySpentByCategory[mainCat] || 0) + amt;
      }
      if (isSav) mSav += amt;
      if (isInv) mInv += amt;
    });

    setPeriodIncome(mInc);
    setPeriodExpense(mExp);
    setPeriodSavings(mSav);
    setPeriodInvest(mInv);
    setRecentTx(filteredTxs.slice(0, 5));

    // 5. ข้อมูลงบประมาณ (Budgets)
    if (bRes.data && bRes.data.length > 0) {
      let limitSum = 0;
      let spentSum = 0;
      bRes.data.forEach((b: any) => {
        const bCat = (b.category || b.target_category || "").toLowerCase().trim();
        limitSum += Number(b.amount_limit || b.budget_amount) || 0;

        Object.keys(monthlySpentByCategory).forEach((txCat) => {
          const tCat = txCat.toLowerCase().trim();
          if (tCat === bCat || bCat.includes(tCat) || tCat.includes(bCat)) {
            spentSum += monthlySpentByCategory[txCat];
          }
        });
      });
      setTotalBudgetLimit(limitSum);
      setTotalBudgetSpent(spentSum);
    }

    // 6. ข้อมูลเป้าหมาย (Goals)
    if (gRes.data) setGoals(gRes.data);
  };

  useEffect(() => {
    if (currentDate) {
      fetchData();
    }
  }, [isTxOpen, isTransferOpen, currentDate, viewMode, selectedCycleId]);

  // ฟังก์ชัน 1-Click Multi-Wallet Sync (คาลิเบรทเงินจริง)
  const handleCalibrateSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalibrating(true);
    const nowIso = new Date().toISOString();
    const inserts: any[] = [];

    walletsList.forEach((w) => {
      const inputVal = calibrateInputs[w];
      if (inputVal !== undefined && inputVal.trim() !== "") {
        const realAmt = parseFloat(inputVal);
        if (!isNaN(realAmt)) {
          const currentBal = walletsBalances[w] || 0;
          const diff = realAmt - currentBal;
          if (Math.abs(diff) >= 0.01) {
            inserts.push({
              type: diff > 0 ? "⚖️ ปรับยอดเพิ่ม" : "⚖️ ปรับยอดลด",
              category: "ปรับยอดบัญชีจริง",
              amount: Math.abs(diff),
              note: "คาลิเบรทยอดเงินจริง (1-Click Sync)",
              wallet: w,
              created_at: nowIso,
            });
          }
        }
      }
    });

    if (inserts.length > 0) {
      await supabase.from("transactions").insert(inserts);
      setCalibrateInputs({});
      await fetchData();
      alert("🎉 ปรับยอดเงินจริงทุกกระเป๋าเรียบร้อยตรงเป๊ะ 100%!");
    } else {
      alert("กรุณากรอกตัวเลขเงินจริงที่ต้องการปรับอย่างน้อย 1 กระเป๋าครับ");
    }
    setIsCalibrating(false);
  };

  // ฟังก์ชันจบรอบบัญชีเดิม & เริ่ม Circle ใหม่
  const handleStartNewCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCycleSubmitting(true);
    const nowIso = new Date().toISOString();
    const primaryBal = walletsBalances[walletsList[0]] || 0;

    if (activeCycle) {
      await supabase
        .from("cycles")
        .update({ status: "CLOSED", end_date: nowIso, real_kt_balance: primaryBal })
        .eq("id", activeCycle.id);
    }

    const cycleTitle =
      newCycleName.trim() ||
      `Circle ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

    await supabase.from("cycles").insert({
      name: cycleTitle,
      start_date: nowIso,
      status: "ACTIVE",
      carry_forward: primaryBal,
      real_kt_balance: primaryBal,
    });

    setNewCycleName("");
    await fetchData();
    setIsCycleSubmitting(false);
    alert(`เริ่มรอบ ${cycleTitle} เรียบร้อยครับ!`);
  };

  const formatMoney = (amount: number) =>
    (amount || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatWealthParts = (amount: number) => {
    const parts = (amount || 0)
      .toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .split(".");
    return { intStr: parts[0], decStr: parts[1] };
  };

  const wealthParts = formatWealthParts(netWealth);
  const budgetPercent =
    totalBudgetLimit > 0
      ? Math.min(Math.round((totalBudgetSpent / totalBudgetLimit) * 100), 100)
      : 0;
  const isOverBudget = totalBudgetSpent > totalBudgetLimit && totalBudgetLimit > 0;

  // ฟังก์ชันจัดสไตล์และไอคอนสำหรับประวัติธุรกรรม
  const getTxStyle = (tx: any) => {
    const t = String(tx.type || "").trim();
    const cat = String(tx.category || "");
    const note = String(tx.note || "");

    const isInc = t === "income" || /รายรับ|ถอนเงินออม|กู้เงินออม|รับคืน|ปรับยอดเพิ่ม/i.test(t);
    const isTr = t === "transfer" || /โอนย้าย/i.test(t);
    const isSav = /เงินออม/i.test(t) && !/ถอน|กู้/i.test(t);
    const isInv = /ลงทุน/i.test(t);
    const isDebt = /เงินทดจ่าย/i.test(t) && !/รับคืน/i.test(t);

    if (isInc) {
      return {
        icon: "📥",
        badgeBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20",
        amountColor: "text-emerald-500",
        sign: "+",
      };
    }
    if (isTr) {
      const isTrIn = cat === "รับโอน" || note.includes("รับโอน") || cat.includes("เข้า");
      return {
        icon: "🔄",
        badgeBg: "bg-blue-100 text-blue-600 dark:bg-blue-500/20",
        amountColor: isTrIn ? "text-blue-500" : "text-amber-500",
        sign: isTrIn ? "+" : "-",
      };
    }
    if (isSav) {
      return {
        icon: "🐷",
        badgeBg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20",
        amountColor: "text-cyan-500",
        sign: "-",
      };
    }
    if (isInv) {
      return {
        icon: "📈",
        badgeBg: "bg-amber-100 text-amber-600 dark:bg-amber-500/20",
        amountColor: "text-amber-500",
        sign: "-",
      };
    }
    if (isDebt) {
      return {
        icon: "🤝",
        badgeBg: "bg-purple-100 text-purple-600 dark:bg-purple-500/20",
        amountColor: "text-purple-400",
        sign: "-",
      };
    }

    return {
      icon: "💸",
      badgeBg: "bg-[#f9744b]/10 text-[#f9744b] dark:bg-[#f9744b]/20",
      amountColor: "text-slate-800 dark:text-white",
      sign: "-",
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-24 md:pb-8 transition-colors duration-300">
      {/* 💻 Sidebar (PC) */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-[#f9744b] tracking-wide">
            Finance Pro<span className="text-[#f9744b] text-3xl">.</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#f9744b]/10 text-[#f9744b] dark:bg-[#f9744b]/20 dark:text-[#f9744b] rounded-xl font-medium transition-all text-left">
            <span className="text-xl">📊</span> Dashboard
          </button>

          <button
            onClick={() => router.push("/transactions")}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-left cursor-pointer"
          >
            <span className="text-xl">✨</span> Transactions
          </button>

          <button
            onClick={() => router.push("/receivables")}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-left cursor-pointer"
          >
            <span className="text-xl">🤝</span> ลูกหนี้ & หารบิล
          </button>

          <button
            onClick={() => router.push("/goals")}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-left cursor-pointer"
          >
            <span className="text-xl">🎯</span> Goals
          </button>

          <button
            onClick={() => router.push("/budgets")}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-left cursor-pointer"
          >
            <span className="text-xl">💳</span> Budgets
          </button>

          <button
            onClick={() => router.push("/analytics")}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-left cursor-pointer"
          >
            <span className="text-xl">📈</span> Analytics
          </button>

          <button
            onClick={() => router.push("/settings")}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-left cursor-pointer"
          >
            <span className="text-xl">⚙️</span> Settings
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 text-sm text-slate-500 hover:text-red-500 font-medium transition-colors cursor-pointer"
          >
            🔒 ล็อกหน้าจอ (Lock)
          </button>
        </div>
      </aside>

      {/* 📱 Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 flex justify-around items-center px-2">
        <button className="flex flex-col items-center justify-center w-full h-full text-[#f9744b]">
          <span className="text-xl mb-1">📊</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => router.push("/transactions")}
          className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-[#f9744b] transition-colors cursor-pointer"
        >
          <span className="text-xl mb-1">✨</span>
          <span className="text-[10px] font-medium">Tx</span>
        </button>

        <div className="relative w-full flex justify-center -top-4">
          <button
            onClick={() => setIsTxOpen(true)}
            className="w-12 h-12 rounded-full bg-[#f9744b] text-white flex items-center justify-center text-2xl shadow-lg shadow-[#f9744b]/40 active:scale-95 transition-transform cursor-pointer"
          >
            +
          </button>
        </div>

        <button
          onClick={() => router.push("/receivables")}
          className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-[#f9744b] transition-colors cursor-pointer"
        >
          <span className="text-xl mb-1">🤝</span>
          <span className="text-[10px] font-medium">หารบิล</span>
        </button>

        <button
          onClick={() => router.push("/goals")}
          className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-[#f9744b] transition-colors cursor-pointer"
        >
          <span className="text-xl mb-1">🎯</span>
          <span className="text-[10px] font-medium">Goals</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header และตัวสลับรอบบัญชี / ปฏิทิน */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Overview</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* ปุ่มสลับโหมด: รายเดือน VS รอบบัญชี */}
              <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    viewMode === "monthly"
                      ? "bg-[#f9744b] text-white font-bold"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  🗓️ ปฏิทิน
                </button>
                <button
                  onClick={() => setViewMode("cycle")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    viewMode === "cycle"
                      ? "bg-[#f9744b] text-white font-bold"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  🔄 รอบ Circle
                </button>
              </div>

              {/* เลือกรอบเดือนปฏิทิน */}
              {viewMode === "monthly" ? (
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-sm">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:text-[#f9744b] text-slate-400 transition-colors cursor-pointer"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold px-1 min-w-[110px] text-center">
                    {monthYearLabel}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 hover:text-[#f9744b] text-slate-400 transition-colors cursor-pointer"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                /* เลือกรอบ Circle */
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 text-xs text-slate-700 dark:text-white font-semibold focus:outline-none focus:border-[#f9744b] shadow-sm"
                >
                  <option value="all">🌟 ทั้งหมด (All Time)</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.status === "ACTIVE" ? "🟢" : "📅"} {c.name} (
                      {new Date(c.start_date).toLocaleDateString("th-TH")})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center self-end sm:self-auto gap-2">
            <button
              onClick={() => setIsTxOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#f9744b] hover:bg-[#e76f51] text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={14} /> บันทึกรายการ
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all cursor-pointer"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Net Wealth Banner */}
        <section className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-6 md:p-8 border border-slate-700/50 shadow-xl shadow-slate-900/10">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mb-1">
                รวมเงินจริงทุกกระเป๋า (Net Wealth)
              </p>
              <h3
                className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${
                  netWealth < 0 ? "text-red-400" : "text-white"
                }`}
              >
                ฿{wealthParts.intStr}
                <span className="text-slate-500 text-xl sm:text-2xl">.{wealthParts.decStr}</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 w-full md:w-auto">
              <div>
                <p className="text-slate-400 text-[10px] mb-0.5">📥 รายรับ</p>
                <p className="text-emerald-400 text-xs sm:text-sm font-bold">
                  ฿{formatMoney(periodIncome)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-0.5">💸 รายจ่าย</p>
                <p className="text-[#f9744b] text-xs sm:text-sm font-bold">
                  ฿{formatMoney(periodExpense)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-0.5">🐷 ออมสุทธิ</p>
                <p className="text-cyan-400 text-xs sm:text-sm font-bold">
                  ฿{formatMoney(periodSavings)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-0.5">📈 ลงทุน</p>
                <p className="text-amber-400 text-xs sm:text-sm font-bold">
                  ฿{formatMoney(periodInvest)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Wallets Row */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold">กระเป๋าเงิน (Wallets)</h3>
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowRightLeft size={14} />
            โอนย้ายเงิน
          </button>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {walletsList.map((w, idx) => {
            const bal = walletsBalances[w] || 0;
            const borderColors = [
              "border-l-emerald-500",
              "border-l-amber-500",
              "border-l-pink-500",
              "border-l-cyan-500",
              "border-l-purple-500",
            ];
            const borderClass = borderColors[idx % borderColors.length];

            return (
              <div
                key={w}
                className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 ${borderClass} border border-slate-200 dark:border-slate-700 shadow-sm`}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">{w}</p>
                <p className={`text-base sm:text-lg font-bold ${bal < 0 ? "text-red-500" : ""}`}>
                  ฿{formatMoney(bal)}
                </p>
              </div>
            );
          })}
        </section>

        {/* ⚖️ Multi-Wallet 1-Click Sync (คาลิเบรทเงินจริง) */}
        <details className="mb-6 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm group">
          <summary className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center list-none">
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-[#f9744b]" />
              ⚖️ คาลิเบรทเงินจริงทุกกระเป๋า (Multi-Wallet 1-Click Sync)
            </span>
            <span className="text-xs text-[#f9744b] group-open:rotate-180 transition">▼</span>
          </summary>
          <p className="text-xs text-slate-400 mt-2">
            กรอกยอดเงินจริงที่เหลืออยู่ในแต่ละแอปตอนนี้ ระบบจะคำนวณและปรับยอดให้ตรง 100% ทันทีโดยไม่กระทบสถิติรายจ่าย
          </p>
          <form onSubmit={handleCalibrateSync} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {walletsList.map((w) => (
                <div key={w}>
                  <label className="text-xs text-slate-400 mb-1 block truncate">💳 {w}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`ปัจจุบัน: ฿${(walletsBalances[w] || 0).toLocaleString()}`}
                    value={calibrateInputs[w] || ""}
                    onChange={(e) =>
                      setCalibrateInputs({ ...calibrateInputs, [w]: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={isCalibrating}
              className="w-full bg-[#f9744b] hover:bg-[#e76f51] text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              {isCalibrating ? "กำลังปรับยอด..." : "⚡ ปรับยอดจริงทุกกระเป๋าให้ตรงทันที (1-Click Sync)"}
            </button>
          </form>
        </details>

        {/* 🔄 Cycle Control (จบรอบ & เริ่ม Circle ใหม่) */}
        <details className="mb-6 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm group">
          <summary className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center list-none">
            <span className="flex items-center gap-2">
              <RefreshCw size={16} className="text-[#2a9d8f]" />
              🔄 เปิด Circle ใหม่ & สั่งตัดรอบบัญชี (Cycle Control)
            </span>
            <span className="text-xs text-[#2a9d8f] group-open:rotate-180 transition">▼</span>
          </summary>
          <p className="text-xs text-slate-400 mt-2">
            รอบปัจจุบัน: <span className="font-bold text-emerald-500">{activeCycle?.name || "รอบหลัก"}</span> — จบรอบเดิมเพื่อบันทึกสถิติและยกยอดยกมาเข้าสู่รอบถัดไป
          </p>
          <form onSubmit={handleStartNewCycle} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="ชื่อรอบใหม่ (เช่น November 2026)"
              value={newCycleName}
              onChange={(e) => setNewCycleName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={isCycleSubmitting}
              className="bg-[#2a9d8f] hover:bg-[#21867a] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition whitespace-nowrap"
            >
              {isCycleSubmitting ? "กำลังตัดรอบ..." : "⏹️ จบรอบเดิม & เริ่มรอบใหม่"}
            </button>
          </form>
        </details>

        {/* Budgets Overview */}
        {totalBudgetLimit > 0 && (
          <section
            onClick={() => router.push("/budgets")}
            className="mb-6 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-[#f9744b] transition-all"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💳</span>
                <span className="font-bold text-sm">การคุมงบประมาณ</span>
              </div>
              <span
                className={`text-xs font-bold ${
                  isOverBudget ? "text-red-500" : "text-[#f9744b]"
                }`}
              >
                ใช้ไป {budgetPercent}% {isOverBudget && "⚠️ เกินงบ!"}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget
                    ? "bg-red-500"
                    : budgetPercent > 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${budgetPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span>ใช้ไป ฿{formatMoney(totalBudgetSpent)}</span>
              <span>เพดานงบทั้งหมด ฿{formatMoney(totalBudgetLimit)}</span>
            </div>
          </section>
        )}

        {/* Goals Preview */}
        {goals.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold">เป้าหมายการออม (Goals)</h3>
              <button
                onClick={() => router.push("/goals")}
                className="text-xs text-[#f9744b] hover:underline cursor-pointer font-medium"
              >
                ดูทั้งหมด ({goals.length}) →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => {
                const current = Number(g.saved_amount || g.current_amount) || 0;
                const target = Number(g.target_amount) || 1;
                const percent = Math.min(Math.round((current / target) * 100), 100);

                return (
                  <div
                    key={g.id}
                    onClick={() => router.push("/goals")}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-[#f9744b] transition-all"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{g.icon || "🎯"}</span>
                        <span className="font-semibold text-sm">{g.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#f9744b]">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-[#f9744b] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>฿{formatMoney(current)}</span>
                      <span>เป้า ฿{formatMoney(target)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Transactions ประจำรอบที่เลือก */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold">
            รายการล่าสุด ({viewMode === "monthly" ? monthYearLabel : "รอบที่เลือก"})
          </h3>
          <button
            onClick={() => router.push("/transactions")}
            className="text-xs text-[#f9744b] hover:underline cursor-pointer font-medium"
          >
            ดูทั้งหมด →
          </button>
        </div>

        <section className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          {recentTx.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">
              ยังไม่มีรายการบันทึกในช่วงเวลานี้ครับ
            </p>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx) => {
                const style = getTxStyle(tx);

                return (
                  <div
                    key={tx.id}
                    onClick={() => setEditingTx(tx)}
                    className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-full flex justify-center items-center text-lg ${style.badgeBg}`}
                      >
                        {style.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm md:text-base">{tx.category}</p>
                        <div className="flex gap-2 items-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{tx.wallet}</p>
                          {tx.note && tx.note !== "-" && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] md:max-w-[220px]">
                                {tx.note}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className={`font-bold ${style.amountColor}`}>
                      {style.sign}฿{formatMoney(Number(tx.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxOpen}
        onClose={() => setIsTxOpen(false)}
        onSuccess={fetchData}
      />
      <EditTransactionModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onUpdated={fetchData}
      />
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}