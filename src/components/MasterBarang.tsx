import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { Barang, DivisiLab, BatchStok } from "../types";
import { 
  Plus, 
  Search, 
  QrCode, 
  SlidersHorizontal, 
  HelpCircle, 
  Sparkles, 
  AlertCircle,
  PackagePlus,
  Trash2,
  FileCheck,
  Edit2,
  X,
  Check,
  Printer,
  FileDown,
  FileSpreadsheet,
  UploadCloud,
  AlertTriangle
} from "lucide-react";

interface MasterBarangProps {
  barangList: Barang[];
  getAggregatedStock: () => Record<string, { total: number; detail: BatchStok[] }>;
  addBarang: (item: Barang, initialStok?: { jumlah: number; tanggalExpired: string }[]) => void;
  updateBarang: (item: Barang, updatedBatches?: BatchStok[]) => void;
  deleteBarang?: (kodeBarang: string) => void;
  currentUser?: any;
  importBarangMassal?: (importedItems: any[]) => Promise<void>;
}

const CATEGORIES: DivisiLab[] = [
  "Hematologi", 
  "Kimia Klinik", 
  "Imuno-Serologi", 
  "Mikrobiologi", 
  "BDRS", 
  "Sampling", 
  "Urinalisis"
];

const COMMON_UNITS = ["Kit", "Box", "Botol", "Pcs", "Roll", "Vial", "Rack", "Tube", "Plate"];

// Modal Component for Printing Custom TSC TTP 244 Pro stiker 2cm x 5cm
const BarcodePrinterModal = ({ barang, onClose }: { barang: Barang; onClose: () => void }) => {
  const [printContainer, setPrintContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    div.className = "barcode-label-print-container";
    div.style.position = "fixed";
    div.style.left = "0";
    div.style.top = "0";
    div.style.width = "50mm";
    div.style.height = "20mm";
    div.style.boxSizing = "border-box";
    div.style.backgroundColor = "white";
    div.style.zIndex = "9999999";
    div.style.display = "none"; // Hidden in standard screen media via stylesheet
    
    document.body.appendChild(div);
    setPrintContainer(div);
    
    return () => {
      document.body.removeChild(div);
    };
  }, []);

  const handlePrint = () => {
    document.body.classList.add("printing-barcode-active");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-barcode-active");
    }, 1000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-hidden border border-slate-200">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <QrCode className="w-5 h-5 text-teal-600" /> Cetak QR Code Reagen
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Area layout */}
          <div className="my-6 p-4 bg-slate-100 rounded-xl border border-slate-200/50 flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-3">Preview Stiker (5cm x 2cm)</span>
            
            {/* Exact 5cm x 2cm print boundary container (On Screen Preview) */}
            <div 
              className="bg-white border border-slate-300 shadow-sm p-1.5 flex items-center overflow-hidden"
              style={{ width: "50mm", height: "20mm", minWidth: "50mm", minHeight: "20mm", boxSizing: "border-box" }}
            >
              <div className="flex items-center justify-start h-full gap-2 w-full">
                {/* Left QR Code block: presisi 1.8cm x 1.8cm */}
                <div 
                  className="flex items-center justify-center bg-white overflow-hidden shrink-0 border border-slate-100"
                  style={{ width: "1.8cm", height: "1.8cm" }}
                >
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(barang.kodeBarang)}`}
                    alt="QR Code"
                    className="max-w-full max-h-full object-contain"
                    style={{ width: "1.6cm", height: "1.6cm" }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Right text panel: Nama reagen / barang */}
                <div className="flex flex-col justify-center leading-tight overflow-hidden flex-1 select-none text-left" style={{ width: "2.8cm" }}>
                  <div 
                     className="text-[9px] font-bold text-stone-950 uppercase leading-3 font-sans line-clamp-2"
                     style={{
                       display: "-webkit-box",
                       WebkitLineClamp: 2,
                       WebkitBoxOrient: "vertical",
                       overflow: "hidden",
                       wordBreak: "break-word"
                     }}
                  >
                    {barang.namaBarang}
                  </div>
                  <div className="text-[8px] font-mono font-semibold text-slate-800 tracking-tighter mt-1 truncate">
                    {barang.kodeBarang}
                  </div>
                  <div className="text-[7.5px] font-medium text-slate-500 uppercase tracking-tighter truncate leading-none mt-0.5">
                    RSUD HUSADA PRIMA
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-slate-500 text-[11px] leading-relaxed mb-5">
            <p>Format QR code cetak/save PDF diatur khusus sesuai printer label stiker <strong>TSC TTP 244 Pro</strong> / ukuran gulungan (2cm x 5cm).</p>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Render the printable portal directly inside document.body */}
      {printContainer && createPortal(
        <div className="flex items-center justify-start h-full gap-2 w-full p-1.5" style={{ width: "50mm", height: "20mm", boxSizing: "border-box" }}>
          {/* Left QR Code block */}
          <div 
            className="flex items-center justify-center bg-white overflow-hidden shrink-0"
            style={{ width: "1.8cm", height: "1.8cm" }}
          >
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(barang.kodeBarang)}`}
              alt="QR Code"
              style={{ width: "1.6cm", height: "1.6cm" }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right text panel */}
          <div className="flex flex-col justify-center leading-tight overflow-hidden flex-1 select-none text-left" style={{ width: "2.8cm" }}>
            <div 
               className="text-[9px] font-bold text-stone-950 uppercase leading-3 font-sans line-clamp-2"
               style={{
                 display: "-webkit-box",
                 WebkitLineClamp: 2,
                 WebkitBoxOrient: "vertical",
                 overflow: "hidden",
                 wordBreak: "break-word",
                 color: "#000000"
               }}
            >
              {barang.namaBarang}
            </div>
            <div className="text-[8px] font-mono font-semibold tracking-tighter mt-1 truncate" style={{ color: "#333333" }}>
              {barang.kodeBarang}
            </div>
            <div className="text-[7.5px] font-medium uppercase tracking-tighter truncate leading-none mt-0.5" style={{ color: "#666666" }}>
              RSUD HUSADA PRIMA
            </div>
          </div>
        </div>,
        printContainer
      )}
    </>
  );
};


export default function MasterBarang({
  barangList,
  getAggregatedStock,
  addBarang,
  updateBarang,
  deleteBarang,
  currentUser,
  importBarangMassal,
}: MasterBarangProps) {
  // UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("Semua");
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const isSuperUser = currentUser?.nip === "199606282022041001" || currentUser?.nip === "1996060282022041001";

  // Excel feature state variables
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importStep, setImportStep] = useState<"upload" | "preview" | "confirm">("upload");
  const [isImporting, setIsImporting] = useState(false);

  // Helper date normalizer for serial strings inside Excel files
  const convertExcelDate = (excelDate: any) => {
    if (!excelDate) return "";
    // If it's a number (Excel numeric format)
    if (typeof excelDate === "number" || !isNaN(Number(excelDate))) {
      const date = new Date(Math.round((Number(excelDate) - 25569) * 86400 * 1000));
      return date.toISOString().split("T")[0];
    }
    // If it's a string, try parsing
    const cleanStr = String(excelDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr; // already matches YYYY-MM-DD
    }
    const parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split("T")[0];
    }
    return cleanStr; // fallback as-is
  };

  const handleExportExcel = () => {
    try {
      const aggStock = getAggregatedStock();
      const exportData = barangList.map(b => {
        const sDetails = aggStock[b.kodeBarang]?.detail || [];
        const rincianED = sDetails
          .map((d: BatchStok) => `ED ${d.tanggalExpired ? new Date(d.tanggalExpired).toLocaleDateString("id-ID") : "-"}: ${d.jumlah} ${b.satuan}`)
          .join(", ");
        
        return {
          "Kode Barcode": b.kodeBarang,
          "Nama Reagen / BMHP": b.namaBarang,
          "Kategori / Divisi Lab": b.kategori,
          "Satuan": b.satuan,
          "Stok Minimum": b.stokMinimum,
          "Sisa Stok Riil": aggStock[b.kodeBarang]?.total || 0,
          "Status Stok": (aggStock[b.kodeBarang]?.total || 0) <= b.stokMinimum ? "Kritis / Menipis" : "Aman",
          "Rincian Expired Date (Multi-Batch)": rincianED || "-"
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-fit column widths for maximum aesthetic output
      const maxColWidths = [
        { wch: 15 }, // Kode
        { wch: 45 }, // Nama
        { wch: 20 }, // Kategori
        { wch: 10 }, // Satuan
        { wch: 15 }, // Stok Minimum
        { wch: 15 }, // Sisa Stok
        { wch: 15 }, // Status Stok
        { wch: 60 }  // Rincian Batch
      ];
      worksheet["!cols"] = maxColWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SILOLAB STOK REAGEN");
      
      const fileDate = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `SILOLAB_PRIMA_Stok_Reagen_${fileDate}.xlsx`);
      
      setSuccessMsg("Data berhasil diexport ke file Excel (.xlsx)!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Export error:", err);
      setFormError("Gagal mengexport file Excel: " + err.message);
      setTimeout(() => setFormError(""), 5050);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          "Kode Barcode": "RE-HEM-991",
          "Nama Barang / Reagen": "Reagen Diluent hematology 20L",
          "Kategori / Divisi Lab": "Hematologi",
          "Satuan": "Box",
          "Stok Minimum": 5,
          "Jumlah": 15,
          "Tanggal Expired (YYYY-MM-DD)": "2027-08-31"
        },
        {
          "Kode Barcode": "RE-CHM-992",
          "Nama Barang / Reagen": "Reagen SGOT Cobas C311",
          "Kategori / Divisi Lab": "Kimia Klinik",
          "Satuan": "Kit",
          "Stok Minimum": 2,
          "Jumlah": 8,
          "Tanggal Expired (YYYY-MM-DD)": "2026-11-30"
        }
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet["!cols"] = [
        { wch: 16 }, // Kode
        { wch: 35 }, // Nama
        { wch: 25 }, // Kategori
        { wch: 10 }, // Satuan
        { wch: 15 }, // Stok Minimum
        { wch: 10 }, // Jumlah
        { wch: 30 }  // Expired
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      XLSX.writeFile(workbook, "SILOLAB_PRIMA_Template_Import.xlsx");
    } catch (err: any) {
      console.error("Template error:", err);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError("");
    
    // Read and parse
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const parsedRows = XLSX.utils.sheet_to_json(worksheet);

        if (parsedRows.length === 0) {
          setImportError("File kosong atau tidak memiliki baris data yang valid.");
          return;
        }

        const formattedItems = parsedRows.map((row: any) => {
          const findValue = (keys: string[]) => {
            const matchKey = Object.keys(row).find(k => 
              keys.some(v => k.toLowerCase().replace(/\s+/g, '') === v.toLowerCase().replace(/\s+/g, ''))
            );
            return matchKey ? row[matchKey] : null;
          };

          const rawKode = findValue(["kodebarang", "kodebarcode", "barcode", "itemcode", "id", "kode_barang"]) || "";
          const rawNama = findValue(["namabarang", "namareagen", "nama", "itemname", "reagen", "nama_barang"]) || "";
          const rawKategori = findValue(["kategori", "devisi", "divisilab", "division", "category", "kategori_divisi"]) || "Kimia Klinik";
          const rawSatuan = findValue(["satuan", "unit", "pack", "satuan_barang"]) || "Kit";
          const rawMinStok = findValue(["stokminimum", "stokminimal", "minstok", "minstock", "stok_minimum"]) ?? 5;
          const rawJumlah = findValue(["jumlah", "stok", "stokawal", "qty", "quantity", "jumlah_stok"]) ?? 0;
          const rawEXPD = findValue(["tanggalexpired", "expireddate", "ed", "kadaluwarsa", "tanggalexpired(yyyy-mm-dd)", "tanggal_expired"]) || "";

          return {
            kodeBarang: String(rawKode).trim(),
            namaBarang: String(rawNama).trim(),
            kategori: String(rawKategori).trim(),
            satuan: String(rawSatuan).trim(),
            stokMinimum: Number(rawMinStok) || 5,
            jumlah: Number(rawJumlah) || 0,
            tanggalExpired: convertExcelDate(rawEXPD)
          };
        });

        // Filter out empty rows
        const validRows = formattedItems.filter(item => item.kodeBarang && item.namaBarang);

        if (validRows.length === 0) {
          setImportError("Format kolom tidak cocok! Pastikan kolom utama 'Kode Barcode' dan 'Nama Barang / Reagen' tidak kosong.");
          return;
        }

        setParsedImportItems(validRows);
        setImportStep("preview");
      } catch (err: any) {
        console.error("Parsing error:", err);
        setImportError("Gagal mengurai file Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const executeBulkImport = async () => {
    if (!isSuperUser) {
      setImportError("Akses Ditolak: Anda tidak memiliki izin untuk mengimpor data");
      return;
    }
    
    setIsImporting(true);
    setImportError("");
    try {
      if (importBarangMassal) {
        await importBarangMassal(parsedImportItems);
        setIsImportModalOpen(false);
        setSuccessMsg(`Berhasil mengimpor ${parsedImportItems.length} data barang & stok ke database secara massal!`);
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        throw new Error("Handler importBarangMassal tidak tersedia.");
      }
    } catch (err: any) {
      console.error("Bulk Import execution error:", err);
      setImportError(err.message || "Gagal menyimpan data import massal.");
    } finally {
      setIsImporting(false);
    }
  };

  // EDIT STATE INDICES
  const [editingItem, setEditingItem] = useState<Barang | null>(null);
  const [editNamaBarang, setEditNamaBarang] = useState("");
  const [editSatuan, setEditSatuan] = useState("");
  const [editStokMinimum, setEditStokMinimum] = useState(5);
  const [editKategori, setEditKategori] = useState<DivisiLab>("Kimia Klinik");
  const [editBatches, setEditBatches] = useState<BatchStok[]>([]);

  // ADD NEW BATCH TO ACTIVE EDIT ITEM
  const [newBatchExpired, setNewBatchExpired] = useState("");
  const [newBatchJumlah, setNewBatchJumlah] = useState<number>(10);
  const [editError, setEditError] = useState("");

  const handleStartEdit = (b: Barang) => {
    if (!isSuperUser) return;
    setEditingItem(b);
    setEditNamaBarang(b.namaBarang);
    setEditSatuan(b.satuan);
    setEditStokMinimum(b.stokMinimum);
    setEditKategori(b.kategori);
    setEditError("");

    // Read existing batches for this item
    const curStockDetail = getAggregatedStock()[b.kodeBarang]?.detail || [];
    setEditBatches(curStockDetail.map(st => ({ ...st }))); // clone
    setNewBatchExpired("");
    setNewBatchJumlah(10);
  };

  const handleAddBatchToEditList = () => {
    setEditError("");
    if (!newBatchExpired) {
      setEditError("Silakan tentukan tanggal kedaluwarsa untuk batch baru!");
      return;
    }
    if (newBatchJumlah <= 0) {
      setEditError("Jumlah batch harus lebih besar dari 0!");
      return;
    }

    // Check if duplicate expired date exists in edit list
    if (editBatches.some((eb) => eb.tanggalExpired === newBatchExpired)) {
      // Add quantity to existing expired date batch
      setEditBatches(prev => prev.map(eb => eb.tanggalExpired === newBatchExpired ? { ...eb, jumlah: eb.jumlah + newBatchJumlah } : eb));
    } else {
      setEditBatches(prev => [...prev, {
        kodeBarang: editingItem!.kodeBarang,
        tanggalExpired: newBatchExpired,
        jumlah: newBatchJumlah
      }]);
    }

    setNewBatchExpired("");
    setNewBatchJumlah(10);
  };

  const handleRemoveBatchFromEditList = (expired: string) => {
    setEditBatches(prev => prev.filter(eb => eb.tanggalExpired !== expired));
  };

  const handleUpdateBatchJumlahInEditList = (expired: string, jumlah: number) => {
    setEditBatches(prev => prev.map(eb => eb.tanggalExpired === expired ? { ...eb, jumlah: Math.max(0, jumlah) } : eb));
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    if (!editNamaBarang.trim()) {
      setEditError("Nama barang reagen/BMHP tidak boleh kosong!");
      return;
    }
    if (editStokMinimum < 0) {
      setEditError("Stok minimum tidak boleh negatif!");
      return;
    }

    const updatedItem: Barang = {
      ...editingItem!,
      namaBarang: editNamaBarang.trim(),
      satuan: editSatuan,
      stokMinimum: editStokMinimum,
      kategori: editKategori,
    };

    updateBarang(updatedItem, editBatches);
    setEditingItem(null);
    setSuccessMsg(`Data barang [${updatedItem.namaBarang}] beserta rincian stok berhasil diperbarui di Firestore!`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleDelete = (kodeBarang: string) => {
    if (!isSuperUser) return;
    const match = barangList.find((b) => b.kodeBarang === kodeBarang);
    if (match) {
      setConfirmModal({
        show: true,
        title: "Konfirmasi Hapus Barang",
        message: `Apakah Anda yakin ingin menghapus barang [${match.namaBarang}] beserta seluruh stok fisiknya secara permanen dari database? Tindakan ini tidak dapat dibatalkan!`,
        onConfirm: () => {
          if (deleteBarang) {
            deleteBarang(kodeBarang);
            setSuccessMsg(`Barang [${match.namaBarang}] berhasil dihapus sepenuhnya dari database.`);
            setTimeout(() => setSuccessMsg(""), 4500);
          }
        }
      });
    }
  };

  // Form Fields
  const [kodeBarang, setKodeBarang] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [satuan, setSatuan] = useState("Vial");
  const [stokMinimum, setStokMinimum] = useState<number>(5);
  const [kategori, setKategori] = useState<DivisiLab>("Kimia Klinik");
  const [printingBarcodeBarang, setPrintingBarcodeBarang] = useState<Barang | null>(null);
  
  // Initial stock fields ("stok awal dimasukkan disini")
  const [hasInitialStok, setHasInitialStok] = useState(true);
  const [initialQty, setInitialQty] = useState<number>(10);
  const [initialExpired, setInitialExpired] = useState("2026-12-31");

  // Scanner Simulator States
  const [scannedCode, setScannedCode] = useState("");
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);

  // Keyboard barcode listener simulator
  // If user types numbers rapidly on any focus and triggers 'Enter', we can intercept it as a barcode scanner
  useEffect(() => {
    let accumulated = "";
    let lastKeyTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      // Barcode scanners type very fast. Typically < 50ms per key
      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Ignore modifiers
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt") return;

      if (diff < 50) {
        if (e.key === "Enter") {
          if (accumulated.length > 2) {
            handleBarcodeScannedSuccessfully(accumulated);
            accumulated = "";
          }
        } else {
          accumulated += e.key;
        }
      } else {
        // slow type, reset buffer unless it's the start
        accumulated = e.key;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleBarcodeScannedSuccessfully = (code: string) => {
    setScannedCode(code);
    setIsSimulatingScan(true);
    setTimeout(() => {
      setIsSimulatingScan(false);
    }, 1500);

    // If adding form is open, set the code in input!
    if (showAddForm) {
      setKodeBarang(code);
    }
  };

  // Helper code generator
  const generateRandomCode = () => {
    const divisiPrefixMap: Record<DivisiLab, string> = {
      "Hematologi": "HEM",
      "Kimia Klinik": "CHM",
      "Imuno-Serologi": "IMS",
      "Mikrobiologi": "MIC",
      "BDRS": "BDR",
      "Sampling": "SMP",
      "Urinalisis": "URI",
    };
    const prefix = divisiPrefixMap[kategori] || "REG";
    const randNum = Math.floor(100 + Math.random() * 900);
    setKodeBarang(`RE-${prefix}-${randNum}`);
    setSuccessMsg("Kode Barcode berhasil digenerate!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!kodeBarang.trim()) {
      setFormError("Kode barang (barcode) tidak boleh kosong!");
      return;
    }
    if (!namaBarang.trim()) {
      setFormError("Nama barang reagen/BMHP tidak boleh kosong!");
      return;
    }
    if (stokMinimum < 0) {
      setFormError("Stok minimum tidak boleh negatif!");
      return;
    }

    // Check duplicate
    const isDuplicate = barangList.some((b) => b.kodeBarang === kodeBarang.trim());
    if (isDuplicate) {
      setFormError(`Barang dengan kode barcode [${kodeBarang}] sudah terdaftar!`);
      return;
    }

    const newBarang: Barang = {
      kodeBarang: kodeBarang.trim(),
      namaBarang: namaBarang.trim(),
      satuan,
      stokMinimum,
      kategori,
    };

    let initialStokArray: { jumlah: number; tanggalExpired: string }[] = [];
    if (hasInitialStok && initialQty > 0) {
      if (!initialExpired) {
        setFormError("Silakan tentukan Tanggal Kedaluwarsa untuk stok awal!");
        return;
      }
      initialStokArray.push({
        jumlah: initialQty,
        tanggalExpired: initialExpired,
      });
    }

    addBarang(newBarang, initialStokArray);
    
    // Clear & collapse
    setKodeBarang("");
    setNamaBarang("");
    setStokMinimum(5);
    setInitialQty(10);
    setInitialExpired("2026-12-31");
    setShowAddForm(false);
    
    setSuccessMsg(`Barang [${newBarang.namaBarang}] berhasil ditambahkan beserta stok awal!`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Filter list
  const aggStock = getAggregatedStock();
  const filteredBarang = barangList.filter((b) => {
    const matchesSearch = 
      b.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "Semua" || b.kategori === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Master Kamus Barang (Reagen & BMHP)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen kamus barcode, pembagian divisi laboratorium Husada Prima, dan stok minimal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Public Export Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2.5 px-3.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Download seluruh data reagen/stok dalam berkas Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {/* Restricted Import Button */}
          {isSuperUser && (
            <button
              onClick={() => {
                setImportFile(null);
                setParsedImportItems([]);
                setImportError("");
                setImportStep("upload");
                setIsImportModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-medium text-xs py-2.5 px-3.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Import data reagen dari file Excel (.xlsx / .csv)"
            >
              <UploadCloud className="w-4 h-4 text-slate-600" />
              <span>Import Excel</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setFormError("");
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-3.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            {showAddForm ? "Sembunyikan Form" : "Tambah Barang & Stok Awal"}
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Adding Form Master */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <PackagePlus className="w-4.5 h-4.5 text-teal-600" /> Registrasi Barang Baru & Pengisian Stok Awal
          </h3>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kode Barcode ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Kode Barang (Scan Barcode)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Masukkan atau scan barcode"
                      value={kodeBarang}
                      onChange={(e) => setKodeBarang(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:bg-white"
                    />
                    <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold px-3 rounded-xl transition-all border border-slate-200 cursor-pointer"
                    title="Generate acak berdasarkan divisi lab"
                  >
                    Genset Kode
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  *Tip: Anda bisa men-scan barcode fisik jika kursor aktif di input ini.
                </span>
              </div>

              {/* Nama Item */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Nama Barang / Reagen
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Reagen Urea Cobas C311"
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white"
                />
              </div>

              {/* Kategori Divisi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Divisi / Kategori Lab
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as DivisiLab)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Satuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Satuan Barang
                </label>
                <select
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white cursor-pointer"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stok Alarm Minimum */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Stok Minimum (Alarm Kritis)
                </label>
                <input
                  type="number"
                  min="0"
                  value={stokMinimum}
                  onChange={(e) => setStokMinimum(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white"
                />
              </div>

              {/* Toggle Stok Awal */}
              <div className="flex items-center pt-8">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={hasInitialStok}
                    onChange={(e) => setHasInitialStok(e.target.checked)}
                    className="w-4.5 h-4.5 text-teal-600 rounded bg-slate-100 border-slate-300 focus:ring-teal-500"
                  />
                  <span>Masukkan Stok Awal Langsung</span>
                </label>
              </div>
            </div>

            {/* Initial stock section if selected */}
            {hasInitialStok && (
              <div className="p-4 bg-teal-50 border border-teal-100/80 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-100">
                <div>
                  <label className="block text-xs font-bold text-teal-900 mb-2">
                    Jumlah Tersedia Saat Ini (Stok Awal Lab)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialQty}
                    onChange={(e) => setInitialQty(Number(e.target.value))}
                    className="w-full bg-white border border-teal-200 focus:border-teal-500 rounded-xl px-4 py-2 text-xs outline-none"
                  />
                  <span className="text-[10px] text-teal-700/80 mt-1 block">
                    *Mencatat saldo barang fisik yang sudah mengendap di laborat.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-teal-900 mb-2">
                    Tanggal Kedaluwarsa (ED) Stok Awal
                  </label>
                  <input
                    type="date"
                    value={initialExpired}
                    onChange={(e) => setInitialExpired(e.target.value)}
                    className="w-full bg-white border border-teal-200 focus:border-teal-500 rounded-xl px-4 py-2 text-xs outline-none cursor-pointer"
                  />
                  <span className="text-[10px] text-teal-700/80 mt-1 block">
                    *Gunakan format tanggal berjalan yyyy-mm-dd yang valid.
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2 px-6 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Daftarkan Barang
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Searh and Filter controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari berdasarkan nama reagen atau kode barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2 text-xs outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:inline">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
          >
            <option value="Semua">Semua Divisi Lab</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Kode Barcode</th>
                <th className="p-4">Nama Reagen / BMHP</th>
                <th className="p-4">Divisi Lab</th>
                <th className="p-4">Satuan</th>
                <th className="p-4 text-center">Stok Minimum</th>
                <th className="p-4 text-right">Sisa Stok Riil</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Aksi / Kontrol</th>
              </tr>
            </thead>
            <tbody>
              {filteredBarang.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto opacity-30 stroke-1 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada barang yang cocok dengan kriteria pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredBarang.map((b) => {
                  const sCount = aggStock[b.kodeBarang]?.total || 0;
                  const isMenipis = sCount <= b.stokMinimum;
                  return (
                    <tr key={b.kodeBarang} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all font-sans text-slate-700">
                      <td className="p-4 font-mono font-medium text-slate-800">{b.kodeBarang}</td>
                      <td className="p-4 font-bold text-slate-900">{b.namaBarang}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          {b.kategori}
                        </span>
                      </td>
                      <td className="p-4">{b.satuan}</td>
                      <td className="p-4 text-center text-slate-500 font-medium">{b.stokMinimum}</td>
                      <td className="p-4 text-right">
                        <span className={`font-bold font-display text-sm ${isMenipis ? 'text-rose-600' : 'text-slate-800'}`}>
                          {sCount}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isMenipis ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isMenipis ? "MENIPIS / KRITIS" : "AMAN"}
                        </span>
                      </td>
                      <td className="p-4 text-center font-sans">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setPrintingBarcodeBarang(b)}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-600 p-1.5 rounded transition-all cursor-pointer border border-teal-100/50"
                            title="Cetak Barcode Label (5cm x 2cm)"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          
                          {isSuperUser && (
                            <>
                              <button
                                onClick={() => handleStartEdit(b)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold p-1.5 rounded transition-all cursor-pointer border border-slate-200"
                                title="Edit Detail Barang & Alokasi Stok"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(b.kodeBarang)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded transition-all cursor-pointer border border-rose-100"
                                title="Hapus Barang"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right text-[10px] text-slate-400">
          Menampilkan {filteredBarang.length} dari total {barangList.length} barang terdaftar.
        </div>
      </div>

      {/* EDIT MODAL FOR BARANG & STOCK BATCHES */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PackagePlus className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">Edit Item & Alokasi Stok</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Barcode: {editingItem.kodeBarang} (Read-Only)</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {editError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveEditItem} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Barang / Reagen
                  </label>
                  <input
                    type="text"
                    value={editNamaBarang}
                    onChange={(e) => setEditNamaBarang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Divisi / Kategori Lab
                  </label>
                  <select
                    value={editKategori}
                    onChange={(e) => setEditKategori(e.target.value as DivisiLab)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Satuan Barang
                  </label>
                  <select
                    value={editSatuan}
                    onChange={(e) => setEditSatuan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white cursor-pointer"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Stok Minimum (Alarm Kritis)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editStokMinimum}
                    onChange={(e) => setEditStokMinimum(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Batch Allocator / Editor */}
              <div className="border border-slate-200 rounded-xl p-4 bg-teal-50/50">
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Kelola Alokasi Stok Fisik</span>
                  <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Total: {editBatches.reduce((a,c) => a + c.jumlah, 0)} {editSatuan}
                  </span>
                </h4>

                {/* Expc Date List */}
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {editBatches.length === 0 ? (
                    <div className="text-center py-4 text-stone-400 text-xs bg-white border border-dashed border-slate-200 rounded-lg">
                      Sisa stok kosong. Tambahkan batch di bawah untuk memulai stok akhir baru.
                    </div>
                  ) : (
                    editBatches.map((eb) => (
                      <div key={eb.tanggalExpired} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
                        <span className="font-mono text-slate-700">ED: <strong>{eb.tanggalExpired ? new Date(eb.tanggalExpired).toLocaleDateString("id-ID") : "-"}</strong></span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px] uppercase">Jumlah:</span>
                          <input
                            type="number"
                            min="0"
                            value={eb.jumlah}
                            onChange={(e) => handleUpdateBatchJumlahInEditList(eb.tanggalExpired, Number(e.target.value))}
                            className="w-20 bg-slate-50 border border-slate-200 text-center font-bold rounded px-1 py-0.5 text-xs text-slate-800 outline-none focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBatchFromEditList(eb.tanggalExpired)}
                            className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-1.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Batch Entry Form */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      ED Batch Baru
                    </label>
                    <input
                      type="date"
                      value={newBatchExpired}
                      onChange={(e) => setNewBatchExpired(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Jumlah Tambah
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newBatchJumlah}
                      onChange={(e) => setNewBatchJumlah(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBatchToEditList}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-1.5 rounded transition-all cursor-pointer"
                  >
                    Tambah Batch
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2 px-6 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Simpan & Sinkronisasi
                </button>
              </div>
            </form>
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
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer shadow-sm shadow-rose-100"
              >
                Konfirmasi Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Import Kamus Barang & Stok Massal</h3>
                  <p className="text-[10px] text-slate-400">Pastikan format file sesuai schema multi-batch SILOLAB</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unauthorized NIP bypass safeguard */}
            {!isSuperUser ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Akses Ditolak</h4>
                <p className="text-xs text-rose-600 font-semibold mt-2 max-w-md">
                  Akses Ditolak: Anda tidak memiliki izin untuk mengimpor data. Hanya petugas dengan kualifikasi khusus yang diperbolehkan mengunggah file.
                </p>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="mt-6 bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Tutup Dialog
                </button>
              </div>
            ) : (
              <>
                {/* Error Banner */}
                {importError && (
                  <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span className="font-semibold">{importError}</span>
                  </div>
                )}

                {/* Steps Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-center gap-2 pb-2 border-b border-slate-100 shrink-0">
                    <div className={`flex items-center gap-1 text-xs font-bold ${importStep === "upload" ? "text-teal-600" : "text-slate-400"}`}>
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">1</span> Unggah File
                    </div>
                    <div className="h-0.5 w-12 bg-slate-200"></div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${importStep === "preview" ? "text-teal-600" : "text-slate-400"}`}>
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">2</span> Review Data
                    </div>
                    <div className="h-0.5 w-12 bg-slate-200"></div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${importStep === "confirm" ? "text-teal-600" : "text-slate-400"}`}>
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">3</span> Konfirmasi Keamanan
                    </div>
                  </div>

                  {/* STEP 1: UPLOAD FILE */}
                  {importStep === "upload" && (
                    <div className="space-y-4 py-4">
                      {/* Explainer / Guide */}
                      <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-900 text-xs leading-relaxed space-y-2">
                        <p className="font-bold font-sans">Panduan Import Data Excel:</p>
                        <p>1. Pengunggahan mendukung format excel standar <strong>.xlsx</strong> atau <strong>.csv</strong>.</p>
                        <p>2. Format kolom wajib mengandung: <strong>"Kode Barcode"</strong>, <strong>"Nama Barang / Reagen"</strong>, <strong>"Kategori / Divisi Lab"</strong>, <strong>"Satuan"</strong>, <strong>"Stok Minimum"</strong>, <strong>"Jumlah"</strong>, dan <strong>"Tanggal Expired" (ED)</strong>.</p>
                        <p>3. Tanggal Expired wajib ditulis dengan format berurutan <strong>YYYY-MM-DD</strong> (contoh: 2026-10-25) agar integrasi pembagian batch FEFO berjalan mulus.</p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Download Template Excel Resmi</span>
                          </button>
                        </div>
                      </div>

                      {/* Dropzone Container */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer relative max-w-xl w-full">
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleImportFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-xs font-bold text-slate-700">Klik untuk jelajahi file atau seret file ke sini</p>
                          <p className="text-[10px] text-slate-400 mt-1">Mendukung format file xlsx, xls, csv (Maksimal 5MB)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: PREVIEW PARSED DATA */}
                  {importStep === "preview" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between shrink-0">
                        <p className="text-xs text-slate-550 leading-normal">
                          Ditemukan <strong className="text-slate-800">{parsedImportItems.length} baris barang</strong> yang siap di-import. Harap periksa detail konversi berikut sebelum memasukkan data ke database.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setImportFile(null);
                            setParsedImportItems([]);
                            setImportStep("upload");
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-slate-200"
                        >
                          Ulangi Unggah
                        </button>
                      </div>

                      {/* Table Preview */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0">
                              <th className="p-3">Kode Barcode</th>
                              <th className="p-3">Nama Reagen / BMHP</th>
                              <th className="p-3">Kategori</th>
                              <th className="p-3 text-center">Satuan</th>
                              <th className="p-3 text-center">Min</th>
                              <th className="p-3 text-right">Jumlah Stock</th>
                              <th className="p-3 text-center">Kedaluwarsa (ED)</th>
                              <th className="p-3 text-center">Validasi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedImportItems.map((item, index) => {
                              const isCategoryValid = CATEGORIES.includes(item.kategori);
                              const isDateValid = !item.tanggalExpired || /^\d{4}-\d{2}-\d{2}$/.test(item.tanggalExpired);
                              const hasNoErrors = isCategoryValid && isDateValid && item.kodeBarang && item.namaBarang;

                              return (
                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/40 transition-all">
                                  <td className="p-2.5 font-mono font-medium text-slate-800">{item.kodeBarang}</td>
                                  <td className="p-2.5 font-bold text-slate-900">{item.namaBarang}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${isCategoryValid ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                                      {item.kategori} {!isCategoryValid && "⚠️"}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center text-slate-600">{item.satuan}</td>
                                  <td className="p-2.5 text-center text-slate-500 font-bold">{item.stokMinimum}</td>
                                  <td className="p-2.5 text-right text-emerald-700 font-bold font-display">{item.jumlah}</td>
                                  <td className="p-2.5 text-center font-mono">
                                    <span className={isDateValid ? 'text-slate-700' : 'text-rose-600 font-bold underline'}>
                                      {item.tanggalExpired || "-"}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${hasNoErrors ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                                      {hasNoErrors ? "SUKSES" : "KOREKSI"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setImportStep("confirm")}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-6 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Lanjutkan Verifikasi Keamanan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: STRICT SECURITY CONFIRMATION */}
                  {importStep === "confirm" && (
                    <div className="space-y-4 py-4 max-w-xl mx-auto">
                      <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-3 text-rose-800">
                          <AlertTriangle className="w-8 h-8 text-rose-600 animate-pulse shrink-0" />
                          <h4 className="font-bold text-sm uppercase tracking-wide">Peringatan Keamanan & Integritas Data</h4>
                        </div>
                        <p className="text-xs text-rose-700 leading-relaxed">
                          Anda akan mengunggah secara massal sejumlah <strong>{parsedImportItems.length} data barang</strong> langsung ke dalam database operasional Firestore <strong>SILOLAB PRIMA</strong>.
                        </p>
                        <p className="text-xs text-rose-700 leading-relaxed">
                          Tindakan ini sensitif karena akan mengubah volume sisa stok berjalan reagen laboratorium. Logika Multi-Batch FEFO akan berintegrasi secara otomatis, di mana sistem akan menyinkronisasi data batch kedaluwarsa baru atau menambah sisa stok yang sudah ada.
                        </p>
                        <div className="p-3 bg-white rounded-lg border border-rose-200 border-dashed text-[11px] text-slate-500 font-semibold space-y-1">
                          <p>Dokumen yang akan terpengaruh:</p>
                          <p>• Data Master Barang</p>
                          <p>• Rincian Batch per Expired Date (FEFO)</p>
                          <p>• Mutasi Logistik Masuk (Ledger Audit)</p>
                          <p>• Pencatatan Log Aktivitas Petugas Pengunggah (NIP: {currentUser?.nip})</p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                        <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">Log Audit Aktivitas yang Akan Dicatat:</span>
                        <p className="p-2.5 bg-white border border-slate-100 rounded font-bold font-mono text-stone-600 text-[11px]">
                          User [{currentUser?.nip}] melakukan import data barang pada [{new Date().toLocaleString("id-ID")}]
                        </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setImportStep("preview")}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                        >
                          Kembali Ke Preview
                        </button>
                        <button
                          type="button"
                          disabled={isImporting}
                          onClick={executeBulkImport}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-8 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isImporting ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Memproses...</span>
                            </>
                          ) : (
                            <span>Saya Setuju & Mulai Import</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 1. Barcode Printer Modal */}
      {printingBarcodeBarang && (
        <BarcodePrinterModal 
          barang={printingBarcodeBarang} 
          onClose={() => setPrintingBarcodeBarang(null)} 
        />
      )}
    </div>
  );
}
