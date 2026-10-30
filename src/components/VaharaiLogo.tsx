import React from 'react';

interface VaharaiLogoProps {
  className?: string;
  size?: number;
}

export const VaharaiLogo: React.FC<VaharaiLogoProps> = ({ className = 'w-10 h-10', size = 80 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      aria-label="Divisional Secretariat Vakarai Logo"
    >
      <defs>
        {/* Circular text paths for authentic curved placement */}
        {/* Top Arc for English & Sinhala */}
        <path id="topArcText" d="M 60,200 A 140,140 0 1,1 340,200" fill="none" />
        {/* Bottom Arc for Tamil */}
        <path id="bottomArcText" d="M 60,200 A 140,140 0 0,0 340,200" fill="none" />
      </defs>

      {/* Outer Circle Ring */}
      <circle cx="200" cy="200" r="192" fill="#ffffff" stroke="#111827" strokeWidth="8" />
      <circle cx="200" cy="200" r="184" fill="#ffffff" stroke="#111827" strokeWidth="2" />

      {/* Inner Boundary Circle */}
      <circle cx="200" cy="200" r="136" fill="#ffffff" stroke="#111827" strokeWidth="3" />

      {/* Ring Circular Typography matching the official seal */}
      {/* English: Divisional Secretariat, Vakarai */}
      <text
        fontFamily="sans-serif, Arial"
        fontSize="17.5"
        fontWeight="800"
        fill="#111827"
        letterSpacing="0.5"
      >
        <textPath href="#topArcText" startOffset="3%" textAnchor="start">
          Divisional Secretariat, Vakarai.
        </textPath>
      </text>

      {/* Sinhala: ප්‍රාදේශීය ලේකම් කාර්යාලය, වාකරේ. */}
      <text
        fontFamily="sans-serif, Arial"
        fontSize="16"
        fontWeight="800"
        fill="#111827"
        letterSpacing="0.2"
      >
        <textPath href="#topArcText" startOffset="97%" textAnchor="end">
          ප්‍රාදේශීය ලේකම් කාර්යාලය, වාකරේ.
        </textPath>
      </text>

      {/* Tamil: பிரதேச செயலகம், வாகரை. */}
      <text
        fontFamily="sans-serif, Arial"
        fontSize="19"
        fontWeight="900"
        fill="#111827"
        letterSpacing="1"
      >
        <textPath href="#bottomArcText" startOffset="50%" textAnchor="middle">
          பிரதேச செயலகம், வாகரை.
        </textPath>
      </text>

      {/* ================= CENTER EMBLEM ================= */}

      {/* Green Shady Tree at the top */}
      <g id="tree" transform="translate(200, 120)">
        {/* Trunk & Branches */}
        <path
          d="M -7,22 L -5,-5 L -10,-15 L -6,-15 L -3,-6 L 3,-6 L 6,-15 L 10,-15 L 5,-5 L 7,22 Z"
          fill="#8B5A2B"
        />
        {/* Roots */}
        <path d="M -7,22 Q -15,25 -20,28 L -5,24 L 0,23 L 5,24 Q 15,25 20,28 L 7,22 Z" fill="#704214" />
        {/* Foliage Canopy */}
        <circle cx="0" cy="-28" r="28" fill="#2E7D32" />
        <circle cx="-22" cy="-20" r="20" fill="#388E3C" />
        <circle cx="22" cy="-20" r="20" fill="#388E3C" />
        <circle cx="-14" cy="-35" r="18" fill="#4CAF50" />
        <circle cx="14" cy="-35" r="18" fill="#4CAF50" />
        <circle cx="0" cy="-42" r="18" fill="#66BB6A" />
      </g>

      {/* Golden Paddy / Wheat Sheaves on Left & Right */}
      {/* Left Paddy Wreath */}
      <g id="leftPaddy" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.8">
        <path d="M 106,230 Q 94,185 118,140" fill="none" stroke="#CA8A04" strokeWidth="2.5" />
        {/* Left grains */}
        <ellipse cx="106" cy="220" rx="9" ry="5" transform="rotate(-30 106 220)" />
        <ellipse cx="101" cy="202" rx="10" ry="5.5" transform="rotate(-40 101 202)" />
        <ellipse cx="98" cy="184" rx="10.5" ry="5.5" transform="rotate(-50 98 184)" />
        <ellipse cx="100" cy="166" rx="10.5" ry="5.5" transform="rotate(-60 100 166)" />
        <ellipse cx="107" cy="150" rx="10" ry="5.5" transform="rotate(-70 107 150)" />
        <ellipse cx="118" cy="138" rx="9" ry="5" transform="rotate(-80 118 138)" />
        {/* Inner grains */}
        <ellipse cx="116" cy="214" rx="8" ry="4.5" transform="rotate(10 116 214)" />
        <ellipse cx="112" cy="196" rx="9" ry="5" transform="rotate(5 112 196)" />
        <ellipse cx="111" cy="178" rx="9.5" ry="5" transform="rotate(0 111 178)" />
        <ellipse cx="114" cy="160" rx="9.5" ry="5" transform="rotate(-15 114 160)" />
        <ellipse cx="122" cy="146" rx="8.5" ry="4.5" transform="rotate(-30 122 146)" />
      </g>

      {/* Right Paddy Wreath */}
      <g id="rightPaddy" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.8">
        <path d="M 294,230 Q 306,185 282,140" fill="none" stroke="#CA8A04" strokeWidth="2.5" />
        {/* Right outer grains */}
        <ellipse cx="294" cy="220" rx="9" ry="5" transform="rotate(30 294 220)" />
        <ellipse cx="299" cy="202" rx="10" ry="5.5" transform="rotate(40 299 202)" />
        <ellipse cx="302" cy="184" rx="10.5" ry="5.5" transform="rotate(50 302 184)" />
        <ellipse cx="300" cy="166" rx="10.5" ry="5.5" transform="rotate(60 300 166)" />
        <ellipse cx="293" cy="150" rx="10" ry="5.5" transform="rotate(70 293 150)" />
        <ellipse cx="282" cy="138" rx="9" ry="5" transform="rotate(80 282 138)" />
        {/* Inner grains */}
        <ellipse cx="284" cy="214" rx="8" ry="4.5" transform="rotate(-10 284 214)" />
        <ellipse cx="288" cy="196" rx="9" ry="5" transform="rotate(-5 288 196)" />
        <ellipse cx="289" cy="178" rx="9.5" ry="5" transform="rotate(0 289 178)" />
        <ellipse cx="286" cy="160" rx="9.5" ry="5" transform="rotate(15 286 160)" />
        <ellipse cx="278" cy="146" rx="8.5" ry="4.5" transform="rotate(30 278 146)" />
      </g>

      {/* Warrior on Galloping Horse Silhouette (Pandara Vanniyan / Vaharai Hero) */}
      <g id="warriorHorse" fill="#111827">
        {/* Horse Body, Neck and Head */}
        <path d="M 185,210 Q 170,200 155,206 Q 140,212 135,225 Q 145,232 160,230 Q 180,228 195,245 Q 210,250 225,240 Q 235,230 240,215 Q 235,195 210,195 Q 195,195 185,210 Z" />
        {/* Horse Head & Ears */}
        <path d="M 225,195 Q 235,178 244,178 Q 248,185 240,198 Q 242,192 245,188 Q 246,192 242,204 Q 235,212 225,212 Z" />
        {/* Horse Front Legs Galloping High */}
        <path d="M 230,225 Q 245,235 255,230 Q 260,225 256,220 Q 248,220 236,215 Z" />
        <path d="M 226,230 Q 238,245 248,252 Q 252,250 248,245 Q 238,238 230,222 Z" />
        {/* Horse Back Legs Powering Forward */}
        <path d="M 148,225 Q 138,240 142,258 Q 145,268 152,272 Q 155,268 150,258 Q 148,245 158,235 Z" />
        <path d="M 165,232 Q 160,252 168,274 Q 173,280 176,275 Q 172,260 172,245 Z" />
        {/* Flowing Tail */}
        <path d="M 140,212 Q 120,215 110,230 Q 105,242 115,240 Q 125,230 138,222 Z" />

        {/* Warrior Silhouette Riding Horse */}
        {/* Torso & Head */}
        <circle cx="188" cy="172" r="11" />
        {/* Flowing Hair */}
        <path d="M 182,170 Q 170,172 165,182 Q 175,180 182,176 Z" />
        {/* Body & Arms */}
        <path d="M 180,182 Q 175,198 182,212 Q 192,212 196,198 Q 196,185 188,182 Z" />
        {/* Raised Arm Holding Sword Upwards */}
        <path d="M 182,185 L 160,195 L 148,172 Q 146,168 152,168 L 164,188 Z" />
        {/* Sword Blade */}
        <path d="M 148,172 L 130,138 Q 132,135 136,138 L 152,170 Z" fill="#111827" stroke="#111827" strokeWidth="1" />
      </g>

      {/* Two Blue Fish (Representing Vaharai's coastal & lagoon fisheries) */}
      {/* Left Fish (Curving Upwards towards paddy) */}
      <g id="leftFish" transform="translate(110, 290) rotate(15)">
        {/* Fish Body */}
        <path
          d="M -35,5 Q -10,-18 20,-15 Q 38,-10 45,5 Q 38,20 20,22 Q -10,24 -35,5 Z"
          fill="#E0F2FE"
          stroke="#0284C7"
          strokeWidth="3.5"
        />
        {/* Tail Fin */}
        <path
          d="M -35,5 L -52,-10 Q -45,5 -52,18 Z"
          fill="#BAE6FD"
          stroke="#0284C7"
          strokeWidth="3"
        />
        {/* Dorsal Fin */}
        <path d="M -5,-16 Q 8,-28 18,-15 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="2" />
        {/* Eye */}
        <circle cx="34" cy="-2" r="3" fill="#0369A1" />
        {/* Mouth Whiskers/Details */}
        <path d="M 45,5 Q 52,10 50,15" stroke="#0284C7" strokeWidth="2.5" fill="none" />
      </g>

      {/* Right Fish (Symmetrical counterpart) */}
      <g id="rightFish" transform="translate(290, 290) scale(-1, 1) rotate(15)">
        {/* Fish Body */}
        <path
          d="M -35,5 Q -10,-18 20,-15 Q 38,-10 45,5 Q 38,20 20,22 Q -10,24 -35,5 Z"
          fill="#E0F2FE"
          stroke="#0284C7"
          strokeWidth="3.5"
        />
        {/* Tail Fin */}
        <path
          d="M -35,5 L -52,-10 Q -45,5 -52,18 Z"
          fill="#BAE6FD"
          stroke="#0284C7"
          strokeWidth="3"
        />
        {/* Dorsal Fin */}
        <path d="M -5,-16 Q 8,-28 18,-15 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="2" />
        {/* Eye */}
        <circle cx="34" cy="-2" r="3" fill="#0369A1" />
        {/* Mouth Whiskers/Details */}
        <path d="M 45,5 Q 52,10 50,15" stroke="#0284C7" strokeWidth="2.5" fill="none" />
      </g>
    </svg>
  );
};
