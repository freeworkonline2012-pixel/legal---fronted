import { render, screen } from '@testing-library/react';
import { GovernanceRecommendationCard } from './GovernanceRecommendationCard';
import type { GovernanceRecommendation } from '@/lib/types';

const DATABASE_RECOMMENDATION: GovernanceRecommendation = {
  advice: 'غير موصى به',
  reasoning: 'الإجراء يخالف صراحة المادة 8 من القانون رقم 80 لسنة 2002.',
  basis_type: 'database',
  confidence: 0.98,
  conditions_for_compliance: null,
  violated_provisions: null,
  web_sources: null,
  disclaimer: null,
  applicable_penalties: [
    {
      law: 'قانون مكافحة غسل الأموال',
      law_no: 80,
      law_year: 2002,
      article_no: 15,
      snippet: 'يُعاقب بالحبس والغرامة كل من يخالف أياً من أحكام المواد أرقام (8، 9، 11).',
      official_url: 'https://fra.gov.eg/aml-law-80-2002.pdf',
    },
  ],
  penalty_note: 'يعاقب بالحبس والغرامة كل من يخالف أحكام المادتين 8 و11.',
};

const CONDITIONAL_RECOMMENDATION: GovernanceRecommendation = {
  ...DATABASE_RECOMMENDATION,
  advice: 'موصى به بشرط',
  conditions_for_compliance: ['استيفاء إخطار الجهة الرقابية كتابياً', 'توثيق موافقة مجلس الإدارة'],
  applicable_penalties: null,
  penalty_note: null,
};

const WEB_SUPPLEMENTARY_RECOMMENDATION: GovernanceRecommendation = {
  advice: 'غير موصى به',
  reasoning: 'بحسب مصادر ويب تكميلية، هذا الإجراء غير موصى به.',
  basis_type: 'web_supplementary',
  confidence: 0.4,
  conditions_for_compliance: null,
  violated_provisions: null,
  web_sources: [{ title: 'الهيئة العامة للرقابة المالية', url: 'https://fra.gov.eg/example', snippet: 'مقتطف ذو صلة' }],
  disclaimer: '⚠️ هذه التوصية تكميلية من بحث ويب عام، وليست مبنية على قاعدتنا القانونية المُراجَعة.',
  applicable_penalties: null,
  penalty_note: null,
};

describe('GovernanceRecommendationCard', () => {
  /**
   * تغطية دمج 2026-09-18: البطاقة أصبحت تعرض شارتى الحكم والتوصية معاً
   * («غير متوافق» و«غير موصى به») بدل بطاقة حكم منفصلة + بطاقة توصية منفصلة.
   */
  it('يعرض شارة الحكم وشارة التوصية معاً والسبب مرة واحدة فقط (بلا تكرار risk_note)', () => {
    render(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={DATABASE_RECOMMENDATION} />);
    expect(screen.getByRole('status', { name: 'الحكم: غير متوافق' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /التوصية: غير موصى به/ })).toBeInTheDocument();
    expect(screen.getAllByText(DATABASE_RECOMMENDATION.reasoning)).toHaveLength(1);
  });

  it('يعرض قسم العقوبة المطبَّقة وملاحظتها (بطاقة الاستشهاد بالمادة انتقلت لقسم موحَّد فى GovernanceScreen)', () => {
    render(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={DATABASE_RECOMMENDATION} />);
    expect(screen.getByText('العقوبة المطبَّقة')).toBeInTheDocument();
    expect(screen.getByText(DATABASE_RECOMMENDATION.penalty_note as string)).toBeInTheDocument();
    // بطاقة GovernanceCitationCard (المادة 15) لم تعد تُعرض داخل هذا المكوّن — راجع GovernanceScreen.test.tsx لتغطيتها ضمن القائمة الموحَّدة.
    expect(screen.queryByText(/المادة 15/)).not.toBeInTheDocument();
  });

  it('لا يعرض قسم العقوبة إطلاقاً عندما applicable_penalties=null وpenalty_note=null معاً', () => {
    render(<GovernanceRecommendationCard verdict="متوافق جزئياً" recommendation={CONDITIONAL_RECOMMENDATION} />);
    expect(screen.queryByText('العقوبة المطبَّقة')).not.toBeInTheDocument();
  });

  it('يعرض شارة «موثوق» عندما basis_type="database" وشارة «غير موثوق» عندما basis_type="web_supplementary"', () => {
    const { rerender } = render(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={DATABASE_RECOMMENDATION} />);
    expect(screen.getByRole('status', { name: 'مصدر التوصية: موثوق' })).toBeInTheDocument();

    rerender(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={WEB_SUPPLEMENTARY_RECOMMENDATION} />);
    expect(screen.getByRole('status', { name: 'مصدر التوصية: غير موثوق' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'مصدر التوصية: موثوق' })).not.toBeInTheDocument();
  });

  it('يعرض قائمة الشروط عند "موصى به بشرط"', () => {
    render(<GovernanceRecommendationCard verdict="متوافق جزئياً" recommendation={CONDITIONAL_RECOMMENDATION} />);
    expect(screen.getByRole('status', { name: /التوصية: موصى به بشرط/ })).toBeInTheDocument();
    expect(screen.getByText('استيفاء إخطار الجهة الرقابية كتابياً')).toBeInTheDocument();
    expect(screen.getByText('توثيق موافقة مجلس الإدارة')).toBeInTheDocument();
  });

  it('لا يعرض قسم الشروط عندما conditions_for_compliance=null', () => {
    render(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={DATABASE_RECOMMENDATION} />);
    expect(screen.queryByText(/الشروط اللازمة للانتقال/)).not.toBeInTheDocument();
  });

  it('يعرض تنويه إلزامياً ومصادر الويب عندما basis_type="web_supplementary"', () => {
    render(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={WEB_SUPPLEMENTARY_RECOMMENDATION} />);
    expect(screen.getByRole('note', { name: 'تنويه توصية تكميلية من بحث ويب' })).toHaveTextContent(
      /هذه التوصية تكميلية من بحث ويب عام/,
    );
    const link = screen.getByRole('link', { name: /الهيئة العامة للرقابة المالية/ });
    expect(link).toHaveAttribute('href', 'https://fra.gov.eg/example');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('لا يعرض تنويه الويب ولا مصادره عندما basis_type="database"', () => {
    render(<GovernanceRecommendationCard verdict="غير متوافق" recommendation={DATABASE_RECOMMENDATION} />);
    expect(screen.queryByRole('note', { name: 'تنويه توصية تكميلية من بحث ويب' })).not.toBeInTheDocument();
    expect(screen.queryByText('مصادر ويب تكميلية')).not.toBeInTheDocument();
  });
});
