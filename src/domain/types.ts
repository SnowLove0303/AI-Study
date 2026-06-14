import type { IEditorData, IEditorOption } from "@hufe921/canvas-editor";
import type { MindElixirData } from "mind-elixir";

export type KnowledgeCanvasDocument = {
  kind: "canvas-editor";
  version: 1 | 2;
  nodeId: string;
  topic: string;
  html: string;
  data: IEditorData;
  options?: IEditorOption;
  updatedAt: string;
};

export type Course = {
  id: string;
  title: string;
  category: string;
  description: string;
  progress: number;
  createdAt: string;
  mindMap: MindElixirData;
  knowledgePoints: Record<string, string>;
  knowledgeDocuments?: Record<string, KnowledgeCanvasDocument>;
  branchMindMaps?: Record<string, MindElixirData>;
  syncNumberedOutline?: boolean;
  numberedOutlineSnapshot?: OutlineItem[];
  collapsedOutlineIds?: string[];
  hideParentKnowledgePages?: boolean;
};

export type OutlineItem = {
  id: string;
  topic: string;
  depth: number;
  parentId: string;
  numbering: string;
};

export type NoteEntry = {
  id: string;
  topic: string;
  depth: number;
  parentId: string;
  path: Array<{ id: string; topic: string; depth: number }>;
  note: string;
  tags: string[];
  childTopics: string[];
  isLeaf: boolean;
  order: number;
};

export type CourseWorkspaceMode = "knowledge" | "notes" | "mindmap";
