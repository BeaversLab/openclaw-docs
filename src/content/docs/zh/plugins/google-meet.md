---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入显式的 Meet URL，并默认启用 Agent 回话功能"
read_when:
  - You want an OpenClaw agent to join a Google Meet call
  - You want an OpenClaw agent to create a new Google Meet call
  - You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport
title: "Google Meet 插件"
---

OpenClaw 的 Google Meet 参与者支持——该插件在设计上是明确的：

- 它仅加入显式的 `https://meet.google.com/...` URL。
- 它可以通过 Google Meet API 创建新的 Meet 空间，然后加入
  返回的 URL。
- `agent` 是默认的回话模式：实时转录进行监听，配置的 OpenClaw Agent 进行回答，常规的 OpenClaw TTS 向 Meet 发送语音。
- `bidi` 仍可用作后备的直接实时语音模型模式。
- Agent 通过 `mode` 选择加入行为：使用 `agent` 进行实时监听/回话，使用 `bidi` 进行直接实时语音后备，或使用 `transcribe` 在没有回话桥接的情况下加入/控制浏览器。
- 身份验证开始于个人 Google OAuth 或已登录的 Chrome 配置文件。
- 没有自动同意公告。
- 默认的 Chrome 音频后端是 `BlackHole 2ch`。
- Chrome 可以在本地或在配对的节点主机上运行。
- Twilio 接受拨入号码以及可选的 PIN 或 DTMF 序列；它无法直接拨打 Meet URL。
- CLI 命令是 `googlemeet`；`meet` 预留给更广泛的 Agent 电话会议工作流。

## 快速开始

安装本地音频依赖项，并配置实时转录提供商以及常规的 OpenClaw TTS。OpenAI 是默认的转录提供商；Google Gemini Live 也可以作为单独的 `bidi` 语音后备，配合 `realtime.voiceProvider: "google"` 使用：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# only needed when realtime.voiceProvider is "google" for bidi mode
export GEMINI_API_KEY=...
```

`blackhole-2ch` 安装 `BlackHole 2ch` 虚拟音频设备。Homebrew 的安装程序需要重新启动，macOS 才会显示该设备：

```bash
sudo reboot
```

重新启动后，验证这两个部分：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

启用插件：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

检查设置：

```bash
openclaw googlemeet setup
```

设置输出旨在让 Agent 可读并感知模式。它会报告 Chrome 配置文件、节点固定，以及对于实时 Chrome 加入，还会报告 BlackHole/SoX 音频桥接和延迟的实时介绍检查。对于仅观察加入，请使用 `--mode transcribe` 检查相同的传输；该模式跳过实时音频先决条件，因为它不通过桥接进行监听或说话：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

当配置了 Twilio 委托时，setup 也会报告 `voice-call` 插件、Twilio 凭据和公共 Webhook 暴露是否准备就绪。
在请求代理加入之前，请将任何 `ok: false` 检查视为所检查传输和模式的阻碍因素。使用 `openclaw googlemeet setup --json` 获取
脚本或机器可读的输出。使用 `--transport chrome`、
`--transport chrome-node` 或 `--transport twilio` 在代理尝试之前对特定
传输进行预检。

对于 Twilio，当默认传输为 Chrome 时，请始终显式预检该传输：

```bash
openclaw googlemeet setup --transport twilio
```

这可以在代理尝试拨入会议之前，发现缺失的 `voice-call` 连接、Twilio 凭据或无法访问的
Webhook 暴露。

加入会议：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或者让代理通过 `google_meet` 工具加入：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

面向代理的 `google_meet`macOS 工具在非 macOS 主机上仍可用于
artifact、calendar、setup、transcribe、Twilio 和 `chrome-node`macOS 流程。由于捆绑的 Chrome 音频路径
当前依赖于 macOS `BlackHole 2ch`Linux，因此本地的 Chrome 回话操作在那里会被阻止。在 Linux 上，请使用 `mode: "transcribe"`macOS、
Twilio 呼入，或 macOS `chrome-node` 主机进行 Chrome 回话
参与。

创建一个新会议并加入：

```bash
openclaw googlemeet create --transport chrome-node --mode agent
```

对于 API 创建的房间，当您希望
房间的免敲门策略是显式的而不是从 Google
帐户默认值继承时，请使用 Google Meet API`SpaceConfig.accessType`：

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

`OPEN` 允许任何拥有 Meet URL 的人无需敲门即可加入。`TRUSTED` 允许
主机组织的受信任用户、受邀请的外部用户和拨入用户
无需敲门即可加入。`RESTRICTED`APIOAuth 将免敲门加入限制为仅限受邀请者。这些
设置仅适用于官方 Google Meet API 创建路径，因此 OAuth
凭据必须已配置。

如果您在此选项可用之前已对 Google Meet 进行了身份验证，请在将 `meetings.space.settings`OAuth 范围添加到您的 Google OAuth 同意屏幕后，重新运行 `openclaw googlemeet auth login --json`。

仅创建 URL 而不加入会议：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有两种路径：

- API 创建：当配置了 Google Meet OAuth 凭据时使用。这是最确定的路径，不依赖于浏览器 UI 状态。
- 浏览器回退：当缺少 OAuth 凭据时使用。OpenClaw 使用固定的 Chrome 节点，打开 OAuthOpenClaw`https://meet.google.com/new`OpenClaw，等待 Google 重定向到真实的会议代码 URL，然后返回该 URL。此路径要求节点上的 OpenClaw Chrome 配置文件已登录 Google。浏览器自动化会处理 Meet 自己的首次运行麦克风提示；该提示不被视为 Google 登录失败。加入和创建流程也会在打开新标签页之前尝试重用现有的 Meet 标签页。匹配会忽略无害的 URL 查询字符串（如 `authuser`），因此代理重试应该聚焦到已打开的会议，而不是创建第二个 Chrome 标签页。

命令/工具输出包含一个 `source` 字段（`api` 或 `browser`），以便代理可以解释使用了哪种路径。`create` 默认加入新会议并返回 `joined: true` 以及加入会话。要仅生成 URL，请在 CLI 上使用 `create --no-join`CLI 或将 `"join": false` 传递给工具。

或者告诉代理：“创建一个 Google Meet，使用代理回话模式加入，并将链接发送给我。”代理应调用 `google_meet` 并带有 `action: "create"`，然后共享返回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent"
}
```

对于仅观察/浏览器控制的加入，请设置 `"mode": "transcribe"`OpenClaw。这不会启动双向实时语音桥接，不需要 BlackHole 或 SoX，也不会在会议中回话。在此模式下，Chrome 加入还会避免 OpenClaw 的麦克风/摄像头权限授予，并避免 Meet 的 **使用麦克风** 路径。如果 Meet 显示音频选择插页，自动化会尝试无麦克风路径，否则报告需要手动操作，而不是打开本地麦克风。在转录模式下，托管的 Chrome 传输还会安装尽力而为的 Meet 字幕观察器。`googlemeet status --json` 和 `googlemeet doctor` 会显示 `captioning`、`captionsEnabledAttempted`、`transcriptLines`、`lastCaptionAt`、`lastCaptionSpeaker`、`lastCaptionText` 以及简短的 `recentTranscript` 尾部，以便操作员判断浏览器是否加入了通话以及 Meet 字幕是否正在生成文本。
当您需要是/否探测时，请使用 `openclaw googlemeet test-listen <meet-url> --transport chrome-node`：它以转录模式加入，等待新的字幕或文字记录移动，并返回 `listenVerified`、`listenTimedOut`、手动操作字段以及最新的字幕健康状况。

在实时会话期间，`google_meet` 状态包括浏览器和音频桥接运行状况，例如 `inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最后的输入/输出时间戳、字节计数器以及桥接关闭状态。如果出现安全的 Meet 页面提示，浏览器自动化会在可能的情况下处理它。登录、主机准入以及浏览器/操作系统权限提示将作为手动操作报告，并提供原因和消息供代理中继。托管的 Chrome 会话仅在浏览器运行状况报告 `inCall: true` 后才发出开场白或测试短语；否则状态报告 `speechReady: false`，并且阻止语音尝试，而不是假装代理已在会议中发言。

本地 Chrome 通过已登录的 OpenClaw 浏览器配置文件加入。实时模式需要为 OpenClaw 使用的麦克风/扬声器路径设置 OpenClaw`BlackHole 2ch`OpenClaw。为了获得清晰的双向音频，请使用独立的虚拟设备或 Loopback 风格的图表；对于初步的冒烟测试，单个 BlackHole 设备就足够了，但可能会产生回声。

### 本地 Gateway(网关) + Parallels Chrome

你**不需要**在 macOS 虚拟机中安装完整的 OpenClaw Gateway(网关) 或模型 API 密钥，仅仅是为了让虚拟机拥有 Chrome。在本地运行 Gateway(网关) 和代理，然后在虚拟机中运行节点主机。在虚拟机上启用捆绑插件一次，以便节点通告 Chrome 命令：

运行位置说明：

- Gateway(网关) 主机：OpenClaw Gateway(网关)，代理工作区，模型/API 密钥，实时提供商，以及 Google Meet 插件配置。
- Parallels macOS 虚拟机：OpenClaw CLI/节点主机，Google Chrome，SoX，BlackHole 2ch，以及一个已登录 Google 的 Chrome 配置文件。
- 虚拟机中不需要：Gateway(网关) 服务，代理配置，OpenAI/GPT 密钥，或模型提供商设置。

安装虚拟机依赖项：

```bash
brew install blackhole-2ch sox
```

安装 BlackHole 后重启虚拟机，以便 macOS 暴露 macOS`BlackHole 2ch`：

```bash
sudo reboot
```

重启后，验证虚拟机可以看到音频设备和 SoX 命令：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在虚拟机中安装或更新 OpenClaw，然后在那里启用捆绑插件：

```bash
openclaw plugins enable google-meet
```

在虚拟机中启动节点主机：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是局域网 IP 且你未使用 TLS，除非你选择加入该受信任的专用网络，否则节点将拒绝纯文本 WebSocket：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

将节点安装为 LaunchAgent 时，请使用相同的环境变量：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是进程环境变量，而不是
`openclaw.json` 设置。当安装命令中存在该变量时，`openclaw node install` 会将其存储在 LaunchAgent
环境中。

从 Gateway(网关) 主机批准节点：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

确认 Gateway(网关) 能够看到该节点，并且该节点通告了 Gateway(网关)`googlemeet.chrome`
和浏览器功能/`browser.proxy`：

```bash
openclaw nodes status
```

在 Gateway(网关) 主机上通过该节点路由 Meet：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["googlemeet.chrome", "browser.proxy"],
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          chrome: {
            guestName: "OpenClaw Agent",
            autoJoin: true,
            reuseExistingTab: true,
          },
          chromeNode: {
            node: "parallels-macos",
          },
        },
      },
    },
  },
}
```

现在从 Gateway(网关) 主机正常加入：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或者让 agent 使用带有 `transport: "chrome-node"` 的 `google_meet` 工具。

要进行一个单命令冒烟测试，该测试会创建或复用会话，说出已知
短语，并打印会话健康状态：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

在实时加入期间，OpenClaw 浏览器自动化会填写访客名称，点击
加入/请求加入，并在该提示出现时接受 Meet 首次运行时的“使用麦克风”选项。在仅观察加入或仅浏览器会议创建期间，当该选项可用时，它会
跳过相同的提示而不使用麦克风。如果浏览器配置文件未登录，Meet 正在等待主持人准入，
Chrome 需要麦克风/摄像头权限才能进行实时加入，或者 Meet 卡在
自动化无法解析的提示上，加入/测试语音结果将
报告 OpenClaw`manualActionRequired: true` 并附带 `manualActionReason` 和
`manualActionMessage`。Agent 应停止重试加入，报告该确切
消息以及当前的 `browserUrl`/`browserTitle`，并且仅在
手动浏览器操作完成后才重试。

如果省略了 `chromeNode.node`OpenClaw，OpenClaw 仅在恰好有一个
已连接节点通告了 `googlemeet.chrome` 和浏览器控制时才会自动选择。如果
连接了多个 capable 节点，请将 `chromeNode.node` 设置为节点 ID、
显示名称或远程 IP。

常见故障检查：

- `Configured Google Meet node ... is not usable: offline`Gateway(网关)：固定的节点
  已被 Gateway(网关) 识别但不可用。Agent 应将该节点视为
  诊断状态，而不是可用的 Chrome 主机，并报告设置阻塞程序
  而不是回退到其他传输，除非用户要求这样做。
- `No connected Google Meet-capable node`：在虚拟机 (VM) 中启动 `openclaw node run`，批准配对，并确保 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser`Gateway(网关) 已在虚拟机中运行。还要确认 Gateway(网关) 主机允许通过 `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]` 使用这两个 node 命令。
- `BlackHole 2ch audio device not found`：在被检查的主机上安装 `blackhole-2ch`，并在使用本地 Chrome 音频之前重新启动。
- `BlackHole 2ch audio device not found on the node`：在虚拟机中安装 `blackhole-2ch` 并重启虚拟机。
- Chrome 打开但无法加入：登录虚拟机内的浏览器配置文件，或保持 `chrome.guestName`OpenClaw 设置为访客加入。访客自动加入使用通过 node 浏览器代理的 OpenClaw 浏览器自动化；确保 node 浏览器配置指向您想要的配置文件，例如 `browser.defaultProfile: "user"` 或命名现有会话配置文件。
- 重复的 Meet 标签页：保持 `chrome.reuseExistingTab: true`OpenClaw 启用。OpenClaw 在打开新标签页之前会为相同的 Meet URL 激活现有标签页，并且浏览器会议创建会重用正在进行的 `https://meet.google.com/new` 或 Google 账户提示标签页，然后再打开另一个。
- 无音频：在 Meet 中，将麦克风/扬声器路由通过 OpenClaw 使用的虚拟音频设备路径；使用独立的虚拟设备或 Loopback 风格的路由以获得清晰的全双工音频。

## 安装说明

Chrome 对讲默认使用两个外部工具：

- `sox`：命令行音频实用程序。该插件使用显式的 CoreAudio 设备命令用于默认的 24 kHz PCM16 音频桥接。
- `blackhole-2ch`macOS：macOS 虚拟音频驱动程序。它创建 `BlackHole 2ch` 音频设备，供 Chrome/Meet 路由使用。

OpenClaw 不捆绑或重新分发这两个软件包。文档要求用户通过 Homebrew 将它们作为主机依赖项进行安装。SoX 的许可证是 OpenClaw`LGPL-2.0-only AND GPL-2.0-only`OpenClaw；BlackHole 是 GPL-3.0。如果您构建的安装程序或设备将 BlackHole 与 OpenClaw 捆绑在一起，请查阅 BlackHole 的上游许可条款，或者从 Existential Audio 获取单独的许可证。

## 传输方式

### Chrome

Chrome 传输通过 OpenClaw 浏览器控制打开 Meet URL，并以已登录的 OpenClaw 浏览器配置文件加入。在 macOS 上，插件会在启动前检查 OpenClawOpenClawmacOS`BlackHole 2ch`。如果已配置，它还会在打开 Chrome 之前运行音频网桥健康检查命令和启动命令。当 Chrome/音频位于 Gateway(网关) 主机上时，请使用 `chrome`Gateway(网关)；当 Chrome/音频 位于配对节点（如 Parallels macOS VM）上时，请使用 `chrome-node`macOS。对于本地 Chrome，请选择具有 `browser.defaultProfile` 的配置文件；`chrome.browserProfile` 会传递给 `chrome-node` 主机。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

通过本地 OpenClaw 音频网桥路由 Chrome 麦克风和扬声器音频。如果未安装 OpenClaw`BlackHole 2ch`，加入将失败并显示设置错误，而不是在没有音频路径的情况下静默加入。

### Twilio

Twilio 传输是一个委托给语音通话插件的严格拨号计划。它不会解析 Meet 页面中的电话号码。

当 Chrome 参与不可用或您需要电话拨入备份时，请使用此选项。Google Meet 必须为会议公开电话拨入号码和 PIN；OpenClaw 不会从 Meet 页面中发现这些信息。

在 Gateway(网关) 主机上而不是 Chrome 节点上启用语音通话插件：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call", "google"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // or set "twilio" if Twilio should be the default
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          inboundPolicy: "allowlist",
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "Join this Google Meet as an OpenClaw agent. Be brief.",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                silenceDurationMs: 500,
                startSensitivity: "high",
              },
            },
          },
        },
      },
      google: {
        enabled: true,
      },
    },
  },
}
```

通过环境变量或配置提供 Twilio 凭据。环境变量可以将机密信息保留在 `openclaw.json` 之外：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
export GEMINI_API_KEY=...
```

如果那是您的实时语音提供商，请改用 `realtime.provider: "openai"`OpenAI 结合 OpenAI 提供商插件和 `OPENAI_API_KEY`。

在启用 Gateway(网关)`voice-call`Gateway(网关) 后，重启或重新加载 Gateway(网关)；插件配置更改在重新加载之前不会显示在正在运行的 Gateway(网关) 进程中。

然后验证：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

当连接了 Twilio 委派时，`googlemeet setup` 包括成功的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

当会议需要自定义序列时，请使用 `--dtmf-sequence`：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和预检

创建 Meet 链接时，OAuth 是可选的，因为 OAuth`googlemeet create`OAuthAPIAPI 可以回退到浏览器自动化。当您需要官方 API 创建、空间解析或 Meet Media API 预检检查时，请配置 OAuth。

Google Meet API 访问使用用户 OAuth：创建一个 Google Cloud OAuth 客户端，请求所需的范围，授权一个 Google 账户，然后将生成的刷新令牌存储在 Google Meet 插件配置中或提供 APIOAuthOAuth`OPENCLAW_GOOGLE_MEET_*` 环境变量。

OAuth 不会取代 Chrome 加入路径。当您使用浏览器参与时，Chrome 和 Chrome-node 传输仍然通过已登录的 Chrome 配置文件、BlackHole/SoX 和连接的节点加入。OAuth 仅适用于官方 Google Meet API 路径：创建会议空间、解析空间以及运行 Meet Media API 预检检查。

### 创建 Google 凭据

在 Google Cloud 控制台中：

1. 创建或选择一个 Google Cloud 项目。
2. 为该项目启用 **Google Meet REST API**。
3. 配置 OAuth 同意屏幕。
   - 对于 Google Workspace 组织，**Internal（内部）** 是最简单的。
   - **External（外部）** 适用于个人/测试设置；当应用处于 Testing（测试）状态时，请将每个将授权该应用的 Google 账户添加为测试用户。
4. 添加 OpenClaw 请求的范围：
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.space.settings`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. 创建一个 OAuth 客户端 ID。
   - 应用类型：**Web 应用程序**。
   - 已授权的重定向 URI：

     ```text
     http://localhost:8085/oauth2callback
     ```

6. 复制客户端 ID 和客户端密钥。

Google Meet `spaces.create` 需要 `meetings.space.created`。
`meetings.space.readonly` 允许 OpenClaw 将 Meet URL/代码解析为空格。
`meetings.space.settings` 允许 OpenClaw 在 API 房间创建期间传递 `SpaceConfig` 设置（例如
`accessType`）。
`meetings.conference.media.readonly` 用于 Meet Media API 预检和媒体
工作；对于实际的 Media API 使用，Google 可能要求注册开发者预览版。
如果您只需要基于浏览器的 Chrome 加入，请完全跳过 OAuth。

### 生成刷新令牌

配置 `oauth.clientId` 并可选配置 `oauth.clientSecret`，或者将它们作为
环境变量传递，然后运行：

```bash
openclaw googlemeet auth login --json
```

该命令会打印一个带有刷新令牌的 `oauth` 配置块。它使用 PKCE、
`http://localhost:8085/oauth2callback` 上的本地主机回调，以及带有 `--manual` 的手动
复制/粘贴流程。

示例：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

当浏览器无法访问本地回调时，使用手动模式：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

JSON 输出包括：

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

将 `oauth` 对象存储在 Google Meet 插件配置下：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

当您不希望在配置中使用刷新令牌时，请优先使用环境变量。
如果同时存在配置和环境变量值，插件将首先解析配置，
然后再解析环境变量后备。

OAuth 同意范围包括 Meet 空间创建、Meet 空间读取访问权限和 Meet
会议媒体读取访问权限。如果您在支持会议创建之前
已进行身份验证，请重新运行 `openclaw googlemeet auth login --json`，以便刷新
令牌具有 `meetings.space.created` 范围。

### 使用 doctor 验证 OAuth

当您需要快速、非机密的健康检查时，请运行 OAuth doctor：

```bash
openclaw googlemeet doctor --oauth --json
```

这不会加载 Chrome 运行时或需要连接的 Chrome 节点。它检查 OAuth 配置是否存在，以及刷新令牌能否生成访问令牌。JSON 报告仅包含 `ok`、`configured`、`tokenSource`、`expiresAt` 等状态字段和检查消息；它不会打印访问令牌、刷新令牌或客户端密钥。

常见结果：

| 检查                 | 含义                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `oauth-config`       | 存在 `oauth.clientId` 加上 `oauth.refreshToken`，或缓存的访问令牌。 |
| `oauth-token`        | 缓存的访问令牌仍然有效，或者刷新令牌生成了一个新的访问令牌。        |
| `meet-spaces-get`    | 可选的 `--meeting` 检查解析了一个现有的 Meet 空间。                 |
| `meet-spaces-create` | 可选的 `--create-space` 检查创建了一个新的 Meet 空间。              |

为了证明 Google Meet API 已启用以及 `spaces.create` 范围也已配置，请运行有副作用的创建检查：

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` 会创建一个一次性的 Meet URL。当你需要确认 Google Cloud 项目已启用 Meet API，并且授权帐户拥有 `meetings.space.created` 范围时，请使用它。

要证明对现有会议空间的读取权限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` 和 `resolve-space` 证明对授权 Google 帐户可以访问的现有空间具有读取权限。这些检查中的 `403` 通常意味着 Google Meet REST API 已禁用、同意的刷新令牌缺少所需范围，或者 Google 帐户无法访问该 Meet 空间。刷新令牌错误意味着需要重新运行 `openclaw googlemeet auth login
--` and store the new `oauth` 块。

浏览器回退模式不需要 OAuth 凭据。在该模式下，Google 身份验证来自所选节点上已登录的 Chrome 配置文件，而不是来自 OpenClaw 配置。

以下环境变量被接受作为回退选项：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

通过 `spaces.get` 解析 Meet URL、代码或 `spaces/{id}`：

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

在媒体工作之前运行预检：

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

在 Meet 创建会议记录后，列出会议工件和出勤情况：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting`、`artifacts` 和 `attendance` 时，默认使用最新的会议记录。
当您需要该会议的所有保留记录时，请传递 `--all-conference-records`。

日历查找可以在读取 Meet 工件之前，从 Google 日历解析会议 URL：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 在今天的 `primary` 日历中搜索包含 Google Meet 链接的日历事件。
使用 `--event <query>` 搜索匹配的事件文本，并使用 `--calendar <id>`OAuth 搜索非主日历。
日历查找需要包含日历事件只读范围的新鲜 OAuth 登录。
`calendar-events` 预览匹配的 Meet 事件，并标记 `latest`、`artifacts`、
`attendance` 或 `export` 将选择的事件。

如果您已经知道会议记录 ID，请直接对其进行寻址：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

当您想在通话结束后关闭房间时，结束 API 创建的空间的活跃会议：

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

这会调用 Google Meet `spaces.endActiveConference` 并需要拥有 OAuth 以及该授权账户可管理空间的 `meetings.space.created` 范围。OpenClaw 接受 Meet URL、会议代码或 `spaces/{id}` 输入，并在结束活动会议之前将其解析为 API 空间资源。它与 `googlemeet leave` 是分开的：`leave` 停止 OpenClaw 的本地/会话参与，而 `end-active-conference` 则要求 Google Meet 结束该空间的活动会议。

编写一份可读的报告：

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-attendance.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

当 Google 为会议公开这些信息时，`artifacts` 会返回会议记录元数据以及参与者、录音、转录稿、结构化转录条目和智能笔记资源元数据。使用 `--no-transcript-entries` 跳过大型会议的条目查找。`attendance` 将参与者扩展为参与者会话行，其中包含首次/最后看到的时间、总会话时长、迟到/早退标志，以及按登录用户或显示名称合并的重复参与者资源。传递 `--no-merge-duplicates` 以将原始参与者资源分开保留，传递 `--late-after-minutes` 以调整迟到检测，传递 `--early-before-minutes` 以调整早退检测。

`export` 会写入一个包含 `summary.md`、`attendance.csv`、
`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的文件夹。
`manifest.json` 会记录所选输入、导出选项、会议记录、
输出文件、计数、令牌来源、使用的日历事件（如果有）以及任何
部分检索警告。传递 `--zip` 以在文件夹旁边
同时写入一个便携式归档。传递 `--include-doc-bodies` 以通过 Google Drive `files.export`OAuth 导出链接的转录和
智能笔记 Google Docs 文本；这需要一次新的 OAuth 登录，
其中包含 Drive Meet readonly 范围。如果不使用
`--include-doc-bodies`，导出仅包含 Meet 元数据和结构化转录
条目。如果 Google 返回部分制品失败，例如智能笔记
列表、转录条目或 Drive 文档正文错误，摘要和
清单将保留该警告，而不是导致整个导出失败。
使用 `--dry-run` 获取相同的制品/出席数据并打印
清单 JSON，而无需创建文件夹或 ZIP。这在写入
大型导出之前或当代理只需要计数、选定记录和
警告时非常有用。

代理还可以通过 `google_meet` 工具创建相同的捆绑包：

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

设置 `"dryRun": true` 以仅返回导出清单并跳过文件写入。

它们还可以创建具有明确访问策略的 API 支持的房间：

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

并且它们可以结束已知房间的活动会议：

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

对于“先监听后验证”，代理应在声称
会议有用之前使用 `test_listen`：

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

针对真实的保留会议运行受保护的实时冒烟测试：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

针对有人将发言且提供 Meet 字幕的会议运行实时先监听浏览器探测：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

实时冒烟测试环境：

- `OPENCLAW_LIVE_TEST=1` 启用受保护的实时测试。
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` 指向保留的 Meet URL、代码或
  `spaces/{id}`。
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`OAuth 提供 OAuth
  客户端 ID。
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN` 提供
  刷新令牌。
- 可选：`OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`、
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 和
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 使用相同的回退名称，
  但不带 `OPENCLAW_` 前缀。

基础工件/出勤实时冒烟测试需要
`https://www.googleapis.com/auth/meetings.space.readonly` 和
`https://www.googleapis.com/auth/meetings.conference.media.readonly`。日历
查找需要 `https://www.googleapis.com/auth/calendar.events.readonly`。云端硬盘
文档正文导出需要
`https://www.googleapis.com/auth/drive.meet.readonly`。

创建一个新的 Meet 空间：

```bash
openclaw googlemeet create
```

该命令会打印新的 `meeting uri`OAuthAPIOAuth、来源和加入会话。使用 OAuth
凭据时，它使用官方 Google Meet API。如果不使用 OAuth
凭据，它会回退使用已固定的 Chrome 节点的已登录浏览器配置文件。代理可以使用
`google_meet` 工具配合 `action: "create"` 一步完成创建和加入。
如果仅创建 URL，请传递 `"join": false`。

来自浏览器回退的示例 JSON 输出：

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

如果浏览器回退在创建 URL 之前遇到 Google 登录或 Meet 权限拦截器，Gateway(网关)
方法将返回失败的响应，且 Gateway(网关)`google_meet` 工具将返回结构化详细信息而不是纯字符串：

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

当代理看到 `manualActionRequired: true` 时，它应报告
`manualActionMessage` 以及浏览器节点/标签页上下文，并停止打开新的
Meet 标签页，直到操作员完成浏览器步骤。

来自 API 创建的示例 JSON 输出：

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

创建 Meet 默认会加入。Chrome 或 Chrome-node 传输仍然
需要已登录的 Google Chrome 配置文件才能通过浏览器加入。如果
配置文件已注销，OpenClaw 会报告 OpenClaw`manualActionRequired: true` 或
浏览器回退错误，并要求操作员在重试前完成 Google 登录。

仅在确认您的 Cloud 项目、OAuth 主体和会议参与者已注册 Meet 媒体 API 的 Google Workspace Developer Preview Program 后，才设置 `preview.enrollmentAcknowledged: true`OAuth。

## 配置

通用的 Chrome 代理路径只需要启用插件、BlackHole、SoX、一个实时转录提供商密钥以及配置的 OpenClaw TTS 提供商即可。OpenAI 是默认的转录提供商；将 `realtime.voiceProvider` 设置为 `"google"` 并将 `realtime.model` 设置为使用 Google Gemini Live 进行 `bidi` 模式，而无需更改默认的代理模式转录提供商：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

在 `plugins.entries.google-meet.config` 下设置插件配置：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

默认值：

- `defaultTransport: "chrome"`
- `defaultMode: "agent"` （`"realtime"` 仅作为 `"agent"` 的旧版兼容别名被接受；新的工具调用应使用 `"agent"`）
- `chromeNode.node`：用于 `chrome-node` 的可选节点 ID/名称/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`：在未登录的 Meet 来宾屏幕上使用的名称
- `chrome.autoJoin: true`：通过 OpenClaw 浏览器自动化尽力填写来宾名称并点击“立即加入”，适用于 `chrome-node`
- `chrome.reuseExistingTab: true`：激活现有的 Meet 标签页，而不是打开重复项
- `chrome.waitForInCallMs: 20000`：在触发回传介绍之前，等待 Meet 标签页报告正在通话中
- `chrome.audioFormat: "pcm16-24khz"`：命令对音频格式。仅对仍发出电话音频的旧版/自定义命令对使用 `"g711-ulaw-8khz"`。
- `chrome.audioBufferBytes: 4096`：用于生成的 Chrome 命令对音频命令的 SoX 处理缓冲区。这是 SoX 默认 8192 字节缓冲区的一半，在减少默认管道延迟的同时，为在繁忙主机上提高缓冲区大小留出了余地。低于 SoX 最小值的值将被限制为 17 字节。
- `chrome.audioInputCommand`：从 CoreAudio `BlackHole 2ch` 读取
  并以 `chrome.audioFormat` 格式写入音频的 SoX 命令
- `chrome.audioOutputCommand`：以 `chrome.audioFormat` 格式读取音频
  并写入到 CoreAudio `BlackHole 2ch` 的 SoX 命令
- `chrome.bargeInInputCommand`：可选的本地麦克风命令，用于在
  助手播放激活期间写入有符号 16 位小端单声道 PCM，以进行人工打断检测。
  这目前适用于由 Gateway(网关) 托管的
  `chrome` 命令对桥接。
- `chrome.bargeInRmsThreshold: 650`：被视为在 `chrome.bargeInInputCommand` 上
  人工打断的均方根 (RMS) 电平
- `chrome.bargeInPeakThreshold: 2500`：被视为在 `chrome.bargeInInputCommand` 上
  人工打断的峰值电平
- `chrome.bargeInCooldownMs: 900`：重复人工打断清除之间的最小延迟
- `mode: "agent"`：默认的回话模式。与会者的语音由配置的
  实时转录提供商转录，在每次会议的子代理会话中发送到配置的
  OpenClaw 代理，并通过正常的
  OpenClaw TTS 运行时回放。
- `mode: "bidi"`：回退的直接双向实时模型模式。
  实时语音提供商直接回答与会者的语音，并可以调用
  `openclaw_agent_consult` 以获取更深层次/工具支持的答案。
- `mode: "transcribe"`：仅观察模式，不包含回话桥接。
- `realtime.provider: "openai"`：当下面的作用域提供商字段未设置时使用的兼容性回退。
- `realtime.transcriptionProvider: "openai"`：由 `agent` 模式
  用于实时转录的提供商 ID。
- `realtime.voiceProvider`：由 `bidi` 模式用于直接实时
  语音的提供商 ID。将其设置为 `"google"` 以使用 Gemini Live，同时保持代理模式
  转录在 OpenAI 上。
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：简短的口语回复，
  并使用 `openclaw_agent_consult` 获取更深入的答案
- `realtime.introMessage`：实时网桥连接时的简短语音就绪检查；将其设置为 `""` 以静默加入
- `realtime.agentId`：用于 `openclaw_agent_consult` 的可选 OpenClaw 代理 ID；默认为 `main`

可选覆盖项：

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
    bargeInInputCommand: ["sox", "-q", "-t", "coreaudio", "External Microphone", "-r", "24000", "-c", "1", "-b", "16", "-e", "signed-integer", "-t", "raw", "-"],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        speakerVoice: "Kore",
      },
    },
  },
}
```

用于代理模式监听和语音的 ElevenLabs：

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          modelId: "eleven_v3",
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
        },
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

持久的 Meet 语音来自
`messages.tts.providers.elevenlabs.speakerVoiceId`。当启用 TTS 模型
覆盖时，Agent 回复也可以使用
按回复设置的 `[[tts:speakerVoiceId=... model=eleven_v3]]` 指令，但配置是会议的确定性默认值。
加入时，日志应显示 `transcriptionProvider=elevenlabs`，并且每个
口语回复都应记录 `provider=elevenlabs model=eleven_v3 speakerVoiceId=<voiceId>`。

Twilio 专用配置：

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

`voiceCall.enabled` 默认为 `true`；使用 Twilio 传输时，它会将
实际的 PSTN 呼叫、DTMF 和介绍问候语委托给 Voice Call 插件。Voice Call
在打开实时媒体流之前播放 DTMF 序列，然后使用
保存的介绍文本作为初始实时问候语。如果未
启用 `voice-call`，Google Meet 仍可验证并记录拨号计划，但无法
进行 Twilio 呼叫。

## 工具

代理可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

当 Chrome 在 Gateway(网关) 主机上运行时，请使用 `transport: "chrome"`Gateway(网关)。当 Chrome 在配对节点（如 Parallels
VM）上运行时，请使用 `transport: "chrome-node"`。在这两种情况下，模型 提供商和 `openclaw_agent_consult`Gateway(网关) 都在
Gateway(网关) 主机上运行，因此模型凭证会保留在那里。使用默认的 `mode: "agent"`OpenClawOpenClaw 时，
实时转录 提供商负责监听，配置的 OpenClaw
代理 生成答案，常规的 OpenClaw TTS 将其读入 Meet。当您希望实时语音模型 直接回答时，请
使用 `mode: "bidi"`。
原始 `mode: "realtime"` 作为 `mode: "agent"` 的遗留兼容别名仍然被接受，
但它不再在代理 工具 架构中宣传。
代理 模式日志包括桥接启动时解析的转录 提供商/模型，以及每次合成回复后的 TTS 提供商、
模型、语音、输出格式和采样率。

使用 `action: "status"` 列出活动会话 或检查会话 ID。使用
`action: "speak"` 配合 `sessionId` 和 `message` 让实时代理
立即说话。使用 `action: "test_speech"` 创建或重用会话，
触发已知短语，并在 Chrome 主机可以报告时返回 `inCall` 健康状态。`test_speech` 始终强制
`mode: "agent"`，如果被要求在
`mode: "transcribe"` 中运行则会失败，因为仅观察会话故意不能
发出语音。其 `speechOutputVerified` 结果基于在此测试调用期间实时音频输出
字节的增加，因此具有较旧音频的重用会话
不计为新的成功语音检查。使用 `action: "leave"` 标记
会话结束。

`status` 在可用时包括 Chrome 健康状态：

- `inCall`：Chrome 似乎在 Meet 通话中
- `micMuted`：尽力而为的 Meet 麦克风状态
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`: 在语音功能正常工作之前，浏览器配置文件需要手动登录、Meet 主持人准入、权限或浏览器控制修复
- `speechReady` / `speechBlockedReason` / `speechBlockedMessage`: 当前是否允许托管 Chrome 语音。`speechReady: false` 表示 OpenClaw 未将介绍/测试短语发送到音频桥。
- `providerConnected` / `realtimeReady`: 实时语音桥状态
- `lastInputAt` / `lastOutputAt`: 从桥接收或发送到桥的最后音频
- `audioOutputRouted` / `audioOutputDeviceLabel`: Meet 标签页的媒体输出是否主动路由到桥所使用的 BlackHole 设备
- `lastSuppressedInputAt` / `suppressedInputBytes`: 助手播放激活时忽略环回输入

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## 代理和双向模式

Chrome `agent` 模式针对“我的代理在会议中”的行为进行了优化。实时转录提供商会听到会议音频，最终参与者转录内容通过配置的 OpenClaw 代理进行路由，答案通过正常的 OpenClaw TTS 运行时说出。当您希望实时语音模型直接回答时，请设置 `mode: "bidi"`。
在咨询之前，附近的最终转录片段会被合并，因此一次口语回合不会产生过时且零碎的多个答案。当排队等待的助手音频仍在播放时，实时输入也会被抑制，并且在代理咨询之前会忽略最近的类似助手的转录回声，这样 BlackHole 环回就不会导致代理回答自己的语音。

| 模式    | 谁决定答案           | 语音输出路径               | 使用场景                       |
| ------- | -------------------- | -------------------------- | ------------------------------ |
| `agent` | 配置的 OpenClaw 代理 | 正常的 OpenClaw TTS 运行时 | 您想要“我的代理在会议中”的行为 |
| `bidi`  | 实时语音模型         | 实时语音提供商音频响应     | 您想要最低延迟的对话语音循环   |

在 `bidi`OpenClaw 模式下，当实时模型需要更深层的推理、当前信息或常规 OpenClaw 工具时，它可以调用 `openclaw_agent_consult`。

Consult 工具在后台运行常规 OpenClaw 代理，并使用最近的会议记录上下文返回简明的口头回答。在 OpenClaw`agent`OpenClaw 模式下，OpenClaw 将该答案直接发送到 TTS 运行时；在 `bidi` 模式下，实时语音模型可以将咨询结果说回会议中。它使用与 Voice Call 相同的共享咨询机制。

默认情况下，咨询针对 `main` 代理运行。当 Meet 通道应咨询专用的 OpenClaw 代理工作区、模型默认值、工具策略、内存和会话历史时，设置 `realtime.agentId`OpenClaw。

代理模式咨询使用每次会议的 `agent:<id>:subagent:google-meet:<session>` 会话密钥，以便后续问题在保持会议上下文的同时，从配置的代理继承常规代理策略。

`realtime.toolPolicy` 控制咨询运行：

- `safe-read-only`：暴露咨询工具并将常规代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。
- `owner`：暴露咨询工具并允许常规代理使用常规代理工具策略。
- `none`：不向实时语音模型暴露咨询工具。

咨询会话密钥的范围是每个 Meet 会话，因此在同一会议中，后续咨询调用可以重用先前的咨询上下文。

要在 Chrome 完全加入通话后强制进行口头就绪检查：

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

对于完整的加入并发言冒烟测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## 实时测试清单

在将会议移交给无人看管的代理之前，请使用此顺序：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

预期的 Chrome 节点状态：

- `googlemeet setup` 全为绿色。
- 当 Chrome 节点是默认传输或固定了节点时，`googlemeet setup` 包含 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接。
- 所选节点同时通告 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 选项卡加入通话，并且 `test-speech` 返回带有 `inCall: true` 的 Chrome 运行状况。

对于远程 Chrome 主机（如 Parallels macOS VM），这是在更新 Gateway(网关) 或 VM 后最短的安全检查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这证明了 Gateway(网关) 插件已加载，VM 节点已使用当前令牌连接，并且在代理打开真实的会议选项卡之前，Meet 音频桥可用。

对于 Twilio 冒烟测试，请使用暴露电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期的 Twilio 状态：

- `googlemeet setup` 包括绿色的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查。
- 在 CLI 重新加载后，`voicecall` 在 Gateway(网关) 中可用。
- 返回的会话包含 `transport: "twilio"` 和一个 `twilio.voiceCallId`。
- `openclaw logs --follow` 显示在实时 TwiML 之前提供的 DTMF TwiML，然后是带有初始问候语排队的实时桥接。
- `googlemeet leave <sessionId>` 挂断委托的语音通话。

## 故障排除

### 代理无法看到 Google Meet 工具

确认插件已在 Gateway(网关) 配置中启用，并重新加载 Gateway(网关)：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果您刚刚编辑了 `plugins.entries.google-meet`，请重新启动或重新加载 Gateway(网关)。正在运行的代理只能看到当前 Gateway(网关) 进程注册的插件工具。

在非 macOS Gateway(网关) 主机上，面向代理的 macOSGateway(网关)`google_meet`macOS 工具保持可见，但本地 Chrome 回传操作会在到达音频桥之前被阻止。本地 Chrome 回传音频目前依赖于 macOS `BlackHole 2ch`Linux，因此 Linux 代理应使用 `mode: "transcribe"`macOS、Twilio 拨入或 macOS `chrome-node` 主机，而不是默认的本地 Chrome 代理路径。

### 未连接支持 Google Meet 的节点

在节点主机上，运行：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway(网关) 主机上，批准节点并验证命令：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

节点必须已连接并列出 `googlemeet.chrome` 和 `browser.proxy`Gateway(网关)。Gateway(网关) 配置必须允许这些节点命令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 失败 `chrome-node-connected`Gateway(网关) 或 Gateway(网关) 日志报告 `gateway token mismatch`Gateway(网关)Gateway(网关)，请使用当前的 Gateway(网关) token 重新安装或重启节点。对于 LAN Gateway(网关)，通常意味着：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

然后重新加载节点服务并重新运行：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### 浏览器已打开但代理无法加入

运行 `googlemeet test-listen` 进行仅观察加入，或运行 `googlemeet test-speech` 进行实时加入，然后检查返回的 Chrome 运行状况。如果任一探针报告 `manualActionRequired: true`，请向操作员显示 `manualActionMessage` 并停止重试，直到浏览器操作完成。

常见的手动操作：

- 登录到 Chrome 个人资料。
- 从 Meet 主机帐户允许访客进入。
- 当 Chrome 的原生权限提示出现时，授予 Chrome 麦克风/摄像头权限。
- 关闭或修复卡住的 Meet 权限对话框。

不要仅仅因为 Meet 显示“您希望在会议中让其他人听到您的声音吗？”就报告“未登录”。那是 Meet 的音频选择插页；如果可用，OpenClaw 会通过浏览器自动化点击 **使用麦克风**，并继续等待真正的会议状态。对于仅创建浏览器的回退，OpenClaw 可能会点击 **不使用麦克风继续**，因为创建 URL 不需要实时音频路径。

### 会议创建失败

当配置了 OAuth 凭据时，`googlemeet create`API 首先使用 Google Meet API `spaces.create`OAuthOAuth 端点。如果没有 OAuth 凭据，它会回退到固定的 Chrome 节点浏览器。请确认：

- 对于 API 创建：已配置 API`oauth.clientId` 和 `oauth.refreshToken`，或者存在匹配的 `OPENCLAW_GOOGLE_MEET_*` 环境变量。
- 对于 API 创建：刷新令牌是在添加创建支持之后生成的。较旧的令牌可能缺少 API`meetings.space.created` 范围；请重新运行 `openclaw googlemeet auth login --json` 并更新插件配置。
- 对于浏览器回退：`defaultTransport: "chrome-node"` 和 `chromeNode.node` 指向具有 `browser.proxy` 和 `googlemeet.chrome` 的已连接节点。
- 对于浏览器回退：该节点上的 OpenClaw Chrome 配置文件已登录 Google 并且可以打开 OpenClaw`https://meet.google.com/new`。
- 对于浏览器回退：重试会在打开新标签页之前重用现有的 `https://meet.google.com/new` 或 Google 帐户提示标签页。如果代理超时，请重试工具调用，而不是手动打开另一个 Meet 标签页。
- 对于浏览器回退：如果工具返回 `manualActionRequired: true`，请使用返回的 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 来指导操作员。在该操作完成之前，请勿在循环中重试。
- 对于浏览器回退：如果 Meet 显示“您希望会议中其他人听到您的声音吗？”，请保持标签页打开。OpenClaw 应通过浏览器自动化点击 **使用麦克风**，或者对于仅创建回退，点击 **不使用麦克风继续**，并继续等待生成的 Meet URL。如果无法执行此操作，错误信息应提及 OpenClaw`meet-audio-choice-required`，而不是 `google-login-required`。

### Agent 加入但无法说话

检查实时路径：

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

使用 `mode: "agent"`OpenClaw 作为正常的 STT -> OpenClaw agent -> TTS 回话路径，或者使用 `mode: "bidi"` 作为直接的实时语音回退。`mode: "transcribe"` 故意不启动回话桥。对于仅观察调试，请在参与者发言后运行 `openclaw googlemeet status --json <session-id>` 并检查 `captioning`、`transcriptLines` 和 `lastCaptionText`。如果 `inCall` 为 true，但 `transcriptLines` 保持在 `0`，则 Meet 字幕可能已被禁用、自安装观察者以来无人发言、Meet UI 已更改，或者该会议的语言/帐户无法使用实时字幕。

`googlemeet test-speech` 始终检查实时路径，并报告该次调用是否观察到桥接输出字节。如果 `speechOutputVerified` 为 false 且 `speechOutputTimedOut`OpenClaw 为 true，则实时提供商可能已接受该话语，但 OpenClaw 未看到新的输出字节到达 Chrome 音频桥。

另外验证：

- Gateway 主机上有可用的实时提供商密钥，例如 Gateway(网关)`OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- `BlackHole 2ch` 在 Chrome 主机上可见。
- `sox` 存在于 Chrome 主机上。
- Meet 麦克风和扬声器通过 OpenClaw 使用的虚拟音频路径进行路由。对于本地 Chrome 实时加入，OpenClaw`doctor` 应显示 `meet output routed: yes`。

`googlemeet doctor [session-id]` 会打印会话、节点、通话中状态、手动操作原因、实时提供商连接、`realtimeReady`、音频输入/输出活动、最后音频时间戳、字节计数器以及浏览器 URL。当您需要原始 JSON 时，请使用 `googlemeet status [session-id] --json`。当您需要在不暴露令牌的情况下验证 Google Meet OAuth 刷新时，请使用 `googlemeet doctor --oauth`OAuth；当您还需要 Google Meet API 证明时，请添加 `--meeting` 或 `--create-space`API。

如果代理超时且您可以看到一个 Meet 标签页已经打开，请检查该标签页而不要打开另一个：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

等效的工具操作是 `recover_current_tab`。它会聚焦并检查所选传输的现有 Meet 标签页。对于 `chrome`Gateway(网关)，它通过 Gateway(网关) 使用本地浏览器控制；对于 `chrome-node`CLIGateway(网关)Gateway(网关)，它使用配置的 Chrome 节点。它不会打开新标签页或创建新会话；它会报告当前的阻碍因素，例如登录、准入、权限或音频选择状态。CLI 命令与配置的 Gateway(网关) 通信，因此 Gateway(网关) 必须正在运行；`chrome-node` 还要求 Chrome 节点已连接。

### Twilio 设置检查失败

当不允许或未启用 `voice-call` 时，`twilio-voice-call-plugin` 会失败。将其添加到 `plugins.allow`，启用 `plugins.entries.voice-call`Gateway(网关)，并重新加载 Gateway(网关)。

当 Twilio 后端缺少账户 SID、身份验证令牌或呼叫者号码时，`twilio-voice-call-credentials`Gateway(网关) 会失败。请在 Gateway(网关) 主机上设置这些：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

当 `voice-call` 没有公开的 webhook 暴露，或者当 `publicUrl` 指向环回或私有网络空间时，`twilio-voice-call-webhook` 会失败。将 `plugins.entries.voice-call.config.publicUrl` 设置为公开提供商 URL，或配置 `voice-call`Tailscale 隧道/Tailscale 暴露。

回环和私有 URL 对运营商回调无效。请勿将
`localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、
`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 用作 `publicUrl`。

对于稳定的公共 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

对于本地开发，请使用隧道或 Tailscale 暴露方式，而不是私有
主机 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

然后重启或重新加载 Gateway 并运行：

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 默认仅检查就绪状态。要试运行特定号码：

```bash
openclaw voicecall smoke --to "+15555550123"
```

仅当您有意发起实时外呼通知
呼叫时才添加 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 呼叫已开始但从未进入会议

确认 Meet 事件暴露了电话拨入详情。传递确切的拨入
号码和 PIN 或自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果提供商在输入 PIN 前需要暂停，
请在 `--dtmf-sequence` 中使用前导 `w` 或逗号。

如果电话呼叫已创建，但 Meet 名单从未显示拨入
参与者：

- 运行 `openclaw googlemeet doctor <session-id>` 以确认委托的 Twilio
  呼叫 ID、是否已排队 DTMF 以及是否请求了介绍问候语。
- 运行 `openclaw voicecall status --call-id <id>` 并确认呼叫
  仍然处于活动状态。
- 运行 `openclaw voicecall tail`Gateway(网关) 并检查 Twilio webhooks 是否正在到达
  Gateway。
- 运行 `openclaw logs --follow` 并查找 Twilio Meet 序列：Google
  Meet 委托加入，Voice Call 存储并提供连接前 DTMF TwiML，
  Voice Call 为 Twilio 呼叫提供实时 TwiML，然后 Google Meet 使用 `voicecall.speak` 请求
  介绍语音。
- 重新运行 `openclaw googlemeet setup --transport twilio`；绿色的设置检查是
  必需的，但不能证明会议 PIN 序列是正确的。
- 确认拨入号码属于与 PIN
  相同的 Meet 邀请和区域。
- 如果 Meet 应答缓慢或在发送预连接 DTMF 后通话记录仍显示要求输入 PIN 的提示，请从 12 秒默认值增加 `voiceCall.dtmfDelayMs`。
- 如果参与者已加入但您听不到问候语，请检查 `openclaw logs --follow` 中的 DTMF 后 `voicecall.speak` 请求以及媒体流 TTS 播放或 Twilio `<Say>` 回退。如果通话记录仍包含“输入会议 PIN”，则电话分支尚未加入 Meet 会议室，因此会议参与者将听不到语音。

如果未收到 Webhook，请先调试 Voice Call 插件：提供商必须能够访问 `plugins.entries.voice-call.config.publicUrl` 或配置的隧道。请参阅 [Voice call 故障排除](/zh/plugins/voice-call#troubleshooting)。

## 注意事项

Google Meet 的官方媒体 API 是面向接收的，因此在 Meet 通话中发言仍需要参与者路径。此插件使该边界保持可见：Chrome 处理浏览器参与和本地音频路由；Twilio 处理电话拨入参与。

Chrome 对讲模式需要 `BlackHole 2ch` 以及以下任一选项：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：OpenClaw 拥有桥接器，并以 `chrome.audioFormat` 格式在这些命令与所选提供商之间传输音频。Agent 模式使用实时转录加常规 TTS；bidi 模式使用实时语音提供商。默认 Chrome 路径为具有 `chrome.audioBufferBytes: 4096` 的 24 kHz PCM16；8 kHz G.711 mu-law 仍可用于旧版命令对。
- `chrome.audioBridgeCommand`：外部桥接命令拥有整个本地音频路径，并且必须在启动或验证其守护进程后退出。这仅对 `bidi` 有效，因为 `agent` 模式需要直接访问命令对以进行 TTS。

当代理在 agent 模式下调用 `google_meet` 工具时，会议顾问会话在应答参与者语音之前会分叉调用者的当前记录。Meet 会话仍然保持分离 (`agent:<agentId>:subagent:google-meet:<sessionId>`)，因此会议后续跟进不会直接改变调用者记录。

为了获得清晰的双向音频，请将 Meet 输出和 Meet 麦克风路由通过
独立的虚拟设备或类似 Loopback 的虚拟设备图。单个共享的
BlackHole 设备可能会将其他参会者的声音回传到通话中。

使用命令对 Chrome 桥接时，`chrome.bargeInInputCommand` 可以监听
独立的本地麦克风，并在人类开始说话时清除助手播放。
这确保即使在助手播放期间共享的 BlackHole
环回输入被暂时抑制，人类语音仍能优先于助手输出。
与 `chrome.audioInputCommand` 和 `chrome.audioOutputCommand` 一样，这是一个
由操作员配置的本地命令。使用显式的受信任命令路径或
参数列表，不要将其指向来自不受信任位置的脚本。

`googlemeet speak` 触发 Chrome 会话的
活动对讲音频桥接。`googlemeet leave` 停止该桥接。
对于通过 Voice Call 插件委托的 Twilio 会话，`leave`
还会挂断底层语音通话。
当您还想关闭由 API 管理的空间中的
活动 Google Meet 会议时，请使用 `googlemeet end-active-conference`。

## 相关

- [Voice call plugin](/zh/plugins/voice-call)
- [Talk mode](/zh/nodes/talk)
- [Building plugins](/zh/plugins/building-plugins)
