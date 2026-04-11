---
summary: "面向提供商支持的模型、图像、音频、TTS、视频、Web 和嵌入工作流的优先使用 Infer 的 CLI"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "Inference CLI"
---

# Inference CLI

`openclaw infer` 是提供商支持的推理工作流的正规无头界面。

它有意公开功能系列，而不是原始网关 RPC 名称，也不是原始代理工具 ID。

## 将 infer 转化为技能

将其复制并粘贴到代理：

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

一个良好的基于 infer 的技能应该：

- 将常见的用户意图映射到正确的 infer 子命令
- 为其涵盖的工作流包含一些规范的 infer 示例
- 在示例和建议中优先使用 `openclaw infer ...`
- 避免在技能主体内重新记录整个 infer 界面

典型的以 infer 为中心的技能覆盖范围：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 为何使用 infer

`openclaw infer` 为 CLI 内部的提供商支持的推理任务提供了一个一致的 OpenClaw。

优点：

- 使用已在 OpenClaw 中配置的提供商和模型，而无需为每个后端连接一次性包装器。
- 将模型、图像、音频转录、TTS、视频、Web 和嵌入工作流置于一个命令树下。
- 为脚本、自动化和代理驱动的工作流使用稳定的 `--json` 输出形状。
- 当任务基本上是“运行推理”时，首选第一方 OpenClaw 界面。
- 对于大多数 infer 命令，使用正常的本地路径而不需要网关。

## 命令树

```text
 openclaw infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## 常见任务

下表将常见的推理任务映射到相应的 infer 命令。

| 任务              | 命令                                                                   | 备注                                |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| 运行文本/模型提示 | `openclaw infer model run --prompt "..." --json`                       | 默认使用正常的本地路径              |
| 生成图像          | `openclaw infer image generate --prompt "..." --json`                  | 从现有文件开始时使用 `image edit`   |
| 描述图像文件      | `openclaw infer image describe --file ./image.png --json`              | `--model` 必须为 `<provider/model>` |
| 转录音频          | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` 必须是 `<provider/model>` |
| 合成语音          | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` 是面向 Gateway 的      |
| 生成视频          | `openclaw infer video generate --prompt "..." --json`                  |                                     |
| 描述视频文件      | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` 必须是 `<provider/model>` |
| 搜索网络          | `openclaw infer web search --query "..." --json`                       |                                     |
| 获取网页          | `openclaw infer web fetch --url https://example.com --json`            |                                     |
| 创建嵌入          | `openclaw infer embedding create --text "..." --json`                  |                                     |

## 行为

- `openclaw infer ...` 是这些工作流的主要 CLI 界面。
- 当输出将被另一个命令或脚本使用时，请使用 `--json`。
- 当需要特定的后端时，请使用 `--provider` 或 `--model provider/model`。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用格式 `<provider/model>`。
- 无状态执行命令默认为本地。
- Gateway(网关) 管理的状态命令默认为 gateway。
- 正常的本地路径不需要 gateway 运行。

## 模型

使用 `model` 进行提供商支持的文本推理以及模型/提供商检查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.4 --json
```

注意：

- `model run` 重用代理运行时，因此提供商/模型覆盖的行为类似于正常的代理执行。
- `model auth login`、`model auth logout` 和 `model auth status` 管理已保存的提供商身份验证状态。

## 图像

使用 `image` 进行生成、编辑和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
```

注意：

- 当从现有输入文件开始时，请使用 `image edit`。
- 对于 `image describe`，`--model` 必须是 `<provider/model>`。

## 音频

使用 `audio` 进行文件转录。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

注意：

- `audio transcribe` 用于文件转录，而不是实时会话管理。
- `--model` 必须是 `<provider/model>`。

## TTS

使用 `tts` 进行语音合成和 TTS 提供商状态管理。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

注意：

- `tts status` 默认为 gateway，因为它反映了由 gateway 管理的 TTS 状态。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 来检查和配置 TTS 行为。

## 视频

使用 `video` 进行生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

注意：

- 对于 `video describe`，`--model` 必须是 `<provider/model>`。

## Web

使用 `web` 进行搜索和提取工作流。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

注意：

- 使用 `web providers` 检查可用、已配置和选定的提供商。

## 嵌入

使用 `embedding` 进行向量创建和嵌入提供商检查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 输出

Infer 命令在共享信封下规范化 JSON 输出：

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-1",
  "attempts": [],
  "outputs": []
}
```

顶层字段是稳定的：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

## 常见陷阱

```bash
# Bad
openclaw infer media image generate --prompt "friendly lobster"

# Good
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# Bad
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## 说明

- `openclaw capability ...` 是 `openclaw infer ...` 的别名。
