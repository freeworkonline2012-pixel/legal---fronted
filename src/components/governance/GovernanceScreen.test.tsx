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

/**
 * تغطية «ترتيب القوانين» 2026-09-18: استشهادان من قانونين مختلفين (law_no
 * 80 و161) — يتحققان من أن كل قانون يُجمَّع فى بطاقة واحدة (مادتا 12 و15 من
 * نفس القانون 80 تحت عنوان واحد)، وأن القوانين نفسها تُرتَّب تصاعدياً برقم
 * القانون (80 قبل 161) بصرف النظر عن ترتيب ورودها فى legal_basis/applicable_penalties.
 */
const MULTI_LAW_RESPONSE: GovernanceAssessResponse = {
  ...NON_COMPLIANT_RESPONSE,
  legal_basis: [
    {
      law: 'قرار مجلس إدارة الهيئة العامة للرقابة المالية',
      law_no: 161,
      law_year: 2024,
      article_no: 6,
      snippet: 'تفرض الإخطار الفورى عن العمليات المشتبه فيها بصرف النظر عن قيمتها.',
      official_url: 'https://fra.gov.eg/decision-161-2024.pdf',
    },
    ...NON_COMPLIANT_RESPONSE.legal_basis, // قانون 80/2002، المادة 12
  ],
  recommendation: {
    ...NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE.recommendation!,
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

  /**
   * تغطية نقل التنبيه 2026-09-18 (بطلب صريح ثانٍ من صاحب المشروع): التنبيه
   * كان يظهر فوق حقل الوصف بلون تحذيرى (warning/أصفر) — انتقل الآن إلى داخل
   * الفورم، مباشرة بعد حقل «وصف الإجراء أو القرار» وقبل زر «تحقق الآن»، وتغيّر
   * لونه إلى الأخضر (success). هذا الاختبار يثبّت كلا الجانبين: الموضع فى
   * DOM (بعد حقل الوصف، قبل زر الإرسال) واللون الأخضر بدل التحذيرى — بنفس
   * نمط اختبار ترتيب بطاقات القوانين أعلاه (مقارنة مواضع النصوص فى innerHTML).
   */
  it('ينقل التنبيه الدائم إلى ما بعد حقل وصف الإجراء ويحوّل لونه إلى الأخضر بدل التحذيرى', () => {
    render(<GovernanceScreen />);

    const alertBanner = screen.getByRole('alert', { name: '' });
    const textarea = screen.getByLabelText(/وصف الإجراء أو القرار/);
    const submitButton = screen.getByRole('button', { name: 'تحقق الآن' });

    const html = document.body.innerHTML;
    const textareaIndex = html.indexOf(textarea.outerHTML);
    const alertIndex = html.indexOf('دقة مقاسة ومؤكَّدة: 97.2%');
    const submitButtonIndex = html.indexOf(submitButton.outerHTML);

    expect(textareaIndex).toBeGreaterThan(-1);
    expect(alertIndex).toBeGreaterThan(-1);
    expect(submitButtonIndex).toBeGreaterThan(-1);
    // الترتيب فى DOM: الحقل، ثم التنبيه، ثم زر الإرسال
    expect(textareaIndex).toBeLessThan(alertIndex);
    expect(alertIndex).toBeLessThan(submitButtonIndex);

    // اللون: أخضر (success) بدل التحذيرى (warning) السابق
    expect(alertBanner.className).toContain('border-success');
    expect(alertBanner.className).toContain('bg-success-soft');
    expect(alertBanner.className).not.toContain('border-warning');
    expect(alertBanner.className).not.toContain('bg-warning-soft');

    // الأيقونة أيضاً تحمل لون success بدل warning
    const icon = alertBanner.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('class')).toContain('text-success');
    expect(icon?.getAttribute('class')).not.toContain('text-warning');
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

  /**
   * تغطية دمج 2026-09-18: الحكم والتوصية معاً فى بطاقة واحدة («غير متوافق»
   * و«غير موصى به»)، وrisk_note لا يُعرض إطلاقاً عند توفر recommendation
   * (يُستبدَل بـreasoning وحده لتفادى تكرار نفس الشرح — راجع تعليق
   * GovernanceRecommendationCard).
   */
  it('يدمج شارتى الحكم والتوصية فى بطاقة واحدة، ويعرض العقوبة المطبَّقة، ويُسقط risk_note لصالح reasoning', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: غير متوافق/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('status', { name: /التوصية: غير موصى به/ })).toBeInTheDocument();
    expect(screen.getByText(NON_COMPLIANT_WITH_RECOMMENDATION_RESPONSE.recommendation!.reasoning)).toBeInTheDocument();
    expect(screen.queryByText(NON_COMPLIANT_RESPONSE.risk_note)).not.toBeInTheDocument();
    expect(screen.getByText('العقوبة المطبَّقة')).toBeInTheDocument();
    expect(screen.getByText(/يعاقب بالحبس والغرامة كل من يخالف أحكام المادتين/)).toBeInTheDocument();
  }, 15000);

  /**
   * تحديث 2026-09-18 (بطلب صريح ثانٍ من صاحب المشروع): «ترتيب القوانين، وضع
   * مواد القانون الواحد فى رسالة واحدة». مادتا نفس القانون (80/2002) يجب أن
   * تظهرا تحت عنوان قانون واحد فقط، والقوانين المختلفة تُرتَّب تصاعدياً برقم
   * القانون (80 قبل 161) بصرف النظر عن ترتيب ورودها فى الاستجابة.
   */
  it('يجمع مواد نفس القانون فى بطاقة واحدة، ويرتب بطاقات القوانين تصاعدياً برقم القانون', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(MULTI_LAW_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByText('المواد المستشهد بها')).toBeInTheDocument();
    });

    // قانون 80/2002 يظهر مرة واحدة فقط رغم احتوائه مادتين (12 و15)
    expect(screen.getAllByText(/قانون مكافحة غسل الأموال 80\/2002/)).toHaveLength(1);
    expect(screen.getByText('المادة 12')).toBeInTheDocument();
    expect(screen.getByText('المادة 15')).toBeInTheDocument();

    // بطاقتان منفصلتان فقط (قانون 80، وقرار 161) — لا 3 بطاقات لكل مادة على حدة
    expect(screen.getAllByRole('region', { name: 'بطاقة قانون مستشهد به' })).toHaveLength(2);

    const html = document.body.innerHTML;
    const law80Index = html.indexOf('قانون مكافحة غسل الأموال 80/2002');
    const law161Index = html.indexOf('161/2024');
    expect(law80Index).toBeGreaterThan(-1);
    expect(law161Index).toBeGreaterThan(-1);
    expect(law80Index).toBeLessThan(law161Index); // ترتيب تصاعدى برقم القانون: 80 قبل 161
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

  it('يعرض بطاقة الحكم القديمة (verdict + risk_note بمفردهما) بلا بطاقة توصية مدموجة عندما recommendation غائب (استجابات قديمة قبل 2026-09-18)', async () => {
    const user = userEvent.setup();
    mockedAssess.mockResolvedValue(NON_COMPLIANT_RESPONSE);
    render(<GovernanceScreen />);

    await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), VALID_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /الحكم: غير متوافق/ })).toBeInTheDocument();
    });
    expect(screen.getByText(NON_COMPLIANT_RESPONSE.risk_note)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'بطاقة الحكم والتوصية' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /التوصية:/ })).not.toBeInTheDocument();
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
