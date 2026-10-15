/**
 * ExportButtons — تنزيل الإجابة/التقييم/تقرير العقد كمستند PDF أو Word.
 *
 * المستند يُبنى على الخادم من السجل المحفوظ ومملوك للمستخدم (لا يُرسل المتصفح أى
 * نص)، لذلك يشترط التنزيل حساباً مسجَّلاً: الزائر لا يملك سجلاً محفوظاً. يظهر له
 * سطر دعوة لتسجيل الدخول بدل الأزرار.
 *
 * isAuthenticated() يقرأ sessionStorage (عميل فقط) فلا يُعرض شيء قبل التركيب
 * لتفادى عدم تطابق الـhydration.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { ApiError, downloadExport } from '@/lib/api-client';
import type { ExportFormat, ExportKind } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import { Button } from './Button';

export interface ExportButtonsProps {
  kind: ExportKind;
  /** معرّف السجل المحفوظ (answer.id / assessment_id / contract.id) */
  id: string;
  /** عنوان قصير يسبق الأزرار، مثال: «تنزيل الإجابة» */
  label?: string;
}

export function ExportButtons({ kind, id, label = 'تنزيل المستند' }: ExportButtonsProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // متعمّد: sessionStorage متاح للعميل فقط؛ القراءة أثناء hydration تكسر تطابق SSR
    // (نفس نمط ContractsScreen/Header).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAuthenticated());
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <p className="text-body-sm text-text-tertiary">
        <Link href="/login" className="text-link underline underline-offset-4">
          سجّل الدخول
        </Link>{' '}
        لتتمكن من تنزيل هذا المستند بصيغة PDF أو Word.
      </p>
    );
  }

  async function handle(format: ExportFormat): Promise<void> {
    setBusy(format);
    setError(null);
    try {
      await downloadExport(kind, id, format);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر تنزيل المستند — حاول مرة أخرى.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2" data-testid={`export-${kind}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-body-sm font-medium text-text-secondary">
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {label}
        </span>
        <Button
          variant="secondary"
          size="sm"
          loading={busy === 'pdf'}
          disabled={busy !== null}
          onClick={() => void handle('pdf')}
          aria-label={`${label} بصيغة PDF`}
        >
          PDF
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={busy === 'docx'}
          disabled={busy !== null}
          onClick={() => void handle('docx')}
          aria-label={`${label} بصيغة Word`}
        >
          Word
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
