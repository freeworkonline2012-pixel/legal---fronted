import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StructuredAnswerView } from './StructuredAnswerView';
import type { Citation, StructuredAnswer } from '@/lib/types';
import { DEMO_CITATION } from '@/lib/demo-data';

const CITATIONS: Citation[] = [
  { ...DEMO_CITATION, source_status: 'ساري', law_id: 'law-uuid-1' },
  {
    ...DEMO_CITATION,
    law: 'قانون آخر',
    law_no: 99,
    law_year: 2010,
    article_no: 7,
    status: 'amended',
    last_amended: null,
    source_status: 'غير محسوم',
    official_url: 'https://example.gov.eg/99',
    law_id: null,
  },
];

const FULL: StructuredAnswer = {
  direct_answer: 'نعم، يستحق العامل تعويضاً بشرط عدم وجود سبب مشروع.',
  rulings: [
    {
      claim: 'يستحق العامل تعويضاً عن الفصل التعسفى.',
      kind: 'نص',
      citation_index: 0,
      quote: 'كان للعامل الحق في تعويض',
      quote_verified: true,
    },
    {
      claim: 'عدم تجديد العقد المحدد قد يُعامل كإنهاء.',
      kind: 'تفسير',
      citation_index: 1,
      quote: 'مقتطف لم يثبت',
      quote_verified: false,
    },
  ],
  warnings: ['المصدر [2] غير محسوم الحالة.'],
  open_issues: ['هل عدم التجديد إنهاء من صاحب العمل؟'],
  facts_to_confirm: ['مدة الخدمة', 'هل التجديد مكتوب؟'],
  not_covered: ['حكم المكافأة'],
};

describe('StructuredAnswerView', () => {
  it('يضع الجواب المباشر أولاً قبل أي تفصيل', () => {
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    const root = screen.getByTestId('structured-answer');
    const firstSection = root.firstElementChild as HTMLElement;
    expect(within(firstSection).getByText(FULL.direct_answer)).toBeInTheDocument();
  });

  it('يضع التنبيهات والمسائل المفتوحة قبل الأحكام (بارزة لا فى الآخر)', () => {
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    const html = document.body.innerHTML;
    expect(html.indexOf('تنبيهات ومسائل مفتوحة')).toBeGreaterThan(-1);
    expect(html.indexOf('تنبيهات ومسائل مفتوحة')).toBeLessThan(html.indexOf('الأحكام وسندها'));
    expect(screen.getByText('المصدر [2] غير محسوم الحالة.')).toBeInTheDocument();
    expect(screen.getByText('هل عدم التجديد إنهاء من صاحب العمل؟')).toBeInTheDocument();
  });

  it('يعرض وسم نص/تفسير لكل حكم', () => {
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    const kinds = screen.getAllByTestId('ruling-kind').map((el) => el.getAttribute('data-kind'));
    expect(kinds).toEqual(['نص', 'تفسير']);
  });

  it('يعرض السند وحالة المصدر ورابط التحقق عند كل حكم', () => {
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    const rulings = screen.getAllByTestId('ruling');
    expect(within(rulings[0]).getByText(/المادة 110/)).toBeInTheDocument();
    expect(within(rulings[0]).getByTestId('source-status')).toHaveTextContent('ساري');
    expect(within(rulings[0]).getByRole('link', { name: /تحقق من نص المادة/ })).toHaveAttribute(
      'href',
      '/laws/law-uuid-1/articles/110',
    );
    expect(within(rulings[1]).getByTestId('source-status')).toHaveTextContent('غير محسوم');
    // بلا law_id → رابط النص الرسمي الخارجى بدل رابط المنصة
    expect(within(rulings[1]).getByRole('link', { name: /فتح النص الرسمي/ })).toHaveAttribute(
      'href',
      'https://example.gov.eg/99',
    );
  });

  it('يعرض المقتطف الحرفى فقط إذا تحقّق الخادم منه', () => {
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    expect(screen.getByText(/كان للعامل الحق في تعويض/)).toBeInTheDocument();
    expect(screen.queryByText(/مقتطف لم يثبت/)).not.toBeInTheDocument();
  });

  it('يعرض الوقائع المطلوب تأكيدها وما لا تغطيه النصوص', () => {
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    expect(screen.getByText('مدة الخدمة')).toBeInTheDocument();
    expect(screen.getByText('هل التجديد مكتوب؟')).toBeInTheDocument();
    expect(screen.getByText('حكم المكافأة')).toBeInTheDocument();
  });

  it('يجمّع المصادر بحسب القانون ويفتح النص الحرفى عند الطلب', async () => {
    const user = userEvent.setup();
    render(<StructuredAnswerView structured={FULL} citations={CITATIONS} />);
    const sources = screen.getByRole('region', { name: 'المصادر' });
    expect(within(sources).getAllByTestId('source-item')).toHaveLength(2);
    expect(within(sources).queryByText(DEMO_CITATION.snippet)).not.toBeInTheDocument();
    await user.click(within(sources).getAllByRole('button', { name: /عرض النص الحرفي/ })[0]);
    expect(within(sources).getByText(DEMO_CITATION.snippet)).toBeInTheDocument();
  });

  it('لا يعرض أقسام التنبيهات والوقائع الفارغة، ولا ينهار مع سند خارج النطاق', () => {
    render(
      <StructuredAnswerView
        structured={{
          direct_answer: 'جواب.',
          rulings: [{ claim: 'حكم', kind: 'تفسير', citation_index: 9, quote: null, quote_verified: false }],
          warnings: [],
          open_issues: [],
          facts_to_confirm: [],
          not_covered: [],
        }}
        citations={CITATIONS}
      />,
    );
    expect(screen.queryByText('تنبيهات ومسائل مفتوحة')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'ما نحتاج منك تأكيده' })).not.toBeInTheDocument();
    expect(screen.getByText('حكم')).toBeInTheDocument();
  });

  it('يرفض رابطاً بروتوكوله خطر', () => {
    render(
      <StructuredAnswerView
        structured={{ ...FULL, rulings: [FULL.rulings[1]] }}
        citations={[CITATIONS[0], { ...CITATIONS[1], official_url: 'javascript:alert(1)' }]}
      />,
    );
    expect(screen.queryByRole('link', { name: /فتح النص الرسمي/ })).not.toBeInTheDocument();
  });

  it('ينبّه على المادة الملغاة', () => {
    render(
      <StructuredAnswerView
        structured={{ ...FULL, rulings: [] }}
        citations={[{ ...CITATIONS[0], status: 'repealed', source_status: 'ملغى' }]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('هذه المادة ملغاة');
  });
  it('يرقّم السند تسلسلياً بترتيب ظهوره فى الأحكام ويطوي المصادر غير المستند إليها', async () => {
    const user = userEvent.setup();
    const many: Citation[] = [10, 20, 30, 40, 50].map((n) => ({ ...DEMO_CITATION, article_no: n, snippet: `نص المادة ${n}`, law_id: 'L' }));
    render(
      <StructuredAnswerView
        structured={{
          ...FULL,
          warnings: [],
          open_issues: [],
          rulings: [
            { claim: 'حكم أول', kind: 'تفسير', citation_index: 3, quote: null, quote_verified: false },
            { claim: 'حكم ثانٍ', kind: 'تفسير', citation_index: 0, quote: null, quote_verified: false },
          ],
        }}
        citations={many}
      />,
    );
    const rulings = screen.getAllByTestId('ruling');
    expect(within(rulings[0]).getByText('[1]')).toBeInTheDocument();
    expect(within(rulings[0]).getByText(/المادة 40/)).toBeInTheDocument();
    expect(within(rulings[1]).getByText('[2]')).toBeInTheDocument();

    const sources = screen.getByRole('region', { name: 'المصادر' });
    expect(within(sources).getAllByTestId('source-item')).toHaveLength(2);
    expect(within(sources).getByText(/المصادر المستند إليها \(2\)/)).toBeInTheDocument();

    await user.click(within(sources).getByRole('button', { name: /مصادر إضافية استُرجعت ولم يستند إليها حكم \(3\)/ }));
    expect(within(sources).getAllByTestId('source-item')).toHaveLength(5);
  });

  it('يدمج المصدر المكرر حرفياً فلا يظهر مرتين', () => {
    const dup: Citation[] = [
      { ...DEMO_CITATION, article_no: 88, snippet: 'نفس النص', law_id: 'L' },
      { ...DEMO_CITATION, article_no: 88, snippet: 'نفس النص', law_id: 'L' },
    ];
    render(
      <StructuredAnswerView
        structured={{
          ...FULL,
          rulings: [{ claim: 'حكم', kind: 'تفسير', citation_index: 1, quote: null, quote_verified: false }],
        }}
        citations={dup}
      />,
    );
    expect(screen.getAllByTestId('source-item')).toHaveLength(1);
  });

  it('يحذف السنة المكررة من اسم القانون', () => {
    render(
      <StructuredAnswerView
        structured={{ ...FULL, rulings: [FULL.rulings[0]] }}
        citations={[{ ...CITATIONS[0], law: 'قانون العمل (2003)', law_year: 2003 }, CITATIONS[1]]}
      />,
    );
    expect(screen.queryByText(/\(2003\) 12\/2003/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/قانون العمل 12\/2003/).length).toBeGreaterThan(0);
  });
});
