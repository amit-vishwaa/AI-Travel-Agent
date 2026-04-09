export default function AeroMindLogo({ className = 'w-9 h-9', withWordmark = true, theme = 'default' }) {
  const labelClass =
    theme === 'light'
      ? 'text-white'
      : 'text-slate-900 dark:text-white'

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="aeromindGradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="24" fill="url(#aeromindGradient)" opacity="0.14" />
        <circle cx="32" cy="32" r="17" stroke="url(#aeromindGradient)" strokeWidth="3" />
        <path d="M19 32h26M32 15c5 4 7 10 7 17s-2 13-7 17c-5-4-7-10-7-17s2-13 7-17Z" stroke="url(#aeromindGradient)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14 26 36 31 47 22l3 2-8 10 8 6-2 3-11-4-9 10-3-1 4-12-12-6 2-3Z" fill="url(#aeromindGradient)" />
        <path d="M43 13a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" fill="#0f172a" opacity="0.92" />
        <path d="M40 20h6M43 17v6M39.5 16.5l2.4 2.4M46.1 16.5l-2.4 2.4" stroke="#ecfeff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {withWordmark && (
        <div className={labelClass}>
          <div className="font-['Space_Grotesk'] text-lg font-bold leading-none">AI Travel Agent</div>
          <div className="text-[11px] uppercase tracking-[0.24em] opacity-70">Travel Planner</div>
        </div>
      )}
    </div>
  )
}
