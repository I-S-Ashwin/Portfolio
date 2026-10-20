export type ContentStatus = 'draft' | 'published' | 'archived';

export type ContentRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: unknown;
  tags: string[];
  cover_media_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};
export type SkillRow = { id: string; name: string; category: string; description: string | null; sort_order: number; status: ContentStatus; published_at: string | null; created_at: string; updated_at: string };
export type MediaRow = { id: string; storage_bucket: string; storage_path: string; mime_type: string; byte_size: number; alt_text: string; caption: string | null; width: number | null; height: number | null; visibility: 'public' | 'private'; created_by: string | null; created_at: string };
export type ContactSubmissionRow = { id: string; name: string; email: string; subject: string|null; message: string; idempotency_key: string; notification_status: 'not_configured'|'pending'|'sent'|'failed'; received_at: string; status: 'new'|'read'|'archived'; retention_expires_at: string; spam_score: number|null };
export type ProjectMediaRow = { project_id: string; media_asset_id: string; sort_order: number; caption: string|null };
export type ResearchMediaRow = { research_project_id: string; media_asset_id: string; sort_order: number; caption: string|null };

export type Database = {
  public: {
    Tables: {
      projects: { Row: ContentRow & { role: string | null; start_date: string | null; end_date: string | null; repository_url: string | null; demo_url: string | null; featured: boolean }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      research_projects: { Row: ContentRow & { methods: unknown; research_status: string; collaborators: string[]; started_at: string | null; completed_at: string | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      publications: { Row: ContentRow & { research_project_id: string | null; venue: string | null; doi: string | null; external_url: string | null; authors: string[]; publication_date: string | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      hackathons: { Row: ContentRow & { event_name: string | null; event_date: string | null; team_name: string | null; placement: string | null; project_url: string | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      achievements: { Row: ContentRow & { issuer: string | null; achieved_on: string | null; credential_url: string | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      experiences: { Row: ContentRow & { organization: string | null; role: string | null; location: string | null; start_date: string | null; end_date: string | null; is_current: boolean }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      certifications: { Row: ContentRow & { issuer: string | null; issued_on: string | null; expires_on: string | null; credential_id: string | null; credential_url: string | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      blog_posts: { Row: ContentRow & { reading_time_minutes: number | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      resources: { Row: ContentRow & { url: string; resource_type: string; publisher: string | null }; Insert: Partial<ContentRow>; Update: Partial<ContentRow>; Relationships: [] };
      skills: { Row: SkillRow; Insert: Partial<SkillRow>; Update: Partial<SkillRow>; Relationships: [] };
      media_assets: { Row: MediaRow; Insert: Partial<MediaRow>; Update: Partial<MediaRow>; Relationships: [] };
      contact_submissions: { Row: ContactSubmissionRow; Insert: Partial<ContactSubmissionRow>; Update: Partial<ContactSubmissionRow>; Relationships: [] };
      project_media: { Row: ProjectMediaRow; Insert: Partial<ProjectMediaRow>; Update: Partial<ProjectMediaRow>; Relationships: [] };
      research_media: { Row: ResearchMediaRow; Insert: Partial<ResearchMediaRow>; Update: Partial<ResearchMediaRow>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { content_status: ContentStatus; contact_status: 'new' | 'read' | 'archived'; media_visibility: 'public' | 'private' };
    CompositeTypes: Record<string, never>;
  };
};
