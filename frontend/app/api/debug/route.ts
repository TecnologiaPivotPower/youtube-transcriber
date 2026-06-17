import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    WORKER_URL: !!process.env.WORKER_URL,
    WORKER_SECRET: !!process.env.WORKER_SECRET,
    SUPABASE_URL_VALUE: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "missing",
  };

  try {
    const { data, error, count } = await supabaseAdmin
      .from("jobs")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      env: envCheck,
      supabase: {
        ok: !error,
        count,
        error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      },
    });
  } catch (err) {
    return NextResponse.json({
      env: envCheck,
      supabase: {
        ok: false,
        error: String(err),
      },
    });
  }
}
