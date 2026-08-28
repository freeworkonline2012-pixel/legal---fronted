/**
 * مكوّن DomainChip — شارة المجال القانوني (design_tokens.json → domain_chips).
 *
 * المجالات الخمسة: عمل / إيجارات / أحوال شخصية / مرور / حماية مستهلك.
 * الألوان المخصصة لكل مجال معرّفة للوضع الفاتح فقط في التوكينز؛
 * في الوضع الليلي نستخدم surface-muted + text-secondary (متوافق مع AA).
 * أيقونة زخرفية aria-hidden — النص هو حامل المعلومة (WCAG 1.4.1).
 */

import type { CSSProperties } from 'react';
import { Briefcase, Car, FileText, Home, Landmark, Receipt, Scale, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DomainKey } from '@/lib/types';
import { domainChipTokens } from '@/lib/tokens';

export const DOMAIN_ICONS: Record<DomainKey, LucideIcon> = {
  labor: Briefcase,
  rent: Home,
  personal_status: Users,
  traffic: Car,
  consumer_protection: Receipt,
  insurance: Landmark,
  aml_cft: ShieldAlert,
  legal_profession: Scale,
  capital_markets: TrendingUp,
  non_bank_finance: Landmark,
  other: FileText,
};

export interface DomainChipProps {
  domain: DomainKey;
}

export function DomainChip({ domain }: DomainChipProps) {
  const token = domainChipTokens[domain];
  const Icon = DOMAIN_ICONS[domain];

  const style = {
    '--chip-fg': token.light_fg,
    '--chip-bg': token.light_bg,
  } as CSSProperties;

  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-transparent px-3 text-body-sm font-medium text-[var(--chip-fg)] dark:border-border-default dark:bg-surface-muted dark:text-text-secondary"
      style={style}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{token.label}</span>
    </span>
  );
}
