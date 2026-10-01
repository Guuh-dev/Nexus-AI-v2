import Svg, { Circle, Path, Rect } from "react-native-svg";
export type NexusIconName = "today" | "plan" | "focus" | "brain" | "progress" | "settings" | "play" | "clock" | "book" | "chevron";
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
  </Svg>;
}
