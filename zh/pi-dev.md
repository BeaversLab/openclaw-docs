---
title: "Pi 开发工作流"
---

# Pi 开发工作流程

本指南总结了在 OpenClaw 中进行 pi 集成的合理工作流程。

## 类型检查和代码检查

- 类型检查和构建： ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND  No package.json (or package.yaml, or package.json5) was found in "/home/node/.openclaw/workspace".
- 代码检查： ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND  No package.json (or package.yaml, or package.json5) was found in "/home/node/.openclaw/workspace".
- 格式检查： ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND  No package.json (or package.yaml, or package.json5) was found in "/home/node/.openclaw/workspace".
- 推送前的完整检查： ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND  No package.json (or package.yaml, or package.json5) was found in "/home/node/.openclaw/workspace".

## 运行 Pi 测试

使用专门用于 pi 集成测试集的脚本：

```bash
scripts/pi/run-tests.sh
```

要包含测试真实提供程序行为的实时测试：

```bash
scripts/pi/run-tests.sh --live
```

该脚本通过以下 glob 模式运行所有与 pi 相关的单元测试：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-extensions/*.test.ts`

## 手动测试

推荐流程：

- 在开发模式下运行 gateway：
  - `pnpm gateway:dev`
- 直接触发 agent：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，提示进行 `read` 或 `exec` 操作，以便您可以看到工具流和负载处理。

## 全重置

状态位于 OpenClaw 状态目录下。默认为 `~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则使用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `credentials/` 用于身份配置文件和令牌
- `agents/<agentId>/sessions/` 用于 agent 会话历史
- `agents/<agentId>/sessions.json` 用于会话索引
- `sessions/` 如果存在旧路径
- `workspace/` 如果你想要一个空白工作区

如果你只想重置会话，请删除该 agent 的 `agents/<agentId>/sessions/` 和 `agents/<agentId>/sessions.json`。如果你不想重新进行身份验证，请保留 `credentials/`。

## 参考

- https://docs.openclaw.ai/testing
- https://docs.openclaw.ai/start/getting-started
