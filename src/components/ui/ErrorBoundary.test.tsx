import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

/** مكوّن يرمي خطأً دائماً أثناء العرض — لمحاكاة «الشاشة البيضاء» */
function Bomb(): never {
  throw new Error('render failure (محاكاة)');
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // React يسجّل خطأ العرض في console — نخفيه حتى لا يلوّث مخرجات الاختبار
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('يعرض واجهة الخطأ بدل الشاشة البيضاء عند خطأ عرض', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة تحميل الصفحة/ })).toBeInTheDocument();
  });

  it('يعرض المحتوى الطبيعي عندما لا يوجد خطأ', () => {
    render(
      <ErrorBoundary>
        <p>محتوى سليم</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('عند تمرير onReset يستعيد المحتوى بعد الضغط بدل إعادة التحميل الكاملة', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();

    // نتحقق فقط من أن الضغط يستدعي onReset (بدون إعادة تحميل window)
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /إعادة تحميل الصفحة/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
