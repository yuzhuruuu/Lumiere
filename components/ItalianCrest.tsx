"use client";

import React from "react";

export default function ItalianCrest({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer Fine Filigree Ring */}
      <circle
        cx="50"
        cy="50"
        r="47"
        stroke="#C8A96A"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.6"
      />
      <circle cx="50" cy="50" r="44" stroke="#C8A96A" strokeWidth="1.2" opacity="0.8" />
      <circle cx="50" cy="50" r="41" stroke="#C8A96A" strokeWidth="0.6" opacity="0.4" />

      {/* Decorative Cardinal Stars */}
      <polygon points="50,11 51.5,14 54,14 52,16 53,18.5 50,17 47,18.5 48,16 46,14 48.5,14" fill="#C8A96A" />
      <polygon points="50,89 51.5,86 54,86 52,84 53,81.5 50,83 47,81.5 48,84 46,86 48.5,86" fill="#C8A96A" />

      {/* Laurel Leaves (Left Branch) */}
      <path
        d="M26 48C24 43 27 38 31 36C31 40 28 44 26 48ZM29 60C26 56 28 50 32 48C33 52 30 57 29 60ZM35 70C31 67 32 61 36 59C38 63 36 67 35 70Z"
        fill="#C8A96A"
        opacity="0.75"
      />

      {/* Laurel Leaves (Right Branch) */}
      <path
        d="M74 48C76 43 73 38 69 36C69 40 72 44 74 48ZM71 60C74 56 72 50 68 48C67 52 70 57 71 60ZM65 70C69 67 68 61 64 59C62 63 64 67 65 70Z"
        fill="#C8A96A"
        opacity="0.75"
      />

      {/* Central Monogram 'L' with Serif & Italian Flourish */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="Playfair Display, Georgia, serif"
        fontSize="30"
        fontWeight="bold"
        fill="#F7F6F1"
        letterSpacing="1"
      >
        L
      </text>

      {/* Subtext 'ITALIA' & 'MMXXVI' */}
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily="Plus Jakarta Sans, sans-serif"
        fontSize="5.5"
        fontWeight="600"
        fill="#C8A96A"
        letterSpacing="2.5"
      >
        MMXXVI
      </text>
    </svg>
  );
}
