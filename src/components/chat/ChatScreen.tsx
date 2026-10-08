/**
 * مكوّن ChatScreen — الشاشة الرئيسية للمحادثة (S-02/S-03/S-04/S-05).
 *
 * ينسّق:
 * - S-02: ترحيب + أسئلة مقترحة + حقل السؤال + الخصوصية.
 * - S-03: مؤشر التقدم المرحلي النصي (بحث ← تحقق ← توليد) + Skeleton للاستشهاد.
 * - S-04: الإجابة الموثّقة (AnswerCard).
 * - S-05: الرفض/الثقة المنخفضة (RefusalCard) — لا طريق مسدود.
 * - حالات الخطأ: رسالة + إعادة محاولة (لا طريق مسدود).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Sparkles, WifiOff } from 'lucide-react';
import type {
  ClarificationAnswerPayload,
  ClarificationRequest,
  ClarificationState,
  QuestionAnswerResponse,
} from '@/lib/types';
import { postQuestion } from '@/lib/api-client';
import { MainSidebar } from '@/components/layout/MainSidebar';
import { QuestionInput } from './QuestionInput';
import { MessageBubble } from './MessageBubble';
import { AnswerCard } from './AnswerCard';
import { RefusalCard } from './RefusalCard';
import { ClarificationCard } from './ClarificationCard';
import { ProgressSteps, DEFAULT_PROGRESS_STEPS } from '@/components/ui/ProgressSteps';
import { CitationCardSkeleton } from '@/components/ui/Skeleton';
import { SuggestedQuestion } from '@/components/ui/SuggestedQuestion';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Button } from '@/components/ui/Button';
import { DEMO_SUGGESTED_QUESTIONS } from '@/lib/demo-data';
import { useToast } from '@/components/ui/Toast';

type ChatStatus = 'idle' | 'loading' | 'answered' | 'refused' | 'clarifying' | 'error';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  kind: 'text' | 'answer' | 'refusal' | 'progress' | 'clarification';
  content: string;
  answer?: QuestionAnswerResponse;
  error?: string;
  /** أسئلة الاستيضاح (kind='clarification') */
  clarification?: ClarificationRequest;
  /** أُجيبت البطاقة (إجابات) أو تُخطّيت — تُعرض للقراءة فقط */
  clarificationResolved?: ClarificationAnswerPayload[] | 'skipped' | 'superseded';
}

/** آخر طلب أُرسل فعلياً (السؤال الأصلى + حالة الاستيضاح) — لإعادة المحاولة بنفس السياق. */
interface LastRequest {
  question: string;
  clarification?: ClarificationState;
}

const PROGRESS_TICK_MS = 1400;
const MAX_PROGRESS_INDEX = DEFAULT_PROGRESS_STEPS.length - 1;

let messageCounter = 0;

export interface ChatScreenProps {
  /** سؤال مبدئي يُملأ في الحقل (من ?q= في صفحة /chat) */
  initialQuestion?: string;
}

export function ChatScreen({ initialQuestion = '' }: ChatScreenProps) {
  const [inputValue, setInputValue] = useState(initialQuestion);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [progressIndex, setProgressIndex] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [activeConversation, setActiveConversation] = useState('conv-1');
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);
  /** الإجابات المتراكمة عبر جولات الاستيضاح للسؤال الجارى (تُصفَّر مع كل سؤال جديد). */
  const clarificationAnswersRef = useRef<ClarificationAnswerPayload[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const conversations = [
    { id: 'conv-1', title: 'نزاع عمل', active: true },
    { id: 'conv-2', title: 'نفقة' },
    { id: 'conv-3', title: 'إيجار' },
  ];

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  function startProgress() {
    setProgressIndex(0);
    progressTimerRef.current = setInterval(() => {
      setProgressIndex((prev) => Math.min(prev + 1, MAX_PROGRESS_INDEX));
    }, PROGRESS_TICK_MS);
  }

  function stopProgress() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  async function ask(questionText: string) {
    const trimmed = questionText.trim();
    if (trimmed.length < 3 || status === 'loading') return;

    const userMessage: ChatMessage = {
      id: `msg-${++messageCounter}`,
      role: 'user',
      kind: 'text',
      content: trimmed,
    };

    setMessages((prev) => {
      // عند إرسال سؤال جديد: نُزيل فقاعات الخطأ القديمة من الخيط. كان زر
      // «إعادة المحاولة» القديم يبقى بعد سؤال لاحق ناجح، ويعيد إرسال آخر سؤال
      // مستخدم (وليس السؤال الفاشل أصلاً) — سلوك مضلل. السؤال الجديد نفسه هو
      // «المحاولة» الجديدة، فتبقى الفقاعة الوحيدة للفشل الحالي إن حدث.
      return prev
        .filter((message) => !message.error)
        .map((message) =>
          message.kind === 'clarification' && !message.clarificationResolved
            ? { ...message, clarificationResolved: 'superseded' as const }
            : message,
        )
        .concat(userMessage);
    });
    setInputValue('');
    // سؤال جديد = استيضاح جديد من الصفر (أى بطاقة معلّقة قبله تُهمَل).
    clarificationAnswersRef.current = [];
    await send({ question: trimmed });
  }

  /**
   * دورة الطلب الواحدة: إرسال السؤال (مع حالة الاستيضاح إن وُجدت) ثم عرض الإجابة أو الرفض أو
   * بطاقة استيضاح جديدة. لا تُضيف فقاعة سؤال (تُضيفها ask فقط عند سؤال جديد).
   */
  async function send(request: LastRequest) {
    lastRequestRef.current = request;
    setStatus('loading');
    startProgress();

    try {
      const response = await postQuestion({
        question: request.question,
        conversation_id: conversationId,
        ...(request.clarification ? { clarification: request.clarification } : {}),
      });

      if (response.clarification && response.clarification.questions.length > 0) {
        const clarificationMessage: ChatMessage = {
          id: `msg-${++messageCounter}`,
          role: 'assistant',
          kind: 'clarification',
          content: response.answer,
          clarification: response.clarification,
        };
        setMessages((prev) => [...prev, clarificationMessage]);
        setStatus('clarifying');
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${++messageCounter}`,
        role: 'assistant',
        kind: response.refused ? 'refusal' : 'answer',
        content: response.answer,
        answer: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStatus(response.refused ? 'refused' : 'answered');
    } catch {
      const errorMessage: ChatMessage = {
        id: `msg-${++messageCounter}`,
        role: 'assistant',
        kind: 'text',
        content: '',
        error: 'تعذّر الاتصال بخدمة الإجابة — تأكد من تشغيل الخادم وحاول مرة أخرى.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStatus('error');
      showToast('error', 'تعذّر الاتصال بالخادم — حاول مرة أخرى.');
    } finally {
      stopProgress();
    }
  }

  /** السؤال الأصلى للاستيضاح الجارى = آخر سؤال مستخدم كتبه السائل. */
  function currentQuestion(): string | null {
    return lastRequestRef.current?.question ?? null;
  }

  function resolveClarification(messageId: string, resolved: ClarificationAnswerPayload[] | 'skipped') {
    setMessages((prev) =>
      prev.map((message) => (message.id === messageId ? { ...message, clarificationResolved: resolved } : message)),
    );
  }

  function handleClarificationSubmit(message: ChatMessage, answers: ClarificationAnswerPayload[]) {
    const question = currentQuestion();
    if (!question || !message.clarification || status === 'loading') return;
    const cumulative = [...clarificationAnswersRef.current, ...answers];
    clarificationAnswersRef.current = cumulative;
    resolveClarification(message.id, answers);
    void send({ question, clarification: { round: message.clarification.round, answers: cumulative } });
  }

  function handleClarificationSkip(message: ChatMessage) {
    const question = currentQuestion();
    if (!question || !message.clarification || status === 'loading') return;
    resolveClarification(message.id, 'skipped');
    void send({
      question,
      clarification: {
        round: message.clarification.round,
        skip: true,
        answers: clarificationAnswersRef.current,
      },
    });
  }

  /**
   * «إعادة المحاولة» في فقاعة الخطأ — تُعيد إرسال آخر سؤال مستخدم فشل طلبه فعلياً
   * (كانت النسخة السابقة تكتفي بإعادة الحالة إلى idle دون إعادة الإرسال — سلوك
   * مخالف لتسمية الزر). تُزال فقاعة الخطأ أولاً حتى لا تتكدس الرسائل.
   */
  function handleRetry() {
    // نفس الطلب بالضبط (بما فيه حالة الاستيضاح) — لا فقاعة سؤال جديدة.
    const lastRequest = lastRequestRef.current;
    if (!lastRequest) {
      setStatus('idle');
      return;
    }
    setMessages((prev) => prev.filter((message) => !message.error));
    void send(lastRequest);
  }

  function handleRephrase() {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (lastUserMessage) {
      setInputValue(lastUserMessage.content);
      setStatus('idle');
      showToast('info', 'عدّل سؤالك ثم أعد الإرسال.');
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <MainSidebar
        conversations={conversations}
        activeConversationId={activeConversation}
        onSelect={(id) => setActiveConversation(id)}
        onNewConversation={() => {
          setMessages([]);
          setStatus('idle');
          lastRequestRef.current = null;
          clarificationAnswersRef.current = [];
          setConversationId(undefined);
          setInputValue('');
          setActiveConversation(`conv-${Date.now()}`);
        }}
      />

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
        {/* حالة الترحيب (S-02 الفارغة) */}
        {messages.length === 0 ? (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
              <h1 className="text-h2 font-bold text-text-primary">أهلاً بك 👋</h1>
              <p className="max-w-md text-body text-text-secondary">
                اسألنا عن حقك القانوني بلغة بسيطة — نرجع لك إجابة موثّقة بالمصدر أو نرفض
                بصراحة إن لم نجد نصاً كافياً (لا تخمين أبداً).
              </p>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
              {DEMO_SUGGESTED_QUESTIONS.map((suggestion) => (
                <SuggestedQuestion
                  key={suggestion.id}
                  question={suggestion.text}
                  domain={suggestion.domain}
                  onClick={() => {
                    setInputValue(suggestion.text);
                  }}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-4" aria-live="polite">
            {messages.map((message) => {
              if (message.kind === 'progress' || (message.role === 'assistant' && status === 'loading' && message.kind === 'text')) {
                return null;
              }
              if (message.role === 'user') {
                return (
                  <MessageBubble key={message.id} role="user">
                    <p className="text-body">{message.content}</p>
                  </MessageBubble>
                );
              }
              if (message.kind === 'answer' && message.answer) {
                return (
                  <MessageBubble key={message.id} role="assistant">
                    <AnswerCard
                      answer={message.answer}
                      onFollowUpClick={(question) => setInputValue(question)}
                    />
                  </MessageBubble>
                );
              }
              if (message.kind === 'clarification' && message.clarification) {
                return (
                  <MessageBubble key={message.id} role="assistant">
                    <ClarificationCard
                      request={message.clarification}
                      resolvedAnswers={message.clarificationResolved}
                      disabled={status === 'loading'}
                      onSubmit={(answers) => handleClarificationSubmit(message, answers)}
                      onSkip={() => handleClarificationSkip(message)}
                    />
                  </MessageBubble>
                );
              }
              if (message.kind === 'refusal' && message.answer) {
                return (
                  <MessageBubble key={message.id} role="assistant">
                    <RefusalCard
                      answer={message.answer}
                      onRephrase={handleRephrase}
                      onAskHuman={() => showToast('info', 'سيتم توفير التحويل لمحامٍ بشري قريباً — المرحلة الثانية.')}
                      onAskAnotherDomain={() => setStatus('idle')}
                    />
                  </MessageBubble>
                );
              }
              if (message.error) {
                return (
                  <MessageBubble key={message.id} role="assistant">
                    <div role="alert" className="flex flex-col items-start gap-3">
                      <div className="flex items-start gap-2">
                        <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
                        <p className="text-body text-text-primary">{message.error}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleRetry}>
                        إعادة المحاولة
                      </Button>
                    </div>
                  </MessageBubble>
                );
              }
              return null;
            })}

            {/* مؤشر التقدم المرحلي (S-03) */}
            {status === 'loading' ? (
              <MessageBubble role="assistant">
                <div className="space-y-4">
                  <ProgressSteps currentIndex={progressIndex} />
                  <CitationCardSkeleton />
                </div>
              </MessageBubble>
            ) : null}

            {/* شريط تحذير عند فشل سابق — يبقى حتى سؤال جديد ناجح */}
            {status === 'error' ? (
              <div role="alert" className="flex items-center gap-2 rounded-md bg-error-soft px-3 py-2 text-body-sm text-error">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>حدث خطأ في آخر طلب — يمكنك إعادة المحاولة من الزر أعلاه.</span>
              </div>
            ) : null}
          </div>
        )}

        {/* منطقة الإدخال */}
        <div className="mt-6 space-y-3">
          <QuestionInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={ask}
            loading={status === 'loading'}
          />
          <DisclaimerBanner />
        </div>

        <div ref={bottomRef} />
      </main>
    </div>
  );
}
