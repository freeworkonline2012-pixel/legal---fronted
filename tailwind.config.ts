import type { Config } from 'tailwindcss';

/**
 * إعداد Tailwind مبني على توكينز التصميم.
 * القيم تُقرأ من متغيرات CSS المعرّفة في src/app/globals.css
 * (المصدر الوحيد للقيم: docs/design/ui/design_tokens.json — لا تُعدَّل hex يدوياً هنا).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-inset': 'var(--color-surface-inset)',
        'border-default': 'var(--color-border-default)',
        'border-strong': 'var(--color-border-strong)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'text-on-primary': 'var(--color-text-on-primary)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-active': 'var(--color-primary-active)',
        'primary-soft': 'var(--color-primary-soft)',
        'primary-border': 'var(--color-primary-border)',
        secondary: 'var(--color-secondary)',
        success: 'var(--color-success)',
        'success-soft': 'var(--color-success-soft)',
        warning: 'var(--color-warning)',
        'warning-soft': 'var(--color-warning-soft)',
        error: 'var(--color-error)',
        'error-soft': 'var(--color-error-soft)',
        info: 'var(--color-info)',
        'disabled-bg': 'var(--color-disabled-bg)',
        'disabled-text': 'var(--color-disabled-text)',
        link: 'var(--color-link)',
        'link-visited': 'var(--color-link-visited)',
        overlay: 'var(--color-overlay)',
      },
      fontFamily: {
        ui: ['var(--font-ui)'],
        legal: ['var(--font-legal)'],
      },
      fontSize: {
        display: ['40px', { lineHeight: '1.25', fontWeight: '700' }],
        h1: ['32px', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '1.35', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '1.4', fontWeight: '700' }],
        h4: ['18px', { lineHeight: '1.45', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.8', fontWeight: '400' }],
        body: ['16px', { lineHeight: '1.7', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'legal-text': ['17px', { lineHeight: '1.9', fontWeight: '400' }],
      },
      spacing: {
        18: '72px',
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(12,45,82,0.06)',
        md: '0 2px 8px rgba(12,45,82,0.08)',
        lg: '0 4px 16px rgba(12,45,82,0.12)',
        xl: '0 8px 32px rgba(12,45,82,0.16)',
      },
      zIndex: {
        'sticky-header': '100',
        dropdown: '200',
        modal: '300',
        toast: '400',
        tooltip: '500',
      },
    },
  },
  plugins: [],
};

export default config;
