---
summary: "CLIInfer-first CLI for 提供商-backed 模型, image, audio, TTS, video, web, and embedding workflows"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLIInference CLI"
---

`openclaw infer` 是提供商支持的推理工作流的标准无头界面。

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
- 在示例和建议中首选 `openclaw infer ...`
- 避免在技能主体中重新记录整个 infer 界面

典型的以 infer 为中心的技能覆盖范围：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 为什么使用 infer

`openclaw infer`CLIOpenClaw 为 OpenClaw 内部的提供商支持的推理任务提供了一个统一的 CLI。

优点：

- 使用已在 OpenClaw 中配置的提供商和模型，而不是为每个后端连接一次性封装器。
- 将模型、图像、音频转录、TTS、视频、Web 和嵌入工作流置于同一个命令树下。
- 为脚本、自动化和代理驱动的工作流使用稳定的 `--json` 输出形状。
- 当任务基本上是“运行推理”时，首选第一方 OpenClaw 界面。
- 对于大多数 infer 命令，使用正常的本地路径，而无需网关。

对于端到端的提供商检查，在较低级别的提供商测试通过后，首选 `openclaw infer ...`CLI。它会在发出提供商请求之前，演练已发布的 CLI、配置加载、默认代理解析、捆绑插件激活以及共享功能运行时。

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

| 任务               | 命令                                                                                          | 备注                                              |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 运行文本/模型提示  | `openclaw infer model run --prompt "..." --json`                                              | 默认使用正常的本地路径                            |
| 对图像运行模型提示 | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | 对多个图像输入重复 `--file`                       |
| 生成图像           | `openclaw infer image generate --prompt "..." --json`                                         | 从现有文件开始时使用 `image edit`                 |
| 描述图像文件       | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` 必须是具备图像功能的 `<provider/model>` |
| 转录音频           | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` 必须是 `<provider/model>`               |
| 合成语音           | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` 是面向网关的                         |
| 生成视频           | `openclaw infer video generate --prompt "..." --json`                                         | 支持提供商提示，例如 `--resolution`               |
| 描述视频文件       | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` 必须是 `<provider/model>`               |
| 搜索网络           | `openclaw infer web search --query "..." --json`                                              |                                                   |
| 获取网页           | `openclaw infer web fetch --url https://example.com --json`                                   |                                                   |
| 创建嵌入           | `openclaw infer embedding create --text "..." --json`                                         |                                                   |

## 行为

- `openclaw infer ...`CLI 是这些工作流的主要 CLI 界面。
- 当输出将被另一个命令或脚本使用时，请使用 `--json`。
- 当需要特定的后端时，请使用 `--provider` 或 `--model provider/model`。
- 使用 `model run --thinking <level>` 传递一次性思考/推理级别（`off`、`minimal`、`low`、`medium`、`high`、`adaptive`、`xhigh` 或 `max`），同时保持运行为原始模式。
- 对于 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必须使用 `<provider/model>` 形式。
- 对于 `image describe`，显式的 `--model` 会直接运行该提供商/模型。模型必须在模型目录或提供商配置中具备图像处理能力。`codex/<model>` 运行受限的 Codex 应用服务器图像理解轮次；`openai-codex/<model>`OpenAIOAuth 使用 OpenAI Codex OAuth 提供商路径。
- 无状态执行命令默认为本地。
- Gateway(网关) 管理的状态命令默认为 gateway。
- 常规本地路径不需要 gateway 正在运行。
- 本地 `model run` 是一个轻量级的一次性提供商补全。它会解析配置的代理模型和身份验证，但不会启动聊天代理轮次、加载工具或打开捆绑的 MCP 服务器。
- `model run --file` 接受图像文件，检测其 MIME 类型，并将它们与提供的提示一起发送到选定的模型。对于多个图像，请重复 `--file`。
- `model run --file` 拒绝非图像输入。对于音频文件请使用 `infer audio transcribe`，对于视频文件请使用 `infer video describe`。
- `model run --gateway` 测试 Gateway(网关) 路由、保存的身份验证、提供商选择和嵌入式运行时，但仍作为原始模型探针运行：它发送提供的提示和任何图像附件，没有先前的会话记录、bootstrap/AGENTS 上下文、上下文引擎组装、工具或捆绑的 MCP 服务器。
- `model run --gateway --model <provider/model>` 需要受信任的操作员网关凭证，因为该请求要求 Gateway(网关) 运行一次性提供商/模型覆盖。
- 本地 `model run --thinking` 使用精简的提供商完成路径；提供商特定的级别（如 `adaptive` 和 `max`）被映射到最接近的可移植简单完成级别。

## 模型

使用 `model` 进行提供商支持的文本推理以及模型/提供商检查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

使用完整的 `<provider/model>` 引用来对特定提供商进行冒烟测试，而无需
启动 Gateway(网关) 或加载完整的代理工具表面：

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-4.1 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

注意：

- 本地 `model run` 是用于提供商/模型/身份验证健康状况的最狭窄的 CLI 冒烟测试，因为对于非 Codex 提供商，它仅将提供的提示发送给选定的模型。
- 本地 `model run --model <provider/model>` 可以在该提供商写入配置之前，使用来自 `models list --all` 的确切捆绑静态目录行。仍然需要提供商身份验证；缺少凭证将作为身份验证错误失败，而不是 `Unknown model`。
- 对于 Mistral Medium 3.5 推理探针，请保持温度未设置/默认。Mistral 拒绝 `reasoning_effort="high"` 加 `temperature: 0`；请使用具有默认温度或非零推理模式值（例如 `0.7`）的 `mistral/mistral-medium-3-5`。
- `openai-codex/*` 本地探针是狭义的例外：OpenClaw 添加了一条最小的系统指令，以便 Codex 响应传输可以填充其所需的 `instructions` 字段，而无需添加完整的代理上下文、工具、内存或会话记录。
- 本地 `model run --file` 保持了精简的路径，并将图像内容直接附加到单条用户消息中。常见的图像文件（如 PNG、JPEG 和 WebP）在其 MIME 类型被检测为 `image/*` 时可以正常工作；不支持或无法识别的文件会在调用提供商之前失败。
- 当您想要直接测试所选的多模态文本模型时，`model run --file` 是最佳选择。当您需要 OpenClaw 的图像理解提供商选择和默认图像模型路由时，请使用 `infer image describe`。
- 所选模型必须支持图像输入；仅文本模型可能会在提供商层拒绝该请求。
- `model run --prompt` 必须包含非空白文本；空提示词会在调用本地提供商或 Gateway(网关) 之前被拒绝。
- 当提供商未返回文本输出时，本地 `model run` 会以非零状态退出，因此无法访问的本地提供商和空的补全看起来不会像成功的探测。
- 当您需要测试 Gateway(网关) 路由、agent-runtime 设置或 Gateway(网关) 管理的提供商状态，同时保持模型输入原始时，请使用 `model run --gateway`。当您需要完整的 agent 上下文、工具、内存和会话记录时，请使用 `openclaw agent` 或聊天界面。
- `model auth login`、`model auth logout` 和 `model auth status` 管理已保存的提供商身份验证状态。

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
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

说明：

- 当从现有输入文件开始时，请使用 `image edit`。
- 对于支持参考图像编辑几何提示的提供商/模型，请将 `--size`、`--aspect-ratio` 或 `--resolution` 与 `image edit` 结合使用。
- 将 `--output-format png --background transparent` 与
  `--model openai/gpt-image-1.5` 结合使用，以获得透明背景的 OpenAI PNG 输出；
  `--openai-background` 仍可用作 OpenAI 特定的别名。未声明支持背景的提供商会将该提示报告为被忽略的覆盖设置。
- 使用 `image providers --json` 验证哪些捆绑的图像提供商是可发现、已配置、已选中的，以及每个提供商公开了哪些生成/编辑功能。
- 使用 `image generate --model <provider/model> --json` 作为针对图像生成更改的最小范围的实时 CLI 冒烟测试。示例：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  JSON 响应报告 `ok`、`provider`、`model`、`attempts` 和写入的输出路径。当设置 `--output` 时，最终扩展名可能会遵循提供商返回的 MIME 类型。

- 对于 `image describe` 和 `image describe-many`，请使用 `--prompt` 向视觉模型给出特定任务的指令，例如 OCR、比较、UI 检查或简明字幕生成。
- 将 `--timeout-ms` 与缓慢的本地视觉模型或冷启动 Ollama 结合使用。
- 对于 `image describe`，`--model` 必须是具备图像处理能力的 `<provider/model>`。
- 对于本地 Ollama 视觉模型，请先拉取模型并将 `OLLAMA_API_KEY` 设置为任意占位符值，例如 `ollama-local`。参见 [Ollama](/zh/providers/ollama#vision-and-image-description)。

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

使用 `tts` 进行语音合成和 TTS 提供商状态管理。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

注意事项：

- `tts status` 默认为 gateway，因为它反映了 gateway 管理的 TTS 状态。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 检查和配置 TTS 行为。

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
- 对于 `video describe`，`--model` 必须为 `<provider/model>`。

## Web

将 `web` 用于搜索和获取工作流。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

备注：

- 使用 `web providers` 检查可用、已配置和已选定的提供商。

## Embedding

使用 `embedding` 进行向量创建和嵌入提供商检查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 输出

Infer 命令在共享信封下标准化 JSON 输出：

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

顶级字段是稳定的：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

对于生成的媒体命令，`outputs` 包含由 OpenClaw 编写的文件。使用该数组中的 `path`、`mimeType`、`size` 以及任何特定于媒体的维度进行自动化，而不是解析可读的标准输出。

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

## 备注

- `openclaw capability ...` 是 `openclaw infer ...` 的别名。

## 相关

- [CLI 参考](/zh/cli)
- [模型](/zh/concepts/models)
