import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButtons } from './ExportButtons';
import { ApiError } from '@/lib/api-client';
import { clearAuthSession, setAuthSession } from '@/lib/auth';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, downloadExport: jest.fn() };
});

import { downloadExport } from '@/lib/api-client';

const mockedDownload = downloadExport as jest.MockedFunction<typeof downloadExport>;

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};

describe('ExportButtons', () => {
  beforeEach(() => {
    mockedDownload.mockReset();
    clearAuthSession();
  });

  it('الزائر يرى دعوة لتسجيل الدخول لا أزرار تنزيل', async () => {
    render(<ExportButtons kind="answers" id="a-1" />);
    expect(await screen.findByRole('link', { name: 'سجّل الدخول' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('المسجَّل يرى زرّى PDF وWord ويستدعى التنزيل بالنوع والمعرّف والصيغة', async () => {
    setAuthSession(SESSION);
    mockedDownload.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ExportButtons kind="answers" id="a-1" label="تنزيل الإجابة" />);

    await user.click(await screen.findByRole('button', { name: 'تنزيل الإجابة بصيغة PDF' }));
    expect(mockedDownload).toHaveBeenCalledWith('answers', 'a-1', 'pdf');

    await user.click(screen.getByRole('button', { name: 'تنزيل الإجابة بصيغة Word' }));
    expect(mockedDownload).toHaveBeenLastCalledWith('answers', 'a-1', 'docx');
  });

  it('زر النسخة المتتبَّعة يظهر للعقود فقط وبطلب صريح، ويستدعى التنزيل بصيغة tracked', async () => {
    setAuthSession(SESSION);
    mockedDownload.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { rerender } = render(<ExportButtons kind="contracts" id="c-1" label="تنزيل تقرير المراجعة" />);
    await screen.findByRole('button', { name: /بصيغة PDF/ });
    expect(screen.queryByRole('button', { name: /متتبَّعة/ })).not.toBeInTheDocument();

    rerender(<ExportButtons kind="answers" id="a-1" trackedChanges />);
    expect(screen.queryByRole('button', { name: /متتبَّعة/ })).not.toBeInTheDocument();

    rerender(<ExportButtons kind="contracts" id="c-1" label="تنزيل تقرير المراجعة" trackedChanges />);
    await user.click(await screen.findByRole('button', { name: 'تنزيل تقرير المراجعة بصيغة Word بتعديلات متتبَّعة' }));
    expect(mockedDownload).toHaveBeenCalledWith('contracts', 'c-1', 'tracked');
  });

  it('يعرض رسالة الفشل ويعيد تمكين الأزرار', async () => {
    setAuthSession(SESSION);
    mockedDownload.mockRejectedValue(new ApiError(409, 'التقرير قيد المراجعة البشرية وسيتاح للتنزيل فور اعتماده.'));
    const user = userEvent.setup();
    render(<ExportButtons kind="contracts" id="c-1" />);

    await user.click(await screen.findByRole('button', { name: /بصيغة PDF/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('قيد المراجعة البشرية');
    await waitFor(() => expect(screen.getByRole('button', { name: /بصيغة Word/ })).toBeEnabled());
  });

  it('يمنع تنزيلين متزامنين أثناء التحميل', async () => {
    setAuthSession(SESSION);
    let resolve: () => void = () => undefined;
    mockedDownload.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<ExportButtons kind="governance" id="g-1" />);

    await user.click(await screen.findByRole('button', { name: /بصيغة PDF/ }));
    expect(screen.getByRole('button', { name: /بصيغة Word/ })).toBeDisabled();
    resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: /بصيغة Word/ })).toBeEnabled());
  });
});
