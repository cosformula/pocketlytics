import { useEffect, useRef, MutableRefObject } from "react";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";
import type { ProcessedData } from "../types";

interface UseMapLayersParams {
  mapInstanceRef: MutableRefObject<Map | null>;
  mapViewRef: MutableRefObject<"countries" | "subdivisions">;
  mapView: "countries" | "subdivisions";
  countriesGeoData: any;
  subdivisionsGeoData: any;
  processedCountryData: ProcessedData[] | null;
  processedSubdivisionData: ProcessedData[] | null;
  processedCountryDataRef: MutableRefObject<ProcessedData[] | null>;
  processedSubdivisionDataRef: MutableRefObject<ProcessedData[] | null>;
  dataVersion: number;
  mode: "total" | "perCapita";
  colorScale: (value: number) => string;
  hoveredId: string | null;
}

export function useMapLayers({
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
}: UseMapLayersParams) {
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Update vector layer when geo data or map view changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const geoData = mapView === "countries" ? countriesGeoData : subdivisionsGeoData;
    if (!geoData) return;

    // Wait for data to be available
    const dataToCheck = mapView === "countries" ? processedCountryData : processedSubdivisionData;
    if (!dataToCheck) return;

    // Remove existing layer
    if (vectorLayerRef.current) {
      mapInstanceRef.current.removeLayer(vectorLayerRef.current);
    }

    // Create new vector source with GeoJSON data
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geoData, {
        featureProjection: "EPSG:3857",
      }),
    });

    // Create new vector layer with a style function
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => {
        const isCountryView = mapViewRef.current === "countries";
        const dataKey = isCountryView ? feature.get("ISO_A2") : feature.get("iso_3166_2");

        const dataToUse = isCountryView ? processedCountryDataRef.current : processedSubdivisionDataRef.current;
        const foundData = dataToUse?.find(({ value }: any) => value === dataKey);

        const metricValue = mode === "perCapita" ? foundData?.perCapita || 0 : foundData?.count || 0;

        let fillColor: string;
        let strokeColor: string;

        if (metricValue > 0) {
          const baseColor = colorScale(metricValue);

          if (hoveredId === dataKey?.toString()) {
            fillColor = baseColor.replace(/,\s*([\d.]+)\)$/, (match, opacity) => {
              const newOpacity = Math.min(parseFloat(opacity) + 0.2, 1);
              return `, ${newOpacity})`;
            });
          } else {
            fillColor = baseColor;
          }
          strokeColor = baseColor;
        } else {
          fillColor = "rgba(140, 140, 140, 0.3)";
          strokeColor = "rgba(140, 140, 140, 0.5)";
        }

        return new Style({
          fill: new Fill({
            color: fillColor,
          }),
          stroke: new Stroke({
            color: strokeColor,
            width: 1,
          }),
        });
      },
    });

    vectorLayerRef.current = vectorLayer;
    mapInstanceRef.current.addLayer(vectorLayer);
  }, [
    mapView,
    countriesGeoData,
    subdivisionsGeoData,
    dataVersion,
    mode,
    colorScale,
    processedCountryData,
    processedSubdivisionData,
  ]);

  // Update styles when hoveredId changes (without recreating the layer)
  useEffect(() => {
    if (vectorLayerRef.current) {
      vectorLayerRef.current.changed();
    }
  }, [hoveredId]);

  return { vectorLayerRef };
}
