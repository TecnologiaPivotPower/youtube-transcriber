"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TranscriptionViewer from "@/components/TranscriptionViewer";
import type { Segment } from "@/types/database";

type JobStatus = "pending" | "processing" | "done" | "error";

interface TranscriptionData {
  full_text: string;
  segments: Segment[];
  language: string;
  duration_seconds: number;
}

export default function TranscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>("pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve async params
  useEffect(() => {
    params.then(({ id }) => setId(id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    async function poll() {
      const res = await fetch(`/api/status/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);

      if (data.status === "error") {
        setErrorMsg(data.error_msg || "Error desconocido");
        clearInterval(intervalRef.current!);
      }

      if (data.status === "done") {
        clearInterval(intervalRef.current!);
        const tRes = await fetch(`/api/transcription/${id}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          setTranscription(tData.transcription);
        }
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  if (status === "done" && transcription) {
    return (
      <TranscriptionViewer
        fullText={transcription.full_text}
        segments={transcription.segments}
        language={transcription.language}
        durationSeconds={transcription.duration_seconds}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {status === "error" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ocurrió un error
            </h2>
            <p className="text-red-600 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-xl transition"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-center mb-5">
              <svg
                className="animate-spin h-10 w-10 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {status === "pending"
                ? "Preparando tu transcripción..."
                : "Descargando audio y transcribiendo..."}
            </h2>
            <p className="text-gray-400 text-sm">
              {status === "processing" && "Esto puede tomar unos minutos"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
