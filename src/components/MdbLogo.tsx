export default function MdbLogo({
  className = 'h-9 w-auto',
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  if (markOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 88 88"
        className={className}
        fill="none"
        aria-label="MDB Mech Toolbox Emblem"
      >
        <path
          fill="#FD924C"
          d="
            M 44, 2
            L 86, 24
            L 86, 64
            L 54, 82
            L 54, 65.5
            C 54, 62 67, 59 67, 57
            L 67, 31.5
            L 55.5, 31.5
            L 55.5, 46.5
            L 44, 54
            L 32.5, 46.5
            L 32.5, 31.5
            L 21, 31.5
            L 21, 57
            C 21, 59 34, 62 34, 65.5
            L 34, 82
            L 2, 64
            L 2, 24
            Z
          "
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 310 88"
      className={className}
      fill="none"
      aria-label="MDB Mech Toolbox"
    >
      {/* Hexagon with Wrench Cutout Icon */}
      <g transform="translate(1, 0)">
        <path
          fill="#FD924C"
          d="
            M 44, 2
            L 86, 24
            L 86, 64
            L 54, 82
            L 54, 65.5
            C 54, 62 67, 59 67, 57
            L 67, 31.5
            L 55.5, 31.5
            L 55.5, 46.5
            L 44, 54
            L 32.5, 46.5
            L 32.5, 31.5
            L 21, 31.5
            L 21, 57
            C 21, 59 34, 62 34, 65.5
            L 34, 82
            L 2, 64
            L 2, 24
            Z
          "
        />
      </g>

      {/* Typography: MDB MECH & TOOLBOX */}
      <g transform="translate(100, 0)">
        <text
          x="0"
          y="47"
          className="mdb-logo-title"
          style={{
            fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            fontSize: '33px',
            letterSpacing: '0.4px',
          }}
        >
          MDB MECH
        </text>
        <text
          x="4"
          y="73"
          className="mdb-logo-sub"
          fill="#FD924C"
          style={{
            fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
            fontWeight: 800,
            fontStyle: 'italic',
            fontSize: '15px',
            letterSpacing: '0.33em',
          }}
        >
          TOOLBOX
        </text>
      </g>
    </svg>
  );
}
