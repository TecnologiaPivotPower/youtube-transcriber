import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { JobStatus } from "@/types/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    }

    const job = data as unknown as { status: JobStatus; error_msg: string | null };

    return NextResponse.json({
      status: job.status,
      error_msg: job.error_msg,
    });
  } catch (error) {
    console.error("Error en GET /api/status/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
