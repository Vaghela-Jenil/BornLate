"use client"

import { ActivityIcon, GaugeIcon, InfoIcon } from "lucide-react"

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

const groups = [
  {
    name: "Answer quality",
    metrics: ["Perplexity", "Exact Match (EM)", "Accuracy", "BLEU", "ROUGE", "Semantic Similarity", "Answer Correctness", "Answer Relevance", "Faithfulness/Groundedness", "Hallucination Rate", "LLM-as-a-Judge Score", "Human Evaluation Score", "User Satisfaction", "Task Success Rate"],
  },
  {
    name: "Retrieval quality",
    metrics: ["Recall@K", "Precision@K", "Hit Rate@K", "MRR", "NDCG@K", "Context Precision", "Context Recall", "Citation Precision", "Citation Recall", "Citation Correctness", "Citation Completeness"],
  },
  {
    name: "Latency and throughput",
    metrics: ["TTFT", "Total Latency", "P95 Latency", "P99 Latency", "Throughput", "Ingestion Throughput", "Model Loading Time"],
  },
  {
    name: "Reliability and resources",
    metrics: ["Success Rate", "Error Rate", "Worker Crash Rate", "CPU Usage", "GPU Usage", "RAM/VRAM Usage", "Storage Usage", "Battery Usage", "Cost per Query", "Cost per Document"],
  },
]

export default function MetricsPage() {
  return (
    <SidebarInset className="min-h-0 flex-1 overflow-auto bg-[#fbfbfa]">
      <header className="flex h-14 shrink-0 items-center border-b border-border/60 px-4">
        <SidebarTrigger />
        <div className="ml-3 flex items-center gap-2 text-sm font-medium"><ActivityIcon className="size-4 text-[#b44b4b]" />System metrics</div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[#b44b4b]">Evaluation console</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">LLM / RAG / system metrics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A single view for quality, retrieval, performance, reliability, resource, and cost measurements. Metrics show as unavailable until an evaluation run records them.</p>
        </div>
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#eadede] bg-white p-4 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[#b44b4b]" />
          <span>Quality metrics require a labeled evaluation dataset. Runtime metrics require telemetry collection; this page does not invent values when no measurements exist.</span>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {groups.map((group) => (
            <section key={group.name} className="overflow-hidden rounded-2xl border border-[#e8dada] bg-white shadow-[0_8px_30px_rgb(93,44,44,0.04)]">
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4"><GaugeIcon className="size-4 text-[#b44b4b]" /><h2 className="font-semibold">{group.name}</h2></div>
              <div className="divide-y divide-border/60">
                {group.metrics.map((metric) => (
                  <div key={metric} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span>{metric}</span>
                    <span className="rounded-full bg-[#f7f1f1] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Not measured</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </SidebarInset>
  )
}
