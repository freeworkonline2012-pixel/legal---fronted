import { render, screen } from '@testing-library/react';
import { AnswerCard } from './AnswerCard';
import { DEMO_ANSWER, DEMO_REFUSAL } from '@/lib/demo-data';
import { clearAuthSession, setAuthSession } from '@/lib/auth';

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};

/** التنزيل لإجابة محفوظة وموثَّقة فقط — الرفض وبلا id وبلا استشهاد لا يظهر لها زر */
describe('AnswerCard — تنزيل الإجابة', () => {
  beforeEach(() => clearAuthSession());

  it('مسجَّل الدخول يرى أزرار التنزيل لإجابة موثَّقة', async () => {
    setAuthSession(SESSION);
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(await screen.findByRole('button', { name: 'تنزيل الإجابة بصيغة PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل الإجابة بصيغة Word' })).toBeInTheDocument();
  });

  it('الزائر يرى دعوة تسجيل الدخول بدل الأزرار', async () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(await screen.findByRole('link', { name: 'سجّل الدخول' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تنزيل الإجابة/ })).not.toBeInTheDocument();
  });

  it('لا يظهر التنزيل لإجابة مرفوضة', async () => {
    setAuthSession(SESSION);
    render(<AnswerCard answer={DEMO_REFUSAL} />);
    await screen.findByRole('button', { name: 'تقييم إيجابي' });
    expect(screen.queryByRole('button', { name: /تنزيل الإجابة/ })).not.toBeInTheDocument();
  });

  it('لا يظهر التنزيل بلا id أو بلا استشهادات', async () => {
    setAuthSession(SESSION);
    const { rerender } = render(<AnswerCard answer={{ ...DEMO_ANSWER, id: '' }} />);
    await screen.findByRole('button', { name: 'تقييم إيجابي' });
    expect(screen.queryByRole('button', { name: /تنزيل الإجابة/ })).not.toBeInTheDocument();

    rerender(<AnswerCard answer={{ ...DEMO_ANSWER, citations: [] }} />);
    expect(screen.queryByRole('button', { name: /تنزيل الإجابة/ })).not.toBeInTheDocument();
  });
});
