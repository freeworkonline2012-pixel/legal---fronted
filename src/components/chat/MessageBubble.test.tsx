import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  it('يعرض محتوى فقاعة المستخدم (user)', () => {
    render(
      <MessageBubble role="user">
        <p>اتنفصلت من الشغل من غير إشعار</p>
      </MessageBubble>,
    );
    expect(screen.getByText('اتنفصلت من الشغل من غير إشعار')).toBeInTheDocument();
  });

  it('يعرض محتوى فقاعة المساعد (assistant)', () => {
    render(
      <MessageBubble role="assistant">
        <p>نعم، لك حق في تعويض</p>
      </MessageBubble>,
    );
    expect(screen.getByText('نعم، لك حق في تعويض')).toBeInTheDocument();
  });

  it('يعطي الفقاعتين تمييزاً بصرياً مختلفاً عبر class (لا لون وحده — النص هو الأساس)', () => {
    const { container } = render(
      <>
        <MessageBubble role="user">
          <p>سؤال</p>
        </MessageBubble>
        <MessageBubble role="assistant">
          <p>إجابة</p>
        </MessageBubble>
      </>,
    );
    // الغلاف الخارجي للفقاعة يحمل self-end (محاذاة RTL للمستخدم) أو self-start (المساعد)
    const wrappers = container.querySelectorAll('div.self-end, div.self-start');
    expect(wrappers.length).toBe(2);
    expect(wrappers[0].className).toContain('self-end');
    expect(wrappers[1].className).toContain('self-start');
  });
});
