import { useMemo, useEffect, useRef } from "react";
import { useSingleCol } from "@/api/analytics/useSingleCol";
import { getCountryPopulation } from "../../../../../../lib/countryPopulation";
import type { ProcessedData } from "../types";

export function useMapData() {
  const {
    data: countryData,
    isLoading: isCountryLoading,
    isFetching: isCountryFetching,
  } = useSingleCol({
    parameter: "country",
  });

  const {
    data: subdivisionData,
    isLoading: isSubdivisionLoading,
    isFetching: isSubdivisionFetching,
  } = useSingleCol({
    parameter: "region",
    limit: 10000,
  });

  const processedCountryDataRef = useRef<ProcessedData[] | null>(null);
  const processedSubdivisionDataRef = useRef<ProcessedData[] | null>(null);

  const processedCountryData = useMemo(() => {
    if (!countryData?.data) return null;

    return countryData.data.map((item: any) => {
      const population = getCountryPopulation(item.value);
      const perCapitaValue = population > 0 ? item.count / population : 0;
      return {
        ...item,
        perCapita: perCapitaValue,
      };
    });
  }, [countryData?.data]);

  const processedSubdivisionData = useMemo(() => {
    if (!subdivisionData?.data) return null;

    return subdivisionData.data.map((item: any) => {
      const countryCode = item.value?.split("-")[0];
      const population = getCountryPopulation(countryCode);
      const perCapitaValue = population > 0 ? item.count / (population / 10) : 0;
      return {
        ...item,
        perCapita: perCapitaValue,
      };
    });
  }, [subdivisionData?.data]);

  useEffect(() => {
    processedCountryDataRef.current = processedCountryData;
    processedSubdivisionDataRef.current = processedSubdivisionData;
  }, [processedCountryData, processedSubdivisionData]);

  const isLoading = isCountryLoading || isSubdivisionLoading || isCountryFetching || isSubdivisionFetching;

  return {
    processedCountryData,
    processedSubdivisionData,
    processedCountryDataRef,
    processedSubdivisionDataRef,
    isLoading,
  };
}
