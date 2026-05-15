---
summary: "包含前端交付技能更新的综合应用现代化计划"
title: "应用现代化计划"
read_when:
  - Planning a broad OpenClaw application modernization pass
  - Updating frontend implementation standards for app or Control UI work
  - Turning a broad product quality review into phased engineering work
---

## 目标

在不破坏当前工作流或将风险隐藏在大规模重构中的情况下，将应用程序推向更整洁、更快速、更易于维护的产品状态。工作应以小的、可审查的切片形式落地，并为每个接触的表面提供证明。

## 原则

- 除非有证据表明边界明显导致了混乱、性能成本或用户可见的错误，否则保留当前架构。
- 对每个问题优先使用最小的正确修补，然后重复此过程。
- 将必需的修复与可选的润色分开，以便维护人员可以交付高价值的工作，而无需等待主观决策。
- 保持面向插件的行为有文档记录且向后兼容。
- 在声明回归已修复之前，验证已交付的行为、依赖项合约和测试。
- 优先改进主要用户路径：新手引导、身份验证、聊天、提供商设置、插件管理和诊断。

## 第 1 阶段：基线审计

在更改之前清点当前应用程序。

- 确定顶级的用户工作流以及拥有它们的代码表面。
- 列出失效的功能、重复的设置、不明确的错误状态以及昂贵的渲染路径。
- 捕获每个表面的当前验证命令。
- 将问题标记为必需、建议或可选。
- 记录需要所有者审查的已知阻碍因素，尤其是 API、安全、发布和插件合约的更改。

完成定义：

- 包含仓库根文件引用的问题列表。
- 每个问题都有严重性、所属表面、预期的用户影响以及建议的验证路径。
- 没有推测性的清理项与必需的修复混合在一起。

## 第 2 阶段：产品和 UX 清理

优先处理可见的工作流并消除困惑。

- 收紧模型身份验证、网关状态和插件设置周围的新手引导文案和空状态。
- 移除或禁用无法采取任何操作的失效功能。
- 在不同响应宽度下保持重要操作可见，而不是将它们隐藏在脆弱的布局假设后面。
- 合并重复的状态语言，使错误具有单一真实来源。
- 为高级设置添加渐进式披露，同时保持核心设置快速。

建议的验证：

- 针对首次运行设置和现有用户启动的手动快乐路径测试。
- 针对任何路由、配置持久化或状态派生逻辑的专注测试。
- 更改后的响应式表面的浏览器截图。

## 第 3 阶段：前端架构收紧

在不进行广泛重写的情况下提高可维护性。

- 将重复的 UI 状态转换移至狭窄的类型化辅助工具中。
- 保持数据获取、持久化和展示职责的分离。
- 优先使用现有的 hooks、stores 和组件模式，而不是新的抽象。
- 仅在能降低耦合或理清测试时才拆分过大的组件。
- 避免为本地面板交互引入广泛的全局状态。

必要的防护措施：

- 不要将文件拆分作为副作用来改变公共行为。
- 保持菜单、对话框、选项卡和键盘导航的可访问性行为完整。
- 验证加载、空状态、错误和乐观状态是否仍能正常渲染。

## 第 4 阶段：性能与可靠性

针对已测量的痛点，而非广泛的理论优化。

- 测量启动、路由切换、大列表和聊天记录的成本。
- 在性能分析证明有价值的地方，用记忆化选择器或缓存辅助工具替换重复的昂贵派生数据。
- 减少热路径上不必要的网络或文件系统扫描。
- 在构建模型负载之前，保持提示词、注册表、文件、插件和网络输入的确定性顺序。
- 为热辅助工具和合约边界添加轻量级回归测试。

完成定义：

- 每次性能变更都记录基线、预期影响、实际影响和剩余差距。
- 当可以进行廉价测量时，不得仅凭直觉提交性能补丁。

## 第 5 阶段：类型、合约和测试强化

提高用户和插件作者所依赖的边界点的正确性。

- 用可辨识联合或封闭代码列表替换松散的运行时字符串。
- 使用现有的 schema 辅助工具或 zod 验证外部输入。
- 围绕插件清单、提供商目录、网关协议消息和配置迁移行为添加合约测试。
- 将兼容性路径保留在 doctor 或 repair 流程中，而不是启动时的隐藏迁移。
- 避免测试仅与插件内部耦合；使用 SDK 外观和文档化的 barrel 文件。

建议的验证方式：

- `pnpm check:changed`
- 针对每个变更的边界进行定向测试。
- 当懒加载边界、打包或发布表面发生变化时，`pnpm build`。

## 第 6 阶段：文档和发布准备

保持面向用户的文档与行为一致。

- 更新文档以反映行为、API、配置、新手引导或插件的变更。
- 仅针对用户可见的变更添加更新日志条目。
- 保持插件术语面向用户；仅在贡献者需要时使用内部包名称。
- 确认发布和安装说明仍然与当前的命令界面相匹配。

完成定义：

- 相关文档在与行为变更相同的分支中更新。
- 生成的文档或 API 偏差检查在变更时通过。
- 交接工作需指明所有跳过的验证及其跳过原因。

## 推荐的首个切片

从限定范围的 Control UI 和新手引导改进开始：

- 审查首次运行设置、提供商身份验证准备就绪情况、网关状态和插件设置界面。
- 移除无效操作并明确失败状态。
- 为状态派生和配置持久化添加或更新针对性测试。
- 运行 `pnpm check:changed`。

这以有限的架构风险提供高用户价值。

## 前端技能更新

使用此部分更新现代化任务提供的面向前端的 `SKILL.md`。如果将此指南作为仓库本地的 OpenClaw 技能采用，请先创建 `.agents/skills/openclaw-frontend/SKILL.md`，保留属于该目标技能的 Frontmatter，然后使用以下内容添加或替换正文指南。

```markdown
# Frontend Delivery Standards

Use this skill when implementing or reviewing user-facing React, Next.js,
desktop webview, or app UI work.

## Operating rules

- Start from the existing product workflow and code conventions.
- Prefer the smallest correct patch that improves the current user path.
- Separate required fixes from optional polish in the handoff.
- Do not build marketing pages when the request is for an application surface.
- Keep actions visible and usable across supported viewport sizes.
- Remove dead affordances instead of leaving controls that cannot act.
- Preserve loading, empty, error, success, and permission states.
- Use existing design-system components, hooks, stores, and icons before adding
  new primitives.

## Implementation checklist

1. Identify the primary user task and the component or route that owns it.
2. Read the local component patterns before editing.
3. Patch the narrowest surface that solves the issue.
4. Add responsive constraints for fixed-format controls, toolbars, grids, and
   counters so text and hover states cannot resize the layout unexpectedly.
5. Keep data loading, state derivation, and rendering responsibilities clear.
6. Add tests when logic, persistence, routing, permissions, or shared helpers
   change.
7. Verify the main happy path and the most relevant edge case.

## Visual quality gates

- Text must fit inside its container on mobile and desktop.
- Toolbars may wrap, but controls must remain reachable.
- Buttons should use familiar icons when the icon is clearer than text.
- Cards should be used for repeated items, modals, and framed tools, not for
  every page section.
- Avoid one-note color palettes and decorative backgrounds that compete with
  operational content.
- Dense product surfaces should optimize for scanning, comparison, and repeated
  use.

## Handoff format

Report:

- What changed.
- What user behavior changed.
- Required validation that passed.
- Any validation skipped and the concrete reason.
- Optional follow-up work, clearly separated from required fixes.
```
