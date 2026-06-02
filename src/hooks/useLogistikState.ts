import { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from "firebase/firestore";
import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { Barang, BatchStok, MutasiBarang, PermintaanBarang, Pegawai, LogPenerimaan, SystemSettings, LaporanBulanan } from "../types";

// Local storage key for active local officer profile
const USER_KEY = "silolab_user";

// Initial seed data definitions
const INITIAL_PEGAWAI: Pegawai[] = [
  { nip: "197504252007012016", nama: "dr. Miftahul Ilmiah, Sp.Pk.", jabatan: "Kepala Instalasi Laboratorium", password: "12345678" },
  { nip: "197209081997032006", nama: "Yusri Hikmawati, S.ST.", jabatan: "Kepala Ruangan Instalasi Laboratorium", password: "12345678" },
  { nip: "199606282022041001", nama: "Ahmad Syauqi Abrori, A.Md.Kes.", jabatan: "Pranata Laboratorium Kesehatan", password: "12345678" },
  { nip: "199005182022042001", nama: "Kurnia Suci Lestari, A.Md.AK", jabatan: "Pranata Laboratorium Kesehatan", password: "12345678" },
  { nip: "197508202002121002", nama: "Dr. Ahmad Husada, Sp.PK", jabatan: "Dokter Penanggung Jawab", password: "123" },
  { nip: "199203152018042001", nama: "Siti Rahmah, A.Md.AK", jabatan: "Penyelia Urinalisis & Kimia Klinik", password: "123" },
  { nip: "199511242020011005", nama: "Rian Hermawan, A.Md.AK", jabatan: "Penyelia Hematologi & Imunologi", password: "123" },
  { nip: "198801102009031001", nama: "Budi Santoso", jabatan: "Petugas Logistik Farmasi (Logfar)", password: "123" },
  { nip: "199009182015022002", nama: "Diana Putri, S.E.", jabatan: "Petugas Logistik ATK", password: "123" },
];

const INITIAL_BARANG: Barang[] = [
  { kodeBarang: "RE-URE-001", namaBarang: "Reagen Urea (Cobas)", satuan: "Kit", stokMinimum: 5, kategori: "Kimia Klinik" },
  { kodeBarang: "RE-GLU-002", namaBarang: "Reagen Glucose (Cobas)", satuan: "Botol", stokMinimum: 10, kategori: "Kimia Klinik" },
  { kodeBarang: "HP-YEL-003", namaBarang: "Yellow Tip 200ul", satuan: "Box", stokMinimum: 4, kategori: "Sampling" },
  { kodeBarang: "HP-POT-004", namaBarang: "Pot Urin 50ml Steril", satuan: "Pcs", stokMinimum: 80, kategori: "Urinalisis" },
  { kodeBarang: "HP-EDT-005", namaBarang: "Tabung EDTA 3ml K3", satuan: "Rack", stokMinimum: 6, kategori: "Hematologi" },
  { kodeBarang: "RE-DEN-006", namaBarang: "Reagen Dengue IgG/IgM Duo Rapid", satuan: "Kit", stokMinimum: 3, kategori: "Imuno-Serologi" },
  { kodeBarang: "HP-TSU-007", namaBarang: "Kertas Thermal Sysmex 80mm", satuan: "Roll", stokMinimum: 8, kategori: "Hematologi" },
  { kodeBarang: "RE-BAP-008", namaBarang: "Blood Agar Plate Ready", satuan: "Pcs", stokMinimum: 25, kategori: "Mikrobiologi" },
];

const INITIAL_STOK: BatchStok[] = [
  { kodeBarang: "RE-URE-001", tanggalExpired: "2026-06-25", jumlah: 2 },
  { kodeBarang: "RE-URE-001", tanggalExpired: "2026-08-15", jumlah: 5 },
  { kodeBarang: "RE-GLU-002", tanggalExpired: "2026-07-20", jumlah: 8 },
  { kodeBarang: "RE-GLU-002", tanggalExpired: "2026-10-10", jumlah: 12 },
  { kodeBarang: "HP-YEL-003", tanggalExpired: "2029-12-31", jumlah: 6 },
  { kodeBarang: "HP-POT-004", tanggalExpired: "2028-06-30", jumlah: 150 },
  { kodeBarang: "HP-EDT-005", tanggalExpired: "2027-04-18", jumlah: 10 },
  { kodeBarang: "RE-DEN-006", tanggalExpired: "2026-06-15", jumlah: 1 },
  { kodeBarang: "RE-DEN-006", tanggalExpired: "2026-11-20", jumlah: 4 },
  { kodeBarang: "HP-TSU-007", tanggalExpired: "2028-01-01", jumlah: 15 },
  { kodeBarang: "RE-BAP-008", tanggalExpired: "2026-06-10", jumlah: 30 },
];

const INITIAL_MUTASI: MutasiBarang[] = [
  { id: "M-1", jenis: "MASUK", kodeBarang: "RE-URE-001", jumlah: 2, tanggal: "2026-05-01", tanggalExpired: "2026-06-25", keterangan: "Stok Awal Laboratorium", operator: "Yusri Hikmawati, S.ST." },
  { id: "M-2", jenis: "MASUK", kodeBarang: "RE-URE-001", jumlah: 5, tanggal: "2026-05-01", tanggalExpired: "2026-08-15", keterangan: "Stok Awal Laboratorium", operator: "Yusri Hikmawati, S.ST." },
  { id: "M-3", jenis: "MASUK", kodeBarang: "RE-GLU-002", jumlah: 20, tanggal: "2026-05-02", tanggalExpired: "2026-07-20", keterangan: "Penerimaan Logistik Farmasi", operator: "Siti Rahmah, A.Md.AK", picLuarNama: "Budi Santoso", picLuarNip: "198801102009031001", noSuratReferensi: "LAB/Mei/2026/1" },
  { id: "M-4", jenis: "KELUAR", kodeBarang: "RE-GLU-002", jumlah: 12, tanggal: "2026-05-15", tanggalExpired: "2026-07-20", keterangan: "Pemakaian Rutin Kimia Klinik", operator: "Siti Rahmah, A.Md.AK" },
  { id: "M-5", jenis: "MASUK", kodeBarang: "HP-YEL-003", jumlah: 6, tanggal: "2026-05-01", tanggalExpired: "2029-12-31", keterangan: "Stok Awal Laboratorium", operator: "Yusri Hikmawati, S.ST." },
  { id: "M-6", jenis: "MASUK", kodeBarang: "HP-POT-004", jumlah: 150, tanggal: "2026-05-01", tanggalExpired: "2028-06-30", keterangan: "Stok Awal Laboratorium", operator: "Yusri Hikmawati, S.ST." },
  { id: "M-7", jenis: "MASUK", kodeBarang: "HP-EDT-005", jumlah: 10, tanggal: "2026-05-25", tanggalExpired: "2027-04-18", keterangan: "Penerimaan CITO Logfar", operator: "Rian Hermawan, A.Md.AK", picLuarNama: "Budi Santoso", picLuarNip: "198801102009031001", noSuratReferensi: "LAB/CITO/2026/1" },
];

const INITIAL_PERMINTAAN: PermintaanBarang[] = [
  {
    noSurat: "LAB/Mei/2026/1",
    tanggal: "2026-05-01",
    tujuan: "Logistik Farmasi",
    isCito: false,
    items: [
      { kodeBarang: "RE-GLU-002", namaBarang: "Reagen Glucose (Cobas)", satuan: "Botol", jumlahDiminta: 40, jumlahDiterima: 20, pemakaianBulanan: 25, sisaStok: 5 },
      { kodeBarang: "HP-YEL-003", namaBarang: "Yellow Tip 200ul", satuan: "Box", jumlahDiminta: 4, jumlahDiterima: 4, pemakaianBulanan: 3, sisaStok: 2 },
    ],
    status: "Diterima Sebagian",
    ttdKepalaNip: "198005122005012003",
    ttdKepalaNama: "Yusri Hikmawati, S.ST.",
    tanggalTtd: "2026-05-01",
  },
  {
    noSurat: "LAB/CITO/2026/1",
    tanggal: "2026-05-24",
    tujuan: "Logistik Farmasi",
    isCito: true,
    items: [
      { kodeBarang: "HP-EDT-005", namaBarang: "Tabung EDTA 3ml K3", satuan: "Rack", jumlahDiminta: 10, jumlahDiterima: 10, pemakaianBulanan: 8, sisaStok: 0 }
    ],
    status: "Diterima Penuh",
    ttdKepalaNip: "198005122005012003",
    ttdKepalaNama: "Yusri Hikmawati, S.ST.",
    tanggalTtd: "2026-05-24",
  }
];

// Helper to batch-write default values if a collection is freshly provisioned
const seedCollection = async <T extends { [key: string]: any }>(
  collectionName: string, 
  initialData: T[], 
  idField: keyof T
) => {
  try {
    const q = collection(db, collectionName);
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log(`Seeding initial data for ${collectionName}...`);
      const batch = writeBatch(db);
      initialData.forEach((item) => {
        let docId = "";
        if (collectionName === "stok") {
          docId = `${item.kodeBarang}_${item.tanggalExpired}`;
        } else if (collectionName === "mutasi" || collectionName === "penerimaan") {
          docId = item.id;
        } else if (collectionName === "permintaan") {
          docId = item.noSurat.replace(/\//g, "_");
        } else {
          docId = String(item[idField]);
        }
        const dRef = doc(db, collectionName, docId);
        batch.set(dRef, item);
      });
      await batch.commit();
      console.log(`Successfully seeded ${collectionName}.`);
    }
  } catch (err) {
    console.error(`Error seeding collection ${collectionName}:`, err);
  }
};

export function useLogistikState() {
  // Real-time states synchronized from Firestore
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [stok, setStok] = useState<BatchStok[]>([]);
  const [mutasi, setMutasi] = useState<MutasiBarang[]>([]);
  const [permintaan, setPermintaan] = useState<PermintaanBarang[]>([]);
  const [penerimaan, setPenerimaan] = useState<LogPenerimaan[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [laporanBulanan, setLaporanBulanan] = useState<LaporanBulanan[]>([]);
  const [logAktivitasList, setLogAktivitasList] = useState<any[]>([]);

  // Firebase Auth states
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [databaseSynced, setDatabaseSynced] = useState(false);

  // Selected human operator profile representing simulated lab user
  const [user, setUser] = useState<{ nip: string; nama: string; jabatan: string } | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  // Keep track of operator in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  // Auth session state changed listener with background automatic registration
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.warn("Silent background authentication failed, using offline fallback:", error);
      setFirebaseUser({ uid: "offline-mock" } as any);
      setAuthLoading(false);
    });

    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setFirebaseUser(authUser);
        setAuthLoading(false);
      } else {
        setFirebaseUser(null);
      }
    });

    return () => unsubAuth();
  }, []);

  // Ensure mandated seed users are populated in Firestore
  useEffect(() => {
    if (databaseSynced && pegawai.length > 0) {
      const mandatedSeeds = [
        { nip: "197504252007012016", nama: "dr. Miftahul Ilmiah, Sp.Pk.", jabatan: "Kepala Instalasi Laboratorium", password: "12345678" },
        { nip: "197209081997032006", nama: "Yusri Hikmawati, S.ST.", jabatan: "Kepala Ruangan Instalasi Laboratorium", password: "12345678" },
        { nip: "199606282022041001", nama: "Ahmad Syauqi Abrori, A.Md.Kes.", jabatan: "Pranata Laboratorium Kesehatan", password: "12345678" },
        { nip: "199005182022042001", nama: "Kurnia Suci Lestari, A.Md.AK", jabatan: "Pranata Laboratorium Kesehatan", password: "12345678" }
      ];
      mandatedSeeds.forEach((seedUser) => {
        const matching = pegawai.find(p => p.nip === seedUser.nip);
        if (!matching || matching.password !== seedUser.password || matching.nama !== seedUser.nama || matching.jabatan !== seedUser.jabatan) {
          console.log(`Auto-seeding required user ${seedUser.nama} into Firestore...`);
          setDoc(doc(db, "pegawai", seedUser.nip), seedUser).catch(err => {
            console.error("Failed to seed mandated user:", err);
          });
        }
      });
    }
  }, [databaseSynced, pegawai]);

  // Listen to Firestore real-time collections when authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const loadedCollections = {
      pegawai: false,
      barang: false,
      stok: false,
      mutasi: false,
      permintaan: false,
      penerimaan: false,
      systemSettings: false,
      laporanBulanan: false,
      log_aktivitas: false
    };

    const checkAllLoaded = () => {
      if (Object.values(loadedCollections).every(Boolean)) {
        setDatabaseSynced(true);
      }
    };

    const unsubPegawai = onSnapshot(collection(db, "pegawai"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as Pegawai);
      if (list.length === 0) {
        seedCollection("pegawai", INITIAL_PEGAWAI, "nip");
      } else {
        setPegawai(list);
      }
      loadedCollections.pegawai = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "pegawai");
    });

    const unsubBarang = onSnapshot(collection(db, "barang"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as Barang);
      if (list.length === 0) {
        seedCollection("barang", INITIAL_BARANG, "kodeBarang");
      } else {
        setBarang(list);
      }
      loadedCollections.barang = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "barang");
    });

    const unsubStok = onSnapshot(collection(db, "stok"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as BatchStok);
      if (list.length === 0) {
        seedCollection("stok", INITIAL_STOK, "kodeBarang");
      } else {
        setStok(list);
      }
      loadedCollections.stok = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "stok");
    });

    const unsubMutasi = onSnapshot(collection(db, "mutasi"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as MutasiBarang);
      if (list.length === 0) {
        seedCollection("mutasi", INITIAL_MUTASI, "id");
      } else {
        const sorted = list.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        setMutasi(sorted);
      }
      loadedCollections.mutasi = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "mutasi");
    });

    const unsubPermintaan = onSnapshot(collection(db, "permintaan"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as PermintaanBarang);
      if (list.length === 0) {
        seedCollection("permintaan", INITIAL_PERMINTAAN, "noSurat");
      } else {
        const sorted = list.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        setPermintaan(sorted);
      }
      loadedCollections.permintaan = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "permintaan");
    });

    const unsubPenerimaan = onSnapshot(collection(db, "penerimaan"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as LogPenerimaan);
      if (list.length === 0) {
        const initialPenerimaan: LogPenerimaan[] = [
          {
            id: "PEN-1",
            noSuratReferensi: "LAB/Mei/2026/1",
            tanggal: "2026-05-02",
            operatorNip: "199203152018042001",
            operatorNama: "Siti Rahmah, A.Md.AK",
            logfarNip: "198801102009031001",
            logfarNama: "Budi Santoso",
            items: [
              { kodeBarang: "RE-GLU-002", namaBarang: "Reagen Glucose (Cobas)", satuan: "Botol", jumlahDiterima: 20, tanggalExpired: "2026-07-20" },
              { kodeBarang: "HP-YEL-003", namaBarang: "Yellow Tip 200ul", satuan: "Box", jumlahDiterima: 4, tanggalExpired: "2029-12-31" }
            ]
          }
        ];
        seedCollection("penerimaan", initialPenerimaan, "id");
      } else {
        const sorted = list.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        setPenerimaan(sorted);
      }
      loadedCollections.penerimaan = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "penerimaan");
    });

    const unsubSystemSettings = onSnapshot(collection(db, "SystemSettings"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as SystemSettings);
      if (list.length === 0) {
        const defaultSettings: SystemSettings = {
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
        setDoc(doc(db, "SystemSettings", "default"), defaultSettings).catch(console.error);
      } else {
        const docMatch = list.find(s => s.id === "default") || list[0];
        if (docMatch) {
          if (docMatch.backupEnabled === undefined) {
            docMatch.backupEnabled = true;
          }
          if (docMatch.lastBackupTime === undefined) {
            docMatch.lastBackupTime = "";
          }
        }
        setSystemSettings(docMatch || null);
      }
      loadedCollections.systemSettings = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "SystemSettings");
    });

    const unsubLaporanBulanan = onSnapshot(collection(db, "LaporanBulanan"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as LaporanBulanan);
      setLaporanBulanan(list);
      loadedCollections.laporanBulanan = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "LaporanBulanan");
    });

    const unsubLogAktivitas = onSnapshot(collection(db, "log_aktivitas"), (snapshot) => {
      const list = snapshot.docs.map(d => d.data());
      setLogAktivitasList(list);
      loadedCollections.log_aktivitas = true;
      checkAllLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "log_aktivitas");
    });

    return () => {
      unsubPegawai();
      unsubBarang();
      unsubStok();
      unsubMutasi();
      unsubPermintaan();
      unsubPenerimaan();
      unsubSystemSettings();
      unsubLaporanBulanan();
      unsubLogAktivitas();
    };
  }, [firebaseUser]);

  // Auth Provider actions
  const signOutFirebase = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Could not sign out Firebase:", err);
    }
  };

  // 1. MASTER PEGAWAI OPERATIONS
  const addPegawai = async (p: Pegawai) => {
    try {
      await setDoc(doc(db, "pegawai", p.nip), p);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pegawai/${p.nip}`);
    }
  };

  const updatePegawai = async (p: Pegawai) => {
    try {
      await setDoc(doc(db, "pegawai", p.nip), p);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pegawai/${p.nip}`);
    }
  };

  const deletePegawai = async (nip: string) => {
    try {
      await deleteDoc(doc(db, "pegawai", nip));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pegawai/${nip}`);
    }
  };

  // 2. MASTER BARANG OPERATIONS
  const addBarang = async (item: Barang, initialStok?: { jumlah: number; tanggalExpired: string }[]) => {
    try {
      await setDoc(doc(db, "barang", item.kodeBarang), item);

      if (initialStok && initialStok.length > 0) {
        const batch = writeBatch(db);
        initialStok.forEach((st) => {
          if (st.jumlah > 0) {
            const mutasiId = `M-INIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newMutasi: MutasiBarang = {
              id: mutasiId,
              jenis: "MASUK",
              kodeBarang: item.kodeBarang,
              jumlah: st.jumlah,
              tanggal: new Date().toISOString().split("T")[0],
              tanggalExpired: st.tanggalExpired,
              keterangan: "Stok Awal Pembukaan Sistem",
              operator: user ? user.nama : "Sistem",
            };

            const mRef = doc(db, "mutasi", mutasiId);
            batch.set(mRef, newMutasi);

            const stokId = `${item.kodeBarang}_${st.tanggalExpired}`;
            const existingStokItem = stok.find(s => s.kodeBarang === item.kodeBarang && s.tanggalExpired === st.tanggalExpired);
            const currentAmount = existingStokItem ? existingStokItem.jumlah : 0;

            const sRef = doc(db, "stok", stokId);
            batch.set(sRef, {
              kodeBarang: item.kodeBarang,
              tanggalExpired: st.tanggalExpired,
              jumlah: currentAmount + st.jumlah
            } as BatchStok);
          }
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `barang/${item.kodeBarang}`);
    }
  };

  const updateBarang = async (item: Barang, updatedBatches?: BatchStok[]) => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "barang", item.kodeBarang), item);

      if (updatedBatches) {
        // Find existing ones
        const existingStok = stok.filter(s => s.kodeBarang === item.kodeBarang);
        existingStok.forEach(old => {
          const exists = updatedBatches.some(b => b.tanggalExpired === old.tanggalExpired);
          if (!exists) {
            const stokId = `${item.kodeBarang}_${old.tanggalExpired}`;
            batch.delete(doc(db, "stok", stokId));
          }
        });

        updatedBatches.forEach(b => {
          const stokId = `${item.kodeBarang}_${b.tanggalExpired}`;
          batch.set(doc(db, "stok", stokId), b);
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `barang/${item.kodeBarang}`);
    }
  };

  const deleteBarang = async (kodeBarang: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "barang", kodeBarang));

      const relatedStok = stok.filter((s) => s.kodeBarang === kodeBarang);
      relatedStok.forEach((s) => {
        const stokId = `${s.kodeBarang}_${s.tanggalExpired}`;
        batch.delete(doc(db, "stok", stokId));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `barang/${kodeBarang}`);
    }
  };

  // 3. LOGISTIK PENERIMAAN RECEIVE ITEMS
  const receiveItems = async (log: LogPenerimaan) => {
    try {
      const batch = writeBatch(db);

      const pRef = doc(db, "penerimaan", log.id);
      batch.set(pRef, log);

      log.items.forEach((it, idx) => {
        const mId = `M-REC-${Date.now()}-${idx}`;
        const newMutasi: MutasiBarang = {
          id: mId,
          jenis: "MASUK",
          kodeBarang: it.kodeBarang,
          jumlah: it.jumlahDiterima,
          tanggal: log.tanggal,
          tanggalExpired: it.tanggalExpired,
          keterangan: `Penerimaan Logistik ${log.noSuratReferensi ? `(${log.noSuratReferensi})` : ""}`,
          operator: log.operatorNama,
          picLuarNama: log.logfarNama,
          picLuarNip: log.logfarNip,
          noSuratReferensi: log.noSuratReferensi,
        };

        const mRef = doc(db, "mutasi", mId);
        batch.set(mRef, newMutasi);

        const stokId = `${it.kodeBarang}_${it.tanggalExpired}`;
        const existingStokItem = stok.find(s => s.kodeBarang === it.kodeBarang && s.tanggalExpired === it.tanggalExpired);
        const currentAmount = existingStokItem ? existingStokItem.jumlah : 0;

        const sRef = doc(db, "stok", stokId);
        batch.set(sRef, {
          kodeBarang: it.kodeBarang,
          tanggalExpired: it.tanggalExpired,
          jumlah: currentAmount + it.jumlahDiterima
        } as BatchStok);
      });

      // Synchronously update linked Permintaan statuses
      if (log.noSuratReferensi) {
        const escapedNoSurat = log.noSuratReferensi.replace(/\//g, "_");
        const reqMatch = permintaan.find(r => r.noSurat === log.noSuratReferensi);
        if (reqMatch) {
          const updatedItems = reqMatch.items.map((reqIt) => {
            const receivedMatch = log.items.filter((it) => it.kodeBarang === reqIt.kodeBarang);
            const totalRecAmount = receivedMatch.reduce((sum, current) => sum + current.jumlahDiterima, 0);
            const newlyReceived = reqIt.jumlahDiterima + totalRecAmount;
            return {
              ...reqIt,
              jumlahDiterima: Math.min(reqIt.jumlahDiminta, newlyReceived),
            };
          });

          const isAllCompleted = updatedItems.every((it) => it.jumlahDiterima >= it.jumlahDiminta);
          const isAnyCompleted = updatedItems.some((it) => it.jumlahDiterima > 0);
          const updatedStatus = isAllCompleted ? "Diterima Penuh" : isAnyCompleted ? "Diterima Sebagian" : "Diproses";

          const reqRef = doc(db, "permintaan", escapedNoSurat);
          batch.set(reqRef, {
            ...reqMatch,
            items: updatedItems,
            status: updatedStatus
          });
        }
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `penerimaan/${log.id}`);
    }
  };

  const deletePenerimaan = async (logId: string) => {
    try {
      const log = penerimaan.find((l) => l.id === logId);
      if (!log) {
        throw new Error(`Log penerimaan dengan ID ${logId} tidak ditemukan.`);
      }

      const batch = writeBatch(db);

      // Revert Stok
      log.items.forEach((it) => {
        const stokId = `${it.kodeBarang}_${it.tanggalExpired}`;
        const existingStokItem = stok.find(
          (s) => s.kodeBarang === it.kodeBarang && s.tanggalExpired === it.tanggalExpired
        );
        if (existingStokItem) {
          const currentAmount = existingStokItem.jumlah;
          const sRef = doc(db, "stok", stokId);
          const newQty = Math.max(0, currentAmount - it.jumlahDiterima);
          if (newQty <= 0) {
            batch.delete(sRef);
          } else {
            batch.set(sRef, {
              kodeBarang: it.kodeBarang,
              tanggalExpired: it.tanggalExpired,
              jumlah: newQty,
            } as BatchStok);
          }
        }
      });

      // Find and delete related Mutasi
      const relatedMutasis = mutasi.filter((m) => {
        if (log.noSuratReferensi && m.noSuratReferensi === log.noSuratReferensi) {
          return true;
        }
        if (m.noSuratReferensi === log.id) {
          return true;
        }
        return (
          m.jenis === "MASUK" &&
          m.operator === log.operatorNama &&
          m.tanggal === log.tanggal &&
          log.items.some((it) => it.kodeBarang === m.kodeBarang && m.jumlah === it.jumlahDiterima)
        );
      });

      relatedMutasis.forEach((mut) => {
        batch.delete(doc(db, "mutasi", mut.id));
      });

      // Revert linked Permintaan
      if (log.noSuratReferensi) {
        const escapedNoSurat = log.noSuratReferensi.replace(/\//g, "_");
        const reqMatch = permintaan.find((r) => r.noSurat === log.noSuratReferensi);
        if (reqMatch) {
          const updatedItems = reqMatch.items.map((reqIt) => {
            const receivedAmountThisLog = log.items
              .filter((it) => it.kodeBarang === reqIt.kodeBarang)
              .reduce((sum, current) => sum + current.jumlahDiterima, 0);
            
            const newlyReceived = Math.max(0, reqIt.jumlahDiterima - receivedAmountThisLog);
            return {
              ...reqIt,
              jumlahDiterima: newlyReceived,
            };
          });

          const isAllCompleted = updatedItems.every((it) => it.jumlahDiterima >= it.jumlahDiminta && it.jumlahDiminta > 0);
          const isAnyCompleted = updatedItems.some((it) => it.jumlahDiterima > 0);
          const updatedStatus = isAllCompleted ? "Diterima Penuh" : isAnyCompleted ? "Diterima Sebagian" : "Diproses";

          const reqRef = doc(db, "permintaan", escapedNoSurat);
          batch.set(reqRef, {
            ...reqMatch,
            items: updatedItems,
            status: updatedStatus,
          });
        }
      }

      // Delete Penerimaan document
      batch.delete(doc(db, "penerimaan", log.id));

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `penerimaan/${logId}`);
    }
  };

  const updatePenerimaan = async (oldLogId: string, updatedLog: LogPenerimaan) => {
    try {
      const oldLog = penerimaan.find((l) => l.id === oldLogId);
      if (!oldLog) {
        throw new Error(`Log penerimaan asal dengan ID ${oldLogId} tidak ditemukan.`);
      }

      const batch = writeBatch(db);

      // --- 1. REVERT OLD LOG'S STOCK ---
      oldLog.items.forEach((it) => {
        const stokId = `${it.kodeBarang}_${it.tanggalExpired}`;
        const existingStokItem = stok.find(
          (s) => s.kodeBarang === it.kodeBarang && s.tanggalExpired === it.tanggalExpired
        );
        if (existingStokItem) {
          const currentAmount = existingStokItem.jumlah;
          const sRef = doc(db, "stok", stokId);
          const newQty = Math.max(0, currentAmount - it.jumlahDiterima);
          if (newQty <= 0) {
            batch.delete(sRef);
          } else {
            batch.set(sRef, {
              kodeBarang: it.kodeBarang,
              tanggalExpired: it.tanggalExpired,
              jumlah: newQty,
            } as BatchStok);
          }
        }
      });

      // Delete Old related Mutasi
      const relatedMutasis = mutasi.filter((m) => {
        if (oldLog.noSuratReferensi && m.noSuratReferensi === oldLog.noSuratReferensi) {
          return true;
        }
        if (m.noSuratReferensi === oldLog.id) {
          return true;
        }
        return (
          m.jenis === "MASUK" &&
          m.operator === oldLog.operatorNama &&
          m.tanggal === oldLog.tanggal &&
          oldLog.items.some((it) => it.kodeBarang === m.kodeBarang && m.jumlah === it.jumlahDiterima)
        );
      });

      relatedMutasis.forEach((mut) => {
        batch.delete(doc(db, "mutasi", mut.id));
      });

      // --- 2. APPLY NEW LOG'S STOCK & MUTASI ---
      // Update actual Penerimaan log
      const pRef = doc(db, "penerimaan", updatedLog.id);
      batch.set(pRef, updatedLog);

      updatedLog.items.forEach((it, idx) => {
        const mId = `M-REC-${Date.now()}-${idx}`;
        const newMutasi: MutasiBarang = {
          id: mId,
          jenis: "MASUK",
          kodeBarang: it.kodeBarang,
          jumlah: it.jumlahDiterima,
          tanggal: updatedLog.tanggal,
          tanggalExpired: it.tanggalExpired,
          keterangan: `Penerimaan Logistik ${updatedLog.noSuratReferensi ? `(${updatedLog.noSuratReferensi})` : ""}`,
          operator: updatedLog.operatorNama,
          picLuarNama: updatedLog.logfarNama,
          picLuarNip: updatedLog.logfarNip,
          noSuratReferensi: updatedLog.noSuratReferensi,
        };

        const mRef = doc(db, "mutasi", mId);
        batch.set(mRef, newMutasi);

        const stokId = `${it.kodeBarang}_${it.tanggalExpired}`;
        const baseStokItem = stok.find(s => s.kodeBarang === it.kodeBarang && s.tanggalExpired === it.tanggalExpired);
        let baseQty = baseStokItem ? baseStokItem.jumlah : 0;
        
        const oldItemMatch = oldLog.items.find(oldit => oldit.kodeBarang === it.kodeBarang && oldit.tanggalExpired === it.tanggalExpired);
        if (oldItemMatch) {
          baseQty = Math.max(0, baseQty - oldItemMatch.jumlahDiterima);
        }

        const sRef = doc(db, "stok", stokId);
        batch.set(sRef, {
          kodeBarang: it.kodeBarang,
          tanggalExpired: it.tanggalExpired,
          jumlah: baseQty + it.jumlahDiterima
        } as BatchStok);
      });

      // Realign linked Permintaan (combine old revert + new apply)
      const referencedSuratsToRealign = new Set<string>();
      if (oldLog.noSuratReferensi) referencedSuratsToRealign.add(oldLog.noSuratReferensi);
      if (updatedLog.noSuratReferensi) referencedSuratsToRealign.add(updatedLog.noSuratReferensi);

      referencedSuratsToRealign.forEach(noSurat => {
        const reqMatch = permintaan.find((r) => r.noSurat === noSurat);
        if (reqMatch) {
          const escapedNoSurat = noSurat.replace(/\//g, "_");
          
          const otherLogs = penerimaan.filter(p => p.id !== oldLogId && p.noSuratReferensi === noSurat);
          
          const updatedItems = reqMatch.items.map((reqIt) => {
            let totalReceived = otherLogs.reduce((sum, curLog) => {
              const matchingIt = curLog.items.filter(it => it.kodeBarang === reqIt.kodeBarang);
              return sum + matchingIt.reduce((s, c) => s + c.jumlahDiterima, 0);
            }, 0);

            if (updatedLog.noSuratReferensi === noSurat) {
              const newMatch = updatedLog.items.filter(it => it.kodeBarang === reqIt.kodeBarang);
              totalReceived += newMatch.reduce((s, c) => s + c.jumlahDiterima, 0);
            }

            return {
              ...reqIt,
              jumlahDiterima: Math.min(reqIt.jumlahDiminta, totalReceived),
            };
          });

          const isAllCompleted = updatedItems.every((it) => it.jumlahDiterima >= it.jumlahDiminta);
          const isAnyCompleted = updatedItems.some((it) => it.jumlahDiterima > 0);
          const updatedStatus = isAllCompleted ? "Diterima Penuh" : isAnyCompleted ? "Diterima Sebagian" : "Diproses";

          const reqRef = doc(db, "permintaan", escapedNoSurat);
          batch.set(reqRef, {
            ...reqMatch,
            items: updatedItems,
            status: updatedStatus,
          });
        }
      });

      if (oldLogId !== updatedLog.id) {
        batch.delete(doc(db, "penerimaan", oldLogId));
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `penerimaan_update/${updatedLog.id}`);
    }
  };

  // 4. FEFO-DRIVEN PEMAKAIAN MUTASI DEDUCTIONS
  const useItemManualRaw = async (
    kodeBarang: string,
    jumlahDiminta: number,
    tanggal: string,
    operator: string,
    keterangan: string
  ): Promise<{ success: boolean; error?: string; qtyDeducted: number }> => {
    // FEFO Sort active batch stock counts
    const activeBatches = stok
      .filter((s) => s.kodeBarang === kodeBarang && s.jumlah > 0)
      .sort((a, b) => new Date(a.tanggalExpired).getTime() - new Date(b.tanggalExpired).getTime());

    const totalAvailable = activeBatches.reduce((sum, b) => sum + b.jumlah, 0);
    if (totalAvailable < jumlahDiminta) {
      return {
        success: false,
        error: `Stok tidak cukup. Tersedia: ${totalAvailable}, Diminta: ${jumlahDiminta}`,
        qtyDeducted: 0,
      };
    }

    try {
      const batch = writeBatch(db);
      let sisaDibutuhkan = jumlahDiminta;

      for (const bt of activeBatches) {
        if (sisaDibutuhkan <= 0) break;

        const stokId = `${bt.kodeBarang}_${bt.tanggalExpired}`;
        const sRef = doc(db, "stok", stokId);

        let deducted = 0;
        let newQty = 0;

        if (bt.jumlah >= sisaDibutuhkan) {
          deducted = sisaDibutuhkan;
          newQty = bt.jumlah - sisaDibutuhkan;
          sisaDibutuhkan = 0;
        } else {
          deducted = bt.jumlah;
          newQty = 0;
          sisaDibutuhkan -= bt.jumlah;
        }

        // Apply deduction to the specific batch
        batch.set(sRef, {
          kodeBarang: bt.kodeBarang,
          tanggalExpired: bt.tanggalExpired,
          jumlah: newQty
        });

        // Add mutation ledger log
        const mId = `M-USE-${Date.now()}-${stokId}-${Math.floor(Math.random() * 100)}`;
        const mRef = doc(db, "mutasi", mId);
        batch.set(mRef, {
          id: mId,
          jenis: "KELUAR",
          kodeBarang: kodeBarang,
          jumlah: deducted,
          tanggal: tanggal,
          tanggalExpired: bt.tanggalExpired,
          keterangan: `${keterangan} [ED: ${bt.tanggalExpired}]`,
          operator: operator,
        } as MutasiBarang);
      }

      await batch.commit();

      return {
        success: true,
        qtyDeducted: jumlahDiminta,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `stok_deduction/${kodeBarang}`);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Gagal memproses mutasi pemakaian",
        qtyDeducted: 0
      };
    }
  };

  // 5. PERMINTAAN REQUESTS CREATION
  const addPermintaan = async (req: PermintaanBarang) => {
    try {
      const escapedNoSurat = req.noSurat.replace(/\//g, "_");
      await setDoc(doc(db, "permintaan", escapedNoSurat), req);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `permintaan/${req.noSurat}`);
    }
  };

  const cancelPermintaan = async (noSurat: string) => {
    try {
      const escapedNoSurat = noSurat.replace(/\//g, "_");
      const reqMatch = permintaan.find(r => r.noSurat === noSurat);
      if (reqMatch) {
         await setDoc(doc(db, "permintaan", escapedNoSurat), {
           ...reqMatch,
           status: "Batal"
         });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `permintaan_cancel/${noSurat}`);
    }
  };

  const deletePermintaan = async (noSurat: string) => {
    try {
      const escapedNoSurat = noSurat.replace(/\//g, "_");
      await deleteDoc(doc(db, "permintaan", escapedNoSurat));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `permintaan/${noSurat}`);
    }
  };

  // Helper aggregate selectors
  const getAggregatedStock = () => {
    const agg: Record<string, { total: number; detail: BatchStok[] }> = {};
    barang.forEach((b) => {
      agg[b.kodeBarang] = { total: 0, detail: [] };
    });

    stok.forEach((s) => {
      if (agg[s.kodeBarang]) {
        agg[s.kodeBarang].total += s.jumlah;
        agg[s.kodeBarang].detail.push(s);
      }
    });

    return agg;
  };

  const getAverageMonthlyUsage = (kodeBarang: string) => {
    const curYear = 2026;
    const itemOuts = mutasi.filter(
      (m) => m.kodeBarang === kodeBarang && m.jenis === "KELUAR" && m.tanggal.startsWith("2026")
    );
    const sumOut = itemOuts.reduce((sum, m) => sum + m.jumlah, 0);
    const months = 5;
    const avg = Math.ceil(sumOut / months);
    return avg > 0 ? avg : 5;
  };

  const updateSystemSettings = async (settings: SystemSettings) => {
    try {
      await setDoc(doc(db, "SystemSettings", "default"), settings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "SystemSettings/default");
    }
  };

  const addLaporanBulanan = async (report: LaporanBulanan) => {
    try {
      await setDoc(doc(db, "LaporanBulanan", report.id), report);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `LaporanBulanan/${report.id}`);
    }
  };

  const updatePermintaanSignature = async (noSurat: string, nip: string, nama: string, jabatan: string) => {
    try {
      const escapedNoSurat = noSurat.replace(/\//g, "_");
      const reqMatch = permintaan.find(r => r.noSurat === noSurat);
      if (reqMatch) {
         await setDoc(doc(db, "permintaan", escapedNoSurat), {
           ...reqMatch,
           ttdKepalaNip: nip,
           ttdKepalaNama: nama,
           ttdKepalaJabatan: jabatan
         });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `permintaan_sig/${noSurat}`);
    }
  };

  const importBarangMassal = async (importedItems: any[]) => {
    if (!user || user.nip !== "199606282022041001") {
      throw new Error("Akses Ditolak: Anda tidak memiliki izin untuk mengimpor data");
    }

    try {
      const batchMax = 300;
      let currentBatch = writeBatch(db);
      let count = 0;
      let tempStok = [...stok];

      for (const item of importedItems) {
        const barangData: Barang = {
          kodeBarang: item.kodeBarang,
          namaBarang: item.namaBarang,
          satuan: item.satuan,
          stokMinimum: Number(item.stokMinimum || 5),
          kategori: item.kategori,
        };
        currentBatch.set(doc(db, "barang", item.kodeBarang), barangData);
        count++;

        if (item.jumlah > 0 && item.tanggalExpired) {
          const stokId = `${item.kodeBarang}_${item.tanggalExpired}`;
          const existingStokIndex = tempStok.findIndex(s => s.kodeBarang === item.kodeBarang && s.tanggalExpired === item.tanggalExpired);
          const currentQty = existingStokIndex >= 0 ? tempStok[existingStokIndex].jumlah : 0;
          const newQty = currentQty + Number(item.jumlah);

          if (existingStokIndex >= 0) {
            tempStok[existingStokIndex].jumlah = newQty;
          } else {
            tempStok.push({
              kodeBarang: item.kodeBarang,
              tanggalExpired: item.tanggalExpired,
              jumlah: newQty
            });
          }

          const batchData: BatchStok = {
            kodeBarang: item.kodeBarang,
            tanggalExpired: item.tanggalExpired,
            jumlah: newQty,
          };
          currentBatch.set(doc(db, "stok", stokId), batchData);
          count++;

          const mutasiId = `M-IMP-${Date.now()}-${item.kodeBarang}-${Math.floor(Math.random() * 1000)}`;
          const mutasiData: MutasiBarang = {
            id: mutasiId,
            jenis: "MASUK",
            kodeBarang: item.kodeBarang,
            jumlah: Number(item.jumlah),
            tanggal: new Date().toISOString().split("T")[0],
            tanggalExpired: item.tanggalExpired,
            keterangan: "Import Data Massal (Excel/CSV)",
            operator: user ? user.nama : "Sistem",
          };
          currentBatch.set(doc(db, "mutasi", mutasiId), mutasiData);
          count++;
        }

        if (count >= batchMax) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          count = 0;
        }
      }

      const dateNow = new Date();
      const timestampString = dateNow.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).replace(/\./g, ":");

      const logId = `L-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logPesan = `User [${user.nip}] melakukan import data barang pada [${timestampString}]`;
      const logDoc = {
        id: logId,
        nip: user.nip,
        pesan: logPesan,
        timestamp: timestampString
      };

      currentBatch.set(doc(db, "log_aktivitas", logId), logDoc);
      count++;

      if (count > 0) {
        await currentBatch.commit();
      }
    } catch (err) {
      console.error("Error during mass import:", err);
      throw err;
    }
  };

  const restoreDatabase = async (backupData: any) => {
    if (!backupData || !backupData.data) {
      throw new Error("Format payload backup tidak valid.");
    }
    const collectionsToRestore = [
      { name: "pegawai", key: "pegawai", idField: "nip" },
      { name: "barang", key: "barang", idField: "kodeBarang" },
      { name: "stok", key: "stok", idField: "" },
      { name: "mutasi", key: "mutasi", idField: "id" },
      { name: "permintaan", key: "permintaan", idField: "noSurat" },
      { name: "penerimaan", key: "penerimaan", idField: "id" },
      { name: "SystemSettings", key: "systemSettings", idField: "id" }
    ];

    for (const coll of collectionsToRestore) {
      // 1. Get all current documents in this collection
      const q = collection(db, coll.name);
      const snap = await getDocs(q);
      
      // 2. Delete them in batch
      if (!snap.empty) {
        let batch = writeBatch(db);
        let count = 0;
        for (const docSnap of snap.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }

      // 3. Write new objects from backup
      let items = backupData.data[coll.key] || [];
      // Handle single object for systemSettings
      if (coll.key === "systemSettings" && !Array.isArray(items)) {
        items = items ? [items] : [];
      }

      if (items.length > 0) {
        let batch = writeBatch(db);
        let count = 0;
        for (const item of items) {
          let docId = "";
          if (coll.name === "stok") {
            docId = `${item.kodeBarang}_${item.tanggalExpired}`;
          } else if (coll.name === "permintaan") {
            docId = item.noSurat.replace(/\//g, "_");
          } else if (coll.name === "SystemSettings") {
            docId = item.id || "default";
          } else {
            docId = String(item[coll.idField]);
          }
          const dRef = doc(db, coll.name, docId);
          batch.set(dRef, item);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }
    }
  };

  return {
    pegawai,
    barang,
    stok,
    mutasi,
    permintaan,
    penerimaan,
    systemSettings,
    laporanBulanan,
    updateSystemSettings,
    addLaporanBulanan,
    updatePermintaanSignature,
    restoreDatabase,
    user,
    setUser,
    firebaseUser,
    authLoading,
    databaseSynced,
    getAggregatedStock,
    getAverageMonthlyUsage,
    addPegawai,
    updatePegawai,
    deletePegawai,
    addBarang,
    updateBarang,
    deleteBarang,
    receiveItems,
    deletePenerimaan,
    updatePenerimaan,
    useItemManualRaw,
    addPermintaan,
    cancelPermintaan,
    deletePermintaan,
    signOutFirebase,
    logAktivitasList,
    importBarangMassal,
  };
}
