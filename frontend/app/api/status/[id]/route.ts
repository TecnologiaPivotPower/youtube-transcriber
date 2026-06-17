import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("status, error_msg")
      .eq("id", id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    }

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
