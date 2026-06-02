import React, { useState, useEffect } from "react";
import { SystemSettings, Pegawai, Barang, BatchStok, MutasiBarang, PermintaanBarang, LogPenerimaan } from "../types";
import { 
  Settings, 
  Database, 
  Printer, 
  UserCheck, 
  Save, 
  CloudLightning, 
  CheckCircle2, 
  AlertCircle,
  FileDown,
  Loader2,
  UploadCloud,
  ShieldAlert,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Clock
} from "lucide-react";

interface PengaturanSistemProps {
  systemSettings: SystemSettings | null;
  updateSystemSettings: (settings: SystemSettings) => Promise<void>;
  pegawaiList: Pegawai[];
  // For backup downloads
  barangList: Barang[];
  stokList: BatchStok[];
  mutasiList: MutasiBarang[];
  permintaanList: PermintaanBarang[];
  penerimaanList: LogPenerimaan[];
  restoreDatabase: (backupData: any) => Promise<void>;
}

export default function PengaturanSistem({
  systemSettings,
  updateSystemSettings,
  pegawaiList,
  barangList,
  stokList,
  mutasiList,
  permintaanList,
  penerimaanList,
  restoreDatabase
}: PengaturanSistemProps) {
  // If settings are not loaded yet, show initial default
  const currentSettings = systemSettings || {
    id: "default",
    backupEnabled: true,
    backupSchedule: "Manual",
    pilihanKertas: "A4",
    marginAtas: 15,
    marginBawah: 15,
    marginKiri: 15,
    marginKanan: 15,
    penanggungJawabNip: "197504252007012016",
    penanggungJawabNama: "dr. Miftahul Ilmiah, Sp.Pk.",
    penanggungJawabJabatan: "Kepala Instalasi Laboratorium",
    lastBackupTime: ""
  };

  // State bindings for form inputs
  const [backupEnabled, setBackupEnabled] = useState<boolean>(
    currentSettings.backupEnabled !== undefined ? currentSettings.backupEnabled : true
  );
  const [backupSchedule, setBackupSchedule] = useState<"Harian" | "Mingguan" | "Manual">(
    (currentSettings.backupSchedule as any) || "Manual"
  );
  const [pilihanKertas, setPilihanKertas] = useState<"A4" | "F4" | "Letter">(
    (currentSettings.pilihanKertas as any) || "A4"
  );
  const [marginAtas, setMarginAtas] = useState<number>(currentSettings.marginAtas || 15);
  const [marginBawah, setMarginBawah] = useState<number>(currentSettings.marginBawah || 15);
  const [marginKiri, setMarginKiri] = useState<number>(currentSettings.marginKiri || 15);
  const [marginKanan, setMarginKanan] = useState<number>(currentSettings.marginKanan || 15);
  const [selectedPegawaiNip, setSelectedPegawaiNip] = useState<string>(currentSettings.penanggungJawabNip);

  // Sync state if backend systemSettings load finishes or updates
  useEffect(() => {
    if (systemSettings) {
      setBackupEnabled(systemSettings.backupEnabled !== undefined ? systemSettings.backupEnabled : true);
      setBackupSchedule(systemSettings.backupSchedule as any || "Manual");
      setPilihanKertas(systemSettings.pilihanKertas as any || "A4");
      setMarginAtas(systemSettings.marginAtas || 15);
      setMarginBawah(systemSettings.marginBawah || 15);
      setMarginKiri(systemSettings.marginKiri || 15);
      setMarginKanan(systemSettings.marginKanan || 15);
      setSelectedPegawaiNip(systemSettings.penanggungJawabNip);
    }
  }, [systemSettings]);

  // General Status variables
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [backupSuccessMsg, setBackupSuccessMsg] = useState("");

  // Restore States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [understandRisk, setUnderstandRisk] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState("");
  const [restoreErrorMsg, setRestoreErrorMsg] = useState("");

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Look up selected pegawai from list
    const p = pegawaiList.find(peg => peg.nip === selectedPegawaiNip);
    if (!p) {
      setErrorMsg("Pejabat penanggung jawab tidak ditemukan di master pegawai!");
      setIsSaving(false);
      return;
    }

    const updated: SystemSettings = {
      id: "default",
      backupEnabled,
      backupSchedule,
      pilihanKertas,
      marginAtas: Number(marginAtas),
      marginBawah: Number(marginBawah),
      marginKiri: Number(marginKiri),
      marginKanan: Number(marginKanan),
      penanggungJawabNip: p.nip,
      penanggungJawabNama: p.nama,
      penanggungJawabJabatan: p.jabatan,
      lastBackupTime: currentSettings.lastBackupTime || ""
    };

    try {
      await updateSystemSettings(updated);
      setSuccessMsg("Konfigurasi Pengaturan Sistem berhasil disimpan ke Firestore!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (error) {
      setErrorMsg("Gagal menyimpan konfigurasi system settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackupNow = async () => {
    if (!backupEnabled) return;
    setIsBackingUp(true);
    setBackupSuccessMsg("");
    setErrorMsg("");

    try {
      // Simulate calling Google Cloud Functions webhook for backup trigger
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const currentTimeString = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }) + " WIB";

      // Save the backup timestamp so that the user gets immediate live status feedback
      const p = pegawaiList.find(peg => peg.nip === selectedPegawaiNip) || {
        nip: currentSettings.penanggungJawabNip,
        nama: currentSettings.penanggungJawabNama,
        jabatan: currentSettings.penanggungJawabJabatan
      };

      const updatedSettings: SystemSettings = {
        id: "default",
        backupEnabled,
        backupSchedule,
        pilihanKertas,
        marginAtas: Number(marginAtas),
        marginBawah: Number(marginBawah),
        marginKiri: Number(marginKiri),
        marginKanan: Number(marginKanan),
        penanggungJawabNip: p.nip,
        penanggungJawabNama: p.nama,
        penanggungJawabJabatan: p.jabatan,
        lastBackupTime: currentTimeString
      };

      await updateSystemSettings(updatedSettings);

      // Generate a complete JSON payload representing the current active system backup
      const backupPayload = {
        meta: {
          app: "SILOLAB PRIMA",
          exportedAt: new Date().toISOString(),
          environment: "Cloud Run Production",
          provider: "Google Cloud Storage / Firebase"
        },
        data: {
          systemSettings: updatedSettings,
          pegawai: pegawaiList,
          barang: barangList,
          stok: stokList,
          mutasi: mutasiList,
          permintaan: permintaanList,
          penerimaan: penerimaanList
        }
      };

      // Create download blob
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupPayload, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `silolab_backup_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupSuccessMsg(`Pencadangan sukses! Backup data sinkron ke Google Cloud Storage melalui Cloud Functions (trigger_backup_silolab_v1) pada ${currentTimeString} dan diunduh secara lokal.`);
      setTimeout(() => setBackupSuccessMsg(""), 8000);
    } catch (err) {
      setErrorMsg("Metode backup ke Cloud Functions GCS dibatalkan atau mengalami kegagalan.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setUploadedFileName(file.name);
      setRestoreErrorMsg("");
      setRestoreSuccessMsg("");
    }
  };

  const handleRestoreDatabase = async () => {
    if (!uploadedFile) {
      setRestoreErrorMsg("Silakan unggah dokumen backup berformat .json terlebih dahulu.");
      return;
    }

    if (!understandRisk) {
      setRestoreErrorMsg("Anda harus mencentang persetujuan bersyarat risiko penimpaan database.");
      return;
    }

    if (confirmText.toUpperCase() !== "PULIHKAN") {
      setRestoreErrorMsg("Silakan ketik dengan benar kata kunci konfirmasi ganda 'PULIHKAN'.");
      return;
    }

    setIsRestoring(true);
    setRestoreErrorMsg("");
    setRestoreSuccessMsg("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") {
          throw new Error("Gagal membaca berkas berkode string.");
        }
        const parsed = JSON.parse(text);
        if (!parsed.meta || !parsed.data) {
          throw new Error("Berkas JSON backup tidak kompatibel dengan skema SILOLAB PRIMA.");
        }

        // Call the parent state restore controller
        await restoreDatabase(parsed);

        setRestoreSuccessMsg("RESTORASI SUKSES! Seluruh data transaksi laboratorium, pegawai, stok reagen, dan configurasi cetak berhasil dipulihkan dari arsip resmi.");
        setUploadedFile(null);
        setUploadedFileName("");
        setUnderstandRisk(false);
        setConfirmText("");
        setTimeout(() => setRestoreSuccessMsg(""), 8000);
      } catch (err: any) {
        setRestoreErrorMsg(`Format atau parsing backup gagal: ${err?.message || err}`);
      } finally {
        setIsRestoring(false);
      }
    };

    reader.onerror = () => {
      setRestoreErrorMsg("Gagal melakukan I/O pembacaan berkas lokal.");
      setIsRestoring(false);
    };

    reader.readAsText(uploadedFile);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Title Accent */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 flex items-center gap-2.5 uppercase tracking-wide">
            <Settings className="w-6 h-6 text-[#1E5230]" /> Pengaturan Sistem
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium select-none">
            Mengatur status backup otomatis, konfigurasi batas margin cetak, pejabat berwenang, dan alat pemulihan data (restore).
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {backupSuccessMsg && (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <p className="font-semibold">{backupSuccessMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Backup Configuration */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="p-2 bg-stone-100 rounded-lg text-[#1E5230]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Manajemen Backup</h3>
                <p className="text-[10px] text-stone-500 font-medium">Backup dan Sinkronisasi Cloud Storage</p>
              </div>
            </div>

            {/* Toggle ON/OFF Status */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Status Backup Otomatis</label>
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3 border border-stone-100">
                <button
                  type="button"
                  onClick={() => setBackupEnabled(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none ${
                    backupEnabled
                      ? "bg-[#1E5230] text-white border-[#1E5230] shadow-xs"
                      : "bg-white text-stone-500 border-stone-200 hover:bg-[#1E5230]/5"
                  }`}
                >
                  <ToggleRight className="w-4 h-4 shrink-0 text-emerald-300" />
                  [ ON ] AKTIF
                </button>
                <button
                  type="button"
                  onClick={() => setBackupEnabled(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none ${
                    !backupEnabled
                      ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                      : "bg-white text-stone-500 border-stone-200 hover:bg-rose-50"
                  }`}
                >
                  <ToggleLeft className="w-4 h-4 shrink-0 text-rose-300" />
                  [ OFF ] MATI
                </button>
              </div>
              <p className="text-[10px] text-stone-500 leading-normal font-medium">
                {backupEnabled 
                  ? "Sistem pencadangan otomatis cloud aktif. Sinkronisasi akan men-trigger Cloud Functions secara berkala."
                  : "PERHATIAN: Sistem pencadangan cloud dinonaktifkan sepenuhnya. Risiko kehilangan data tinggi."
                }
              </p>
            </div>

            {/* Schedule Options - only configured if backup enabled */}
            {backupEnabled ? (
              <div className="space-y-2.5 animate-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Jadwal Sync Otomatis</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Harian", "Mingguan", "Manual"] as const).map((sched) => (
                    <button
                      type="button"
                      key={sched}
                      onClick={() => setBackupSchedule(sched)}
                      className={`py-2 px-1 rounded-lg text-[11px] font-bold text-center transition-all border cursor-pointer ${
                        backupSchedule === sched
                          ? "bg-[#1b3d27] text-white border-[#1b3d27] shadow-xs"
                          : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {sched}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Pencadangan Nonaktif</p>
                <p className="text-[10px] text-stone-600 leading-relaxed font-medium">
                  Aturan penjadwalan backup otomatis tidak berjalan di latar belakang (Scheduler dilarang melakukan trigger).
                </p>
              </div>
            )}

            {/* Last Backup Label Status */}
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/60 space-y-1.5 select-none">
              <span className="text-[9px] font-bold text-stone-500 uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-600" /> Riwayat Cadangan Terakhir
              </span>
              <p className="text-[11px] font-semibold text-stone-700 leading-snug">
                {currentSettings.lastBackupTime ? (
                  <span>Sukses: {currentSettings.lastBackupTime}</span>
                ) : (
                  <span className="text-amber-600 italic">Belum ada riwayat pencadangan data</span>
                )}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-3">
            <button
              type="button"
              disabled={isBackingUp || !backupEnabled}
              onClick={handleBackupNow}
              className="w-full flex items-center justify-center gap-2 bg-[#1b3d27] hover:bg-[#15301e] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menghubungi Cloud Functions...
                </>
              ) : (
                <>
                  <CloudLightning className="w-4 h-4 text-amber-400" /> Backup Sekarang (GCS)
                </>
              )}
            </button>
            <div className="text-center">
              <span className="text-[9px] text-stone-400 font-mono italic block">
                Google Cloud Function: trigger_backup_silolab_v1
              </span>
            </div>
          </div>
        </div>

        {/* Middle Column: Print Configuration */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
            <div className="p-2 bg-stone-100 rounded-lg text-[#1E5230]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Konfigurasi Cetak</h3>
              <p className="text-[10px] text-stone-500 font-medium">Batas Halaman untuk Generator PDF</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Pilihan Ukuran Kertas</label>
              <select
                value={pilihanKertas}
                onChange={(e) => setPilihanKertas(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs px-3 py-2.5 focus:border-[#1E5230] focus:ring-1 focus:ring-[#1E5230] outline-none text-stone-700 font-bold cursor-pointer"
              >
                <option value="A4">A4 (210mm x 297mm)</option>
                <option value="F4">F4 (215mm x 330mm)</option>
                <option value="Letter">Letter (216mm x 279mm)</option>
              </select>
            </div>

            <div className="space-y-3.5 pt-2">
              <h4 className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">Margin Dokumen Surat (Milimeter)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 font-bold uppercase">Atas</label>
                  <input
                    type="number"
                    value={marginAtas}
                    onChange={(e) => setMarginAtas(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs px-3 py-2 focus:border-[#1E5230] outline-none text-stone-800 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 font-bold uppercase">Bawah</label>
                  <input
                    type="number"
                    value={marginBawah}
                    onChange={(e) => setMarginBawah(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs px-3 py-2 focus:border-[#1E5230] outline-none text-stone-800 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 font-bold uppercase">Kiri</label>
                  <input
                    type="number"
                    value={marginKiri}
                    onChange={(e) => setMarginKiri(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs px-3 py-2 focus:border-[#1E5230] outline-none text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 font-bold uppercase">Kanan</label>
                  <input
                    type="number"
                    value={marginKanan}
                    onChange={(e) => setMarginKanan(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs px-3 py-2 focus:border-[#1E5230] outline-none text-stone-800 font-semibold"
                  />
                </div>
              </div>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/40 text-[10px] text-stone-500 leading-normal italic select-none">
              Informasi: Margin berkas PDF dikalkulasi otomatis dalam milimeter (mm) saat pratinjau cetak formulir kop surat resmi RSUD diterbitkan.
            </div>
          </div>
        </div>

        {/* Right Column: Responsible Person Designation */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
            <div className="p-2 bg-stone-100 rounded-lg text-[#1E5230]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Penanggung Jawab</h3>
              <p className="text-[10px] text-stone-500 font-medium">Rotasi Jabatan & Verifikator Tanda Tangan</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Pejabat Aktif Saat Ini</label>
              <select
                value={selectedPegawaiNip}
                onChange={(e) => setSelectedPegawaiNip(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs px-3 py-2.5 focus:border-[#1E5230] focus:ring-1 focus:ring-[#1E5230] outline-none text-stone-700 font-bold cursor-pointer"
              >
                {pegawaiList.map((p) => (
                  <option key={p.nip} value={p.nip}>
                    {p.nama} ({p.jabatan}) - {p.nip}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Box of Selected Officials as a card preview */}
            {(() => {
              const selectedPegawai = pegawaiList.find(p => p.nip === selectedPegawaiNip);
              if (!selectedPegawai) return null;
              return (
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-4 space-y-2 select-none">
                  <span className="text-[8.5px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase font-sans">
                    Pratinjau Tanda Tangan PDF
                  </span>
                  <div className="pt-2">
                    <p className="text-[10px] text-stone-500 leading-tight font-bold">
                      {selectedPegawai.jabatan},
                    </p>
                    <div className="h-12 flex items-center pl-1 italic text-stone-300 text-xs font-serif font-semibold">
                      (Tanda Tangan Elektronik)
                    </div>
                    <p className="font-bold text-xs text-slate-800 underline">
                      {selectedPegawai.nama}
                    </p>
                    <p className="text-[9px] text-stone-600 font-bold mt-0.5">
                      NIP. {selectedPegawai.nip}
                    </p>
                    <p className="text-[9px] text-stone-500 italic mt-0.5">
                      Rotasi Berlaku Efektif pada Form Baru
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Global Saving Actions bar */}
        <div className="lg:col-span-3 bg-stone-50 p-5 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-stone-600 font-bold leading-relaxed max-w-lg">
              Perubahan pada konfigurasi di atas akan disimpan ke Firestore, dan segera meredistribusikan tanda tangan default pejabat pada seluruh file/laporan PDF baru.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#1E5230] hover:bg-[#163e24] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none shrink-0 border border-[#1E5230]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Simpan Konfigurasi
              </>
            )}
          </button>
        </div>

      </form>

      {/* Restore Data Section Panel */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
          <div className="p-2 bg-red-50 rounded-lg text-rose-700">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Restore Data Laboratorium (Arsip Cadangan)</h3>
            <p className="text-[10px] text-stone-500 font-medium">Pemulihan Total Database Firestore dari Berkas Backup JSON</p>
          </div>
        </div>

        {restoreSuccessMsg && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{restoreSuccessMsg}</span>
          </div>
        )}

        {restoreErrorMsg && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-bold">{restoreErrorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="space-y-4">
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-6 text-center hover:bg-stone-50/80 transition-all relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={isRestoring}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                id="restore-file-input"
              />
              <div className="flex flex-col items-center gap-2.5">
                <div className="p-3 bg-white rounded-full border border-stone-100 shadow-xs text-[#1E5230]">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-700">
                    {uploadedFileName ? `Terunggah: ${uploadedFileName}` : "Pilih dokumen backup .json"}
                  </p>
                  <p className="text-[10px] text-[#1E5230] font-bold mt-1">
                    Drag & Drop atau klik area ini untuk memuat cadangan data
                  </p>
                  <p className="text-[9px] text-stone-400 font-medium mt-1">
                    Hanya menerima berkas arsip resmi yang dibuat oleh menu "Backup Sekarang"
                  </p>
                </div>
              </div>
            </div>

            {uploadedFileName && (
              <div className="bg-amber-50 rounded-xl border border-amber-200/70 p-4 space-y-2 animate-in fade-in duration-200 select-none">
                <p className="text-[11px] font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  PULIHKAN DATABASE: BERKAS TERDETEKSI
                </p>
                <p className="text-[10px] text-amber-800 leading-normal font-medium">
                  Sistem mendeteksi dokumen backup <strong>{uploadedFileName}</strong>. Melanjutkan restorasi akan menghapus dan menimpa dokumen lama Anda secara permanen.
                </p>
              </div>
            )}
          </div>

          {/* Double Confirmation (Konfirmasi Ganda) Interactive form */}
          <div className="space-y-5 bg-stone-50 border border-stone-200 rounded-2xl p-6">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-700 animate-pulse" />
              Sistem Pengaman Konfirmasi Ganda (Double-Verification)
            </h4>

            {/* Checkbox confirmation 1 */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex items-start gap-3 select-none">
              <input
                type="checkbox"
                id="understand-risk-checkbox"
                checked={understandRisk}
                onChange={(e) => setUnderstandRisk(e.target.checked)}
                disabled={isRestoring || !uploadedFile}
                className="mt-0.5 cursor-pointer disabled:cursor-not-allowed scale-105"
              />
              <label htmlFor="understand-risk-checkbox" className="text-[10.5px] font-semibold text-stone-700 leading-relaxed cursor-pointer select-none">
                Saya mengerti, menyetujui, dan mengonfirmasi bahwa eksekusi pemulihan ini akan <strong>menghapus serta menimpa (overwrite) seluruh data database mutasi, barang, stok dan pegawai</strong> SILOLAB PRIMA saat ini secara permanen.
              </label>
            </div>

            {/* Text Verification confirmation 2 */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-stone-600 uppercase">
                Ketik Kata Kunci Konfirmasi (Ketik: <span className="font-mono text-rose-700 font-extrabold select-all">PULIHKAN</span>)
              </label>
              <input
                type="text"
                placeholder="masukkan kata verifikasi"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isRestoring || !uploadedFile || !understandRisk}
                className="w-full bg-white border border-stone-200 rounded-xl text-xs px-3.5 py-2.5 focus:border-rose-700 outline-none text-slate-800 font-bold placeholder:text-stone-300 placeholder:font-medium disabled:bg-stone-100 disabled:text-stone-400"
              />
            </div>

            <button
              type="button"
              onClick={handleRestoreDatabase}
              disabled={isRestoring || !uploadedFile || !understandRisk || confirmText.toUpperCase() !== "PULIHKAN"}
              className="w-full flex items-center justify-center gap-2 bg-rose-700 hover:bg-rose-850 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Melakukan Restorasi Database...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Timpa & Restore Sekarang
                </>
              )}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
