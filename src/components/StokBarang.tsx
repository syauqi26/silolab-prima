import React, { useState } from "react";
import { Barang, BatchStok, DivisiLab, Pegawai } from "../types";
import { 
  Package, 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  FileSpreadsheet, 
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  BadgeAlert,
  Printer
} from "lucide-react";
import KopSurat from "./KopSurat";

interface StokBarangProps {
  barangList: Barang[];
  stokList: BatchStok[];
  getAggregatedStock: () => Record<string, { total: number; detail: BatchStok[] }>;
  getAverageMonthlyUsage?: (kodeBarang: string) => number;
  currentUser?: Pegawai | null;
}

export default function StokBarangComponent({
  barangList,
  stokList,
  getAggregatedStock,
  getAverageMonthlyUsage,
  currentUser,
}: StokBarangProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [sortOrder, setSortOrder] = useState<"name" | "stockAsc" | "stockDesc">("name");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintMenipisModal, setShowPrintMenipisModal] = useState(false);

  const aggStock = getAggregatedStock();
  const today = new Date("2026-06-01"); // locked current time

  // Get all active batches grouped/analyzed
  const activeBatches = stokList
    .filter((s) => s.jumlah > 0)
    .map((s) => {
      const bObj = barangList.find((b) => b.kodeBarang === s.kodeBarang);
      const expDate = new Date(s.tanggalExpired);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let status: "expired" | "near_ed" | "aman" = "aman";
      let statusText = "Aman";
      if (diffTime < 0) {
        status = "expired";
        statusText = "Kadaluarsa";
      } else if (diffDays <= 30) {
        status = "near_ed";
        statusText = "Mendekati ED";
      }
      
      return {
        ...s,
        namaBarang: bObj?.namaBarang || "Barang Tidak Dikenal",
        kategori: bObj?.kategori || "Umum",
        satuan: bObj?.satuan || "Pcs",
        diffDays,
        status,
        statusText,
      };
    })
    .sort((a, b) => new Date(a.tanggalExpired).getTime() - new Date(b.tanggalExpired).getTime());

  const expiredBatches = activeBatches.filter(b => b.status === "expired");
  const nearEdBatches = activeBatches.filter(b => b.status === "near_ed");
  const amanBatches = activeBatches.filter(b => b.status === "aman");

  const totalAmanQty = amanBatches.reduce((sum, b) => sum + b.jumlah, 0);
  const totalNearEdQty = nearEdBatches.reduce((sum, b) => sum + b.jumlah, 0);
  const totalExpiredQty = expiredBatches.reduce((sum, b) => sum + b.jumlah, 0);

  // Build complete list of items with their integrated batch structures
  const combinedStokItems = barangList.map((b) => {
    // Collect all batches for this item with qty > 0
    const rawBatches = stokList.filter((s) => s.kodeBarang === b.kodeBarang && s.jumlah > 0);
    
    // Sort batches by expiry date (FEFO layout representation)
    const sortedBatches = rawBatches.sort(
      (a, b) => new Date(a.tanggalExpired).getTime() - new Date(b.tanggalExpired).getTime()
    );

    const totalQty = rawBatches.reduce((sum, s) => sum + s.jumlah, 0);
    const isCritical = totalQty <= b.stokMinimum;

    // Is there any batch already expired or expiring very soon?
    const hasExpiredBatch = rawBatches.some((s) => {
      const expDate = new Date(s.tanggalExpired);
      return expDate.getTime() < today.getTime();
    });

    const hasUrgentBatch = rawBatches.some((s) => {
      const expDate = new Date(s.tanggalExpired);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30; // 30 days
    });

    return {
      ...b,
      batches: sortedBatches,
      totalQty,
      isCritical,
      hasExpiredBatch,
      hasUrgentBatch,
    };
  });

  // Filter & Search
  const filteredStokItems = combinedStokItems.filter((item) => {
    const matchesSearch = 
      item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "Semua" || item.kategori === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Sorting
  if (sortOrder === "name") {
    filteredStokItems.sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));
  } else if (sortOrder === "stockAsc") {
    filteredStokItems.sort((a, b) => a.totalQty - b.totalQty);
  } else if (sortOrder === "stockDesc") {
    filteredStokItems.sort((a, b) => b.totalQty - a.totalQty);
  }

  // Categories helper
  const categoriesList: DivisiLab[] = [
    "Hematologi", 
    "Kimia Klinik", 
    "Imuno-Serologi", 
    "Mikrobiologi", 
    "BDRS", 
    "Sampling", 
    "Urinalisis"
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* View Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Status & Batch Kedaluwarsa Persediaan Real-Time
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Memantau rincian mutasi persediaan reagen per tanggal kedaluwarsa. Satu barang bisa terbagi menjadi banyak batch ED yang berbeda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowPrintMenipisModal(true)}
            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-rose-500/25 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak PDF Reagen Menipis
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-teal-500/25 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak PDF Total Barang
          </button>
        </div>
      </div>

      {/* Expiry Badge Guide Legend */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 text-xs font-sans text-slate-600 justify-between select-none">
        <span className="font-bold flex items-center gap-1.5 text-slate-700">
          <Clock className="w-4 h-4 text-slate-500" /> Panduan Warna Kedaluwarsa (ED):
        </span>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-rose-600 rounded-md ring-2 ring-rose-200"></span>
            <span className="font-semibold text-rose-950">Sudah Kedaluwarsa (ED lampau)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-orange-400 rounded-md ring-2 ring-orange-100"></span>
            <span className="font-semibold text-orange-950">Mendekati ED (&le; 30 Hari)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-md ring-2 ring-emerald-100"></span>
            <span className="font-semibold text-emerald-950">Stok Aman (&gt; 30 Hari)</span>
          </span>
        </div>
      </div>

      {/* Filters Pane */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari item di stock (nama atau kode barcode)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2 text-xs outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Category select */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer text-slate-700"
        >
          <option value="Semua">Semua Divisi Lab</option>
          {categoriesList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer text-slate-700 font-medium"
        >
          <option value="name">Urut: Nama A-Z</option>
          <option value="stockAsc">Urut: Stok Paling Sedikit</option>
          <option value="stockDesc">Urut: Stok Paling Banyak</option>
        </select>
      </div>

      {/* MAIN CARDS GRID WITH REAL EXPIRATION BATCH CAROUSELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStokItems.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl py-12 text-center text-slate-400">
            <HelpCircle className="w-10 h-10 mx-auto opacity-30 stroke-1 mb-2" />
            <p className="text-xs font-semibold">Tidak ada barang yang cocok dengan filter persediaan.</p>
          </div>
        ) : (
          filteredStokItems.map((item) => (
            <div 
              key={item.kodeBarang}
              className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                item.isCritical 
                  ? 'border-rose-200/80 ring-2 ring-rose-50/50' 
                  : item.hasExpiredBatch 
                  ? 'border-rose-200 bg-rose-50/10' 
                  : item.hasUrgentBatch 
                  ? 'border-orange-200 bg-orange-50/5' 
                  : 'border-slate-200/80'
              }`}
            >
              {/* Header card info */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                      {item.kategori}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-2 hover:text-teal-800 transition-colors">
                      {item.namaBarang}
                    </h3>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                      Barcode: {item.kodeBarang}
                    </p>
                  </div>
                  
                  {/* Status lights info */}
                  {item.isCritical ? (
                    <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                      <BadgeAlert className="w-3 h-3 text-rose-600" /> Kritis
                    </span>
                  ) : item.hasExpiredBatch ? (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      ED Lampau!
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Normal
                    </span>
                  )}
                </div>

                {/* Sisa Total Riil display */}
                <div className="mt-4 flex items-baseline gap-2 bg-slate-50 border p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Riil Lab:</span>
                  <span className={`text-xl font-black font-display ${item.isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.totalQty}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{item.satuan}</span>
                  <span className="text-[10px] text-slate-400 ml-auto font-mono">
                    Min: {item.stokMinimum}
                  </span>
                </div>

                {/* Listing of Batches and Expirations (THE CORE REQUIREMENT) */}
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Rincian Batch Kadaluwarsa (ED):
                  </p>
                  
                  {item.batches.length === 0 ? (
                    <p className="text-[11px] text-rose-500 italic font-medium py-1">
                      &bull; Saldo kosong! Belum ada stok aktif yang ter-input.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {item.batches.map((batch, idx) => {
                        const expDate = new Date(batch.tanggalExpired);
                        const diffTime = expDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        let badgeColor = "border-emerald-200 bg-emerald-50 text-emerald-950 text-emerald-700";
                        if (diffTime < 0) {
                          badgeColor = "border-rose-300 bg-rose-50/70 text-rose-900";
                        } else if (diffDays <= 30) {
                          badgeColor = "border-orange-300 bg-orange-50 text-orange-950";
                        }

                        return (
                          <div 
                            key={`${batch.tanggalExpired}-${idx}`}
                            className={`flex items-center justify-between border p-2 rounded-lg text-xs font-medium ${badgeColor}`}
                          >
                            <span className="font-mono flex items-center gap-1">
                              📅 {batch.tanggalExpired}
                            </span>
                            <span className="font-extrabold font-display">
                              {batch.jumlah} {item.satuan}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom footer card warning detail */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between text-center select-none">
                <span>Stok minimal: {item.stokMinimum} {item.satuan}</span>
                <span className="font-bold">
                  {item.totalQty <= 0 ? (
                    <span className="text-rose-600 font-extrabold uppercase">Habis Total</span>
                  ) : item.isCritical ? (
                    <span className="text-amber-600 font-bold uppercase">Minta Pemulihan</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold uppercase">Tersedia Aman</span>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      </div>

      {/* Expiry / Stock Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Head Controls */}
            <div className="p-4 bg-teal-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Laporan Status & ED Barang</h3>
                  <p className="text-[10px] text-slate-300">Siap Cetak PDF Instan</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 750);
                  }}
                  className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-teal-950 text-xs font-black px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak PDF / Print
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-slate-700/60 hover:bg-slate-700/80 text-white text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Print Area Preview */}
            <div className="p-8 overflow-y-auto max-h-[75vh]" id="printable-stock-report">
              <div className="print-area max-w-3xl mx-auto bg-white p-4 text-slate-900 font-sans">
                {/* Official Kop */}
                <KopSurat />

                {/* Report Header Title */}
                <div className="text-center my-6">
                  <h3 className="text-base font-bold uppercase tracking-wider underline">
                    LAPORAN STATUS & MASA ED (KEDALUWARSA) PERSEDIAAN REAL-TIME
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 font-bold">
                    Unit Kerja: Instalasi Laboratorium Patologi Klinik RSUD Husada Prima Surabaya
                  </p>
                </div>

                {/* Executive Summary Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6 font-semibold shadow-sm">
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded text-center">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block text-center">Stok Aman</span>
                    <strong className="text-lg text-emerald-900">{totalAmanQty} unit</strong>
                    <span className="text-[9px] text-emerald-600 block mt-0.5">{amanBatches.length} batch (&gt;30 hari)</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-center">
                    <span className="text-[10px] text-amber-800 font-bold uppercase block text-center">Mendekati ED</span>
                    <strong className="text-lg text-amber-900">{totalNearEdQty} unit</strong>
                    <span className="text-[9px] text-amber-600 block mt-0.5">{nearEdBatches.length} batch (&le;30 hari)</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-center">
                    <span className="text-[10px] text-rose-800 font-bold uppercase block text-center">Kadaluarsa</span>
                    <strong className="text-lg text-rose-900">{totalExpiredQty} unit</strong>
                    <span className="text-[9px] text-rose-600 block mt-0.5">{expiredBatches.length} batch (ED lampau)</span>
                  </div>
                </div>

                {/* Table 1: KELOMPOK KADALUWARSA */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-rose-800 uppercase border-b border-rose-300 pb-1 mb-2">
                    I. DAFTAR BARANG KADALUWARSA (ED LAMPAU)
                  </h4>
                  {expiredBatches.length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-1">NIHIL - Tidak ada batch barang yang kedaluwarsa di laboratorium saat ini.</p>
                  ) : (
                    <table className="w-full text-left text-xs mb-4 border-collapse">
                      <thead>
                        <tr className="border-b border-stone-300 bg-stone-50 text-stone-800 font-bold">
                          <th className="py-1 px-2 w-8 text-center border border-stone-300">No</th>
                          <th className="py-1 px-2 border border-stone-300">Kode</th>
                          <th className="py-1 px-2 border border-stone-300">Nama Barang Reagen</th>
                          <th className="py-1 px-2 border border-stone-300">Kategori</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Tgl ED</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Qty</th>
                          <th className="py-1 px-2 border border-stone-300">Satuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiredBatches.map((b, idx) => (
                          <tr key={idx} className="border-b border-stone-200 py-1 font-medium">
                            <td className="py-1 px-2 text-center text-stone-600 border border-stone-200">{idx + 1}</td>
                            <td className="py-1 px-2 font-mono text-[10px] border border-stone-200">{b.kodeBarang}</td>
                            <td className="py-1 px-2 font-semibold text-rose-900 border border-stone-200">{b.namaBarang}</td>
                            <td className="py-1 px-2 text-stone-600 border border-stone-200">{b.kategori}</td>
                            <td className="py-1 px-2 text-center text-rose-600 font-bold border border-stone-200">{b.tanggalExpired}</td>
                            <td className="py-1 px-2 text-center text-rose-700 font-black border border-stone-200">{b.jumlah}</td>
                            <td className="py-1 px-2 text-stone-600 border border-stone-200">{b.satuan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Table 2: KELOMPOK MENDEKATI ED */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-amber-800 uppercase border-b border-amber-300 pb-1 mb-2">
                    II. DAFTAR BARANG MENDEKATI KEDALUWARSA (&le; 30 HARI TERSISA)
                  </h4>
                  {nearEdBatches.length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-1">NIHIL - Tidak ada batch barang yang mendekati kedaluwarsa (&le; 30 hari).</p>
                  ) : (
                    <table className="w-full text-left text-xs mb-4 border-collapse">
                      <thead>
                        <tr className="border-b border-stone-300 bg-stone-50 text-stone-800 font-bold">
                          <th className="py-1 px-2 w-8 text-center border border-stone-300">No</th>
                          <th className="py-1 px-2 border border-stone-300">Kode</th>
                          <th className="py-1 px-2 border border-stone-300">Nama Barang Reagen</th>
                          <th className="py-1 px-2 border border-stone-300">Kategori</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Tgl ED</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Sisa Hari</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Qty</th>
                          <th className="py-1 px-2 border border-stone-300">Satuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nearEdBatches.map((b, idx) => (
                          <tr key={idx} className="border-b border-stone-200 py-1 font-medium">
                            <td className="py-1 px-2 text-center text-stone-600 border border-stone-200">{idx + 1}</td>
                            <td className="py-1 px-2 font-mono text-[10px] border border-stone-200">{b.kodeBarang}</td>
                            <td className="py-1 px-2 font-semibold text-amber-900 border border-stone-200">{b.namaBarang}</td>
                            <td className="py-1 px-2 text-stone-600 border border-stone-200">{b.kategori}</td>
                            <td className="py-1 px-2 text-center text-amber-600 font-bold border border-stone-200">{b.tanggalExpired}</td>
                            <td className="py-1 px-2 text-center text-amber-700 font-bold font-mono border border-stone-200">{b.diffDays} hari</td>
                            <td className="py-1 px-2 text-center font-black border border-stone-200">{b.jumlah}</td>
                            <td className="py-1 px-2 text-stone-600 border border-stone-200">{b.satuan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Table 3: KELOMPOK PERSIDIAAN AMAN */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase border-b border-emerald-300 pb-1 mb-2">
                    III. DAFTAR PERSIDIAAN AMAN (&gt; 30 HARI TERSISA)
                  </h4>
                  {amanBatches.length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-1">NIHIL - Tidak ada persediaan dengan sisa ED aman di atas 30 hari.</p>
                  ) : (
                    <table className="w-full text-left text-xs mb-4 border-collapse">
                      <thead>
                        <tr className="border-b border-stone-300 bg-stone-50 text-stone-800 font-bold">
                          <th className="py-1 px-2 w-8 text-center border border-stone-300">No</th>
                          <th className="py-1 px-2 border border-stone-300">Kode</th>
                          <th className="py-1 px-2 border border-stone-300">Nama Barang Reagen</th>
                          <th className="py-1 px-2 border border-stone-300">Kategori</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Tgl ED</th>
                          <th className="py-1 px-2 text-center border border-stone-300">Qty</th>
                          <th className="py-1 px-2 border border-stone-300">Satuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amanBatches.map((b, idx) => (
                          <tr key={idx} className="border-b border-stone-200 py-1 font-medium">
                            <td className="py-1 px-2 text-center text-stone-600 border border-stone-200">{idx + 1}</td>
                            <td className="py-1 px-2 font-mono text-[10px] border border-stone-200">{b.kodeBarang}</td>
                            <td className="py-1 px-2 font-semibold text-slate-900 border border-stone-200">{b.namaBarang}</td>
                            <td className="py-1 px-2 text-stone-600 border border-stone-200">{b.kategori}</td>
                            <td className="py-1 px-2 text-center text-emerald-750 font-semibold border border-stone-200">{b.tanggalExpired}</td>
                            <td className="py-1 px-2 text-center text-emerald-800 font-extrabold border border-stone-200">{b.jumlah}</td>
                            <td className="py-1 px-2 text-stone-600 border border-stone-200">{b.satuan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Signature box section */}
                <div className="signature-container-single">
                  <div className="signature-block">
                    <p className="text-stone-500 mb-16 font-medium">
                      Surabaya, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      <br/>
                      Mengetahui,<br/>
                      Kepala Instalasi Laboratorium,
                    </p>
                    <p className="font-bold underline">dr. Miftahul Ilmiah, Sp.Pk.</p>
                    <p className="text-[10px] text-stone-600">NIP. 197504252007012016</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reagen Menipis Print Modal */}
      {showPrintMenipisModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Head Controls */}
            <div className="p-4 bg-rose-950 text-white flex items-center justify-between shadow-md no-print">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Laporan Reagen Menipis</h3>
                  <p className="text-[10px] text-rose-300">Menampilkan bahan-bahan reagen di bawah atau sama dengan stok minimum</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 750);
                  }}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak PDF / Print
                </button>
                <button
                  onClick={() => setShowPrintMenipisModal(false)}
                  className="bg-slate-700/60 hover:bg-slate-700/80 text-white text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Print Area Preview */}
            <div className="p-8 overflow-y-auto max-h-[75vh]" id="printable-stock-menipis-report">
              <div className="print-area max-w-3xl mx-auto bg-white p-4 text-slate-900 font-sans">
                {/* Official Kop */}
                <KopSurat />

                {/* Report Header Title */}
                <div className="text-center my-6">
                  <h3 className="text-base font-bold uppercase tracking-wider underline">
                    LAPORAN DAFTAR REAGEN DAN LOGISTIK LABORATORIUM MENIPIS
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 font-bold">
                    Unit Kerja: Instalasi Laboratorium Patologi Klinik RSUD Husada Prima Surabaya
                  </p>
                </div>

                {/* Table: KELOMPOK REAGEN MENIPIS */}
                <div className="mb-6">
                  <table className="w-full text-left text-xs mb-4 border-collapse border border-stone-300">
                    <thead>
                      <tr className="border-b border-stone-300 bg-stone-50 text-stone-800 font-bold">
                        <th className="py-2 px-3 w-12 text-center border border-stone-300">No</th>
                        <th className="py-2 px-3 border border-stone-300">Kode Barang</th>
                        <th className="py-2 px-3 border border-stone-300">Nama Reagen / Barang</th>
                        <th className="py-2 px-3 text-center border border-stone-300">Satuan</th>
                        <th className="py-2 px-3 text-center border border-stone-300">Stok Minimum</th>
                        <th className="py-2 px-3 text-center border border-stone-300">Pemakaian / Bulan</th>
                        <th className="py-2 px-3 text-center border border-stone-300 bg-rose-50/50 font-bold">Stok Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedStokItems.filter(item => item.totalQty <= item.stokMinimum).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-stone-500 italic border border-stone-200">
                            NIHIL - Seluruh stok reagen laboratorium berada dalam kondisi aman di atas batas stok minimum.
                          </td>
                        </tr>
                      ) : (
                        combinedStokItems.filter(item => item.totalQty <= item.stokMinimum).map((item, idx) => {
                          const avgUse = getAverageMonthlyUsage ? getAverageMonthlyUsage(item.kodeBarang) : 0;
                          return (
                            <tr key={item.kodeBarang} className="border-b border-stone-200 py-1.5 font-medium hover:bg-stone-50/50">
                              <td className="py-2 px-3 text-center text-stone-600 border border-stone-200">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-stone-700 border border-stone-200">{item.kodeBarang}</td>
                              <td className="py-2 px-3 font-semibold text-stone-900 border border-stone-200">{item.namaBarang}</td>
                              <td className="py-2 px-3 text-center text-stone-600 border border-stone-200">{item.satuan}</td>
                              <td className="py-2 px-3 text-center text-stone-700 border border-stone-200 font-mono">{item.stokMinimum}</td>
                              <td className="py-2 px-3 text-center text-stone-700 border border-stone-200 font-mono">{avgUse}</td>
                              <td className="py-2 px-3 text-center text-rose-700 font-black border border-stone-200 font-mono bg-rose-50/10">{item.totalQty}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signature box section */}
                <div className="signature-container-single">
                  <div className="signature-block">
                    <p className="text-stone-500 mb-16 font-medium">
                      Surabaya, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      <br/>
                      Mengetahui,<br/>
                      Kepala Instalasi Laboratorium,
                    </p>
                    <p className="font-bold underline">dr. Miftahul Ilmiah, Sp.Pk.</p>
                    <p className="text-[10px] text-stone-600">NIP. 197504252007012016</p>
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
