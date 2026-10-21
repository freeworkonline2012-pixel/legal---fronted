/**
 * مركز العميل فى العقد (استيضاح قبل رفع العقد للتدقيق): نوع العقد ثم صفة المستخدم فيه.
 *
 * يُعاد استخدام بطاقة الاستيضاح نفسها (ClarificationCard) المستخدمة فى الأسئلة العامة، بأسئلة
 * ثابتة بلا استدعاء نموذج لغوى: السؤال الأول عن النوع، والثانى (بخيارات تتبع النوع) عن الصفة.
 * «أخرى» تقبل نصاً حراً، و«لا أعرف»/التخطّى = تدقيق محايد كما كان قبل هذه الميزة.
 */
import type { ClarificationAnswerPayload, ClarificationQuestion } from '@/lib/types';

export type ClientParty = 'first' | 'second';

export interface ContractPosition {
  contract_type: string | null;
  client_role: string | null;
  /** أى الطرفين فى نص العقد هو العميل؛ بلا ذلك يخمّن الخادم من يُحمى فى الصياغة المقترحة فيخطئ أحياناً. */
  client_party: ClientParty | null;
}

export const NEUTRAL_POSITION: ContractPosition = { contract_type: null, client_role: null, client_party: null };

export const PARTY_FIRST = 'الطرف الأول';
export const PARTY_SECOND = 'الطرف الثانى';

interface ContractTypeDef {
  label: string;
  roles: string[];
}

export const CONTRACT_TYPES: readonly ContractTypeDef[] = [
  { label: 'عقد إيجار', roles: ['المؤجر (المالك)', 'المستأجر'] },
  { label: 'عقد بيع', roles: ['البائع', 'المشترى'] },
  {
    label: 'عقد خدمات أو مقاولة أو توريد',
    roles: ['مقدم الخدمة (المقاول / المورد)', 'طالب الخدمة (صاحب العمل / العميل)'],
  },
  { label: 'عقد عمل', roles: ['صاحب العمل', 'العامل'] },
  { label: 'عقد شراكة أو استثمار', roles: ['الشريك المستثمر', 'الشريك المدير أو صاحب المشروع'] },
  { label: 'عقد تمويل أو قرض', roles: ['الممول (الدائن)', 'المقترض (المدين)'] },
  { label: 'عقد وكالة أو سمسرة أو تسويق', roles: ['الموكِّل (صاحب المنتج أو الخدمة)', 'الوكيل أو السمسار'] },
  { label: 'عقد ترخيص أو امتياز تجارى', roles: ['مانح الترخيص', 'المرخَّص له'] },
];

const GENERIC_ROLES = [
  'الطرف الذى يقدّم الأداء الرئيسى (مؤجر / بائع / مقدم خدمة...)',
  'الطرف الذى يتلقى الأداء الرئيسى (مستأجر / مشترٍ / طالب خدمة...)',
];

export const TYPE_QUESTION_TEXT = 'ما نوع العقد الذى تريد تدقيقه؟';
export const ROLE_QUESTION_TEXT = 'ما صفتك فى هذا العقد؟';
export const PARTY_QUESTION_TEXT = 'فى نص العقد المرفوع، هل أنت «الطرف الأول» أم «الطرف الثانى»؟';

export function contractTypeQuestion(): ClarificationQuestion {
  return {
    id: 'contract_type',
    question: TYPE_QUESTION_TEXT,
    why: 'يحدد النصوص القانونية الأنسب لمراجعة بنوده.',
    options: CONTRACT_TYPES.map((t) => t.label),
    allow_multiple: false,
  };
}

/** سؤال الصفة: خيارات النوع المختار، أو خيارات عامة إن كان النوع «أخرى» أو «لا أعرف». */
export function clientRoleQuestion(typeAnswer: string | null): ClarificationQuestion {
  const def = CONTRACT_TYPES.find((t) => t.label === typeAnswer);
  return {
    id: 'client_role',
    question: ROLE_QUESTION_TEXT,
    why: 'نراجع البنود ونقترح الصياغة من منظور مركزك فى العقد.',
    options: def ? def.roles : GENERIC_ROLES,
    allow_multiple: false,
  };
}

/** سؤال الطرف: ثابت. تكفى مراجعة أول صفحة من العقد (ديباجة الأطراف) للجزم. */
export function clientPartyQuestion(): ClarificationQuestion {
  return {
    id: 'client_party',
    question: PARTY_QUESTION_TEXT,
    why: 'الصفة وحدها لا تكفى: قد يكون «الطرف الأول» فى نص العقد هو مقدم الخدمة أو البائع أو المستأجر، فنحمى الطرف الصحيح فى الصياغة المقترحة.',
    options: [PARTY_FIRST, PARTY_SECOND],
    allow_multiple: false,
  };
}

/** «الطرف الأول»/«الطرف الثانى» بالنص المطابق فقط؛ «لا أعرف» أو نص حر = null (لا تخمين). */
export function partyFromAnswer(answer: ClarificationAnswerPayload | null | undefined): ClientParty | null {
  const text = answerText(answer);
  if (text === PARTY_FIRST) return 'first';
  if (text === PARTY_SECOND) return 'second';
  return null;
}

/** نص الإجابة المفيد (فارغ/«لا أعرف» = null) */
export function answerText(answer: ClarificationAnswerPayload | null | undefined): string | null {
  if (!answer || answer.kind === 'unknown') return null;
  const text = answer.answer.trim();
  return text.length > 0 ? text : null;
}

export function positionFromAnswers(
  typeAnswer: ClarificationAnswerPayload | null,
  roleAnswer: ClarificationAnswerPayload | null,
  partyAnswer: ClarificationAnswerPayload | null = null,
): ContractPosition {
  const client_role = answerText(roleAnswer);
  return {
    contract_type: answerText(typeAnswer),
    client_role,
    client_party: client_role ? partyFromAnswer(partyAnswer) : null,
  };
}

/** وصف مقروء: «المستأجر — عقد إيجار»، أو null إن لم تُحدَّد الصفة */
export function describeContractPosition(p: ContractPosition | null | undefined): string | null {
  if (!p?.client_role) return null;
  const base = p.contract_type ? `${p.client_role} — ${p.contract_type}` : p.client_role;
  if (p.client_party === 'first') return `${base} (${PARTY_FIRST} فى نص العقد)`;
  if (p.client_party === 'second') return `${base} (${PARTY_SECOND} فى نص العقد)`;
  return base;
}
