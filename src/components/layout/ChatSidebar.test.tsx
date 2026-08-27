/**
 * اختبارات ChatSidebar — الشريط الجانبي للمحادثات (S-02).
 *
 * يغطي:
 * - عرض قائمة المحادثات.
 * - استدعاء onSelect عند اختيار محادثة.
 * - استدعاء onNewConversation عند زر «محادثة جديدة».
 * - تمييز المحادثة النشطة بـ aria-current.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSidebar } from './ChatSidebar';

const CONVERSATIONS = [
  { id: 'c1', title: 'نزاع عمل' },
  { id: 'c2', title: 'نفقة' },
];

describe('ChatSidebar', () => {
  it('يعرض قائمة المحادثات وزر المحادثة الجديدة', () => {
    render(<ChatSidebar conversations={CONVERSATIONS} />);
    expect(screen.getByText('نزاع عمل')).toBeInTheDocument();
    expect(screen.getByText('نفقة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /محادثة جديدة/ })).toBeInTheDocument();
  });

  it('يستدعي onSelect بمعرّف المحادثة عند النقر', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<ChatSidebar conversations={CONVERSATIONS} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /نفقة/ }));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });

  it('يستدعي onNewConversation عند زر المحادثة الجديدة', async () => {
    const user = userEvent.setup();
    const onNewConversation = jest.fn();
    render(<ChatSidebar conversations={CONVERSATIONS} onNewConversation={onNewConversation} />);
    await user.click(screen.getByRole('button', { name: /محادثة جديدة/ }));
    expect(onNewConversation).toHaveBeenCalledTimes(1);
  });

  it('يعلّم المحادثة النشطة بـ aria-current="true"', () => {
    render(<ChatSidebar conversations={CONVERSATIONS} activeConversationId="c1" />);
    expect(screen.getByRole('button', { name: /نزاع عمل/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /نفقة/ })).not.toHaveAttribute('aria-current');
  });
});
