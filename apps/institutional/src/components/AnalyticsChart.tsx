"use client";

import type { AnalyticsResultRowDto, AnalyticsVisualization } from "@lufa/contracts";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function AnalyticsChart({ visualization, rows, onSelect }: { visualization: AnalyticsVisualization; rows: AnalyticsResultRowDto[]; onSelect: (row: AnalyticsResultRowDto) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || visualization === "table" || visualization === "card") return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    const labels = [...new Set(rows.map((row) => row.label))];
    const seriesLabels = [...new Set(rows.flatMap((row) => row.series ? [row.series] : []))];
    const rowLabel = (row: AnalyticsResultRowDto) => row.series ? `${row.label} · ${row.series}` : row.label;
    chart.setOption(visualization === "donut" ? {
      tooltip: { trigger: "item" }, legend: { bottom: 0, type: "scroll" }, series: [{ type: "pie", radius: ["46%", "72%"], data: rows.map((row) => ({ name: rowLabel(row), value: row.value })), label: { formatter: "{b}" } }],
    } : {
      grid: { left: 38, right: 16, top: seriesLabels.length ? 42 : 20, bottom: 42, containLabel: true }, tooltip: { trigger: "axis" }, legend: seriesLabels.length ? { top: 0, type: "scroll" } : undefined, xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.some((label) => label.length > 12) ? 28 : 0, overflow: "truncate" } }, yAxis: { type: "value" }, series: (seriesLabels.length ? seriesLabels : [undefined]).map((seriesLabel, index) => ({ name: seriesLabel, type: visualization === "line" ? "line" : "bar", data: labels.map((label) => rows.find((row) => row.label === label && row.series === seriesLabel)?.value || 0), itemStyle: { color: ["#1c8ac3", "#2563eb", "#16a34a", "#64748b"][index % 4] }, lineStyle: { color: ["#1c8ac3", "#2563eb", "#16a34a", "#64748b"][index % 4] }, areaStyle: visualization === "line" ? { color: "rgba(28,138,195,.16)" } : undefined })),
    }, { notMerge: true });
    chart.on("click", (event) => {
      if (typeof event.dataIndex !== "number") return;
      const row = visualization === "donut"
        ? rows[event.dataIndex]
        : rows.find((item) => item.label === labels[event.dataIndex] && item.series === (event.seriesName || undefined));
      if (row) onSelect(row);
    });
    const observer = new ResizeObserver(() => chart.resize()); observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [onSelect, rows, visualization]);
  return <div ref={ref} className="h-full min-h-44 w-full" aria-label="Gráfico interactivo. Seleccioná una categoría para filtrar el tablero." role="img" />;
}
