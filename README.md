# 桌面记事本 Desktop Notepad

> 基于 Tauri 2 + Vue 3 的本地桌面记事本。它把工作任务、公众号 Markdown 编辑器、AI 搜问和桌面小组件放在一个轻量应用里，数据保存在本机 SQLite，不依赖服务端。

## 项目简介

Desktop Notepad 是一个个人桌面效率工具，主要解决笔记分散、任务难追踪、公众号排版繁琐、AI 对话记录不集中等问题。

项目选择 Tauri 而不是 Electron，是因为 Tauri 的安装包更小、内存占用更低、启动更快；前端仍然使用熟悉的 Vue 3 + TypeScript 技术栈，开发体验轻量直接。

## 主要功能

### 工作任务

- 日历视图管理每日工作任务
- 支持任务状态切换、任务描述和日期归档
- 支持日、周、月、季、年等统计维度
- 内置法定节假日和调休信息展示
- 首页可提醒未完成任务，并展示上下班倒计时

### 公众号编辑器

- 左侧 Markdown 编写，右侧实时预览
- 内置多套排版主题，支持代码高亮和 Mac 风格代码块
- 一键复制到微信公众平台，尽量保留完整内联样式
- 支持导入 Word / Markdown
- 支持导出 PDF / Markdown 等内容

### AI 搜问

- 支持接入兼容 OpenAI 格式的大模型 API
- 支持硅基流动、DeepSeek、豆包、OpenRouter、HiCaspian、OpenAI 和自定义接口
- 支持流式输出、Markdown 渲染和历史会话管理
- API Key 保存在本地配置中

### 桌面小组件

- 独立桌面小窗口
- 展示实时时钟、今日任务数量和每日激励语
- 可从小组件快速回到主窗口

### 本地账号与数据

- 本地账号注册 / 登录
- 密码 SHA-256 加密存储
- 路由守卫拦截未登录访问
- SQLite 本地数据库，无需后端服务
- 支持数据备份、恢复和存储清理

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2 | Rust 驱动，体积小，支持原生能力 |
| 前端框架 | Vue 3 + TypeScript | 组合式 API |
| 构建工具 | Vite 8 | 快速开发和打包 |
| 状态管理 | Pinia | 用户状态、业务状态管理 |
| UI 组件库 | Naive UI | 组件和主题能力 |
| CSS 方案 | UnoCSS | 原子化 CSS，按需生成 |
| 图标 | Iconify Carbon | 通过 UnoCSS 集成 |
| 本地数据库 | SQLite | 通过 `tauri-plugin-sql` 访问 |
| 路由 | Vue Router 4 | 页面路由和登录守卫 |
| 编辑器 | CodeMirror 6 | Markdown 编辑体验 |
| Markdown 渲染 | marked + highlight.js + juice | 渲染、代码高亮、CSS 内联 |
| 文件处理 | mammoth、Tauri fs/dialog | Word 导入、文件读写、文件选择 |

## 环境要求

- Node.js >= 18
- pnpm >= 8
- Rust >= 1.77，开发和打包时需要，用户安装后不需要

如未安装 Rust，可先安装 Rust 工具链：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

Windows 用户可参考 [Tauri 官方文档](https://tauri.app/start/prerequisites/) 安装 Rust 和系统依赖。

## 快速启动

```bash
# 安装依赖
pnpm install

# 启动 Tauri 桌面开发模式
pnpm tauri:dev
```

首次运行 `pnpm tauri:dev` 需要编译 Rust 依赖，可能需要几分钟；之后启动会快很多。

### 常用命令

```bash
# 仅启动前端浏览器预览，不包含 Tauri 原生能力
pnpm dev

# TypeScript 类型检查并构建前端
pnpm build

# 打包桌面安装包
pnpm tauri:build

# 预览前端构建产物
pnpm preview
```

## 项目结构

### 核心目录说明

`src` 是前端应用目录，负责桌面窗口里看到的所有界面和交互逻辑。这里使用 Vue 3 + TypeScript 编写，包括页面组件、路由、状态管理、全局样式，以及 AI 请求、数据库访问、备份恢复、节假日计算等前端工具模块。

`src-tauri` 是 Tauri 桌面端目录，负责把前端应用包装成原生桌面程序，并提供系统级能力。这里使用 Rust 编写，包括 Tauri 启动入口、插件注册、窗口配置、权限配置、系统托盘、中文菜单、全局快捷键和安装包打包配置。

开发启动时，`pnpm tauri:dev` 会先启动 `src` 对应的 Vite 前端服务，再由 `src-tauri` 启动桌面窗口并加载前端页面；正式打包时，前端会先构建到 `dist`，再由 Tauri 打包为各平台安装包。

```text
desktop-notepad/
├── src/
│   ├── main.ts                       # 前端入口
│   ├── App.vue                       # 根组件和全局 UI 配置
│   ├── layouts/
│   │   └── MainLayout.vue            # 主布局
│   ├── pages/
│   │   ├── Login/                    # 登录 / 注册
│   │   ├── Dashboard/                # 首页仪表盘
│   │   ├── WorkTask/                 # 工作任务
│   │   ├── WechatEditor/             # 公众号编辑器
│   │   ├── AiSearch/                 # AI 搜问
│   │   ├── Widget/                   # 桌面小组件
│   │   ├── Settings/                 # 设置
│   │   └── Mine/                     # 我的
│   ├── components/                   # 公共组件
│   ├── router/                       # 路由配置和登录守卫
│   ├── stores/                       # Pinia 状态
│   ├── utils/                        # 数据库、AI、备份、节假日等工具
│   └── styles/                       # 全局样式和主题
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                   # Rust 入口
│   │   └── lib.rs                    # 插件、菜单、托盘、快捷键
│   ├── capabilities/                 # Tauri 权限配置
│   ├── Cargo.toml                    # Rust 依赖
│   └── tauri.conf.json               # 应用窗口和打包配置
├── package.json                      # 前端依赖和脚本
├── vite.config.ts                    # Vite 配置
├── uno.config.ts                     # UnoCSS 配置
└── tsconfig*.json                    # TypeScript 配置
```

## 数据存储

应用通过 `tauri-plugin-sql` 使用 SQLite，本地数据库加载名为：

```text
sqlite:notepad.db
```

主要数据表：

### users

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键自增 |
| username | TEXT | 用户名，唯一 |
| password | TEXT | SHA-256 加密密码 |
| plain_password | TEXT | 记住密码相关字段 |
| nickname | TEXT | 昵称 |
| avatar | TEXT | 头像 |
| signature | TEXT | 签名 |
| created_at | DATETIME | 创建时间 |

### wechat_articles

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键自增 |
| title | TEXT | 文章标题 |
| content | TEXT | Markdown 内容 |
| sort_order | INTEGER | 排序 |
| user_id | INTEGER | 所属用户 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### work_tasks

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键自增 |
| title | TEXT | 任务标题 |
| description | TEXT | 任务描述 |
| status | TEXT | 任务状态 |
| task_date | TEXT | 任务日期 |
| user_id | INTEGER | 所属用户 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 核心实现

### AI 对话流式输出

AI 搜问模块使用兼容 OpenAI 的 `/chat/completions` 接口，通过 `ReadableStream` 读取 SSE 数据，并在前端逐段渲染。

```typescript
const reader = res.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const lines = decoder.decode(value).split('\n')
  for (const line of lines) {
    const data = line.replace('data: ', '')
    if (data === '[DONE]') return

    const content = JSON.parse(data).choices?.[0]?.delta?.content
    if (content) onChunk(content)
  }
}
```

### 公众号样式内联

微信公众平台不支持外部 CSS。编辑器会先把 Markdown 渲染为 HTML，再使用 `juice` 将主题 CSS 内联到元素的 `style` 属性中，这样复制到微信后台后能尽量保留排版效果。

```typescript
import juice from 'juice'

export function renderMarkdown(markdown: string, theme: WechatTheme) {
  const rawHtml = marked.parse(markdown)
  const css = buildThemeCSS(theme)
  return juice.inlineContent(rawHtml, css)
}
```

### 原生桌面能力

Tauri 后端负责注册 SQLite、文件系统、文件选择、全局快捷键、系统托盘和中文菜单等能力。当前快捷键 `Alt+N` 可用于显示或隐藏主窗口。

## AI 搜问配置

在应用的设置页中选择平台、填写 API Key 和模型名称即可使用。支持的平台包括：

| 平台 | API 地址 | 说明 |
|------|----------|------|
| 硅基流动 | `https://api.siliconflow.cn/v1` | 推荐，兼容 OpenAI 格式 |
| DeepSeek | `https://api.deepseek.com/v1` | 兼容 OpenAI 格式 |
| 豆包（火山引擎） | `https://ark.cn-beijing.volces.com/api/v3` | 模型名需填写接入点 ID |
| OpenRouter | `https://openrouter.ai/api/v1` | 可使用多家模型 |
| HiCaspian | `https://llm.hicaspian.com/v1` | 兼容 OpenAI 格式 |
| OpenAI | `https://api.openai.com/v1` | 官方接口 |
| 自定义 | 自行填写 | 任意兼容 OpenAI 格式的接口 |

豆包模型名不是通用模型名称，需要在火山引擎方舟平台创建推理接入点，并把接入点 ID 填入模型栏。

## 打包发布

本机打包：

```bash
pnpm tauri:build
```

当前 `tauri.conf.json` 配置的打包目标包括：

- macOS：`dmg`
- Windows：`nsis`
- Linux：`deb`、`appimage`

打包产物位于 `src-tauri/target/release/bundle/` 下。

如需自动发布，可以后续添加 GitHub Actions，在推送版本 tag 后自动构建多平台安装包并生成 GitHub Release。

## 主题风格

项目整体以健康绿为主色：

```text
主色：     #36AD6A
悬停色：   #4FBF7F
按下色：   #1B8C3E
背景色：   #FAFFFE
卡片色：   #FFFFFF
文字主色： #333333
文字次色： #666666
危险色：   #E88080
```

同时支持暗色模式，适合长期写作和任务管理场景。

## 后续规划

| 阶段 | 功能 | 状态 |
|------|------|------|
| P0 | 项目搭建、登录、本地存储 | 已完成 |
| P1 | 首页 Dashboard、基础数据统计 | 已完成 |
| P1.5 | 微信公众号文章编辑器 | 已完成 |
| P2 | 工作任务和日历统计 | 已完成 |
| P3 | AI 搜问和多平台模型配置 | 已完成 |
| P4 | 数据导出、备份恢复、存储管理 | 已完成 |
| P5 | 全局快捷键、系统托盘、桌面小组件 | 已完成 |
| P6 | GitHub Actions 多平台自动发布 | 待完善 |

## 项目亮点

- 本地优先：无需服务端，数据默认留在本机
- 轻量桌面：Tauri 2 带来更小安装包和更低资源占用
- 写作友好：Markdown 编辑、主题预览、微信复制链路完整
- 任务闭环：从每日任务、统计视图到桌面提醒形成工作流
- AI 可配置：不绑定单一厂商，可接入多个兼容 OpenAI 的服务

如果你也在做桌面应用、Markdown 编辑器或 Tauri 项目，欢迎交流、提 Issue 或 PR。
