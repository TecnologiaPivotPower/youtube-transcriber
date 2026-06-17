import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("id, youtube_url, status, error_msg, created_at, updated_at")
      .eq("id", id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    }

    if (job.status !== "done") {
      return NextResponse.json(
        { error: "Transcription not ready yet" },
        { status: 404 }
      );
    }

    const { data: transcription, error: transcriptionError } =
      await supabaseAdmin
        .from("transcriptions")
        .select("full_text, segments, language, duration_seconds")
        .eq("job_id", id)
        .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json(
        { error: "Transcripción no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ job, transcription });
  } catch (error) {
    console.error("Error en GET /api/transcription/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
