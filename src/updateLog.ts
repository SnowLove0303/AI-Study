export type UpdateLogEntry = {
  version: string;
  date: string;
  title: string;
  featureUpdates: string[];
  fixes: string[];
  optimizations: string[];
};

export const updateLog: UpdateLogEntry[] = [
  {
    version: "1.2.44",
    date: "2026-06-12",
    title: "知识点格式刷增强",
    featureUpdates: ["知识点格式刷支持复制文字样式和段落样式"],
    fixes: ["修复对齐、缩进等段落格式切换目录后丢失的问题"],
    optimizations: ["知识点保存仅保留学习编辑需要的安全样式，减少格式漂移"]
  },
  {
    version: "1.2.43",
    date: "2026-06-12",
    title: "知识点重做快捷键",
    featureUpdates: ["知识点编辑器支持 Ctrl+X 执行重做操作"],
    fixes: ["调整重做快捷键提示与实际操作保持一致"],
    optimizations: ["保留 Ctrl+Y 和 Ctrl+Shift+Z 作为兼容重做方式"]
  },
  {
    version: "1.2.42",
    date: "2026-06-12",
    title: "知识点格式边界修复",
    featureUpdates: ["知识点编辑器新增撤销和重做操作"],
    fixes: ["修复多段落改文本格式时可能误改全文的问题"],
    optimizations: ["文字格式仅作用于明确选区或当前段落，避免样式落到整个编辑器"]
  },
  {
    version: "1.2.41",
    date: "2026-06-12",
    title: "知识点多段字号修复",
    featureUpdates: ["知识点字号工具支持跨多个段落统一调整选中文字"],
    fixes: ["修复多段落选区无法稳定修改文字大小的问题"],
    optimizations: ["跨段格式仅作用于非空文本，避免空白行被误套字号"]
  },
  {
    version: "1.2.40",
    date: "2026-06-11",
    title: "知识点局部字号持久化",
    featureUpdates: ["知识点字号可稳定作用于选中的局部文字"],
    fixes: ["修复切换目录后局部字号丢失以及空白行跟随放大的问题"],
    optimizations: ["旧版字号标签会自动转为稳定的内联样式，减少切换回显差异"]
  },
  {
    version: "1.2.39",
    date: "2026-06-11",
    title: "知识点字号即时生效",
    featureUpdates: ["知识点字号工具支持选区和当前段落即时调整"],
    fixes: ["修复字号下拉显示已变化但正文大小没有变化的问题"],
    optimizations: ["工具栏操作前自动保留正文选区，减少点击控件导致的格式丢失"]
  },
  {
    version: "1.2.38",
    date: "2026-06-11",
    title: "知识点空格段落保留",
    featureUpdates: ["知识点正文支持保留连续空格和空格段落"],
    fixes: ["修复用空格隔开段落后保存回弹的问题"],
    optimizations: ["正文编辑区按 Word 类编辑器方式显示连续空格"]
  },
  {
    version: "1.2.37",
    date: "2026-06-11",
    title: "知识点字号工具增强",
    featureUpdates: ["知识点工具栏新增字体与像素字号选择"],
    fixes: ["修复部分选中文字无法调整文字大小的问题"],
    optimizations: ["字体、字号、文字颜色和背景色改为稳定选区样式应用"]
  },
  {
    version: "1.2.36",
    date: "2026-06-11",
    title: "快捷方式图标固定",
    featureUpdates: ["应用启动时自动修正 AIstudy 快捷方式图标"],
    fixes: ["修复重新打包或旧快捷方式导致桌面图标不一致的问题"],
    optimizations: ["安装包、卸载程序和快捷方式统一使用同一图标资源"]
  },
  {
    version: "1.2.35",
    date: "2026-06-11",
    title: "知识点输入空行保护",
    featureUpdates: ["知识点编辑时保留正在输入的段落空行"],
    fixes: ["修复自动保存回显重写正文导致段落间空行被吃掉的问题"],
    optimizations: ["正文仅在失焦或切换时规范化段落，避免打断输入"]
  },
  {
    version: "1.2.34",
    date: "2026-06-11",
    title: "知识点空行保留",
    featureUpdates: ["知识点正文支持保留手动输入的空白行"],
    fixes: ["修复统一段间距时空行被自动清除的问题"],
    optimizations: ["空白行与普通段落保持相同字距和行距节奏"]
  },
  {
    version: "1.2.33",
    date: "2026-06-11",
    title: "知识点段距与目录冻结",
    featureUpdates: ["目录同步关闭状态会随课程保存并在重启后恢复"],
    fixes: ["修复关闭目录同步后重启仍自动同步新增导图分支的问题"],
    optimizations: ["知识点正文保存时统一段落结构，保持段间距一致"]
  },
  {
    version: "1.2.32",
    date: "2026-06-11",
    title: "知识点正文版心调整",
    featureUpdates: ["知识点正文改为固定阅读版心"],
    fixes: ["修复正文位置偏左和内容呈现区域不稳定的问题"],
    optimizations: ["统一正文、段落和列表的字间距与段间距"]
  },
  {
    version: "1.2.31",
    date: "2026-06-11",
    title: "MySQL 终端残留清理",
    featureUpdates: ["启动时自动关闭 MySQL 相关空终端窗口"],
    fixes: ["修复旧控制台进程退出后 Windows Terminal 空窗仍残留的问题"],
    optimizations: ["数据库后台运行与可见终端清理分离处理"]
  },
  {
    version: "1.2.30",
    date: "2026-06-11",
    title: "MySQL 控制台清理",
    featureUpdates: ["启动时自动清理旧版可见 MySQL 控制台进程"],
    fixes: ["修复数据库已启动时残留黑色控制台窗口的问题"],
    optimizations: ["MySQL 启动链路统一走后台隐藏进程"]
  },
  {
    version: "1.2.29",
    date: "2026-06-11",
    title: "知识点面板排版修复",
    featureUpdates: ["知识点正文面板改为完整铺满编辑区"],
    fixes: ["修复正文区域上下和左右空挡过大的问题"],
    optimizations: ["收紧正文行距与段落间距，内容呈现更紧凑"]
  },
  {
    version: "1.2.28",
    date: "2026-06-11",
    title: "静默自动保存",
    featureUpdates: ["课程内容改为后台静默自动保存"],
    fixes: ["修复连续编辑时多次保存可能乱序落库的问题"],
    optimizations: ["保存状态改为低干扰提示，失败时保留本地缓存"]
  },
  {
    version: "1.2.27",
    date: "2026-06-11",
    title: "知识点保存加固",
    featureUpdates: ["知识点编辑切换前强制保存当前草稿"],
    fixes: ["修复知识点目录切换时防抖保存被取消导致内容丢失的问题"],
    optimizations: ["课程变更立即同步本地数据库和 MySQL，启动时按最新保存源加载"]
  },
  {
    version: "1.2.26",
    date: "2026-06-11",
    title: "MySQL 静默启动",
    featureUpdates: ["随应用启动的 MySQL 改为后台静默运行"],
    fixes: ["移除 MySQL 控制台启动参数，避免启动 exe 时弹出窗口"],
    optimizations: ["保留后台启动日志，便于排查数据库启动状态"]
  },
  {
    version: "1.2.25",
    date: "2026-06-11",
    title: "编辑格式刷",
    featureUpdates: ["思维导图和知识点工具栏新增格式刷"],
    fixes: ["知识点格式刷应用后立即保存当前编辑内容"],
    optimizations: ["格式刷开启后显示选中状态，支持双击清空"]
  },
  {
    version: "1.2.24",
    date: "2026-06-11",
    title: "隔离分支切换保存",
    featureUpdates: ["子分支切换前自动保存当前隔离画布"],
    fixes: ["修复切换子分支后跳回主思维导图和隔离数据丢失的问题"],
    optimizations: ["隔离分支保存按当前画布来源记录，避免内容写入错误分支"]
  },
  {
    version: "1.2.23",
    date: "2026-06-11",
    title: "第四章顺序整理",
    featureUpdates: ["第四章 Notion 页面按第一节到第四节顺序排列"],
    fixes: ["修正第四章页面序号接在第三章之后"],
    optimizations: ["清理章节标题中的重复掌握标记"]
  },
  {
    version: "1.2.22",
    date: "2026-06-11",
    title: "第四章 Notion 文档",
    featureUpdates: ["第四章股票内容整理为四篇 Notion 文档"],
    fixes: ["清理文档页码、页眉和重复章节混排"],
    optimizations: ["保留表格、真题、章节练习和答案详解的结构"]
  },
  {
    version: "1.2.21",
    date: "2026-06-11",
    title: "上下分支隔离",
    featureUpdates: ["分支隔离拆分为上隔离和下隔离两个开关"],
    fixes: ["修复开启分支隔离后画布跳回主思维导图的问题"],
    optimizations: ["下隔离关闭时可让已有下级分支导图跟随当前分支更新"]
  },
  {
    version: "1.2.20",
    date: "2026-06-11",
    title: "分支隔离编辑",
    featureUpdates: ["思维导图新增分支隔离开关，子分支可独立编辑"],
    fixes: ["隔离编辑时不再把子分支改动回写到上级导图"],
    optimizations: ["知识点插入分支导图时优先使用隔离分支内容"]
  },
  {
    version: "1.2.19",
    date: "2026-06-11",
    title: "导图目录冻结规则",
    featureUpdates: ["关闭目录同步后新增序号子分支不再进入左侧目录"],
    fixes: ["隐藏目录新增项时保留真实导图数据同步，已有子分支导图可继续向下展开"],
    optimizations: ["知识点标题优先读取真实导图节点，避免目录过滤后标题回退"]
  },
  {
    version: "1.2.18",
    date: "2026-06-11",
    title: "导图目录同步开关",
    featureUpdates: ["思维导图新增序号层级目录同步开关"],
    fixes: ["支持从 1. 序号层级开始冻结目录标题，避免导图编辑误改左侧目录"],
    optimizations: ["重新开启同步后目录会按当前导图刷新"]
  },
  {
    version: "1.2.17",
    date: "2026-06-11",
    title: "MCP 写入强制规范",
    featureUpdates: ["Notion 知识点导入新增写入强制门槛"],
    fixes: ["补齐歧义分支、缺少备份、危险 HTML 和验收失败时的阻断规则"],
    optimizations: ["MCP 状态面板新增写入规范状态卡"]
  },
  {
    version: "1.2.16",
    date: "2026-06-11",
    title: "Notion 导入标准程序",
    featureUpdates: ["Notion 写入知识点流程升级为标准化 MCP 程序"],
    fixes: ["补齐导入前检测、标题歧义处理、写入验收和回滚规范"],
    optimizations: ["Claude 可按固定引导完成 Notion 内容解析、匹配、写入和验证"]
  },
  {
    version: "1.2.15",
    date: "2026-06-11",
    title: "MCP 状态引导",
    featureUpdates: ["MCP 页面新增规范、接入和执行三段式状态检测"],
    fixes: ["补齐 Notion 缓存、课程库、MySQL 和导入备份检测"],
    optimizations: ["MCP 功能入口改为引导式状态面板"]
  },
  {
    version: "1.2.14",
    date: "2026-06-11",
    title: "Notion 导入 MCP 标准",
    featureUpdates: ["新增 Notion 知识点导入 MCP 契约和流程文档"],
    fixes: ["规范 Claude 写入 exe 知识点时的备份、匹配、落库和验证步骤"],
    optimizations: ["MCP 页面入口改为 Notion 导入、标题匹配和写入验证"]
  },
  {
    version: "1.2.13",
    date: "2026-06-11",
    title: "UI 文案协议",
    featureUpdates: ["项目规范新增 UI 文案协议"],
    fixes: ["移除 MCP 页面中非必要的功能说明文案"],
    optimizations: ["界面文案改为短标签和状态优先，减少阅读干扰"]
  },
  {
    version: "1.2.12",
    date: "2026-06-11",
    title: "知识点切换串内容修复",
    featureUpdates: ["知识点页面切换分支时会重新隔离编辑状态"],
    fixes: ["修复从方式切到特征时旧内容被写入新分支的问题"],
    optimizations: ["切换知识点时会丢弃陈旧草稿，避免后台自动保存误覆盖"]
  },
  {
    version: "1.2.11",
    date: "2026-06-11",
    title: "知识点默认字号调整",
    featureUpdates: ["知识点正文初始字号统一为证券市场融资活动方式节点的字号"],
    fixes: ["修复新知识点正文默认字号偏小的问题"],
    optimizations: ["字号下拉默认状态与正文实际显示大小保持一致"]
  },
  {
    version: "1.2.10",
    date: "2026-06-11",
    title: "知识点编辑稳定性修复",
    featureUpdates: ["知识点编辑器支持选中文本后稳定使用工具栏"],
    fixes: ["修复点击功能区后选中内容丢失或知识点内容串写的问题"],
    optimizations: ["知识点保存改为按当前分支单独合并，减少快速切换时的覆盖风险"]
  },
  {
    version: "1.2.9",
    date: "2026-06-11",
    title: "知识点插入分支导图",
    featureUpdates: ["知识点工具栏新增插入当前分支思维导图按钮"],
    fixes: ["解决章节知识点需要手动整理对应导图分支的问题"],
    optimizations: ["插入后的分支结构可在知识点正文中继续编辑和保存"]
  },
  {
    version: "1.2.8",
    date: "2026-06-11",
    title: "课程工作区字体统一",
    featureUpdates: ["知识点、知识笔记和思维导图统一使用微软雅黑"],
    fixes: ["修复不同学习区域字体观感不一致的问题"],
    optimizations: ["课程内容阅读和导图节点显示更统一"]
  },
  {
    version: "1.2.7",
    date: "2026-06-11",
    title: "知识点阅读宽度优化",
    featureUpdates: ["知识点正文切换为居中的阅读版心，减少横向扫视距离"],
    fixes: ["修复大屏下正文行宽过长、阅读视线容易跑偏的问题"],
    optimizations: ["正文行距和段落间距更适合连续学习阅读"]
  },
  {
    version: "1.2.6",
    date: "2026-06-11",
    title: "MySQL 随应用异步启动",
    featureUpdates: ["AIstudy 启动时可异步拉起本机 MySQL 数据库"],
    fixes: ["修复打开应用前需要手动启动 MySQL 才能连接课程库的问题"],
    optimizations: ["数据库启动不阻塞主窗口，连接失败时仍保留本地课程备份"]
  },
  {
    version: "1.2.5",
    date: "2026-06-11",
    title: "MySQL 数据库接入",
    featureUpdates: ["课程中心支持连接 MySQL 保存课程数据"],
    fixes: ["数据库不可用时自动保留本地文件备份，避免课程数据被清空"],
    optimizations: ["课程数据可在 MySQL 与本地文件之间自动兜底同步"]
  },
  {
    version: "1.2.4",
    date: "2026-06-11",
    title: "课程数据持久化",
    featureUpdates: ["课程中心新增本地文件数据库保存", "启动时可从旧课程缓存自动恢复数据"],
    fixes: ["修复课程数据可能因缓存或发布环境变化而丢失的问题"],
    optimizations: ["旧课程缓存会自动迁移到更稳定的本地数据库"]
  },
  {
    version: "1.2.3",
    date: "2026-06-11",
    title: "导图排版工具区压缩",
    featureUpdates: ["思维导图排版工具区改为紧凑布局"],
    fixes: ["修复排版功能区占用画布空间过多的问题"],
    optimizations: ["工具分组高度更低，画布可视区域更大"]
  },
  {
    version: "1.2.2",
    date: "2026-06-11",
    title: "应用图标修复",
    featureUpdates: ["应用快捷方式恢复正确图标"],
    fixes: ["修复重新打包后快捷方式图标显示异常的问题"],
    optimizations: ["应用图标在不同桌面尺寸下显示更稳定"]
  },
  {
    version: "1.2.1",
    date: "2026-06-11",
    title: "知识点编辑区布局修复",
    featureUpdates: ["知识点编辑区恢复为完整可编辑页面"],
    fixes: ["修复排版工具栏下沉和正文区域空白过大的问题"],
    optimizations: ["知识点工具栏与正文区域贴合更自然"]
  },
  {
    version: "1.2.0",
    date: "2026-06-10",
    title: "知识点排版工具",
    featureUpdates: [
      "知识点编辑器升级为富文本编辑器",
      "添加排版工具栏：加粗、斜体、下划线、删除线",
      "添加字体大小选择：正常、小、较小、较大、大、特大、超大",
      "添加文字颜色和背景颜色选择",
      "添加对齐方式：左对齐、居中、右对齐、两端对齐",
      "添加列表功能：无序列表、有序列表",
      "添加缩进功能：增加缩进、减少缩进",
      "添加清除格式功能"
    ],
    fixes: [],
    optimizations: ["知识点编辑体验更接近 Word/WPS"]
  },
  {
    version: "1.1.0",
    date: "2026-06-09",
    title: "目录层级优化",
    featureUpdates: [
      "目录标题分级显示：章节标题加粗大字体，子标题按层级递减",
      "目录缩进优化：每级缩进22px，末级标题额外增加16px",
      "目录序号优化：章节标题不加序号，子标题按层级显示序号"
    ],
    fixes: ["修复目录层级样式错乱问题", "修复子标题序号显示问题"],
    optimizations: ["目录层级关系更清晰，视觉层次更分明"]
  },
  {
    version: "1.0.19",
    date: "2026-06-09",
    title: "目录层级序号",
    featureUpdates: ["目录支持 Word/WPS 风格的层级序号", "一级：第一章、第二章... 二级：一、二、三... 三级：（一）（二）（三）... 四级：1. 2. 3... 五级：1) 2) 3)..."],
    fixes: [],
    optimizations: ["目录显示更规范，符合文档编辑习惯"]
  },
  {
    version: "1.0.18",
    date: "2026-06-09",
    title: "目录自适应布局",
    featureUpdates: ["目录面板宽度调整时右侧内容区域自动适应", "使用 CSS Grid 实现真正的自适应布局"],
    fixes: ["修复目录拖动时右侧板块被覆盖的问题"],
    optimizations: ["整个编辑器布局使用 CSS 变量控制，更灵活"]
  },
  {
    version: "1.0.17",
    date: "2026-06-09",
    title: "目录面板优化",
    featureUpdates: ["目录面板支持拖动调整宽度（180-500px）", "目录项支持自动换行显示"],
    fixes: [],
    optimizations: ["目录文本溢出时自动换行，不再截断"]
  },
  {
    version: "1.0.16",
    date: "2026-06-09",
    title: "系统索引",
    featureUpdates: ["补充全系统程序、数据、构建和交接索引"],
    fixes: ["统一交接资料中的版本和位置说明"],
    optimizations: ["索引覆盖源码、exe、存储、发布产物和后续开发重点"]
  },
  {
    version: "1.0.15",
    date: "2026-06-09",
    title: "快捷键删除分支",
    featureUpdates: ["思维导图支持 Delete/Backspace 快捷键删除选中分支"],
    fixes: ["输入文本时不会误触发分支删除"],
    optimizations: ["删除分支操作更便捷，无需点击工具栏按钮"]
  },
  {
    version: "1.0.14",
    date: "2026-06-09",
    title: "交接同步",
    featureUpdates: ["补充系统交接说明并同步仓库版本"],
    fixes: ["统一源码版本与交接记录"],
    optimizations: ["交接信息覆盖功能、架构、位置和发布路径"]
  },
  {
    version: "1.0.13",
    date: "2026-06-08",
    title: "功能区规整",
    featureUpdates: ["思维导图功能区改为统一标题与按钮排列"],
    fixes: ["减少功能区视觉错位"],
    optimizations: ["工具组高度和按钮宽度更一致"]
  },
  {
    version: "1.0.12",
    date: "2026-06-08",
    title: "控件固定",
    featureUpdates: ["思维导图滑动控件固定在可视编辑区"],
    fixes: ["修复导图内容过高时底部滑动栏不可见"],
    optimizations: ["放大编辑状态下控件位置独立适配"]
  },
  {
    version: "1.0.11",
    date: "2026-06-08",
    title: "放大编辑",
    featureUpdates: ["思维导图新增放大编辑按钮"],
    fixes: ["恢复画布底部左右滑动栏显示"],
    optimizations: ["放大编辑时画布可视空间更大"]
  },
  {
    version: "1.0.10",
    date: "2026-06-08",
    title: "目录滑动",
    featureUpdates: ["课程目录新增上下滑动栏"],
    fixes: ["目录较长时可直接拖动定位"],
    optimizations: ["目录滚动控制更清晰"]
  },
  {
    version: "1.0.9",
    date: "2026-06-08",
    title: "功能区排版",
    featureUpdates: ["思维导图功能区改为规整分组布局"],
    fixes: ["减少功能区分组错位和拥挤"],
    optimizations: ["工具按钮间距和分组边界更统一"]
  },
  {
    version: "1.0.8",
    date: "2026-06-08",
    title: "详情标题",
    featureUpdates: ["课程详情操作栏移除重复课程标题"],
    fixes: ["减少页面顶部重复信息"],
    optimizations: ["课程详情头部空间更紧凑"]
  },
  {
    version: "1.0.7",
    date: "2026-06-08",
    title: "工具栏布局",
    featureUpdates: ["思维导图工具栏改为上下分组展示"],
    fixes: ["减少工具栏横向拖动操作"],
    optimizations: ["工具分组在窄屏下自动换行"]
  },
  {
    version: "1.0.6",
    date: "2026-06-08",
    title: "导图编辑分页",
    featureUpdates: ["思维导图编辑节点不再自动切换目录页"],
    fixes: ["修复章节内新增分支后跳入子分支页"],
    optimizations: ["目录分页和节点编辑选中状态分离"]
  },
  {
    version: "1.0.5",
    date: "2026-06-08",
    title: "目录分页",
    featureUpdates: ["知识笔记按目录切换叶子分支页", "思维导图按目录进入对应分支"],
    fixes: ["修复目录点击后章节切换不生效"],
    optimizations: ["知识笔记页展示当前分支路径"]
  },
  {
    version: "1.0.4",
    date: "2026-06-08",
    title: "知识笔记",
    featureUpdates: ["课程工作区新增知识笔记功能", "知识笔记按思维导图分支生成固定格式"],
    fixes: ["导图分支内容可用于快速复习整理"],
    optimizations: ["笔记标题按分支层级阶梯式排列"]
  },
  {
    version: "1.0.3",
    date: "2026-06-08",
    title: "目录拖拽排序",
    featureUpdates: ["目录支持同级章节拖拽调整顺序"],
    fixes: ["章节顺序调整后同步刷新思维导图"],
    optimizations: ["目录拖拽状态更清晰"]
  },
  {
    version: "1.0.2",
    date: "2026-06-08",
    title: "目录回到主图",
    featureUpdates: ["目录新增主思维导图入口"],
    fixes: ["进入章节后可一键回到课程主导图"],
    optimizations: ["目录选中状态更清晰"]
  },
  {
    version: "1.0.1",
    date: "2026-06-08",
    title: "导图空间优化",
    featureUpdates: ["课程思维导图显示区域扩大"],
    fixes: ["压缩课程详情和工作区顶部功能区高度"],
    optimizations: ["导图工具栏改为更紧凑排版"]
  },
  {
    version: "1.0.0",
    date: "2026-06-08",
    title: "首个交接版本",
    featureUpdates: ["完成课程中心、知识点、课程思维导图、设置和更新管理基础功能"],
    fixes: ["统一当前功能版本为 V1.0.0"],
    optimizations: ["项目源码准备提交到远端仓库"]
  },
  {
    version: "0.22.0",
    date: "2026-06-08",
    title: "快捷键设置",
    featureUpdates: ["设置新增快捷键设置模块", "方向键可控制导图上下左右滑动"],
    fixes: ["方向键在输入内容时不触发画布移动"],
    optimizations: ["快捷键配置本地保存"]
  },
  {
    version: "0.21.0",
    date: "2026-06-08",
    title: "画布滑动控件",
    featureUpdates: ["导图画布新增上下左右滑动控件"],
    fixes: ["滑动控件固定在画布内可视位置"],
    optimizations: ["滑动条与拖动画布保持同一套平移逻辑"]
  },
  {
    version: "0.20.0",
    date: "2026-06-08",
    title: "无限画布",
    featureUpdates: ["思维导图区改为完整无限画布", "拖动模式覆盖整个画布区域"],
    fixes: ["拖动开启后任意位置都可平移导图"],
    optimizations: ["画布背景统一为整块底纹"]
  },
  {
    version: "0.19.0",
    date: "2026-06-08",
    title: "画布平移修正",
    featureUpdates: ["拖动按钮改为平移导图内容"],
    fixes: ["移除滚动式大画布造成的下半区空白"],
    optimizations: ["导图画布不再依赖隐藏滑动块"]
  },
  {
    version: "0.18.0",
    date: "2026-06-08",
    title: "拖动开关",
    featureUpdates: ["功能区新增拖动画布开关"],
    fixes: ["去除导图框下半部分多余画布"],
    optimizations: ["拖动与节点编辑不再互相干扰"]
  },
  {
    version: "0.17.0",
    date: "2026-06-08",
    title: "导图拖动交互",
    featureUpdates: ["导图画布改为直接拖动平移", "隐藏原生横向和纵向滑动块"],
    fixes: ["关系线和概要按钮增加多选提示"],
    optimizations: ["导图交互更接近 Xmind 画布"]
  },
  {
    version: "0.16.0",
    date: "2026-06-08",
    title: "导图工具分层",
    featureUpdates: ["导图工具栏改为上下两行", "新增关系线、概要、标签、备注入口", "支持拖动画布内容"],
    fixes: ["导图画布背景合并为一整块"],
    optimizations: ["工具分区更接近 Xmind 使用方式"]
  },
  {
    version: "0.15.0",
    date: "2026-06-08",
    title: "导图滚动固定",
    featureUpdates: ["导图横向滑动条固定在可视区域底部", "导图区域支持内部上下滚动"],
    fixes: ["无需下滑页面才能看到横向滑动条"],
    optimizations: ["鼠标滚轮优先滚动导图画布"]
  },
  {
    version: "0.14.0",
    date: "2026-06-08",
    title: "流畅性优化",
    featureUpdates: ["优化课程详情切换流畅度", "知识点输入与导图保存改为延迟落盘"],
    fixes: ["减少频繁保存造成的界面卡顿"],
    optimizations: ["导图编辑器按需加载", "窗口内容准备后再显示"]
  },
  {
    version: "0.13.0",
    date: "2026-06-08",
    title: "知识点切换",
    featureUpdates: ["课程详情新增知识点与思维导图切换", "目录固定并共用课程分支"],
    fixes: ["知识点内容按目录节点保存"],
    optimizations: ["课程内容与导图思路分层展示"]
  },
  {
    version: "0.12.0",
    date: "2026-06-08",
    title: "文本标注",
    featureUpdates: ["导图节点新增文本标注工具", "支持选中文字标注和节点标注"],
    fixes: ["标注内容可随导图保存"],
    optimizations: ["标注数据预留后续标注库入口"]
  },
  {
    version: "0.11.0",
    date: "2026-06-08",
    title: "导图文本格式",
    featureUpdates: ["导图节点新增文本格式工具", "支持加粗、文字颜色、背景色和字号"],
    fixes: ["双击编辑时可处理选中文字"],
    optimizations: ["节点格式可随课程导图保存"]
  },
  {
    version: "0.10.0",
    date: "2026-06-08",
    title: "导图排版工具",
    featureUpdates: ["课程导图新增排版工具栏", "支持布局、节点、视图和操作工具"],
    fixes: ["导图常用操作集中到顶部"],
    optimizations: ["导图编辑入口更直观"]
  },
  {
    version: "0.9.0",
    date: "2026-06-08",
    title: "导图横向滑动",
    featureUpdates: ["课程导图新增底部横向滑动条"],
    fixes: ["导图右侧内容可通过滑动查看"],
    optimizations: ["导图画布横向操作更顺手"]
  },
  {
    version: "0.8.0",
    date: "2026-06-08",
    title: "更新管理",
    featureUpdates: ["新增更新管理板块", "版本记录支持折叠查看", "最新版本自动置顶"],
    fixes: ["统一更新记录入口"],
    optimizations: ["更新说明按功能、修复、优化归类"]
  },
  {
    version: "0.7.0",
    date: "2026-06-08",
    title: "课程导图目录",
    featureUpdates: ["课程导图新增分支目录", "点击目录可定位导图节点"],
    fixes: ["目录随导图编辑同步"],
    optimizations: ["导图编辑区向下扩展"]
  },
  {
    version: "0.6.0",
    date: "2026-06-08",
    title: "课程思维导图",
    featureUpdates: ["课程可创建并保存", "课程详情可直接编辑思维导图"],
    fixes: ["课程数据本机持久保存"],
    optimizations: ["课程中心减少说明文案"]
  },
  {
    version: "0.5.0",
    date: "2026-06-08",
    title: "课程中心",
    featureUpdates: ["新增课程中心页面", "新增课程卡片和继续学习入口"],
    fixes: ["虚拟展示数据归零"],
    optimizations: ["课程列表布局更紧凑"]
  },
  {
    version: "0.4.0",
    date: "2026-06-08",
    title: "学习工作台",
    featureUpdates: ["新增学习工作台", "新增指标卡和空状态"],
    fixes: ["修复打包后白屏"],
    optimizations: ["隐藏默认菜单栏"]
  }
];
