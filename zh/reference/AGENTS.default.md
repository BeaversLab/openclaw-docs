---
title: "Default AGENTS.md"
summary: "Default OpenClaw agent instructions and skills roster for the personal assistant setup"
read_when:
  - Starting a new OpenClaw agent 会话
  - Enabling or auditing default skills
---

# AGENTS.md - OpenClaw Personal Assistant (default)

## First run (recommended)

OpenClaw uses a dedicated workspace directory for the agent. Default: `~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

1. Create the workspace (if it doesn’t already exist):

```bash
mkdir -p ~/.openclaw/workspace
```

2. Copy the default workspace templates into the workspace:

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. Optional: if you want the personal assistant skill roster, replace AGENTS.md with this file:

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Optional: choose a different workspace by setting `agents.defaults.workspace` (supports `~`):

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Safety defaults

- Don’t dump directories or secrets into chat.
- Don’t run destructive commands unless explicitly asked.
- Don’t send partial/streaming replies to external messaging surfaces (only final replies).

## Session start (required)

- Read `SOUL.md`, `USER.md`, and today+yesterday in `memory/`.
- Read `MEMORY.md` when present; only fall back to lowercase `memory.md` when `MEMORY.md` is absent.
- Do it before responding.

## Soul (required)

- `SOUL.md` defines identity, tone, and boundaries. Keep it current.
- If you change `SOUL.md`, tell the user.
- You are a fresh instance each 会话; continuity lives in these files.

## Shared spaces (recommended)

- You’re not the user’s voice; be careful in group chats or public channels.
- Don’t share private data, contact info, or internal notes.

## Memory system (recommended)

- Daily log: `memory/YYYY-MM-DD.md` (create `memory/` if needed).
- Long-term memory: `MEMORY.md` for durable facts, preferences, and decisions.
- Lowercase `memory.md` is legacy fallback only; do not keep both root files on purpose.
- On 会话 start, read today + yesterday + `MEMORY.md` when present, otherwise `memory.md`.
- 捕捉：决策、偏好、约束、未完成的循环。
- 除非明确要求，否则避免涉及机密信息。

## 工具与 Skills

- 工具位于 Skills 中；需要时请遵循每个 Skill 的 `SKILL.md`。
- 将特定于环境的笔记保存在 `TOOLS.md`（Skills 笔记）中。

## 备份提示（推荐）

如果您将此工作空间视为 Clawd 的“记忆”，请将其设为 git 仓库（最好是私有的），以便 `AGENTS.md` 和您的记忆文件都能得到备份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 的功能

- 运行 WhatsApp 网关和 Pi 编码代理，以便助手可以通过主机 Mac 读/写聊天记录、获取上下文并运行 Skills。
- macOS 应用管理权限（屏幕录制、通知、麦克风），并通过其捆绑的二进制文件暴露 `openclaw` CLI。
- 直接聊天默认会合并到代理的 `main` 会话中；群组保持为独立的 `agent:<agentId>:<channel>:group:<id>`（房间/频道：`agent:<agentId>:<channel>:channel:<id>`）；心跳信号保持后台任务存活。

## 核心 Skills（在 Settings → Skills 中启用）

- **mcporter** — 用于管理外部 Skill 后端的工具服务器运行时/CLI。
- **Peekaboo** — 快速的 macOS 截图，具有可选的 AI 视觉分析功能。
- **camsnap** — 从 RTSP/ONVIF 安防摄像头捕获帧、片段或动作警报。
- **oracle** — 具有会话回放和浏览器控制功能的 OpenAI 就绪代理 CLI。
- **eightctl** — 从终端控制您的睡眠。
- **imsg** — 发送、读取、流式传输 iMessage 和 SMS。
- **wacli** — WhatsApp CLI：同步、搜索、发送。
- **discord** — Discord 操作：做出反应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 目标（纯数字 ID 有歧义）。
- **gog** — Google Suite CLI：Gmail、日历、云端硬盘、联系人。
- **spotify-player** — 终端 Spotify 客户端，用于搜索/排队/控制播放。
- **sag** — ElevenLabs 语音，具有 Mac 风格的 say UX；默认流式传输到扬声器。
- **Sonos CLI** — 从脚本控制 Sonos 扬声器（发现/状态/播放/音量/分组）。
- **blucli** — 从脚本播放、分组和自动化 BluOS 播放器。
- **OpenHue CLI** — 用于场景和自动化的 Philips Hue 灯光控制。
- **OpenAI Whisper** — 用于快速听写和语音邮件转录的本地语音转文本。
- **Gemini CLI** — 用于快速问答的终端 Google Gemini 模型。
- **agent-tools** — 用于自动化和辅助脚本的实用工具包。

## 使用说明

- 脚本编写建议使用 `openclaw` CLI；Mac 应用程序处理权限。
- 从 Skills 选项卡运行安装；如果二进制文件已存在，它会隐藏按钮。
- 保持心跳启用，以便助手可以安排提醒、监视收件箱并触发相机捕获。
- Canvas UI 全屏运行并带有原生覆盖层。避免将关键控件放置在左上角/右上角/底部边缘；在布局中添加明确的装订线，并且不要依赖安全区域插入。
- 对于浏览器驱动的验证，请使用 `openclaw browser`（标签页/状态/屏幕截图）以及 OpenClaw 管理的 Chrome 配置文件。
- 对于 DOM 检查，请使用 `openclaw browser eval|query|dom|snapshot`（当需要机器输出时，请使用 `--json`/`--out`）。
- 对于交互，请使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（点击/输入需要快照引用；对于 CSS 选择器，请使用 `evaluate`）。

import zh from "/components/footer/zh.mdx";

<zh />
