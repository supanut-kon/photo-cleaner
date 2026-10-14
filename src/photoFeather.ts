export function photoFeather(imageWidth: number, imageHeight: number, width: number, height: number) {
  if (Math.min(imageWidth, imageHeight, width, height) <= 0) return null;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const fittedWidth = imageWidth * scale;
  const fittedHeight = imageHeight * scale;
  const x = (width - fittedWidth) / 2;
  const y = (height - fittedHeight) / 2;
  const axis = x > 1 ? "horizontal" : y > 1 ? "vertical" : null;
  return { x, y, width: fittedWidth, height: fittedHeight, axis,
    feather: Math.min(18, (axis === "horizontal" ? fittedWidth : fittedHeight) * 0.08) };
}
export type FeatherFrame = NonNullable<ReturnType<typeof photoFeather>>;
