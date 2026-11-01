"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, KeyRound, Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();

  // จัดการ PIN
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ส่งออกไฟล์ CSV
  const [isExporting, setIsExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dbStatus, setDbStatus] = useState<"connected" | "error" | "checking">("checking");

  useEffect(() => {
    const checkDb = async () => {
      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true });

      if (error) {
        setDbStatus("error");
      } else {
        setDbStatus("connected");
        setTotalRecords(count || 0);
      }
    };
    checkDb();
  }, []);

  // ฟังก์ชันดาวน์โหลดประวัติเป็น CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        alert("ไม่พบข้อมูลธุรกรรมสำหรับส่งออกครับ");
        setIsExporting(false);
        return;
      }

      // สร้างหัวตาราง CSV
      const headers = ["วันที่/เวลา", "ประเภท", "หมวดหมู่", "กระเป๋าเงิน", "จำนวนเงิน (THB)", "บันทึกช่วยจำ"];
      const rows = data.map((tx) => [
        `"${new Date(tx.created_at).toLocaleString("th-TH")}"`,
        `"${tx.type === "income" ? "รายรับ" : tx.type === "expense" ? "รายจ่าย" : "โอนเงิน"}"`,
        `"${tx.category || "-"}"`,
        `"${tx.wallet || "-"}"`,
        Number(tx.amount || 0).toFixed(2),
        `"${(tx.note || "-").replace(/"/g, '""')}"`,
      ]);

      // เพิ่ม \uFEFF (UTF-8 BOM) เพื่อให้ Microsoft Excel เปิดภาษาไทยได้โดยไม่เป็นภาษาต่างดาว
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `FinancePro_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
    } finally {
      setIsExporting(false);
    }
  };

  // ฟังก์ชันเปลี่ยน PIN
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem("user_pin") || "123456";

    if (oldPin !== storedPin) {
      setPinMessage({ type: "error", text: "รหัส PIN เดิมไม่ถูกต้องครับ" });
      return;
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinMessage({ type: "error", text: "รหัส PIN ใหม่ต้องเป็นตัวเลข 6 หลักเท่านั้นครับ" });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMessage({ type: "error", text: "รหัส PIN ใหม่และยืนยันรหัสไม่ตรงกันครับ" });
      return;
    }

    localStorage.setItem("user_pin", newPin);
    setPinMessage({ type: "success", text: "✅ เปลี่ยนรหัส PIN สำเร็จเรียบร้อยแล้ว!" });
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">ตั้งค่าระบบ (Settings)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              จัดการความปลอดภัย ส่งออกข้อมูลสำรอง และสถานะระบบ
            </p>
          </div>
        </header>

        <div className="space-y-6">
          
          {/* ส่วนที่ 1: ส่งออกข้อมูลสำรอง (Data Backup) */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold">ส่งออกข้อมูลธุรกรรม (Export CSV)</h2>
                <p className="text-xs text-slate-400">
                  ดาวน์โหลดรายการบัญชีทั้งหมดเพื่อนำไปเปิดใน Microsoft Excel หรือ Google Sheets
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                รายการธุรกรรมในฐานข้อมูลทั้งหมด: <strong className="text-slate-800 dark:text-white">{totalRecords}</strong> รายการ
              </span>
              <button
                onClick={handleExportCSV}
                disabled={isExporting || totalRecords === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                ดาวน์โหลดไฟล์ .CSV
              </button>
            </div>
          </section>

          {/* ส่วนที่ 2: เปลี่ยนรหัส PIN เข้าใช้งาน */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold">เปลี่ยนรหัส PIN เข้าสู่ระบบ</h2>
                <p className="text-xs text-slate-400">
                  รหัสตัวเลข 6 หลักสำหรับปลดล็อกหน้าจอ
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  รหัส PIN เดิม
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full sm:w-64 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-center tracking-widest text-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                    รหัส PIN ใหม่ (6 หลัก)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••••"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-center tracking-widest text-lg font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                    ยืนยันรหัส PIN ใหม่
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="••••••"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#f9744b] text-center tracking-widest text-lg font-bold"
                    required
                  />
                </div>
              </div>

              {pinMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    pinMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-500 border border-red-500/20"
                  }`}
                >
                  {pinMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#f9744b] hover:brightness-110 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-[#f9744b]/20 active:scale-95 cursor-pointer"
              >
                บันทึกรหัส PIN ใหม่
              </button>
            </form>
          </section>

          {/* ส่วนที่ 3: สถานะการเชื่อมต่อฐานข้อมูล */}
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Database size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold">Supabase Cloud Database</h2>
                <p className="text-xs text-slate-400">สถานะการเชื่อมต่อคลังข้อมูล</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {dbStatus === "connected" && (
                <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <CheckCircle2 size={14} /> เชื่อมต่อปกติ
                </span>
              )}
              {dbStatus === "error" && (
                <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                  <AlertCircle size={14} /> ขัดข้อง
                </span>
              )}
              {dbStatus === "checking" && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Loader2 className="animate-spin" size={14} /> กำลังตรวจสอบ...
                </span>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}