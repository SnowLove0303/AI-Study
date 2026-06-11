# AIstudy Agent Instructions

- Every user-visible update is a version.
- Before final delivery, add a new entry to `src/updateLog.ts` for the current update.
- Keep entries newest first, and include `功能更新`, `修复说明`, and `优化说明` for every version.
- Version notes must describe user-facing functionality only, in concise wording.
- Do not rely on memory or judgment to decide whether to write update notes; treat this file as the standing rule.

## UI protocol

- User-facing UI must not contain large-scale feature explanations, tutorial paragraphs, or nonessential descriptive copy.
- Keep screens action-first: use short labels, status text, concise empty states, and clear controls.
- Put detailed explanations in documentation, release notes, tooltips, or help surfaces only when the user explicitly opens them.
- Avoid repeating what a control obviously does. Interface text should answer current state, available action, or required input.

## MCP workflows

- Notion-to-knowledge import workflow: read `docs/mcp-notion-knowledge-import.md`.
- Machine-readable MCP contract: read `mcp/aistudy-notion-knowledge-import.contract.json`.
- When a Notion URL must be written into course knowledge points, run the contract in dry-run mode first, resolve ambiguous heading matches, then write by `knowledgePoints[nodeId]`.
- Treat the MCP write enforcement rules as hard gates: if source readability, exact course match, node-id match table, backup path, safe HTML, and post-write verification are not all available, do not write course data.
