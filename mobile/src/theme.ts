// Theme colors for the app
export const colors = {
  // Primary colors
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818cf8',

  // Background colors
  background: '#1a1a2e',
  backgroundLight: '#16213e',
  surface: '#0f3460',
  surfaceLight: '#1a1a2e',

  // Text colors
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Priority colors
  priorityHigh: '#ef4444',
  priorityMedium: '#f59e0b',
  priorityLow: '#10b981',

  // Status ticket colors
  statusOpen: '#3b82f6',
  statusPending: '#f59e0b',
  statusResolved: '#10b981',
  statusClosed: '#64748b',

  // Other
  border: '#334155',
  divider: '#1e293b',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Legacy compatibility
  white: '#ffffff',
  black: '#000000',
  gray: '#64748b',
  lightGray: '#94a3b8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

