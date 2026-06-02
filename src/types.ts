export type DivisiLab = 
  | "Hematologi" 
  | "Kimia Klinik" 
  | "Imuno-Serologi" 
  | "Mikrobiologi" 
  | "BDRS" 
  | "Sampling" 
  | "Urinalisis";

export interface Pegawai {
  nip: string;
  nama: string;
  jabatan: string;
  password?: string;
}

export interface Barang {
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  stokMinimum: number;
  kategori: DivisiLab;
}

export interface BatchStok {
  kodeBarang: string;
  tanggalExpired: string; // YYYY-MM-DD
  jumlah: number;
}

export interface MutasiBarang {
  id: string;
  jenis: "MASUK" | "KELUAR";
  kodeBarang: string;
  jumlah: number;
  tanggal: string; // YYYY-MM-DD
  tanggalExpired?: string; // Untuk barang masuk/keluar batch spesifik
  keterangan: string; // misal "Penerimaan dari Logfar", "Pemakaian Rutin", "Stok Awal"
  operator: string; // nama pegawai lab
  picLuarNip?: string; // NIP pihak logfar (untuk penerimaan)
  picLuarNama?: string; // Nama pihak logfar (untuk penerimaan)
  noSuratReferensi?: string; // No surat permintaan jika ada hubungan
}

export interface ItemPermintaan {
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  jumlahDiminta: number;
  jumlahDiterima: number;
  pemakaianBulanan: number;
  sisaStok: number;
}

export interface PermintaanBarang {
  noSurat: string;
  tanggal: string; // YYYY-MM-DD
  tujuan: "Logistik Farmasi" | "ATK";
  isCito: boolean;
  items: ItemPermintaan[];
  status: "Diproses" | "Diterima Sebagian" | "Diterima Penuh" | "Ditolak" | "Batal";
  ttdKepalaNip: string;
  ttdKepalaNama: string;
  ttdKepalaJabatan?: string;
  tanggalTtd: string;
}

export interface SystemSettings {
  id: string; // e.g. "default"
  backupEnabled: boolean;
  backupSchedule: "Harian" | "Mingguan" | "Manual";
  pilihanKertas: "A4" | "F4" | "Letter";
  marginAtas: number;
  marginBawah: number;
  marginKiri: number;
  marginKanan: number;
  penanggungJawabNip: string;
  penanggungJawabNama: string;
  penanggungJawabJabatan: string;
  lastBackupTime?: string;
}

export interface LaporanBulanan {
  id: string; // e.g. "2026_05"
  bulan: string;
  tahun: string;
  penanggungJawabNip: string;
  penanggungJawabNama: string;
  penanggungJawabJabatan: string;
  tanggalCetak: string;
}

export interface LogPenerimaan {
  id: string;
  noSuratReferensi?: string; // No surat permintaan (opsional)
  tanggal: string; // YYYY-MM-DD
  operatorNip: string;
  operatorNama: string;
  logfarNip: string;
  logfarNama: string;
  items: {
    kodeBarang: string;
    namaBarang: string;
    satuan: string;
    jumlahDiterima: number;
    tanggalExpired: string;
  }[];
}
