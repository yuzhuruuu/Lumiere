"use client";

import React, { useState } from "react";
import { Copy, Check, Printer } from "lucide-react";

// Code 128B patterns (bar/space widths, 11 modules per character, stop has 13)
const CODE128_PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function encodeCode128B(text: string): number[] {
  const START_B = 104;
  const STOP = 106;
  const codes: number[] = [START_B];
  let checksum = START_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const val = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    codes.push(val);
    checksum += val * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(STOP);
  return codes;
}

export default function BarcodeSVG({
  value,
  showActions = true,
}: {
  value: string;
  showActions?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const codes = encodeCode128B(value);
  const bars: { x: number; w: number }[] = [];
  let cursor = 10; // quiet zone

  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      if (i % 2 === 0) {
        bars.push({ x: cursor, w: width });
      }
      cursor += width;
    }
  });

  const totalWidth = cursor + 10;
  const barHeight = 56;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center bg-white text-zinc-900 rounded-2xl p-5 shadow-lg border border-lumiere-gold/40">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-2">
        Lumière Digital Reservation Pass
      </div>
      <svg
        viewBox={`0 0 ${totalWidth} ${barHeight}`}
        className="w-full max-w-[280px] h-16"
        role="img"
        aria-label={`Barcode reservasi ${value}`}
      >
        <rect x={0} y={0} width={totalWidth} height={barHeight} fill="#FFFFFF" />
        {bars.map((b, idx) => (
          <rect
            key={idx}
            x={b.x}
            y={2}
            width={b.w}
            height={barHeight - 4}
            fill="#09090B"
          />
        ))}
      </svg>
      <div className="mt-2 font-mono text-base sm:text-lg font-bold tracking-[0.18em] text-zinc-900">
        {value}
      </div>
      {showActions && (
        <div className="mt-3 flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Salin Kode
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Tiket
          </button>
        </div>
      )}
    </div>
  );
}
