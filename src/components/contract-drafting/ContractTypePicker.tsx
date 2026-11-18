/**
 * ContractTypePicker — اختيار نوع العقد: بحث + قوالب جاهزة + تصنيفات ثم صيغ (بلا قائمة منسدلة طويلة).
 * الفهرس من `contract-catalog` (مرجعه تصنيفات «موسوعة صيغ العقود»)؛ ما لا يدعمه الخادم لا يظهر.
 * - `lease` / `nda` / `services`: قوالب ثابتة محكَّمة.
 * - `custom`: «عقد آخر» (هيكل ثابت + بنود موضوع بنموذج لغوى) ويُملأ اسم الصيغة تلقائياً.
 */

'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import type { DraftTypeSpec } from '@/lib/drafting';
import { CATALOG, type CatalogKind, searchCatalog } from '@/lib/contract-catalog';

export interface TypePick {
  spec: DraftTypeSpec;
  /** اسم الصيغة المختارة (لنوع «عقد آخر» فقط؛ يملأ خانة «نوع العقد») */
  title: string | null;
}

const CARD =
  'rounded-lg border border-border-default bg-surface p-4 text-start transition-colors hover:border-border-strong focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60';

export function ContractTypePicker({ types, disabled, onPick }: { types: DraftTypeSpec[]; disabled: boolean; onPick: (pick: TypePick) => void }) {
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const byKind = useMemo(() => {
    const map = new Map<string, DraftTypeSpec>();
    for (const t of types) map.set(t.id, t);
    return map;
  }, [types]);
  const customSpec = byKind.get('custom') ?? null;
  const templated = types.filter((t) => !t.assisted);

  const isAvailable = (kind: CatalogKind) => byKind.has(kind);
  const categories = CATALOG.map((c) => ({ ...c, forms: c.forms.filter((f) => isAvailable(f.kind)) })).filter((c) => c.forms.length > 0);
  const hits = searchCatalog(query, isAvailable);
  const searching = query.trim().length > 0;
  const current = openCategory ? (categories.find((c) => c.id === openCategory) ?? null) : null;

  function pickForm(kind: CatalogKind, title: string) {
    const spec = byKind.get(kind);
    if (!spec) return;
    onPick({ spec, title: kind === 'custom' ? title : null });
  }

  return (
    <section className="mb-6 space-y-4">
      <div>
        <label htmlFor="draft-type-search" className="mb-3 block text-body font-semibold text-text-primary">
          ١. اختر نوع العقد
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input
            id="draft-type-search"
            type="search"
            value={query}
            disabled={disabled}
            placeholder="ابحث عن نوع العقد (مثال: بيع شقة، مقاولة، شركة تضامن...)"
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-md border border-border-default bg-surface ps-9 pe-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {searching ? (
        <div role="region" aria-label="نتائج البحث" className="space-y-2">
          {hits.length === 0 ? (
            <p role="status" className="text-body-sm text-text-secondary">
              لا توجد صيغة بهذا الاسم.{' '}
              {customSpec ? (
                <button
                  type="button"
                  className="font-semibold text-primary underline"
                  onClick={() => onPick({ spec: customSpec, title: query.trim().slice(0, 60) })}
                >
                  صُغ «{query.trim().slice(0, 60)}» كنوع عقد آخر
                </button>
              ) : null}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {hits.map((h) => (
                <li key={`${h.categoryId}:${h.title}`}>
                  <button type="button" disabled={disabled} onClick={() => pickForm(h.kind, h.title)} className={`${CARD} w-full`}>
                    <span className="block text-body-sm font-semibold text-text-primary">{h.title}</span>
                    <span className="mt-1 block text-caption text-text-tertiary">{h.categoryLabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : current ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setOpenCategory(null)} className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            كل التصنيفات
          </button>
          <h3 className="text-body font-semibold text-text-primary">{current.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {current.forms.map((f) => (
              <li key={f.title}>
                <button type="button" disabled={disabled} onClick={() => pickForm(f.kind, f.title)} className={`${CARD} w-full`}>
                  <span className="block text-body-sm font-semibold text-text-primary">{f.title}</span>
                  <span className="mt-1 block text-caption text-text-tertiary">{f.kind === 'custom' ? 'بنود الموضوع بنموذج لغوى' : 'قالب ثابت محكَّم'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {templated.length > 0 ? (
            <div role="group" aria-label="قوالب جاهزة محكَّمة" className="space-y-2">
              <h3 className="text-body-sm font-semibold text-text-secondary">قوالب جاهزة محكَّمة</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {templated.map((t) => (
                  <button key={t.id} type="button" disabled={disabled} onClick={() => onPick({ spec: t, title: null })} className={CARD}>
                    <span className="block text-body-sm font-semibold text-text-primary">{t.label}</span>
                    <span className="mt-1 block text-caption text-text-secondary">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {customSpec ? (
            <button type="button" disabled={disabled} onClick={() => onPick({ spec: customSpec, title: null })} className={`${CARD} flex w-full items-start gap-3`}>
              <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-body-sm font-semibold text-text-primary">{customSpec.label}</span>
                <span className="mt-1 block text-caption text-text-secondary">{customSpec.description}</span>
              </span>
            </button>
          ) : null}

          <div role="group" aria-label="تصنيفات العقود" className="space-y-2">
            <h3 className="text-body-sm font-semibold text-text-secondary">أو تصفّح حسب التصنيف</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {categories.map((c) => (
                <button key={c.id} type="button" disabled={disabled} onClick={() => setOpenCategory(c.id)} className={CARD}>
                  <span className="block text-body-sm font-semibold text-text-primary">{c.label}</span>
                  <span className="mt-1 block text-caption text-text-tertiary">{c.forms.length} صيغة</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
