import React from "react";

export default function KopSurat() {
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0200875223.firebasestorage.app/o/962c346ecef41e9cd4147ab70c00b46f.png?alt=media";

  return (
    <div className="flex items-center justify-between border-b-4 border-double border-black pb-4 mb-6">
      {/* Official Image Logo */}
      <div className="w-24 h-24 flex-shrink-0 mr-4 flex items-center justify-center">
        <img
          src={logoUrl}
          alt="Logo RSUD Husada Prima"
          className="w-[90px] h-[90px] object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Main Kop Text Content */}
      <div className="flex-1 text-center select-none">
        <h4 className="text-sm font-semibold tracking-wider text-black uppercase m-0 leading-tight">
          Pemerintah Provinsi Jawa Timur
        </h4>
        <h3 className="text-base font-bold tracking-widest text-black uppercase m-0 leading-tight">
          Dinas Kesehatan
        </h3>
        <h2 className="text-xl font-extrabold tracking-wide text-black uppercase m-0 py-0.5 leading-snug">
          Rumah Sakit Umum Daerah Husada Prima
        </h2>
        <p className="text-xs text-stone-800 font-normal m-0 leading-relaxed font-sans">
          Jalan Karang Tembok Nomor 39, Pegirian, Surabaya, Jawa Timur 60153
        </p>
        <p className="text-xs text-stone-800 font-normal m-0 leading-relaxed font-sans">
          Telepon (031)3713836, Laman <span className="underline">rsudhusadaprima.jatimprov.go.id</span>
        </p>
      </div>

      {/* Placeholer for perfect spacing with Jatim logo */}
      <div className="w-24 h-24 flex-shrink-0 ml-4 hidden md:flex items-center justify-center opacity-0 select-none">
        {/* Mirror element to ensure exact center alignment */}
        Logo Placeholder
      </div>
    </div>
  );
}
