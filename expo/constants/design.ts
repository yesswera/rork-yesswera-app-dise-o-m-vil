/**
 * YESSWERA Design System — "Vecino Amigo"
 * Based on Stitch audit + Rork architecture
 *
 * Philosophy: "El Vecino Confiable" — warm, local, trustworthy
 * Rules:
 *   - Touch targets: 56px minimum
 *   - Font minimum: 16px body, 22px headings
 *   - Icons ALWAYS paired with text
 *   - One action per screen
 *   - Border radius: 16px on cards, 18px on buttons
 */

export const DS = {
  // Colors
  colors: {
    // Primary
    green: '#16A34A',
    greenLight: 'rgba(22, 163, 74, 0.12)',
    greenDark: '#15803D',

    // Accent
    orange: '#EA580C',
    orangeLight: 'rgba(234, 88, 12, 0.12)',

    // Info
    blue: '#2563EB',
    blueLight: 'rgba(37, 99, 235, 0.12)',

    // Danger
    red: '#EF4444',
    redLight: 'rgba(239, 68, 68, 0.10)',

    // Surfaces
    bg: '#FAFAF9',
    card: '#FFFFFF',
    cardPressed: '#F5F5F4',

    // Text
    dark: '#1C1917',
    body: '#44403C',
    muted: '#78716C',
    placeholder: '#A8A29E',

    // Borders
    hairline: '#E7E5E4',
    divider: '#F5F5F4',

    // Overlays
    shadow: 'rgba(0, 0, 0, 0.06)',
    shadowStrong: 'rgba(0, 0, 0, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Typography (sizes only — fonts loaded via expo)
  fonts: {
    // Headings — bold, clear
    hero: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
    title: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
    section: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },

    // Body — readable
    bodyLg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 26 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodyMed: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },

    // Labels
    label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
    small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    tiny: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },

    // Buttons
    button: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  },

  // Spacing
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
    xxl: 22,
    full: 9999,
  },

  // Touch targets
  touch: {
    min: 56,
    button: 60,
    card: 102,
  },

  // Shadows
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 6,
    },
    float: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
  },
} as const;

// Helper: color shadow for buttons
export function colorShadow(color: string, opacity = 0.3) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: opacity,
    shadowRadius: 14,
    elevation: 6,
  };
}
