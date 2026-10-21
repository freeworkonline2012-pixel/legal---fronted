import {
  CONTRACT_TYPES,
  clientPartyQuestion,
  clientRoleQuestion,
  contractTypeQuestion,
  partyFromAnswer,
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
    ).toEqual({ contract_type: 'عقد إيجار', client_role: 'المستأجر', client_party: null });
    expect(
      positionFromAnswers(
        { question: 'q', answer: '', kind: 'unknown' },
        { question: 'r', answer: 'ناشر', kind: 'custom' },
      ),
    ).toEqual({ contract_type: null, client_role: 'ناشر', client_party: null });
  });

  it('يصف المركز، وبلا صفة = null', () => {
    expect(describeContractPosition({ contract_type: 'عقد إيجار', client_role: 'المستأجر', client_party: null })).toBe(
      'المستأجر — عقد إيجار',
    );
    expect(describeContractPosition({ contract_type: 'عقد إيجار', client_role: null, client_party: null })).toBeNull();
    expect(describeContractPosition(null)).toBeNull();
  });
  it('سؤال الطرف: خياران ثابتان، ولا يُقبل إلا النص المطابق (لا تخمين من نص حر أو «لا أعرف»)', () => {
    expect(clientPartyQuestion().options).toEqual(['الطرف الأول', 'الطرف الثانى']);
    expect(partyFromAnswer({ question: 'q', answer: 'الطرف الثانى', kind: 'option' })).toBe('second');
    expect(partyFromAnswer({ question: 'q', answer: 'الطرف الأول', kind: 'option' })).toBe('first');
    expect(partyFromAnswer({ question: 'q', answer: 'الشركة', kind: 'custom' })).toBeNull();
    expect(partyFromAnswer({ question: 'q', answer: '', kind: 'unknown' })).toBeNull();
  });

  it('الطرف يُحفظ مع الصفة فقط، ويظهر فى وصف المركز', () => {
    const type = { question: 'q', answer: 'عقد خدمات أو مقاولة أو توريد', kind: 'option' as const };
    const role = { question: 'r', answer: 'طالب الخدمة (صاحب العمل / العميل)', kind: 'option' as const };
    const party = { question: 'p', answer: 'الطرف الثانى', kind: 'option' as const };
    const pos = positionFromAnswers(type, role, party);
    expect(pos.client_party).toBe('second');
    expect(describeContractPosition(pos)).toBe(
      'طالب الخدمة (صاحب العمل / العميل) — عقد خدمات أو مقاولة أو توريد (الطرف الثانى فى نص العقد)',
    );
    expect(positionFromAnswers(type, { question: 'r', answer: '', kind: 'unknown' }, party).client_party).toBeNull();
  });
});
