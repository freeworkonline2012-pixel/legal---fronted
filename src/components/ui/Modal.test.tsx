import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  const renderModal = (props: Partial<Parameters<typeof Modal>[0]> = {}) =>
    render(
      <Modal
        open
        title="حذف السؤال"
        primaryLabel="حذف نهائي"
        onPrimary={jest.fn()}
        onClose={jest.fn()}
        {...props}
      >
        <p>هل أنت متأكد؟</p>
      </Modal>,
    );

  it('يعرض العنوان والمحتوى والزرين', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'حذف السؤال' })).toBeInTheDocument();
    expect(screen.getByText('هل أنت متأكد؟')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حذف نهائي' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
  });

  it('لا يعرض شيئاً عندما open=false', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('يستدعي onClose عند الضغط على Esc', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('يستدعي onPrimary عند الضغط على الزر الأساسي', async () => {
    const user = userEvent.setup();
    const onPrimary = jest.fn();
    renderModal({ onPrimary });
    await user.click(screen.getByRole('button', { name: 'حذف نهائي' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('يحمل aria-modal و aria-label', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('حذف السؤال');
  });
});
