"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import EditTransactionModal from "@/components/EditTransactionModal";

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTx, setFilteredTx] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedWallet, setSelectedWallet] = useState<string>("all");
  const [editingTx, setEditingTx] = useState<any>(null);

  // ดึงรายการทั้งหมดจากโกดัง Supabase
  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setTransactions(data);
      setFilteredTx(data);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // ระบบค้นหาและตัวกรองอัตโนมัติ
  useEffect(() => {
    let result = transactions;

    if (selectedType !== "all") {
      result = result.filter((tx) => tx.type === selectedType);
    }

    if (selectedWallet !== "all") {
      result = result.filter((tx) => tx.wallet === selectedWallet);
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.category.toLowerCase().includes(term) ||
          (tx.note && tx.note.toLowerCase().includes(term))
      );
    }

    setFilteredTx(result);
  }, [searchTerm, selectedType, selectedWallet, transactions]);

  const formatMoney = (amount: number) =>
    amount.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* หัวกระดาษ และปุ่มกดย้อนกลับไป Dashboard */}
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">รายการธุรกรรมทั้งหมด</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              พบ {filteredTx.length} รายการ
            </p>
          </div>
        </header>

        {/* กล่องค้นหา และตัวกรองประเภท/กระเป๋าเงิน */}
        <section className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 mb-6 space-y-3 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="ค้นหาหมวดหมู่ หรือบันทึกช่วยจำ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs outline-none"
            >
              <option value="all">ทุกประเภท</option>
              <option value="expense">เฉพาะรายจ่าย</option>
              <option value="income">เฉพาะรายรับ</option>
              <option value="transfer">โอนย้าย</option>
              <option value="saving">เงินออม</option>
            </select>

            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs outline-none"
            >
              <option value="all">ทุกกระเป๋า</option>
              <option value="กรุงไทย">กรุงไทย</option>
              <option value="TrueMoney">TrueMoney</option>
              <option value="ออมสิน">ออมสิน</option>
            </select>
          </div>
        </section>

        {/* แถบแสดงรายการธุรกรรม */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          {filteredTx.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">
              ไม่พบรายการที่ตรงกับเงื่อนไข
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTx.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setEditingTx(tx)}
                  className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all cursor-pointer active:scale-[0.99] border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex justify-center items-center text-lg ${
                        tx.type === "income"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"
                          : "bg-[#f9744b]/10 text-[#f9744b] dark:bg-[#f9744b]/20"
                      }`}
                    >
                      {tx.type === "income" ? "📥" : "💸"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm md:text-base">
                        {tx.category}
                      </p>
                      <div className="flex gap-2 items-center text-xs text-slate-400">
                        <span>{tx.wallet}</span>
                        {tx.note && tx.note !== "-" && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px] md:max-w-[250px]">
                              {tx.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className={`font-bold ${
                      tx.type === "income"
                        ? "text-emerald-500"
                        : "text-slate-800 dark:text-white"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}฿
                    {formatMoney(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* หน้าต่างแก้ไข/ลบรายการ เมื่อคลิกแต่ละรายการ */}
      <EditTransactionModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onUpdated={fetchTransactions}
      />
    </div>
  );
}