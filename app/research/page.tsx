import type { Metadata } from 'next'; import { ContentListing } from '@/components/content-listing'; import { getResearchProjects } from '@/lib/supabase/portfolio-data';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Research — [Your Name]', description: 'Research interests and explorations by [Your Name].' };
export default async function ResearchPage({ searchParams }: { searchParams: { page?: string } }) { const result = await getResearchProjects(searchParams.page); return <ContentListing eyebrow="Portfolio / 03" title="Research" description="Published research projects and explorations." items={result.items} basePath="/research" page={result.page} hasMore={result.hasMore} emptyTitle="No research published yet"/>; }
