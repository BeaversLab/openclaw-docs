# Tweakcn 自定义主题导入设计

状态：已于 2026-04-22 在终端获得批准

## 摘要

增加一个确切的浏览器本地自定义控制 UI 主题槽，可从 tweakcn 分享链接导入。现有的内置主题系列保持 `claw`、`knot` 和 `dash` 不变。新的 `custom` 系列行为类似于普通的 OpenClaw 主题系列，并且当导入的 tweakcn 载荷同时包含浅色和深色令牌集时，支持 `light`、`dark` 和 `system` 模式。

导入的主题仅与控制 UI 的其余设置一起存储在当前的浏览器配置文件中。它不会写入网关配置，也不会跨设备或浏览器同步。

## 问题

控制 UI 主题系统目前仅限于三个硬编码的主题系列：

- `ui/src/ui/theme.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/styles/base.css`

用户可以在内置系列和模式变体之间切换，但在不编辑仓库 CSS 的情况下，无法从 tweakcn 引入主题。请求的结果比通用主题系统更小：保留三个内置主题，并增加一个用户控制的导入槽，可以从 tweakcn 链接进行替换。

## 目标

- 保持现有的内置主题系列不变。
- 仅添加一个导入的自定义槽，而不是主题库。
- 接受 tweakcn 分享链接或直接的 `https://tweakcn.com/r/themes/{id}` URL。
- 仅将导入的主题保留在浏览器本地存储中。
- 使导入的槽能够与现有的 `light`、`dark` 和 `system` 模式控件一起工作。
- 保持失败行为的安全性：错误的导入绝不会破坏活动的 UI 主题。

## 非目标

- 不提供多主题库或浏览器本地的导入列表。
- 不进行网关端持久化或跨设备同步。
- 不提供任意 CSS 编辑器或原始主题 JSON 编辑器。
- 不从 tweakcn 自动加载远程字体资源。
- 不尝试支持仅公开一种模式的 tweakcn 载荷。
- 除了控制 UI 所需的接口之外，不进行仓库范围的主题重构。

## 已做出的用户决定

- 保留三个内置主题。
- 增加一个由 tweakcn 支持的导入槽。
- 将导入的主题存储在浏览器中，而不是网关配置中。
- 支持导入的插槽使用 `light`、`dark` 和 `system`。
- 通过下一次导入覆盖自定义插槽是预期行为。

## 推荐方法

向 Control UI 主题模型添加第四个主题系列 ID `custom`。仅当存在有效的 tweakcn 导入时，`custom` 系列才变为可选。导入的负载被规范化为 OpenClaw 特定的自定义主题记录，并与其余 UI 设置一起存储在浏览器本地存储中。

在运行时，OpenClaw 渲染一个托管的 `<style>` 标签，用于定义解析后的自定义 CSS 变量块：

```css
:root[data-theme="custom"] { ... }
:root[data-theme="custom-light"] { ... }
```

这确保自定义主题变量仅作用于 `custom` 系列，并避免将内联 CSS 变量泄漏到内置系列中。

## 架构

### 主题模型

更新 `ui/src/ui/theme.ts`：

- 扩展 `ThemeName` 以包含 `custom`。
- 扩展 `ResolvedTheme` 以包含 `custom` 和 `custom-light`。
- 扩展 `VALID_THEME_NAMES`。
- 更新 `resolveTheme()`，使 `custom` 镜像现有系列的行为：
  - `custom + dark` -> `custom`
  - `custom + light` -> `custom-light`
  - `custom + system` -> `custom` 或 `custom-light`，取决于系统首选项

不为 `custom` 添加传统别名。

### 持久化模型

扩展 `ui/src/ui/storage.ts` 中的 `UiSettings` 持久化，增加一个可选的自定义主题负载：

- `customTheme?: ImportedCustomTheme`

推荐的存储形状：

```ts
type ImportedCustomTheme = {
  sourceUrl: string;
  themeId: string;
  label: string;
  importedAt: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};
```

注：

- `sourceUrl` 存储规范化后的原始用户输入。
- `themeId` 是从 URL 中提取的 tweakcn 主题 ID。
- 如果存在 tweakcn `name` 字段，`label` 即为该字段，否则为 `Custom`。
- `light` 和 `dark` 已经是规范化的 OpenClaw 标记映射，而不是原始的 tweakcn 载荷。
- 导入的载荷与其他浏览器本地设置并存，并序列化在同一个本地存储文档中。
- 如果在加载时存储的自定义主题数据缺失或无效，则忽略该载荷，并在持久化的族为 `custom` 时回退到 `theme: "claw"`。

### 运行时应用

在 Control UI 运行时中添加一个狭窄的自定义主题样式表管理器，其所有者位于 `ui/src/ui/app-settings.ts` 和 `ui/src/ui/theme.ts` 附近。

职责：

- 在 `document.head` 中创建或更新一个稳定的 `<style id="openclaw-custom-theme">` 标签。
- 仅当存在有效的自定义主题载荷时才发出 CSS。
- 当载荷被清除时，移除样式标签的内容。
- 将内置族 CSS 保留在 `ui/src/styles/base.css` 中；不要将导入的标记拼接到已检入的样式表中。

无论何时加载、保存、导入或清除设置，该管理器都会运行。

### 浅色模式选择器

实现应优先使用 `data-theme-mode="light"` 进行跨族浅色样式设置，而不是对 `custom-light` 进行特殊处理。如果现有的选择器固定为 `data-theme="light"` 并且需要应用于每个浅色族，请在此工作中将其范围扩大。

## 导入体验

更新 `Appearance` 部分中的 `ui/src/ui/views/config.ts`：

- 在 `Claw`、`Knot` 和 `Dash` 旁边添加一个 `Custom` 主题卡片。
- 当不存在导入的自定义主题时，将卡片显示为禁用状态。
- 在主题网格下方添加一个导入面板，其中包括：
  - 一个用于输入 tweakcn 分享链接或 `/r/themes/{id}` URL 的文本输入框
  - 一个 `Import` 按钮
  - 当自定义载荷已存在时的 `Replace` 路径
  - 当自定义载荷已存在时的 `Clear` 操作
- 当载荷存在时，显示导入的主题标签和源主机。
- 如果活动主题是 `custom`，导入替换将立即生效。
- 如果当前主题不是 `custom`，导入操作仅存储新的有效载荷，直到用户选择 `Custom` 卡片。

`ui/src/ui/views/config-quick.ts` 中的快速设置主题选择器也应仅在有效载荷存在时显示 `Custom`。

## URL 解析和远程获取

浏览器导入路径接受：

- `https://tweakcn.com/themes/{id}`
- `https://tweakcn.com/r/themes/{id}`

实现应将这两种形式标准化为：

- `https://tweakcn.com/r/themes/{id}`

然后浏览器直接获取标准化的 `/r/themes/{id}` 端点。

为外部有效载荷使用窄模式验证器。首选 zod 模式，因为这是一个不受信任的外部边界。

必填的远程字段：

- 顶层 `name` 作为可选字符串
- `cssVars.theme` 作为可选对象
- `cssVars.light` 作为对象
- `cssVars.dark` 作为对象

如果缺少 `cssVars.light` 或 `cssVars.dark` 中的任何一个，则拒绝导入。这是刻意的：批准的产品行为是完全模式支持，而不是尽力合成缺失的一面。

## 令牌映射

不要盲目镜像 tweakcn 变量。将有界的子集标准化为 OpenClaw 令牌，并在辅助工具中推导其余部分。

### 直接导入的令牌

从每个 tweakcn 模式块中：

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `destructive-foreground`
- `border`
- `input`
- `ring`
- `radius`

如果存在共享的 `cssVars.theme`，则从其中：

- `font-sans`
- `font-mono`

如果模式块覆盖了 `font-sans`、`font-mono` 或 `radius`，则模式本地的值生效。

### 为 OpenClaw 推导的 Tokens

导入器从导入的基础颜色中推导 OpenClaw 专用的变量：

- `--bg-accent`
- `--bg-elevated`
- `--bg-hover`
- `--panel`
- `--panel-strong`
- `--panel-hover`
- `--chrome`
- `--chrome-strong`
- `--text`
- `--text-strong`
- `--chat-text`
- `--muted`
- `--muted-strong`
- `--accent-hover`
- `--accent-muted`
- `--accent-subtle`
- `--accent-glow`
- `--focus`
- `--focus-ring`
- `--focus-glow`
- `--secondary`
- `--secondary-foreground`
- `--danger`
- `--danger-muted`
- `--danger-subtle`

推导规则位于一个纯辅助函数中，以便可以独立对其进行测试。精确的颜色混合公式是实现细节，但该辅助函数必须满足两个约束：

- 保持接近导入主题意图的可读对比度
- 为相同的导入内容产生稳定的输出

### v1 中忽略的 Tokens

在第一个版本中，这些 tweakcn tokens 被有意忽略：

- `chart-*`
- `sidebar-*`
- `font-serif`
- `shadow-*`
- `tracking-*`
- `letter-spacing`
- `spacing`

这限制了范围仅限于当前控制 UI 实际需要的 tokens。

### 字体

如果存在字体堆栈字符串，则会被导入，但 OpenClaw 在 v1 中不会加载远程字体资源。如果导入的堆栈引用了浏览器中不可用的字体，则应用正常的回退行为。

## 失败行为

错误的导入必须以失败告终。

- 无效的 URL 格式：显示内联验证错误，不要获取。
- 不支持的主机或路径形状：显示内联验证错误，不获取。
- 网络故障、非 OK 响应或 JSON 格式错误：显示内联错误，保持当前存储的有效负载不变。
- 架构故障或缺少亮色/暗色块：显示内联错误，保持当前存储的有效负载不变。
- 清除操作：
  - 移除存储的自定义有效负载
  - 移除受管的自定义样式标签内容
  - 如果 `custom` 处于激活状态，则将主题系列切换回 `claw`
- 首次加载时存储的自定义有效负载无效：
  - 忽略存储的有效负载
  - 不生成自定义 CSS
  - 如果持久化的主题系列是 `custom`，则回退到 `claw`

在任何情况下，失败的导入都不应导致活动文档应用了部分自定义 CSS 变量。

## 预计在实施中发生更改的文件

主要文件：

- `ui/src/ui/theme.ts`
- `ui/src/ui/storage.ts`
- `ui/src/ui/app-settings.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/ui/views/config-quick.ts`
- `ui/src/styles/base.css`

可能的新辅助文件：

- `ui/src/ui/custom-theme.ts`

测试：

- `ui/src/ui/app-settings.test.ts`
- `ui/src/ui/storage.node.test.ts`
- `ui/src/ui/views/config.browser.test.ts`
- 针对 URL 解析和负载规范化的新专项测试

## 测试

最低实现覆盖率：

- 将分享链接 URL 解析为 tweakcn 主题 ID
- 将 `/themes/{id}` 和 `/r/themes/{id}` 规范化到获取 URL 中
- 拒绝不支持的主机和格式错误的 ID
- 验证 tweakcn 负载结构
- 将有效的 tweakcn 负载映射为规范化的 OpenClaw 亮色和暗色令牌映射
- 在浏览器本地设置中加载和保存自定义负载
- 为 `light`、`dark` 和 `system` 解析 `custom`
- 当不存在负载时禁用 `Custom` 选择
- 当 `custom` 已处于活动状态时立即应用导入的主题
- 当清除活动自定义主题时回退到 `claw`

手动验证目标：

- 从设置中导入已知的 tweakcn 主题
- 在 `light`、`dark` 和 `system` 之间切换
- 在 `custom` 和内置系列之间切换
- 重新加载页面并确认导入的自定义主题在本地保持持久化

## 发布说明

此功能特意保持小规模。如果用户后来要求支持多个导入主题、重命名、导出或跨设备同步，请将其视为后续设计。不要在此实现中预构建主题库抽象。
