"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [wallets, setWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [debtorName, setDebtorName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");

  // Return dialog
  const [selectedDebtId, setSelectedDebtId] = useState<number | null>(null);
  const [returnWallet, setReturnWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [recRes, walRes] = await Promise.all([
      supabase.from("receivables").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("name"),
    ]);

    if (recRes.data) setReceivables(recRes.data);
    if (walRes.data) {
      const wList = walRes.data.map((w) => w.name);
      setWallets(wList);
      if (wList.length > 0) {
        setWallet(wList[0]);
        setReturnWallet(wList[0]);
      }
    }
    setLoading(false);
  };

  const pendingList = receivables.filter((r) => r.status === "⏳ รอคืนเงิน");
  const paidList = receivables.filter((r) => r.status === "✅ คืนแล้ว");

  const totalPending = pendingList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalPaid = paidList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  // เพิ่มรายการคนติดเงินใหม่
  const handleAddReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!debtorName || isNaN(numAmt) || numAmt <= 0) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");

    setSubmitting(true);
    const nowIso = new Date().toISOString();

    // 1. เพิ่มในตาราง receivables
    const { error: recErr } = await supabase.from("receivables").insert({
      debtor_name: debtorName,
      description: description || "หารค่าใช้จ่าย",
      amount: numAmt,
      wallet: wallet,
      status: "⏳ รอคืนเงิน",
      created_at: nowIso,
    });

    // 2. บันทึกลง transactions เป็นเงินทดจ่าย
    await supabase.from("transactions").insert({
      type: "🤝 เงินทดจ่าย",
      category: `ลูกหนี้: ${debtorName}`,
      amount: numAmt,
      note: `หารบิล: ${description}`,
      wallet: wallet,
      created_at: nowIso,
    });

    setSubmitting(false);
    if (!recErr) {
      setDebtorName("");
      setDescription("");
      setAmount("");
      loadData();
    }
  };

  // กดยืนยันรับเงินคืน
  const handleConfirmPaid = async (debt: any) => {
    if (!confirm(`ยืนยันว่าได้รับเงินคืน ฿${debt.amount} จาก ${debt.debtor_name} แล้ว?`)) return;

    setSubmitting(true);
    const nowIso = new Date().toISOString();

    // 1. อัปเดตสถานะเป็นคืนแล้ว
    await supabase
      .from("receivables")
      .update({ status: "✅ คืนแล้ว", returned_at: nowIso })
      .eq("id", debt.id);

    // 2. บันทึกรับคืนเงินเข้า transactions
    await supabase.from("transactions").insert({
      type: "🤝 รับคืนเงินทดจ่าย",
      category: `ลูกหนี้: ${debt.debtor_name}`,
      amount: Number(debt.amount),
      note: "ได้รับคืนเงินที่ทดจ่ายไปก่อน",
      wallet: returnWallet,
      created_at: nowIso,
    });

    setSubmitting(false);
    loadData();
  };

  // ลบรายการ
  const handleDelete = async (id: number) => {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    await supabase.from("receivables").delete().eq("id", id);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 sm:p-8 pb-28">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🤝 ระบบหารค่าใช้จ่าย & ลูกหนี้ (Receivables)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกเงินทดจ่ายเวลาหารค่าข้าวกับเพื่อนหรือคนใกล้ชิด ระบบจะหักเงินสดออกชั่วคราว และบวกกลับเข้าบัญชีเมื่อกดยืนยันคืนเงิน
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg">
            <span className="text-xs text-slate-400 font-medium">⏳ ยอดเงินที่คนอื่นยังติดอยู่ (รอคืน)</span>
            <h2 className="text-3xl font-extrabold text-[#f9744b] mt-1">
              ฿{totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg">
            <span className="text-xs text-slate-400 font-medium">✅ ได้รับคืนมาแล้วทั้งหมด</span>
            <h2 className="text-3xl font-extrabold text-[#2a9d8f] mt-1">
              ฿{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        {/* 2 คอลัมน์: บันทึกคนติดเงินใหม่ & รายการรอคืนเงิน */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ฟอร์มเพิ่มลูกหนี้ */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-slate-200">➕ เพิ่มรายการคนติดเงิน / หารค่าข้าว</h3>
            <form onSubmit={handleAddReceivable} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ชื่อคนติดเงิน (เช่น แฟน, เพื่อน)</label>
                <input
                  type="text"
                  required
                  placeholder="ระบุชื่อ..."
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f9744b]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">รายการ / รายละเอียด (เช่น หารค่าข้าว, ค่าชาบู)</label>
                <input
                  type="text"
                  placeholder="รายละเอียดบิล..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f9744b]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">จำนวนเงินที่ต้องจ่ายคืน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-[#f9744b]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">ทดจ่ายออกจากกระเป๋าไหน?</label>
                <select
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                disabled={submitting}
                className="w-full bg-[#f9744b] hover:bg-[#e76f51] text-white font-bold py-2.5 rounded-xl transition"
              >
                {submitting ? "กำลังบันทึก..." : "💾 บันทึกคนติดเงิน (ตัดเงินทดจ่าย)"}
              </button>
            </form>
          </div>

          {/* รายการรอรับคืนเงิน */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-slate-200">⏳ รายการที่รอคืนเงิน ({pendingList.length})</h3>

            <div className="mb-2">
              <label className="text-xs text-slate-400 mb-1 block">รับเงินคืนเข้ากระเป๋าไหน?</label>
              <select
                value={returnWallet}
                onChange={(e) => setReturnWallet(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {wallets.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pendingList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  ไม่มีรายการคนติดเงินค้างอยู่ตอนนี้ครับ 🎉
                </div>
              ) : (
                pendingList.map((debt) => (
                  <div
                    key={debt.id}
                    className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-2"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">
                        {debt.debtor_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {debt.description} • {debt.wallet}
                      </div>
                      <div className="text-xs text-[#f9744b] font-bold mt-0.5">
                        ฿{Number(debt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleConfirmPaid(debt)}
                        disabled={submitting}
                        className="bg-[#2a9d8f] hover:bg-[#21867a] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                      >
                        ✅ คืนแล้ว
                      </button>
                      <button
                        onClick={() => handleDelete(debt.id)}
                        className="text-slate-500 hover:text-red-400 text-xs px-2 py-2"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ตารางประวัติคนติดเงินทั้งหมด */}
        <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg space-y-3">
          <h3 className="text-base font-bold text-slate-200">📋 ประวัติคนติดเงินทั้งหมด</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">วันที่</th>
                  <th className="p-2.5">ลูกหนี้</th>
                  <th className="p-2.5">รายการ</th>
                  <th className="p-2.5">จำนวนเงิน</th>
                  <th className="p-2.5">กระเป๋า</th>
                  <th className="p-2.5">สถานะ</th>
                  <th className="p-2.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {receivables.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5">{new Date(r.created_at).toLocaleDateString("th-TH")}</td>
                    <td className="p-2.5 font-bold text-white">{r.debtor_name}</td>
                    <td className="p-2.5">{r.description}</td>
                    <td className="p-2.5 font-bold text-[#f9744b]">฿{Number(r.amount).toLocaleString()}</td>
                    <td className="p-2.5">{r.wallet}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "✅ คืนแล้ว"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}