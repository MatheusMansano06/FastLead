// Flat illustration of a passenger interacting with the site — scanning the
// tablet's QR with their phone. Light-on-blue so it reads on the QR section.
export default function Passenger({ className = '' }) {
  return (
    <svg viewBox="0 0 260 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Passageiro escaneando o anúncio">
      {/* soft halo */}
      <ellipse cx="120" cy="250" rx="110" ry="26" fill="#ffffff" opacity="0.12" />

      {/* scan beam toward the tablet (up-right) */}
      <g stroke="#00C98A" strokeWidth="3" strokeLinecap="round" opacity="0.9" className="animate-pulse">
        <line x1="196" y1="150" x2="248" y2="120" strokeDasharray="2 12" />
        <line x1="192" y1="168" x2="250" y2="150" strokeDasharray="2 12" />
        <line x1="196" y1="186" x2="248" y2="182" strokeDasharray="2 12" />
      </g>

      {/* body / shirt */}
      <path d="M56 320c0-52 26-92 66-92s66 40 66 92z" fill="#ffffff" />
      <path d="M56 320c0-52 26-92 66-92 8 0 16 1.6 23 4.6-30 6-52 44-52 87.4z" fill="#e6ebf5" />

      {/* neck */}
      <rect x="107" y="150" width="30" height="34" rx="12" fill="#e7ae86" />

      {/* head */}
      <circle cx="122" cy="120" r="40" fill="#f2c39a" />
      {/* hair */}
      <path d="M84 118c0-26 18-46 42-46s40 18 40 42c0 6-2 12-2 12-4-14-10-22-22-24-4 14-20 22-38 22-8 0-16-2-20-6z" fill="#12233f" />
      {/* face hint */}
      <circle cx="112" cy="120" r="3.4" fill="#2a2320" />
      <circle cx="140" cy="118" r="3.4" fill="#2a2320" />
      <path d="M118 136c4 4 12 4 16 0" stroke="#c98a63" strokeWidth="3" strokeLinecap="round" />

      {/* raised arm holding phone */}
      <path d="M150 214c14-6 34-20 44-34l20 14c-12 20-34 36-52 42z" fill="#2563FF" />
      <path d="M150 214c14-6 34-20 44-34l8 6c-14 16-32 28-44 34z" fill="#1c4fd0" />

      {/* phone */}
      <g transform="rotate(28 196 168)">
        <rect x="176" y="140" width="42" height="70" rx="9" fill="#0b0b12" />
        <rect x="181" y="150" width="32" height="50" rx="4" fill="#0B1D3A" />
        {/* mini QR on phone screen */}
        <g fill="#00C98A">
          <rect x="185" y="154" width="9" height="9" />
          <rect x="200" y="154" width="9" height="9" />
          <rect x="185" y="169" width="9" height="9" />
          <rect x="199" y="170" width="6" height="6" />
          <rect x="192" y="184" width="6" height="6" />
          <rect x="201" y="186" width="7" height="7" />
        </g>
      </g>
    </svg>
  );
}
