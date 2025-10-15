import { useMemo } from "react";
import { scalePow } from "d3-scale";
import type { ProcessedData } from "../types";

export function useMapStyles(
  mapView: "countries" | "subdivisions",
  processedCountryData: ProcessedData[] | null,
  processedSubdivisionData: ProcessedData[] | null,
  mode: "total" | "perCapita"
) {
  const colorScale = useMemo(() => {
    if (mapView === "countries" && !processedCountryData) return () => "#eee";
    if (mapView === "subdivisions" && !processedSubdivisionData) return () => "#eee";

    const dataToUse = mapView === "countries" ? processedCountryData : processedSubdivisionData;

    const getComputedColor = (cssVar: string) => {
      const hslValues = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      return `hsl(${hslValues})`;
    };

    const accentColor = getComputedColor("--accent-400");

    const hslMatch = accentColor.match(/hsl\(([^)]+)\)/);
    const hslValues = hslMatch ? hslMatch[1].split(" ") : ["0", "0%", "50%"];
    const [h, s, l] = hslValues;

    const metricToUse = mode === "perCapita" ? "perCapita" : "count";
    const values = dataToUse?.map((d: any) => d[metricToUse]) || [0];
    const maxValue = Math.max(...values);

    return scalePow<string>()
      .exponent(0.4)
      .domain([0, maxValue])
      .range([`hsla(${h}, ${s}, ${l}, 0.05)`, `hsla(${h}, ${s}, ${l}, 0.8)`]);
  }, [processedCountryData, processedSubdivisionData, mapView, mode]);

  return { colorScale };
}
