// Opaque, high-contrast surfaces shared by every screen.
export const lightColors = {
  bg: "#FFF8E8", paper: "#FFFEF8", ink: "#202019", muted: "#59564A",
  accent: "#5133A5", purple: "#5133A5", lavender: "#D7C5FF",
  lime: "#DFFF70", mint: "#C9F0D5", yellow: "#FFE575", line: "#202019",
  coral: "#A82B38", peach: "#FFB5A7", ambientInk: "#202019",
  ambientMuted: "#59564A", ambientBackground: "#FFF8E8", cloudOpacity: 0,
  control: "#FFFEF8", activeControl: "#DFFF70", selection: "#D7C5FF",
  navigation: "#FFFEF8", brightBorder: "#202019", badge: "#FFE575",
  button: "#DFFF70", trashControl: "#FFB5A7", keepControl: "#DFFF70",
  softControl: "#FFFEF8", header: "#FFF8E8",
};
export type Palette = typeof lightColors;
export const darkColors: Palette = {
  ...lightColors,
  bg: "#22221F", paper: "#30302B", ink: "#FFF8E8", muted: "#D3CEBC",
  ambientBackground: "#22221F", ambientInk: "#FFF8E8", ambientMuted: "#D3CEBC",
  accent: "#D7C5FF", purple: "#D7C5FF", lavender: "#48385F",
  lime: "#39452A", mint: "#2C4738", yellow: "#4A4228", line: "#FFF8E8",
  coral: "#FFB5A7", peach: "#553335", control: "#30302B",
  activeControl: "#39452A", selection: "#48385F", navigation: "#30302B",
  brightBorder: "#FFF8E8", badge: "#4A4228", button: "#39452A",
  trashControl: "#553335", keepControl: "#39452A", softControl: "#30302B",
  header: "#22221F",
};
