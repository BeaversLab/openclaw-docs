---
title: "Pi 开发工作流"
summary: "Pi 集成的开发者工作流：构建、测试和实时验证"
read_when:
  - Working on Pi integration code or tests
  - Running Pi-specific lint, typecheck, and live test flows
---

# Pi 开发工作流

本指南总结了在 OpenClaw 中处理 pi 集成的一种合理工作流。

## 类型检查和 Lint

- 类型检查和构建：`pnpm build`
- Lint：`pnpm lint`
- 格式检查：`pnpm format`
- 推送前的完整门禁：`pnpm lint && pnpm build && pnpm test`

## 运行 Pi 测试

使用 Vitest 直接运行 Pi 专用的测试集：

```bash
pnpm test -- \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

要包含实时提供商演练：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test -- src/agents/pi-embedded-runner-extraparams.live.test.ts
```

这涵盖了主要的 Pi 单元测试套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## 手动测试

推荐流程：

- 在开发模式下运行网关：
  - `pnpm gateway:dev`
- 直接触发代理：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，提示执行 `read` 或 `exec` 操作，以便您可以看到工具流和负载处理。

## 彻底重置

状态位于 OpenClaw 状态目录下。默认为 `~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则使用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `credentials/` 用于身份验证配置文件和令牌
- `agents/<agentId>/sessions/` 用于代理会话历史
- `agents/<agentId>/sessions.json` 用于会话索引
- `sessions/` 如果存在旧路径
- `workspace/` 如果你想要一个空白的工作区

如果您只想重置会话，请删除该代理的 `agents/<agentId>/sessions/` 和 `agents/<agentId>/sessions.json`。如果您不想重新进行身份验证，请保留 `credentials/`。

## 参考

- [测试](/en/help/testing)
- [入门指南](/en/start/getting-started)
