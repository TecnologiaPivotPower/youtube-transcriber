"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Segment } from "@/types/database";

interface Props {
  fullText: string;
  segments: Segment[];
  language: string;
  durationSeconds: number;
}

const SPEAKER_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100 text-green-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
];

function getSpeakerColor(speaker: string): string {
  if (!SPEAKER_COLORS[speaker]) {
    const index = Object.keys(SPEAKER_COLORS).length % COLOR_PALETTE.length;
    SPEAKER_COLORS[speaker] = COLOR_PALETTE[index];
  }
  return SPEAKER_COLORS[speaker];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function TranscriptionViewer({
  fullText,
  segments,
  language,
  durationSeconds,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"speakers" | "full">("speakers");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transcripción</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-700">Idioma:</span>
                {language?.toUpperCase() ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-700">Duración:</span>
                {formatDuration(durationSeconds)}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-xl transition"
          >
            Nueva transcripción
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          <button
            onClick={() => setActiveTab("speakers")}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === "speakers"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Por speakers
          </button>
          <button
            onClick={() => setActiveTab("full")}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === "full"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Texto completo
          </button>
        </div>

        {/* Tab: Speakers */}
        {activeTab === "speakers" && (
          <div className="space-y-3 pb-12">
            {segments.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay segmentos disponibles.</p>
            ) : (
              segments.map((seg, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4"
                >
                  <div className="flex flex-col items-center gap-2 min-w-[80px]">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${getSpeakerColor(
                        seg.speaker
                      )}`}
                    >
                      {seg.speaker}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {formatTime(seg.start)}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed pt-0.5">
                    {seg.text}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Full text */}
        {activeTab === "full" && (
          <div className="pb-12">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-end mb-3">
                <button
                  onClick={handleCopy}
                  className="px-4 py-1.5 text-sm bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-lg transition"
                >
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <textarea
                readOnly
                value={fullText}
                rows={20}
                className="w-full text-sm text-gray-800 leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
