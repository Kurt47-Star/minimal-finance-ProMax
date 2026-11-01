"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import TransactionModal from "@/components/TransactionModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import TransferModal from "@/components/TransferModal";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [isDark, setIsDark] = useState(true);
  const router = useRouter();
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);

  // ระบบเลือกรอบเดือน (กำหนดค่าเริ่มต้นผ่าน useEffect เพื่อรองรับ Next.js Prerender)
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // ตัวแปรเก็บข้อมูลตัวเลข
  const [netWealth, setNetWealth] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [totalBudgetLimit, setTotalBudgetLimit] = useState(0);
  const [totalBudgetSpent, setTotalBudgetSpent] = useState(0);

  const [walletsData, setWalletsData] = useState<Record<string, number>>({
    กรุงไทย: 0,
    TrueMoney: 0,
    ออมสิน: 0,
  });

  // กำหนดเวลาปัจจุบันฝั่ง Client
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

  // ดึงข้อมูลและคำนวณยอด
  const fetchData = async () => {
    if (!currentDate) return;

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    const selectedYear = currentDate.getFullYear();
    const selectedMonth = currentDate.getMonth();

    if (txData) {
      let lifetimeInc = 0;
      let lifetimeExp = 0;
      let mInc = 0;
      let mExp = 0;
      let wData: Record<string, number> = { กรุงไทย: 0, TrueMoney: 0, ออมสิน: 0 };
      const monthlySpentByCategory: Record<string, number> = {};

      txData.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        const wName = (tx.wallet || "").trim();
        const txDate = new Date(tx.created_at);
        const isSelectedMonth =
          txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth;

        if (tx.type === "income") {
          lifetimeInc += amt;
          if (wData[wName] !== undefined) wData[wName] += amt;
          if (isSelectedMonth) mInc += amt;
        } else if (tx.type === "expense") {
          lifetimeExp += amt;
          if (wData[wName] !== undefined) wData[wName] -= amt;
          if (isSelectedMonth) {
            mExp += amt;
            const cat = (tx.category || "อื่น ๆ").trim();
            monthlySpentByCategory[cat] = (monthlySpentByCategory[cat] || 0) + amt;
          }
        } else if (tx.type === "transfer") {
          if (tx.category === "โอนออก" || tx.note?.includes("โอนไป")) {
            if (wData[wName] !== undefined) wData[wName] -= amt;
          } else if (tx.category === "รับโอน" || tx.note?.includes("รับโอน")) {
            if (wData[wName] !== undefined) wData[wName] += amt;
          }
        }
      });

      setNetWealth(lifetimeInc - lifetimeExp);
      setWalletsData(wData);
      setMonthlyIncome(mInc);
      setMonthlyExpense(mExp);

      const currentMonthTx = txData.filter((tx) => {
        const d = new Date(tx.created_at);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      });
      setRecentTx(currentMonthTx.slice(0, 5));

      const { data: bData } = await supabase.from("budgets").select("*");
      if (bData && bData.length > 0) {
        let limitSum = 0;
        let spentSum = 0;

        bData.forEach((b) => {
          const bCat = (b.category || "").toLowerCase().trim();
          limitSum += Number(b.amount_limit) || 0;

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
    }

    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2);

    if (goalsData) setGoals(goalsData);
  };

  useEffect(() => {
    if (currentDate) {
      fetchData();
    }
  }, [isTxOpen, isTransferOpen, currentDate]);

  const formatMoney = (amount: number) =>
    amount.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatWealthParts = (amount: number) => {
    const parts = amount
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-24 md:pb-8 transition-colors duration-300">
      
      {/* 💻 Sidebar (PC) */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-[#f9744b] tracking-wide">
            Finance Pro<span className="text-[#f9744b] text-3xl">.</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
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
          onClick={() => router.push("/goals")}
          className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-[#f9744b] transition-colors cursor-pointer"
        >
          <span className="text-xl mb-1">🎯</span>
          <span className="text-[10px] font-medium">Goals</span>
        </button>

        <button 
          onClick={() => router.push("/analytics")} 
          className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-[#f9744b] transition-colors cursor-pointer"
        >
          <span className="text-xl mb-1">📈</span>
          <span className="text-[10px] font-medium">Stats</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* Header และตัวเลือกรอบเดือน */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pt-2">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Overview</h2>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={14} className="text-[#f9744b]" />
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
            </div>
          </div>

          <div className="flex items-center self-end sm:self-auto gap-2">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all cursor-pointer"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Net Wealth Banner */}
        <section className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-6 md:p-8 border border-slate-700/50 shadow-xl shadow-slate-900/10">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">รวมเงินทั้งหมด (Net Wealth)</p>
              <h3 className={`text-4xl md:text-5xl font-bold tracking-tight ${netWealth < 0 ? 'text-red-400' : 'text-white'}`}>
                ฿{wealthParts.intStr}<span className="text-slate-500 text-2xl">.{wealthParts.decStr}</span>
              </h3>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex gap-6 border border-white/10">
              <div>
                <p className="text-slate-400 text-xs mb-1">รายรับ ({monthYearLabel})</p>
                <p className="text-emerald-400 font-semibold">฿{formatMoney(monthlyIncome)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">รายจ่าย ({monthYearLabel})</p>
                <p className="text-[#f9744b] font-semibold">฿{formatMoney(monthlyExpense)}</p>
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
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">🏦 กรุงไทย</p>
            <p className={`text-lg font-bold ${walletsData['กรุงไทย'] < 0 ? 'text-red-500' : ''}`}>฿{formatMoney(walletsData['กรุงไทย'])}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">📱 TrueMoney</p>
            <p className={`text-lg font-bold ${walletsData['TrueMoney'] < 0 ? 'text-red-500' : ''}`}>฿{formatMoney(walletsData['TrueMoney'])}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-l-4 border-l-pink-500 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">💖 ออมสิน</p>
            <p className={`text-lg font-bold ${walletsData['ออมสิน'] < 0 ? 'text-red-500' : ''}`}>฿{formatMoney(walletsData['ออมสิน'])}</p>
          </div>
        </section>

        {/* Budgets Overview */}
        {totalBudgetLimit > 0 && (
          <section 
            onClick={() => router.push("/budgets")}
            className="mb-8 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-[#f9744b] transition-all"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💳</span>
                <span className="font-bold text-sm">การคุมงบประมาณ ({monthYearLabel})</span>
              </div>
              <span className={`text-xs font-bold ${isOverBudget ? "text-red-500" : "text-[#f9744b]"}`}>
                ใช้ไป {budgetPercent}% {isOverBudget && "⚠️ เกินงบ!"}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget ? "bg-red-500" : budgetPercent > 80 ? "bg-amber-500" : "bg-emerald-500"
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
          <div className="mb-8">
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
                const current = Number(g.current_amount) || 0;
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
                        <span className="text-base">🎯</span>
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

        {/* Recent Transactions ประจำเดือน */}
        <h3 className="text-sm font-bold mb-3">รายการในรอบเดือน ({monthYearLabel})</h3>
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          {recentTx.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">ยังไม่มีรายการบันทึกในเดือนนี้ครับ</p>
          ) : (
            <div className="space-y-4">
              {recentTx.map((tx) => {
                const isIncome = tx.type === "income";
                const isTransfer = tx.type === "transfer";
                const isTransferIn = isTransfer && (tx.category === "รับโอน" || tx.note?.includes("รับโอน"));

                return (
                  <div 
                    key={tx.id} 
                    onClick={() => setEditingTx(tx)}
                    className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex justify-center items-center text-lg ${
                          isIncome
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"
                            : isTransfer
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20"
                            : "bg-[#f9744b]/10 text-[#f9744b] dark:bg-[#f9744b]/20"
                        }`}
                      >
                        {isIncome ? "📥" : isTransfer ? "🔄" : "💸"}
                      </div>
                      <div>
                        <p className="font-semibold text-sm md:text-base">{tx.category}</p>
                        <div className="flex gap-2 items-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{tx.wallet}</p>
                          {tx.note && tx.note !== "-" && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] md:max-w-[220px]">{tx.note}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <p
                      className={`font-bold ${
                        isIncome || isTransferIn
                          ? "text-emerald-500"
                          : isTransfer
                          ? "text-blue-500"
                          : "text-slate-800 dark:text-white"
                      }`}
                    >
                      {isIncome || isTransferIn ? "+" : "-"}฿{formatMoney(Number(tx.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Modals */}
      <TransactionModal isOpen={isTxOpen} onClose={() => setIsTxOpen(false)} />
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