import React, { useState } from "react";
import { Barang, BatchStok, MutasiBarang, Pegawai, SystemSettings, LaporanBulanan } from "../types";
import { 
  AlertTriangle, 
  Package, 
  Layers, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  FileText, 
  Bell,
  Sparkles,
  Printer
} from "lucide-react";
import KopSurat from "./KopSurat";

interface DashboardProps {
  barangList: Barang[];
  stokList: BatchStok[];
  mutasiList: MutasiBarang[];
  pegawaiList: Pegawai[];
  currentUser: Pegawai | null;
  getAggregatedStock: () => Record<string, { total: number; detail: BatchStok[] }>;
  getAverageMonthlyUsage: (kodeBarang: string) => number;
  onNavigate?: (tab: "dashboard" | "master_barang" | "permintaan" | "penerimaan" | "pemakaian" | "stok" | "pegawai" | "pengaturan") => void;
  systemSettings: SystemSettings | null;
  laporanBulananList: LaporanBulanan[];
  addLaporanBulanan: (report: LaporanBulanan) => Promise<void>;
}

export default function Dashboard({
  barangList,
  stokList,
  mutasiList,
  pegawaiList,
  currentUser,
  getAggregatedStock,
  getAverageMonthlyUsage,
  onNavigate,
  systemSettings,
  laporanBulananList,
  addLaporanBulanan
}: DashboardProps) {
  const [showDocModal, setShowDocModal] = useState(false);
  const [reportMonth, setReportMonth] = useState("06"); // Juni (current month in 2026-06-01)
  const [reportYear, setReportYear] = useState("2026");

  // Calculations
  const aggStock = getAggregatedStock();
  
  // Total items in lab
  const totalItemCount = barangList.length;

  // 1. Stock warning calculations (alert alarm if total stock <= stokMinimum)
  const criticalItems = barangList.map((b) => {
    const totalQty = aggStock[b.kodeBarang]?.total || 0;
    const isCritical = totalQty <= b.stokMinimum;
    return {
      ...b,
      totalQty,
      isCritical,
    };
  }).filter((x) => x.isCritical);

  // 2. Expired items calculations (expired or expiring in next 30 days from 2026-06-01)
  const currentDate = new Date("2026-06-01");
  const thirtyDaysLater = new Date("2026-07-01");

  const expiringSoonBatches = stokList.map((s) => {
    const bInfo = barangList.find((b) => b.kodeBarang === s.kodeBarang);
    const expDate = new Date(s.tanggalExpired);
    const diffTime = expDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...s,
      namaBarang: bInfo?.namaBarang || "Unknown Item",
      kategori: bInfo?.kategori || "Umum",
      satuan: bInfo?.satuan || "",
      diffDays,
      isExpired: diffTime < 0,
      isExpiringSoon: diffDays > 0 && diffDays <= 30,
    };
  }).filter((x) => (x.isExpired || x.isExpiringSoon) && x.jumlah > 0);

  // 3. Mutation summarizes
  const totalInTransactions = mutasiList.filter((m) => m.jenis === "MASUK").length;
  const totalOutTransactions = mutasiList.filter((m) => m.jenis === "KELUAR").length;

  // Division stock calculation
  const divisionStats: Record<string, { totalItems: number; totalQty: number }> = {
    "Hematologi": { totalItems: 0, totalQty: 0 },
    "Kimia Klinik": { totalItems: 0, totalQty: 0 },
    "Imuno-Serologi": { totalItems: 0, totalQty: 0 },
    "Mikrobiologi": { totalItems: 0, totalQty: 0 },
    "BDRS": { totalItems: 0, totalQty: 0 },
    "Sampling": { totalItems: 0, totalQty: 0 },
    "Urinalisis": { totalItems: 0, totalQty: 0 },
  };

  barangList.forEach((b) => {
    const totalQty = aggStock[b.kodeBarang]?.total || 0;
    if (divisionStats[b.kategori]) {
      divisionStats[b.kategori].totalItems += 1;
      divisionStats[b.kategori].totalQty += totalQty;
    }
  });

  // Print report trigger
  const handlePrintReport = async () => {
    const printContent = document.getElementById("printable-monthly-report");
    if (!printContent) return;

    // Check if there is already a snapshot for this month & year
    const existingSnap = (laporanBulananList || []).find(
      (snap) => snap.bulan === reportMonth && snap.tahun === reportYear
    );

    if (!existingSnap) {
      const activeSigneeNip = systemSettings?.penanggungJawabNip || "197504252007012016";
      const activeSigneeNama = systemSettings?.penanggungJawabNama || "dr. Miftahul Ilmiah, Sp.Pk.";
      const activeSigneeJabatan = systemSettings?.penanggungJawabJabatan || "Kepala Instalasi Laboratorium";

      const newSnap: LaporanBulanan = {
        id: `${reportYear}_${reportMonth}`,
        bulan: reportMonth,
        tahun: reportYear,
        penanggungJawabNip: activeSigneeNip,
        penanggungJawabNama: activeSigneeNama,
        penanggungJawabJabatan: activeSigneeJabatan,
        tanggalCetak: new Date().toISOString().slice(0, 10),
      };

      try {
        await addLaporanBulanan(newSnap);
      } catch (err) {
        console.error("Gagal menyimpan snapshot LaporanBulanan:", err);
      }
    }

    setTimeout(() => {
      window.print();
    }, 750);
  };

  // Month names Indonesian helper
  const indonesianMonths = [
    { value: "01", name: "Januari" },
    { value: "02", name: "Februari" },
    { value: "03", name: "Maret" },
    { value: "04", name: "April" },
    { value: "05", name: "Mei" },
    { value: "06", name: "Juni" },
    { value: "07", name: "Juli" },
    { value: "08", name: "Agustus" },
    { value: "09", name: "September" },
    { value: "10", name: "Oktobeer" },
    { value: "11", name: "November" },
    { value: "12", name: "Desember" },
  ];

  // Get active or snapshotted signee for Laporan Bulanan
  const currentSnap = (laporanBulananList || []).find(
    (snap) => snap.bulan === reportMonth && snap.tahun === reportYear
  );

  const signeeNip = currentSnap ? currentSnap.penanggungJawabNip : (systemSettings?.penanggungJawabNip || "197504252007012016");
  const signeeNama = currentSnap ? currentSnap.penanggungJawabNama : (systemSettings?.penanggungJawabNama || "dr. Miftahul Ilmiah, Sp.Pk.");
  const signeeJabatan = currentSnap ? currentSnap.penanggungJawabJabatan : (systemSettings?.penanggungJawabJabatan || "Kepala Instalasi Laboratorium");

  const selectedMonthName = indonesianMonths.find(m => m.value === reportMonth)?.name || "Juni";

  // Mutasi logs for report
  const filteredReportMutasi = mutasiList.filter((m) => {
    const mDate = new Date(m.tanggal);
    const mMonthStr = String(mDate.getMonth() + 1).padStart(2, "0");
    const mYearStr = String(mDate.getFullYear());
    return mMonthStr === reportMonth && mYearStr === reportYear;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-natural-sidebar via-[#2E4848] to-[#1F3333] border border-natural-sidebar-hover rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-natural-accent/5 rounded-full filter blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-natural-accent/15 text-natural-accent border border-natural-accent/30 text-[11px] px-2.5 py-1 rounded-full font-medium tracking-wider uppercase inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Sesi Aktif Logistik lab
            </span>
            <h1 className="text-2xl font-bold font-display text-white mt-2">
              Sistem Logistik Lab Husada Prima
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Selamat bekerja, <strong className="text-white">{currentUser?.nama || "User"}</strong> ({currentUser?.jabatan}). Monitor persediaan, mutasi real-time, dan ajukan permintaan langsung.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
            <button
              onClick={() => setShowDocModal(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-natural-accent to-emerald-600 hover:from-natural-accent-hover hover:to-emerald-500 text-stone-900 font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-stone-900" />
              Laporan Bulanan (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Barang */}
        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-natural-muted uppercase tracking-wider">Item Terdaftar</p>
              <h3 className="text-2xl font-bold font-display text-natural-heading mt-1">{totalItemCount}</h3>
            </div>
            <div className="p-3 bg-natural-bg text-natural-sidebar rounded-xl border border-natural-border">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-natural-border-light pt-3">
            <span className="text-xs text-natural-muted">Total Kategori</span>
            <span className="text-xs font-medium text-natural-text">7 Divisi Lab</span>
          </div>
        </div>

        {/* Card 2: Stok Menipis */}
        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-natural-muted uppercase tracking-wider">Stok Kritis / Menipis</p>
              <h3 className="text-2xl font-bold font-display text-natural-heading mt-1">{criticalItems.length}</h3>
            </div>
            <div className={`p-3 rounded-xl ${criticalItems.length > 0 ? 'bg-[#FFF4F2] text-rose-600 animate-pulse border border-[#FFDAD4]' : 'bg-natural-bg text-natural-muted border border-natural-border'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-natural-border-light pt-3">
            <span className="text-xs text-natural-muted">Patokan Alarm</span>
            <span className="text-xs font-medium text-rose-600">Stok &le; Stok Minimum</span>
          </div>
        </div>

        {/* Card 3: Expired Alert */}
        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-natural-muted uppercase tracking-wider">Exp. / Hampir Exp.</p>
              <h3 className="text-2xl font-bold font-display text-natural-heading mt-1">{expiringSoonBatches.length}</h3>
            </div>
            <div className={`p-3 rounded-xl ${expiringSoonBatches.length > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-natural-bg text-natural-muted border border-natural-border'}`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-natural-border-light pt-3">
            <span className="text-xs text-natural-muted">Kedaluwarsa Dekat</span>
            <span className="text-xs font-medium text-natural-text">Rentang 30 Hari</span>
          </div>
        </div>

        {/* Card 4: Log Mutasi */}
        <div className="bg-white border border-natural-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-natural-muted uppercase tracking-wider">Histori Mutasi</p>
              <h3 className="text-2xl font-bold font-display text-natural-heading mt-1">{mutasiList.length}</h3>
            </div>
            <div className="p-3 bg-natural-border-light text-natural-accent rounded-xl border border-natural-border">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-natural-border-light pt-3 text-xs text-natural-muted">
            <span className="flex items-center gap-0.5 text-natural-accent font-medium">
              <ArrowUpRight className="w-3 h-3" /> {totalInTransactions} Masuk
            </span>
            <span className="flex items-center gap-0.5 text-rose-600 font-medium">
              <ArrowDownLeft className="w-3 h-3" /> {totalOutTransactions} Keluar
            </span>
          </div>
        </div>
      </div>

      {/* Main Alert Panel for Critical Stock and Expiration Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alarm Banner */}
        <div className="bg-white border border-natural-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-natural-row-bg border-b border-natural-border flex items-center justify-between">
            <h3 className="font-semibold text-sm text-natural-heading flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> ALARM STOK MENIPIS & CRITICAL
            </h3>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {criticalItems.length} PERINGATAN
            </span>
          </div>
          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[300px]">
            {criticalItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8 text-natural-muted">
                <Package className="w-10 h-10 opacity-30 stroke-1 mb-2" />
                <p className="text-xs font-medium">Semua stok berada dalam kondisi aman.</p>
              </div>
            ) : (
              criticalItems.map((item) => (
                <div 
                  key={item.kodeBarang}
                  className="p-3 bg-natural-row-bg border-l-4 border-amber-500 rounded-r-lg flex items-center justify-between text-xs hover:bg-natural-bg/50 transition-all border-y border-r border-natural-border"
                >
                  <div>
                    <h4 className="font-bold text-natural-heading">{item.namaBarang}</h4>
                    <p className="text-natural-muted mt-0.5 font-mono text-[10px]">
                      Kode: {item.kodeBarang} &bull; Divisi: {item.kategori}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-natural-text font-semibold font-display">
                      Sisa: <span className="text-rose-600 font-bold">{item.totalQty}</span> {item.satuan}
                    </div>
                    <div className="text-[10px] text-natural-muted mt-0.5">
                      Min Stok: {item.stokMinimum} {item.satuan}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiration Hazard Panel */}
        <div className="bg-white border border-natural-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-natural-row-bg border-b border-natural-border flex items-center justify-between">
            <h3 className="font-semibold text-sm text-natural-heading flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" /> PERINGATAN KEDALUWARSA (ED)
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {expiringSoonBatches.length} ALERT
            </span>
          </div>
          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[300px]">
            {expiringSoonBatches.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8 text-natural-muted">
                <Calendar className="w-10 h-10 opacity-30 stroke-1 mb-2" />
                <p className="text-xs font-medium">Tidak ada barang kedaluwarsa dalam 30 hari.</p>
              </div>
            ) : (
              expiringSoonBatches.map((batch, index) => (
                <div 
                  key={`${batch.kodeBarang}-${batch.tanggalExpired}-${index}`}
                  className={`p-3 border-l-4 rounded-r-lg flex items-center justify-between text-xs border-y border-r border-natural-border ${batch.isExpired ? 'bg-natural-alert-bg border-natural-alert-text' : 'bg-orange-50/70 border-orange-400'}`}
                >
                  <div>
                    <h4 className="font-bold text-natural-heading">{batch.namaBarang}</h4>
                    <p className="text-natural-muted mt-0.5 font-mono text-[10px]">
                      Batch Expired: <span className="font-semibold underline text-slate-700">{batch.tanggalExpired}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-natural-text font-display block">
                      {batch.jumlah} {batch.satuan}
                    </span>
                    <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md inline-block ${batch.isExpired ? 'bg-rose-200 text-rose-800' : 'bg-orange-200 text-orange-950'}`}>
                      {batch.isExpired ? "KADALUWARSA!" : `${batch.diffDays} hari tersisa`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visual Progress / Inventory status per division */}
      <div className="bg-white border border-natural-border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-natural-heading uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4.5 h-4.5 text-natural-sidebar" /> SEBARAN MUTASI & DISTRIBUSI DIVISI LAB
        </h3>
        <div className="space-y-4">
          {Object.entries(divisionStats).map(([divisi, data]) => {
            const cap = 200; // arbitrary max for visual scaling
            const percentage = Math.min(100, Math.round((data.totalQty / cap) * 100));
            return (
              <div key={divisi} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-natural-text">{divisi}</span>
                  <span className="text-natural-muted">
                    <strong className="text-natural-heading">{data.totalQty}</strong> item ({data.totalItems} unit master)
                  </span>
                </div>
                <div className="w-full bg-natural-border-light h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-natural-sidebar to-natural-accent h-full rounded-full transition-all duration-1000"
                    style={{ width: `${percentage > 0 ? percentage : 1}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Document Printing Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-natural-border">
            {/* Modal Actions */}
            <div className="p-4 bg-natural-sidebar text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-natural-accent" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Laporan Bulanan</h3>
                  <p className="text-[10px] text-slate-400">Siap Cetak PDF Instan</p>
                </div>
              </div>

              {/* Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="bg-natural-sidebar-hover border border-[#446666]/60 rounded-lg text-xs px-2.5 py-1.5 focus:border-natural-accent outline-none text-slate-200"
                >
                  {indonesianMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="bg-natural-sidebar-hover border border-[#446666]/60 rounded-lg text-xs px-2.5 py-1.5 focus:border-natural-accent outline-none text-slate-200"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>

                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 bg-natural-accent hover:bg-natural-accent-hover text-stone-900 text-xs font-bold px-4 py-1.5 rounded-lg ml-2 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak PDF
                </button>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 ml-2 font-medium cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable View */}
            <div className="p-8 overflow-y-auto max-h-[75vh]" id="printable-monthly-report">
              <div className="print-area max-w-3xl mx-auto bg-white p-4 text-slate-900 font-sans relative">
                
                {/* Dynamic Style Sheet configuration from System Settings */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    @page {
                      size: ${systemSettings ? (systemSettings.pilihanKertas === "F4" ? "215mm 330mm" : systemSettings.pilihanKertas === "Letter" ? "letter" : "A4") : "A4"};
                      margin-top: ${systemSettings ? systemSettings.marginAtas : 15}mm !important;
                      margin-bottom: ${systemSettings ? systemSettings.marginBawah : 15}mm !important;
                      margin-left: ${systemSettings ? systemSettings.marginKiri : 15}mm !important;
                      margin-right: ${systemSettings ? systemSettings.marginKanan : 15}mm !important;
                    }
                  }
                ` }} />

                {/* Official Kop */}
                <KopSurat />

                {/* Report Header Title */}
                <div className="text-center my-6">
                  <h3 className="text-base font-bold uppercase tracking-wider underline">
                    LAPORAN STATUS & MUTASI PERSEDIAAN LABORATORIUM
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 font-bold">
                    Periode: {selectedMonthName} {reportYear}
                  </p>
                </div>

                {/* Main Table Inventory */}
                <h4 className="text-xs font-bold uppercase border-b border-stone-400 pb-1 mb-2">
                  I. RINGKASAN PERSIDIAAN BARANG (& DIVISI LAB)
                </h4>
                <table className="w-full text-left text-xs mb-6 border-collapse">
                  <thead>
                    <tr className="border-b-2 border-stone-300 bg-stone-100 text-stone-800 font-bold">
                      <th className="py-2 px-1">Kode</th>
                      <th className="py-2 px-1">Nama Barang</th>
                      <th className="py-2 px-1">Divisi Lab</th>
                      <th className="py-2 px-1 text-center">Stok Min</th>
                      <th className="py-2 px-1 text-center">Stok Riil</th>
                      <th className="py-2 px-1">Satuan</th>
                      <th className="py-2 px-1 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barangList.map((b) => {
                      const totalQty = aggStock[b.kodeBarang]?.total || 0;
                      const isMenipis = totalQty <= b.stokMinimum;
                      return (
                        <tr key={b.kodeBarang} className="border-b border-stone-200 py-1">
                          <td className="py-1 px-1 font-mono text-[10px]">{b.kodeBarang}</td>
                          <td className="py-1 px-1 font-bold">{b.namaBarang}</td>
                          <td className="py-1 px-1">{b.kategori}</td>
                          <td className="py-1 px-1 text-center">{b.stokMinimum}</td>
                          <td className="py-1 px-1 text-center font-bold">{totalQty}</td>
                          <td className="py-1 px-1">{b.satuan}</td>
                          <td className="py-1 px-1 text-right">
                            <span className={isMenipis ? "text-red-600 font-bold uppercase text-[9px]" : "text-green-600 font-semibold text-[9px]"}>
                              {isMenipis ? "Menipis" : "Cukup"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Sub Table Mutations during current month */}
                <h4 className="text-xs font-bold uppercase border-b border-stone-400 pb-1 mb-2">
                  II. LOG MUTASI TRANSAKSI (MASUK / KELUAR) BULANAN
                </h4>
                {filteredReportMutasi.length === 0 ? (
                  <p className="text-xs text-stone-500 italic mb-6">
                    Tidak ada mutasi masuk/keluar yang tercatat untuk periode ini.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs mb-6 border-collapse">
                    <thead>
                      <tr className="border-b-2 border-stone-300 bg-stone-100 text-stone-800 font-bold">
                        <th className="py-2 px-1">Tgl</th>
                        <th className="py-2 px-1">Jenis</th>
                        <th className="py-2 px-1">Nama Barang</th>
                        <th className="py-2 px-1 text-center">Qty</th>
                        <th className="py-2 px-1">Keterangan / ED</th>
                        <th className="py-2 px-1">Operator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReportMutasi.map((m, idx) => {
                        const bObj = barangList.find(b => b.kodeBarang === m.kodeBarang);
                        return (
                          <tr key={idx} className="border-b border-stone-200">
                            <td className="py-1.5 px-1 font-mono text-[10px]">{new Date(m.tanggal).toLocaleDateString("id-ID")}</td>
                            <td className="py-1.5 px-1 font-bold">
                              <span className={m.jenis === "MASUK" ? "text-emerald-700" : "text-rose-700"}>
                                {m.jenis}
                              </span>
                            </td>
                            <td className="py-1.5 px-1">{bObj?.namaBarang || "Unknown Item"}</td>
                            <td className="py-1.5 px-1 text-center font-bold">{m.jumlah}</td>
                            <td className="py-1.5 px-1 text-stone-600">{m.keterangan}</td>
                            <td className="py-1.5 px-1 font-medium">{m.operator}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Signature box section compliant with RSUD Husada Prima templates */}
                <div className="signature-container-single flex justify-end mt-12">
                  <div className="signature-block text-left" style={{ width: "280px" }}>
                    <p className="text-stone-500 mb-16">
                      Surabaya, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      <br/>
                      Mengetahui,<br/>
                      {signeeJabatan},
                    </p>
                    <p className="font-bold underline">{signeeNama}</p>
                    <p className="text-[10px] text-stone-600">NIP. {signeeNip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
