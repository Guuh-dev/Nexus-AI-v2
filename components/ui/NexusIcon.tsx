import Svg, { Circle, Path, Rect } from "react-native-svg";
export type NexusIconName = "today" | "plan" | "focus" | "brain" | "progress" | "settings" | "play" | "clock" | "book" | "chevron" | "plus" | "check" | "flame" | "spark" | "target" | "back" | "palette" | "widget" | "smile" | "bell" | "user" | "refresh" | "download" | "upload" | "shield" | "undo" | "trash" | "lock";
export function NexusIcon({ name, color, size = 24 }: { name: NexusIconName; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {name === "today" && <><Path d="M3 10 12 3l9 7v10H15v-6H9v6H3Z" /></>}
    {name === "plan" && <><Rect x="4" y="5" width="16" height="16" rx="2" /><Path d="M8 3v4m8-4v4M4 10h16" /></>}
    {name === "focus" && <><Circle cx="12" cy="12" r="9" /><Circle cx="12" cy="12" r="5" /><Path d="m12 12 8-8m-4 0h4v4" /></>}
    {name === "brain" && <><Path d="M12 5C8 1 5 4 5 7c-4 2-3 6 0 7-2 4 2 8 7 5m0-14c4-4 7-1 7 2 4 2 3 6 0 7 2 4-2 8-7 5Zm-4 3v3m8-3v3M7 15l2 1m8-1-2 1" /></>}
    {name === "progress" && <Path d="M4 21V14m5 7V9m6 12V4m5 17V11" />}
    {name === "settings" && <><Path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z" /><Circle cx="12" cy="11.5" r="3" /></>}
    {name === "play" && <Path d="m8 4 12 8-12 8Z" fill={color} strokeWidth={0} />}
    {name === "clock" && <><Circle cx="12" cy="12" r="9" /><Path d="M12 6v6l4 2" /></>}
    {name === "book" && <><Path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" /></>}
    {name === "chevron" && <Path d="m9 5 7 7-7 7" />}
    {name === "plus" && <Path d="M12 5v14M5 12h14" />}
    {name === "check" && <Path d="m5 12.5 4.5 4.5L19 7.5" />}
    {name === "flame" && <Path d="M12 21c-4 0-7-2.7-7-6.6 0-3.1 2-5 3.6-6.6.4 1.6 1.3 2.6 2.4 3C11 7.5 12.5 5 15 3c0 3 4 5.4 4 10.4C19 18.3 16 21 12 21Z" />}
    {name === "spark" && <Path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6" />}
    {name === "target" && <><Circle cx="12" cy="12" r="8" /><Circle cx="12" cy="12" r="3.5" /></>}
    {name === "back" && <Path d="M15 5l-7 7 7 7" />}
    {name === "palette" && <><Circle cx="12" cy="12" r="9" /><Path d="M12 21c-1.5 0-2-1-2-2s1-2 2-2h2a4 4 0 0 0 4-4M8 10h.01M12 7.5h.01M16 10h.01" /></>}
    {name === "widget" && <><Rect x="3" y="3" width="8" height="8" rx="2" /><Rect x="13" y="3" width="8" height="8" rx="2" /><Rect x="3" y="13" width="18" height="8" rx="2" /></>}
    {name === "smile" && <><Circle cx="12" cy="12" r="9" /><Path d="M8.5 14.5c1.8 2 5.2 2 7 0M9 9.5h.01M15 9.5h.01" /></>}
    {name === "bell" && <Path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0" />}
    {name === "user" && <><Circle cx="12" cy="8" r="4" /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>}
    {name === "refresh" && <Path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />}
    {name === "download" && <Path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />}
    {name === "upload" && <Path d="M12 20V9m-5 5 5-5 5 5M5 4h14" />}
    {name === "shield" && <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />}
    {name === "undo" && <Path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12" />}
    {name === "trash" && <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />}
    {name === "lock" && <><Rect x="5" y="11" width="14" height="10" rx="2" /><Path d="M8 11V8a4 4 0 0 1 8 0v3" /></>}
  </Svg>;
}
