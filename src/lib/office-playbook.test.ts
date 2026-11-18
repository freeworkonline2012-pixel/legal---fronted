import {
  blankCustomRule,
  familiesLabel,
  isNewRuleId,
  setBuiltInEnabled,
  setBuiltInSeverity,
  textToPhrases,
  toPayload,
  validateConfig,
  type PlaybookCatalogRule,
  type PlaybookConfig,
  type PlaybookLimits,
} from './office-playbook';

const LIMITS: PlaybookLimits = { maxCustomRules: 2, maxPhrasesPerRule: 3, maxPhraseLength: 20, minPhraseLength: 3, maxTitleLength: 50, maxTextLength: 100, maxDisabled: 50 };
const EMPTY: PlaybookConfig = { disabledRules: [], severityOverrides: {}, customRules: [] };
const RULE: PlaybookCatalogRule = { id: 'r1', title: 't', severity: 'عالٍ', families: null, excludeFamilies: [], protects: null, absence: false };

describe('office-playbook (lib)', () => {
  it('textToPhrases: سطر لكل عبارة مع تنظيف المسافات وحذف الفارغ', () => {
    expect(textToPhrases('  غرامة   تأخير \n\n شرط جزائى\n   ')).toEqual(['غرامة تأخير', 'شرط جزائى']);
    expect(textToPhrases('')).toEqual([]);
  });

  it('blankCustomRule: معرفات مؤقتة فريدة تُعرف كجديدة، وتُحذف من الحمولة', () => {
    const a = blankCustomRule();
    const b = blankCustomRule();
    expect(a.id).not.toBe(b.id);
    expect(isNewRuleId(a.id)).toBe(true);
    const payload = toPayload({ ...EMPTY, customRules: [{ ...a, title: 'x', phrases: ['abc'] }, { ...b, id: 'c_deadbeef' }] });
    expect(payload.customRules[0].id).toBeUndefined();
    expect(payload.customRules[1].id).toBe('c_deadbeef');
    expect(JSON.parse(JSON.stringify(payload)).customRules[0]).not.toHaveProperty('id');
  });

  it('setBuiltInEnabled: تعطيل وإعادة تفعيل بلا تكرار', () => {
    const off = setBuiltInEnabled(EMPTY, 'r1', false);
    expect(off.disabledRules).toEqual(['r1']);
    expect(setBuiltInEnabled(off, 'r1', false).disabledRules).toEqual(['r1']);
    expect(setBuiltInEnabled(off, 'r1', true).disabledRules).toEqual([]);
  });

  it('setBuiltInSeverity: التغيير يُسجَّل، والعودة للأصل تحذف التجاوز', () => {
    const c1 = setBuiltInSeverity(EMPTY, RULE, 'منخفض');
    expect(c1.severityOverrides).toEqual({ r1: 'منخفض' });
    expect(setBuiltInSeverity(c1, RULE, 'عالٍ').severityOverrides).toEqual({});
  });

  it('validateConfig: يكشف العنوان الناقص والعبارات الناقصة والقصيرة والطويلة وتجاوز الحدود', () => {
    const r = { ...blankCustomRule(), title: '', phrases: [] as string[] };
    expect(validateConfig({ ...EMPTY, customRules: [r] }, LIMITS).join(' ')).toContain('العنوان مطلوب');
    expect(validateConfig({ ...EMPTY, customRules: [r] }, LIMITS).join(' ')).toContain('عبارة واحدة');
    const ok = { ...blankCustomRule(), title: 't', phrases: ['abcd'] };
    expect(validateConfig({ ...EMPTY, customRules: [ok] }, LIMITS)).toEqual([]);
    expect(validateConfig({ ...EMPTY, customRules: [{ ...ok, phrases: ['اب'] }] }, LIMITS).join(' ')).toContain('قصيرة');
    expect(validateConfig({ ...EMPTY, customRules: [{ ...ok, phrases: ['x'.repeat(21)] }] }, LIMITS).join(' ')).toContain('أطول');
    expect(validateConfig({ ...EMPTY, customRules: [{ ...ok, phrases: ['aaa', 'bbb', 'ccc', 'ddd'] }] }, LIMITS).join(' ')).toContain('الحد الأقصى');
    expect(validateConfig({ ...EMPTY, customRules: [ok, ok, ok] }, LIMITS).join(' ')).toContain('الحد الأقصى للقواعد');
  });

  it('familiesLabel', () => {
    expect(familiesLabel(null)).toBe('كل أنواع العقود');
    expect(familiesLabel([])).toBe('كل أنواع العقود');
    expect(familiesLabel(['lease', 'nda'])).toBe('عقد إيجار، اتفاقية عدم إفصاح وسرية');
  });
});
