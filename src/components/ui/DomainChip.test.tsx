import { render, screen } from '@testing-library/react';
import { DomainChip } from './DomainChip';

describe('DomainChip', () => {
  it('يعرض اسم المجال المطابق للمفتاح (قانون العمل)', () => {
    render(<DomainChip domain="labor" />);
    expect(screen.getByText('قانون العمل')).toBeInTheDocument();
  });

  it('يعرض كل المجالات الثمانية بأسمائها العربية', () => {
    render(
      <>
        <DomainChip domain="labor" />
        <DomainChip domain="rent" />
        <DomainChip domain="personal_status" />
        <DomainChip domain="traffic" />
        <DomainChip domain="consumer_protection" />
        <DomainChip domain="insurance" />
        <DomainChip domain="aml_cft" />
        <DomainChip domain="other" />
      </>,
    );
    expect(screen.getByText('قانون العمل')).toBeInTheDocument();
    expect(screen.getByText('الإيجارات')).toBeInTheDocument();
    expect(screen.getByText('الأحوال الشخصية')).toBeInTheDocument();
    expect(screen.getByText('قانون المرور')).toBeInTheDocument();
    expect(screen.getByText('حماية المستهلك')).toBeInTheDocument();
    expect(screen.getByText('التأمين والرقابة المالية')).toBeInTheDocument();
    expect(screen.getByText('مكافحة غسل الأموال')).toBeInTheDocument();
    expect(screen.getByText('أخرى')).toBeInTheDocument();
  });

  it('يحمي الأيقونة الزخرفية بـ aria-hidden (النص هو حامل المعلومة — WCAG 1.4.1)', () => {
    render(<DomainChip domain="traffic" />);
    const icons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBe(1);
  });
});
