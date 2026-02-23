import Image from "next/image";
import { useEffect, useState } from "react";
import { useWhiteLabel } from "../hooks/useIsWhiteLabel";
import { Skeleton } from "./ui/skeleton";

export function PocketlyticsLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt="Pocketlytics" width={width} height={height} />;
  }

  return (
    <Image
      src="/2.svg"
      alt="Pocketlytics"
      width={width}
      height={height}
      className="invert dark:invert-0"
    />
  );
}

export function PocketlyticsTextLogo({ width = 150, height = 34 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt="Pocketlytics" width={width} height={height} />;
  }

  return <Image src="/pocketlytics-text.svg" alt="Pocketlytics" width={width} height={height} className="dark:invert-0 invert" />;
}
