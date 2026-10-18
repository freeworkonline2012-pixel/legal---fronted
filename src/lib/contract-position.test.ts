import {
  CONTRACT_TYPES,
  clientRoleQuestion,
  contractTypeQuestion,
  describeContractPosition,
  positionFromAnswers,
} from './contract-position';

describe('contract-position', () => {
  it('سؤال النوع يعرض كل الأنواع المعرَّفة', () => {
    const q = contractTypeQuestion();
    expect(q.options).toEqual(CONTRACT_TYPES.map((t) => t.label));
    expect(q.allow_multiple).toBe(false);
  });

  it('سؤال الصفة يتبع النوع المختار', () => {
    expect(clientRoleQuestion('عقد إيجار').options).toEqual(['المؤجر (المالك)', 'المستأجر']);
    expect(clientRoleQuestion('عقد بيع').options).toEqual(['البائع', 'المشترى']);
  });

  it('نوع «أخرى» أو غير معروف يعطى خيارات عامة من طرفين', () => {
    expect(clientRoleQuestion('عقد نشر وتوزيع').options).toHaveLength(2);
    expect(clientRoleQuestion(null).options).toHaveLength(2);
  });

  it('يحوّل الإجابات إلى مركز، و«لا أعرف» إلى null', () => {
    expect(
      positionFromAnswers(
        { question: 'q', answer: 'عقد إيجار', kind: 'option' },
        { question: 'r', answer: 'المستأجر', kind: 'option' },
      ),
    ).toEqual({ contract_type: 'عقد إيجار', client_role: 'المستأجر' });
    expect(
      positionFromAnswers(
        { question: 'q', answer: '', kind: 'unknown' },
        { question: 'r', answer: 'ناشر', kind: 'custom' },
      ),
    ).toEqual({ contract_type: null, client_role: 'ناشر' });
  });

  it('يصف المركز، وبلا صفة = null', () => {
    expect(describeContractPosition({ contract_type: 'عقد إيجار', client_role: 'المستأجر' })).toBe(
      'المستأجر — عقد إيجار',
    );
    expect(describeContractPosition({ contract_type: 'عقد إيجار', client_role: null })).toBeNull();
    expect(describeContractPosition(null)).toBeNull();
  });
});
