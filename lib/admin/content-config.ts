export const ADMIN_SECTIONS = {
  projects: { table: 'projects', label: 'Projects', plural: 'Projects', singular: 'Project', slug: true },
  research: { table: 'research_projects', label: 'Research', plural: 'Research', singular: 'Research project', slug: true },
  publications: { table: 'publications', label: 'Publications', plural: 'Publications', singular: 'Publication', slug: true },
  hackathons: { table: 'hackathons', label: 'Hackathons', plural: 'Hackathons', singular: 'Hackathon', slug: true },
  achievements: { table: 'achievements', label: 'Achievements', plural: 'Achievements', singular: 'Achievement', slug: true },
  skills: { table: 'skills', label: 'Skills', plural: 'Skills', singular: 'Skill', slug: false },
  experience: { table: 'experiences', label: 'Experience', plural: 'Experience', singular: 'Experience', slug: true },
  certifications: { table: 'certifications', label: 'Certifications', plural: 'Certifications', singular: 'Certification', slug: true },
  blog: { table: 'blog_posts', label: 'Blog', plural: 'Articles', singular: 'Article', slug: true },
  resources: { table: 'resources', label: 'Resources', plural: 'Resources', singular: 'Resource', slug: true },
  media: { table: 'media_assets', label: 'Media', plural: 'Media', singular: 'Media asset', slug: false },
} as const;

export type AdminSection = keyof typeof ADMIN_SECTIONS;
export type AdminTable = typeof ADMIN_SECTIONS[AdminSection]['table'];
export const sectionFromRoute = (section: string): AdminSection | null => section in ADMIN_SECTIONS ? section as AdminSection : null;
