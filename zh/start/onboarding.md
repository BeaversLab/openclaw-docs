---
summary: "OpenClaw 首次运行引导流程（macOS 应用）"
read_when:
  - 设计 macOS 引导助手
  - 实现认证或身份设置
title: "Onboarding"
---
# 引导（macOS 应用）

本文描述 **当前** 首次运行的引导流程。目标是
平滑的“第 0 天”体验：选择 Gateway 运行位置、连接认证、运行向导，
并让代理完成自举。

## 页面顺序（当前）

1) 欢迎 + 安全提示
2) **Gateway 选择**（本地 / 远程 / 稍后配置）
3) **认证（Anthropic OAuth）** — 仅本地
4) **设置向导**（由 Gateway 驱动）
5) **权限**（TCC 提示）
6) **CLI**（可选）
7) **引导聊天**（独立会话）
8) 完成

## 1) 本地 vs 远程

**Gateway** 运行在哪里？

- **本地（此 Mac）：** 引导可运行 OAuth 流程并在本地写入凭据。
- **远程（通过 SSH/Tailnet）：** 引导 **不会** 在本地运行 OAuth；凭据必须存在于网关主机。
- **稍后配置：** 跳过设置，让应用保持未配置状态。

Gateway 认证提示：
- 向导现在即使在 loopback 也会生成 **token**，因此本地 WS 客户端必须认证。
- 如果关闭认证，任何本地进程都能连接；仅在完全可信的机器上使用。
- 多机访问或非 loopback 绑定时使用 **token**。

## 2) 仅本地认证（Anthropic OAuth）

macOS 应用支持 Anthropic OAuth（Claude Pro/Max）。流程：

- 在浏览器打开 OAuth（PKCE）
- 提示用户粘贴 `code#state`
- 将凭据写入 `~/.openclaw/credentials/oauth.json`

其他提供商（OpenAI、自定义 API）目前通过环境变量或配置文件设置。

## 3) 设置向导（由 Gateway 驱动）

应用可运行与 CLI 相同的设置向导。这使引导与 Gateway 端行为保持一致，
避免在 SwiftUI 中重复实现逻辑。

## 4) 权限

引导会请求所需的 TCC 权限：

- 通知
- 辅助功能
- 屏幕录制
- 麦克风 / 语音识别
- 自动化（AppleScript）

## 5) CLI（可选）

应用可通过 npm/pnpm 安装全局 `openclaw` CLI，
这样终端工作流和 launchd 任务可开箱即用。

## 6) 引导聊天（独立会话）

设置完成后，应用会打开独立的引导聊天会话，让代理
自我介绍并指引下一步。这样首次引导与正常对话分离。

## 代理自举仪式

首次运行代理时，OpenClaw 会初始化工作区（默认 `~/.openclaw/workspace`）：

- 写入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`
- 运行短问答仪式（一次一个问题）
- 将身份与偏好写入 `IDENTITY.md`、`USER.md`、`SOUL.md`
- 完成后移除 `BOOTSTRAP.md`，确保只运行一次

## 可选：Gmail hooks（手动）

Gmail Pub/Sub 目前是手动步骤。使用：

```bash
openclaw webhooks gmail setup --account you@gmail.com
```

详见 [/automation/gmail-pubsub](/zh/automation/gmail-pubsub)。

## 远程模式说明

当 Gateway 运行在另一台机器上时，凭据和工作区文件
都 **在该主机上**。如果需要远程模式下的 OAuth，请在网关主机创建：

- `~/.openclaw/credentials/oauth.json`
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
