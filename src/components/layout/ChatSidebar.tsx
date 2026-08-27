/**
 * مكوّن ChatSidebar — الشريط الجانبي للمحادثات (S-02 في wireframes).
 *
 * - يظهر ≥ 1024px، عرض 280px.
 * - «محادثاتي» + قائمة المحادثات + زر «+ محادثة جديدة».
 */

'use client';

import { MessageSquarePlus } from 'lucide-react';

export interface ChatConversation {
  id: string;
  title: string;
  active?: boolean;
}

export interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeConversationId?: string;
  onSelect?: (id: string) => void;
  onNewConversation?: () => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNewConversation,
}: ChatSidebarProps) {
  return (
    <aside aria-label="محادثاتي" className="hidden w-[280px] shrink-0 flex-col border-e border-border-default bg-surface-muted lg:flex">
      <div className="flex items-center justify-between px-4 pt-6">
        <h2 className="text-h4 font-semibold text-text-primary">محادثاتي</h2>
      </div>

      <ul className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;
          return (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelect?.(conversation.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-start text-body-sm transition-colors duration-[120ms] focus-visible:outline-none ${
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                <span aria-hidden="true" className={isActive ? 'text-primary' : 'text-text-tertiary'}>
                  ●
                </span>
                <span className="truncate">{conversation.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="p-3">
        <button
          type="button"
          onClick={onNewConversation}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-body-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-none"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          محادثة جديدة
        </button>
      </div>
    </aside>
  );
}
