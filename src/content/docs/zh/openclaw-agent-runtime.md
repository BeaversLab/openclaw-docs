---
summary: "OpenClawOpenClaw 代理运行时开发者工作流：构建、测试和实时验证"
title: "OpenClawOpenClaw 代理运行时工作流"
read_when:
  - Working on OpenClaw agent runtime code or tests
  - Running agent-runtime lint, typecheck, and live test flows
---

在 OpenClaw 中处理 OpenClaw 代理运行时的合理工作流。

## 类型检查和 Lint

- 默认本地入口：`pnpm check`
- 构建入口：当变更可能影响构建输出、打包或延迟加载/模块边界时，运行 `pnpm build`
- 代理运行时变更的完整落地入口：`pnpm check && pnpm test`

## 运行代理运行时测试

使用 Vitest 直接运行代理运行时测试集：

```bash
pnpm test \
  "src/agents/agent-*.test.ts" \
  "src/agents/embedded-agent-*.test.ts" \
  "src/agents/agent-tools*.test.ts" \
  "src/agents/agent-settings.test.ts" \
  "src/agents/agent-tool-definition-adapter*.test.ts" \
  "src/agents/agent-hooks/**/*.test.ts"
```

若要包含实时提供商演练：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/embedded-agent-runner-extraparams.live.test.ts
```

这涵盖了主要的代理运行时单元套件：

- `src/agents/agent-*.test.ts`
- `src/agents/embedded-agent-*.test.ts`
- `src/agents/agent-tools*.test.ts`
- `src/agents/agent-settings.test.ts`
- `src/agents/agent-tool-definition-adapter.test.ts`
- `src/agents/agent-hooks/*.test.ts`

## 手动测试

推荐流程：

- 在开发模式下运行网关：
  - `pnpm gateway:dev`
- 直接触发代理：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，提示执行 `read` 或 `exec` 操作，以便查看工具流和负载处理。

## 全新重置

状态存储在 OpenClaw 状态目录下。默认为 OpenClaw`~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则改用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `agents/<agentId>/agent/auth-profiles.json`APIOAuth 用于模型身份验证配置文件（API 密钥 + OAuth）
- `credentials/` 用于仍位于身份验证配置文件存储外部的提供商/渠道状态
- `agents/<agentId>/sessions/` 用于代理会话历史
- `agents/<agentId>/sessions/sessions.json` 用于会话索引
- 如果存在旧路径，则 `sessions/`
- 如果您想要一个空白的工作区，则 `workspace/`

如果您只想重置会话，请删除该代理的 `agents/<agentId>/sessions/`。如果您想保留身份验证，请保留 `agents/<agentId>/agent/auth-profiles.json` 以及 `credentials/` 下的任何提供商状态。

## 参考

- [测试](/zh/help/testing)
- [入门指南](/zh/start/getting-started)

## 相关

- [OpenClaw agent runtime architecture](/zh/agent-runtime-architecture)
