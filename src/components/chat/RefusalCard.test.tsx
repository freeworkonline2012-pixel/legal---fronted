import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefusalCard } from './RefusalCard';
import { DEMO_REFUSAL } from '@/lib/demo-data';
import type { QuestionAnswerResponse } from '@/lib/types';

describe('RefusalCard', () => {
  it('يعرض رسالة الرفض وشارة الثقة المنخفضة', () => {
    render(<RefusalCard answer={DEMO_REFUSAL} />);
    expect(screen.getByRole('status')).toHaveTextContent('ثقة منخفضة');
    expect(screen.getByText(/لن نخمّن/)).toBeInTheDocument();
  });

  it('يعرض ثلاث خطوات تالية (لا طريق مسدود)', () => {
    render(<RefusalCard answer={DEMO_REFUSAL} />);
    expect(screen.getByRole('button', { name: /أعد صياغة السؤال/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /حوّل لمحامٍ بشري/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اسأل في مجال آخر/ })).toBeInTheDocument();
  });

  it('يستدعي onRephrase عند النقر', async () => {
    const user = userEvent.setup();
    const onRephrase = jest.fn();
    render(<RefusalCard answer={DEMO_REFUSAL} onRephrase={onRephrase} />);
    await user.click(screen.getByRole('button', { name: /أعد صياغة السؤال/ }));
    expect(onRephrase).toHaveBeenCalledTimes(1);
  });

  it('لا يعرض قسم البحث الاحتياطى عند غياب web_fallback (السلوك الافتراضى الحالى)', () => {
    render(<RefusalCard answer={DEMO_REFUSAL} />);
    expect(screen.queryByLabelText('نتيجة بحث ويب احتياطية غير موثَّقة')).not.toBeInTheDocument();
  });

  it('يعرض نتيجة البحث الاحتياطى والمصادر عند وجود web_fallback', () => {
    const withFallback: QuestionAnswerResponse = {
      ...DEMO_REFUSAL,
      web_fallback: {
        answer:
          'وفقاً لمصدر رسمى، الحد الأقصى الحالى هو 266 ألف جنيه [1].\n\n⚠️ تنويه: هذه المعلومة غير مؤكَّدة من قاعدة بياناتنا القانونية المُراجَعة.',
        provider: 'tavily',
        sources: [
          {
            title: 'قرار مجلس إدارة الهيئة رقم 17 لسنة 2025',
            url: 'https://fra.gov.eg/example.pdf',
            snippet: 'رفع الحد الأقصى...',
          },
        ],
      },
    };

    render(<RefusalCard answer={withFallback} />);

    expect(screen.getByLabelText('نتيجة بحث ويب احتياطية غير موثَّقة')).toBeInTheDocument();
    expect(screen.getByText(/266 ألف جنيه/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /قرار مجلس إدارة الهيئة رقم 17 لسنة 2025/ }),
    ).toHaveAttribute('href', 'https://fra.gov.eg/example.pdf');
  });
});
