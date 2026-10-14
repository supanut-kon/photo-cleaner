// Starting at the bottom prevents an ordinary scroll or fling from fetching.
export function shouldLoadFromPull(startedAtBottom: boolean, translationY: number) {
  "worklet";
  return startedAtBottom && translationY <= -64;
}
