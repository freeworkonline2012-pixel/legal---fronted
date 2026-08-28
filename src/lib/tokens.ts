/**
 * مرآة TypeScript موقّعة لتوكينز التصميم.
 *
 * ⚠️ المصدر الوحيد للحقيقة: docs/design/ui/design_tokens.json
 * لا تُعدّل القيم يدوياً هنا — تحقَّق من عدم الانحراف عبر:
 *   npm run validate:tokens
 * (سكربت scripts/sync_frontend_tokens.mjs يتحقق أن كل hex مستخدم هنا موجود في ملف JSON المصدر)
 */

import type { DomainKey } from './types';

export type LegalStatusKey = 'active' | 'amended' | 'repealed';
export type ConfidenceKey = 'high' | 'medium' | 'low';
// DomainKey يُستورَد الآن من types.ts بدل إعادة تعريفه هنا — كان هذا الملف
// يحمل نسخة مكرَّرة يدوية (علّق عليها بـ"مطابقة حرفية" فقط، بلا فرض نوعى فعلى)
// أُبقيت متزامنة بالصدفة مع insurance/aml_cft، لكنها نفس فجوة النوع (type
// safety gap) المُوثَّقة فى domain-key.ts بالباك إند — إصلاح جذرى: مصدر واحد
// للحقيقة عبر import بدل نسخة ثانية يمكن أن تُنسى فى أى إضافة قادمة.
export type { DomainKey };

export interface ColorToken {
  fg: string;
  bg: string;
  border: string;
}

export interface SemanticPalette {
  background: string;
  surface: string;
  surface_muted: string;
  surface_inset: string;
  border_default: string;
  border_strong: string;
  text_primary: string;
  text_secondary: string;
  text_tertiary: string;
  text_on_primary: string;
  primary: string;
  primary_hover: string;
  primary_active: string;
  primary_soft: string;
  primary_border: string;
  secondary: string;
  success: string;
  success_soft: string;
  warning: string;
  warning_soft: string;
  error: string;
  error_soft: string;
  info: string;
  focus_ring: string;
  disabled_bg: string;
  disabled_text: string;
  link: string;
  link_visited: string;
  overlay: string;
}

export const semanticLight: SemanticPalette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surface_muted: '#F4F6FA',
  surface_inset: '#E8EDF4',
  border_default: '#D5DCE6',
  border_strong: '#8A9099',
  text_primary: '#1A1A1A',
  text_secondary: '#525252',
  text_tertiary: '#6B7078',
  text_on_primary: '#FFFFFF',
  primary: '#14539A',
  primary_hover: '#0F3A6E',
  primary_active: '#0C2D52',
  primary_soft: '#EFF5FC',
  primary_border: '#2E7FD6',
  secondary: '#0F3A6E',
  success: '#1E7A3C',
  success_soft: '#DCF3E4',
  warning: '#8A6D00',
  warning_soft: '#F7EFD0',
  error: '#B3261E',
  error_soft: '#FBE3E1',
  info: '#14539A',
  focus_ring: '#14539A',
  disabled_bg: '#E8EDF4',
  disabled_text: '#8A9099',
  link: '#14539A',
  link_visited: '#0F3A6E',
  overlay: 'rgba(12,45,82,0.45)',
};

export const semanticDark: SemanticPalette = {
  background: '#0F1720',
  surface: '#17222E',
  surface_muted: '#1F2C3A',
  surface_inset: '#243243',
  border_default: '#2E3E50',
  border_strong: '#4A5A70',
  text_primary: '#E8EDF4',
  text_secondary: '#C3CCD9',
  text_tertiary: '#9AA7B8',
  text_on_primary: '#0C2D52',
  primary: '#7FB3E8',
  primary_hover: '#9CC6F0',
  primary_active: '#5E9BD4',
  primary_soft: '#1F2C3A',
  primary_border: '#5E9BD4',
  secondary: '#9CC6F0',
  success: '#4CC38A',
  success_soft: '#1C3A2B',
  warning: '#D4A84F',
  warning_soft: '#3A3217',
  error: '#F08A84',
  error_soft: '#3E2220',
  info: '#7FB3E8',
  focus_ring: '#7FB3E8',
  disabled_bg: '#243243',
  disabled_text: '#6B7686',
  link: '#9CC6F0',
  link_visited: '#C3CCD9',
  overlay: 'rgba(0,0,0,0.6)',
};

export const legalStatusTokens: Record<
  LegalStatusKey,
  { label: string; icon: string; light: ColorToken; dark: ColorToken }
> = {
  active: {
    label: 'سارية',
    icon: 'circle-check',
    light: { fg: '#1E7A3C', bg: '#DCF3E4', border: '#2E9E54' },
    dark: { fg: '#4CC38A', bg: '#1C3A2B', border: '#4CC38A' },
  },
  amended: {
    label: 'معدّلة',
    icon: 'pencil',
    light: { fg: '#8A6D00', bg: '#F7EFD0', border: '#A67C00' },
    dark: { fg: '#D4A84F', bg: '#3A3217', border: '#D4A84F' },
  },
  repealed: {
    label: 'ملغاة',
    icon: 'ban',
    light: { fg: '#B3261E', bg: '#FBE3E1', border: '#B3261E' },
    dark: { fg: '#F08A84', bg: '#3E2220', border: '#F08A84' },
  },
};

export const confidenceTokens: Record<
  ConfidenceKey,
  { label: string; icon: string; threshold: string; light: ColorToken; dark: ColorToken }
> = {
  high: {
    label: 'ثقة عالية',
    icon: 'shield-check',
    threshold: '>= 0.85',
    light: { fg: '#1E7A3C', bg: '#DCF3E4', border: '#2E9E54' },
    dark: { fg: '#4CC38A', bg: '#1C3A2B', border: '#4CC38A' },
  },
  medium: {
    label: 'ثقة متوسطة',
    icon: 'shield-alert',
    threshold: '0.60 - 0.84',
    light: { fg: '#8A6D00', bg: '#F7EFD0', border: '#A67C00' },
    dark: { fg: '#D4A84F', bg: '#3A3217', border: '#D4A84F' },
  },
  low: {
    label: 'ثقة منخفضة',
    icon: 'shield-x',
    threshold: '< 0.60',
    light: { fg: '#B3261E', bg: '#FBE3E1', border: '#B3261E' },
    dark: { fg: '#F08A84', bg: '#3E2220', border: '#F08A84' },
  },
};

export const domainChipTokens: Record<
  DomainKey,
  { label: string; icon: string; light_fg: string; light_bg: string }
> = {
  labor: { label: 'قانون العمل', icon: 'briefcase', light_fg: '#0F3A6E', light_bg: '#EFF5FC' },
  rent: { label: 'الإيجارات', icon: 'home', light_fg: '#1E7A3C', light_bg: '#DCF3E4' },
  personal_status: { label: 'الأحوال الشخصية', icon: 'users', light_fg: '#8A6D00', light_bg: '#F7EFD0' },
  traffic: { label: 'قانون المرور', icon: 'car', light_fg: '#B3261E', light_bg: '#FBE3E1' },
  consumer_protection: { label: 'حماية المستهلك', icon: 'receipt', light_fg: '#6B7078', light_bg: '#E8EDF4' },
  insurance: { label: 'التأمين والرقابة المالية', icon: 'shield-check', light_fg: '#14539A', light_bg: '#EFF5FC' },
  aml_cft: { label: 'مكافحة غسل الأموال', icon: 'shield-alert', light_fg: '#0C2D52', light_bg: '#E8EDF4' },
  legal_profession: { label: 'مهنة المحاماة', icon: 'scale', light_fg: '#5B3A8E', light_bg: '#F1EAFB' },
  other: { label: 'أخرى', icon: 'file-text', light_fg: '#525252', light_bg: '#F4F6FA' },
};

/**
 * تسمية حالة نفاذ القانون (LawStatusKey) — منفصلة عن legalStatusTokens (مستوى
 * المادة) لأن مفردات backend مختلفة عمداً (in_force وليس active). نفس قيم
 * الألوان لكل من amended/repealed (تطابق مفهومياً حالة المادة المعدّلة/الملغاة).
 */
export const lawStatusTokens: Record<
  'in_force' | 'amended' | 'repealed',
  { label: string; icon: string; light: ColorToken; dark: ColorToken }
> = {
  in_force: {
    label: 'سارٍ',
    icon: 'circle-check',
    light: { fg: '#1E7A3C', bg: '#DCF3E4', border: '#2E9E54' },
    dark: { fg: '#4CC38A', bg: '#1C3A2B', border: '#4CC38A' },
  },
  amended: {
    label: 'معدّل',
    icon: 'pencil',
    light: { fg: '#8A6D00', bg: '#F7EFD0', border: '#A67C00' },
    dark: { fg: '#D4A84F', bg: '#3A3217', border: '#D4A84F' },
  },
  repealed: {
    label: 'ملغى',
    icon: 'ban',
    light: { fg: '#B3261E', bg: '#FBE3E1', border: '#B3261E' },
    dark: { fg: '#F08A84', bg: '#3E2220', border: '#F08A84' },
  },
};

export const typography = {
  families: {
    ui: ['IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', 'Tahoma', 'sans-serif'],
    legal: ['Noto Naskh Arabic', 'Amiri', 'Serif', 'serif'],
  },
  scale: {
    display: 40,
    h1: 32,
    h2: 24,
    h3: 20,
    h4: 18,
    body_lg: 18,
    body: 16,
    body_sm: 14,
    caption: 12,
    legal_text: 17,
  },
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

export const spacingScale = [0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96] as const;

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(12,45,82,0.06)',
  md: '0 2px 8px rgba(12,45,82,0.08)',
  lg: '0 4px 16px rgba(12,45,82,0.12)',
  xl: '0 8px 32px rgba(12,45,82,0.16)',
  'focus-ring-light': '0 0 0 3px rgba(20,83,154,0.28)',
  'focus-ring-dark': '0 0 0 3px rgba(127,179,232,0.35)',
} as const;

export const zIndex = {
  stickyHeader: 100,
  dropdown: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
} as const;

export const breakpoints = {
  mobile: '320px - 639px',
  tablet: '640px - 1023px',
  desktop: '1024px - 1439px',
  wide: '1440px - 2559px',
  '4k': '2560px+',
} as const;

export const motion = {
  durations: { fast: '120ms', base: '200ms', slow: '320ms', page_transition: '200ms' },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    exit: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },
} as const;

export const disclaimerText =
  'المحتوى المعروض معلومة قانونية موثّقة بالمصدر، وليس استشارة قانونية. للقضايا الجوهرية يُنصح بمراجعة محامٍ.';
