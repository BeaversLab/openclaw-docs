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

- 默认本地门控：`pnpm check`
- 构建门控：`pnpm build`，当更改可能影响构建输出、打包或延迟加载/模块边界时使用
- 针对涉及大量 Pi 更改的完整着陆门控：`pnpm check && pnpm test`

## 运行 Pi 测试

直接使用 Vitest 运行专注于 Pi 的测试集：

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

要包含实时提供商演练：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
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

对于工具调用行为，提示 `read` 或 `exec` 操作，以便查看工具流式传输和负载处理。

## 完全重置

状态存储在 OpenClaw 状态目录下。默认为 `~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则改用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `agents/<agentId>/agent/auth-profiles.json` 用于模型身份验证配置文件（API 密钥 + OAuth）
- `credentials/` 用于仍位于身份验证配置文件存储之外的提供商/渠道状态
- `agents/<agentId>/sessions/` 用于代理会话历史
- `agents/<agentId>/sessions/sessions.json` 用于会话索引
- `sessions/` 如果存在旧路径
- `workspace/` 如果你想要一个空白的工作区

如果您只想重置会话，请删除该代理的 `agents/<agentId>/sessions/`。如果要保留身份验证，请保留 `agents/<agentId>/agent/auth-profiles.json` 和 `credentials/` 下的任何提供商状态。

## 参考

- [测试](/zh/help/testing)
- [入门指南](/zh/start/getting-started)
