"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, ShieldCheck, Wallet, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CategoryStat {
  category: string;
  amount: number;
  percentage: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [walletStats, setWalletStats] = useState<Record<string, number>>({});
  const [topCategory, setTopCategory] = useState<string>("-");

  const fetchAnalytics = async () => {
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (txData) {
      let inc = 0;
      let exp = 0;
      const catMap: Record<string, number> = {};
      const wExpMap: Record<string, number> = {};

      txData.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === "income") {
          inc += amt;
        } else if (tx.type === "expense") {
          exp += amt;
          const cat = (tx.category || "อื่น ๆ").trim();
          catMap[cat] = (catMap[cat] || 0) + amt;

          const w = (tx.wallet || "ไม่ระบุ").trim();
          wExpMap[w] = (wExpMap[w] || 0) + amt;
        }
      });

      setTotalIncome(inc);
      setTotalExpense(exp);
      setWalletStats(wExpMap);

      // คำนวณสัดส่วน % แต่ละหมวดหมู่ และจัดเรียงจากมากไปน้อย
      if (exp > 0) {
        const sortedCats = Object.keys(catMap)
          .map((cat) => ({
            category: cat,
            amount: catMap[cat],
            percentage: Math.round((catMap[cat] / exp) * 100),
          }))
          .sort((a, b) => b.amount - a.amount);

        setCategoryStats(sortedCats);
        if (sortedCats.length > 0) {
          setTopCategory(sortedCats[0].category);
        }
      }
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatMoney = (amount: number) =>
    amount.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // คำนวณอัตราการเก็บออม (Savings Rate)
  const savingsAmount = Math.max(0, totalIncome - totalExpense);
  const savingsRate = totalIncome > 0 ? Math.round((savingsAmount / totalIncome) * 100) : 0;

  // โค้ดสีสำหรับกราฟแท่ง
  const barColors = [
    "bg-[#f9744b]",
    "bg-amber-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-slate-400",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* หัวกระดาษ */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">สถิติและการวิเคราะห์ (Analytics)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              วิเคราะห์พฤติกรรมการใช้เงินและสุขภาพทางการเงิน
            </p>
          </div>
        </header>

        {/* บัตรสรุป Key Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">อัตราการออม (Savings Rate)</p>
              <h3 className="text-2xl font-bold text-emerald-500">{savingsRate}%</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">เหลือเก็บ ฿{formatMoney(savingsAmount)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f9744b]/10 text-[#f9744b] flex items-center justify-center">
              <PieChart size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">จ่ายหนักสุดในหมวด</p>
              <h3 className="text-lg font-bold truncate max-w-[170px]">{topCategory}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">หมวดหมู่รายจ่ายอันดับ 1</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">รายรับรวมสุทธิ</p>
              <h3 className="text-xl font-bold">฿{formatMoney(totalIncome)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">จ่ายออกไป ฿{formatMoney(totalExpense)}</p>
            </div>
          </div>
        </section>

        {/* สัดส่วนรายจ่ายตามหมวดหมู่ (Category Breakdown) */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>📊</span> สัดส่วนรายจ่ายตามหมวดหมู่
            </h2>
            <span className="text-xs text-slate-400">คิดเป็นร้อยละจากรายจ่ายทั้งหมด</span>
          </div>

          {categoryStats.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">ยังไม่มีข้อมูลรายจ่ายสำหรับวิเคราะห์</p>
          ) : (
            <div className="space-y-5">
              {categoryStats.map((item, index) => {
                const colorClass = barColors[index % barColors.length];
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                        <span className="font-semibold text-sm">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">฿{formatMoney(item.amount)}</span>
                        <span className="font-bold w-10 text-right">{item.percentage}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorClass} rounded-full transition-all duration-700`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ยอดการใช้เงินแยกตามกระเป๋า (Wallet Breakdown) */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-base font-bold flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-[#f9744b]" /> แหล่งเงินที่จ่ายออกมากที่สุด (ตามกระเป๋า)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.keys(walletStats).length === 0 ? (
              <p className="text-xs text-slate-400">ยังไม่มีข้อมูลการจ่ายเงิน</p>
            ) : (
              Object.keys(walletStats).map((w) => (
                <div key={w} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">{w}</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    ฿{formatMoney(walletStats[w])}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}