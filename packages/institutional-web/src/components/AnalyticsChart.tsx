"use client";

import type { AnalyticsDimension, AnalyticsResultRowDto, AnalyticsVisualization } from "@lufa/contracts";
import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import { ORDINAL_DIMENSIONS, SERIES_COLORS, formatValue } from "./analytics/analyticsModel";

type Props = {
  visualization: Exclude<AnalyticsVisualization, "card" | "table">;
  rows: AnalyticsResultRowDto[];
  dimension?: AnalyticsDimension;
  title: string;
  valueLabel?: string;
  onSelect?: (row: AnalyticsResultRowDto) => void;
};

const INK = "#12324a";
const MUTED = "#57748a";
const GRID = "#e3edf5";
const FONT = "Arial, Helvetica, sans-serif";
const DONUT_SLICES = 6;

type Built = { option: echarts.EChartsCoreOption; rowAt: (dataIndex: number, seriesName?: string) => AnalyticsResultRowDto | undefined };

function buildOption(visualization: Props["visualization"], rows: AnalyticsResultRowDto[], dimension: AnalyticsDimension | undefined, width: number, valueLabel: string): Built {
  const wide = width >= 420;
  const tooltip = { confine: true, valueFormatter: (value: unknown) => formatValue(Number(value)), textStyle: { fontFamily: FONT, color: INK } };

  if (visualization === "donut") {
    const sorted = [...rows].sort((left, right) => right.value - left.value);
    const shown = sorted.length > DONUT_SLICES ? sorted.slice(0, DONUT_SLICES - 1) : sorted;
    const rest = sorted.slice(shown.length);
    const restValue = rest.reduce((sum, row) => sum + row.value, 0);
    const total = sorted.reduce((sum, row) => sum + row.value, 0);
    const center = wide ? "32%" : "50%";
    return {
      rowAt: (index) => shown[index],
      option: {
        color: SERIES_COLORS,
        textStyle: { fontFamily: FONT },
        tooltip: { ...tooltip, trigger: "item", formatter: (params: { name: string; value: number; percent: number }) => `${params.name}<br/><b>${formatValue(params.value)}</b> · ${formatValue(params.percent)}%` },
        title: { text: formatValue(total), subtext: "Total", left: center, top: wide ? "middle" : "33%", textAlign: "center", textVerticalAlign: "middle", textStyle: { fontSize: 22, fontWeight: 800, color: INK, fontFamily: FONT }, subtextStyle: { color: MUTED, fontFamily: FONT }, itemGap: 2 },
        legend: wide
          ? { orient: "vertical", right: 8, top: "middle", type: "scroll", icon: "circle", itemWidth: 10, itemHeight: 10, textStyle: { color: INK, fontFamily: FONT }, formatter: (name: string) => name.length > 22 ? `${name.slice(0, 21)}…` : name }
          : { bottom: 0, left: "center", type: "plain", icon: "circle", itemWidth: 10, itemHeight: 10, itemGap: 8, textStyle: { color: INK, fontFamily: FONT, fontSize: 11 } },
        series: [{
          type: "pie", radius: wide ? ["52%", "74%"] : ["44%", "62%"], center: [center, wide ? "50%" : "38%"], avoidLabelOverlap: true,
          itemStyle: { borderColor: "#ffffff", borderWidth: 2 }, label: { show: false }, labelLine: { show: false },
          emphasis: { scale: true, scaleSize: 4 },
          data: [
            ...shown.map((row) => ({ name: row.label, value: row.value })),
            ...(rest.length ? [{ name: `Otros (${rest.length})`, value: Number(restValue.toFixed(2)), itemStyle: { color: "#a9bccb" } }] : []),
          ],
        }],
      },
    };
  }

  const labels = [...new Set(rows.map((row) => row.label))];
  const seriesLabels = [...new Set(rows.flatMap((row) => row.series ? [row.series] : []))];
  const stacked = seriesLabels.length > 0;
  const keys = stacked ? seriesLabels : [undefined];
  const find = (label: string, series?: string) => rows.find((row) => row.label === label && row.series === series);
  const rowAt = (index: number, seriesName?: string) => find(labels[index], stacked ? seriesName : undefined);
  const legend = stacked ? { top: 0, left: 0, type: "scroll", icon: "roundRect", itemWidth: 10, itemHeight: 10, textStyle: { color: INK, fontFamily: FONT } } : undefined;
  const valueAxis = { type: "value", axisLabel: { color: MUTED, formatter: (value: number) => formatValue(value) }, splitLine: { lineStyle: { color: GRID } } };
  const horizontal = visualization === "bar" && !ORDINAL_DIMENSIONS.has(dimension as AnalyticsDimension);

  if (horizontal) {
    // Rankings read best as horizontal bars: long names fit and the leader sits on top.
    return {
      rowAt,
      option: {
        color: SERIES_COLORS,
        textStyle: { fontFamily: FONT },
        tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
        legend,
        grid: { left: 4, right: stacked ? 16 : 48, top: stacked ? 30 : 4, bottom: 4, containLabel: true },
        xAxis: { ...valueAxis, splitNumber: 4 },
        yAxis: { type: "category", data: labels, inverse: true, axisTick: { show: false }, axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: INK, width: wide ? 140 : 96, overflow: "truncate" } },
        series: keys.map((seriesLabel) => ({
          name: seriesLabel || valueLabel, type: "bar", stack: stacked ? "total" : undefined, barMaxWidth: 22,
          itemStyle: { borderRadius: stacked ? 2 : [0, 4, 4, 0], borderColor: "#ffffff", borderWidth: stacked ? 1 : 0 },
          label: stacked ? undefined : { show: true, position: "right", color: INK, formatter: (params: { value: number }) => formatValue(params.value) },
          emphasis: { focus: stacked ? "series" : "none" },
          data: labels.map((label) => find(label, seriesLabel)?.value ?? null),
        })),
      },
    };
  }

  const line = visualization === "line";
  return {
    rowAt,
    option: {
      color: SERIES_COLORS,
      textStyle: { fontFamily: FONT },
      tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: line ? "line" : "shadow" } },
      legend,
      grid: { left: 4, right: 16, top: stacked ? 34 : 12, bottom: 4, containLabel: true },
      xAxis: { type: "category", data: labels, boundaryGap: !line, axisTick: { show: false }, axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, hideOverlap: true, rotate: labels.reduce((sum, label) => sum + Math.min(label.length, 14) * 7 + 16, 0) > width - 60 ? 30 : 0, width: 90, overflow: "truncate" } },
      yAxis: valueAxis,
      series: keys.map((seriesLabel) => ({
        name: seriesLabel || valueLabel,
        type: line ? "line" : "bar",
        stack: stacked && !line ? "total" : undefined,
        barMaxWidth: 36,
        symbolSize: 8,
        lineStyle: { width: 2 },
        areaStyle: line && !stacked ? { opacity: 0.12 } : undefined,
        itemStyle: line ? undefined : { borderRadius: stacked ? 2 : [4, 4, 0, 0], borderColor: "#ffffff", borderWidth: stacked ? 1 : 0 },
        emphasis: { focus: stacked ? "series" : "none" },
        connectNulls: true,
        data: labels.map((label) => find(label, seriesLabel)?.value ?? null),
      })),
    },
  };
}

export default function AnalyticsChart({ visualization, rows, dimension, title, valueLabel = "Valor", onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const rowAtRef = useRef<Built["rowAt"]>(() => undefined);
  const onSelectRef = useRef(onSelect);
  const [width, setWidth] = useState(600);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const chart = echarts.init(element, undefined, { renderer: "svg" });
    chartRef.current = chart;
    chart.on("click", (event) => {
      if (typeof event.dataIndex !== "number") return;
      const row = rowAtRef.current(event.dataIndex, event.seriesName);
      if (row) onSelectRef.current?.(row);
    });
    const observer = new ResizeObserver(() => { chart.resize(); setWidth(element.clientWidth); });
    observer.observe(element);
    return () => { observer.disconnect(); chart.dispose(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const built = buildOption(visualization, rows, dimension, width, valueLabel);
    rowAtRef.current = built.rowAt;
    chartRef.current?.setOption(built.option, { notMerge: true });
  }, [dimension, rows, valueLabel, visualization, width]);

  const summary = rows.slice(0, 5).map((row) => `${row.label}${row.series ? ` (${row.series})` : ""}: ${formatValue(row.value)}`).join(", ");
  return <div ref={ref} className="h-full min-h-40 w-full" role="img" aria-label={`${title}. ${summary}`} />;
}
