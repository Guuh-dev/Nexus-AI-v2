import Svg, { Path } from "react-native-svg";
import { PIXEL_PALETTE, pixelPaths } from "@/features/mascot/sprites";
/** Palette paths avoid creating hundreds of native views for a small sprite. */
export function PixelArt({ rows, width, height, palette = PIXEL_PALETTE }: { rows: string[]; width: number | `${number}%`; height: number | `${number}%`; palette?: typeof PIXEL_PALETTE }) {
  return <Svg width={width} height={height} viewBox={`0 0 ${rows[0]?.length ?? 1} ${rows.length}`} preserveAspectRatio="none">{pixelPaths(rows).map(({ ink, path }) => <Path key={ink} d={path} fill={palette[ink]} />)}</Svg>;
}
