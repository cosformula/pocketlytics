export function useAppEnv() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  if (hostname === "demo.pocketlytics.local") {
    return "demo";
  }
  if (hostname === "app.pocketlytics.local") {
    return "prod";
  }

  return null;
}
