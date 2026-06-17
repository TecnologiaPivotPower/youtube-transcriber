export type JobStatus = "pending" | "processing" | "done" | "error";

export interface Segment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          youtube_url: string;
          status: JobStatus;
          error_msg: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          youtube_url: string;
          status?: JobStatus;
          error_msg?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          youtube_url?: string;
          status?: JobStatus;
          error_msg?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transcriptions: {
        Row: {
          id: string;
          job_id: string;
          full_text: string;
          segments: Segment[];
          language: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          full_text: string;
          segments: Segment[];
          language?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          full_text?: string;
          segments?: Segment[];
          language?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
      };
    };
  };
}
