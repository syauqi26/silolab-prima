import React, { useState } from "react";
import { Barang, PermintaanBarang, Pegawai, BatchStok, ItemPermintaan, SystemSettings } from "../types";
import { 
  FilePlus2, 
  Search, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  FileText,
  BadgeAlert,
  FolderLock,
  LineChart,
  HelpCircle,
  TrendingDown
} from "lucide-react";
import KopSurat from "./KopSurat";

interface PermintaanBarangProps {
  barangList: Barang[];
  permintaanList: PermintaanBarang[];
  pegawaiList: Pegawai[];
  getAggregatedStock: () => Record<string, { total: number; detail: BatchStok[] }>;
  getAverageMonthlyUsage: (kodeBarang: string) => number;
  addPermintaan: (req: PermintaanBarang) => void;
  cancelPermintaan?: (noSurat: string) => void;
  deletePermintaan?: (noSurat: string) => void;
  currentUser?: any;
  systemSettings: SystemSettings | null;
  updatePermintaanSignature: (noSurat: string, nip: string, nama: string, jabatan: string) => Promise<void>;
}

export default function PermintaanBarangComponent({
  barangList,
  permintaanList,
  pegawaiList,
  getAggregatedStock,
  getAverageMonthlyUsage,
  addPermintaan,
  cancelPermintaan,
  deletePermintaan,
  currentUser,
  systemSettings,
  updatePermintaanSignature
}: PermintaanBarangProps) {
  // UI Panels
  const [showForm, setShowForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState<PermintaanBarang | null>(null);

  const isSuperUser = currentUser?.nip === "199606282022041001";

  const handlePrintPermintaan = async () => {
    if (!showPrintModal) return;

    const activeNip = systemSettings?.penanggungJawabNip || "197504252007012016";
    const activeNama = systemSettings?.penanggungJawabNama || "dr. Miftahul Ilmiah, Sp.Pk.";
    const activeJabatan = systemSettings?.penanggungJawabJabatan || "Kepala Instalasi Laboratorium";

    // Immediate local update for immediate visual sync
    setShowPrintModal({
      ...showPrintModal,
      ttdKepalaNip: activeNip,
      ttdKepalaNama: activeNama,
      ttdKepalaJabatan: activeJabatan
    });

    try {
      await updatePermintaanSignature(showPrintModal.noSurat, activeNip, activeNama, activeJabatan);
    } catch (err) {
      console.error("Gagal menyalin snapshot tanda tangan ke database:", err);
    }

    setTimeout(() => {
      window.print();
    }, 750);
  };

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmClass?: string;
    onConfirm: () => void;
  } | null>(null);

  // Form Fields
  const [tujuan, setTujuan] = useState<"Logistik Farmasi" | "ATK">("Logistik Farmasi");
  const [isCito, setIsCito] = useState(false);

  // Items added in wizard
  const [wizardItems, setWizardItems] = useState<{
    kodeBarang: string;
    namaBarang: string;
    satuan: string;
    jumlahDiminta: number;
    pemakaianBulanan: number;
    sisaStok: number;
  }[]>([]);

  // Autocomplete state
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Error/Success
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const aggStock = getAggregatedStock();

  // Autocomplete matching items
  const matchingMasterItems = itemSearchQuery.trim() === "" 
    ? [] 
    : barangList.filter((b) => {
        // filter items depending on purpose
        // For ATK, show appropriate items or show all for convenience
        return b.namaBarang.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
               b.kodeBarang.toLowerCase().includes(itemSearchQuery.toLowerCase());
      });

  const monthsIndonesian = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Logic to calculate Automatic Surat Number
  const generateAutomaticNoSurat = (tujuanSelected: "Logistik Farmasi" | "ATK", isCitoSelected: boolean) => {
    const today = new Date("2026-06-01"); // Year is locked to 2026 according to user metadata
    const monthIndex = today.getMonth(); // 5 for June
    const monthName = monthsIndonesian[monthIndex]; // "Juni"
    const year = today.getFullYear(); // 2026

    if (isCitoSelected) {
      // LAB/CITO/2026/NoUrut
      // count how many CITO requests exists in 2026
      const citoInYear = permintaanList.filter(
        (r) => r.isCito && r.noSurat.includes(`LAB/CITO/${year}/`)
      );
      const nextNum = citoInYear.length + 1;
      return `LAB/CITO/${year}/${nextNum}`;
    } else {
      // Normal: LAB/Bulan/Tahun/NoUrut (reset per month)
      const currentMonthPattern = `LAB/${monthName}/${year}/`;
      const normalInMonth = permintaanList.filter(
        (r) => !r.isCito && r.noSurat.startsWith(currentMonthPattern)
      );
      const nextNum = normalInMonth.length + 1;
      return `LAB/${monthName}/${year}/${nextNum}`;
    }
  };

  const handleAddItemToWizard = (b: Barang) => {
    // Check if duplicate in wizard list
    if (wizardItems.some((w) => w.kodeBarang === b.kodeBarang)) {
      setErrorMsg("Barang sudah ditambahkan ke daftar permintaan.");
      setTimeout(() => setErrorMsg(""), 3000);
      setItemSearchQuery("");
      return;
    }

    const currentSisa = aggStock[b.kodeBarang]?.total || 0;
    const avgUse = getAverageMonthlyUsage(b.kodeBarang);

    setWizardItems((prev) => [
      ...prev,
      {
        kodeBarang: b.kodeBarang,
        namaBarang: b.namaBarang,
        satuan: b.satuan,
        jumlahDiminta: Math.ceil(avgUse * 1.5), // sensible default demand
        pemakaianBulanan: avgUse,
        sisaStok: currentSisa,
      },
    ]);

    setItemSearchQuery("");
    setErrorMsg("");
  };

  const handleRemoveItemFromWizard = (kode: string) => {
    setWizardItems((prev) => prev.filter((d) => d.kodeBarang !== kode));
  };

  const handleUpdateQty = (kode: string, qty: number) => {
    setWizardItems((prev) =>
      prev.map((d) => (d.kodeBarang === kode ? { ...d, jumlahDiminta: qty } : d))
    );
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (wizardItems.length === 0) {
      setErrorMsg("Harap masukkan minimal 1 barang dalam nomor surat permintaan!");
      return;
    }

    // Limit item count to 20 for logic security, inform user
    if (wizardItems.length > 20) {
      setErrorMsg("Permintaan melebihi batas maksimal 20 item dalam 1 surat. Silakan bagi menjadi 2 surat.");
      return;
    }

    // Generate auto number
    const noSurat = generateAutomaticNoSurat(tujuan, isCito);
    const todayStr = "2026-06-01";

    const newReq: PermintaanBarang = {
      noSurat,
      tanggal: todayStr,
      tujuan,
      isCito,
      items: wizardItems.map((w) => ({
        ...w,
        jumlahDiterima: 0, // initially untouched
      })),
      status: "Diproses",
      ttdKepalaNip: systemSettings?.penanggungJawabNip || "197504252007012016",
      ttdKepalaNama: systemSettings?.penanggungJawabNama || "dr. Miftahul Ilmiah, Sp.Pk.",
      ttdKepalaJabatan: systemSettings?.penanggungJawabJabatan || "Kepala Instalasi Laboratorium",
      tanggalTtd: todayStr,
    };

    addPermintaan(newReq);

    // Reset states
    setWizardItems([]);
    setShowForm(false);
    setSuccessMsg(`Surat permintaan [${newReq.noSurat}] berhasil dibuat!`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // AUDIT LOG REPORT CALCULATIONS
  // count how many times we requested and how many items we are deficits
  const year2026CountNormal = permintaanList.filter(
    (p) => !p.isCito && p.tanggal.startsWith("2026")
  ).length;

  const year2026CountCito = permintaanList.filter(
    (p) => p.isCito && p.tanggal.startsWith("2026")
  ).length;

  // Track demand vs receipt deficit
  const supplyDeficits: Record<string, { nama: string; diminta: number; diterima: number }> = {};
  permintaanList.forEach((req) => {
    req.items.forEach((it) => {
      if (!supplyDeficits[it.kodeBarang]) {
        supplyDeficits[it.kodeBarang] = {
          nama: it.namaBarang,
          diminta: 0,
          diterima: 0,
        };
      }
      supplyDeficits[it.kodeBarang].diminta += it.jumlahDiminta;
      supplyDeficits[it.kodeBarang].diterima += it.jumlahDiterima;
    });
  });

  const deficitItems = Object.entries(supplyDeficits)
    .map(([kode, data]) => ({
      kode,
      nama: data.nama,
      diminta: data.diminta,
      diterima: data.diterima,
      selisih: data.diminta - data.diterima,
    }))
    .filter((x) => x.selisih > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Surat Permintaan Logistik (Farmasi / ATK)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Buat dan cetak surat permintaan resmi. Nomor surat dihitung dinamis menggunakan format reguler atau CITO.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setErrorMsg("");
          }}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          {showForm ? "Tutup Form Wizard" : "Buat Surat Permintaan Baru"}
          <FilePlus2 className="w-4 h-4" />
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Audit Stats Dashboard for Requested vs Received (1 year statistics) */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold font-display text-slate-700 tracking-wider uppercase mb-3 flex items-center gap-1.5">
          <LineChart className="w-4 h-4 text-teal-600" /> AUDIT PEMENUHAN DISTRIBUSI LOGISTIK FARMASI (TAHUN AKTIF 2026)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 backdrop-blur-md rounded-lg p-3 border border-teal-200/50">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Frekuensi Pengajuan</span>
            <div className="mt-1 flex items-center gap-4">
              <div>
                <span className="text-lg font-bold text-slate-800">{year2026CountNormal}x</span>
                <span className="text-[10px] text-slate-500 block">Permintaan Biasa</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-lg font-bold text-rose-600">{year2026CountCito}x</span>
                <span className="text-[10px] text-slate-500 block">Surat CITO Urgent</span>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-lg p-3 border border-teal-200/50 md:col-span-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> DEFISIT SUPPLY (BARANG YANG BELUM DIPENUHI LOGFAR/ATK)
            </span>
            <div className="mt-1 overflow-x-auto max-h-[100px]">
              {deficitItems.length === 0 ? (
                <p className="text-[11px] text-emerald-700 font-medium py-1">
                  &bull; Seluruh pengajuan farmasi dan ATK dipenuhi 100% tanpa defisit!
                </p>
              ) : (
                <div className="space-y-1.5 pt-1 pr-2">
                  {deficitItems.map((def) => (
                    <div key={def.kode} className="flex items-center justify-between text-[11px] border-b border-teal-100 pb-1">
                      <span className="font-bold text-slate-700 truncate max-w-xs">{def.nama}</span>
                      <span className="text-slate-500 text-right">
                        Minta: <strong>{def.diminta}</strong> &bull; Datang: <strong>{def.diterima}</strong> &bull;{" "}
                        <span className="text-rose-600 font-bold">Defisit: -{def.selisih} ({def.kode})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW REQUEST WIZARD FORM */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md animate-in fade-in duration-150">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <FilePlus2 className="w-4.5 h-4.5 text-teal-600" /> Buat Permintaan Barang Baru
          </h3>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Tujuan Permintaan
                </label>
                <select
                  value={tujuan}
                  onChange={(e) => setTujuan(e.target.value as "Logistik Farmasi" | "ATK")}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white cursor-pointer"
                >
                  <option value="Logistik Farmasi">1. Logistik Farmasi (Logfar)</option>
                  <option value="ATK">2. Logistik Alat Tulis Kantor (ATK)</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Kategori Urgensi
                </label>
                <div className="flex gap-4 pt-1.5">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="urgensi"
                      checked={!isCito}
                      onChange={() => setIsCito(false)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Biasa (Normal)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 cursor-pointer">
                    <input
                      type="radio"
                      name="urgensi"
                      checked={isCito}
                      onChange={() => setIsCito(true)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>CITO (Segera/Urgent)</span>
                  </label>
                </div>
              </div>

              {/* Kepala Signing Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Pejabat TTD Kepala Instalasi
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-bold">
                  dr. Miftahul Ilmiah, Sp.Pk. (NIP. 197504252007012016)
                </div>
              </div>
            </div>

            {/* Dynamic visual preview of the calculated order ID */}
            <div className="p-3 bg-slate-100 rounded-lg text-xs flex justify-between items-center text-slate-600 font-mono">
              <span>Nomor Surat Dihitung Otomatis:</span>
              <span className="font-bold text-slate-900 bg-white border px-2 py-0.5 rounded">
                {generateAutomaticNoSurat(tujuan, isCito)}
              </span>
            </div>

            {/* Item search box with autocomplete */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Ketik & Tambah Item dari Kamus Master Barang
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama reagen atau BMHP (contoh: 'ure', 'glu'...) untuk pencarian instan..."
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  className="w-full bg-white border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none"
                />
                <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />

                {/* Autocomplete List Dropdown */}
                {matchingMasterItems.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {matchingMasterItems.map((item, index) => {
                      const itemStock = aggStock[item.kodeBarang]?.total || 0;
                      return (
                        <button
                          type="button"
                          key={item.kodeBarang}
                          onClick={() => handleAddItemToWizard(item)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 text-xs flex justify-between items-center transition-all cursor-pointer"
                        >
                          <div>
                            <strong className="text-slate-800 block text-xs">{item.namaBarang}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{item.kodeBarang} &bull; {item.kategori}</span>
                          </div>
                          <div className="text-right">
                            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                              Lab Stok: {itemStock} {item.satuan}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Wizard temporary items table */}
              <div className="mt-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Daftar Pengajuan ({wizardItems.length} barang dipilih)
                </p>

                {wizardItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white">
                    Belum ada barang dipilih. Ketik nama barang di atas untuk menambahkan.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                          <th className="p-3">Nama Reagen / Item</th>
                          <th className="p-3">Rata-rata Pemakaian/Bln</th>
                          <th className="p-3">Stok Saat Ini (Lab)</th>
                          <th className="p-3 w-32">Kuantitas Diminta</th>
                          <th className="p-3 text-center">Satuan</th>
                          <th className="p-3 text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wizardItems.map((w) => (
                          <tr key={w.kodeBarang} className="border-b border-slate-50">
                            <td className="p-3">
                              <strong className="text-slate-800 block">{w.namaBarang}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{w.kodeBarang}</span>
                            </td>
                            <td className="p-3 font-medium text-slate-600 font-mono">
                              {w.pemakaianBulanan} / Bulan
                            </td>
                            <td className="p-3">
                              <span className={`font-semibold ${w.sisaStok === 0 ? 'text-rose-500 font-bold' : 'text-slate-700'}`}>
                                {w.sisaStok}
                              </span>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="1"
                                value={w.jumlahDiminta}
                                onChange={(e) => handleUpdateQty(w.kodeBarang, Math.max(1, Number(e.target.value)))}
                                className="w-24 bg-slate-50 border border-slate-200 focus:border-teal-500 text-center font-bold font-display rounded-lg py-1 px-2 text-xs"
                              />
                            </td>
                            <td className="p-3 text-center font-medium text-slate-500">{w.satuan}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromWizard(w.kodeBarang)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2 px-6 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Kirim Pengajuan & Cetak Nomor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORIC LETTER ARCHIVE LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-teal-600" /> Arsip Surat Permintaan (1 Tahun Berjalan)
          </h3>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {permintaanList.length} SURAT
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">Tanggal Permintaan</th>
                <th className="p-4">No. Surat Permintaan</th>
                <th className="p-4">Tujuan</th>
                <th className="p-4">Urgency</th>
                <th className="p-4 text-center">Banyak Barang</th>
                <th className="p-4 text-center font-bold">Status Pemenuhan</th>
                <th className="p-4 text-center">Cetak PDF</th>
                {isSuperUser && <th className="p-4 text-center">Batalkan / Hapus</th>}
              </tr>
            </thead>
            <tbody>
              {permintaanList.length === 0 ? (
                <tr>
                  <td colSpan={isSuperUser ? 8 : 7} className="text-center py-12 text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto opacity-35 stroke-1 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada data arsip permintaan barang.</p>
                  </td>
                </tr>
              ) : (
                permintaanList.map((req) => (
                  <tr key={req.noSurat} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all font-sans text-slate-600">
                    <td className="p-4 font-medium text-slate-500">{new Date(req.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="p-4 font-mono font-bold text-slate-800">{req.noSurat}</td>
                    <td className="p-4 font-medium">{req.tujuan}</td>
                    <td className="p-4">
                      {req.isCito ? (
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 w-max">
                          <BadgeAlert className="w-3 h-3" /> CITO
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full w-max block">
                          Biasa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-bold font-display">{req.items.length} Item</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === "Diterima Penuh" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : req.status === "Diterima Sebagian" 
                          ? "bg-amber-100 text-amber-800" 
                          : req.status === "Batal"
                          ? "bg-rose-100 text-rose-850 border border-rose-200"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setShowPrintModal(req)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                      >
                        <Printer className="w-3.5 h-3.5" /> Pratinjau
                      </button>
                    </td>
                    {isSuperUser && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5 font-sans">
                          {req.status !== "Batal" && (
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  show: true,
                                  title: "Batalkan Permintaan",
                                  message: `Apakah Anda yakin ingin membatalkan surat permintaan nomor [${req.noSurat}]? Tindakan ini akan mengubah statusnya menjadi Batal.`,
                                  confirmText: "Ya, Batalkan",
                                  confirmClass: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
                                  onConfirm: () => {
                                    cancelPermintaan && cancelPermintaan(req.noSurat);
                                  }
                                });
                              }}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] px-2 py-1 rounded border border-amber-200 transition-all cursor-pointer"
                              title="Batalkan Permintaan (Status Batal)"
                            >
                              Batalkan
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: "Hapus Permintaan Permanen",
                                message: `Apakah Anda yakin ingin menghapus surat permintaan nomor [${req.noSurat}] secara permanen? Sisa kuota tidak terpengaruh otomatis, dan data ini tidak bisa dikembalikan.`,
                                confirmText: "Ya, Hapus",
                                confirmClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-550",
                                onConfirm: () => {
                                  deletePermintaan && deletePermintaan(req.noSurat);
                                }
                              });
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] px-2 py-1 rounded border border-rose-200 transition-all cursor-pointer"
                            title="Hapus Permanen"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* PRINT OFFICIAL SHEET DIALOLG / SPECS */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal actions panel */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">Official Letter PDF Viewer</h3>
                  <p className="text-[10px] text-slate-400">Ready to save or print to physical page</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPermintaan}
                  className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak PDF KOP Surat
                </button>
                <button
                  onClick={() => setShowPrintModal(null)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Print Area Render */}
            <div className="p-8 overflow-y-auto max-h-[75vh]" id="printable-permintaan-report">
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

                {/* Surat Title Block */}
                <div className="text-center my-6">
                  <h3 className="text-sm font-bold uppercase underline">
                    SURAT PERMINTAAN KEBUTUHAN BARANG {showPrintModal.isCito && "CITO"}
                  </h3>
                  <p className="text-xs font-semibold font-mono text-stone-700 mt-1">
                    Nomor: {showPrintModal.noSurat}
                  </p>
                </div>

                {/* Meta details */}
                <div className="text-xs space-y-1 mb-6">
                  <p><strong>Kepada Yth.</strong> Kepala Bagian {showPrintModal.tujuan}</p>
                  <p>RSUD Husada Prima Surabaya</p>
                  <p className="pt-2">Dengan hormat,</p>
                  <p>Untuk menunjang pelayanan kelancaran operasional di ruang laboratorium Patologi Klinik RSUD Husada Prima Surabaya, kami mengajukan permohonan pengadaan barang-barang reagen dan BMHP di bawah ini:</p>
                </div>

                {/* Items requested table */}
                <table className="w-full text-left text-xs mb-8 border-collapse border border-stone-300">
                  <thead>
                    <tr className="border-b border-stone-300 bg-stone-100 font-bold text-stone-800">
                      <th className="p-2 border border-stone-300 text-center w-8">No</th>
                      <th className="p-2 border border-stone-300">Kode Barang</th>
                      <th className="p-2 border border-stone-300">Nama Barang / Reagen</th>
                      <th className="p-2 border border-stone-300 text-center">Pemakaian per Bulan</th>
                      <th className="p-2 border border-stone-300 text-center">Sisa Stok Lab</th>
                      <th className="p-2 border border-stone-300 text-center">Jumlah Diminta</th>
                      <th className="p-2 border border-stone-300 text-center">Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showPrintModal.items.map((it, idx) => (
                      <tr key={it.kodeBarang} className="border-b border-stone-200">
                        <td className="p-2 border border-stone-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-stone-300 font-mono text-[10px]">{it.kodeBarang}</td>
                        <td className="p-2 border border-stone-300 font-bold">{it.namaBarang}</td>
                        <td className="p-2 border border-stone-300 text-center font-mono text-stone-600">{it.pemakaianBulanan}</td>
                        <td className="p-2 border border-stone-300 text-center">{it.sisaStok}</td>
                        <td className="p-2 border border-stone-300 text-center font-bold text-black">{it.jumlahDiminta}</td>
                        <td className="p-2 border border-stone-300 text-center text-stone-600">{it.satuan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="text-xs leading-relaxed mb-8">
                  Demikian surat permintaan pengadaan ini kami buat agar kiranya dapat ditindaklanjuti sesegera mungkin demi kepentingan pelayanan medis laboratorium pasien. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.
                </p>

                {/* Footer signatures compliant with RSUD expectations */}
                <div className="signature-container-single flex justify-end mt-12 bg-white">
                  <div className="signature-block text-left" style={{ width: "280px" }}>
                    <p className="text-stone-600 font-medium mb-16">
                      Surabaya, {new Date(showPrintModal.tanggalTtd).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                      <br/>
                      Mengetahui,<br/>
                      {showPrintModal.ttdKepalaJabatan || "Kepala Instalasi Laboratorium"},
                    </p>
                    <p className="font-bold underline">{showPrintModal.ttdKepalaNama || "dr. Miftahul Ilmiah, Sp.Pk."}</p>
                    <p className="text-[10px] text-stone-600">NIP. {showPrintModal.ttdKepalaNip || "197504252007012016"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-sm ${confirmModal.confirmClass || 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}
              >
                {confirmModal.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
