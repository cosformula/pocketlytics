import Image from "next/image";
import { IS_WHITE_LABEL } from "../lib/const";

export function RybbitLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  if (IS_WHITE_LABEL) {
    return <Image src={"/ruby.png"} alt="Rybbit" width={width} height={height} />;
  }

  return null;

  // return (
  //   <Image
  //     src="/rybbit.svg"
  //     alt="Rybbit"
  //     width={width}
  //     height={height}
  //     className="invert dark:invert-0"
  //   />
  // );
}

export function RybbitTextLogo({ width = 150, height = 34 }: { width?: number; height?: number }) {
  if (IS_WHITE_LABEL) {
    return <Image src={"/ruby.png"} alt="Rybbit" width={width} height={height} />;
  }

  return <Image src="/rybbit-text.svg" alt="Rybbit" width={width} height={height} className="dark:invert-0 invert" />;
}
