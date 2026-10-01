// Inline SVG illustration: animated bus on a road with location pin and ticket.
export default function BusArt({ className = "" }) {
  return (
    <svg viewBox="0 0 480 300" className={className} role="img" aria-label="Bus on the road">
      {/* soft background blobs */}
      <circle cx="240" cy="140" r="130" fill="#fee2e2" />
      <circle cx="400" cy="60" r="34" fill="#fecaca" opacity="0.6" />

      {/* clouds */}
      <g fill="#ffffff">
        <ellipse cx="90" cy="70" rx="34" ry="12" />
        <ellipse cx="112" cy="62" rx="22" ry="12" />
        <ellipse cx="380" cy="130" rx="30" ry="10" />
        <ellipse cx="398" cy="123" rx="18" ry="10" />
      </g>

      {/* location pin */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2s" repeatCount="indefinite" />
        <path d="M400 30c-16 0-28 12-28 28 0 21 28 46 28 46s28-25 28-46c0-16-12-28-28-28z" fill="#dc2626" />
        <circle cx="400" cy="58" r="10" fill="#ffffff" />
      </g>

      {/* ticket */}
      <g transform="translate(34 150) rotate(-10)">
        <rect width="86" height="44" rx="8" fill="#ffffff" stroke="#dc2626" strokeWidth="2" />
        <circle cx="0" cy="22" r="7" fill="#fee2e2" />
        <circle cx="86" cy="22" r="7" fill="#fee2e2" />
        <line x1="58" y1="6" x2="58" y2="38" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 4" />
        <rect x="12" y="12" width="36" height="6" rx="3" fill="#dc2626" />
        <rect x="12" y="24" width="26" height="6" rx="3" fill="#fca5a5" />
        <path d="M66 14l6 6 10-10" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* road */}
      <rect x="0" y="238" width="480" height="62" fill="#374151" />
      <line x1="0" y1="270" x2="480" y2="270" stroke="#f9fafb" strokeWidth="4" strokeDasharray="28 22">
        <animate attributeName="stroke-dashoffset" values="0;-50" dur="0.8s" repeatCount="indefinite" />
      </line>

      {/* bus */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="0.7s" repeatCount="indefinite" />
        <rect x="100" y="112" width="290" height="116" rx="20" fill="#dc2626" />
        <rect x="100" y="188" width="290" height="10" fill="#ffffff" opacity="0.9" />
        <rect x="100" y="200" width="290" height="28" rx="0" fill="#b91c1c" />
        {/* windows */}
        <g fill="#e0f2fe" stroke="#ffffff" strokeWidth="3">
          <rect x="118" y="128" width="46" height="44" rx="8" />
          <rect x="172" y="128" width="46" height="44" rx="8" />
          <rect x="226" y="128" width="46" height="44" rx="8" />
          <rect x="280" y="128" width="46" height="44" rx="8" />
        </g>
        {/* windshield */}
        <path d="M338 128h28a14 14 0 0 1 14 14v30h-42z" fill="#e0f2fe" stroke="#ffffff" strokeWidth="3" />
        {/* label */}
        <rect x="170" y="206" width="110" height="16" rx="8" fill="#ffffff" />
        <text x="225" y="218" textAnchor="middle" fontSize="11" fontWeight="700" fill="#b91c1c" fontFamily="sans-serif">REDLINE EXPRESS</text>
        {/* lights */}
        <rect x="384" y="196" width="10" height="14" rx="4" fill="#fde68a" />
        <rect x="96" y="196" width="8" height="14" rx="3" fill="#fca5a5" />
        {/* wheels */}
        <g>
          <circle cx="160" cy="230" r="24" fill="#111827" />
          <circle cx="160" cy="230" r="11" fill="#e5e7eb" />
          <line x1="160" y1="219" x2="160" y2="241" stroke="#6b7280" strokeWidth="3">
            <animateTransform attributeName="transform" type="rotate" from="0 160 230" to="360 160 230" dur="0.6s" repeatCount="indefinite" />
          </line>
          <circle cx="330" cy="230" r="24" fill="#111827" />
          <circle cx="330" cy="230" r="11" fill="#e5e7eb" />
          <line x1="330" y1="219" x2="330" y2="241" stroke="#6b7280" strokeWidth="3">
            <animateTransform attributeName="transform" type="rotate" from="0 330 230" to="360 330 230" dur="0.6s" repeatCount="indefinite" />
          </line>
        </g>
      </g>
    </svg>
  );
}