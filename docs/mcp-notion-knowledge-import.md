# MCP: Notion 知识点导入

## 目标

把 Notion 页面中的课程内容，按标题层级写入 AIstudy 对应课程的知识点正文。

目标数据：

- 本地 JSON：`%APPDATA%/aistudy/data/courses.json`
- MySQL：`courses.payload_json`
- 写入字段：`course.knowledgePoints[nodeId]`

标准入口：

- UI：左侧导航 `MCP`
- 契约：`mcp/aistudy-notion-knowledge-import.contract.json`
- 默认课程：`金融市场基础知识`

## 标准输入

每次导入至少需要：

- `notionUrl`：Notion 页面或数据库视图链接
- `courseTitle`：AIstudy 课程名称

可选输入：

- `rootPath`：限定写入的思维导图路径，例如 `第三章 证券市场主体 / 证券发行人`
- `dryRun`：只生成匹配报告，不写入
- `overwritePolicy`：`replace` 或 `skip_existing`

本次示例输入：

```json
{
  "notionUrl": "https://www.notion.so/374003b68bec81b9931ce094b9f4a2d1?v=369003b68bec80be889f000c82ce7650&source=copy_link",
  "courseTitle": "金融市场基础知识",
  "overwritePolicy": "replace"
}
```

## 执行程序

### 1. 规范检测

确认下列文件存在：

- `mcp/aistudy-notion-knowledge-import.contract.json`
- `docs/mcp-notion-knowledge-import.md`

失败处理：

- 契约缺失：停止导入，先补齐 MCP 契约。
- 引导缺失：停止导入，先补齐本文档。

## 写入强制规范

以下规范是硬性要求，不是建议。任一条不满足时，必须停止写入，只输出阻断原因。

### 写入前硬门槛

写入前必须同时满足：

- `sourceReadable=true`
- `courseFound=true`
- `dryRun=false`
- `safeToWrite=true`
- `matchedCount > 0`
- `ambiguousCount = 0`
- 已生成节点匹配表
- 每条匹配都有 `sectionHeading`、`nodeId`、`nodePath`、`confidence`
- `courses.json` 已成功备份
- 待写入 HTML 已通过安全过滤

### 强制停止场景

出现以下任一情况，必须停止：

- MCP 契约或本文档缺失。
- Notion 来源不可读。
- 目标课程不存在。
- `courses.json` 不存在、不可读或不可写。
- 未执行 dry-run 匹配。
- 匹配数量为 0。
- 存在同名分支或歧义分支。
- 任一写入项缺少 `nodeId`。
- 备份失败。
- HTML 含脚本、事件属性、iframe、表单或 `javascript:` 链接。
- 写入后重新读取校验失败。

### 允许修改范围

只允许修改：

- 目标课程的 `knowledgePoints[matchedNodeId]`
- 目标课程的更新时间字段
- MySQL 可用时，同一目标课程的 `courses.payload_json`

禁止修改：

- 其他课程。
- 目标课程的 `mindMap`。
- 未匹配节点的 `knowledgePoints`。
- Notion 原始页面。
- 全局设置。
- UI 代码。

### HTML 写入规范

允许标签：

- `p`
- `br`
- `ul`
- `ol`
- `li`
- `strong`
- `b`
- `em`
- `i`
- `u`
- `s`

禁止内容：

- `script`
- `style`
- `iframe`
- `object`
- `embed`
- `form`
- `on*` 事件属性
- `javascript:` URL

过滤后为空的正文不得写入。

### 2. 接入检测

确认下列资源可用：

- Notion 来源可读。
- `courses.json` 可读写。
- MySQL 可连接时，准备同步。

Notion 读取优先级：

1. Public Notion 页面。
2. 本机 Notion 缓存。
3. 用户导出的 Markdown 或 CSV。

失败处理：

- Notion 不可读：只输出接入失败原因，不猜测内容。
- `courses.json` 不存在：停止写入。
- MySQL 不可用：允许先写 JSON，并在报告中标记 `mysqlSynced=false`。

### 3. 内容解析

把 Notion block 转换为章节树：

- 标题锚点：`header`、`sub_header`、`sub_sub_header`、`header_4`
- 正文内容：普通文本、项目符号、有序列表、callout、表格行

要求：

- 保持 Notion 原始顺序。
- 标题只作为匹配锚点，不写入正文。
- 表格行转成可读段落。
- 空内容不写入。

### 4. 课程匹配

读取目标课程的 `mindMap.nodeData`，建立节点索引：

- `nodeId`
- `topic`
- `nodePath`
- `depth`
- `normalizedTopic`

匹配优先级：

1. `rootPath` 内完整路径精确匹配。
2. 同一父节点下标题精确匹配。
3. 去掉章节序号后匹配。
4. 去掉括号编号后匹配。

禁止：

- 仅凭相似标题跨章节写入。
- 多个节点同名时自动选择。
- 未匹配内容强行写入根节点。

### 5. 写入规则

只按节点 id 写入：

```ts
course.knowledgePoints[nodeId] = html;
```

正文 HTML 格式：

```html
<p>第一段正文</p>
<p>第二段正文</p>
<ul><li>列表项</li></ul>
```

写入前必须：

- 关闭正在运行的 AIstudy exe。
- 备份 `courses.json`。
- 保留其他课程。
- 保留未命中的 `knowledgePoints`。
- 保留课程 `mindMap`。

备份格式：

```text
%APPDATA%/aistudy/data/courses.json.before-notion-import-YYYYMMDD-HHMMSS.bak
```

### 6. 持久化

写入顺序：

1. 写入本地 `courses.json`。
2. 如果 MySQL 可用，同步更新 `courses.payload_json`。
3. 重新读取 JSON，确认目标节点内容存在。
4. MySQL 可用时，重新读取 payload，确认内容同步。

### 7. 验收输出

每次执行都要输出：

- `courseFound`
- `sourceReadable`
- `matchedCount`
- `writtenCount`
- `unmatchedHeadings`
- `ambiguousHeadings`
- `backupPath`
- `mysqlSynced`
- `sampleNodeChecks`

最小验收标准：

- `courseFound=true`
- `sourceReadable=true`
- `writtenCount > 0`
- 至少抽样 3 个节点正文可读
- 有备份路径

## 给 Claude 的固定流程

Claude 拿到 Notion 链接后，按这个顺序执行：

1. 读取本 MCP 契约和本文档。
2. 提取 Notion 页面 id 和视图 id。
3. 检测 Notion 是否可读。
4. 读取目标课程 JSON。
5. 把 Notion 标题树和课程思维导图节点做匹配。
6. 先输出 dry-run 匹配表。
7. 通过写入强制规范检查。
8. 没有歧义后写入 `knowledgePoints[nodeId]`。
9. 同步 MySQL。
10. 输出验收报告和备份路径。

## 回滚

回滚只使用写入前备份：

```text
%APPDATA%/aistudy/data/courses.json.before-notion-import-*.bak
```

回滚后再同步 MySQL。

## UI 文案规则

MCP 页面只放短标签、状态和操作入口。

详细流程放在本文档和 MCP 契约里，不放进主界面。
