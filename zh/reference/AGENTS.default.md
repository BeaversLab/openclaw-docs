---
title: "AGENTS.md — OpenClaw 个人助理（默认）"
summary: "默认 OpenClaw agent 指令与个人助理技能列表"
read_when:
  - 启动新的 OpenClaw agent 会话
  - 启用或审计默认技能
---

# AGENTS.md — OpenClaw 个人助理（默认）

## 首次运行（推荐）

OpenClaw 为 agent 使用专用工作区目录。默认：`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置）。

1. 创建工作区（如不存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 将默认工作区模板复制到工作区：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可选：若需要个人助理技能列表，用本文件替换 AGENTS.md：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：通过设置 `agents.defaults.workspace` 选择不同工作区（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认

- 不要把目录或机密信息直接 dump 到聊天中。
- 未明确要求时不要执行破坏性命令。
- 不要向外部消息通道发送部分/流式回复（仅发送最终回复）。

## 会话开始（必需）

- 读取 `SOUL.md`、`USER.md`、`memory.md`，以及 `memory/` 中今天+昨天的内容。
- 在回应之前完成。

## Soul（必需）

- `SOUL.md` 定义身份、语气与边界，请保持最新。
- 如果更改了 `SOUL.md`，告知用户。
- 每个会话都是新实例；连续性保存在这些文件中。

## 共享空间（推荐）

- 你不是用户的代言人；在群聊或公开频道要谨慎。
- 不要分享隐私数据、联系方式或内部笔记。

## 记忆系统（推荐）

- 日志：`memory/YYYY-MM-DD.md`（需要时创建 `memory/`）。
- 长期记忆：`memory.md` 用于持久事实、偏好与决策。
- 会话开始时读取今天+昨天+`memory.md`（若存在）。
- 记录：决策、偏好、约束、未闭环事项。
- 除非明确要求，不记录机密信息。

## 工具与技能

- 工具在 skills 中；需要时遵循各自 `SKILL.md`。
- 将环境相关说明记录在 `TOOLS.md`（Notes for Skills）。

## 备份建议（推荐）

如果将该工作区作为 Clawd 的“记忆”，建议做成 git 仓库（最好私有），以备份 `AGENTS.md` 和记忆文件。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 能做什么

- 运行 WhatsApp gateway + Pi coding agent，使助理可读写聊天、获取上下文，并通过宿主 Mac 运行技能。
- macOS app 管理权限（屏幕录制、通知、麦克风），并通过其内置二进制暴露 `openclaw` CLI。
- 私聊默认合并到 agent 的 `main` 会话；群聊保持独立为 `agent:<agentId>:<channel>:group:<id>`（房间/频道：`agent:<agentId>:<channel>:channel:<id>`）；心跳让后台任务保持活跃。

## 核心技能（在 Settings → Skills 启用）

- **mcporter** — 管理外部技能后端的工具服务器运行时/CLI。
- **Peekaboo** — 快速 macOS 截图，可选 AI 视觉分析。
- **camsnap** — 从 RTSP/ONVIF 安防摄像头捕获帧、视频或运动告警。
- **oracle** — OpenAI-ready agent CLI，支持会话回放与浏览器控制。
- **eightctl** — 终端中控制睡眠。
- **imsg** — 发送、读取、流式 iMessage & SMS。
- **wacli** — WhatsApp CLI：同步、搜索、发送。
- **discord** — Discord 操作：反应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 作为目标（裸数字 id 不明确）。
- **gog** — Google Suite CLI：Gmail、Calendar、Drive、Contacts。
- **spotify-player** — 终端 Spotify 客户端：搜索/排队/播放控制。
- **sag** — ElevenLabs 语音，mac 风格 say 体验；默认输出到扬声器。
- **Sonos CLI** — 通过脚本控制 Sonos 音箱（发现/状态/播放/音量/分组）。
- **blucli** — 通过脚本播放、分组与自动化 BluOS 播放器。
- **OpenHue CLI** — Philips Hue 灯光控制（场景与自动化）。
- **OpenAI Whisper** — 本地语音转文本，用于快速口述与语音留言转写。
- **Gemini CLI** — 终端使用 Google Gemini 模型，快速问答。
- **bird** — X/Twitter CLI，无需浏览器即可发推、回复、读线程、搜索。
- **agent-tools** — 自动化与辅助脚本工具包。

## 使用说明

- 脚本优先使用 `openclaw` CLI；mac app 处理权限。
- 从 Skills 标签执行安装；若已存在二进制，按钮会隐藏。
- 保持心跳启用，以便助理安排提醒、监控收件箱并触发摄像头捕捉。
- Canvas UI 全屏并带原生覆盖层。避免将关键控件放在左上/右上/底部边缘；布局中加入明确边距，不要依赖安全区。
- 浏览器验证使用 `openclaw browser`（tabs/status/screenshot），配合 OpenClaw 管理的 Chrome profile。
- DOM 检查使用 `openclaw browser eval|query|dom|snapshot`（需要机器输出时加 `--json`/`--out`）。
- 交互使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（click/type 需要 snapshot refs；CSS 选择器用 `evaluate`）。
