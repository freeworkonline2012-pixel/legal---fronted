import { anchorCandidates, assembleSlices, docxFileName, MAX_COMMENTS, planComments, summarizeContract } from './word-addin';
import type { ContractClauseItem, ContractFinding, ContractResponse } from './types';

function clause(i: number, status: ContractClauseItem['assessment_status'], over: Partial<ContractClauseItem> = {}): ContractClauseItem {
  return {
    id: `c${i}`,
    clause_index: i,
    clause_label: `البند ${i}`,
    clause_title: 'الأجر',
    clause_type_guess: null,
    clause_text: `يلتزم الطرف الثانى بسداد مبلغ ${i}000 جنيه شهرياً فى نهاية كل شهر ميلادى طوال مدة هذا العقد.\nسطر ثان`,
    assessment_status: status,
    assessment_reasoning: 'الشرط مخالف لنص آمر.',
    matched_articles: [{ law: 'القانون المدنى', law_no: 131, law_year: 1948, article_no: 148, snippet: 'x', official_url: null }],
    assessment_confidence: 0.8,
    ...over,
  };
}
function finding(id: string, severity: ContractFinding['severity'], quote?: string): ContractFinding {
  return {
    id,
    kind: 'missing_clause',
    kind_label: 'بند غير مرصود',
    severity,
    title: 'لا يوجد بند للقانون الواجب التطبيق',
    explanation: 'العقد لا يحدد القانون الواجب التطبيق.',
    suggestion: 'أضف بنداً للقانون الواجب التطبيق.',
    evidence: quote ? [{ clause_index: 1, clause_label: 'البند 1', quote }] : [],
    source: 'rule',
  };
}
function contract(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 'k1',
    original_filename: 'a.docx',
    status: 'processed',
    extraction_error: null,
    clause_count: 3,
    clauses: [clause(1, 'يحتاج مراجعة'), clause(2, 'سليم'), clause(3, 'لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة')],
    contract_findings: [finding('f1', 'منخفض'), finding('f2', 'حرج', 'يلتزم الطرف الثانى بسداد مبلغ 1000 جنيه شهرياً')],
    created_at: '2026-11-18T00:00:00Z',
    ...over,
  };
}

describe('word-addin — دوال نقية', () => {
  it('assembleSlices يجمع الشرائح بالترتيب بلا فقد', () => {
    const out = assembleSlices([[1, 2], new Uint8Array([3]), [4, 5, 6]]);
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(assembleSlices([]).length).toBe(0);
  });

  it('docxFileName: اسم صالح من المسار/الرابط أو افتراضى لمستند غير محفوظ', () => {
    expect(docxFileName('C:\\Users\\a\\Documents\\عقد إيجار.docx')).toBe('عقد إيجار.docx');
    expect(docxFileName('https://x.sharepoint.com/d/%D8%B9%D9%82%D8%AF.docx?web=1')).toBe('عقد.docx');
    expect(docxFileName('/tmp/contract.doc')).toBe('contract.docx');
    expect(docxFileName(null)).toBe('contract.docx');
    expect(docxFileName('')).toBe('contract.docx');
    expect(docxFileName('a<b>.docx')).toBe('ab.docx');
  });

  it('anchorCandidates: سطر أول مقطوع عند حد كلمة، بلا ^، وقصير جداً ⇒ لا مرشحات', () => {
    const long = 'كلمة '.repeat(80);
    const c = anchorCandidates(long);
    expect(c.length).toBeGreaterThan(1);
    expect(c[0]!.length).toBeLessThanOrEqual(200);
    expect(c.every((x) => !x.endsWith(' '))).toBe(true);
    expect(anchorCandidates('قصير')).toEqual([]);
    expect(anchorCandidates('')).toEqual([]);
    expect(anchorCandidates(null)).toEqual([]);
    expect(anchorCandidates('مبلغ الأجر الشهرى المتفق عليه ^p يدفع كل شهر')[0]).toBe('مبلغ الأجر الشهرى المتفق عليه');
    expect(anchorCandidates('^p الأجر الشهرى يدفع كل شهر')).toEqual([]);
    expect(anchorCandidates('\n\n   السطر الأول من البند الأول هو هذا\nالثانى')[0]).toBe('السطر الأول من البند الأول هو هذا');
  });

  it('planComments: الملاحظات الأشد أولاً ثم البنود التى تحتاج مراجعة فقط، مع موضع أو تعليق عام', () => {
    const plan = planComments(contract());
    expect(plan.map((p) => p.kind)).toEqual(['finding', 'finding', 'clause']);
    expect(plan[0]!.severity).toBe('حرج');
    expect(plan[0]!.anchors.length).toBeGreaterThan(0);
    expect(plan[1]!.anchors).toEqual([]);
    expect(plan[1]!.text).toContain('ملاحظة على العقد ككل');
    expect(plan[2]!.text).toContain('البند 1');
    expect(plan[2]!.text).toContain('القانون المدنى م 148');
    expect(plan.every((p) => p.text.startsWith('[منصة قانونية]') || p.text.startsWith('ملاحظة على العقد ككل'))).toBe(true);
  });

  it('planComments: عقد غير منتهٍ أو مقفل التفاصيل ⇒ لا تعليقات', () => {
    expect(planComments(contract({ status: 'processing' }))).toEqual([]);
    expect(planComments(contract({ details_locked: true }))).toEqual([]);
    expect(planComments(contract({ status: 'extraction_failed' }))).toEqual([]);
  });

  it('planComments: سقف التعليقات وحد طول النص', () => {
    const many = Array.from({ length: 100 }, (_, i) => clause(i + 1, 'يحتاج مراجعة', { assessment_reasoning: 'س'.repeat(5000) }));
    const plan = planComments(contract({ clauses: many, contract_findings: [] }));
    expect(plan).toHaveLength(MAX_COMMENTS);
    expect(plan.every((p) => p.text.length <= 900)).toBe(true);
  });

  it('planComments: بند بلا تفسير أو غير مصنَّف لا يُعلَّق عليه', () => {
    const plan = planComments(contract({ clauses: [clause(1, 'يحتاج مراجعة', { assessment_reasoning: null }), clause(2, null)], contract_findings: [] }));
    expect(plan).toEqual([]);
  });

  it('summarizeContract: عدّاد البنود والملاحظات والقفل', () => {
    const s = summarizeContract(contract({ details_locked: true }));
    expect(s).toMatchObject({ totalClauses: 3, needsReview: 1, sound: 1, noSource: 1, locked: true });
    expect(s.findingsBySeverity).toEqual({ 'حرج': 1, 'عالٍ': 0, 'متوسط': 0, 'منخفض': 1 });
    expect(summarizeContract(contract({ clauses: undefined, contract_findings: undefined, clause_count: null })).totalClauses).toBe(0);
  });
});
