/** Source pixels are untouched: the SVG viewport exposes only text-free artwork.
 * Crop coordinates exclude all mockup UI labels, buttons, borders and gutters.
 */
const artwork = {
  hills: { file: "tea-hills-reference.png", width: 1536, height: 1024, crop: "16 12 652 663" },
  cup: { file: "tea-journal-reference.png", width: 1822, height: 863, crop: "16 14 1090 510" },
  leaf: { file: "tea-collection-reference.png", width: 1199, height: 1312, crop: "17 617 568 407" },
  gift: { file: "tea-collection-reference.png", width: 1199, height: 1312, crop: "620 617 565 405" },
  sunrise: { file: "tea-discovery-reference.png", width: 2172, height: 724, crop: "1215 64 950 600" },
} as const;

export type HomeArtworkKind = keyof typeof artwork;

export default function HomeArtwork({ kind, label, className = "" }: {
  kind: HomeArtworkKind;
  label: string;
  className?: string;
}) {
  const image = artwork[kind];
  return <svg className={`home-artwork ${className}`} viewBox={image.crop}
    preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}
    focusable="false" data-artwork={kind}>
    <image href={`/assets/home/${image.file}`} width={image.width} height={image.height} />
  </svg>;
}
