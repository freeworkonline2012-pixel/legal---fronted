import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceScreen } from './GovernanceScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { GovernanceAssessResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, postGovernanceAssess: jest.fn() };
});

import { postGovernanceAssess } from '@/lib/api-client';

const mockedAssess = postGovernanceAssess as jest.MockedFunction<typeof postGovernanceAssess>;

const DESCRIPTION =
  'شركة تمويل استهلاكى تنوي عدم إبلاغ وحدة مكافحة غسل الأموال عن عملية تحويل تتجاوز الحد المقرر';

const BASE: GovernanceAssessResponse = {
  verdict: 'غير متوافق',
  legal_basis: [],
  risk_note: 'عدم الإبلاغ يُعرِّض المؤسسة لعقوبات.',
};

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};

async function runAssessment(response: GovernanceAssessResponse) {
  mockedAssess.mockResolvedValue(response);
  const user = userEvent.setup();
  render(<GovernanceScreen />);
  await user.type(screen.getByLabelText(/وصف الإجراء أو القرار/), DESCRIPTION);
  await user.click(screen.getByRole('button', { name: 'تحقق الآن' }));
  await waitFor(() => expect(screen.getByRole('status', { name: /الحكم:/ })).toBeInTheDocument());
}

describe('GovernanceScreen — تنزيل التقييم', () => {
  beforeEach(() => {
    mockedAssess.mockReset();
    clearAuthSession();
  });

  it('يعرض أزرار التنزيل عند وجود assessment_id لمستخدم مسجَّل', async () => {
    setAuthSession(SESSION);
    await runAssessment({ ...BASE, assessment_id: 'asm-1' });
    expect(await screen.findByRole('button', { name: 'تنزيل التقييم بصيغة PDF' })).toBeInTheDocument();
  });

  it('لا يعرض شيئاً من التنزيل عند غياب assessment_id (زائر لم يُحفظ تقييمه)', async () => {
    await runAssessment(BASE);
    expect(screen.queryByRole('button', { name: /تنزيل التقييم/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/لتتمكن من تنزيل هذا المستند/)).not.toBeInTheDocument();
  });
});
