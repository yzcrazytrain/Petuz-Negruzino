import { TRANSLATIONS } from '../game/i18n';
import type { Language, WeaponId } from '../game/types';

export function NegruzinoTitleLockup({ language }: { language: Language }) {
  const t = TRANSLATIONS[language];
  return (
    <svg
      viewBox="0 0 580 168"
      className="w-full max-w-[490px] h-auto select-none"
      role="img"
      aria-label={t.pageTitle}
    >
      {/* Weathered Soviet enamel street sign plate */}
      <rect
        x="4"
        y="8"
        width="572"
        height="114"
        rx="6"
        fill="#121822"
        stroke="#e8963a"
        strokeWidth="2.5"
      />
      <rect
        x="11"
        y="15"
        width="558"
        height="100"
        rx="3"
        fill="none"
        stroke="rgba(201,59,59,0.42)"
        strokeWidth="1.2"
      />
      {/* Corner bolt rivets */}
      <circle cx="23" cy="27" r="3.5" fill="#7c8794" />
      <circle cx="557" cy="27" r="3.5" fill="#7c8794" />
      <circle cx="23" cy="103" r="3.5" fill="#7c8794" />
      <circle cx="557" cy="103" r="3.5" fill="#7c8794" />

      {/* Subtle chromatic .EXE glitch ghost offset behind title */}
      <text
        x="293"
        y="83"
        textAnchor="middle"
        fill="#b81c1c"
        opacity="0.45"
        fontFamily="Oswald, Barlow Condensed, sans-serif"
        fontWeight="700"
        fontSize="62"
        letterSpacing="6"
      >
        {t.brandTitle}.EXE
      </text>

      {/* Main stenciled display title with blood-crimson .EXE tag */}
      <text
        x="290"
        y="82"
        textAnchor="middle"
        fill="#ece7dc"
        fontFamily="Oswald, Barlow Condensed, sans-serif"
        fontWeight="700"
        fontSize="62"
        letterSpacing="6"
      >
        <tspan fill="#ece7dc">{t.brandTitle}</tspan>
        <tspan fill="#e03232">.EXE</tspan>
      </text>

      {/* Subtle sodium/crimson horizon divider */}
      <line
        x1="18"
        y1="142"
        x2="82"
        y2="142"
        stroke="#e8963a"
        strokeWidth="2"
      />
      <text
        x="290"
        y="147"
        textAnchor="middle"
        fill="#e8963a"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        fontSize="12.5"
        letterSpacing="2.2"
      >
        {t.brandSubtitle}
      </text>
      <line
        x1="498"
        y1="142"
        x2="562"
        y2="142"
        stroke="#e8963a"
        strokeWidth="2"
      />
    </svg>
  );
}

export function RoosterCrestIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {/* Crimson comb */}
      <path
        d="M8.5 6.5C8.5 4.8 9.8 3.6 11 4.6C11.7 3.3 13.7 3.3 14.3 4.8C15.5 4.2 16.8 5.2 16.4 6.8L15.4 8.5H8.8L8.5 6.5Z"
        fill="#c93b3b"
        stroke="#0b0f17"
        strokeWidth="1.2"
      />
      {/* Head & neck */}
      <path
        d="M7.5 11.2C7.5 8.5 9.8 7 12.5 7C14.8 7 16.5 8.6 16.5 10.8C16.5 12.5 15.6 13.8 14.8 15L16.2 19.5H7.2L8.4 15.2C7.8 14.1 7.5 12.7 7.5 11.2Z"
        fill="#e8963a"
        stroke="#0b0f17"
        strokeWidth="1.2"
      />
      {/* Beak */}
      <path
        d="M16.2 9.8L20.5 11.2L16.1 12.6Z"
        fill="#f4c44e"
        stroke="#0b0f17"
        strokeWidth="1.1"
      />
      {/* Wattle */}
      <circle cx="15.8" cy="13.5" r="1.4" fill="#c93b3b" />
      {/* Eye */}
      <circle cx="13.4" cy="10.2" r="1.1" fill="#0b0f17" />
    </svg>
  );
}

export function WeaponSilhouetteIcon({
  weaponId,
  className = 'w-12 h-6',
}: {
  weaponId: WeaponId;
  className?: string;
}) {
  if (weaponId === 'shotgun') {
    return (
      <svg viewBox="0 0 64 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M4 16L13 11H29V9H58V11.5H45V13.5H31L26 15.5H17L10 19L4 16Z"
          fill="currentColor"
          stroke="#0b0f17"
          strokeWidth="1.2"
        />
        <rect x="33" y="11.5" width="11" height="3" fill="#e8963a" />
      </svg>
    );
  }
  if (weaponId === 'awp') {
    return (
      <svg viewBox="0 0 64 24" className={className} fill="none" aria-hidden="true">
        {/* Scope */}
        <rect x="21" y="4" width="16" height="3.2" rx="1" fill="#e8963a" />
        <rect x="25" y="7.2" width="2" height="2.4" fill="currentColor" />
        <rect x="32" y="7.2" width="2" height="2.4" fill="currentColor" />
        {/* Long barrel & thumbhole stock */}
        <path
          d="M3 14.5L13 10.5H38V9.5H61V11.6H38V14H28L25 18H21L22 14.5H14L7 18.5L3 14.5Z"
          fill="currentColor"
          stroke="#0b0f17"
          strokeWidth="1.1"
        />
      </svg>
    );
  }
  if (weaponId === 'pistol') {
    return (
      <svg viewBox="0 0 64 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M17 7H48V12.5H31L28 20H21L24 12.5H17V7Z"
          fill="currentColor"
          stroke="#0b0f17"
          strokeWidth="1.2"
        />
        <rect x="20" y="8.2" width="24" height="2" fill="#e8963a" />
      </svg>
    );
  }
  if (weaponId === 'minigun') {
    return (
      <svg viewBox="0 0 64 24" className={className} fill="none" aria-hidden="true">
        {/* Top carry handle */}
        <path d="M13 8V5H25V8" stroke="#e8963a" strokeWidth="2" />
        {/* Housing & drum */}
        <rect x="10" y="8" width="18" height="9" rx="1.5" fill="currentColor" />
        <rect x="15" y="16" width="9" height="5" rx="1" fill="#8e97a4" />
        {/* Multi-barrel cluster */}
        <rect x="28" y="9" width="32" height="2" fill="currentColor" />
        <rect x="28" y="12" width="32" height="2" fill="currentColor" />
        <rect x="28" y="15" width="32" height="2" fill="currentColor" />
        <rect x="40" y="8.5" width="3" height="9" fill="#e8963a" />
        <rect x="53" y="8.5" width="3" height="9" fill="#e8963a" />
      </svg>
    );
  }
  // P90
  return (
    <svg viewBox="0 0 64 24" className={className} fill="none" aria-hidden="true">
      <rect x="16" y="6.5" width="24" height="3" rx="0.8" fill="#e8963a" />
      <path
        d="M11 10H46L52 12.5H46V16.5H39L36 14H26L23 18H11V10Z"
        fill="currentColor"
        stroke="#0b0f17"
        strokeWidth="1.2"
      />
    </svg>
  );
}
