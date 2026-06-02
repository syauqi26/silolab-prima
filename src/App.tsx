import React, { useState } from "react";
import { useLogistikState } from "./hooks/useLogistikState";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import MasterBarang from "./components/MasterBarang";
import PermintaanBarangComponent from "./components/PermintaanBarang";
import PenerimaanBarangComponent from "./components/PenerimaanBarang";
import PemakaianBarangComponent from "./components/PemakaianBarang";
import StokBarangComponent from "./components/StokBarang";
import MasterPegawai from "./components/MasterPegawai";
import LogoHusadaPrima from "./components/LogoHusadaPrima";
import PengaturanSistem from "./components/PengaturanSistem";

import { 
  FlaskConical, 
  LayoutDashboard, 
  Database, 
  FileText, 
  PackageCheck, 
  Flame, 
  Boxes, 
  Users, 
  LogOut,
  Menu,
  X,
  Loader2,
  ShieldCheck,
  CloudCheck,
  Settings
} from "lucide-react";

export default function App() {
  const state = useLogistikState();
  const [activeTab, setActiveTab] = useState<"dashboard" | "master_barang" | "permintaan" | "penerimaan" | "pemakaian" | "stok" | "pegawai" | "pengaturan">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-redirect if non-authorized user tries to access 'pegawai' or 'pengaturan' tab
  React.useEffect(() => {
    if ((activeTab === "pegawai" || activeTab === "pengaturan") && state.user?.nip !== "199606282022041001") {
      setActiveTab("dashboard");
    }
  }, [activeTab, state.user]);

  // 1. Firebase Auth Loader State
  if (state.authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-natural-bg text-natural-text font-sans p-6 select-none">
        <div className="flex flex-col items-center max-w-sm text-center">
          <LogoHusadaPrima variant="dark" className="bg-white border border-natural-border p-4 rounded-xl shadow-md mb-6" />
          <Loader2 className="w-8 h-8 text-natural-sidebar animate-spin mb-4" />
          <h3 className="font-bold text-xs tracking-widest text-[#152e2e] uppercase">SINKRONISASI KREDENSIAL</h3>
          <p className="text-[10px] text-natural-muted mt-2 font-bold uppercase tracking-wider">Menghubungkan Sesi Cloud...</p>
        </div>
      </div>
    );
  }

  // 2. Combined Google Auth, Database Sync & Pegawai Picker Gate
  if (!state.firebaseUser || !state.databaseSynced || !state.user) {
    return (
      <Login 
        pegawaiList={state.pegawai || []} 
        onLoginSuccess={(u) => state.setUser(u)} 
        firebaseUser={state.firebaseUser}
        databaseSynced={state.databaseSynced}
      />
    );
  }

  // Navigation Tabs configuration with exact names requested
  const navigationTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "master_barang", label: "Master Barang", icon: Database },
    { id: "permintaan", label: "Permintaan Barang", icon: FileText },
    { id: "penerimaan", label: "Penerimaan Barang", icon: PackageCheck },
    { id: "pemakaian", label: "Pemakaian Rutin", icon: Flame },
    { id: "stok", label: "Stok Masa ED", icon: Boxes },
    ...(state.user?.nip === "199606282022041001" ? [
      { id: "pegawai", label: "Master Pegawai", icon: Users },
      { id: "pengaturan", label: "Pengaturan Sistem", icon: Settings }
    ] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-natural-bg text-natural-text font-sans">
      
      {/* Mobile Header Top-Bar */}
      <header className="md:hidden no-print bg-natural-sidebar text-white px-4 py-2.5 flex items-center justify-between border-b border-natural-sidebar-hover shrink-0">
        <div className="flex items-center gap-2">
          <LogoHusadaPrima showText={false} />
          <div>
            <h1 className="font-black font-display text-xs tracking-wider text-white leading-none">SILOLAB PRIMA</h1>
            <p className="text-[8px] text-natural-muted font-sans mt-0.5">dibuat oleh Yusri Hikmawati, S.ST.</p>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded bg-natural-sidebar-hover text-slate-200"
        >
          {sidebarOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION COLUMN */}
      <aside className={`w-64 bg-natural-sidebar text-slate-300 no-print shrink-0 md:flex flex-col justify-between border-r border-natural-sidebar-hover absolute md:relative z-40 h-full min-h-screen transition-transform duration-200 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* App Branding Title Header */}
            <div className="p-4 border-b border-natural-sidebar-hover flex flex-col gap-3.5 bg-[#1E3333]">
              <LogoHusadaPrima variant="light" />
              <div className="border-t border-natural-sidebar-hover/30 pt-2.5 flex items-center justify-between text-[19px]">
                <div>
                  <h1 className="font-extrabold font-display text-[14px] tracking-widest text-[#BBEABB] leading-none">
                    SILOLAB PRIMA
                  </h1>
                  <p className="text-[11px] text-slate-300 font-sans mt-1 font-semibold">
                    dibuat oleh Yusri Hikmawati, S.ST.
                  </p>
                </div>
                <span className="text-[7.5px] font-mono bg-[#88C070]/20 text-natural-accent border border-natural-accent/30 px-1.5 py-0.5 rounded font-black">
                  CLOUD
                </span>
              </div>
            </div>

            {/* Nav Menu Tab items */}
            <nav className="p-4 space-y-1">
              {navigationTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setSidebarOpen(false); // close draw on click on mobile
                    }}
                    className={`w-full text-left flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                      isActive 
                        ? "bg-natural-sidebar-hover text-white border-natural-sidebar-hover border-r-4 border-r-natural-accent shadow-sm" 
                        : "hover:bg-natural-sidebar-hover/60 hover:text-white border-transparent text-slate-300"
                    }`}
                  >
                    <TabIcon className={`w-4 h-4 ${isActive ? "text-natural-accent" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Active Operator User Bottom Profile */}
          <div className="p-4 border-t border-natural-sidebar-hover bg-[#1E3333] space-y-3">
            
            {/* Google Authentication ID sync */}
            {state.firebaseUser && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-950/35 border border-emerald-800/40 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-natural-accent animate-pulse"></div>
                <div className="text-[9px] text-[#A0BABA] font-bold tracking-wide truncate">
                  Cloud: {state.firebaseUser.displayName || state.firebaseUser.email}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 bg-[#2B4343] border border-[#3A5656]/50 p-2.5 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-natural-accent/15 text-natural-accent border border-natural-accent/20 flex items-center justify-center font-bold text-xs shrink-0 uppercase select-none">
                {state.user.nama.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-bold text-white truncate font-sans">
                  {state.user.nama}
                </h4>
                <p className="text-[9px] text-[#A0BABA] truncate mt-0.5">
                  {state.user.jabatan}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  state.setUser(null);
                  setActiveTab("dashboard");
                }}
                className="w-full bg-rose-900/40 hover:bg-rose-950 hover:text-rose-300 text-rose-200 border border-rose-800/50 transition-all text-center py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> Keluar
              </button>
              
              <button
                onClick={() => {
                  if (confirm("Disconnect database server dari Firebase saat ini?")) {
                    state.signOutFirebase();
                  }
                }}
                className="w-full bg-[#1E3333] hover:bg-slate-800 hover:text-white text-slate-400 border border-[#3A5656]/30 transition-all text-center py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <CloudCheck className="w-3 h-3 text-natural-accent" /> Disconnect
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area Body */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Desktop Bar Detail */}
        <div className="hidden md:flex no-print items-center justify-between bg-white border-b border-natural-border px-8 py-4 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-natural-muted font-sans">
            <span>Sistem Logistik Lab Husada Prima Surabaya</span>
          </div>
          <div className="text-[10px] font-bold text-natural-muted uppercase tracking-widest bg-natural-row-bg border border-natural-border px-3 py-1 rounded-full">
            Tahun Kerja: <strong>2026</strong>
          </div>
        </div>

        {/* Dynamic Route views contents */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-16">
          {activeTab === "dashboard" && (
            <Dashboard 
              barangList={state.barang}
              stokList={state.stok}
              mutasiList={state.mutasi}
              pegawaiList={state.pegawai}
              currentUser={state.user}
              getAggregatedStock={state.getAggregatedStock}
              getAverageMonthlyUsage={state.getAverageMonthlyUsage}
              onNavigate={setActiveTab}
              systemSettings={state.systemSettings}
              laporanBulananList={state.laporanBulanan}
              addLaporanBulanan={state.addLaporanBulanan}
            />
          )}

          {activeTab === "master_barang" && (
            <MasterBarang 
              barangList={state.barang}
              getAggregatedStock={state.getAggregatedStock}
              addBarang={state.addBarang}
              updateBarang={state.updateBarang}
              deleteBarang={state.deleteBarang}
              currentUser={state.user}
              importBarangMassal={state.importBarangMassal}
            />
          )}

          {activeTab === "permintaan" && (
            <PermintaanBarangComponent 
              barangList={state.barang}
              permintaanList={state.permintaan}
              pegawaiList={state.pegawai}
              getAggregatedStock={state.getAggregatedStock}
              getAverageMonthlyUsage={state.getAverageMonthlyUsage}
              addPermintaan={state.addPermintaan}
              cancelPermintaan={state.cancelPermintaan}
              deletePermintaan={state.deletePermintaan}
              currentUser={state.user}
              systemSettings={state.systemSettings}
              updatePermintaanSignature={state.updatePermintaanSignature}
            />
          )}

          {activeTab === "penerimaan" && (
            <PenerimaanBarangComponent 
              barangList={state.barang}
              pegawaiList={state.pegawai}
              permintaanList={state.permintaan}
              penerimaanList={state.penerimaan}
              receiveItems={state.receiveItems}
              deletePenerimaan={state.deletePenerimaan}
              updatePenerimaan={state.updatePenerimaan}
              getAggregatedStock={state.getAggregatedStock}
              currentUser={state.user}
            />
          )}

          {activeTab === "pemakaian" && (
            <PemakaianBarangComponent 
              barangList={state.barang}
              pegawaiList={state.pegawai}
              mutasiList={state.mutasi}
              stokList={state.stok}
              useItemManualRaw={state.useItemManualRaw}
              getAggregatedStock={state.getAggregatedStock}
            />
          )}

          {activeTab === "stok" && (
            <StokBarangComponent 
              barangList={state.barang}
              stokList={state.stok}
              getAggregatedStock={state.getAggregatedStock}
              getAverageMonthlyUsage={state.getAverageMonthlyUsage}
              currentUser={state.user}
            />
          )}

          {activeTab === "pegawai" && (
            <MasterPegawai 
              pegawaiList={state.pegawai}
              addPegawai={state.addPegawai}
              updatePegawai={state.updatePegawai}
              deletePegawai={state.deletePegawai}
              currentUser={state.user}
            />
          )}

          {activeTab === "pengaturan" && (
            <PengaturanSistem 
              systemSettings={state.systemSettings}
              updateSystemSettings={state.updateSystemSettings}
              pegawaiList={state.pegawai}
              barangList={state.barang}
              stokList={state.stok}
              mutasiList={state.mutasi}
              permintaanList={state.permintaan}
              penerimaanList={state.penerimaan}
              restoreDatabase={state.restoreDatabase}
            />
          )}
        </div>
      </main>

      {/* Screen Backdrop for Mobile when sidebar is active drawer */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-xs md:hidden"
        ></div>
      )}
    </div>
  );
}
