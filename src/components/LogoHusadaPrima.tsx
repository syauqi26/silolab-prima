import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "light" | "dark" | "colored";
}

export default function LogoHusadaPrima({ className = "", showText = true, variant = "colored" }: LogoProps) {
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0200875223.firebasestorage.app/o/logo_rsudhp2022.png?alt=media&token=b7a81310-ba34-4521-b6bc-bea39ebe417f";

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <img
          src={logoUrl}
          alt="Logo RSUD Husada Prima"
          className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-sm border border-slate-200/50"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-normal">
          <div className="flex items-center gap-1">
            <span className="text-[7.5px] font-black tracking-widest text-[#FFF] opacity-90 px-1 bg-amber-600 rounded">
              PEMPROV JATIM
            </span>
          </div>
          <h2 className={`font-black font-display tracking-wider text-[13px] mt-0.5 ${
            variant === "light" ? "text-white" : variant === "dark" ? "text-[#152e2e]" : "text-slate-800"
          }`}>
            RSUD HUSADA PRIMA
          </h2>
          <span className={`text-[8px] font-bold tracking-wider font-sans leading-none mt-0.5 ${
            variant === "light" ? "text-[#CFECC2]" : "text-slate-500"
          }`}>
            PROFESIONAL MELAYANI SEPENUH HATI
          </span>
        </div>
      )}
    </div>
  );
}
