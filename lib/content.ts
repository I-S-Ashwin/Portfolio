/** UI-facing shape shared by all public portfolio content. */
export type PortfolioItem = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  date?: string;
  body: string[];
  tags?: string[];
  label?: string;
  coverImageUrl?: string | null;
};
