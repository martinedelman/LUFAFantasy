"use client";

import type { AnalyticsResultRowDto, AnalyticsVisualization } from "@lufa/contracts";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function AnalyticsChart({ visualization, rows, onSelect }: { visualization: AnalyticsVisualization; rows: AnalyticsResultRowDto[]; onSelect: (row: AnalyticsResultRowDto) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || visualization === "table" || visualization === "card") return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    const labels = rows.map((row) => row.label);
    chart.setOption(visualization === "donut" ? {
      tooltip: { trigger: "item" }, legend: { bottom: 0, type: "scroll" }, series: [{ type: "pie", radius: ["46%", "72%"], data: rows.map((row) => ({ name: row.label, value: row.value })), label: { formatter: "{b}" } }],
    } : {
      grid: { left: 38, right: 16, top: 20, bottom: 42, containLabel: true }, tooltip: { trigger: "axis" }, xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.some((label) => label.length > 12) ? 28 : 0, overflow: "truncate" } }, yAxis: { type: "value" }, series: [{ type: visualization === "line" ? "line" : "bar", data: rows.map((row) => row.value), itemStyle: { color: "#1c8ac3" }, lineStyle: { color: "#1c8ac3" }, areaStyle: visualization === "line" ? { color: "rgba(28,138,195,.16)" } : undefined }],
    }, { notMerge: true });
    chart.on("click", (event) => { if (typeof event.dataIndex === "number" && rows[event.dataIndex]) onSelect(rows[event.dataIndex]); });
    const observer = new ResizeObserver(() => chart.resize()); observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [onSelect, rows, visualization]);
  return <div ref={ref} className="h-full min-h-44 w-full" aria-label="Gráfico interactivo. Seleccioná una categoría para filtrar el tablero." role="img" />;
}
