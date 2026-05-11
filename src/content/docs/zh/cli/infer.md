---
summary: "优先使用 Infer 的 CLI，用于提供商支持的模型、图像、音频、TTS、视频、Web 和嵌入工作流"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "Inference CLI"
---

`openclaw infer` 是提供商支持推理工作流的标准无头界面。

它有意暴露功能系列，而不是原始网关 RPC 名称，也不是原始代理工具 ID。

## 将 infer 转化为技能

将其复制并粘贴到代理：

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

一个基于 infer 的良好技能应该：

- 将常见的用户意图映射到正确的 infer 子命令
- 为其涵盖的工作流包含一些标准的 infer 示例
- 在示例和建议中优先使用 `openclaw infer ...`
- 避免在技能主体中重新记录整个 infer 界面

典型的以 infer 为中心的技能覆盖范围：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 为什么使用 infer

`openclaw infer` 为 OpenClaw 内部的提供商支持推理任务提供了一个一致的 CLI。

优点：

- 使用已在 OpenClaw 中配置的提供商和模型，而不是为每个后端连接一次性封装器。
- 将模型、图像、音频转录、TTS、视频、Web 和嵌入工作流置于同一个命令树下。
- 使用稳定的 `--json` 输出形状，用于脚本、自动化和代理驱动的工作流。
- 当任务基本上是“运行推理”时，首选第一方 OpenClaw 界面。
- 对于大多数 infer 命令，使用正常的本地路径，而无需网关。

对于端到端提供商检查，在较低级别的提供商测试通过后，请优先使用 `openclaw infer ...`。它会在发出提供商请求之前，练习已发布的 CLI、配置加载、默认代理解析、捆绑插件激活、运行时依赖项修复以及共享功能运行时。

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

| 任务              | 命令                                                                   | 备注                                              |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| 运行文本/模型提示 | `openclaw infer model run --prompt "..." --json`                       | 默认使用正常的本地路径                            |
| 生成图像          | `openclaw infer image generate --prompt "..." --json`                  | 从现有文件开始时，请使用 `image edit`             |
| 描述图像文件      | `openclaw infer image describe --file ./image.png --json`              | `--model` 必须是一个支持图像的 `<provider/model>` |
| 转录音频          | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` 必须是 `<provider/model>`               |
| 合成语音          | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` 是面向网关的                         |
| 生成视频          | `openclaw infer video generate --prompt "..." --json`                  | 支持提供商提示，例如 `--resolution`               |
| 描述视频文件      | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` 必须是 `<provider/model>`               |
| 搜索网络          | `openclaw infer web search --query "..." --json`                       |                                                   |
| 获取网页          | `openclaw infer web fetch --url https://example.com --json`            |                                                   |
| 创建嵌入          | `openclaw infer embedding create --text "..." --json`                  |                                                   |

## 行为

- `openclaw infer ...` 是这些工作流的主要 CLI 界面。
- 当输出将被另一个命令或脚本使用时，请使用 `--json`。
- 当需要特定的后端时，请使用 `--provider` 或 `--model provider/model`。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用形式 `<provider/model>`。
- 对于 `image describe`，显式的 `--model` 直接运行该提供商/模型。模型必须在模型目录或提供商配置中具备图像处理能力。`codex/<model>` 运行受限的 Codex 应用服务器图像理解轮次；`openai-codex/<model>` 使用 OpenAI Codex OAuth 提供商路径。
- 无状态执行命令默认为本地。
- Gateway 管理的状态命令默认为 gateway。
- 常规本地路径不需要 gateway 正在运行。
- `model run` 是一次性的。通过该命令的代理运行时打开的 MCP 服务器在回复后（对于本地和 `--gateway` 执行）都会被关闭，因此重复的脚本调用不会保持 stdio MCP 子进程的活动状态。

## 模型

使用 `model` 进行提供商支持的文本推理以及模型/提供商检查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

说明：

- `model run` 重用代理运行时，因此提供商/模型覆盖的行为类似于正常的代理执行。
- 由于 `model run` 旨在用于无头自动化，因此它在命令完成后不会保留每个会话捆绑的 MCP 运行时。
- `model auth login`、`model auth logout` 和 `model auth status` 管理保存的提供商身份验证状态。

## 图像

使用 `image` 进行生成、编辑和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

注意事项：

- 从现有输入文件开始时，请使用 `image edit`。
- 对于支持参考图像编辑几何提示的提供商/模型，请将 `--size`、`--aspect-ratio` 或 `--resolution` 与 `image edit` 结合使用。
- 结合使用 `--output-format png --background transparent` 与 `--model openai/gpt-image-1.5` 以获取透明背景的 OpenAI PNG 输出；`--openai-background` 仍作为 OpenAI 专属的别名可用。未声明背景支持的提供商会将该提示报告为被忽略的覆盖设置。
- 使用 `image providers --json` 验证哪些捆绑的图像提供商是可发现、已配置、已选中的，以及每个提供商公开哪些生成/编辑功能。
- 使用 `image generate --model <provider/model> --json` 作为用于图像生成更改的最窄范围实时 CLI 冒烟测试。示例：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  JSON 响应报告 `ok`、`provider`、`model`、`attempts` 和写入的输出路径。当设置 `--output` 时，最终扩展名可能遵循提供商返回的 MIME 类型。

- 对于 `image describe`，`--model` 必须是具备图像功能的 `<provider/model>`。
- 对于本地 Ollama 视觉模型，请先拉取模型并将 `OLLAMA_API_KEY` 设置为任何占位符值，例如 `ollama-local`。参见 [Ollama](/zh/providers/ollama#vision-and-image-description)。

## 音频

使用 `audio` 进行文件转录。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

注意事项：

- `audio transcribe` 用于文件转录，而非实时会话管理。
- `--model` 必须是 `<provider/model>`。

## TTS

使用 `tts` 进行语音合成和 TTS 提供商状态查询。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

注意：

- `tts status` 默认为 gateway，因为它反映由网关管理的 TTS 状态。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 来检查和配置 TTS 行为。

## 视频

使用 `video` 进行生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

注意事项：

- `video generate` 接受 `--size`、`--aspect-ratio`、`--resolution`、`--duration`、`--audio`、`--watermark` 和 `--timeout-ms`，并将它们转发到视频生成运行时。
- 对于 `video describe`，`--model` 必须是 `<provider/model>`。

## Web

使用 `web` 进行搜索和获取工作流。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

注意事项：

- 使用 `web providers` 检查可用、已配置和选定的提供商。

## 嵌入

使用 `embedding` 进行向量创建和嵌入提供商检查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 输出

Infer 命令在共享的信封下规范 JSON 输出：

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
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

对于生成媒体命令，`outputs` 包含由 OpenClaw 写入的文件。请使用
该数组中的 `path`、`mimeType`、`size` 以及任何特定于媒体的维度
进行自动化操作，而不是解析人类可读的标准输出。

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

## 注意事项

- `openclaw capability ...` 是 `openclaw infer ...` 的别名。

## 相关

- [CLI 参考](/zh/cli)
- [模型](/zh/concepts/models)
