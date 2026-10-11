export type Photo = {
  id: string;
  source: number | { uri: string };
  assetId?: string;
  creationTime?: number;
  filename: string;
  bytes: number;
  width: number;
  height: number;
};
export const photos: Photo[] = [
  {
    id: "09",
    source: require("../assets/photos/HRrExk-agAA4-Hl.jpg"),
    filename: "HRrExk-agAA4-Hl.jpg",
    bytes: 849634,
    width: 2730,
    height: 4096,
  },
  {
    id: "01",
    source: require("../assets/photos/HLPlwxobsAAlz-7.jpg"),
    filename: "HLPlwxobsAAlz-7.jpg",
    bytes: 795243,
    width: 1536,
    height: 2048,
  },
  {
    id: "02",
    source: require("../assets/photos/HLuXOVwbQAANuyg.jpg"),
    filename: "HLuXOVwbQAANuyg.jpg",
    bytes: 1827557,
    width: 3024,
    height: 4032,
  },
  {
    id: "03",
    source: require("../assets/photos/HQ0uicebIAA-VU_.jpg"),
    filename: "HQ0uicebIAA-VU_.jpg",
    bytes: 491272,
    width: 2141,
    height: 3211,
  },
  {
    id: "04",
    source: require("../assets/photos/HQDUSdTawAEurtA.jpg"),
    filename: "HQDUSdTawAEurtA.jpg",
    bytes: 416233,
    width: 1932,
    height: 2576,
  },
  {
    id: "05",
    source: require("../assets/photos/HR7N581bIAAOiCx.jpg"),
    filename: "HR7N581bIAAOiCx.jpg",
    bytes: 237685,
    width: 1024,
    height: 1536,
  },
  {
    id: "06",
    source: require("../assets/photos/HRdMUhRawAALeZM.jpg"),
    filename: "HRdMUhRawAALeZM.jpg",
    bytes: 318201,
    width: 1536,
    height: 2048,
  },
  {
    id: "07",
    source: require("../assets/photos/HRfk4CgW0AIUiDr.jpg"),
    filename: "HRfk4CgW0AIUiDr.jpg",
    bytes: 633899,
    width: 1536,
    height: 2048,
  },
  {
    id: "08",
    source: require("../assets/photos/HRLik14XAAAyhA3.jpg"),
    filename: "HRLik14XAAAyhA3.jpg",
    bytes: 732314,
    width: 1536,
    height: 2048,
  },
];
export const formatBytes = (bytes: number) =>
  bytes === 0
    ? "Size unavailable"
    : bytes >= 1000000
      ? `${(bytes / 1000000).toFixed(1)} MB`
      : `${Math.round(bytes / 1000)} KB`;
