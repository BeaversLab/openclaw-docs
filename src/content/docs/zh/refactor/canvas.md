---
summary: "Canvas将 Canvas 从核心代码移至捆绑的实验性插件的计划和审计检查清单。"
read_when:
  - Moving Canvas host, tools, commands, docs, or protocol ownership
  - Auditing whether Canvas is still core-owned
  - Preparing or reviewing the experimental Canvas plugin PR
title: "CanvasCanvas 插件重构"
---

# Canvas 插件重构

Canvas 使用率低且属于实验性功能。将其视为捆绑插件，而非核心功能。核心代码可能会保留通用的网关、节点、HTTP、身份验证、配置和原生客户端管道，但 Canvas 特定的行为应位于 CanvasCanvas`extensions/canvas` 下。

## 目标

将 Canvas 所有权移至 Canvas`extensions/canvas`，同时保留当前的配对节点行为：

- 面向代理的 `canvas`Canvas 工具由 Canvas 插件注册
- Canvas 节点命令仅在 Canvas 插件注册时才被允许
- A2UI 宿主/源文件位于 Canvas 插件下
- Canvas 文档具体化位于 Canvas 插件下
- CLI 命令实现位于 Canvas 插件下，或通过插件拥有的运行时桶进行委托
- 文档和插件清单将 Canvas 描述为实验性的且由插件支持

## 非目标

- 不要在此重构中重新设计原生应用 Canvas UI。
- 除非有单独的产品决定指出应删除 Canvas，否则不要从 iOS、Android 或 macOS 中移除 Canvas 协议/客户端支持。
- 除非至少有一个其他捆绑插件需要相同的接口，否则不要仅为 Canvas 构建广泛的插件服务框架。

## 当前分支状态

已完成：

- 已在 `extensions/canvas` 中添加了捆绑插件包。
- 已添加 `extensions/canvas/openclaw.plugin.json`。
- 已将代理 `canvas` 工具从 `src/agents/tools/canvas-tool.ts` 移至 `extensions/canvas/src/tool.ts`。
- 已从 `src/agents/openclaw-tools.ts` 中移除 `createCanvasTool` 的核心注册。
- 已将 Canvas 主机实现从 Canvas`src/canvas-host` 移至 `extensions/canvas/src/host`。
- 保留 `extensions/canvas/runtime-api.ts`Canvas 作为插件拥有的兼容性层，用于测试、打包和外部公共 Canvas 辅助工具。
- 已将 Canvas 文档具体化从 Canvas`src/gateway/canvas-documents.ts` 移至 `extensions/canvas/src/documents.ts`。
- 已将 Canvas CLI 实现和 A2UI JSONL 辅助工具移至 CanvasCLI`extensions/canvas/src/cli.ts`。
- 已将 Canvas 主机 URL 和作用域功能辅助工具移至 Canvas`extensions/canvas/src`。
- 已将 Canvas 节点命令默认值从硬编码的核心列表中移出，并放入插件 Canvas`nodeInvokePolicies` 中。
- 在 Canvas`plugins.entries.canvas.config.host` 处添加了插件拥有的 Canvas 主机配置。
- 已将 Canvas 和 A2UI HTTP 服务移至 Canvas 插件 HTTP 路由注册之后。
- 为插件拥有的 HTTP 路由添加了通用插件 WebSocket 升级分发。
- 已用通用托管插件表面和节点功能辅助工具替换了特定于 Canvas 的网关主机 URL 和节点功能身份验证。
- 添加了插件拥有的托管媒体解析器，以便 Canvas 文档 URL 通过 Canvas 插件解析，而不是核心导入 Canvas 文档内部。
- 添加了 `api.registerNodeCliFeature(...)`Canvas，以便 Canvas 可以将 `openclaw nodes canvas` 声明为插件拥有的节点功能，而无需手动拼写父命令路径。
- 移除了生产环境 `src/**` 对 `extensions/canvas/runtime-api.js` 的导入。
- 已将 A2UI 捆绑包源从 `apps/shared/OpenClawKit/Tools/CanvasA2UI` 移至 `extensions/canvas/src/host/a2ui-app`。
- 已将 A2UI 构建/复制实现移至 `extensions/canvas/scripts` 下，并用通用捆绑插件资源挂钩替换了根构建连接。
- 移除了运行时旧版顶级 `canvasHost` 配置别名。
- 保留了 Canvas doctor 迁移，以便 Canvas`openclaw doctor --fix` 将旧的 `canvasHost` 配置重写为 `plugins.entries.canvas.config.host`。
- 移除了网关协议 v4 后面的旧代理 Canvas 协议兼容性。本机客户端和网关现在仅使用 Canvas`pluginSurfaceUrls.canvas` 加上 `node.pluginSurface.refresh`；在此实验性重构中，有意不支持已弃用的 `canvasHostUrl`、`canvasCapability` 和 `node.canvas.capability.refresh` 路径。
- 更新了生成的插件清单以包含 Canvas。
- 在 `docs/plugins/reference/canvas.md` 添加了插件参考文档。

已知剩余的核心拥有的 Canvas 表面：

- Canvas`apps/`Canvas 下的本机应用 Canvas 处理程序仍有意使用 Canvas 插件表面
- Canvas`apps/` 下的本机应用 Canvas 协议/客户端处理程序
- 发布的构建产物输出仍使用 `dist/canvas-host/a2ui` 进行向后兼容的运行时查找，但复制步骤现在由插件拥有

## 目标形状

`extensions/canvas` 应该拥有：

- 插件清单和包元数据
- 代理工具注册
- 节点调用命令策略
- Canvas 宿主和 A2UI 运行时
- Canvas A2UI 包源和资源构建/复制脚本
- Canvas 文档创建和资源解析
- Canvas CLI 实现
- Canvas 文档页面和插件清单条目

核心应该只拥有通用接口：

- 插件发现和注册
- 通用代理工具注册表
- 通用节点调用策略注册表
- 通用网关 HTTP/身份验证和 WebSocket 升级分发
- 通用托管插件表面 URL 解析
- 通用托管媒体解析器注册
- 通用节点能力传输
- 通用配置管道
- 通用捆绑插件资源挂钩发现

本机应用可以将 Canvas 命令处理程序保留为协议的客户端。它们不是插件运行时的所有者。

## 迁移步骤

1. 将 `plugins.entries.canvas.config.host` 视为插件拥有的配置表面。
2. 更新文档，以便将 Canvas 描述为实验性捆绑插件。
3. 运行专门的 Canvas 测试、插件清单检查、插件 SDK API 检查，以及受运行时边界影响的构建/类型检查。

## 审计检查清单

在宣布重构完成之前：

- `rg "src/canvas-host|../canvas-host"` 不返回任何实时源导入。
- `rg "canvas-tool|createCanvasTool" src` 未发现任何核心拥有的 Canvas 工具实现。
- `rg "canvas.present|canvas.snapshot|canvas.a2ui" src/gateway` 未发现通用插件策略测试之外的硬编码允许列表默认值。
- `rg "extensions/canvas/runtime-api" src --glob '!**/*.test.ts'` 为空。
- `rg "canvas-documents" src` 为空。
- `rg "registerNodesCanvasCommands|nodes-canvas" src` 为空；Canvas 插件通过嵌套插件 CLI 元数据注册 `openclaw nodes canvas`。
- `rg "createCanvasHostHandler|handleA2uiHttpRequest" src/gateway` 不返回网关运行时所有权。
- `rg "apps/shared/OpenClawKit/Tools/CanvasA2UI|canvas-a2ui-copy|extensions/canvas/src/host/a2ui" scripts .github package.json` 仅发现兼容性包装器或插件拥有的路径。
- `pnpm plugins:inventory:check` 通过。
- `pnpm plugin-sdk:api:check` 通过，或者生成的 API 基线已故意更新并经过审查。
- 有针对性的 Canvas 测试通过。
- Canvas 主机/A2UI 路径的变更通道测试通过。
- PR 正文明确指出 Canvas 是实验性的并由插件支持。

## 验证命令

在迭代时使用有针对性的本地检查：

```sh
pnpm test extensions/canvas/src/host/server.test.ts extensions/canvas/src/host/server.state-dir.test.ts extensions/canvas/src/host/file-resolver.test.ts
pnpm test src/gateway/server.plugin-node-capability-auth.test.ts src/gateway/server-import-boundary.test.ts
pnpm test extensions/canvas/src/config-migration.test.ts src/commands/doctor-legacy-config.migrations.test.ts
pnpm test test/scripts/changed-lanes.test.ts test/scripts/build-all.test.ts extensions/canvas/scripts/bundle-a2ui.test.ts test/scripts/bundled-plugin-assets.test.ts extensions/canvas/scripts/copy-a2ui.test.ts src/infra/run-node.test.ts
pnpm tsgo:extensions
pnpm plugins:inventory:check
pnpm plugin-sdk:api:check
```

如果运行时导出、惰性导入、打包或已发布的插件表面发生变化，请在推送前运行 `pnpm build`。
