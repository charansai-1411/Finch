// Hand-built goldfinch, shared across the app (nav mark, loader, avatar).
export default function FinchGlyph({ className, style }) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="fg-body" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FFD64C" /><stop offset="1" stopColor="#F5960A" />
        </linearGradient>
        <linearGradient id="fg-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3C8" /><stop offset="1" stopColor="#FFD64C" />
        </linearGradient>
      </defs>
      <rect x="54" y="155" width="94" height="6" rx="3" fill="#2B2620" />
      <path d="M103 140 L103 156 M120 140 L120 156" stroke="#2B2620" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M79 120 C61 130 46 142 34 153 C41 157 49 155 55 149 C60 154 66 152 70 145 C74 138 78 129 79 120 Z" fill="#2B2620" />
      <ellipse cx="100" cy="112" rx="45" ry="34" fill="url(#fg-body)" transform="rotate(-16 100 112)" />
      <ellipse cx="116" cy="120" rx="16" ry="23" fill="url(#fg-belly)" opacity="0.75" transform="rotate(-16 116 120)" />
      <circle cx="134" cy="76" r="26" fill="url(#fg-body)" />
      <path d="M84 97 C104 85 128 89 141 103 C125 112 100 114 86 108 C81 105 81 101 84 97 Z" fill="#2B2620" />
      <path d="M95 104 L134 106" stroke="#FFF1D0" strokeWidth="3" strokeLinecap="round" opacity="0.92" />
      <path d="M96 111 L122 112" stroke="#645C51" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M111 68 C114 51 156 51 159 68 C150 60 120 60 111 68 Z" fill="#2B2620" />
      <path d="M158 71 L180 76 L158 81 Z" fill="#F0913A" />
      <path d="M158 76 L180 76" stroke="#C9701F" strokeWidth="1.5" />
      <circle cx="143" cy="75" r="4.6" fill="#1A1712" />
      <circle cx="144.6" cy="73.4" r="1.5" fill="#fff" />
    </svg>
  )
}
