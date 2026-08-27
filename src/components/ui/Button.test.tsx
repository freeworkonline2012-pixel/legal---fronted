import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonLink } from './Button';

describe('Button', () => {
  it('يعرض النص الممرر', () => {
    render(<Button>اسأل</Button>);
    expect(screen.getByRole('button', { name: 'اسأل' })).toBeInTheDocument();
  });

  it('يعطّل الزر عند تمرير disabled', () => {
    render(<Button disabled>اسأل</Button>);
    expect(screen.getByRole('button', { name: 'اسأل' })).toBeDisabled();
  });

  it('يعرض حالة التحميل مع «جارٍ…» ويعطّل النقر', () => {
    render(<Button loading>اسأل</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleName(/جارٍ/);
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('يستدعي onClick عند النقر', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>اضغط</Button>);
    await user.click(screen.getByRole('button', { name: 'اضغط' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('لا يستدعي onClick وهو معطّل', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        اضغط
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'اضغط' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ButtonLink', () => {
  it('يعرض رابطاً بعنوان href', () => {
    render(<ButtonLink href="/chat">جرّب مجاناً</ButtonLink>);
    const link = screen.getByRole('link', { name: 'جرّب مجاناً' });
    expect(link).toHaveAttribute('href', '/chat');
  });

  it('يضيف target=_blank و rel أماناً للروابط الخارجية', () => {
    render(
      <ButtonLink href="https://example.com" external>
        خارجي
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'خارجي' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
