import React, { useState, useEffect, useRef } from "react";
import { Barang, MutasiBarang, Pegawai, BatchStok } from "../types";
import { 
  Flame, 
  Search, 
  QrCode, 
  User, 
  History, 
  Download, 
  Printer, 
  AlertCircle, 
  ArrowRight, 
  Trash2,
  Settings,
  HelpCircle,
  TrendingUp,
  FileCheck2,
  Camera,
  X
} from "lucide-react";
import KopSurat from "./KopSurat";
import { Html5Qrcode } from "html5-qrcode";

interface PemakaianBarangProps {
  barangList: Barang[];
  pegawaiList: Pegawai[];
  mutasiList: MutasiBarang[];
  stokList: BatchStok[];
  useItemManualRaw: (
    kodeBarang: string,
    jumlahDiminta: number,
    tanggal: string,
    operator: string,
    keterangan: string
  ) => Promise<{ success: boolean; error?: string; qtyDeducted: number }>;
  getAggregatedStock: () => Record<string, { total: number; detail: BatchStok[] }>;
}

export default function PemakaianBarangComponent({
  barangList,
  pegawaiList,
  mutasiList,
  stokList,
  useItemManualRaw,
  getAggregatedStock,
}: PemakaianBarangProps) {
  // UI Panels
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportMonth, setReportMonth] = useState("06");
  const [reportYear, setReportYear] = useState("2026");

  // Form Fields
  const [selectedKode, setSelectedKode] = useState("");
  const [qtyToUse, setQtyToUse] = useState<number>(1);
  const [operatorName, setOperatorName] = useState(() => pegawaiList[0]?.nama || "");
  const [keterangan, setKeterangan] = useState("Pemakaian Rutin Laborat");
  const [manualScannedCode, setManualScannedCode] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Camera scanning states for Pemakaian
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraScanError, setCameraScanError] = useState("");
  const cameraScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isCameraScannerOpen) {
      setCameraScanError("");
      const elementId = "pemakaian-camera-scanner-view";
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode(elementId);
          cameraScannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 20,
              qrbox: (w, h) => {
                // Setara dengan 90% lebar layar HP pengguna untuk kecepatan scan maksimal
                const bw = Math.floor(w * 0.90);
                const bh = Math.floor(h * 0.60);
                return { width: bw, height: bh };
              },
              aspectRatio: 1.777778,
            },
            (decodedText) => {
              handleCameraScanSuccess(decodedText);
            },
            () => {}
          );
        } catch (err) {
          console.error("Gagal start camera", err);
          setCameraScanError("Gagal mengakses kamera belakang. Pastikan izin kamera diaktifkan.");
        }
      };

      const timer = setTimeout(() => {
        startScanner();
      }, 300);

      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
  }, [isCameraScannerOpen]);

  const stopCamera = async () => {
    if (cameraScannerRef.current) {
      if (cameraScannerRef.current.isScanning) {
        try {
          await cameraScannerRef.current.stop();
        } catch (stopErr) {
          console.error("Gagal stop camera", stopErr);
        }
      }
      cameraScannerRef.current = null;
    }
  };

  const handleCameraScanSuccess = (code: string) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1100;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}

    setIsCameraScannerOpen(false);
    
    const matched = barangList.find(b => b.kodeBarang === code);
    if (matched) {
      setSelectedKode(code);
      setSuccessMsg(`Barcode "${code}" terdeteksi: Reagen "${matched.namaBarang}" terpilih.`);
      setTimeout(() => setSuccessMsg(""), 4050);
    } else {
      setErrorMsg(`Barcode "${code}" tidak terdaftar di dalam Master Kamus.`);
    }
  };

  const aggStock = getAggregatedStock();

  // Handle addition of items
  const handleUseItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedKode) {
      setErrorMsg("Harap pilih barang reagen atau BMHP yang akan digunakan!");
      return;
    }

    if (qtyToUse <= 0) {
      setErrorMsg("Kuantitas pemakaian harus bernilai positif!");
      return;
    }

    const targetBarang = barangList.find((b) => b.kodeBarang === selectedKode);
    if (!targetBarang) {
      setErrorMsg("Barang tidak valid!");
      return;
    }

    const todayStr = "2026-06-01"; // lock walking timeline
    
    // Execute FEFO subtraction
    const result = await useItemManualRaw(
      selectedKode,
      qtyToUse,
      todayStr,
      operatorName,
      keterangan
    );

    if (result.success) {
      setSuccessMsg(`Berhasil mengurangi stok ${qtyToUse} ${targetBarang.satuan} dari [${targetBarang.namaBarang}] menggunakan skema FEFO!`);
      // Reset form fields
      setSelectedKode("");
      setQtyToUse(1);
    } else {
      setErrorMsg(result.error || "Gagal mengurangi stok!");
    }
  };

  // Keyboard/Enter scan helper for pemakaian
  const handleScanPemakaian = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    const code = manualScannedCode.trim();
    if (!code) return;

    const match = barangList.find(b => b.kodeBarang === code);
    if (!match) {
      setErrorMsg(`Barcode "${code}" tidak terdaftar dalam Master Kamus.`);
      return;
    }

    // select it in the form
    setSelectedKode(code);
    setManualScannedCode("");
    setSuccessMsg(`Barcode "${code}" siap digunakan. Masukkan jumlah dan simpan.`);
  };

  // Filter mutation logs of "KELUAR" (pemakaian)
  const allUsageLogs = mutasiList.filter((m) => m.jenis === "KELUAR");

  // INDONESIAN MONTHS
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
    { value: "10", name: "Oktober" },
    { value: "11", name: "November" },
    { value: "12", name: "Desember" },
  ];

  const selectedMonthName = indonesianMonths.find(m => m.value === reportMonth)?.name || "Juni";

  // Calculate monthly aggregate usage per item for selected month/year report
  // item_code -> { nama, kategori, total_used, satuan }
  const getMonthlyAggregateReport = () => {
    const reportData: Record<string, { nama: string; kategori: string; totalUsed: number; satuan: string }> = {};
    
    // Seed all barang list to make report look complete
    barangList.forEach((b) => {
      reportData[b.kodeBarang] = {
        nama: b.namaBarang,
        kategori: b.kategori,
        totalUsed: 0,
        satuan: b.satuan,
      };
    });

    // Populate usage data
    allUsageLogs.forEach((m) => {
      const logDate = new Date(m.tanggal);
      const mMonth = String(logDate.getMonth() + 1).padStart(2, "0");
      const mYear = String(logDate.getFullYear());

      if (mMonth === reportMonth && mYear === reportYear) {
        if (reportData[m.kodeBarang]) {
          reportData[m.kodeBarang].totalUsed += m.jumlah;
        }
      }
    });

    return Object.entries(reportData).map(([kode, val]) => ({
      kode,
      ...val,
    }));
  };

  const reportItems = getMonthlyAggregateReport();

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* Top Header details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Pencatatan Pemakaian Rutin Lab (Stok Keluar)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat barang keluar untuk dipakai operasional laboratorium. Sistem memotong stok otomatis berbasis skema FEFO (kadar ED terdekat dihabiskan dulu).
          </p>
        </div>

        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <span>Laporan Pemakaian Perbulan PDF</span>
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Main Alerts success or failures */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
          <FileCheck2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TWO SECTIONS: FORM INPUT & BARCODE ASSIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Scan Barcode assist */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-teal-400">Scan Keluar Pemakaian</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-4">
              Silakan mendaftarkan pengeluaran barang langsung dengan men-scan barcode atau menggunakan kamera.
            </p>

            <button
              onClick={() => {
                setIsCameraScannerOpen(true);
                setCameraScanError("");
              }}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer mb-5"
            >
              <Camera className="w-4 h-4 text-white" />
              Scan Barcode (Kamera)
            </button>

            <div className="border-t border-slate-800/80 my-4 pt-4">
              <form onSubmit={handleScanPemakaian}>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                  Input Barcode Handheld Reader
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scan barcode disini..."
                    value={manualScannedCode}
                    onChange={(e) => setManualScannedCode(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-teal-400 outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 text-[11px] px-3 font-semibold rounded-lg text-slate-300 font-sans cursor-pointer border border-slate-700"
                  >
                    Enter
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Panel 2 & 3: Manual input form and stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Flame className="w-4.5 h-4.5 text-orange-500 animate-pulse" /> Formulir Input Pengeluaran Barang
          </h3>

          <form onSubmit={handleUseItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  1. Pilih Item Reagen / BMHP (Kamus Master)
                </label>
                <select
                  value={selectedKode}
                  onChange={(e) => setSelectedKode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Barang Laboratorium --</option>
                  {barangList.map((b) => {
                    const stockVal = aggStock[b.kodeBarang]?.total || 0;
                    return (
                      <option key={b.kodeBarang} value={b.kodeBarang}>
                        {b.namaBarang} ({b.kodeBarang}) - Stok: {stockVal} {b.satuan}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  2. Jumlah Pemakaian (Keluar)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={qtyToUse}
                    onChange={(e) => setQtyToUse(Math.max(1, Number(e.target.value)))}
                    className="w-32 bg-slate-50 border border-slate-200 focus:border-teal-500 text-center font-bold text-slate-800 rounded-xl py-2.5 text-xs outline-none"
                  />
                  <span className="text-xs text-slate-500 font-bold">
                    {selectedKode ? barangList.find(b => b.kodeBarang === selectedKode)?.satuan : "Unit"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Operator */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  3. Diambil / Digunakan Oleh (Nama Operator)
                </label>
                <select
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer"
                >
                  {pegawaiList.map((p) => (
                    <option key={p.nip} value={p.nama}>
                      {p.nama} ({p.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              {/* Purpose notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  4. Keterangan Penggunaan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tes kimia klinik harian pasien"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2 text-xs outline-none"
                />
              </div>
            </div>

            {/* FEFO Information Display box */}
            {selectedKode && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1">
                  💡 Skema Otomatis FEFO Aktif:
                </span>
                <span>
                  Sistem mendeteksi total stock tersedia: <strong>{aggStock[selectedKode]?.total || 0}</strong> unit.
                  Bila Anda mengklik simpan, stock dengan tanggal expired paling cepat akan berkurang terlebih dahulu untuk menjamin efisiensi laborat.
                </span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Simpan & Potong Stok
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RECENT HISTORICAL USAGE LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-orange-500" /> Log Buku Harian Mutasi Keluar (Pemakaian Rutin)
          </h3>
        </div>

        <div className="overflow-x-auto text-xs text-slate-600 font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">Tanggal Pakai</th>
                <th className="p-4">Kode Item</th>
                <th className="p-4">Nama Barang Reagen</th>
                <th className="p-4 text-right">Jumlah Pakai</th>
                <th className="p-4">Satuan</th>
                <th className="p-4">Batch ED Dipotong</th>
                <th className="p-4">Operator Lab</th>
                <th className="p-4">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {allUsageLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto opacity-30 stroke-1 mb-2" />
                    <p className="text-xs font-semibold">Belum ada barang keluar/dipakai.</p>
                  </td>
                </tr>
              ) : (
                allUsageLogs.map((log) => {
                  const bObj = barangList.find(b => b.kodeBarang === log.kodeBarang);
                  return (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all text-slate-700">
                      <td className="p-4 font-medium text-slate-500">{new Date(log.tanggal).toLocaleDateString("id-ID")}</td>
                      <td className="p-4 font-mono font-bold text-slate-800">{log.kodeBarang}</td>
                      <td className="p-4 font-semibold text-slate-900">{bObj?.namaBarang || "Unknown Item"}</td>
                      <td className="p-4 text-right font-extrabold text-rose-600">{log.jumlah}</td>
                      <td className="p-4">{bObj?.satuan || "Unit"}</td>
                      <td className="p-4 font-mono font-medium text-amber-800 underline bg-amber-50 px-2 py-0.5 rounded w-max mx-auto block text-center text-[10px]">
                        Expired {log.tanggalExpired || "-"}
                      </td>
                      <td className="p-4 font-semibold">{log.operator}</td>
                      <td className="p-4 text-slate-500">{log.keterangan}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* MONTHLY USAGE PDF PRINT REPORT PREVIEW DIALOD */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal actions panel */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Cetak Laporan Pemakaian</h3>
                  <p className="text-[10px] text-slate-400">Siap Cetak PDF Instan</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Month selector inside print modal */}
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs px-2 py-1.5"
                >
                  {indonesianMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs px-2 py-1.5"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>

                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 750);
                  }}
                  className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ml-2"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak PDF Laporan
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-xs text-slate-405 hover:text-white px-2 py-1 ml-2 font-medium cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Print document render area */}
            <div className="p-8 overflow-y-auto max-h-[75vh]" id="printable-pemakaian-report">
              <div className="print-area max-w-3xl mx-auto bg-white p-4 text-slate-900 font-sans animate-fade-in">
                {/* Official Kop */}
                <KopSurat />

                {/* Surat Title */}
                <div className="text-center my-6">
                  <h3 className="text-base font-bold uppercase underline">
                    LAPORAN BULANAN PEMAKAIAN BAHAN REAGEN & BMHP MEDIS
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 font-bold">
                    Periode Penggunaan: {selectedMonthName} {reportYear}
                  </p>
                </div>

                {/* Table items report detailed usage */}
                <table className="w-full text-left text-xs mb-8 border-collapse border border-stone-300">
                  <thead>
                    <tr className="border-b border-stone-300 bg-stone-100 font-bold text-stone-800">
                      <th className="p-2 border border-stone-300 text-center w-8">No</th>
                      <th className="p-2 border border-stone-300">Kode Barang</th>
                      <th className="p-2 border border-stone-300">Nama Barang Reagen</th>
                      <th className="p-2 border border-stone-300">Kategori Divisi Lab</th>
                      <th className="p-2 border border-stone-300 text-center">Volume Terpakai</th>
                      <th className="p-2 border border-stone-300">Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportItems.map((it, idx) => (
                      <tr key={it.kode} className="border-b border-stone-200 py-1">
                        <td className="p-2 border border-stone-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-stone-300 font-mono text-[10px]">{it.kode}</td>
                        <td className="p-2 border border-stone-300 font-bold">{it.nama}</td>
                        <td className="p-2 border border-stone-300 text-stone-600">{it.kategori}</td>
                        <td className="p-2 border border-stone-300 text-center font-extrabold text-black font-mono">
                          {it.totalUsed}
                        </td>
                        <td className="p-2 border border-stone-300 text-stone-600">{it.satuan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="text-xs italic leading-relaxed text-stone-500 mb-8">
                  *Mutasi keluar telah disesuaikan dan dipotong secara real-time dari sisa persediaan fisik laboratorium.
                </p>

                {/* Signatures */}
                <div className="signature-container-single">
                  <div className="signature-block">
                    <p className="text-stone-500 mb-16">
                      Surabaya, {new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
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
      {/* Camera Barcode Scanner Modal for Pemakaian */}
      {isCameraScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 no-print">
          <div className="bg-slate-900 border-0 sm:border border-slate-800 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-[500px] h-full sm:h-auto overflow-hidden shadow-2xl flex flex-col justify-between sm:block animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-slate-950 text-slate-100 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-teal-400">
                  Mobile Barcode Scanner (Kamera)
                </h3>
              </div>
              <button 
                onClick={() => setIsCameraScannerOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="p-2 sm:p-5 flex-1 flex flex-col justify-center items-center">
              {cameraScanError ? (
                <div className="p-4 bg-rose-950/50 border border-rose-900 rounded-xl text-rose-200 text-xs text-center w-full">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2 animate-bounce" />
                  <p className="font-bold mb-1">Akses Kamera Gagal</p>
                  <p className="text-[10px] text-rose-400 leading-normal">{cameraScanError}</p>
                </div>
              ) : (
                <div className="w-full">
                  {/* Aspect-[16/9] camera container with zero horizontal margins to guarantee maximum screen sizing */}
                  <div className="scanner-container relative w-full aspect-[16/9] bg-black rounded-lg sm:rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                    <div id="pemakaian-camera-scanner-view" className="w-full h-full object-cover"></div>
                    <div className="scanner-laser"></div>
                    {/* Centered Guide Box Overlay targeting 1-D barcode aspects */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2 sm:p-4">
                      <div className="w-full max-w-[92%] h-[60%] border-2 border-dashed border-teal-400/80 rounded-lg flex items-center justify-center bg-teal-400/5">
                        <div className="text-[9px] sm:text-[10px] text-teal-300 font-bold uppercase tracking-wider bg-slate-900/90 px-2.5 py-1 rounded-md shadow-xs animate-pulse">
                          Sejajarkan Barcode Di Sini
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center mt-2.5 font-mono font-semibold">
                    *Membaca otomatis format CODE128, EAN, QR Code, dll.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-900 flex gap-2 shrink-0">
              <button
                onClick={() => setIsCameraScannerOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Tutup Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
