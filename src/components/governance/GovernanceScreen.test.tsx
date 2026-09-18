import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceScreen } from './GovernanceScreen';
import { ApiError } from '@/lib/api-client';
import type { GovernanceAssessResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    postGovernanceAssess: jest.fn(),
  };
});

import { postGovernanceAssess } from '@/lib/api-client';

const mockedAssess = postGovernanceAssess as jest.MockedFunction<typeof postGovernanceAssess>;

const VALID_DESCRIPTION =
  'شركة تمويل استهلاكى تنوي عدم إبلاغ وحدة مكافحة غسل الأموال عن عملية تحويل تتجاوز الحد المقرر';

const NON_COMPLIANT_RESPONSE: GovernanceAssessResponse = {
  verdict: 'غير متوافق',
  legal_basis: [
    {
      law: 'قانون مكافحة غسل الأموال',
      law_no: 80,
      law_year: 2002,
      article_no: 12,
      snippet: 'تلتزم المؤسسات المالية بالإبلاغ عن العمليات المشبوهة فوراً.',
      official_url: 'https://fra.gov.eg/aml-law-80-2002.pdf',
    },
  ],
  risk_note: 'عدم الإبلاغ يُعرِّض المؤسسة لعقوبات جنائية وإدارية.',
  confidence: 0.9,
};

const INSUFFICIENT_INFO_RESPONSE: GovernanceAssessResponse = {
  verdict: 'معلومات غير كافية',
  legal_basis: [],
  risk_note: 'لا توجد وقائع كافية للحكم.',
};

/**
 * تغطية فجوة 2026-09-18: recommendation كان موجوداً فى عقد backend بلا أى
 * تغطية اختبار فى هذه الشاشة — راجع تعليق GovernanceRecommendationCard.
 */
const NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE: GovernanceAssessResponse = {
  ...NON_COMPLIANT_RESPONSE,
  recommendation: {
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
  },
};

describe('GovernanceScreen', () => {
  beforeEach(() => {
    mockedAssess.mockReset();
  });

  it('يعرض العنوان والتنبيه الدائم بالدقة المقاسة ووجوب المراجعة البشرية', () => {
    render(<GovernanceScreen />);
    expect(screen.getByRole('heading', { name: /تحقق من الالتزام بقواعد الحوكمة/ })).toBeInTheDocument();
    expect(screen.getByRole('alert', { name: '' })).toHaveTextContent(/دقة مقاسة ومؤكَّدة: 97\.2%/);
  });

  /**
   * تحديث 2026-09-18 (بطلب صريح من صاحب المشروع): التنبيه الدائم اختُصر إلى
   * سطر واحد فقط — فقرتا المنهجية وحدود التغطية (قرار 205/2021 وقرار
   * 951/2003) حُذفتا بالكامل من هذا التنبيه ولا تظهران فى أى مكان آخر بالصفحة
   * (راجع تعليق GovernanceScreen.tsx لتفاصيل هذا القرار وتبعاته).
   */
  it('يختصر التنبيه الدائم إلى سطر الدقة فقط، بلا فقرتى المنهجية وحدود التغطية', () => {
    render(<GovernanceScreen />);
    const alertBanner = screen.getByRole('alert', { name: '' });
    expect(alertBanner).toHaveTextContent('دقة مقاسة ومؤكَّدة: 97.2% — يبقى التحقق البشرى ضرورياً');
    expect(alertBanner).not.toHaveTextContent(/205 لسنة 2021/);
    expect(alertBanner).not.toHaveTextContent(/951 لسنة 2003/);
    expect(alertBanner).not.toHaveTextContent(/35 من 36/);
  });

  it('يمنع الإرسال ويعرض خطأ تحقق عند نص أقصر من 10 أحرف', async () => {
    const user = userEvent.setup();
    render(<GovernanceScreen />);
    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), 'قصير');
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    expect(await screen.findByText(/الوصف قصير جداً/)).toBeInTheDocument();
    expect(mockedAssess).not.toHaveBeenCalled();
  });

  it('يعرض الحكم وبطاقة الأساس القانونى وملاحظة المخاطر عند نجاح الطلب', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: غير متوافق/ })).toBeInTheDocument();
    });
    expect(screen.getByText(NON_COMPLIANT_RESPONSE.risk_note)).toBeInTheDocument();
    expect(screen.getByText(/قانون مكافحة غسل الأموال 80\/2002/)).toBeInTheDocument();
    expect(mockedAssess).toHaveBeenCalledWith({ action_description: VALID_DESCRIPTION });
  }, 15000);

  it('يعرض بطاقة التوصية والعقوبة المطبَّقة عند توفر recommendation فى الاستجابة', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /التوصية: غير موصى به/ })).toBeInTheDocument();
    });
    expect(screen.getByText('العقوبة المطبَّقة')).toBeInTheDocument();
    expect(screen.getByText(/يعاقب بالحبس والغرامة كل من يخالف أحكام المادتين/)).toBeInTheDocument();
  }, 15000);

  /**
   * تحديث 2026-09-18 (بطلب صريح من صاحب المشروع): الترتيب الجديد للصفحة
   * الرد ← التوصية ← العقوبة (نصاً، ضمن بطاقة التوصية) ← قسم واحد موحَّد
   * «المواد المستشهد بها» يجمع legal_basis وapplicable_penalties معاً مرتبة
   * تصاعدياً برقم المادة، بدل ظهور الأساس القانونى منفصلاً أعلى الصفحة.
   */
  it('يضع قسم «المواد المستشهد بها» الموحَّد بعد بطاقة التوصية، ويرتب المواد تصاعدياً (12 قبل 15)', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByText('المواد المستشهد بها')).toBeInTheDocument();
    });

    const html = document.body.innerHTML;
    const adviceIndex = html.indexOf('التوصية: غير موصى به');
    const citedHeadingIndex = html.indexOf('المواد المستشهد بها');
    const article12Index = html.indexOf('المادة 12'); // من legal_basis
    const article15Index = html.indexOf('المادة 15'); // من applicable_penalties

    expect(adviceIndex).toBeGreaterThan(-1);
    expect(citedHeadingIndex).toBeGreaterThan(adviceIndex);
    expect(article12Index).toBeGreaterThan(citedHeadingIndex);
    expect(article15Index).toBeGreaterThan(article12Index);
  }, 15000);

  it('لا يكرر مادة تظهر فى كل من legal_basis وapplicable_penalties بنفس رقم القانون والمادة', async () => {
    const user = userEvent.setup();
    const DUPLICATE_ARTICLE_RESPONSE: GovernanceAssessResponse = {
      ...NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE,
      legal_basis: [
        ...NON_COMPLIANT_RESPONSE.legal_basis,
        NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE.recommendation!.applicable_penalties![0],
      ],
    };
    mockedAssess.mockResolvedValue(DUPLICATE_ARTICLE_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByText('المواد المستشهد بها')).toBeInTheDocument();
    });

    expect(screen.getAllByText('المادة 15')).toHaveLength(1);
  }, 15000);

  it('لا يعرض بطاقة التوصية إطلاقاً عندما recommendation غائب من الاستجابة (استجابات قديمة قبل 2026-09-18)', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: غير متوافق/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole('region', { name: 'بطاقة التوصية' })).not.toBeInTheDocument();
  }, 15000);

  it('يعرض ملاحظة بديلة بدل قائمة فارغة عند حكم "معلومات غير كافية" بلا أساس قانونى', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(INSUFFICIENT_INFO_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: معلومات غير كافية/ })).toBeInTheDocument();
    });
    expect(screen.getByText(/لا يوجد أساس قانونى محدَّد لهذا الحكم/)).toBeInTheDocument();
  }, 15000);

  it('يعرض رسالة خطأ وزر إعادة محاولة عند فشل الاتصال، وينجح عند إعادة المحاولة', async () => {
    const user = userEvent.setup();
    mockedAssess.mockRejectedValueOnce(new ApiError(0, 'network down'));
    mockedAssess.mockResolvedValueOnce(NON_COMPLIANT_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByText(/تعذّر الاتصال بالخادم/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: غير متوافق/ })).toBeInTheDocument();
    });
    expect(mockedAssess).toHaveBeenCalledTimes(2);
  }, 15000);

  it('يعيد تعيين النموذج عند الضغط على «تحقق من إجراء آخر»', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: غير متوافق/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /تحقق من إجراء آخر/ }));

    expect(screen.queryByRole('status', { name: /الحكم:/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/وصف الإجراء أو القرار/)).toHaveValue('');
  }, 15000);
});
