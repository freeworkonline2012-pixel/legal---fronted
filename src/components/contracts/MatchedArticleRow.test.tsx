import { render, screen } from '@testing-library/react';
import { MatchedArticleRow } from './MatchedArticleRow';

const BASE = { law_no: 131, law_year: 1948, article_no: 604, snippet: 'نص', official_url: null };

describe('MatchedArticleRow', () => {
  it('لا يكرر رقم القانون وسنته إن كان عنوان القانون يتضمنهما', () => {
    render(<MatchedArticleRow article={{ ...BASE, law: 'القانون المدنى 131/1948' }} />);
    expect(screen.getByText('القانون المدنى 131/1948 — المادة 604')).toBeInTheDocument();
  });

  it('يضيف الرقم والسنة إن لم يتضمنهما العنوان', () => {
    render(<MatchedArticleRow article={{ ...BASE, law: 'قانون الإيجارات' }} />);
    expect(screen.getByText('قانون الإيجارات 131/1948 — المادة 604')).toBeInTheDocument();
  });
});
