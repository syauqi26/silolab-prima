import React, { useState } from "react";
import { Barang, LogPenerimaan, Pegawai, PermintaanBarang, BatchStok } from "../types";
import { 
  PackageCheck, 
  QrCode, 
  Search, 
  UserCheck, 
  Plus, 
  Trash2, 
  Edit,
  Printer, 
  AlertCircle, 
  ClipboardCheck, 
  FileText,
  Workflow,
  HelpCircle,
  Truck
} from "lucide-react";
import KopSurat from "./KopSurat";

interface PenerimaanBarangProps {
  barangList: Barang[];
  pegawaiList: Pegawai[];
  permintaanList: PermintaanBarang[];
  penerimaanList: LogPenerimaan[];
  receiveItems: (log: LogPenerimaan) => void;
  deletePenerimaan: (logId: string) => void;
  updatePenerimaan: (oldLogId: string, updatedLog: LogPenerimaan) => void;
  getAggregatedStock: () => Record<string, { total: number; detail: BatchStok[] }>;
  currentUser: Pegawai | null;
}

export default function PenerimaanBarangComponent({
  barangList,
  pegawaiList,
  permintaanList,
  penerimaanList,
  receiveItems,
  deletePenerimaan,
  updatePenerimaan,
  getAggregatedStock,
  currentUser,
}: PenerimaanBarangProps) {
  // UI Panels
  const [showForm, setShowForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState<LogPenerimaan | null>(null);

  const isSuperUser = currentUser?.nip === "199606282022041001";

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmClass?: string;
    onConfirm: () => void;
  } | null>(null);

  // Form states
  const [refReqNo, setRefReqNo] = useState("");
  const [logfarNama, setLogfarNama] = useState("Budi Santoso"); // Default Budi from Logfar
  const [logfarNip, setLogfarNip] = useState("198801102009031001");

  // Basket of incoming goods
  const [basketItems, setBasketItems] = useState<{
    kodeBarang: string;
    namaBarang: string;
    satuan: string;
    jumlahDiterima: number;
    tanggalExpired: string;
  }[]>([]);

  // Scanning fields and error/success
  const [scannedCodeInput, setScannedCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const aggStock = getAggregatedStock();

  // Populate basket if a pending Request is selected as reference!
  const handleSelectRequestRef = (noSurat: string) => {
    setRefReqNo(noSurat);
    if (!noSurat) {
      setBasketItems([]);
      return;
    }

    const foundReq = permintaanList.find((r) => r.noSurat === noSurat);
    if (foundReq) {
      // Find the items that still require some arrivals
      const itemsToReceive = foundReq.items.map((it) => {
        const deficit = Math.max(0, it.jumlahDiminta - it.jumlahDiterima);
        return {
          kodeBarang: it.kodeBarang,
          namaBarang: it.namaBarang,
          satuan: it.satuan,
          jumlahDiterima: deficit > 0 ? deficit : 0,
          tanggalExpired: "2026-12-31", // default guess, user can modify
        };
      });
      setBasketItems(itemsToReceive);
      
      // Auto pre-fill correct logfar courier based on purpose
      if (foundReq.tujuan === "ATK") {
        setLogfarNama("Diana Putri, S.E.");
        setLogfarNip("199009182015022002");
      } else {
        setLogfarNama("Budi Santoso");
        setLogfarNip("198801102009031001");
      }
    }
  };

  const handleBarcodeScanned = (code: string) => {
    setErrorMsg("");
    const matchedMaster = barangList.find((b) => b.kodeBarang === code);
    if (!matchedMaster) {
      setErrorMsg(`Kode barcode [${code}] tidak ada di database! Silakan daftarkan dulu di Master Barang.`);
      return;
    }

    // Is it already in basket? Increments it, else adds
    setBasketItems((prev) => {
      const idx = prev.findIndex((i) => i.kodeBarang === code);
      if (idx > -1) {
        return prev.map((item, i) => 
          i === idx ? { ...item, jumlahDiterima: item.jumlahDiterima + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            kodeBarang: matchedMaster.kodeBarang,
            namaBarang: matchedMaster.namaBarang,
            satuan: matchedMaster.satuan,
            jumlahDiterima: 1,
            tanggalExpired: "2026-12-31",
          }
        ];
      }
    });

    setScannedCodeInput("");
  };

  const handleUpdateBasketQty = (kode: string, val: number) => {
    setBasketItems((prev) =>
      prev.map((i) => (i.kodeBarang === kode ? { ...i, jumlahDiterima: val } : i))
    );
  };

  const handleUpdateBasketED = (kode: string, ed: string) => {
    setBasketItems((prev) =>
      prev.map((i) => (i.kodeBarang === kode ? { ...i, tanggalExpired: ed } : i))
    );
  };

  const handleRemoveFromBasket = (kode: string) => {
    setBasketItems((prev) => prev.filter((i) => i.kodeBarang !== kode));
  };

  const handleSubmitPenerimaan = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (basketItems.length === 0) {
      setErrorMsg("Basket penerimaan kosong! Harap scan atau pilih minimal 1 barang.");
      return;
    }

    if (basketItems.some((b) => b.jumlahDiterima <= 0)) {
      setErrorMsg("Kuantitas barang diterima harus bernilai lebih dari 0!");
      return;
    }

    if (basketItems.some((b) => !b.tanggalExpired)) {
      setErrorMsg("Harap tentukan tanggal kedaluwarsa untuk tiap reagen/BHP yang datang!");
      return;
    }

    if (!logfarNama.trim()) {
      setErrorMsg("Nama perwakilan Logistik Farmasi/ATK wajib diisi!");
      return;
    }

    if (!currentUser) {
      setErrorMsg("Sesi pegawai tidak ditemukan! Harap hubungkan Google Auth dan Login.");
      return;
    }

    if (editingLogId) {
      const updatedLog: LogPenerimaan = {
        id: editingLogId,
        noSuratReferensi: refReqNo || undefined,
        tanggal: "2026-06-01", // locked to walking timeline
        operatorNip: currentUser.nip,
        operatorNama: currentUser.nama,
        logfarNip: logfarNip.trim() || "-",
        logfarNama: logfarNama.trim(),
        items: basketItems,
      };

      updatePenerimaan(editingLogId, updatedLog);
      setEditingLogId(null);
      setSuccessMsg(`Penerimaan barang [${editingLogId}] berhasil diperbarui dan disinkronisasi ke Firestore!`);
    } else {
      const newLog: LogPenerimaan = {
        id: `PEN-${Date.now()}`,
        noSuratReferensi: refReqNo || undefined,
        tanggal: "2026-06-01", // locked to walking timeline
        operatorNip: currentUser.nip,
        operatorNama: currentUser.nama,
        logfarNip: logfarNip.trim() || "-",
        logfarNama: logfarNama.trim(),
        items: basketItems,
      };

      receiveItems(newLog);
      setSuccessMsg(`Penerimaan barang dari logfar berhasil diverifikasi dan ditandatangani!`);
    }

    // Reset Form
    setBasketItems([]);
    setRefReqNo("");
    setShowForm(false);
    setTimeout(() => setSuccessMsg(""), 4500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        {/* View Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Penandatanganan & Penerimaan Barang Masuk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat barang datang dari Logfar/ATK menggunakan barcode scanner fisik, mereferensikan surat permintaan, dan mengisi Multi Expiration Date.
          </p>
        </div>

        <button
          onClick={() => {
            if (editingLogId) {
              setEditingLogId(null);
              setBasketItems([]);
              setRefReqNo("");
              setLogfarNama("Budi Santoso");
              setLogfarNip("198801102009031001");
              setShowForm(false);
            } else {
              setShowForm(!showForm);
            }
            setErrorMsg("");
          }}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          {editingLogId 
            ? `Batal Edit [${editingLogId}]` 
            : showForm ? "Tutup Form Penerimaan" : "Catat Penerimaan Baru"}
          <PackageCheck className="w-4.5 h-4.5" />
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* NEW ARRIVAL FORM WIZARD */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md animate-in fade-in duration-150">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Truck className="w-4.5 h-4.5 text-teal-600" /> 
            {editingLogId 
              ? `Edit Data Verifikasi Penerimaan - ${editingLogId}` 
              : "Registrasi Verifikasi Barang Kedatangan"}
          </h3>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPenerimaan} className="space-y-4">
            {/* Split Ref No Surat and Staff signatures */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Optional Surat Permintaan correlation */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Referensi No Surat (Opsional)
                </label>
                <select
                  value={refReqNo}
                  onChange={(e) => handleSelectRequestRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Mode Bebas Tanpa Referensi --</option>
                  {permintaanList
                    .filter((r) => r.status === "Diproses" || r.status === "Diterima Sebagian")
                    .map((r) => (
                      <option key={r.noSurat} value={r.noSurat}>
                        {r.noSurat} [{r.tujuan}]
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  *Memilih surat akan mengimpor list barang defisit secara otomatis.
                </span>
              </div>

              {/* Ttd Pihak Logfar - Nama */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Nama Petugas Logistik (Karier)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={logfarNama}
                  onChange={(e) => setLogfarNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none"
                />
              </div>

              {/* Ttd Pihak Logfar - NIP */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  NIP Petugas Logistik
                </label>
                <input
                  type="text"
                  placeholder="NIP. 1988..."
                  value={logfarNip}
                  onChange={(e) => setLogfarNip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none"
                />
              </div>

              {/* Pihak Lab Verifikator */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Verifikator Serah Terima (Lab)
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-bold">
                  {currentUser?.nama || "Tidak Dikenal"} (NIP. {currentUser?.nip || "-"})
                </div>
              </div>
            </div>

            {/* BARCODE SCANNER FIELD */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
                <QrCode className="w-5 h-5 flex-shrink-0 animate-pulse text-teal-400" />
                <span>Input Cari Kode Barcode:</span>
              </div>
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Letakkan kursor disini & scan barcode reagen atau ketik manual..."
                  value={scannedCodeInput}
                  onChange={(e) => setScannedCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (scannedCodeInput.trim() !== "") {
                        handleBarcodeScanned(scannedCodeInput.trim());
                      }
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-teal-400 text-teal-300 text-xs rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (scannedCodeInput.trim() !== "") {
                    handleBarcodeScanned(scannedCodeInput.trim());
                  }
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-all flex-shrink-0 cursor-pointer"
              >
                Tambah
              </button>
            </div>

            {/* Quick Virtual scanning assist inside forms */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Pilih Cepat Barcode Master:</span>
              <div className="flex flex-wrap gap-1">
                {barangList.slice(0, 4).map(b => (
                  <button
                    type="button"
                    key={b.kodeBarang}
                    onClick={() => handleBarcodeScanned(b.kodeBarang)}
                    className="bg-white border border-slate-200 hover:border-teal-500 hover:bg-teal-50 px-2 py-1 text-[10px] rounded font-mono text-slate-700 cursor-pointer"
                  >
                    + Scan {b.kodeBarang}
                  </button>
                ))}
              </div>
            </div>

            {/* Reception Basket table */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Daftar Barang yang Diterima
              </p>

              {basketItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white">
                  Keranjang penerimaan kosong. Silakan ketik/scan barcode reagen di atas.
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                        <th className="p-3">Nama Reagen / Item</th>
                        <th className="p-3">Kode Barcode</th>
                        <th className="p-3 w-28 text-center">Qty Diterima</th>
                        <th className="p-3 text-center">Satuan</th>
                        <th className="p-3">Tanggal Kedaluwarsa (ED)</th>
                        <th className="p-3 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {basketItems.map((b) => (
                        <tr key={b.kodeBarang} className="border-b border-slate-50">
                          <td className="p-3 font-bold text-slate-800">{b.namaBarang}</td>
                          <td className="p-3 font-mono font-medium text-slate-500">{b.kodeBarang}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={b.jumlahDiterima}
                              onChange={(e) => handleUpdateBasketQty(b.kodeBarang, Math.max(1, Number(e.target.value)))}
                              className="w-20 bg-slate-50 border border-slate-200 focus:border-teal-500 text-center font-bold font-display rounded-lg py-1 px-2 text-xs"
                            />
                          </td>
                          <td className="p-3 text-center font-medium text-slate-500">{b.satuan}</td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={b.tanggalExpired}
                              onChange={(e) => handleUpdateBasketED(b.kodeBarang, e.target.value)}
                              className="bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-lg p-1.5 text-xs outline-none text-slate-700 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromBasket(b.kodeBarang)}
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

            {/* Form actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (editingLogId) {
                    setEditingLogId(null);
                    setBasketItems([]);
                    setRefReqNo("");
                    setLogfarNama("Budi Santoso");
                    setLogfarNip("198801102009031001");
                  }
                  setShowForm(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2 px-6 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {editingLogId ? "Simpan Perubahan Penerimaan" : "Verifikasi Serah Terima"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RECEPTION HISTORICAL LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-teal-600" /> Log Bukti Serah Terima Penerimaan Barang
          </h3>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {penerimaanList.length} BUKTI
          </span>
        </div>

        <div className="overflow-x-auto font-sans text-slate-600 text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">Tgl Penerimaan</th>
                <th className="p-4">No Referensi Surat</th>
                <th className="p-4">Kurir Logistik</th>
                <th className="p-4">Operator Penerima (Lab)</th>
                <th className="p-4 text-center">Banyak Item</th>
                <th className="p-4 text-center">Cetak PDF</th>
                {isSuperUser && <th className="p-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {penerimaanList.length === 0 ? (
                <tr>
                  <td colSpan={isSuperUser ? 7 : 6} className="text-center py-12 text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto opacity-30 stroke-1 mb-2" />
                    <p className="text-xs font-semibold">Belum ada barang masuk yang tercatat.</p>
                  </td>
                </tr>
              ) : (
                penerimaanList.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                    <td className="p-4 font-medium text-slate-500">{new Date(log.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="p-4 font-mono text-slate-700">
                      {log.noSuratReferensi ? (
                        <span className="font-bold text-teal-700">{log.noSuratReferensi}</span>
                      ) : (
                        <span className="text-slate-400 italic">Bebas/Tanpa Ref</span>
                      )}
                    </td>
                    <td className="p-4 font-medium">{log.logfarNama}</td>
                    <td className="p-4 font-semibold text-slate-800">{log.operatorNama}</td>
                    <td className="p-4 text-center font-bold text-slate-900 font-display">{log.items.length} Item</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setShowPrintModal(log)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                      >
                        <Printer className="w-3.5 h-3.5" /> Pratinjau TTD
                      </button>
                    </td>
                    {isSuperUser && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => {
                              // Populate fields
                              setRefReqNo(log.noSuratReferensi || "");
                              setLogfarNama(log.logfarNama);
                              setLogfarNip(log.logfarNip);
                              setBasketItems(log.items);
                              setEditingLogId(log.id);
                              setShowForm(true);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] px-2.5 py-1.5 rounded inline-flex items-center gap-1 border border-teal-200 transition-all cursor-pointer"
                            title="Edit Penerimaan"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: "Hapus Penerimaan",
                                message: `Apakah Anda yakin ingin menghapus log penerimaan barang [${log.id}] secara permanen? Seluruh stok reagen dan mutasi masuk yang terkait juga akan disesuaikan/revert secara otomatis ke database Firestore.`,
                                confirmText: "Ya, Hapus",
                                confirmClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500",
                                onConfirm: () => {
                                  deletePenerimaan(log.id);
                                }
                              });
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] px-2.5 py-1.5 rounded inline-flex items-center gap-1 border border-rose-200 transition-all cursor-pointer"
                            title="Hapus Penerimaan"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
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

      {/* DOUBLE TT SIGN RECEIFT PRINT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal action bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">Bukti Serah Terima Penerimaan Barang</h3>
                  <p className="text-[10px] text-slate-400">Verifikasi dua tanda tangan sah</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 750);
                  }}
                  className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Bukti PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(null)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Document sheet body */}
            <div className="p-8 overflow-y-auto max-h-[75vh]" id="printable-penerimaan-report">
              <div className="print-area max-w-3xl mx-auto bg-white p-4 text-slate-900 font-sans">
                {/* Official Kop */}
                <KopSurat />

                {/* Surat Title */}
                <div className="text-center my-6">
                  <h3 className="text-sm font-bold uppercase underline">
                    BERITA ACARA & BUKTI PENERIMAAN BARANG LOGFAR/ATK
                  </h3>
                  <p className="text-xs font-semibold font-mono text-stone-700 mt-1">
                    ID Transaksi: {showPrintModal.id}
                  </p>
                  <p className="text-xs font-medium text-stone-600 mt-0.5">
                    Rujukan Surat Permintaan: {showPrintModal.noSuratReferensi || "Mode Bebas / Pembelian Langsung"}
                  </p>
                </div>

                {/* Body Meta Content */}
                <div className="text-xs leading-relaxed space-y-2 mb-6">
                  <p>Pada hari ini, <strong>Senin, 1 Juni 2026</strong>, bertempat di laboratorium Patologi Klinik RSUD Husada Prima Surabaya, telah dilakukan serah terima pengadaan logistik barang reagen / BMHP medis sebagai berikut:</p>
                </div>

                {/* Items receipt list table */}
                <table className="w-full text-left text-xs mb-8 border-collapse border border-stone-300">
                  <thead>
                    <tr className="border-b border-stone-300 bg-stone-100 font-bold text-stone-800">
                      <th className="p-2 border border-stone-300 text-center w-8">No</th>
                      <th className="p-2 border border-stone-300">Kode Barang</th>
                      <th className="p-2 border border-stone-300">Nama Barang / Reagen</th>
                      <th className="p-2 border border-stone-300 text-center">Jumlah Diterima</th>
                      <th className="p-2 border border-stone-300 text-center">Satuan</th>
                      <th className="p-2 border border-stone-300 text-center">Tanggal Kedaluwarsa (ED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showPrintModal.items.map((it, idx) => (
                      <tr key={it.kodeBarang} className="border-b border-stone-200">
                        <td className="p-2 border border-stone-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-stone-300 font-mono text-[10px]">{it.kodeBarang}</td>
                        <td className="p-2 border border-stone-300 font-bold">{it.namaBarang}</td>
                        <td className="p-2 border border-stone-300 text-center font-bold text-black">{it.jumlahDiterima}</td>
                        <td className="p-2 border border-stone-300 text-center text-stone-600">{it.satuan}</td>
                        <td className="p-2 border border-stone-300 text-center font-mono underline font-medium text-stone-800">
                          {it.tanggalExpired ? new Date(it.tanggalExpired).toLocaleDateString("id-ID") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="text-xs leading-relaxed mb-12">
                  Barang-barang tersebut di atas telah dicheck secara fisik, di-verifikasi melalui system SILOLAB PRIMA dan mutasi stok diperbarui secara real-time. Kedua belah pihak menyatakan setuju atas kebenaran berita acara serah terima barang ini.
                </p>

                 {/* DOUBLE SIGNATURE BLOCKS */}
                <div className="signature-container block w-full">
                  <div className="grid grid-cols-2 text-center text-xs mt-12 gap-8">
                    <div>
                      <p className="text-stone-500 font-medium mb-16">
                        Pihak I (Menyerahkan),<br/>Perwakilan Logistik Farmasi / ATK,
                      </p>
                      <p className="font-bold underline">{showPrintModal.picLuarNama || "_________________"}</p>
                      <p className="text-[10px] text-stone-600">NIP. {showPrintModal.picLuarNip || "_________________"}</p>
                    </div>
                    <div>
                      <p className="text-stone-500 font-medium mb-16">
                        Pihak II (Menerima),<br/>Petugas Laboratorium,
                      </p>
                      <p className="font-bold underline">{currentUser?.nama || "Yusri Hikmawati, S.ST."}</p>
                      <p className="text-[10px] text-stone-600">NIP. {currentUser?.nip || "198804022012032001"}</p>
                    </div>
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
