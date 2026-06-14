import type { KnowledgeCanvasDocument, OutlineItem } from "./types";

export function hasKnowledgeDocumentContent(document: KnowledgeCanvasDocument | null | undefined) {
  if (!document) return false;
  if (hasKnowledgeContent(document.html)) return true;
  return hasCanvasElementContent(document.data?.main);
}

export function hasKnowledgeContent(value: string | null | undefined) {
  if (!value) return false;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|\u00a0/g, " ")
    .trim();
  if (text.length > 0) return true;
  return /<(img|svg|canvas|table|ul|ol|li)\b/i.test(value) || /knowledge-(flowchart|branch-map)/i.test(value);
}

function hasCanvasElementContent(value: unknown): boolean {
  if (typeof value === "string") return value.replace(/\u00a0/g, " ").trim().length > 0;
  if (Array.isArray(value)) return value.some(hasCanvasElementContent);
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(hasCanvasElementContent);
}

export function hasKnowledgePageContent(
  pageId: string,
  knowledgePoints: Record<string, string>,
  knowledgeDocuments: Record<string, KnowledgeCanvasDocument>
) {
  return hasKnowledgeContent(knowledgePoints[pageId]) || hasKnowledgeDocumentContent(knowledgeDocuments[pageId]);
}

export function isKnowledgePageSelectable(
  pageId: string,
  outlineParentIds: Set<string>,
  hideParentKnowledgePages: boolean,
  knowledgePoints: Record<string, string>,
  knowledgeDocuments: Record<string, KnowledgeCanvasDocument>
) {
  return (
    !hideParentKnowledgePages ||
    !outlineParentIds.has(pageId) ||
    hasKnowledgePageContent(pageId, knowledgePoints, knowledgeDocuments)
  );
}

export function getKnowledgeContentPageIds(
  outline: OutlineItem[],
  outlineParentIds: Set<string>,
  hideParentKnowledgePages: boolean,
  knowledgePoints: Record<string, string>,
  knowledgeDocuments: Record<string, KnowledgeCanvasDocument>
) {
  return outline
    .filter((item) =>
      hasKnowledgePageContent(item.id, knowledgePoints, knowledgeDocuments) &&
      isKnowledgePageSelectable(item.id, outlineParentIds, hideParentKnowledgePages, knowledgePoints, knowledgeDocuments)
    )
    .map((item) => item.id);
}

export function getFirstKnowledgePageId(
  outline: OutlineItem[],
  outlineParentIds: Set<string>,
  hideParentKnowledgePages: boolean,
  knowledgePoints: Record<string, string>,
  knowledgeDocuments: Record<string, KnowledgeCanvasDocument>
) {
  const contentPageIds = getKnowledgeContentPageIds(
    outline,
    outlineParentIds,
    hideParentKnowledgePages,
    knowledgePoints,
    knowledgeDocuments
  );
  return (
    contentPageIds[0] ??
    outline.find((item) =>
      isKnowledgePageSelectable(item.id, outlineParentIds, hideParentKnowledgePages, knowledgePoints, knowledgeDocuments)
    )?.id ??
    null
  );
}

export function getAdjacentKnowledgePageIds(
  outline: OutlineItem[],
  activePageId: string,
  knowledgeContentPageIds: string[]
) {
  const knowledgeContentPageIdSet = new Set(knowledgeContentPageIds);
  const activeOutlineIndex = outline.findIndex((item) => item.id === activePageId);
  let previousKnowledgePageId: string | null = null;
  let nextKnowledgePageId: string | null = null;

  if (activeOutlineIndex > 0) {
    for (let index = activeOutlineIndex - 1; index >= 0; index -= 1) {
      const candidateId = outline[index]?.id;
      if (candidateId && knowledgeContentPageIdSet.has(candidateId)) {
        previousKnowledgePageId = candidateId;
        break;
      }
    }
  }

  const startIndex = activeOutlineIndex >= 0 ? activeOutlineIndex + 1 : 0;
  for (let index = startIndex; index < outline.length; index += 1) {
    const candidateId = outline[index]?.id;
    if (candidateId && knowledgeContentPageIdSet.has(candidateId)) {
      nextKnowledgePageId = candidateId;
      break;
    }
  }

  return { previousKnowledgePageId, nextKnowledgePageId };
}

export function getKnowledgePageTitle(outline: OutlineItem[], pageId: string | null) {
  if (!pageId) return null;
  return outline.find((item) => item.id === pageId)?.topic ?? null;
}

export function findFirstSelectableDescendant(
  outline: OutlineItem[],
  itemId: string,
  isSelectable: (pageId: string) => boolean
) {
  const startIndex = outline.findIndex((item) => item.id === itemId);
  if (startIndex < 0) return null;
  const parentDepth = outline[startIndex].depth;
  for (let index = startIndex + 1; index < outline.length; index += 1) {
    const candidate = outline[index];
    if (candidate.depth <= parentDepth) break;
    if (isSelectable(candidate.id)) return candidate.id;
  }
  return null;
}

export function findFirstContentDescendant(outline: OutlineItem[], itemId: string, contentPageIds: Set<string>) {
  const startIndex = outline.findIndex((item) => item.id === itemId);
  if (startIndex < 0) return null;
  const parentDepth = outline[startIndex].depth;
  for (let index = startIndex + 1; index < outline.length; index += 1) {
    const candidate = outline[index];
    if (candidate.depth <= parentDepth) break;
    if (contentPageIds.has(candidate.id)) return candidate.id;
  }
  return null;
}

export function findNearestContentAncestor(
  outline: OutlineItem[],
  itemId: string,
  hasContent: (pageId: string) => boolean
) {
  const byId = new Map(outline.map((item) => [item.id, item]));
  let current = byId.get(itemId);
  while (current) {
    const parent = byId.get(current.parentId);
    if (!parent) return null;
    if (hasContent(parent.id)) return parent.id;
    current = parent;
  }
  return null;
}

export function isOutlineDescendant(outline: OutlineItem[], parentId: string, childId: string) {
  const byId = new Map(outline.map((item) => [item.id, item]));
  let current = byId.get(childId);
  while (current) {
    if (current.parentId === parentId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}
