# AIstudy 系统说明

AIstudy 是一个 Electron + React + TypeScript 的 Windows 桌面学习与文档系统，用于课程知识库、开发平台需求库、知识点编辑、知识笔记、思维导图、信息搜集和 AI 问答。

## 单一系统边界

- 本地项目：`F:\AIAPP\Xiangmu\AIstudy`
- 唯一运行程序：`F:\AIAPP\Xiangmu\AIstudy\release\win-unpacked\AIstudy.exe`
- 唯一发布目录：`F:\AIAPP\Xiangmu\AIstudy\release`
- Electron 用户数据：`C:\Users\52882\AppData\Roaming\aistudy`
- 本机数据目录：`C:\Users\52882\AppData\Roaming\aistudy\data`
- 主前端入口：`src/main.tsx`
- 主进程入口：`electron/main.ts`
- Preload 入口：`electron/preload.ts`
- 版本记录：`src/updateLog.ts`
- 功能关系：`docs/system-feature-relations.md`

不再保留 `release-*` 旁路打包目录，不再启用旧代码锁或 Claude 内容沙箱。所有本机可用版本都必须从默认 `release\win-unpacked\AIstudy.exe` 运行。

## 功能模块

- 工作台：学习概览、今日任务、最近完成、AI 助教入口。
- 课程库：课程创建、分类、知识点、知识笔记、思维导图。
- 开发平台：需求文档库，复用课程库底层组件，使用独立数据集。
- 学习计划、知识笔记、练习中心、AI 助教、MCP、更新管理、信息搜集：侧边栏独立入口。
- 知识点内容：Canvas Editor 类 Word 编辑器，支持标题/正文、格式刷、复用式格式刷、颜色、表格、分页、打印、Ctrl+滚轮缩放。
- 思维导图：Mind Elixir 画布，支持主导图、分支导图、目录联动、缩放、拖动和工具栏操作。
- AI 聊天：Claude、Mimo、Doubao、ChatGPT 统一在知识点页面右下角窗口切换。

## 数据存储

主要 JSON 数据位于：

```text
C:\Users\52882\AppData\Roaming\aistudy\data
```

关键文件：

- `courses.json`：课程库数据。
- `developer-documents.json`：开发平台数据。
- `mysql.json`：MySQL 配置。
- `mimo.json`：Mimo 配置。
- `claude-course-sessions.json`：Claude 课程会话绑定。
- `knowledge-format-debug.log`：知识点排版调试日志。

课程和开发平台应共用同一套底层逻辑，只通过库类型和数据文件区分。新增功能优先改共享逻辑，避免课程库和开发平台出现两套实现。

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm run build
npm run check:system
npm run pack
npm run dist
```

常规交付只使用：

```bash
npm run pack
```

输出固定为：

```text
release\win-unpacked\AIstudy.exe
```

如果打包提示 `EBUSY`，先结束唯一运行程序：

```text
F:\AIAPP\Xiangmu\AIstudy\release\win-unpacked\AIstudy.exe
```

## 验证清单

代码变更后至少执行：

```bash
npm run check:system
npm run lint
npm run build
```

需要交付 exe 时再执行：

```bash
npm run pack
```

涉及界面和主流程时，至少验证：

- 课程库和开发平台都能创建并进入工作区。
- 新建库的知识点、知识笔记、思维导图都有可用初始内容。
- 主思维导图和分支思维导图都能从目录打开。
- 知识点编辑器改格式后不跳转到错误滚动位置。
- AI 聊天能发送、等待、展示最新回复，不混入推荐问题。
- 更新管理能看到最新版本记录。

## 维护规则

- 每次用户可见更新都要在 `src/updateLog.ts` 新增版本记录，保持 newest first。
- 每条版本记录必须包含 `featureUpdates`、`fixes`、`optimizations`。
- 改功能前先看 `docs/system-feature-relations.md`，确认模块边界和必测项。
- 改共享工作区能力时，课程库和开发平台必须一起验证。
- 不创建旁路发布目录；打包只覆盖默认 `release`。
- 不恢复旧代码锁和旧 Claude 内容沙箱。
- 不回滚用户已有修改。
- 不用猜测代替验证；能跑真实命令就跑真实命令。
