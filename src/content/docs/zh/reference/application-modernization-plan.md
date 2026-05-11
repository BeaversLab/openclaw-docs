---
summary: "包含前端交付技能更新的综合应用现代化计划"
title: "应用现代化计划"
read_when:
  - Planning a broad OpenClaw application modernization pass
  - Updating frontend implementation standards for app or Control UI work
  - Turning a broad product quality review into phased engineering work
---

# 应用现代化计划

## 目标

在不破坏当前工作流或在广泛重构中隐藏风险的情况下，将应用程序转变为更整洁、更快速、更易于维护的产品。工作应作为小的、可审查的片段落地，并为每个接触的表面提供证明。

## 原则

- 保留当前的架构，除非边界明显导致了动荡、性能成本或用户可见的错误。
- 优先选择针对每个问题的最小正确修补，然后重复。
- 将必需的修复与可选的优化分开，以便维护人员可以落地高价值的工作，而无需等待主观的决策。
- 保持面向插件的行为有记录且向后兼容。
- 在声明回归已修复之前，验证已发布的行为、依赖项契约和测试。
- 首先改善主要用户路径：新手引导、身份验证、聊天、提供商设置、插件管理和诊断。

## 第一阶段：基线审计

在更改之前盘点当前的应用程序。

- 确定主要的用户工作流以及拥有这些工作流的代码表面。
- 列出无效的功能、重复的设置、不清楚的错误状态以及昂贵的渲染路径。
- 捕获每个表面的当前验证命令。
- 将问题标记为必需、推荐或可选。
- 记录需要所有者审查的已知阻碍因素，尤其是 API、安全、发布和插件契约更改。

完成定义：

- 一份包含仓库根文件引用的问题列表。
- 每个问题都有严重性、所有者表面、预期的用户影响以及提议的验证路径。
- 没有推测性的清理项目混合在必需的修复中。

## 第二阶段：产品和 UX 清理

优先考虑可见的工作流并消除混淆。

- 改进围绕模型身份验证、网关状态和插件设置的新手引导文案和空状态。
- 在无法执行操作的情况下，移除或禁用无效的功能。
- 在响应式宽度范围内保持重要操作的可见性，而不是将它们隐藏在脆弱的布局假设后面。
- 整合重复的状态语言，以便错误有一个唯一的真实来源。
- 为高级设置添加渐进式披露，同时保持核心设置的快速性。

推荐的验证方式：

- 针对首次运行设置和现有用户启动的手动快乐路径测试。
- 针对任何路由、配置持久化或状态派生逻辑的专注测试。
- 针对已更改的响应式界面的浏览器截图。

## 阶段 3：前端架构收紧

在不进行大规模重写的情况下提高可维护性。

- 将重复的 UI 状态转换移至窄类型化辅助程序中。
- 保持数据获取、持久化和展示职责的分离。
- 优先使用现有的 hooks、stores 和组件模式，而不是引入新的抽象。
- 仅在降低耦合或明确测试时拆分过大的组件。
- 避免为本地面板交互引入广泛的全局状态。

必需的防护措施：

- 不要将更改公开行为作为文件拆分的副作用。
- 保持菜单、对话框、标签页和键盘导航的无障碍行为完好无损。
- 验证加载、空状态、错误和乐观状态是否仍然正常渲染。

## 阶段 4：性能和可靠性

针对已测量的痛点，而不是广泛的理论优化。

- 测量启动、路由切换、大列表和聊天记录的成本。
- 在分析证明有价值的地方，用记忆化选择器或缓存辅助程序替换重复的昂贵派生数据。
- 在热路径上减少不必要的网络或文件系统扫描。
- 在构建模型负载之前，保持提示词、注册表、文件、插件和网络输入的确定性排序。
- 为热辅助程序和契约边界添加轻量级回归测试。

完成定义：

- 每次性能变更都要记录基线、预期影响、实际影响和剩余差距。
- 当可以进行廉价测量时，不能仅凭直觉发布性能补丁。

## 阶段 5：类型、契约和测试加固

在用户和插件作者依赖的边界点提高正确性。

- 用可区分联合或封闭代码列表替换松散的运行时字符串。
- 使用现有的 schema 辅助程序或 zod 验证外部输入。
- 围绕插件清单、提供商目录、网关协议消息和配置迁移行为添加契约测试。
- 将兼容性路径保留在诊断或修复流程中，而不是启动时的隐藏迁移中。
- 避免仅为了测试而与插件内部实现耦合；请使用 SDK 外观和文档化的桶文件。

建议的验证：

- `pnpm check:changed`
- 为每个变更的边界设定针对性的测试。
- 当懒加载边界、打包或发布表面发生变化时，`pnpm build`。

## 阶段 6：文档与发布准备

保持面向用户的文档与行为一致。

- 使用行为、API、配置、新手引导或插件变更来更新文档。
- 仅为用户可见的变更添加更新日志条目。
- 保持插件术语面向用户；仅在贡献者需要时使用内部包名称。
- 确认发布和安装说明仍然与当前的命令行界面匹配。

完成定义：

- 相关文档在与行为变更相同的分支中更新。
- 生成的文档或 API 偏差检查在触及它们时通过。
- 交接说明中指出了任何跳过的验证及其原因。

## 建议的首个切片

从限定范围的 Control UI 和新手引导流程开始：

- 审查首次运行设置、提供商身份验证准备情况、网关状态和插件设置界面。
- 移除无效的操作并阐明失败状态。
- 为状态派生和配置持久化添加或更新针对性的测试。
- 运行 `pnpm check:changed`。

这可以在有限的架构风险下提供很高的用户价值。

## 前端技能更新

使用此部分更新现代化任务提供的侧重于前端的 `SKILL.md`。如果将此指南采用为仓库本地的 OpenClaw 技能，请先创建 `.agents/skills/openclaw-frontend/SKILL.md`，保留属于该目标技能的 frontmatter，然后使用以下内容添加或替换正文指南。

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
