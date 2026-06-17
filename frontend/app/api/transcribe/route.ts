import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Se requiere una URL de YouTube" },
        { status: 400 }
      );
    }

    if (!YOUTUBE_REGEX.test(url)) {
      return NextResponse.json(
        { error: "La URL no es válida. Debe ser un enlace de YouTube (youtube.com/watch?v= o youtu.be/)" },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("jobs")
      .insert({ youtube_url: url, status: "pending" })
      .select("id")
      .single();

    const job = data as unknown as { id: string } | null;

    if (insertError || !job) {
      console.error("Error creando job:", insertError);
      return NextResponse.json(
        { error: "Error al crear el job en la base de datos" },
        { status: 500 }
      );
    }

    // Fire and forget — no await
    fetch(`${process.env.WORKER_URL}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: job.id, youtube_url: url }),
    }).catch((err) => console.error("Error llamando al worker:", err));

    return NextResponse.json({ job_id: job.id }, { status: 200 });
  } catch (error) {
    console.error("Error en POST /api/transcribe:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
