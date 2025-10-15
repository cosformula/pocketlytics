"use client";

import "ol/ol.css";
import { round } from "lodash";
import { useEffect, useState } from "react";
import { useMeasure } from "@uidotdev/usehooks";
import { useCountries, useSubdivisions } from "../../../../../lib/geo";
import { CountryFlag } from "../icons/CountryFlag";
import { useMapData } from "./hooks/useMapData";
import { useMapStyles } from "./hooks/useMapStyles";
import { useMapInstance } from "./hooks/useMapInstance";
import { useMapLayers } from "./hooks/useMapLayers";
import type { MapComponentProps, TooltipContent, TooltipPosition } from "./types";

export function MapComponent({ height, mode = "total", mapView: controlledMapView }: MapComponentProps) {
  const {
    processedCountryData,
    processedSubdivisionData,
    processedCountryDataRef,
    processedSubdivisionDataRef,
    isLoading,
  } = useMapData();

  const [dataVersion, setDataVersion] = useState<number>(0);

  useEffect(() => {
    if (processedCountryData || processedSubdivisionData) {
      setDataVersion((prev) => prev + 1);
    }
  }, [processedCountryData, processedSubdivisionData]);

  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  });
  const [internalMapView, setInternalMapView] = useState<"countries" | "subdivisions">("countries");

  const mapView = controlledMapView ?? internalMapView;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { colorScale } = useMapStyles(mapView, processedCountryData, processedSubdivisionData, mode);

  const { data: subdivisionsGeoData } = useSubdivisions();
  const { data: countriesGeoData } = useCountries();

  const [ref, { height: resolvedHeight }] = useMeasure();
  const zoom = resolvedHeight ? Math.log2(resolvedHeight / 400) + 1 : 1;

  const { mapRef, mapInstanceRef, mapViewRef } = useMapInstance({
    mapView,
    zoom,
    processedCountryDataRef,
    processedSubdivisionDataRef,
    setInternalMapView,
    setTooltipContent,
    setTooltipPosition,
    setHoveredId,
  });

  useMapLayers({
    mapInstanceRef,
    mapViewRef,
    mapView,
    countriesGeoData,
    subdivisionsGeoData,
    processedCountryData,
    processedSubdivisionData,
    processedCountryDataRef,
    processedSubdivisionDataRef,
    dataVersion,
    mode,
    colorScale,
    hoveredId,
  });

  return (
    <div
      style={{
        height: height,
      }}
      ref={ref}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
            <span className="text-sm text-neutral-300">Loading map data...</span>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          height: "100%",
          width: "100%",
          background: "none",
          cursor: "default",
          outline: "none",
        }}
      />
      {tooltipContent && (
        <div
          className="fixed z-50 bg-neutral-1000 text-white rounded-md p-2 shadow-lg text-sm pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-sm flex items-center gap-1">
            {tooltipContent.code && <CountryFlag country={tooltipContent.code.slice(0, 2)} />}
            {tooltipContent.name}
          </div>
          <div>
            <span className="font-bold text-accent-400">{tooltipContent.count.toLocaleString()}</span>{" "}
            <span className="text-neutral-300">({tooltipContent.percentage.toFixed(1)}%) sessions</span>
          </div>
          {mode === "perCapita" && mapView === "countries" && (
            <div className="text-sm text-neutral-300">
              <span className="font-bold text-accent-400">{round(tooltipContent.perCapita ?? 0, 2)}</span> per million
              people
            </div>
          )}
        </div>
      )}
    </div>
  );
}
