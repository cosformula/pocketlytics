import { useEffect, useRef } from "react";
import OLMap from "ol/Map";
import Overlay from "ol/Overlay";
import { fromLonLat } from "ol/proj";
import { useTimelineStore, useActiveSessions } from "../../timelineStore";
import { generateAvatarSVG } from "../../3d/hooks/timelineLayer/timelineMarkerHelpers";

interface TimelineLayerProps {
  mapInstanceRef: React.RefObject<OLMap | null>;
  mapViewRef: React.RefObject<string>;
  mapView: string;
}

type OverlayData = {
  overlay: Overlay;
  element: HTMLDivElement;
};

export function useOpenLayersTimelineLayer({ mapInstanceRef, mapViewRef, mapView }: TimelineLayerProps) {
  const activeSessions = useActiveSessions();
  const { currentTime } = useTimelineStore();
  const overlaysMapRef = useRef<Map<string, OverlayData>>(new Map());

  // Update overlays when active sessions change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const overlaysMap = overlaysMapRef.current;

    // Hide overlays if not in timeline view
    if (mapView !== "timeline") {
      overlaysMap.forEach(({ overlay }) => {
        map.removeOverlay(overlay);
      });
      overlaysMap.clear();
      return;
    }

    // Build set of current session IDs
    const currentSessionIds = new Set(activeSessions.map(s => s.session_id));

    // Remove overlays that are no longer active
    const toRemove: string[] = [];
    overlaysMap.forEach(({ overlay }, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        map.removeOverlay(overlay);
        toRemove.push(sessionId);
      }
    });
    toRemove.forEach(id => overlaysMap.delete(id));

    // Create or update overlays for active sessions
    activeSessions.forEach(session => {
      if (!session?.session_id || !session.lat || !session.lon) return;

      const existing = overlaysMap.get(session.session_id);

      if (existing) {
        // Update position if needed
        const currentPos = existing.overlay.getPosition();
        const newPos = fromLonLat([session.lon, session.lat]);
        if (!currentPos || currentPos[0] !== newPos[0] || currentPos[1] !== newPos[1]) {
          existing.overlay.setPosition(newPos);
        }
      } else {
        // Create new overlay
        const avatarContainer = document.createElement("div");
        avatarContainer.className = "timeline-avatar-marker";
        avatarContainer.style.cursor = "pointer";
        avatarContainer.style.borderRadius = "50%";
        avatarContainer.style.overflow = "hidden";
        avatarContainer.style.width = "32px";
        avatarContainer.style.height = "32px";
        avatarContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        avatarContainer.style.transform = "translate(-50%, -50%)"; // Center the avatar

        const avatarSVG = generateAvatarSVG(session.user_id, 32);
        avatarContainer.innerHTML = avatarSVG;

        const overlay = new Overlay({
          element: avatarContainer,
          positioning: "center-center",
          stopEvent: false,
        });

        overlay.setPosition(fromLonLat([session.lon, session.lat]));
        map.addOverlay(overlay);

        overlaysMap.set(session.session_id, { overlay, element: avatarContainer });
      }
    });

    // Cleanup function
    return () => {
      overlaysMap.forEach(({ overlay }) => {
        map.removeOverlay(overlay);
      });
      overlaysMap.clear();
    };
  }, [activeSessions, mapView, mapInstanceRef, mapViewRef]);
}
