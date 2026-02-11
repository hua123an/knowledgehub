# KnowledgeHub V2.0 重构方案：终极知识操作系统

## 1. 核心愿景 (Vision)

打造一个**本地优先 (Local-First)** 的现代化知识库，融合四大神器的核心优势：

- **Typora 的优雅**: 极致的 Markdown 所见即所得，干扰最小化。
- **Notion 的灵活**: "/" 命令系统，块级 (Block) 编辑，多媒体自由混排。
- **Obsidian 的深度**: 双向链接，本地文件存储，知识图谱。
- **思维导图的直观**: 笔记即导图，支持大纲与图形的无缝切换。

---

## 2. 技术架构升级 (Technology Stack V2)

为了实现上述目标，我们需要替换和升级部分核心组件：

### 2.1 编辑器核心：从 Milkdown 迁移至 Tiptap

- **现状**: Milkdown 虽然基于 Prosemirror，但定制 Notion 风格的交互（如拖拽块、复杂的 Slash 菜单）较为困难。
- **方案**: 采用 **Tiptap 2.0** (Headless Editor Framework)。
  - **理由**: Tiptap 拥有最完善的Vue社区支持，非常容易实现 Notion 风格的 Block Editor。
  - **能力**: 原生支持 Node Views（在编辑器里渲染 Vue 组件），这对于实现“思维导图块”、“看板块”至关重要。

### 2.2 数据存储：SQLite + 文件系统双向同步

- **现状**: 纯 SQLite，用户无法直接查看 Markdown 文件。
- **方案**: **OBSIDIAN 模式**。
  - **主存储**: 用户的磁盘文件系统（.md 文件）。
  - **索引库**: SQLite (better-sqlite3) 仅作为**索引缓存**和**元数据存储**（用于加速搜索、图谱生成、AI 分析），**不**作为唯一真理源。
  - **优势**: 用户可以用其他编辑器（如 VSCode/Typora）打开文件夹，我们的应用能自动监听文件变化并更新索引。

### 2.3 架构解耦

- **目标**: 解决目前在浏览器中无法预览的问题。
- **方案**: 抽象 `IDataProvider` 接口。
  - `ElectronProvider`: 使用 `fs` 和 `sqlite`。
  - `WebProvider`: 使用 `localStorage` 或 `IndexedDB`（用于开发预览和演示）。

---

## 3. 功能模块重构细节

### 3.1 编辑器重构 (Project: HyperText)

目标：**"Block-based Markdown Editor"**

- **Slash Command (/)**:
  - 输入 `/` 弹出菜单，支持插入：标题、列表、待办、表格、代码块、**思维导图**、**数学公式**。
- **块级操作 (Block Handle)**:
  - 每行左侧显示 "::" 拖拽手柄。
  - 支持拖拽段落排序。
  - 点击手柄弹出：转换类型、颜色高亮、删除、复制链接。
- **内联 AI**:
  - 选中文字 -> 弹出 "Ask AI" 浮窗 (类似 Notion AI)。
  - 功能：润色、缩写、扩写、翻译、生成摘要。

### 3.2 思维导图深度集成 (Project: BrainMap)

目标：**"笔记即导图，导图即笔记"**

- **模式 A：文档内导图 (Markmap)**
  - 在文档中输入 `/mindmap`。
  - 解析当前代码块中的 Markdown 列表，实时渲染为思维导图（可交互、可缩放）。
- **模式 B：全文导图模式**
  - 一键切换当前笔记视图：从“文本模式”切换为“思维导图模式”。
  - 修改导图节点，自动同步修改 Markdown 内容。

### 3.3 双向链接与图谱 (Project: Synapse)

- **Wiki Link**: 继续支持 `[[...]]` 语法，带有自动补全。
- **悬浮预览 (Hover Preview)**: 鼠标悬停在链接上时，通过 `Tiptap Node View` 弹窗预览目标笔记内容。
- **局部图谱**: 在侧边栏显示“当前笔记的相关连接”（入链和出链），而不仅仅是全局图谱。

---

## 4. UI/UX 全新设计 (Design System: Aurora)

- **布局**:
  - **三栏式**: 侧边栏 (导航) | 笔记列表/图谱区 | 核心编辑器 | 辅助侧栏 (AI/大纲/元数据)。
  - **多标签页 (Tabs)**: 像浏览器一样打开多个笔记，支持拖拽分屏。
- **风格**:
  - **磨砂玻璃 (Acrylic/Mica)**: 侧边栏使用半透明模糊效果。
  - **无边框设计**: 移除多余的分割线，用间距和排版区分层级。
  - **大纲导航**: 类似 Typora 的侧边目录，随滚动自动高亮。

---

## 5. 实施路线图 (Roadmap)

### Phase 1: 核心重塑 (Core Refactor)

1.  **架构解耦**: 实现 DataProvider 模式，确保浏览器可运行。
2.  **Tiptap 替换**: 移除 Milkdown，初始化 Tiptap 编辑器。
3.  **基础功能**: 实现 Markdown 基本渲染，Slash 菜单。

### Phase 2: 交互升级 (UX Upgrade)

1.  **Block Handle**: 实现 Notion 风格的块拖拽与操作。
2.  **文件系统同步**: 实现文件监听 (`chokidar`)，将 Markdown 文件作为单一真理源。
3.  **多标签页**: 实现 Tabs 和分屏系统。

### Phase 3: 高级特性 (Advanced Features)

1.  **思维导图**: 集成 Markmap，实现文档内导图。
2.  **AI Copilot**: 将 AI 不仅作为侧边栏聊天，而是集成到编辑器选区菜单中。
3.  **全局搜索**: 命令面板 (Cmd+K/P) 集成搜索与指令。

---

## 6. 立即执行计划 (Next Steps)

1.  **环境清理**: 修复当前的 `AppLayout` 错误，确保开发环境可用。
2.  **依赖安装**: 安装 `@tiptap/vue-3`, `@tiptap/starter-kit`, `tiptap-extension-resizable-image` 等。
3.  **原型开发**: 创建一个新的 `EditorV2.vue`，开始搭建基于 Tiptap 的编辑器原型。
