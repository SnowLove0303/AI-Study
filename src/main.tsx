import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import MindElixir, { SIDE, type MindElixirData, type MindElixirInstance, type NodeObj } from "mind-elixir";
import "mind-elixir/style.css";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bell,
  BookOpen,
  Bold,
  Bot,
  Braces,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CirclePlay,
  Clock3,
  FileText,
  GitBranchPlus,
  GitFork,
  GraduationCap,
  Hand,
  Highlighter,
  Home,
  IndentDecrease,
  IndentIncrease,
  Keyboard,
  LibraryBig,
  Link2,
  List,
  ListOrdered,
  LocateFixed,
  Maximize2,
  NotebookPen,
  PaintBucket,
  PackageCheck,
  Paintbrush,
  Palette,
  PanelLeft,
  PanelRight,
  Plus,
  PlayCircle,
  Redo2,
  RotateCcw,
  Rows3,
  Save,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Target,
  Tags,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  UsersRound
} from "lucide-react";
import { updateLog, type UpdateLogEntry } from "./updateLog";
import "./styles.css";

type ViewId = "dashboard" | "courses" | "plan" | "notes" | "practice" | "assistant" | "mcp" | "updates" | "settings";
type Tone = "teal" | "amber" | "blue" | "rose";

type Task = { title: string; meta: string; progress: number; tone: Tone };
type ScheduleItem = { time: string; title: string; tag: string };
type Course = {
  id: string;
  title: string;
  category: string;
  description: string;
  progress: number;
  createdAt: string;
  mindMap: MindElixirData;
  knowledgePoints: Record<string, string>;
  branchMindMaps?: Record<string, MindElixirData>;
  syncNumberedOutline?: boolean;
  numberedOutlineSnapshot?: OutlineItem[];
};
type OutlineItem = {
  id: string;
  topic: string;
  depth: number;
  parentId: string;
  numbering: string;
};
type NoteEntry = {
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
type KnowledgeFormatBrush = {
  inlineStyles: Record<string, string>;
  blockStyles: Record<string, string>;
};
type KnowledgeHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
};
type CourseWorkspaceMode = "knowledge" | "notes" | "mindmap";
type AppSettings = {
  mindMapArrowPan: boolean;
};
type McpNotionImportStatus = {
  contractPath: string;
  contractReady: boolean;
  guidePath: string;
  guideReady: boolean;
  notionCachePath: string;
  notionCacheReady: boolean;
  jsonDatabasePath: string;
  jsonDatabaseReady: boolean;
  mysqlConnected: boolean;
  latestBackupPath: string | null;
  latestBackupReady: boolean;
};

const mascotUrl = `${import.meta.env.BASE_URL}mascot.png`;
const coursesStorageKey = "aistudy:courses:v1";
const settingsStorageKey = "aistudy:settings:v1";
const courseSaveStatusEvent = "aistudy:course-save-status";
const knowledgeFontFamilies = [
  { label: "微软雅黑", value: "Microsoft YaHei" },
  { label: "宋体", value: "SimSun" },
  { label: "黑体", value: "SimHei" },
  { label: "楷体", value: "KaiTi" },
  { label: "Arial", value: "Arial" },
  { label: "Times", value: "Times New Roman" }
];
const knowledgeFontSizes = ["12px", "14px", "16px", "18px", "20px", "22px", "24px", "28px", "32px", "36px"];
const knowledgeHistoryLimit = 80;

type CourseSaveStatus = "saving" | "saved" | "error";

let pendingCourseSave: Course[] | null = null;
let courseSaveInFlight = false;

function emitCourseSaveStatus(status: CourseSaveStatus) {
  window.dispatchEvent(new CustomEvent(courseSaveStatusEvent, { detail: status }));
}
const defaultSettings: AppSettings = {
  mindMapArrowPan: true
};
const textColors = ["#111827", "#0f766e", "#2563eb", "#b7791f", "#e11d48"];
const fillColors = ["#ffffff", "#def7ec", "#dbeafe", "#fef3c7", "#ffe4e6"];
const markColors = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecdd3"];
const fontSizes = ["16px", "20px", "24px", "28px"];
const panControlMin = 0;
const panControlMax = 1000;
const panControlCenter = 500;
const panControlScale = 4;

const navItems: Array<{ id: ViewId; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "工作台", icon: Home },
  { id: "courses", label: "课程库", icon: LibraryBig },
  { id: "plan", label: "学习计划", icon: CalendarDays },
  { id: "notes", label: "知识笔记", icon: NotebookPen },
  { id: "practice", label: "练习中心", icon: Target },
  { id: "assistant", label: "AI 助教", icon: Bot },
  { id: "mcp", label: "MCP", icon: Braces },
  { id: "updates", label: "更新管理", icon: PackageCheck }
];

const focusTasks: Task[] = [];
const schedule: ScheduleItem[] = [];
const insights: string[] = [];

function createMindMap(title: string): MindElixirData {
  return MindElixir.new(title);
}

function createCourse(title: string, category: string, description: string): Course {
  return {
    id: crypto.randomUUID(),
    title,
    category,
    description,
    progress: 0,
    createdAt: new Date().toISOString(),
    mindMap: createMindMap(title),
    knowledgePoints: {},
    branchMindMaps: {},
    syncNumberedOutline: true,
    numberedOutlineSnapshot: []
  };
}

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(coursesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Course[];
    return normalizeCourses(parsed);
  } catch {
    return [];
  }
}

function normalizeCourses(value: unknown): Course[] {
  if (!Array.isArray(value)) return [];
  return value.map((course) => ({
    ...course,
    knowledgePoints: course.knowledgePoints ?? {},
    branchMindMaps: course.branchMindMaps ?? {},
    syncNumberedOutline: course.syncNumberedOutline ?? true,
    numberedOutlineSnapshot: course.numberedOutlineSnapshot ?? buildOutline(course.mindMap)
  })) as Course[];
}

function readPersistedCoursePayload(value: unknown): Course[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return normalizeCourses(value);
  if (typeof value === "object" && "courses" in value) {
    return normalizeCourses((value as { courses?: unknown }).courses);
  }
  return null;
}

async function loadPersistedCourses(): Promise<Course[] | null> {
  if (!window.aistudy?.courses) return null;
  const payload = await window.aistudy.courses.load();
  return readPersistedCoursePayload(payload);
}

async function drainCourseSaveQueue() {
  if (courseSaveInFlight) return;
  courseSaveInFlight = true;

  while (pendingCourseSave) {
    const coursesToSave = pendingCourseSave;
    pendingCourseSave = null;
    emitCourseSaveStatus("saving");

    try {
      await window.aistudy?.courses?.save(coursesToSave);
      emitCourseSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save course database", error);
      emitCourseSaveStatus("error");
    }
  }

  courseSaveInFlight = false;
}

function saveCourses(courses: Course[]) {
  const snapshot = JSON.parse(JSON.stringify(courses)) as Course[];
  localStorage.setItem(coursesStorageKey, JSON.stringify(snapshot));

  if (!window.aistudy?.courses?.save) {
    emitCourseSaveStatus("saved");
    return;
  }

  pendingCourseSave = snapshot;
  void drainCourseSaveQueue();
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(settingsStorageKey);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

function scheduleIdleTask(task: () => void, timeout = 500) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(task, { timeout });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = globalThis.setTimeout(task, Math.min(timeout, 250));
  return () => globalThis.clearTimeout(timeoutId);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMindMapText(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[color=(#[0-9a-fA-F]{3,6})\](.+?)\[\/color\]/g, '<span style="color:$1">$2</span>')
    .replace(/\[mark=(#[0-9a-fA-F]{3,6})\](.+?)\[\/mark\]/g, '<mark style="background:$1">$2</mark>');
}

function buildOutline(data: MindElixirData): OutlineItem[] {
  const items: OutlineItem[] = [];

  const getNumbering = (depth: number, index: number): string => {
    // depth=0 是章节标题，不加序号
    if (depth === 0) return "";
    if (depth === 1) {
      // 一、二、三...
      const nums = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"];
      const num = index + 1;
      return num <= 20 ? `${nums[num - 1]}、` : `${num}、`;
    }
    if (depth === 2) {
      // （一）（二）（三）...
      const nums = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"];
      const num = index + 1;
      return num <= 20 ? `（${nums[num - 1]}）` : `（${num}）`;
    }
    if (depth === 3) {
      // 1. 2. 3. ...
      return `${index + 1}.`;
    }
    // depth >= 4: 1) 2) 3) ...
    return `${index + 1})`;
  };

  const walk = (nodes: NodeObj[] | undefined, depth: number, parentId: string) => {
    if (!nodes) return;
    nodes.forEach((node, index) => {
      const numbering = getNumbering(depth, index);
      items.push({ id: node.id, topic: node.topic, depth, parentId, numbering });
      walk(node.children, depth + 1, node.id);
    });
  };

  walk(data.nodeData.children, 0, data.nodeData.id);
  return items;
}

const outlineDirectoryFreezeDepth = 3;

function applyNumberedOutlineSnapshot(nextOutline: OutlineItem[], snapshot: OutlineItem[]) {
  const snapshotItems = new Map(snapshot.map((item) => [item.id, item]));
  const frozenIds = new Set(
    snapshot
      .filter((item) => item.depth >= outlineDirectoryFreezeDepth)
      .map((item) => item.id)
  );

  return nextOutline
    .filter((item) => item.depth < outlineDirectoryFreezeDepth || frozenIds.has(item.id))
    .map((item) => {
      if (item.depth < outlineDirectoryFreezeDepth) return item;
      const frozenItem = snapshotItems.get(item.id);
      return frozenItem
        ? { ...item, topic: frozenItem.topic, numbering: frozenItem.numbering }
        : item;
    });
}

function findMindMapNode(root: NodeObj, nodeId: string): NodeObj | null {
  if (root.id === nodeId) return root;
  for (const child of root.children ?? []) {
    const match = findMindMapNode(child, nodeId);
    if (match) return match;
  }
  return null;
}

function cloneMindData(data: MindElixirData): MindElixirData {
  return JSON.parse(JSON.stringify(data)) as MindElixirData;
}

function createBranchMindMapFromNode(node: NodeObj): MindElixirData {
  return {
    nodeData: JSON.parse(JSON.stringify(node)) as NodeObj,
    arrows: [],
    summaries: [],
    direction: SIDE
  } as MindElixirData;
}

function renderBranchList(nodes: NodeObj[] | undefined): string {
  if (!nodes || nodes.length === 0) return "";
  return `<ul>${nodes
    .map((node) => `<li><span>${escapeHtml(node.topic)}</span>${renderBranchList(node.children)}</li>`)
    .join("")}</ul>`;
}

function renderKnowledgeBranchHtml(branch: NodeObj): string {
  return [
    '<section class="knowledge-branch-map" contenteditable="false">',
    '<button class="branch-map-close" type="button" aria-label="Close branch mind map">&times;</button>',
    '<div class="branch-map-heading">',
    '<span>分支思维导图</span>',
    `<strong>${escapeHtml(branch.topic)}</strong>`,
    "</div>",
    renderBranchList(branch.children) || '<p class="branch-map-empty">当前分支暂无子节点</p>',
    "</section>",
    "<p><br></p>"
  ].join("");
}

function normalizeTag(tag: NonNullable<NodeObj["tags"]>[number]) {
  return typeof tag === "string" ? tag : tag.text;
}

function buildNoteEntries(data: MindElixirData): NoteEntry[] {
  const entries: NoteEntry[] = [];
  let order = 1;
  const walk = (
    nodes: NodeObj[] | undefined,
    depth: number,
    parentId: string,
    parentPath: Array<{ id: string; topic: string; depth: number }>
  ) => {
    nodes?.forEach((node) => {
      const path = [...parentPath, { id: node.id, topic: node.topic, depth }];
      const childTopics = (node.children ?? []).map((child) => child.topic);
      entries.push({
        id: node.id,
        topic: node.topic,
        depth,
        parentId,
        path,
        note: node.note ?? "",
        tags: (node.tags ?? []).map(normalizeTag).filter(Boolean),
        childTopics,
        isLeaf: childTopics.length === 0,
        order
      });
      order += 1;
      walk(node.children, depth + 1, node.id, path);
    });
  };

  walk(data.nodeData.children, 0, data.nodeData.id, []);
  return entries;
}

function App() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseStoreReady, setCourseStoreReady] = useState(false);
  const [courseSaveStatus, setCourseSaveStatus] = useState<CourseSaveStatus>("saved");
  const latestCoursesRef = useRef(courses);

  useEffect(() => {
    const handleSaveStatus = (event: Event) => {
      setCourseSaveStatus((event as CustomEvent<CourseSaveStatus>).detail);
    };

    window.addEventListener(courseSaveStatusEvent, handleSaveStatus);
    return () => window.removeEventListener(courseSaveStatusEvent, handleSaveStatus);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadPersistedCourses()
      .then((persistedCourses) => {
        if (cancelled) return;
        const localCourses = loadCourses();

        if (persistedCourses && persistedCourses.length > 0) {
          latestCoursesRef.current = persistedCourses;
          setCourses(persistedCourses);
        } else if (localCourses.length > 0) {
          latestCoursesRef.current = localCourses;
          void window.aistudy?.courses?.save(localCourses);
        }
      })
      .catch((error) => {
        console.error("Failed to load course database", error);
      })
      .finally(() => {
        if (!cancelled) setCourseStoreReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    latestCoursesRef.current = courses;
    if (!courseStoreReady) return;
    return scheduleIdleTask(() => saveCourses(courses), 650);
  }, [courseStoreReady, courses]);

  useEffect(() => {
    const flushCourses = () => saveCourses(latestCoursesRef.current);
    window.addEventListener("beforeunload", flushCourses);
    return () => window.removeEventListener("beforeunload", flushCourses);
  }, []);

  useEffect(() => {
    return scheduleIdleTask(() => saveSettings(settings), 250);
  }, [settings]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const updateCourse = useCallback((courseId: string, patch: Partial<Course> | ((course: Course) => Partial<Course>)) => {
    setCourses((current) => {
      const nextCourses = current.map((course) =>
        course.id === courseId
          ? { ...course, ...(typeof patch === "function" ? patch(course) : patch) }
          : course
      );
      latestCoursesRef.current = nextCourses;
      saveCourses(nextCourses);
      return nextCourses;
    });
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <img src={mascotUrl} alt="" />
          <div>
            <strong>AIstudy</strong>
            <span>Learning Studio</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id !== "courses") setSelectedCourseId(null);
                }}
              >
                <Icon size={18} strokeWidth={2.1} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="focus-card" aria-label="今日学习状态">
          <Sparkles size={18} />
          <div>
            <strong>今日专注</strong>
            <span>课程推进 0%</span>
          </div>
        </section>

        <button
          className={activeView === "settings" ? "nav-item settings active" : "nav-item settings"}
          onClick={() => {
            setActiveView("settings");
            setSelectedCourseId(null);
          }}
        >
          <Settings size={18} />
          <span>设置</span>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>
              {activeView === "courses"
                ? selectedCourse
                  ? selectedCourse.title
                  : "课程中心"
                : activeView === "updates"
                  ? "更新管理"
                  : activeView === "mcp"
                    ? "MCP"
                  : activeView === "settings"
                    ? "设置"
                  : "学习工作台"}
            </h1>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input aria-label="搜索课程、笔记或练习" placeholder="搜索课程、笔记或练习" />
            </label>
            <button className="icon-button" aria-label="通知">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {activeView === "courses" ? (
          <CourseCenter
            courses={courses}
            selectedCourse={selectedCourse}
            onCreateCourse={(course) => {
              setCourses((current) => [course, ...current]);
              setSelectedCourseId(course.id);
            }}
            onSelectCourse={setSelectedCourseId}
            onBack={() => setSelectedCourseId(null)}
            onUpdateCourse={updateCourse}
            settings={settings}
            saveStatus={courseSaveStatus}
          />
        ) : activeView === "updates" ? (
          <UpdateManager />
        ) : activeView === "mcp" ? (
          <McpPanel />
        ) : activeView === "settings" ? (
          <SettingsPanel
            settings={settings}
            onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))}
          />
        ) : (
          <Dashboard />
        )}
      </section>
    </main>
  );
}

function UpdateManager() {
  const sortedUpdates = [...updateLog].sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true })
  );
  const [openVersion, setOpenVersion] = useState(sortedUpdates[0]?.version ?? "");

  return (
    <section className="update-manager" aria-label="更新管理">
      {sortedUpdates.map((entry, index) => {
        const isOpen = openVersion === entry.version;
        return (
          <article className={isOpen ? "version-card open" : "version-card"} key={entry.version}>
            <button
              className="version-row"
              aria-expanded={isOpen}
              onClick={() => setOpenVersion(isOpen ? "" : entry.version)}
            >
              <div className="version-meta">
                <span className="version-number">v{entry.version}</span>
                <strong>{entry.title}</strong>
                {index === 0 && <span className="latest-badge">最新</span>}
              </div>
              <div className="version-side">
                <time>{entry.date}</time>
                <ChevronDown size={18} />
              </div>
            </button>

            {isOpen && (
              <div className="version-detail">
                <UpdateColumn title="功能更新" items={entry.featureUpdates} />
                <UpdateColumn title="修复说明" items={entry.fixes} />
                <UpdateColumn title="优化说明" items={entry.optimizations} />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function SettingsPanel({
  settings,
  onChange
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <section className="settings-page" aria-label="设置">
      <article className="settings-section">
        <header className="settings-section-header">
          <div className="settings-icon">
            <Keyboard size={20} />
          </div>
          <div>
            <h2>快捷键设置</h2>
          </div>
        </header>

        <div className="shortcut-list">
          <div className="shortcut-row">
            <div>
              <strong>课程思维导图滑动</strong>
              <span>方向键控制画布上下左右平移</span>
            </div>
            <div className="shortcut-keys" aria-label="上下左右方向键">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <kbd>←</kbd>
              <kbd>→</kbd>
            </div>
            <label className="setting-switch">
              <input
                checked={settings.mindMapArrowPan}
                onChange={(event) => onChange({ mindMapArrowPan: event.target.checked })}
                type="checkbox"
              />
              <span />
            </label>
          </div>
        </div>
      </article>
    </section>
  );
}

function McpPanel() {
  const [status, setStatus] = useState<McpNotionImportStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const refreshStatus = useCallback(() => {
    setIsChecking(true);
    void window.aistudy?.mcp
      ?.notionImportStatus()
      .then((nextStatus) => setStatus(nextStatus as McpNotionImportStatus))
      .catch(() => setStatus(null))
      .finally(() => setIsChecking(false));
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const standardReady = Boolean(status?.contractReady && status?.guideReady);
  const accessReady = Boolean(status?.notionCacheReady && status?.jsonDatabaseReady && status?.mysqlConnected);
  const executionReady = Boolean(status?.latestBackupReady);
  const statusLabel = (ready: boolean) => (isChecking ? "检测中" : ready ? "就绪" : "待处理");

  return (
    <section className="mcp-page" aria-label="MCP">
      <section className="mcp-header-panel">
        <div>
          <span>MCP</span>
          <h2>模型上下文协议</h2>
        </div>
        <button className="primary-button" type="button" onClick={refreshStatus}>
          <RotateCcw size={18} />
          <span>{isChecking ? "检测中" : "重新检测"}</span>
        </button>
      </section>

      <section className="mcp-guide">
        <article className={standardReady ? "mcp-step ready" : "mcp-step"}>
          <div className="mcp-card-icon">
            <Braces size={20} />
          </div>
          <div>
            <span>01</span>
            <strong>规范</strong>
          </div>
          <b>{statusLabel(standardReady)}</b>
        </article>

        <article className={accessReady ? "mcp-step ready" : "mcp-step"}>
          <div className="mcp-card-icon">
            <Link2 size={20} />
          </div>
          <div>
            <span>02</span>
            <strong>接入</strong>
          </div>
          <b>{statusLabel(accessReady)}</b>
        </article>

        <article className={executionReady ? "mcp-step ready" : "mcp-step"}>
          <div className="mcp-card-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>03</span>
            <strong>执行</strong>
          </div>
          <b>{statusLabel(executionReady)}</b>
        </article>
      </section>

      <section className="mcp-grid">
        <McpStatusCard title="契约" value={status?.contractReady} meta="contract" />
        <McpStatusCard title="流程" value={status?.guideReady} meta="guide" />
        <McpStatusCard title="写入规范" value={standardReady} meta="gate" />
        <McpStatusCard title="Notion" value={status?.notionCacheReady} meta="cache" />
        <McpStatusCard title="课程库" value={status?.jsonDatabaseReady} meta="json" />
        <McpStatusCard title="MySQL" value={status?.mysqlConnected} meta="sync" />
        <McpStatusCard title="备份" value={status?.latestBackupReady} meta="backup" />
      </section>

      <section className="panel mcp-run-panel">
        <div className="panel-heading">
          <div>
            <h3>Notion 知识点导入</h3>
          </div>
          <CheckCircle2 size={22} />
        </div>
        <div className="mcp-run-list">
          <span>读取 Notion</span>
          <ChevronRight size={16} />
          <span>标题匹配</span>
          <ChevronRight size={16} />
          <span>写入知识点</span>
          <ChevronRight size={16} />
          <span>验证落库</span>
        </div>
      </section>
    </section>
  );
}

function McpStatusCard({ title, value, meta }: { title: string; value?: boolean; meta: string }) {
  const ready = Boolean(value);
  return (
    <article className={ready ? "mcp-card ready" : "mcp-card"}>
      <div className="mcp-card-icon">
        {ready ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
      </div>
      <div>
        <span>{meta}</span>
        <strong>{title}</strong>
      </div>
      <b>{ready ? "就绪" : "待处理"}</b>
    </article>
  );
}

function UpdateColumn({ title, items }: { title: string; items: UpdateLogEntry["featureUpdates"] }) {
  return (
    <section className="update-column">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Dashboard() {
  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="status-pill">
            <GraduationCap size={15} />
            <span>暂无连续学习记录</span>
          </div>
          <h2>学习工作台已准备就绪。</h2>
          <div className="hero-actions">
            <button className="primary-button">
              <CirclePlay size={18} />
              <span>开始学习</span>
            </button>
            <button className="secondary-button">
              <FileText size={18} />
              <span>新建笔记</span>
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src={mascotUrl} alt="" />
        </div>
      </section>

      <section className="metrics" aria-label="学习概览">
        <article className="metric-card">
          <span>本周学习</span>
          <strong>0h</strong>
          <small>暂无记录</small>
        </article>
        <article className="metric-card">
          <span>课程完成</span>
          <strong>0 / 0</strong>
          <small>暂无课程</small>
        </article>
        <article className="metric-card">
          <span>练习正确率</span>
          <strong>0%</strong>
          <small>暂无练习</small>
        </article>
        <article className="metric-card highlight">
          <span>AI 总结</span>
          <strong>0 篇</strong>
          <small>暂无归档</small>
        </article>
      </section>

      <section className="content-grid">
        <section className="panel today-panel">
          <div className="panel-heading">
            <div>
              <h3>今日学习</h3>
            </div>
            <button className="text-button">
              全部
              <ChevronRight size={16} />
            </button>
          </div>
          <EmptyState title="暂无今日学习任务" />
        </section>

        <section className="panel assistant-panel">
          <div className="panel-heading">
            <div>
              <h3>AI 助教</h3>
            </div>
            <Bot size={22} />
          </div>
          <div className="assistant-input">
            <span>暂无学习数据</span>
            <button aria-label="发送">
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        <section className="panel schedule-panel">
          <div className="panel-heading">
            <div>
              <h3>时间安排</h3>
            </div>
            <Clock3 size={21} />
          </div>
          {schedule.length > 0 ? <div className="timeline" /> : <EmptyState title="暂无时间安排" />}
        </section>

        <section className="panel review-panel">
          <div className="panel-heading">
            <div>
              <h3>最近完成</h3>
            </div>
            <CheckCircle2 size={21} />
          </div>
          {insights.length > 0 ? <ul className="done-list" /> : <EmptyState title="暂无完成记录" />}
        </section>
      </section>

    </>
  );
}

function CourseCenter({
  courses,
  selectedCourse,
  onCreateCourse,
  onSelectCourse,
  onBack,
  onUpdateCourse,
  settings,
  saveStatus
}: {
  courses: Course[];
  selectedCourse: Course | null;
  onCreateCourse: (course: Course) => void;
  onSelectCourse: (courseId: string) => void;
  onBack: () => void;
  onUpdateCourse: (courseId: string, patch: Partial<Course> | ((course: Course) => Partial<Course>)) => void;
  settings: AppSettings;
  saveStatus: CourseSaveStatus;
}) {
  if (selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        onBack={onBack}
        onUpdateCourse={onUpdateCourse}
        settings={settings}
        saveStatus={saveStatus}
      />
    );
  }

  return (
    <>
      <section className="course-hero">
        <div>
          <div className="status-pill">
            <LibraryBig size={15} />
            <span>已创建 {courses.length} 门课程</span>
          </div>
          <h2>课程与思维导图</h2>
        </div>
      </section>

      <CreateCoursePanel onCreateCourse={onCreateCourse} />

      <section className="course-toolbar" aria-label="课程筛选">
        <div className="filter-tabs">
          <button className="filter-tab active">全部</button>
        </div>
        <button className="text-button">
          管理分类
          <ChevronRight size={16} />
        </button>
      </section>

      <section className="course-layout">
        <div className="course-list">
          {courses.length > 0 ? (
            courses.map((course) => (
              <article className="course-card" key={course.id}>
                <div className="course-badge teal">
                  <BookOpen size={20} />
                </div>
                <div className="course-main">
                  <div className="course-title-row">
                    <div>
                      <span className="course-category">{course.category || "未分类"}</span>
                      <h3>{course.title}</h3>
                    </div>
                    <button className="icon-button compact" aria-label={`打开 ${course.title}`} onClick={() => onSelectCourse(course.id)}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="course-progress">
                    <div>
                      <strong>{course.progress}%</strong>
                    </div>
                    <div className="progress-wrap" aria-label={`${course.title} 进度 ${course.progress}%`}>
                      <span className="teal" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="暂无课程" />
          )}
        </div>

        <aside className="course-side">
          <section className="panel continue-card">
            <div className="panel-heading">
              <div>
                <h3>继续学习</h3>
              </div>
              <CirclePlay size={21} />
            </div>
            <strong>{courses[0]?.title ?? "暂无继续学习课程"}</strong>
            <button className="primary-button" onClick={() => courses[0] && onSelectCourse(courses[0].id)} disabled={courses.length === 0}>
              <PlayCircle size={18} />
              <span>进入课程</span>
            </button>
          </section>

          <section className="panel course-stats">
            <div className="stat-row">
              <UsersRound size={18} />
              <div>
                <strong>{new Set(courses.map((course) => course.category).filter(Boolean)).size} 个学习方向</strong>
              </div>
            </div>
            <div className="stat-row">
              <Clock3 size={18} />
              <div>
                <strong>本周 0 节待学</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}

function CreateCoursePanel({ onCreateCourse }: { onCreateCourse: (course: Course) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("金融");

  const canCreate = title.trim().length > 0;

  return (
    <section className="panel create-course-panel">
      <div className="panel-heading">
        <div>
          <h3>创建课程</h3>
        </div>
        <Plus size={21} />
      </div>
      <div className="course-form">
        <label>
          <span>课程名称</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="金融市场基础知识" />
        </label>
        <label>
          <span>分类</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="金融" />
        </label>
        <button
          className="primary-button"
          disabled={!canCreate}
          onClick={() => {
            if (!canCreate) return;
            onCreateCourse(createCourse(title.trim(), category.trim(), ""));
            setTitle("");
            setCategory("金融");
          }}
        >
          <Plus size={18} />
          <span>创建并编辑导图</span>
        </button>
      </div>
    </section>
  );
}

function getCourseSaveStatusLabel(status: CourseSaveStatus) {
  if (status === "saving") return "保存中";
  if (status === "error") return "保存失败";
  return "已保存";
}

function CourseDetail({
  course,
  onBack,
  onUpdateCourse,
  settings,
  saveStatus
}: {
  course: Course;
  onBack: () => void;
  onUpdateCourse: (courseId: string, patch: Partial<Course> | ((course: Course) => Partial<Course>)) => void;
  settings: AppSettings;
  saveStatus: CourseSaveStatus;
}) {
  const [workspaceMode, setWorkspaceMode] = useState<CourseWorkspaceMode>("knowledge");

  return (
    <>
      <section className="course-detail-header">
        <button className="secondary-button" onClick={onBack}>
          <ChevronLeft size={18} />
          <span>返回课程中心</span>
        </button>
        <div>
          <span className="course-category">{course.category || "未分类"}</span>
        </div>
        <div className={`auto-save-status ${saveStatus}`}>
          <Save size={18} />
          <span>{getCourseSaveStatusLabel(saveStatus)}</span>
        </div>
      </section>

      <section className="mindmap-shell">
        <div className="mindmap-toolbar">
          <div>
            <h3>课程工作区</h3>
          </div>
          <div className="workspace-switch" aria-label="课程功能切换">
            <button className={workspaceMode === "knowledge" ? "active" : ""} onClick={() => setWorkspaceMode("knowledge")}>
              知识点
            </button>
            <button className={workspaceMode === "notes" ? "active" : ""} onClick={() => setWorkspaceMode("notes")}>
              知识笔记
            </button>
            <button className={workspaceMode === "mindmap" ? "active" : ""} onClick={() => setWorkspaceMode("mindmap")}>
              思维导图
            </button>
          </div>
        </div>
        <MindMapEditor
          courseId={course.id}
          title={course.title}
          data={course.mindMap}
          mode={workspaceMode}
          knowledgePoints={course.knowledgePoints ?? {}}
          branchMindMaps={course.branchMindMaps ?? {}}
          syncNumberedOutline={course.syncNumberedOutline ?? true}
          numberedOutlineSnapshot={course.numberedOutlineSnapshot ?? buildOutline(course.mindMap)}
          onChange={(mindMap) => onUpdateCourse(course.id, { mindMap })}
          onOutlineSyncStateChange={(syncNumberedOutline, numberedOutlineSnapshot) =>
            onUpdateCourse(course.id, { syncNumberedOutline, numberedOutlineSnapshot })
          }
          onBranchMindMapChange={(nodeId, mindMap) =>
            onUpdateCourse(course.id, (currentCourse) => ({
              branchMindMaps: {
                ...(currentCourse.branchMindMaps ?? {}),
                [nodeId]: mindMap
              }
            }))
          }
          onKnowledgeChange={(nodeId, content) =>
            onUpdateCourse(course.id, (currentCourse) => ({
              knowledgePoints: {
                ...(currentCourse.knowledgePoints ?? {}),
                [nodeId]: content
              }
            }))
          }
          settings={settings}
          saveStatus={saveStatus}
        />
      </section>
    </>
  );
}

function MindMapEditor({
  courseId,
  title,
  data,
  mode,
  knowledgePoints,
  branchMindMaps,
  syncNumberedOutline: persistedSyncNumberedOutline,
  numberedOutlineSnapshot: persistedNumberedOutlineSnapshot,
  onChange,
  onOutlineSyncStateChange,
  onBranchMindMapChange,
  onKnowledgeChange,
  settings,
  saveStatus
}: {
  courseId: string;
  title: string;
  data: MindElixirData;
  mode: CourseWorkspaceMode;
  knowledgePoints: Record<string, string>;
  branchMindMaps: Record<string, MindElixirData>;
  syncNumberedOutline: boolean;
  numberedOutlineSnapshot: OutlineItem[];
  onChange: (data: MindElixirData) => void;
  onOutlineSyncStateChange: (syncNumberedOutline: boolean, numberedOutlineSnapshot: OutlineItem[]) => void;
  onBranchMindMapChange: (nodeId: string, data: MindElixirData) => void;
  onKnowledgeChange: (nodeId: string, content: string) => void;
  settings: AppSettings;
  saveStatus: CourseSaveStatus;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const outlineListRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLElement | null>(null);
  const mindRef = useRef<MindElixirInstance | null>(null);
  const canvasDragRef = useRef({ active: false, x: 0, y: 0 });
  const panControlRef = useRef({ x: panControlCenter, y: panControlCenter });
  const outlineResizeRef = useRef({ active: false, startX: 0, startWidth: 0 });
  const [outline, setOutline] = useState<OutlineItem[]>(() =>
    persistedSyncNumberedOutline
      ? buildOutline(data)
      : applyNumberedOutlineSnapshot(buildOutline(data), persistedNumberedOutlineSnapshot)
  );
  const [noteEntries, setNoteEntries] = useState<NoteEntry[]>(() => buildNoteEntries(data));
  const [compactMode, setCompactMode] = useState(false);
  const [syncNumberedOutline, setSyncNumberedOutline] = useState(persistedSyncNumberedOutline);
  const [upstreamBranchIsolation, setUpstreamBranchIsolation] = useState(false);
  const [downstreamBranchIsolation, setDownstreamBranchIsolation] = useState(false);
  const [mindFormatBrush, setMindFormatBrush] = useState<NonNullable<NodeObj["style"]> | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState(data.nodeData.id);
  const [selectedNodeCount, setSelectedNodeCount] = useState(1);
  const [toolHint, setToolHint] = useState("");
  const [dragMode, setDragMode] = useState(false);
  const [expandedEdit, setExpandedEdit] = useState(false);
  const [draggingOutlineId, setDraggingOutlineId] = useState<string | null>(null);
  const [outlineDropTargetId, setOutlineDropTargetId] = useState<string | null>(null);
  const [outlineScroll, setOutlineScroll] = useState(0);
  const [panControl, setPanControl] = useState({ x: panControlCenter, y: panControlCenter });
  const [shouldMountMindMap, setShouldMountMindMap] = useState(mode === "mindmap");
  const [isOutlineResizing, setIsOutlineResizing] = useState(false);

  const onChangeRef = useRef(onChange);
  const onOutlineSyncStateChangeRef = useRef(onOutlineSyncStateChange);
  const onBranchMindMapChangeRef = useRef(onBranchMindMapChange);
  const mainMindDataRef = useRef(data);
  const branchMindMapsRef = useRef(branchMindMaps);
  const selectedPageIdRef = useRef(data.nodeData.id);
  const upstreamBranchIsolationRef = useRef(false);
  const downstreamBranchIsolationRef = useRef(false);
  const activeBranchCanvasIdRef = useRef<string | null>(null);
  const syncNumberedOutlineRef = useRef(persistedSyncNumberedOutline);
  const numberedOutlineSnapshotRef = useRef<OutlineItem[]>(
    persistedNumberedOutlineSnapshot.length > 0 ? persistedNumberedOutlineSnapshot : buildOutline(data)
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onOutlineSyncStateChangeRef.current = onOutlineSyncStateChange;
  }, [onOutlineSyncStateChange]);

  useEffect(() => {
    onBranchMindMapChangeRef.current = onBranchMindMapChange;
  }, [onBranchMindMapChange]);

  useEffect(() => {
    mainMindDataRef.current = data;
  }, [data]);

  useEffect(() => {
    branchMindMapsRef.current = branchMindMaps;
  }, [branchMindMaps]);

  useEffect(() => {
    selectedPageIdRef.current = selectedPageId;
  }, [selectedPageId]);

  useEffect(() => {
    upstreamBranchIsolationRef.current = upstreamBranchIsolation;
  }, [upstreamBranchIsolation]);

  useEffect(() => {
    downstreamBranchIsolationRef.current = downstreamBranchIsolation;
  }, [downstreamBranchIsolation]);

  useEffect(() => {
    syncNumberedOutlineRef.current = syncNumberedOutline;
  }, [syncNumberedOutline]);

  const persistOutlineSyncState = (nextSyncState: boolean, nextSnapshot: OutlineItem[]) => {
    syncNumberedOutlineRef.current = nextSyncState;
    numberedOutlineSnapshotRef.current = nextSnapshot;
    setSyncNumberedOutline(nextSyncState);
    onOutlineSyncStateChangeRef.current(nextSyncState, nextSnapshot);
  };

  const refreshOutlineViews = (nextData: MindElixirData) => {
    const nextOutline = buildOutline(nextData);
    const visibleOutline = syncNumberedOutlineRef.current
      ? nextOutline
      : applyNumberedOutlineSnapshot(nextOutline, numberedOutlineSnapshotRef.current);

    if (syncNumberedOutlineRef.current) {
      numberedOutlineSnapshotRef.current = nextOutline;
    }

    setOutline(visibleOutline);
    setNoteEntries(buildNoteEntries(nextData));
  };

  const getBranchMindData = (nodeId: string) => {
    const storedBranch = branchMindMapsRef.current[nodeId];
    if (storedBranch) return cloneMindData(storedBranch);
    const branchNode = findMindMapNode(mainMindDataRef.current.nodeData, nodeId);
    return branchNode ? createBranchMindMapFromNode(branchNode) : null;
  };

  const isIsolatedBranchSession = () => {
    const rootNodeId = mainMindDataRef.current.nodeData.id;
    return upstreamBranchIsolationRef.current && selectedPageIdRef.current !== rootNodeId;
  };

  const syncDescendantBranchMindMaps = (branchRoot: NodeObj) => {
    if (downstreamBranchIsolationRef.current) return;
    const updates: Array<{ nodeId: string; data: MindElixirData }> = [];
    const walk = (node: NodeObj) => {
      node.children?.forEach((child) => {
        if (branchMindMapsRef.current[child.id]) {
          updates.push({ nodeId: child.id, data: createBranchMindMapFromNode(child) });
        }
        walk(child);
      });
    };

    walk(branchRoot);
    updates.forEach(({ nodeId, data }) => saveBranchMindMap(nodeId, data));
  };

  const saveBranchMindMap = (nodeId: string, nextData: MindElixirData) => {
    const savedData = cloneMindData(nextData);
    branchMindMapsRef.current = {
      ...branchMindMapsRef.current,
      [nodeId]: savedData
    };
    onBranchMindMapChangeRef.current(nodeId, savedData);
  };

  const persistCurrentCanvasBeforeNavigation = () => {
    const mind = mindRef.current;
    if (!mind) return;
    const nextData = mind.getData();
    const branchCanvasId = activeBranchCanvasIdRef.current;

    if (branchCanvasId) {
      saveBranchMindMap(branchCanvasId, nextData);
      syncDescendantBranchMindMaps(nextData.nodeData);
      return;
    }

    mainMindDataRef.current = nextData;
    onChangeRef.current(nextData);
    refreshOutlineViews(nextData);
    syncDescendantBranchMindMaps(nextData.nodeData);
  };

  const openMainMindMap = (focusId?: string) => {
    const mind = mindRef.current;
    if (!mind) return;
    const nextData = cloneMindData(mainMindDataRef.current);
    activeBranchCanvasIdRef.current = null;
    mind.refresh(nextData);
    refreshOutlineViews(nextData);
    requestAnimationFrame(() => {
      const targetId = focusId ?? nextData.nodeData.id;
      const topic = mind.findEle(targetId);
      if (!topic) return;
      mind.selectNode(topic);
      if (targetId === nextData.nodeData.id) {
        mind.scrollIntoView(topic, true);
        mind.toCenter();
      } else {
        mind.focusNode(topic);
        mind.scrollIntoView(topic, true);
      }
    });
  };

  const openIsolatedBranchMindMap = (nodeId: string) => {
    const mind = mindRef.current;
    if (!mind) return false;
    const branchData = getBranchMindData(nodeId);
    if (!branchData) return false;
    activeBranchCanvasIdRef.current = nodeId;
    mind.refresh(branchData);
    setSelectedNodeId(branchData.nodeData.id);
    setSelectedNodeCount(1);
    requestAnimationFrame(() => {
      const rootNode = mind.findEle(branchData.nodeData.id);
      if (!rootNode) return;
      mind.selectNode(rootNode);
      mind.scrollIntoView(rootNode, true);
      mind.toCenter();
    });
    return true;
  };

  const persistCurrentMindData = (nextData: MindElixirData) => {
    const branchCanvasId = activeBranchCanvasIdRef.current;
    if (branchCanvasId) {
      saveBranchMindMap(branchCanvasId, nextData);
      syncDescendantBranchMindMaps(nextData.nodeData);
      setToolHint("上分支隔离已开启：仅保存当前分支");
      return;
    }

    mainMindDataRef.current = nextData;
    refreshOutlineViews(nextData);
    onChangeRef.current(nextData);
    syncDescendantBranchMindMaps(nextData.nodeData);
  };

  useEffect(() => {
    if (mode === "mindmap") {
      setShouldMountMindMap(true);
    }
  }, [mode]);

  useEffect(() => {
    selectedPageIdRef.current = data.nodeData.id;
    upstreamBranchIsolationRef.current = false;
    downstreamBranchIsolationRef.current = false;
    activeBranchCanvasIdRef.current = null;
    setSelectedPageId(data.nodeData.id);
    setSelectedNodeId(data.nodeData.id);
    setSelectedNodeCount(1);
    setUpstreamBranchIsolation(false);
    setDownstreamBranchIsolation(false);
    const nextOutline = buildOutline(data);
    const nextSnapshot = persistedNumberedOutlineSnapshot.length > 0
      ? persistedNumberedOutlineSnapshot
      : nextOutline;
    syncNumberedOutlineRef.current = persistedSyncNumberedOutline;
    numberedOutlineSnapshotRef.current = nextSnapshot;
    setSyncNumberedOutline(persistedSyncNumberedOutline);
    setOutline(
      persistedSyncNumberedOutline
        ? nextOutline
        : applyNumberedOutlineSnapshot(nextOutline, nextSnapshot)
    );
    setNoteEntries(buildNoteEntries(data));
  }, [courseId, data.nodeData.id, persistedSyncNumberedOutline, persistedNumberedOutlineSnapshot]);

  useEffect(() => {
    if (!shouldMountMindMap) return;
    if (!containerRef.current) return;

    const mind = new MindElixir({
      el: containerRef.current,
      direction: SIDE,
      editable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
      allowUndo: true,
      draggable: true,
      overflowHidden: false,
      markdown: (text: string) => renderMindMapText(text)
    } as any);

    mind.init(data || createMindMap(title));
    mindRef.current = mind;
    const initialData = mind.getData();
    refreshOutlineViews(initialData);
    setSelectedNodeId(mind.nodeData.id);

    mind.bus.addListener("operation", () => {
      const nextData = mind.getData();
      persistCurrentMindData(nextData);
    });
    mind.bus.addListener("selectNodes", (nodes) => {
      const nextSelectedId = nodes[0]?.id ?? null;
      setSelectedNodeId(nextSelectedId);
      setSelectedNodeCount(nodes.length || 0);
      if (nodes.length >= 2) setToolHint("");
    });

    return () => {
      const nextData = mind.getData();
      const branchCanvasId = activeBranchCanvasIdRef.current;
      if (branchCanvasId) {
        saveBranchMindMap(branchCanvasId, nextData);
      } else {
        onChangeRef.current(nextData);
      }
      mind.destroy();
      mindRef.current = null;
    };
  }, [courseId, title, shouldMountMindMap]);

  const focusMindNode = (id: string) => {
    const mind = mindRef.current;
    if (!mind) return;
    if ((mind as MindElixirInstance & { isFocusMode?: boolean }).isFocusMode) {
      mind.cancelFocus();
    }
    requestAnimationFrame(() => {
      const topic = mind.findEle(id);
      if (!topic) return;
      mind.selectNode(topic);
      mind.focusNode(topic);
      mind.scrollIntoView(topic, true);
    });
  };

  const focusOutlineNode = (id: string) => {
    persistCurrentCanvasBeforeNavigation();
    selectedPageIdRef.current = id;
    setSelectedNodeId(id);
    setSelectedPageId(id);
    setSelectedNodeCount(1);
    if (upstreamBranchIsolationRef.current && id !== mainMindDataRef.current.nodeData.id && openIsolatedBranchMindMap(id)) {
      return;
    }
    if (isIsolatedBranchSession()) {
      openMainMindMap(id);
      return;
    }
    focusMindNode(id);
  };

  const focusRootMindMap = () => {
    persistCurrentCanvasBeforeNavigation();
    const rootNodeId = mainMindDataRef.current.nodeData.id;
    selectedPageIdRef.current = rootNodeId;
    setSelectedPageId(rootNodeId);
    setSelectedNodeId(rootNodeId);
    setSelectedNodeCount(1);
    const mind = mindRef.current;
    if (!mind) return;
    if (isIsolatedBranchSession() || mind.nodeData.id !== rootNodeId) {
      openMainMindMap(rootNodeId);
      return;
    }
    if ((mind as MindElixirInstance & { isFocusMode?: boolean }).isFocusMode) {
      mind.cancelFocus();
    }
    const rootNode = mind.findEle(rootNodeId);
    if (rootNode) {
      mind.selectNode(rootNode);
      mind.scrollIntoView(rootNode, true);
    }
    mind.toCenter();
    const nextData = mind.getData();
    persistCurrentMindData(nextData);
  };

  useEffect(() => {
    if (mode !== "mindmap") return;
    if (!shouldMountMindMap) return;
    const rootNodeId = mainMindDataRef.current.nodeData.id;
    if (activeBranchCanvasIdRef.current === selectedPageId) return;
    if (selectedPageId === rootNodeId) {
      focusRootMindMap();
      return;
    }
    if (upstreamBranchIsolationRef.current && openIsolatedBranchMindMap(selectedPageId)) {
      return;
    }
    focusMindNode(selectedPageId);
  }, [mode, shouldMountMindMap, selectedPageId]);

  const syncMindData = () => {
    const mind = mindRef.current;
    if (!mind) return;
    const nextData = mind.getData();
    persistCurrentMindData(nextData);
  };

  const toggleNumberedOutlineSync = () => {
    const mind = mindRef.current;
    const nextData = mind?.getData() ?? data;
    const nextOutline = buildOutline(nextData);
    const nextSyncState = !syncNumberedOutlineRef.current;

    if (nextSyncState) {
      persistOutlineSyncState(true, nextOutline);
      setOutline(nextOutline);
      setToolHint("目录同步已开启");
    } else {
      persistOutlineSyncState(false, nextOutline);
      setOutline(applyNumberedOutlineSnapshot(nextOutline, nextOutline));
      setToolHint("目录同步已关闭");
    }

    setNoteEntries(buildNoteEntries(nextData));
  };

  const toggleUpstreamBranchIsolation = () => {
    persistCurrentCanvasBeforeNavigation();
    const nextIsolationState = !upstreamBranchIsolationRef.current;
    const rootNodeId = mainMindDataRef.current.nodeData.id;
    const activePageId = selectedPageIdRef.current;

    upstreamBranchIsolationRef.current = nextIsolationState;
    setUpstreamBranchIsolation(nextIsolationState);

    if (nextIsolationState) {
      if (activePageId !== rootNodeId && openIsolatedBranchMindMap(activePageId)) {
        setToolHint("上分支隔离已开启：当前分支不会回写上级导图");
        return;
      }
      setToolHint("上分支隔离已开启：选择子分支后生效");
      return;
    }

    openMainMindMap(activePageId === rootNodeId ? rootNodeId : activePageId);
    setToolHint("上分支隔离已关闭：编辑将回写上级导图");
  };

  const toggleDownstreamBranchIsolation = () => {
    const nextIsolationState = !downstreamBranchIsolationRef.current;
    downstreamBranchIsolationRef.current = nextIsolationState;
    setDownstreamBranchIsolation(nextIsolationState);
    setToolHint(nextIsolationState
      ? "下分支隔离已开启：下级分支导图不再跟随当前分支"
      : "下分支隔离已关闭：下级分支导图将跟随当前分支"
    );
  };

  const findNodeSiblings = (root: NodeObj, targetId: string): { siblings: NodeObj[]; index: number; parentId: string } | null => {
    const walk = (node: NodeObj): { siblings: NodeObj[]; index: number; parentId: string } | null => {
      const children = node.children ?? [];
      const index = children.findIndex((child) => child.id === targetId);
      if (index >= 0) {
        return { siblings: children, index, parentId: node.id };
      }
      for (const child of children) {
        const match = walk(child);
        if (match) return match;
      }
      return null;
    };

    return walk(root);
  };

  const reorderOutlineNode = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const mind = mindRef.current;
    if (!mind) return;
    if ((mind as MindElixirInstance & { isFocusMode?: boolean }).isFocusMode) {
      setToolHint("请先回到主思维导图后再调整章节顺序");
      return;
    }

    const nextData = JSON.parse(JSON.stringify(mind.getData())) as MindElixirData;
    const source = findNodeSiblings(nextData.nodeData, draggedId);
    const target = findNodeSiblings(nextData.nodeData, targetId);
    if (!source || !target) return;
    if (source.parentId !== target.parentId) {
      setToolHint("只支持同级章节上下排序");
      return;
    }

    const [draggedNode] = source.siblings.splice(source.index, 1);
    const targetIndex = source.index < target.index ? target.index - 1 : target.index;
    source.siblings.splice(targetIndex, 0, draggedNode);
    mind.refresh(nextData);
    refreshOutlineViews(nextData);
    setSelectedNodeId(draggedId);
    setSelectedNodeCount(1);
    setToolHint("章节顺序已同步");
    onChangeRef.current(nextData);
    requestAnimationFrame(() => {
      const node = mind.findEle(draggedId);
      if (node) mind.selectNode(node);
    });
  };

  const getActiveNode = () => {
    const mind = mindRef.current;
    if (!mind) return null;
    return mind.currentNode ?? mind.findEle(mind.nodeData.id);
  };

  const runWithActiveNode = async (operation: (mind: MindElixirInstance, node: NonNullable<MindElixirInstance["currentNode"]>) => void | Promise<void>) => {
    const mind = mindRef.current;
    const node = getActiveNode();
    if (!mind || !node) return;
    await operation(mind, node);
    syncMindData();
  };

  const replaceSelectedEditText = (format: (selectedText: string) => string) => {
    const input = document.getElementById("input-box");
    const selection = window.getSelection();
    if (!input || !selection || selection.rangeCount === 0 || !input.contains(selection.anchorNode)) {
      return false;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    if (!selectedText) return false;

    range.deleteContents();
    const textNode = document.createTextNode(format(selectedText));
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    return true;
  };

  const updateActiveNodeStyle = async (patch: NonNullable<NodeObj["style"]>) => {
    await runWithActiveNode((mind, node) => {
      const nextStyle = { ...(node.nodeObj.style ?? {}), ...patch };
      return mind.reshapeNode(node, { style: nextStyle });
    });
  };

  const copyMindNodeFormat = () => {
    const node = getActiveNode();
    if (!node) return;
    setMindFormatBrush({ ...(node.nodeObj.style ?? {}) });
    setToolHint("导图格式已复制");
  };

  const applyMindNodeFormat = async () => {
    if (!mindFormatBrush) {
      copyMindNodeFormat();
      return;
    }

    await runWithActiveNode((mind, node) => {
      return mind.reshapeNode(node, { style: { ...mindFormatBrush } });
    });
    setToolHint("导图格式已应用");
  };

  const toggleBold = async () => {
    if (replaceSelectedEditText((text) => `**${text}**`)) return;
    const node = getActiveNode();
    const isBold = node?.nodeObj.style?.fontWeight === "800" || node?.nodeObj.style?.fontWeight === "bold";
    await updateActiveNodeStyle({ fontWeight: isBold ? "500" : "800" });
  };

  const applyTextColor = async (color: string) => {
    if (replaceSelectedEditText((text) => `[color=${color}]${text}[/color]`)) return;
    await updateActiveNodeStyle({ color });
  };

  const applyTextMark = async (color: string) => {
    if (replaceSelectedEditText((text) => `[mark=${color}]${text}[/mark]`)) return;
    await runWithActiveNode((mind, node) => {
      const tags = node.nodeObj.tags ?? [];
      const hasMarkTag = tags.some((tag) => (typeof tag === "string" ? tag : tag.text) === "标注");
      return mind.reshapeNode(node, {
        tags: hasMarkTag ? tags : [...tags, { text: "标注", style: { background: color, color: "#111827" } }]
      });
    });
  };

  const createRelationship = () => {
    const mind = mindRef.current;
    if (!mind || mind.currentNodes.length < 2) {
      setToolHint("关系线需要先 Ctrl 多选两个主题");
      return;
    }
    mind.createArrow(mind.currentNodes[0], mind.currentNodes[1], {
      bidirectional: false,
      style: { stroke: "#e86f6f", strokeWidth: 2, labelColor: "#647084" }
    });
    syncMindData();
  };

  const createSummary = () => {
    const mind = mindRef.current;
    if (!mind || mind.currentNodes.length < 2) {
      setToolHint("概要需要先 Ctrl 多选同一组主题");
      return;
    }
    mind.createSummary({ style: { stroke: "#0f766e", labelColor: "#0f766e" } });
    syncMindData();
  };

  const addNodeTag = async () => {
    await runWithActiveNode((mind, node) => {
      const tags = node.nodeObj.tags ?? [];
      const hasTag = tags.some((tag) => (typeof tag === "string" ? tag : tag.text) === "标签");
      return mind.reshapeNode(node, {
        tags: hasTag ? tags : [...tags, { text: "标签", style: { background: "#def7ec", color: "#0f766e" } }]
      });
    });
  };

  const addNodeNote = async () => {
    await runWithActiveNode((mind, node) => mind.reshapeNode(node, { note: node.nodeObj.note || "备注" }));
  };

  const clampPanControl = (value: number) => Math.min(panControlMax, Math.max(panControlMin, value));

  const updatePanControl = (nextValue: { x: number; y: number }) => {
    panControlRef.current = nextValue;
    setPanControl(nextValue);
  };

  const panCanvasBy = (dx: number, dy: number) => {
    const mind = mindRef.current;
    if (!mind) return;
    mind.move(dx, dy);
    updatePanControl({
      x: clampPanControl(panControlRef.current.x + dx / panControlScale),
      y: clampPanControl(panControlRef.current.y + dy / panControlScale)
    });
  };

  const slideCanvasTo = (axis: "x" | "y", value: number) => {
    const nextValue = clampPanControl(value);
    const currentValue = panControlRef.current[axis];
    const delta = (nextValue - currentValue) * panControlScale;
    if (axis === "x") {
      mindRef.current?.move(delta, 0);
      updatePanControl({ ...panControlRef.current, x: nextValue });
    } else {
      mindRef.current?.move(0, delta);
      updatePanControl({ ...panControlRef.current, y: nextValue });
    }
  };

  useEffect(() => {
    if (mode !== "mindmap") return;
    if (!settings.mindMapArrowPan) return;

    const handleArrowPan = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable ||
        target?.id === "input-box";

      if (isTextInput) return;

      const distance = event.shiftKey ? 260 : 120;
      const movement: Record<string, [number, number]> = {
        ArrowLeft: [-distance, 0],
        ArrowRight: [distance, 0],
        ArrowUp: [0, -distance],
        ArrowDown: [0, distance]
      };
      const delta = movement[event.key];
      if (!delta) return;

      event.preventDefault();
      panCanvasBy(delta[0], delta[1]);
    };

    window.addEventListener("keydown", handleArrowPan);
    return () => window.removeEventListener("keydown", handleArrowPan);
  }, [mode, settings.mindMapArrowPan]);

  // 快捷键删除分支
  useEffect(() => {
    if (mode !== "mindmap") return;

    const handleDeleteBranch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // 在文本输入框内不处理（允许正常删除字符）
      if (isTextInput) return;

      // Delete 或 Backspace 键删除分支
      if (event.key === "Delete" || event.key === "Backspace") {
        const mind = mindRef.current;
        if (!mind) return;

        const node = getActiveNode();
        if (!node) return;

        // 不能删除根节点
        if (node.nodeObj.id === mind.nodeData.id) return;

        event.preventDefault();
        event.stopPropagation();
        mind.removeNodes([node]);
        syncMindData();
      }
    };

    window.addEventListener("keydown", handleDeleteBranch, true);
    return () => window.removeEventListener("keydown", handleDeleteBranch, true);
  }, [mode]);

  const startCanvasDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMode) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    canvasDragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("dragging");
  };

  const dragCanvas = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = canvasDragRef.current;
    if (!dragState.active) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    panCanvasBy(dx, dy);
    canvasDragRef.current = { active: true, x: event.clientX, y: event.clientY };
  };

  const stopCanvasDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasDragRef.current.active) return;
    event.preventDefault();
    event.stopPropagation();
    canvasDragRef.current.active = false;
    event.currentTarget.classList.remove("dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const updateOutlineScroll = () => {
    const list = outlineListRef.current;
    if (!list) return;
    const maxScroll = Math.max(list.scrollHeight - list.clientHeight, 1);
    setOutlineScroll(Math.round((list.scrollTop / maxScroll) * 1000));
  };

  const slideOutlineTo = (value: number) => {
    const list = outlineListRef.current;
    if (!list) return;
    const maxScroll = Math.max(list.scrollHeight - list.clientHeight, 0);
    if (maxScroll === 0) {
      list.scrollTop = 0;
      setOutlineScroll(0);
      return;
    }
    list.scrollTop = (maxScroll * value) / 1000;
    setOutlineScroll(value);
  };

  const scrollOutlineBy = (distance: number) => {
    const list = outlineListRef.current;
    if (!list) return;
    list.scrollBy({ top: distance, behavior: "smooth" });
    window.setTimeout(updateOutlineScroll, 180);
  };

  const startOutlineResize = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const outline = outlineRef.current;
    if (!outline) return;
    outlineResizeRef.current = {
      active: true,
      startX: event.clientX,
      startWidth: outline.offsetWidth
    };
    setIsOutlineResizing(true);
    document.addEventListener("mousemove", handleOutlineResize);
    document.addEventListener("mouseup", stopOutlineResize);
  };

  const handleOutlineResize = (event: MouseEvent) => {
    const resizeState = outlineResizeRef.current;
    if (!resizeState.active) return;
    const outline = outlineRef.current;
    if (!outline) return;
    const deltaX = event.clientX - resizeState.startX;
    const newWidth = Math.min(500, Math.max(180, resizeState.startWidth + deltaX));
    outline.style.width = `${newWidth}px`;
    // 更新 CSS 变量，让右边区域自适应
    document.documentElement.style.setProperty('--outline-width', `${newWidth}px`);
  };

  const stopOutlineResize = () => {
    outlineResizeRef.current.active = false;
    setIsOutlineResizing(false);
    document.removeEventListener("mousemove", handleOutlineResize);
    document.removeEventListener("mouseup", stopOutlineResize);
  };

  const rootNodeId = mainMindDataRef.current.nodeData.id;
  const canvasRootNodeId = mindRef.current?.nodeData.id ?? rootNodeId;
  const activePageId = selectedPageId ?? rootNodeId;
  const activeEditNodeId = selectedNodeId ?? activePageId;
  const isRootSelected = activeEditNodeId === canvasRootNodeId;
  const canUseMultiNodeTool = selectedNodeCount >= 2;
  const activeKnowledge = knowledgePoints[activePageId] ?? "";
  const activeBranchNode = branchMindMaps[activePageId]?.nodeData ?? findMindMapNode(data.nodeData, activePageId);
  const activeOutlineItem = outline.find((item) => item.id === activePageId);
  const activeTopic = activeBranchNode?.topic ?? activeOutlineItem?.topic ?? title;

  return (
    <div className="mindmap-editor-layout">
      <aside
        className={isOutlineResizing ? "mindmap-outline resizing" : "mindmap-outline"}
        ref={outlineRef}
      >
        <div className="outline-heading">
          <strong>目录</strong>
          <span>{outline.length}</span>
        </div>
        {outline.length > 0 ? (
          <div className="outline-scroll-area">
          <div className="outline-list" onScroll={updateOutlineScroll} ref={outlineListRef}>
            <button
              className={activePageId === rootNodeId ? "outline-item root active" : "outline-item root"}
              onClick={focusRootMindMap}
            >
              主思维导图
            </button>
            {outline.map((item) => (
              <button
                className={[
                  "outline-item",
                  `depth-${Math.min(item.depth, 5)}`,
                  item.numbering ? "has-numbering" : "",
                  activePageId === item.id ? "active" : "",
                  draggingOutlineId === item.id ? "dragging" : "",
                  outlineDropTargetId === item.id ? "drop-target" : ""
                ].filter(Boolean).join(" ")}
                draggable
                key={item.id}
                onDragEnd={() => {
                  setDraggingOutlineId(null);
                  setOutlineDropTargetId(null);
                }}
                onDragEnter={() => {
                  if (draggingOutlineId && draggingOutlineId !== item.id) {
                    setOutlineDropTargetId(item.id);
                  }
                }}
                onDragOver={(event) => {
                  if (!draggingOutlineId || draggingOutlineId === item.id) return;
                  event.preventDefault();
                }}
                onDragStart={(event) => {
                  setDraggingOutlineId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedId = event.dataTransfer.getData("text/plain") || draggingOutlineId;
                  setDraggingOutlineId(null);
                  setOutlineDropTargetId(null);
                  if (draggedId) reorderOutlineNode(draggedId, item.id);
                }}
                onClick={() => focusOutlineNode(item.id)}
                style={{ paddingLeft: `${8 + item.depth * 22 + (item.depth >= 3 ? 16 : 0)}px` }}
              >
                {item.numbering && <span className="outline-numbering">{item.numbering}</span>}
                <span className="outline-topic">{item.topic}</span>
              </button>
            ))}
          </div>
          <div className="outline-scroll-control" aria-label="目录上下滑动">
            <button type="button" title="向上滑动目录" onClick={() => scrollOutlineBy(-128)}>
              <ChevronUp size={15} />
            </button>
            <input
              aria-label="目录上下滑动"
              max={1000}
              min={0}
              onChange={(event) => slideOutlineTo(Number(event.target.value))}
              type="range"
              value={outlineScroll}
            />
            <button type="button" title="向下滑动目录" onClick={() => scrollOutlineBy(128)}>
              <ChevronDown size={15} />
            </button>
          </div>
          </div>
        ) : (
          <div className="outline-empty">暂无分支</div>
        )}
        <div
          className="outline-resize-handle"
          onMouseDown={startOutlineResize}
          title="拖动调整宽度"
        />
      </aside>
      <div className="mindmap-stage">
        {mode === "knowledge" && (
          <KnowledgePanel
            key={activePageId}
            nodeId={activePageId}
            topic={activeTopic}
            value={activeKnowledge}
            branchNode={activeBranchNode}
            onKnowledgeChange={onKnowledgeChange}
            saveStatus={saveStatus}
          />
        )}

        {mode === "notes" && (
          <KnowledgeNotesPanel activeNodeId={activePageId} entries={noteEntries} rootNodeId={rootNodeId} title={title} />
        )}

        {shouldMountMindMap && (
          <div
            className={[
              "mindmap-mode-panel",
              mode === "mindmap" ? "active" : "",
              expandedEdit ? "expanded-edit" : ""
            ].filter(Boolean).join(" ")}
            aria-hidden={mode !== "mindmap"}
          >
          <div className="mindmap-format-bar" aria-label="导图排版工具">
            <div className="tool-row primary-tools">
              <div className="tool-group">
                <span>布局</span>
                <button title="双向布局" onClick={() => { mindRef.current?.initSide(); syncMindData(); }}>
                  <Rows3 size={16} />
                  <span>双向</span>
                </button>
                <button title="向右布局" onClick={() => { mindRef.current?.initRight(); syncMindData(); }}>
                  <PanelRight size={16} />
                  <span>向右</span>
                </button>
                <button title="向左布局" onClick={() => { mindRef.current?.initLeft(); syncMindData(); }}>
                  <PanelLeft size={16} />
                  <span>向左</span>
                </button>
                <button
                  className={compactMode ? "active" : ""}
                  title="紧凑排版"
                  onClick={() => {
                    const nextCompactMode = !compactMode;
                    mindRef.current?.changeCompact(nextCompactMode);
                    setCompactMode(nextCompactMode);
                    syncMindData();
                  }}
                >
                  <GitFork size={16} />
                  <span>紧凑</span>
                </button>
                <button
                  className={syncNumberedOutline ? "active" : ""}
                  title={syncNumberedOutline ? "目录跟随序号层级编辑" : "序号层级目录已冻结"}
                  onClick={toggleNumberedOutlineSync}
                >
                  <List size={16} />
                  <span>同步目录</span>
                </button>
                <button
                  className={upstreamBranchIsolation ? "active" : ""}
                  title={upstreamBranchIsolation ? "上分支隔离已开启" : "当前分支同步上级导图"}
                  onClick={toggleUpstreamBranchIsolation}
                >
                  <GitFork size={16} />
                  <span>上隔离</span>
                </button>
                <button
                  className={downstreamBranchIsolation ? "active" : ""}
                  title={downstreamBranchIsolation ? "下分支隔离已开启" : "下级分支跟随当前分支"}
                  onClick={toggleDownstreamBranchIsolation}
                >
                  <GitBranchPlus size={16} />
                  <span>下隔离</span>
                </button>
              </div>

              <div className="tool-group">
                <span>节点</span>
                <button title="添加子主题" onClick={() => runWithActiveNode((mind, node) => mind.addChild(node))}>
                  <GitBranchPlus size={16} />
                  <span>子主题</span>
                </button>
                <button title="添加同级主题" disabled={isRootSelected} onClick={() => runWithActiveNode((mind, node) => mind.insertSibling("after", node))}>
                  <Plus size={16} />
                  <span>同级</span>
                </button>
                <button title="插入父主题" disabled={isRootSelected} onClick={() => runWithActiveNode((mind, node) => mind.insertParent(node))}>
                  <GitFork size={16} />
                  <span>父级</span>
                </button>
                <button title="删除节点" disabled={isRootSelected} onClick={() => runWithActiveNode((mind, node) => mind.removeNodes([node]))}>
                  <Trash2 size={16} />
                  <span>删除</span>
                </button>
              </div>

              <div className="tool-group">
                <span>元素</span>
                <button className={canUseMultiNodeTool ? "" : "hinted"} title="多选两个主题后创建关系线" onClick={createRelationship}>
                  <Link2 size={16} />
                  <span>关系线</span>
                </button>
                <button className={canUseMultiNodeTool ? "" : "hinted"} title="多选同组主题后创建概要" onClick={createSummary}>
                  <Braces size={16} />
                  <span>概要</span>
                </button>
                <button title="标签" onClick={addNodeTag}>
                  <Tags size={16} />
                  <span>标签</span>
                </button>
                <button title="备注" onClick={addNodeNote}>
                  <StickyNote size={16} />
                  <span>备注</span>
                </button>
              </div>

              <div className="tool-group">
                <span>视图</span>
                <button title="适配视图" onClick={() => mindRef.current?.scaleFit()}>
                  <Maximize2 size={16} />
                  <span>适配</span>
                </button>
                <button title="居中显示" onClick={() => mindRef.current?.toCenter()}>
                  <LocateFixed size={16} />
                  <span>居中</span>
                </button>
                <button
                  className={expandedEdit ? "active" : ""}
                  title={expandedEdit ? "退出放大编辑" : "放大编辑"}
                  onClick={() => {
                    setExpandedEdit((current) => !current);
                    requestAnimationFrame(() => {
                      mindRef.current?.scaleFit();
                      mindRef.current?.toCenter();
                    });
                  }}
                >
                  <Maximize2 size={16} />
                  <span>{expandedEdit ? "退出" : "放大编辑"}</span>
                </button>
                <button
                  className={dragMode ? "active" : ""}
                  title="拖动画布"
                  onClick={() => {
                    setDragMode((current) => !current);
                    setToolHint(dragMode ? "" : "拖动已开启：按住空白区域移动画布");
                  }}
                >
                  <Hand size={16} />
                  <span>拖动</span>
                </button>
                <button title="放大" onClick={() => { const mind = mindRef.current; if (mind) mind.scale(Math.min(mind.scaleVal + 0.1, 2)); }}>
                  <ZoomIn size={16} />
                  <span>放大</span>
                </button>
                <button title="缩小" onClick={() => { const mind = mindRef.current; if (mind) mind.scale(Math.max(mind.scaleVal - 0.1, 0.3)); }}>
                  <ZoomOut size={16} />
                  <span>缩小</span>
                </button>
              </div>

              <div className="tool-group">
                <span>操作</span>
                <button title="撤销" onClick={() => { mindRef.current?.undo(); syncMindData(); }}>
                  <Undo2 size={16} />
                  <span>撤销</span>
                </button>
                <button title="重做" onClick={() => { mindRef.current?.redo(); syncMindData(); }}>
                  <Redo2 size={16} />
                  <span>重做</span>
                </button>
              </div>

              {toolHint && <span className="tool-hint">{toolHint}</span>}
            </div>

            <div className="tool-row format-tools">
              <div className="tool-group style-tools">
                <span>文本</span>
                <button title="加粗" onClick={toggleBold}>
                  <Bold size={16} />
                  <span>加粗</span>
                </button>
                <button
                  className={mindFormatBrush ? "active" : ""}
                  title={mindFormatBrush ? "应用导图格式" : "复制导图格式"}
                  onClick={applyMindNodeFormat}
                  onDoubleClick={() => setMindFormatBrush(null)}
                >
                  <Paintbrush size={16} />
                  <span>格式刷</span>
                </button>
                <div className="swatch-set" aria-label="文字颜色">
                  <Palette size={15} />
                  {textColors.map((color) => (
                    <button
                      className="color-swatch"
                      key={color}
                      style={{ "--swatch-color": color } as React.CSSProperties}
                      title={`文字颜色 ${color}`}
                      onClick={() => applyTextColor(color)}
                    />
                  ))}
                </div>
                <div className="swatch-set" aria-label="背景色">
                  <PaintBucket size={15} />
                  {fillColors.map((color) => (
                    <button
                      className="color-swatch fill"
                      key={color}
                      style={{ "--swatch-color": color } as React.CSSProperties}
                      title={`背景色 ${color}`}
                      onClick={() => updateActiveNodeStyle({ background: color })}
                    />
                  ))}
                </div>
                <label className="font-size-select" title="字号">
                  <Type size={15} />
                  <select
                    onChange={(event) => updateActiveNodeStyle({ fontSize: event.target.value })}
                    defaultValue=""
                    aria-label="字号"
                  >
                    <option value="" disabled>
                      字号
                    </option>
                    {fontSizes.map((size) => (
                      <option key={size} value={size}>
                        {size.replace("px", "")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="tool-group annotation-tools">
                <span>标注</span>
                <button title="文本标注" onClick={() => applyTextMark(markColors[0])}>
                  <Highlighter size={16} />
                  <span>标注</span>
                </button>
                <div className="swatch-set" aria-label="标注颜色">
                  {markColors.map((color) => (
                    <button
                      className="color-swatch mark"
                      key={color}
                      style={{ "--swatch-color": color } as React.CSSProperties}
                      title={`标注颜色 ${color}`}
                      onClick={() => applyTextMark(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={dragMode ? "mindmap-canvas-viewport drag-enabled" : "mindmap-canvas-viewport"}>
            <div className="mindmap-canvas" ref={containerRef} />
            {dragMode && (
              <div
                className="mindmap-pan-layer"
                aria-label="拖动画布"
                onPointerDown={startCanvasDrag}
                onPointerMove={dragCanvas}
                onPointerUp={stopCanvasDrag}
                onPointerCancel={stopCanvasDrag}
                onPointerLeave={stopCanvasDrag}
              />
            )}
            <div className="canvas-pan-control horizontal" aria-label="左右滑动画布">
              <button type="button" title="向左滑动" onClick={() => panCanvasBy(-160, 0)}>
                <ChevronLeft size={17} />
              </button>
              <input
                aria-label="左右滑动"
                max={panControlMax}
                min={panControlMin}
                onChange={(event) => slideCanvasTo("x", Number(event.target.value))}
                type="range"
                value={panControl.x}
              />
              <button type="button" title="向右滑动" onClick={() => panCanvasBy(160, 0)}>
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="canvas-pan-control vertical" aria-label="上下滑动画布">
              <button type="button" title="向上滑动" onClick={() => panCanvasBy(0, -160)}>
                <ChevronUp size={17} />
              </button>
              <input
                aria-label="上下滑动"
                max={panControlMax}
                min={panControlMin}
                onChange={(event) => slideCanvasTo("y", Number(event.target.value))}
                type="range"
                value={panControl.y}
              />
              <button type="button" title="向下滑动" onClick={() => panCanvasBy(0, 160)}>
                <ChevronDown size={17} />
              </button>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

const legacyFontSizeMap: Record<string, string> = {
  "1": "12px",
  "2": "14px",
  "3": "16px",
  "4": "18px",
  "5": "24px",
  "6": "32px",
  "7": "36px"
};

const knowledgeInlineStyleProperties = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "textDecorationLine",
  "color",
  "backgroundColor"
];

const knowledgeBlockStyleProperties = [
  "textAlign",
  "lineHeight",
  "letterSpacing",
  "marginLeft",
  "paddingLeft"
];

const knowledgePersistedStyleProperties = [
  ...knowledgeInlineStyleProperties,
  ...knowledgeBlockStyleProperties
];

function readStyleValue(style: CSSStyleDeclaration, property: string) {
  return style.getPropertyValue(property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`));
}

function writeStyleValue(style: CSSStyleDeclaration, property: string, value: string) {
  if (!value) return;
  style.setProperty(property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`), value);
}

function copyKnowledgeElementStyles(source: HTMLElement, target: HTMLElement) {
  knowledgePersistedStyleProperties.forEach((property) => {
    writeStyleValue(target.style, property, readStyleValue(source.style, property));
  });

  const align = source.getAttribute("align");
  if (align) target.style.textAlign = align;
}

function convertLegacyFontTags(root: HTMLElement) {
  root.querySelectorAll("font").forEach((fontElement) => {
    const span = document.createElement("span");
    const size = fontElement.getAttribute("size");
    const face = fontElement.getAttribute("face");
    const color = fontElement.getAttribute("color");
    const fontSize = size ? legacyFontSizeMap[size] : "";

    if (fontSize) span.style.fontSize = fontSize;
    if (face) span.style.fontFamily = face;
    if (color) span.style.color = color;
    while (fontElement.firstChild) span.appendChild(fontElement.firstChild);
    fontElement.replaceWith(span);
  });
}

function normalizeKnowledgeHtml(rawHtml: string) {
  if (rawHtml.length === 0) return "";

  const source = document.createElement("div");
  source.innerHTML = rawHtml;
  convertLegacyFontTags(source);
  const output = document.createElement("div");
  let paragraph = document.createElement("p");

  const hasVisibleOrIntentionalContent = (element: HTMLElement) =>
    element.textContent !== "" ||
    element.querySelectorAll("br, img, table, ul, ol, .knowledge-branch-map").length > 0;

  const appendParagraph = (preserveEmpty = false) => {
    if (!hasVisibleOrIntentionalContent(paragraph)) {
      if (preserveEmpty) {
        paragraph.appendChild(document.createElement("br"));
        output.appendChild(paragraph);
      }
      paragraph = document.createElement("p");
      return;
    }

    output.appendChild(paragraph);
    paragraph = document.createElement("p");
  };

  const appendInline = (node: Node) => {
    paragraph.appendChild(node.cloneNode(true));
  };

  source.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node.textContent ?? "").length > 0) appendInline(node);
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    if (node.tagName === "BR") {
      appendParagraph(true);
      return;
    }

    if (node.classList.contains("knowledge-branch-map")) {
      appendParagraph();
      output.appendChild(node.cloneNode(true));
      return;
    }

    if (node.tagName === "DIV" || node.tagName === "P") {
      appendParagraph();
      const nextParagraph = document.createElement("p");
      copyKnowledgeElementStyles(node, nextParagraph);
      nextParagraph.innerHTML = node.innerHTML;
      paragraph = nextParagraph;
      appendParagraph(node.innerHTML === "" || node.innerHTML === "<br>");
      return;
    }

    if (node.tagName === "UL" || node.tagName === "OL") {
      appendParagraph();
      output.appendChild(node.cloneNode(true));
      return;
    }

    appendInline(node);
  });

  appendParagraph();
  return output.innerHTML;
}

function KnowledgePanel({
  nodeId,
  topic,
  value,
  branchNode,
  onKnowledgeChange,
  saveStatus
}: {
  nodeId: string;
  topic: string;
  value: string;
  branchNode: NodeObj | null;
  onKnowledgeChange: (nodeId: string, content: string) => void;
  saveStatus: CourseSaveStatus;
}) {
  const [draft, setDraft] = useState(value);
  const [knowledgeFormatBrush, setKnowledgeFormatBrush] = useState<KnowledgeFormatBrush | null>(null);
  const [historyState, setHistoryState] = useState<KnowledgeHistoryState>({ canUndo: false, canRedo: false });
  const latestDraftRef = useRef(value);
  const persistedValueRef = useRef(value);
  const nodeIdRef = useRef(nodeId);
  const onKnowledgeChangeRef = useRef(onKnowledgeChange);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const activeBlockRef = useRef<HTMLElement | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSelectApplyRef = useRef<{ key: string; value: string; at: number } | null>(null);
  const isEditorFocusedRef = useRef(false);

  const refreshHistoryState = () => {
    setHistoryState({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0
    });
  };

  const getCurrentEditorHtml = () => normalizeKnowledgeHtml(editorRef.current?.innerHTML || "");

  const restoreEditorHtml = (content: string) => {
    const normalizedContent = normalizeKnowledgeHtml(content);
    if (editorRef.current && editorRef.current.innerHTML !== normalizedContent) {
      editorRef.current.innerHTML = normalizedContent;
    }
    selectionRangeRef.current = null;
    latestDraftRef.current = normalizedContent;
    setDraft(normalizedContent);
    onKnowledgeChangeRef.current(nodeIdRef.current, normalizedContent);
    persistedValueRef.current = normalizedContent;
  };

  const captureHistorySnapshot = () => {
    const currentContent = getCurrentEditorHtml();
    const history = undoStackRef.current;
    if (history[history.length - 1] !== currentContent) {
      history.push(currentContent);
      if (history.length > knowledgeHistoryLimit) history.shift();
    }
    redoStackRef.current = [];
    refreshHistoryState();
  };

  const undoKnowledgeEdit = () => {
    const currentContent = getCurrentEditorHtml();
    let previousContent = undoStackRef.current.pop();
    while (previousContent === currentContent && undoStackRef.current.length > 0) {
      previousContent = undoStackRef.current.pop();
    }
    if (previousContent === undefined) {
      refreshHistoryState();
      return;
    }
    redoStackRef.current.push(currentContent);
    restoreEditorHtml(previousContent);
    refreshHistoryState();
    editorRef.current?.focus();
  };

  const redoKnowledgeEdit = () => {
    const nextContent = redoStackRef.current.pop();
    if (nextContent === undefined) {
      refreshHistoryState();
      return;
    }
    undoStackRef.current.push(getCurrentEditorHtml());
    restoreEditorHtml(nextContent);
    refreshHistoryState();
    editorRef.current?.focus();
  };

  useEffect(() => {
    const normalizedValue = normalizeKnowledgeHtml(value);
    const sameNode = nodeIdRef.current === nodeId;
    const shouldPreserveFocusedDom = sameNode && isEditorFocusedRef.current;

    persistedValueRef.current = normalizedValue;
    nodeIdRef.current = nodeId;

    if (shouldPreserveFocusedDom) {
      return;
    }

    setDraft(normalizedValue);
    latestDraftRef.current = normalizedValue;
    selectionRangeRef.current = null;
    activeBlockRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
    refreshHistoryState();
    if (editorRef.current && editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue || "";
    }
    if (value && normalizedValue !== value) {
      onKnowledgeChangeRef.current(nodeId, normalizedValue);
    }
  }, [nodeId, value]);

  useEffect(() => {
    onKnowledgeChangeRef.current = onKnowledgeChange;
  }, [onKnowledgeChange]);

  useEffect(() => {
    return () => {
      if (latestDraftRef.current !== persistedValueRef.current) {
        onKnowledgeChangeRef.current(nodeIdRef.current, normalizeKnowledgeHtml(latestDraftRef.current));
      }
    };
  }, []);

  useEffect(() => {
    if (draft === value) return;
    if (draft !== latestDraftRef.current) return;
    latestDraftRef.current = draft;
    const timeoutId = window.setTimeout(() => {
      onKnowledgeChange(nodeId, latestDraftRef.current);
      persistedValueRef.current = latestDraftRef.current;
    }, 360);

    return () => window.clearTimeout(timeoutId);
  }, [draft, nodeId, onKnowledgeChange, value]);

  const flushDraft = () => {
    isEditorFocusedRef.current = false;
    const normalizedDraft = normalizeKnowledgeHtml(latestDraftRef.current);
    if (normalizedDraft !== latestDraftRef.current && editorRef.current) {
      editorRef.current.innerHTML = normalizedDraft;
      latestDraftRef.current = normalizedDraft;
      setDraft(normalizedDraft);
    }
    if (normalizedDraft !== value) {
      onKnowledgeChange(nodeId, normalizedDraft);
      persistedValueRef.current = normalizedDraft;
    }
  };

  const rememberSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
    selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
    activeBlockRef.current = getEditableBlock(selection.focusNode);
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = selectionRangeRef.current;
    if (!editor || !range) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const getActiveSelectionRange = () => {
    restoreSelection();
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range;
  };

  const getSelectionElement = () => {
    const range = getActiveSelectionRange();
    if (!range) return activeBlockRef.current;
    const node = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    return node instanceof HTMLElement ? node : activeBlockRef.current;
  };

  const getEditableBlock = (node: Node | null) => {
    const editor = editorRef.current;
    if (!editor || !node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
    if (!element) return null;
    const block = element.closest("p, div, li, h1, h2, h3, h4, h5, h6");
    if (!(block instanceof HTMLElement) || !editor.contains(block) || block === editor) return null;
    return block;
  };

  const setElementStyles = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>) => {
    Object.entries(styles).forEach(([key, styleValue]) => {
      if (!styleValue) return;
      writeStyleValue(element.style, key, String(styleValue));
    });
  };

  const getStyleMap = (computedStyle: CSSStyleDeclaration | null, properties: string[]) => {
    const styles: Record<string, string> = {};
    if (!computedStyle) return styles;
    properties.forEach((property) => {
      const value = readStyleValue(computedStyle, property);
      if (value) styles[property] = value;
    });
    return styles;
  };

  const getEditableBlocksInRange = (range: Range) => {
    const editor = editorRef.current;
    if (!editor) return [];
    const blocks = new Set<HTMLElement>();
    const addBlock = (node: Node | null) => {
      const block = getEditableBlock(node);
      if (block) blocks.add(block);
    };

    addBlock(range.startContainer);
    addBlock(range.endContainer);

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const element = walker.currentNode;
      if (!(element instanceof HTMLElement) || element === editor) continue;
      if (!element.matches("p, div, li, h1, h2, h3, h4, h5, h6")) continue;
      try {
        if (range.intersectsNode(element)) blocks.add(element);
      } catch {
        // Detached browser selection nodes can throw during fast toolbar operations.
      }
    }

    return Array.from(blocks);
  };

  const applyBlockStylesToSelection = (styles: Record<string, string>) => {
    const range = getActiveSelectionRange();
    const editor = editorRef.current;
    if (!editor) return;

    const blocks = range
      ? getEditableBlocksInRange(range)
      : activeBlockRef.current && editor.contains(activeBlockRef.current) && activeBlockRef.current !== editor
        ? [activeBlockRef.current]
        : [];

    blocks.forEach((block) => setElementStyles(block, styles));
  };

  const styleSelectedTextFragment = (fragment: DocumentFragment, styles: Partial<CSSStyleDeclaration>) => {
    const wrappers: HTMLElement[] = [];
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      if (walker.currentNode instanceof Text) textNodes.push(walker.currentNode);
    }

    textNodes.forEach((textNode) => {
      const text = textNode.textContent ?? "";
      if (text.trim().length === 0) return;

      const wrapper = document.createElement("span");
      setElementStyles(wrapper, styles);
      textNode.parentNode?.insertBefore(wrapper, textNode);
      wrapper.appendChild(textNode);
      wrappers.push(wrapper);
    });

    return wrappers;
  };

  const applyStylesToRangeFragment = (range: Range, styles: Partial<CSSStyleDeclaration>) => {
    const fragment = range.extractContents();
    const wrappers = styleSelectedTextFragment(fragment, styles);
    if (wrappers.length === 0) {
      range.insertNode(fragment);
      return [];
    }

    const marker = document.createComment("knowledge-selection-end");
    fragment.appendChild(marker);
    range.insertNode(fragment);
    const firstWrapper = wrappers[0];
    const lastWrapper = wrappers[wrappers.length - 1];
    marker.remove();
    return [firstWrapper, lastWrapper];
  };

  const applyInlineStyle = (styles: Partial<CSSStyleDeclaration>) => {
    const range = getActiveSelectionRange();
    if (!range) {
      const editor = editorRef.current;
      const block = activeBlockRef.current;
      if (editor && block && editor.contains(block) && block !== editor) {
        captureHistorySnapshot();
        setElementStyles(block, styles);
        commitCurrentEditor();
      }
      editorRef.current?.focus();
      return;
    }

    if (range.collapsed) {
      const block = getEditableBlock(range.startContainer);
      if (block) {
        captureHistorySnapshot();
        setElementStyles(block, styles);
        rememberSelection();
        commitCurrentEditor();
      }
      editorRef.current?.focus();
      return;
    }

    captureHistorySnapshot();
    const wrapperBounds = applyStylesToRangeFragment(range, styles);
    if (wrapperBounds.length === 0) {
      editorRef.current?.focus();
      return;
    }

    const selection = window.getSelection();
    selection?.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.setStartBefore(wrapperBounds[0]);
    nextRange.setEndAfter(wrapperBounds[1]);
    selection?.addRange(nextRange);
    rememberSelection();
    editorRef.current?.focus();
    commitCurrentEditor();
  };

  const execCommand = (command: string, value?: string) => {
    restoreSelection();
    captureHistorySnapshot();
    document.execCommand(command, false, value);
    rememberSelection();
    editorRef.current?.focus();
    commitCurrentEditor();
  };

  const applyFontFamily = (fontFamily: string) => {
    applyInlineStyle({ fontFamily });
  };

  const applyFontSize = (fontSize: string) => {
    applyInlineStyle({ fontSize });
  };

  const handleFontFamilySelect = (event: React.FormEvent<HTMLSelectElement>) => {
    if (!shouldApplySelectValue("fontFamily", event.currentTarget.value)) return;
    applyFontFamily(event.currentTarget.value);
  };

  const handleFontSizeSelect = (event: React.FormEvent<HTMLSelectElement>) => {
    if (!shouldApplySelectValue("fontSize", event.currentTarget.value)) return;
    applyFontSize(event.currentTarget.value);
  };

  const shouldApplySelectValue = (key: string, value: string) => {
    const now = performance.now();
    const lastApply = lastSelectApplyRef.current;
    if (lastApply && lastApply.key === key && lastApply.value === value && now - lastApply.at < 120) {
      return false;
    }
    lastSelectApplyRef.current = { key, value, at: now };
    return true;
  };

  const applyTextColor = (color: string) => {
    applyInlineStyle({ color });
  };

  const applyBackgroundColor = (backgroundColor: string) => {
    applyInlineStyle({ backgroundColor });
  };

  const commitCurrentEditor = () => {
    const content = normalizeKnowledgeHtml(editorRef.current?.innerHTML || "");
    if (editorRef.current && editorRef.current.innerHTML !== content) editorRef.current.innerHTML = content;
    setDraft(content);
    latestDraftRef.current = content;
    onKnowledgeChange(nodeId, content);
    persistedValueRef.current = content;
  };

  const copyKnowledgeFormat = () => {
    restoreSelection();
    const sourceElement = getSelectionElement();
    const sourceBlock = activeBlockRef.current ?? getEditableBlock(sourceElement);
    const computedStyle = sourceElement ? window.getComputedStyle(sourceElement) : null;
    const blockStyle = sourceBlock ? window.getComputedStyle(sourceBlock) : computedStyle;
    setKnowledgeFormatBrush({
      inlineStyles: getStyleMap(computedStyle, knowledgeInlineStyleProperties),
      blockStyles: getStyleMap(blockStyle, knowledgeBlockStyleProperties)
    });
    editorRef.current?.focus();
  };

  const applyKnowledgeFormat = () => {
    if (!knowledgeFormatBrush) {
      copyKnowledgeFormat();
      return;
    }

    restoreSelection();
    applyInlineStyle(knowledgeFormatBrush.inlineStyles);
    applyBlockStylesToSelection(knowledgeFormatBrush.blockStyles);
    rememberSelection();
    editorRef.current?.focus();
    commitCurrentEditor();
  };

  const handleInput = () => {
    const content = editorRef.current?.innerHTML || "";
    setDraft(content);
    latestDraftRef.current = content;
    rememberSelection();
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    if (!event.ctrlKey && !event.metaKey) return;
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      undoKnowledgeEdit();
      return;
    }
    if (key === "x" || key === "y" || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      redoKnowledgeEdit();
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!isEditorFocusedRef.current) return;
      rememberSelection();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const commitEditorContent = (content: string) => {
    const normalizedContent = normalizeKnowledgeHtml(content);
    if (editorRef.current && editorRef.current.innerHTML !== normalizedContent) {
      editorRef.current.innerHTML = normalizedContent;
    }
    setDraft(normalizedContent);
    latestDraftRef.current = normalizedContent;
    onKnowledgeChange(nodeId, normalizedContent);
    persistedValueRef.current = normalizedContent;
  };

  const insertBranchMap = () => {
    if (!branchNode || !editorRef.current) return;
    const branchHtml = renderKnowledgeBranchHtml(branchNode);
    restoreSelection();
    editorRef.current.focus();
    captureHistorySnapshot();

    const selection = window.getSelection();
    const shouldInsertAtSelection =
      selection &&
      selection.rangeCount > 0 &&
      editorRef.current.contains(selection.anchorNode);

    if (shouldInsertAtSelection) {
      document.execCommand("insertHTML", false, branchHtml);
    } else {
      editorRef.current.insertAdjacentHTML("beforeend", branchHtml);
    }

    commitEditorContent(editorRef.current.innerHTML || "");
    rememberSelection();
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const closeButton = target.closest(".branch-map-close");
    if (!closeButton || !editorRef.current) return;

    event.preventDefault();
    const branchMap = closeButton.closest(".knowledge-branch-map");
    if (!branchMap) return;

    captureHistorySnapshot();
    const nextSibling = branchMap.nextSibling;
    branchMap.remove();
    if (
      nextSibling instanceof HTMLParagraphElement &&
      (nextSibling.textContent ?? "").trim() === "" &&
      nextSibling.querySelector("br")
    ) {
      nextSibling.remove();
    }

    commitEditorContent(editorRef.current.innerHTML || "");
    selectionRangeRef.current = null;
  };

  const protectToolbarSelection = (event: React.MouseEvent<HTMLDivElement>) => {
    rememberSelection();
    const target = event.target as HTMLElement;
    if (target.closest("select") || target.closest('input[type="color"]')) return;
    event.preventDefault();
    restoreSelection();
  };

  return (
    <section className="knowledge-panel" aria-label="知识点">
      <header className="knowledge-header">
        <div>
          <span>知识点</span>
          <h3>{topic}</h3>
        </div>
        <small className={`auto-save-status inline ${saveStatus}`}>{getCourseSaveStatusLabel(saveStatus)}</small>
      </header>

      <div className="knowledge-toolbar" onMouseDown={protectToolbarSelection}>
        <div className="toolbar-group">
          <button title="撤销 (Ctrl+Z)" disabled={!historyState.canUndo} onClick={undoKnowledgeEdit}>
            <Undo2 size={16} />
          </button>
          <button title="重做 (Ctrl+X)" disabled={!historyState.canRedo} onClick={redoKnowledgeEdit}>
            <Redo2 size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button title="加粗 (Ctrl+B)" onClick={() => execCommand("bold")}>
            <Bold size={16} />
          </button>
          <button title="斜体 (Ctrl+I)" onClick={() => execCommand("italic")}>
            <em>I</em>
          </button>
          <button title="下划线 (Ctrl+U)" onClick={() => execCommand("underline")}>
            <u>U</u>
          </button>
          <button title="删除线" onClick={() => execCommand("strikeThrough")}>
            <s>S</s>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <select
            title="字体"
            defaultValue="Microsoft YaHei"
            onChange={handleFontFamilySelect}
            onInput={handleFontFamilySelect}
          >
            {knowledgeFontFamilies.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            title="字号"
            defaultValue="22px"
            onChange={handleFontSizeSelect}
            onInput={handleFontSizeSelect}
          >
            {knowledgeFontSizes.map((size) => (
              <option key={size} value={size}>
                {size.replace("px", "")}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <label title="文字颜色" className="color-picker-label">
            <Type size={14} />
            <input
              type="color"
              defaultValue="#111827"
              onChange={(e) => applyTextColor(e.target.value)}
            />
          </label>
          <label title="背景颜色" className="color-picker-label">
            <PaintBucket size={14} />
            <input
              type="color"
              defaultValue="#ffffff"
              onChange={(e) => applyBackgroundColor(e.target.value)}
            />
          </label>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button title="左对齐" onClick={() => execCommand("justifyLeft")}>
            <AlignLeft size={16} />
          </button>
          <button title="居中" onClick={() => execCommand("justifyCenter")}>
            <AlignCenter size={16} />
          </button>
          <button title="右对齐" onClick={() => execCommand("justifyRight")}>
            <AlignRight size={16} />
          </button>
          <button title="两端对齐" onClick={() => execCommand("justifyFull")}>
            <AlignJustify size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button title="无序列表" onClick={() => execCommand("insertUnorderedList")}>
            <List size={16} />
          </button>
          <button title="有序列表" onClick={() => execCommand("insertOrderedList")}>
            <ListOrdered size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button title="增加缩进" onClick={() => execCommand("indent")}>
            <IndentIncrease size={16} />
          </button>
          <button title="减少缩进" onClick={() => execCommand("outdent")}>
            <IndentDecrease size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            className={knowledgeFormatBrush ? "active" : ""}
            title={knowledgeFormatBrush ? "应用格式刷" : "复制格式"}
            onClick={applyKnowledgeFormat}
            onDoubleClick={() => setKnowledgeFormatBrush(null)}
          >
            <Paintbrush size={16} />
          </button>
          <button title="清除格式" onClick={() => execCommand("removeFormat")}>
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            className="branch-map-button"
            disabled={!branchNode}
            title="插入当前分支思维导图"
            onClick={insertBranchMap}
          >
            <GitFork size={16} />
          </button>
        </div>
      </div>

      <div className="knowledge-reader-stage">
        <div
          ref={editorRef}
          className="knowledge-editor"
          contentEditable
          onFocus={() => {
            isEditorFocusedRef.current = true;
          }}
          onBeforeInput={captureHistorySnapshot}
          onInput={handleInput}
          onClick={handleEditorClick}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={flushDraft}
          data-placeholder="定义、重点、例子、易错点..."
          suppressContentEditableWarning
        />
      </div>
    </section>
  );
}

function KnowledgeNotesPanel({
  activeNodeId,
  entries,
  rootNodeId,
  title
}: {
  activeNodeId: string;
  entries: NoteEntry[];
  rootNodeId: string;
  title: string;
}) {
  const scopedEntries = useMemo(() => {
    if (activeNodeId === rootNodeId) return entries;
    return entries.filter((entry) => entry.id === activeNodeId || entry.path.some((pathItem) => pathItem.id === activeNodeId));
  }, [activeNodeId, entries, rootNodeId]);
  const leafPages = useMemo(() => {
    const leaves = scopedEntries.filter((entry) => entry.isLeaf);
    return leaves.length > 0 ? leaves : scopedEntries.slice(0, 1);
  }, [scopedEntries]);
  const [pageIndex, setPageIndex] = useState(0);
  const currentPageIndex = Math.min(pageIndex, Math.max(leafPages.length - 1, 0));
  const currentPage = leafPages[currentPageIndex];

  useEffect(() => {
    setPageIndex(0);
  }, [activeNodeId, leafPages.length]);

  return (
    <section className="knowledge-notes-panel" aria-label="知识笔记">
      <header className="knowledge-notes-header">
        <div>
          <span>知识笔记</span>
          <h3>{title}</h3>
        </div>
        <small>{leafPages.length > 0 ? `${currentPageIndex + 1} / ${leafPages.length}` : "0 / 0"}</small>
      </header>

      <div className="knowledge-notes-list">
        {currentPage ? (
          <>
            <div className="note-page-controls">
              <button type="button" disabled={currentPageIndex === 0} onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}>
                <ChevronLeft size={16} />
                上一页
              </button>
              <strong>{currentPage.topic}</strong>
              <button
                type="button"
                disabled={currentPageIndex >= leafPages.length - 1}
                onClick={() => setPageIndex((index) => Math.min(index + 1, leafPages.length - 1))}
              >
                下一页
                <ChevronRight size={16} />
              </button>
            </div>

            <article className="knowledge-note-block note-page" key={currentPage.id}>
              <div className="note-path">
                {currentPage.path.map((pathItem, index) => (
                  <div
                    className={index === currentPage.path.length - 1 ? "note-path-title current" : "note-path-title"}
                    key={pathItem.id}
                    style={{ "--note-depth": pathItem.depth } as React.CSSProperties}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h4>{pathItem.topic}</h4>
                  </div>
                ))}
              </div>

              <div className="note-fixed-body">
                <section>
                  <strong>复习内容</strong>
                  <p>{currentPage.note || "待补充"}</p>
                </section>

                <section>
                  <strong>分支位置</strong>
                  <p>{currentPage.path.map((pathItem) => pathItem.topic).join(" / ")}</p>
                </section>

                {currentPage.tags.length > 0 && (
                  <section>
                    <strong>标签</strong>
                    <div className="note-tags">
                      {currentPage.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </article>
          </>
        ) : (
          <div className="outline-empty">暂无分支</div>
        )}
      </div>
    </section>
  );
}

function LegacyKnowledgeNotesPanel({ title, entries }: { title: string; entries: NoteEntry[] }) {
  return (
    <section className="knowledge-notes-panel" aria-label="知识笔记">
      <header className="knowledge-notes-header">
        <div>
          <span>知识笔记</span>
          <h3>{title}</h3>
        </div>
        <small>{entries.length} 个标题</small>
      </header>

      <div className="knowledge-notes-list">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article
              className="knowledge-note-block"
              key={entry.id}
              style={{ "--note-depth": entry.depth } as React.CSSProperties}
            >
              <div className="note-title-row">
                <span>{String(entry.order).padStart(2, "0")}</span>
                <h4>{entry.topic}</h4>
              </div>

              <div className="note-fixed-body">
                <section>
                  <strong>复习内容</strong>
                  <p>{entry.note || "待补充"}</p>
                </section>

                <section>
                  <strong>分支结构</strong>
                  {entry.childTopics.length > 0 ? (
                    <ul>
                      {entry.childTopics.map((topic) => (
                        <li key={topic}>{topic}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>无下级分支</p>
                  )}
                </section>

                {entry.tags.length > 0 && (
                  <section>
                    <strong>标签</strong>
                    <div className="note-tags">
                      {entry.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="outline-empty">暂无分支</div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <BookOpen size={22} />
      <strong>{title}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
