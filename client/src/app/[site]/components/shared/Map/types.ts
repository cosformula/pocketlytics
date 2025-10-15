export interface TooltipContent {
  name: string;
  code: string;
  count: number;
  percentage: number;
  perCapita?: number;
}

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface MapComponentProps {
  height: string;
  mode?: "total" | "perCapita";
  mapView?: "countries" | "subdivisions";
}

export interface ProcessedData {
  value: string;
  count: number;
  percentage: number;
  perCapita: number;
}
