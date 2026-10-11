export type Decision = "keep" | "trash";
export type Edit = {
  uri: string;
  width: number;
  height: number;
  savedAt: string;
  libraryAssetId?: string;
  filename?: string;
};
export type Session = {
  decisions: Record<string, Decision>;
  history: string[];
  removed: string[];
  edits: Record<string, Edit>;
};
export const emptySession = (): Session => ({
  decisions: {},
  history: [],
  removed: [],
  edits: {},
});
export function decide(
  session: Session,
  id: string,
  decision: Decision,
): Session {
  if (session.removed.includes(id)) return session;
  return {
    ...session,
    decisions: { ...session.decisions, [id]: decision },
    history: [...session.history.filter((value) => value !== id), id],
  };
}
export function undo(session: Session): Session {
  const id = session.history.at(-1);
  if (!id) return session;
  const decisions = { ...session.decisions };
  delete decisions[id];
  return { ...session, decisions, history: session.history.slice(0, -1) };
}
export function clearQueue(session: Session, selectedIds?: string[]): Session {
  const ids = Object.keys(session.decisions).filter(
    (id) =>
      session.decisions[id] === "trash" &&
      (!selectedIds || selectedIds.includes(id)),
  );
  const decisions = { ...session.decisions };
  ids.forEach((id) => delete decisions[id]);
  return {
    ...session,
    decisions,
    removed: [...new Set([...session.removed, ...ids])],
    history: session.history.filter((id) => !ids.includes(id)),
  };
}
export function restoreSession(
  raw: string | null,
  validIds?: string[],
): Session {
  if (!raw) return emptySession();
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return emptySession();
    const result = emptySession();
    validIds ??= [
      ...new Set<string>(
        [
          ...Object.keys(value.decisions ?? {}),
          ...Object.keys(value.edits ?? {}),
          ...(Array.isArray(value.removed) ? value.removed : []),
          ...(Array.isArray(value.history) ? value.history : []),
        ].filter((id): id is string => typeof id === "string"),
      ),
    ];
    const valid = new Set(validIds);
    result.removed = Array.isArray(value.removed)
      ? [
          ...new Set<string>(
            value.removed.filter(
              (id: unknown) => typeof id === "string" && valid.has(id),
            ),
          ),
        ]
      : [];
    for (const id of validIds) {
      const decision = value.decisions?.[id];
      if (
        !result.removed.includes(id) &&
        (decision === "keep" || decision === "trash")
      )
        result.decisions[id] = decision;
      const edit = value.edits?.[id];
      if (
        edit &&
        typeof edit.uri === "string" &&
        /^(file:|data:image\/|blob:)/.test(edit.uri) &&
        Number.isFinite(edit.width) &&
        edit.width > 0 &&
        Number.isFinite(edit.height) &&
        edit.height > 0 &&
        typeof edit.savedAt === "string"
      )
        result.edits[id] = edit;
    }
    result.history = Array.isArray(value.history)
      ? [
          ...new Set<string>(
            value.history.filter(
              (id: unknown) => typeof id === "string" && !!result.decisions[id],
            ),
          ),
        ]
      : [];
    return result;
  } catch {
    return emptySession();
  }
}
