import { useEffect, useRef, useState } from "react";
import OLMap from "ol/Map";
import Overlay from "ol/Overlay";
import { fromLonLat } from "ol/proj";
import type { GetSessionsResponse } from "../../../../../api/analytics/userSessions";
import { useTimelineStore, useActiveSessions } from "../../timelineStore";
import { generateAvatarSVG } from "../../3d/hooks/timelineLayer/timelineMarkerHelpers";
import { buildTooltipHTML } from "../../utils/timelineTooltipBuilder";

interface TimelineLayerProps {
  mapInstanceRef: React.RefObject<OLMap | null>;
  mapViewRef: React.RefObject<string>;
  mapView: string;
}

type OverlayData = {
  overlay: Overlay;
  element: HTMLDivElement;
  session: GetSessionsResponse[number];
};

export function useOpenLayersTimelineLayer({ mapInstanceRef, mapViewRef, mapView }: TimelineLayerProps) {
  const activeSessions = useActiveSessions();
  const { currentTime } = useTimelineStore();
  const overlaysMapRef = useRef<Map<string, OverlayData>>(new Map());
  const tooltipOverlayRef = useRef<Overlay | null>(null);
  const [openTooltipSessionId, setOpenTooltipSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<GetSessionsResponse[number] | null>(null);

  // Close tooltip when timeline time changes
  useEffect(() => {
    if (tooltipOverlayRef.current && openTooltipSessionId) {
      tooltipOverlayRef.current.setPosition(undefined);
      setOpenTooltipSessionId(null);
    }
  }, [currentTime]);

  // Initialize tooltip overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!tooltipOverlayRef.current) {
      const tooltipElement = document.createElement("div");
      tooltipElement.className = "ol-timeline-tooltip";
      tooltipElement.style.position = "absolute";
      tooltipElement.style.zIndex = "1000";

      const tooltip = new Overlay({
        element: tooltipElement,
        positioning: "top-left",
        offset: [-46, -46], // Offset to align tooltip avatar center with marker center (12px padding + 18px half-avatar)
        stopEvent: true,
      });

      map.addOverlay(tooltip);
      tooltipOverlayRef.current = tooltip;
    }

    return () => {
      if (tooltipOverlayRef.current) {
        map.removeOverlay(tooltipOverlayRef.current);
        tooltipOverlayRef.current = null;
      }
    };
  }, [mapInstanceRef]);

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

        // Add click handler for tooltip
        const handleAvatarClick = (e: MouseEvent) => {
          e.stopPropagation();

          // If clicking the same avatar that has the tooltip open, close it
          if (openTooltipSessionId === session.session_id && tooltipOverlayRef.current) {
            tooltipOverlayRef.current.setPosition(undefined);
            setOpenTooltipSessionId(null);
            return;
          }

          // Show tooltip for this session
          if (tooltipOverlayRef.current) {
            const html = buildTooltipHTML(session, session.lon, session.lat);
            tooltipOverlayRef.current.getElement()!.innerHTML = html;
            tooltipOverlayRef.current.setPosition(fromLonLat([session.lon, session.lat]));
            setOpenTooltipSessionId(session.session_id);

            // Add click handler to "View Details" button
            setTimeout(() => {
              const button = document.querySelector(`[data-session-id="${session.session_id}"]`);
              if (button) {
                button.addEventListener("click", (e: Event) => {
                  e.stopPropagation();
                  setSelectedSession(session);
                  if (tooltipOverlayRef.current) {
                    tooltipOverlayRef.current.setPosition(undefined);
                    setOpenTooltipSessionId(null);
                  }
                });
              }
            }, 0);
          }
        };

        avatarContainer.addEventListener("click", handleAvatarClick);

        const overlay = new Overlay({
          element: avatarContainer,
          positioning: "center-center",
          stopEvent: false,
        });

        overlay.setPosition(fromLonLat([session.lon, session.lat]));
        map.addOverlay(overlay);

        overlaysMap.set(session.session_id, { overlay, element: avatarContainer, session });
      }
    });

    // Handle map click to close tooltip
    const handleMapClick = () => {
      if (tooltipOverlayRef.current && openTooltipSessionId) {
        tooltipOverlayRef.current.setPosition(undefined);
        setOpenTooltipSessionId(null);
      }
    };

    map.on("click", handleMapClick);

    // Cleanup function
    return () => {
      map.un("click", handleMapClick);

      overlaysMap.forEach(({ overlay }) => {
        map.removeOverlay(overlay);
      });
      overlaysMap.clear();
    };
  }, [activeSessions, mapView, mapInstanceRef, mapViewRef, openTooltipSessionId]);

  return {
    selectedSession,
    setSelectedSession,
  };
}
