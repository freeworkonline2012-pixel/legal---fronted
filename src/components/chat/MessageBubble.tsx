/**
 * مكوّن MessageBubble — فقاعة رسالة (component_states.md القسم 15).
 *
 * - فقاعة السؤال: على اليسار (RTL) — خلفية primary_soft، زاوية 12px (سفلية يمنى 4px).
 * - فقاعة الإجابة: على اليمين (RTL) — خلفية surface، حدود border_default.
 * - عبر self-end/self-start تنعكس المحاذاة تلقائياً عند تبديل dir (RTL↔LTR).
 */

import type { ReactNode } from 'react';

export interface MessageBubbleProps {
  role: 'user' | 'assistant';
  children: ReactNode;
}

export function MessageBubble({ role, children }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg p-4 sm:max-w-[75%] ${
          isUser
            ? 'rounded-br-sm bg-primary-soft text-text-primary'
            : 'rounded-bl-sm border border-border-default bg-surface text-text-primary'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
