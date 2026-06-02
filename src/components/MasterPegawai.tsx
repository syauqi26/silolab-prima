import React, { useState } from "react";
import { Pegawai } from "../types";
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  UserCheck2, 
  BookOpen, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface MasterPegawaiProps {
  pegawaiList: Pegawai[];
  addPegawai: (p: Pegawai) => void;
  updatePegawai: (p: Pegawai) => void;
  deletePegawai: (nip: string) => void;
  currentUser: Pegawai | null;
}

export default function MasterPegawai({
  pegawaiList,
  addPegawai,
  updatePegawai,
  deletePegawai,
  currentUser,
}: MasterPegawaiProps) {
  // UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNip, setEditingNip] = useState<string | null>(null);

  // Form fields adding
  const [newNip, setNewNip] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newJabatan, setNewJabatan] = useState("");
  const [newPassword, setNewPassword] = useState("123");

  // Editing values
  const [editNama, setEditNama] = useState("");
  const [editJabatan, setEditJabatan] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleCreatePegawai = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (currentUser?.nip !== "199606282022041001") {
      setErrorMsg("Akses Ditolak: Hanya Super User (Ahmad Syauqi Abrori) yang diizinkan mendaftarkan pegawai baru.");
      return;
    }

    if (!newNip.trim() || !newNama.trim() || !newJabatan.trim()) {
      setErrorMsg("Seluruh kolom input pegawai (NIP, Nama, Jabatan) wajib diisi!");
      return;
    }

    if (pegawaiList.some((p) => p.nip === newNip.trim())) {
      setErrorMsg(`Pegawai dengan NIP [${newNip}] sudah terdaftar!`);
      return;
    }

    const brandNew: Pegawai = {
      nip: newNip.trim(),
      nama: newNama.trim(),
      jabatan: newJabatan.trim(),
      password: newPassword.trim() || "123",
    };

    addPegawai(brandNew);
    
    // reset adding states
    setNewNip("");
    setNewNama("");
    setNewJabatan("");
    setNewPassword("123");
    setShowAddForm(false);
    
    setSuccessMsg(`Pegawai baru [${brandNew.nama}] berhasil disimpan ke server laborat!`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleStartEdit = (p: Pegawai) => {
    if (currentUser?.nip !== "199606282022041001") {
      setErrorMsg("Akses Ditolak: Anda tidak diizinkan mengubah data pegawai.");
      return;
    }
    setEditingNip(p.nip);
    setEditNama(p.nama);
    setEditJabatan(p.jabatan);
    setEditPassword(p.password || "123");
  };

  const handleSaveEdit = (nip: string) => {
    if (currentUser?.nip !== "199606282022041001") {
      alert("Akses Ditolak: Anda tidak diizinkan mengubah data pegawai.");
      return;
    }
    if (!editNama.trim() || !editJabatan.trim()) {
      alert("Nama dan Jabatan tidak boleh kosong!");
      return;
    }

    updatePegawai({
      nip,
      nama: editNama.trim(),
      jabatan: editJabatan.trim(),
      password: editPassword.trim() || "123",
    });

    setEditingNip(null);
    setSuccessMsg("Detail pegawai berhasil diperbarui.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDelete = (nip: string) => {
    if (currentUser?.nip !== "199606282022041001") {
      setErrorMsg("Akses Ditolak: Anda tidak diizinkan menghapus data pegawai.");
      return;
    }
    if (nip === currentUser?.nip) {
      setErrorMsg("Anda dilarang menghapus akun Anda sendiri yang sedang aktif!");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }

    const target = pegawaiList.find((p) => p.nip === nip);
    if (target && confirm(`Apakah Anda yakin ingin menghapus data pegawai [${target.nama}]?`)) {
      deletePegawai(nip);
      setSuccessMsg(`Pegawai [${target.nama}] berhasil dihapus dari daftar.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Searching query matching
  const filteredPegawai = pegawaiList.filter((p) => {
    const term = searchQuery.toLowerCase();
    return p.nama.toLowerCase().includes(term) ||
           p.nip.toLowerCase().includes(term) ||
           p.jabatan.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Top details layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Daftar Master Pegawai Utama RSUD Husada Prima
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar nama, NIP, penjabat berwenang menandatangani surat permintaan, bukti serah terima logfar, dan penanggung jawab teknis.
          </p>
        </div>

        {currentUser?.nip === "199606282022041001" && (
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setErrorMsg("");
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            {showAddForm ? "Sembunyikan Form" : "Tambah Pegawai Baru"}
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ADD NEW STAFF FORM */}
      {showAddForm && currentUser?.nip === "199606282022041001" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md animate-in fade-in duration-150">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-teal-600" /> Registrasi Anggota Pegawai Baru
          </h3>

          <form onSubmit={handleCreatePegawai} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* NIP */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Nomor Induk Pegawai (NIP)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 198005122005012003"
                  value={newNip}
                  onChange={(e) => setNewNip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white"
                />
              </div>

              {/* Nama Pegawai */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Nama Lengkap beserta Gelar
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Yusri Hikmawati, S.ST."
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white"
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Jabatan Pekerjaan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kepala Instalasi"
                  value={newJabatan}
                  onChange={(e) => setNewJabatan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Kata Sandi (Password)
                </label>
                <input
                  type="text"
                  placeholder="Default: 123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white font-bold"
                />
              </div>
            </div>

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
                Simpan Pegawai
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH AND INTEGRATION ASSIST PANEL */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari pegawai berdasarkan NIP, nama atau jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2 text-xs outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase font-sans">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>Status: Database Sinkron</span>
        </div>
      </div>

      {/* TABLE DATA LIST OF EMPLOYEES */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto text-slate-700 text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">Foto / Profil</th>
                <th className="p-4 col-span-2">NIP Pegawai (Resmi)</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Jabatan Struktural / Peran</th>
                <th className="p-4">Password</th>
                <th className="p-4 text-center">Status Sesi</th>
                {currentUser?.nip === "199606282022041001" && <th className="p-4 text-center">Aksi / Kontrol</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPegawai.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.nip === "199606282022041001" ? 7 : 6} className="text-center py-12 text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto opacity-30 stroke-1 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada pegawai yang ditemukan.</p>
                  </td>
                </tr>
              ) : (
                filteredPegawai.map((p) => {
                  const isEditing = editingNip === p.nip;
                  const isCurrentActive = p.nip === currentUser?.nip;
                  
                  return (
                    <tr key={p.nip} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-all font-sans ${isCurrentActive ? 'bg-teal-50/20' : ''}`}>
                      <td className="p-4">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 select-none">
                          {p.nama.charAt(0)}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-800">{p.nip}</td>
                      <td className="p-4 font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNama}
                            onChange={(e) => setEditNama(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-teal-500 rounded p-1 text-xs w-full outline-none font-bold text-slate-900"
                          />
                        ) : (
                          p.nama
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editJabatan}
                            onChange={(e) => setEditJabatan(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-teal-500 rounded p-1 text-xs w-full outline-none text-slate-700"
                          />
                        ) : (
                          p.jabatan
                        )}
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-teal-500 rounded p-1 text-xs w-full outline-none text-slate-800 font-bold"
                          />
                        ) : (
                          p.password || "123"
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isCurrentActive ? (
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase inline-flex items-center gap-1">
                            <UserCheck2 className="w-3 h-3 text-teal-700" /> Aktif
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-semibold uppercase">Offline</span>
                        )}
                      </td>
                      {currentUser?.nip === "199606282022041001" && (
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveEdit(p.nip)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] p-2 rounded transition-all cursor-pointer"
                                title="Simpan Perubahan"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartEdit(p)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold p-2 rounded transition-all cursor-pointer border border-slate-200"
                                title="Edit Detail Pegawai"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(p.nip)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded transition-all cursor-pointer border border-rose-100"
                              title="Hapus Pegawai"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right text-[10px] text-slate-400 font-medium">
          Daftar ini sinkron dengan penandatangan kop surat permintaan dan berita acara serah terima penerimaan.
        </div>
      </div>
    </div>
  );
}
