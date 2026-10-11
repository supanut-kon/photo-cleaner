export function monthBounds(month: string) {
  if (!/^(19|[2-9]\d)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Enter a month as YYYY-MM, for example 2026-10.");
  }
  const [year, number] = month.split("-").map(Number);
  return {
    createdAfter: new Date(year, number - 1, 1).getTime(),
    createdBefore: new Date(year, number, 1).getTime() - 1,
  };
}

export function editableFileUri(uri?: string) {
  if (!uri || !/^(file|content):\/\//.test(uri)) {
    throw new Error(
      "This photo is not available as a local file yet. Check your connection and try again.",
    );
  }
  return uri;
}
