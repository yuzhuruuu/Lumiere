"use client";

import React from "react";

export function CherryTomato({
  className = "",
  size = 64,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  rotate?: number;
}) {
  const id = React.useId();
  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
      className={`relative select-none pointer-events-none drop-shadow-[0_18px_24px_rgba(0,0,0,0.85)] filter ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Rich 3D volume gradient for red tomato */}
          <radialGradient
            id={`tomatoBody-${id}`}
            cx="36%"
            cy="32%"
            r="65%"
            fx="30%"
            fy="25%"
          >
            <stop offset="0%" stopColor="#FF6B55" />
            <stop offset="30%" stopColor="#E32619" />
            <stop offset="70%" stopColor="#A81414" />
            <stop offset="100%" stopColor="#4A0507" />
          </radialGradient>

          {/* High gloss specular highlight */}
          <radialGradient
            id={`specular-${id}`}
            cx="32%"
            cy="26%"
            r="28%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Calyx (green sepals) gradient */}
          <linearGradient
            id={`calyx-${id}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#81E6D9" />
            <stop offset="40%" stopColor="#38A169" />
            <stop offset="100%" stopColor="#1C4532" />
          </linearGradient>

          {/* Stem gradient */}
          <linearGradient
            id={`stem-${id}`}
            x1="0%"
            y1="100%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#276749" />
            <stop offset="70%" stopColor="#48BB78" />
            <stop offset="100%" stopColor="#22543D" />
          </linearGradient>
        </defs>

        {/* Tomato Sphere Body */}
        <circle cx="50" cy="54" r="40" fill={`url(#tomatoBody-${id})`} />

        {/* Secondary soft rim glow (reflected bounce light) */}
        <path
          d="M 22 75 A 39 39 0 0 0 78 75 A 39 36 0 0 1 22 75 Z"
          fill="#FF8566"
          opacity="0.25"
        />

        {/* Glossy Specular Spot */}
        <ellipse
          cx="38"
          cy="38"
          rx="14"
          ry="8"
          transform="rotate(-28 38 38)"
          fill={`url(#specular-${id})`}
        />

        {/* Calyx (5 green star sepals resting on top of tomato) */}
        <g transform="translate(50, 20)">
          {/* Curved Stem */}
          <path
            d="M 0 0 C -2 -10, 6 -16, 12 -18 C 14 -19, 13 -16, 8 -13 C 4 -10, 2 -5, 1 0 Z"
            fill={`url(#stem-${id})`}
          />

          {/* Sepal 1: Center top */}
          <path
            d="M 0 0 C -3 -7, -2 -12, 1 -15 C 3 -12, 4 -7, 0 0 Z"
            fill={`url(#calyx-${id})`}
          />
          {/* Sepal 2: Right top */}
          <path
            d="M 0 0 C 4 -5, 12 -7, 18 -4 C 13 -2, 7 2, 0 0 Z"
            fill={`url(#calyx-${id})`}
          />
          {/* Sepal 3: Right bottom */}
          <path
            d="M 0 0 C 6 2, 14 7, 16 14 C 11 11, 5 5, 0 0 Z"
            fill={`url(#calyx-${id})`}
          />
          {/* Sepal 4: Left bottom */}
          <path
            d="M 0 0 C -5 3, -12 8, -15 15 C -12 10, -6 4, 0 0 Z"
            fill={`url(#calyx-${id})`}
          />
          {/* Sepal 5: Left top */}
          <path
            d="M 0 0 C -5 -4, -13 -6, -18 -2 C -13 0, -6 3, 0 0 Z"
            fill={`url(#calyx-${id})`}
          />

          {/* Central stem bud */}
          <circle cx="0" cy="0" r="2.5" fill="#1C4532" />
        </g>
      </svg>
    </div>
  );
}

export function ChiliPod({
  className = "",
  size = 48,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  rotate?: number;
}) {
  const id = React.useId();
  return (
    <div
      style={{
        width: size * 0.65,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
      className={`relative select-none pointer-events-none drop-shadow-[0_12px_18px_rgba(0,0,0,0.8)] filter ${className}`}
    >
      <svg
        viewBox="0 0 50 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient
            id={`podGrad-${id}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FFA133" />
            <stop offset="35%" stopColor="#F55A2A" />
            <stop offset="70%" stopColor="#D92414" />
            <stop offset="100%" stopColor="#7E0D0D" />
          </linearGradient>
          <linearGradient
            id={`podCap-${id}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#48BB78" />
            <stop offset="100%" stopColor="#1C4532" />
          </linearGradient>
        </defs>

        {/* Tapered curved pod body */}
        <path
          d="M 25 15 C 38 25, 42 55, 34 78 C 30 89, 23 96, 21 99 C 20 95, 17 84, 15 74 C 11 54, 13 25, 25 15 Z"
          fill={`url(#podGrad-${id})`}
        />

        {/* Specular curved ridge */}
        <path
          d="M 24 20 C 32 32, 34 55, 28 72 C 26 77, 25 75, 26 70 C 30 54, 28 35, 22 22 Z"
          fill="#FFF"
          opacity="0.35"
        />

        {/* Green stem and cap */}
        <path
          d="M 18 16 C 22 13, 28 13, 32 16 C 30 9, 27 6, 25 2 C 24 6, 21 9, 18 16 Z"
          fill={`url(#podCap-${id})`}
        />
        <path
          d="M 25 2 C 23 -4, 28 -7, 31 -9 C 29 -6, 26 -4, 25 2 Z"
          fill="#276749"
        />
      </svg>
    </div>
  );
}

export function BasilLeaf({
  className = "",
  size = 54,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  rotate?: number;
}) {
  const id = React.useId();
  return (
    <div
      style={{
        width: size * 0.75,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
      className={`relative select-none pointer-events-none drop-shadow-[0_10px_16px_rgba(0,0,0,0.75)] filter ${className}`}
    >
      <svg
        viewBox="0 0 60 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient
            id={`basilGrad-${id}`}
            x1="20%"
            y1="0%"
            x2="80%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#48BB78" />
            <stop offset="45%" stopColor="#2F855A" />
            <stop offset="85%" stopColor="#1C4532" />
            <stop offset="100%" stopColor="#0E271D" />
          </linearGradient>
          <linearGradient
            id={`veinGrad-${id}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#9AE6B4" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#38A169" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Oval organic curved leaf */}
        <path
          d="M 30 5 C 48 18, 56 48, 50 72 C 45 88, 36 96, 30 98 C 24 96, 15 88, 10 72 C 4 48, 12 18, 30 5 Z"
          fill={`url(#basilGrad-${id})`}
        />

        {/* Satin sheen reflection on left side */}
        <path
          d="M 28 12 C 40 25, 44 48, 40 68 C 36 50, 32 30, 24 16 Z"
          fill="#FFF"
          opacity="0.16"
        />

        {/* Central Vein */}
        <path
          d="M 30 10 Q 31 50, 30 96"
          stroke={`url(#veinGrad-${id})`}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Side Veins */}
        <path
          d="M 30 30 Q 38 26, 45 32 M 30 32 Q 22 28, 15 35 M 30 48 Q 41 44, 47 52 M 30 50 Q 20 46, 13 54 M 30 68 Q 39 65, 43 72 M 30 70 Q 22 67, 17 74"
          stroke={`url(#veinGrad-${id})`}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function RosemarySprig({
  className = "",
  size = 90,
  rotate = 0,
}: {
  className?: string;
  size?: number;
  rotate?: number;
}) {
  return (
    <div
      style={{
        width: size * 0.45,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
      className={`relative select-none pointer-events-none drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)] filter ${className}`}
    >
      <svg
        viewBox="0 0 50 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Woody central stem */}
        <path
          d="M 25 10 Q 24 60, 25 115"
          stroke="#4A3425"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Needle pairs along the stem */}
        {[
          { y: 15, lRot: -45, rRot: 45, len: 14 },
          { y: 28, lRot: -50, rRot: 50, len: 18 },
          { y: 42, lRot: -45, rRot: 55, len: 20 },
          { y: 56, lRot: -55, rRot: 50, len: 21 },
          { y: 70, lRot: -50, rRot: 55, len: 20 },
          { y: 84, lRot: -55, rRot: 48, len: 18 },
          { y: 98, lRot: -48, rRot: 52, len: 16 },
        ].map((pair, idx) => (
          <g key={idx}>
            {/* Left needle */}
            <path
              d={`M 25 ${pair.y} Q 15 ${pair.y - 4}, ${25 - pair.len} ${pair.y - 8}`}
              stroke="#276749"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Right needle */}
            <path
              d={`M 25 ${pair.y} Q 35 ${pair.y - 4}, ${25 + pair.len} ${pair.y - 8}`}
              stroke="#2F855A"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Highlight tip */}
            <circle cx={25 + pair.len} cy={pair.y - 8} r="1.1" fill="#68D391" />
          </g>
        ))}

        {/* Tip bud */}
        <circle cx="25" cy="10" r="2.5" fill="#38A169" />
      </svg>
    </div>
  );
}

export function PeppercornCluster({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      {/* Scattered black peppercorns with dark sheen and shadow */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
      >
        <defs>
          <radialGradient id="peppercorn" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#4A4E51" />
            <stop offset="40%" stopColor="#25282A" />
            <stop offset="90%" stopColor="#0E1011" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>

        {/* Peppercorn 1 */}
        <circle cx="35" cy="40" r="5" fill="url(#peppercorn)" />
        <circle cx="34" cy="38.5" r="1.3" fill="#FFF" opacity="0.4" />

        {/* Peppercorn 2 */}
        <circle cx="55" cy="30" r="6" fill="url(#peppercorn)" />
        <circle cx="53.5" cy="28.5" r="1.5" fill="#FFF" opacity="0.45" />

        {/* Peppercorn 3 */}
        <circle cx="48" cy="52" r="4.5" fill="url(#peppercorn)" />
        <circle cx="47" cy="50.8" r="1" fill="#FFF" opacity="0.35" />

        {/* Peppercorn 4 */}
        <circle cx="70" cy="44" r="5" fill="url(#peppercorn)" />
        <circle cx="69" cy="42.5" r="1.2" fill="#FFF" opacity="0.4" />

        {/* Crushed golden seeds / flakes */}
        <polygon points="25,55 28,54 27,58 24,57" fill="#C8A96A" opacity="0.8" />
        <polygon points="62,65 65,63 64,67 61,66" fill="#D6B87B" opacity="0.75" />
        <polygon points="40,22 43,21 42,24 39,23" fill="#C8A96A" opacity="0.85" />
        <polygon points="78,32 80,31 79,34 77,33" fill="#E28743" opacity="0.7" />

        {/* Fine spice dust stipples */}
        <circle cx="30" cy="48" r="0.9" fill="#C8A96A" opacity="0.6" />
        <circle cx="42" cy="35" r="0.8" fill="#E28743" opacity="0.7" />
        <circle cx="60" cy="40" r="0.8" fill="#C8A96A" opacity="0.65" />
        <circle cx="52" cy="45" r="1" fill="#FFFFFF" opacity="0.5" />
      </svg>
    </div>
  );
}

export function StudioLightingOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden -z-10">
      {/* 1. Top Hero Overhead Softbox Spotlight */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(19, 78, 67, 0.42) 0%, rgba(11, 40, 34, 0.22) 45%, rgba(7, 31, 26, 0) 70%)",
        }}
      />

      {/* 2. Warm Candlelight Accent Glow (Right of Hero) */}
      <div
        className="absolute top-20 right-[8%] w-[500px] h-[500px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(200, 169, 106, 0.12) 0%, rgba(200, 169, 106, 0) 70%)",
        }}
      />

      {/* 3. Mid-Page Left Spotlight (Behind Signature Dish / Four Pillars) */}
      <div
        className="absolute top-[32%] left-[5%] w-[750px] h-[750px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(19, 78, 67, 0.35) 0%, rgba(9, 37, 31, 0.18) 50%, rgba(7, 31, 26, 0) 75%)",
        }}
      />

      {/* 4. Floor Plan & Degustation Amber Spotlight */}
      <div
        className="absolute top-[55%] right-[10%] w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(200, 169, 106, 0.08) 0%, rgba(19, 78, 67, 0.2) 40%, rgba(7, 31, 26, 0) 70%)",
        }}
      />

      {/* 5. Lower Catalog & Bottom Spotlight (Behind Bottom Dishes) */}
      <div
        className="absolute bottom-40 right-[15%] w-[850px] h-[850px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(19, 78, 67, 0.38) 0%, rgba(9, 37, 31, 0.18) 50%, rgba(7, 31, 26, 0) 75%)",
        }}
      />

      {/* 6. Deep Dark Vignette Edges for Editorial Photography Mood */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 160px rgba(0, 0, 0, 0.7)",
        }}
      />
    </div>
  );
}
