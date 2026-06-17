import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { JobStatus, Segment } from "@/types/database";

type JobRow = {
  id: string;
  youtube_url: string;
  status: JobStatus;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
};

type TranscriptionRow = {
  full_text: string;
  segments: Segment[];
  language: string | null;
  duration_seconds: number | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: jobData, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (jobError || !jobData) {
      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    }

    const job = jobData as unknown as JobRow;

    if (job.status !== "done") {
      return NextResponse.json(
        { error: "Transcription not ready yet" },
        { status: 404 }
      );
    }

    const { data: transcriptionData, error: transcriptionError } =
      await supabaseAdmin
        .from("transcriptions")
        .select("*")
        .eq("job_id", id)
        .single();

    if (transcriptionError || !transcriptionData) {
      return NextResponse.json(
        { error: "Transcripción no encontrada" },
        { status: 404 }
      );
    }

    const transcription = transcriptionData as unknown as TranscriptionRow;

    return NextResponse.json({ job, transcription });
  } catch (error) {
    console.error("Error en GET /api/transcription/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
