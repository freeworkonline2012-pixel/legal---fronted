import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractsScreen } from './ContractsScreen';
import { ApiError } from '@/lib/api-client';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { AuthResponse, ContractResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    uploadContract: jest.fn(),
  };
});

import { uploadContract } from '@/lib/api-client';

const mockedUpload = uploadContract as jest.MockedFunction<typeof uploadContract>;

const SESSION: AuthResponse = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  user: {
    id: 'u-1',
    email: 'user@example.com',
    full_name: null,
    role: 'user',
    created_at: '2026-01-01T10:00:00.000Z',
  },
};

const PROCESSED_RESPONSE: ContractResponse = {
  id: 'contract-1',
  original_filename: 'test-contract.docx',
  status: 'processed',
  extraction_error: null,
  clause_count: 2,
  warnings: [],
  clauses: [
    {
      id: 'clause-1',
      clause_index: 1,
      clause_label: 'البند الأول',
      clause_title: 'مدة العقد',
      clause_type_guess: null,
      clause_text: 'نص البند الأول.',
      assessment_status: 'سليم',
      assessment_reasoning: 'لا تعارض مع النص القانونى المسترجَع.',
      matched_articles: [],
      assessment_confidence: 0.8,
    },
    {
      id: 'clause-2',
      clause_index: 2,
      clause_label: 'البند الثانى',
      clause_title: null,
      clause_type_guess: null,
      clause_text: 'نص البند الثانى.',
      assessment_status: 'لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة',
      assessment_reasoning: 'لا توجد مادة قانونية مصرية مفهرَسة ذات صلة مباشرة بموضوع هذا البند حتى الآن.',
      matched_articles: [],
      assessment_confidence: 0,
    },
  ],
  created_at: '2026-09-05T10:00:00.000Z',
};

const EXTRACTION_FAILED_RESPONSE: ContractResponse = {
  id: 'contract-2',
  original_filename: 'scanned.pdf',
  status: 'extraction_failed',
  extraction_error: 'لم يُستخرَج نص كافٍ من الملف — على الأرجح PDF ممسوح ضوئياً.',
  clause_count: null,
  created_at: '2026-09-05T10:00:00.000Z',
};

function makeFile(name: string, sizeBytes = 1024, type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'): File {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 1024))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('ContractsScreen', () => {
  beforeEach(() => {
    mockedUpload.mockReset();
    clearAuthSession();
  });

  it('يعرض دعوة لتسجيل الدخول بدل نموذج الرفع عند غياب الجلسة', async () => {
    render(<ContractsScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.queryByLabelText('ملف العقد')).not.toBeInTheDocument();
  });

  it('يعرض نموذج الرفع والتنبيه الدائم عند وجود جلسة', async () => {
    setAuthSession(SESSION);
    render(<ContractsScreen />);
    expect(await screen.findByLabelText('ملف العقد')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/القانون المدنى المصرى.*غير مفهرَس بعد/);
  });

  it('يرفض ملفاً بامتداد غير مدعوم قبل استدعاء الخادم', async () => {
    setAuthSession(SESSION);
    // applyAccept:false — يحاكي إفلات ملف (drag & drop) أو اختيار "كل الملفات"
    // من حوار النظام، وهو المسار الحقيقى الذى يتجاوز فلترة accept فى المتصفح
    // فعلاً ويجعل هذا التحقق البرمجى ذا قيمة حقيقية لا زائدة عن الحاجة.
    const user = userEvent.setup({ applyAccept: false });
    render(<ContractsScreen />);
    const input = await screen.findByLabelText('ملف العقد');
    await user.upload(input, makeFile('contract.txt', 1024, 'text/plain'));

    expect(await screen.findByText(/نوع ملف غير مدعوم/)).toBeInTheDocument();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('يرفض ملفاً أكبر من 10 ميجابايت قبل استدعاء الخادم', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    render(<ContractsScreen />);
    const input = await screen.findByLabelText('ملف العقد');
    await user.upload(input, makeFile('big.docx', 11 * 1024 * 1024));

    expect(await screen.findByText(/الحد الأقصى 10 ميجابايت/)).toBeInTheDocument();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('يرفع عقداً صالحاً ويعرض بنوده وتقييمها عند النجاح', async () => {
    setAuthSession(SESSION);
    mockedUpload.mockResolvedValue(PROCESSED_RESPONSE);
    const user = userEvent.setup();
    render(<ContractsScreen />);

    const input = await screen.findByLabelText('ملف العقد');
    await user.upload(input, makeFile('test-contract.docx'));
    await user.click(screen.getByRole('button', { name: /رفع وتحليل العقد/ }));

    await waitFor(() => {
      expect(screen.getByText('test-contract.docx')).toBeInTheDocument();
    });
    expect(screen.getByText('2 بند تم استخراجه وتقييمه.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'البند الأول' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'البند الثانى' })).toBeInTheDocument();
    expect(mockedUpload).toHaveBeenCalledTimes(1);
  }, 15000);

  it('يعرض رسالة تعذُّر الاستخراج بدل قائمة بنود عند extraction_failed', async () => {
    setAuthSession(SESSION);
    mockedUpload.mockResolvedValue(EXTRACTION_FAILED_RESPONSE);
    const user = userEvent.setup();
    render(<ContractsScreen />);

    const input = await screen.findByLabelText('ملف العقد');
    await user.upload(input, makeFile('scanned.pdf', 1024, 'application/pdf'));
    await user.click(screen.getByRole('button', { name: /رفع وتحليل العقد/ }));

    await waitFor(() => {
      expect(screen.getByText('تعذَّر استخراج نص العقد')).toBeInTheDocument();
    });
    expect(screen.getByText(EXTRACTION_FAILED_RESPONSE.extraction_error!)).toBeInTheDocument();
  }, 15000);

  it('يعرض رسالة جلسة منتهية عند 401، ورسالة اتصال عامة عند فشل الشبكة', async () => {
    setAuthSession(SESSION);
    mockedUpload.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    const user = userEvent.setup();
    render(<ContractsScreen />);

    const input = await screen.findByLabelText('ملف العقد');
    await user.upload(input, makeFile('test-contract.docx'));
    await user.click(screen.getByRole('button', { name: /رفع وتحليل العقد/ }));

    expect(await screen.findByText(/انتهت صلاحية جلستك/)).toBeInTheDocument();
  }, 15000);

  it('يعيد تعيين النموذج عند الضغط على «تحليل عقد آخر»', async () => {
    setAuthSession(SESSION);
    mockedUpload.mockResolvedValue(PROCESSED_RESPONSE);
    const user = userEvent.setup();
    render(<ContractsScreen />);

    const input = await screen.findByLabelText('ملف العقد');
    await user.upload(input, makeFile('test-contract.docx'));
    await user.click(screen.getByRole('button', { name: /رفع وتحليل العقد/ }));

    await waitFor(() => {
      expect(screen.getByText('test-contract.docx')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /تحليل عقد آخر/ }));

    expect(screen.queryByText('test-contract.docx')).not.toBeInTheDocument();
  }, 15000);
});
