import {
  Copy,
  ExternalLink,
  Eye,
  FileInput,
  LucideIcon,
  MousePointerClick,
  TextCursorInput,
  TriangleAlert,
  SquareMousePointer
} from "lucide-react";
import { cn } from "../lib/utils";
import { EVENT_TYPE_CONFIG, EventType } from "../lib/events";

// Icon mapping for each event type
const EVENT_TYPE_ICONS: Record<EventType, LucideIcon> = {
  pageview: Eye,
  custom_event: MousePointerClick,
  error: TriangleAlert,
  outbound: ExternalLink,
  button_click: SquareMousePointer,
  copy: Copy,
  form_submit: FileInput,
  input_change: TextCursorInput,
};

// Build color lookup from shared config
const EVENT_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_CONFIG.map((config) => [config.value, config.colorClass])
);

interface EventTypeIconProps {
  type: EventType | string;
  className?: string;
}

export function EventTypeIcon({ type, className }: EventTypeIconProps) {
  const Icon = EVENT_TYPE_ICONS[type as EventType] || MousePointerClick;
  const colorClass = EVENT_TYPE_COLORS[type] || "text-amber-400";

  return <Icon className={cn("h-4 w-4", className, colorClass)} />;
}

// Backwards-compatible aliases
export function PageviewIcon({ className }: { className?: string }) {
  return <EventTypeIcon type="pageview" className={className} />;
}

export function EventIcon({ className }: { className?: string }) {
  return <EventTypeIcon type="custom_event" className={className} />;
}
