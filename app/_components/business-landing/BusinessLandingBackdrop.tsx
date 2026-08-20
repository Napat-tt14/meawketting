import { PawPrint } from "../icons";

export function BusinessLandingBackdrop() {
  return (
    <div className="business-landing-backdrop" aria-hidden="true">
      {/* Decorative Vector Contour Lines & Modern Tech Mesh */}
      <svg
        className="business-landing-backdrop__lines"
        viewBox="0 0 1440 3200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bg-line-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-meaw-yellow-400)" stopOpacity="0.16" />
            <stop offset="50%" stopColor="var(--color-meaw-yellow-300)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--color-meaw-rose-300)" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="bg-line-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-meaw-yellow-300)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--color-meaw-mint-300)" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Elegant Flowing Curves throughout the page */}
        <path
          d="M-100,280 C320,160 540,480 960,340 C1280,240 1420,420 1560,360"
          stroke="url(#bg-line-grad-1)"
          strokeWidth="2"
          strokeDasharray="8 8"
          className="business-backdrop-wave business-backdrop-wave--1"
        />
        <path
          d="M-80,720 C280,880 620,680 1020,820 C1320,920 1480,760 1580,840"
          stroke="url(#bg-line-grad-2)"
          strokeWidth="1.5"
          className="business-backdrop-wave business-backdrop-wave--2"
        />
        <path
          d="M-120,1450 C380,1320 740,1600 1140,1460 C1380,1380 1490,1520 1590,1480"
          stroke="url(#bg-line-grad-1)"
          strokeWidth="2"
          strokeDasharray="6 6"
          className="business-backdrop-wave business-backdrop-wave--3"
        />
        <path
          d="M-90,2180 C340,2320 680,2100 1080,2240 C1360,2340 1470,2200 1580,2260"
          stroke="url(#bg-line-grad-2)"
          strokeWidth="1.5"
          className="business-backdrop-wave business-backdrop-wave--4"
        />
      </svg>

      {/* Floating Ambient Golden Paw Prints (Minimal Theme Accent) */}
      <div className="business-backdrop-paw business-backdrop-paw--1">
        <PawPrint size={72} />
      </div>
      <div className="business-backdrop-paw business-backdrop-paw--2">
        <PawPrint size={56} />
      </div>
      <div className="business-backdrop-paw business-backdrop-paw--3">
        <PawPrint size={80} />
      </div>
      <div className="business-backdrop-paw business-backdrop-paw--4">
        <PawPrint size={64} />
      </div>

      {/* Floating Ambient Glowing Mesh Orbs */}
      <div className="business-backdrop-orb business-backdrop-orb--top" />
      <div className="business-backdrop-orb business-backdrop-orb--mid" />
      <div className="business-backdrop-orb business-backdrop-orb--bottom" />
    </div>
  );
}
