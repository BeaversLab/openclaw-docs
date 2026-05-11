---
summary: "Google Meet 插件：通过 Chrome 或 Twilio 加入指定的 Meet URL，默认使用实时语音"
read_when:
  - You want an OpenClaw agent to join a Google Meet call
  - You want an OpenClaw agent to create a new Google Meet call
  - You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport
title: "Google Meet 插件"
---

OpenClaw 的 Google Meet 参与者支持——该插件在设计上是明确的：

- 它仅加入指定的 `https://meet.google.com/...` URL。
- 它可以通过 Google Meet API 创建新的 Meet 空间，然后加入
  返回的 URL。
- `realtime` 语音是默认模式。
- 当需要更深入的推理或工具时，实时语音可以回调完整的
  OpenClaw 代理。
- 代理使用 `mode` 选择加入行为：使用 `realtime` 进行实时
  收听/回话，或使用 `transcribe` 在没有实时语音桥接的情况下
  加入/控制浏览器。
- 身份验证开始于个人 Google OAuth 或已登录的 Chrome 配置文件。
- 没有自动同意公告。
- 默认的 Chrome 音频后端是 `BlackHole 2ch`。
- Chrome 可以在本地或在配对的节点主机上运行。
- Twilio 接受拨入号码以及可选的 PIN 或 DTMF 序列。
- CLI 命令是 `googlemeet`；`meet` 已保留用于更广泛的
  代理电话会议工作流程。

## 快速开始

安装本地音频依赖项并配置后端实时语音
提供商。OpenAI 是默认的；Google Gemini Live 也适用于
`realtime.provider: "google"`：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

`blackhole-2ch` 安装 `BlackHole 2ch` 虚拟音频设备。Homebrew 的
安装程序需要重新启动，macOS 才会显示该设备：

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

设置输出旨在供 Agent 读取。它报告 Chrome 配置文件、
音频桥、节点固定、延迟的实时介绍，以及当配置了 Twilio 委托时，
`voice-call` 插件和 Twilio 凭据是否就绪。
在请求 Agent 加入之前，请将任何 `ok: false` 检查视为阻碍因素。
使用 `openclaw googlemeet setup --json` 获取脚本或机器可读的输出。
使用 `--transport chrome`、`--transport chrome-node` 或 `--transport twilio`
在 Agent 尝试之前对特定传输进行预检查。

加入会议：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或者让 Agent 通过 `google_meet` 工具加入：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

创建一个新会议并加入：

```bash
openclaw googlemeet create --transport chrome-node --mode realtime
```

仅创建 URL 而不加入：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有两种路径：

- API 创建：当配置了 Google Meet OAuth 凭据时使用。这是
  最确定的路径，不依赖于浏览器 UI 状态。
- 浏览器回退：当 OAuth 凭据缺失时使用。OpenClaw 使用
  固定的 Chrome 节点，打开 `https://meet.google.com/new`，等待 Google
  重定向到真实的会议代码 URL，然后返回该 URL。 此路径要求
  节点上的 OpenClaw Chrome 配置文件必须已登录 Google。
  浏览器自动化会处理 Meet 自己的首次运行麦克风提示；该提示
  不会被视为 Google 登录失败。
  加入和创建流程还会尝试在打开新标签页之前重用现有的 Meet 标签页。匹配会忽略
  无害的 URL 查询字符串，例如 `authuser`，因此
  Agent 重试应该聚焦到已打开的会议，而不是创建第二个
  Chrome 标签页。

命令/工具输出包含一个 `source` 字段（`api` 或 `browser`），以便 Agent
可以解释使用了哪种路径。 `create` 默认加入新会议并
返回 `joined: true` 以及加入会话。要仅生成 URL，请在 CLI 上
使用 `create --no-join` 或将 `"join": false` 传递给工具。

或者指示代理：“创建一个 Google Meet，使用实时语音加入，并将链接发送给我。”代理应该使用 `action: "create"` 调用 `google_meet`，然后分享返回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

对于仅观察/浏览器控制的加入，请设置 `"mode": "transcribe"`。这不会启动双工实时模型桥接，因此它不会在会议中回话。

在实时会话期间，`google_meet` 状态包括浏览器和音频桥接运行状况，例如 `inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最后的输入/输出时间戳、字节计数器和桥接关闭状态。如果出现安全的 Meet 页面提示，浏览器自动化会在可能的情况下处理它。登录、主机准入和浏览器/操作系统权限提示会被报告为需要手动操作，并提供原因和消息供代理传达。

本地 Chrome 通过已登录的 OpenClaw 浏览器配置文件加入。在 Meet 中，为 OpenClaw 使用的麦克风/扬声器路径选择 `BlackHole 2ch`。为了获得清晰的双工音频，请使用独立的虚拟设备或 Loopback 风格的图表；单个 BlackHole 设备足以进行初步冒烟测试，但可能会产生回声。

### 本地 Gateway(网关) + Parallels Chrome

仅仅为了让 VM 拥有 Chrome，您**不**需要在 OpenClaw VM 中安装完整的 Gateway(网关) API 或模型 macOS 密钥。在本地运行 Gateway(网关) 和代理，然后在 VM 中运行节点主机。在 VM 上启用捆绑插件一次，以便节点通告 Chrome 命令：

在哪里运行什么：

- Gateway(网关) 主机：OpenClaw Gateway(网关)、代理工作区、模型/API 密钥、实时提供商以及 Google Meet 插件配置。
- Parallels macOS VM：OpenClaw CLI/节点主机、Google Chrome、SoX、BlackHole 2ch 以及一个已登录 Google 的 Chrome 配置文件。
- VM 中不需要：Gateway(网关) 服务、代理配置、OpenAI/GPT 密钥或模型提供商设置。

安装 VM 依赖项：

```bash
brew install blackhole-2ch sox
```

安装 BlackHole 后重启 VM，以便 macOS 暴露 `BlackHole 2ch`：

```bash
sudo reboot
```

重启后，验证 VM 可以看到音频设备和 SoX 命令：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在 VM 中安装或更新 OpenClaw，然后在那里启用捆绑插件：

```bash
openclaw plugins enable google-meet
```

在 VM 中启动节点主机：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是局域网 IP 且您未使用 TLS，则该节点会拒绝
纯文本 WebSocket，除非您选择加入该受信任的专用网络：

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

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是进程环境，而不是
`openclaw.json` 设置。当安装命令中存在该变量时，
`openclaw node install` 会将其存储在 LaunchAgent
环境中。

从 Gateway(网关) 主机批准该节点：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

确认 Gateway(网关) 能看到该节点，并且该节点同时通告了 `googlemeet.chrome`
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

或者让代理使用带有 `transport: "chrome-node"` 的 `google_meet` 工具。

如需进行单命令冒烟测试，该测试会创建或重用会话、说出已知
短语并打印会话运行状况：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

加入期间，OpenClaw 浏览器自动化会填写访客名称，点击加入/请求
加入，并在出现该提示时接受 Meet 首次运行的“使用麦克风”选项。在仅浏览器的会议创建期间，如果 Meet 不
显示使用麦克风按钮，它也可以在没有麦克风的情况下继续通过同一提示。如果浏览器配置文件未登录，
Meet 正在等待主机准入，Chrome 需要麦克风/摄像头权限，或者 Meet 停留在自动化无法解决的提示上，
加入/测试语音结果将报告 `manualActionRequired: true` 并附带 `manualActionReason` 和
`manualActionMessage`。代理应停止重试加入，报告确切的
消息加上当前的 `browserUrl`/`browserTitle`，并仅在完成
手动浏览器操作后重试。

如果省略 `chromeNode.node`，OpenClaw 仅在恰好有一个
已连接的节点同时通告 `googlemeet.chrome` 和浏览器控制时才会自动选择。如果
连接了多个有能力的节点，请将 `chromeNode.node` 设置为节点 ID、
显示名称或远程 IP。

常见故障检查：

- `Configured Google Meet node ... is not usable: offline`：固定的节点对于Gateway(网关)是已知的，但不可用。Agent 应将该节点视为诊断状态，而不是可用的 Chrome 主机，并报告设置障碍程序，而不是回退到另一个传输，除非用户要求这样做。
- `No connected Google Meet-capable node`：在虚拟机中启动 `openclaw node run`，批准配对，并确保 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser` 已在虚拟机中运行。还要确认 Gateway(网关) 主机允许使用 `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]` 执行这两个节点命令。
- `BlackHole 2ch audio device not found`：在受检查的主机上安装 `blackhole-2ch` 并在使用本地 Chrome 音频之前重新启动。
- `BlackHole 2ch audio device not found on the node`：在虚拟机中安装 `blackhole-2ch` 并重新启动虚拟机。
- Chrome 打开但无法加入：登录虚拟机内的浏览器配置文件，或保持 `chrome.guestName` 设置以进行访客加入。访客自动加入通过节点浏览器代理使用 OpenClaw 浏览器自动化；确保节点浏览器配置指向您想要的配置文件，例如 `browser.defaultProfile: "user"` 或命名的现有会话配置文件。
- 重复的 Meet 标签页：保持 `chrome.reuseExistingTab: true` 启用。OpenClaw 在打开新标签页之前会为相同的 Meet URL 激活现有标签页，并且浏览器会议创建会在打开另一个标签页之前重用进行中的 `https://meet.google.com/new` 或 Google 帐户提示标签页。
- 没有音频：在 Meet 中，通过 OpenClaw 使用的虚拟音频设备路径路由麦克风/扬声器；使用独立的虚拟设备或 Loopback 风格的路由以获得清晰的全双工音频。

## 安装说明

Chrome 实时默认设置使用两个外部工具：

- `sox`：命令行音频实用程序。该插件使用显式的 CoreAudio 设备命令用于默认的 24 kHz PCM16 音频桥。
- `blackhole-2ch`：macOS 虚拟音频驱动程序。它创建 `BlackHole 2ch` 音频设备，Chrome/Meet 可以通过该设备路由音频。

OpenClaw 不打包也不重新分发这两个软件包。文档要求用户通过 Homebrew 将它们作为主机依赖项进行安装。SoX 的许可证为 `LGPL-2.0-only AND GPL-2.0-only`；BlackHole 为 GPL-3.0。如果您构建的安装程序或设备将 BlackHole 与 OpenClaw 捆绑在一起，请查看 BlackHole 的上游许可条款或从 Existential Audio 获取单独的许可证。

## 传输方式

### Chrome

Chrome 传输通过 OpenClaw 浏览器控制打开 Meet URL，并以已登录的 OpenClaw 浏览器配置文件身份加入。在 macOS 上，该插件会在启动前检查 `BlackHole 2ch`。如果已配置，它还会在打开 Chrome 之前运行音频桥接健康检查命令和启动命令。当 Chrome/音频位于 Gateway(网关) 主机上时，请使用 `chrome`；当 Chrome/音频 位于配对节点（如 Parallels macOS VM）上时，请使用 `chrome-node`。对于本地 Chrome，请选择带有 `browser.defaultProfile` 的配置文件；`chrome.browserProfile` 会传递给 `chrome-node` 主机。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

通过本地 OpenClaw 音频桥接路由 Chrome 麦克风和扬声器音频。如果未安装 `BlackHole 2ch`，加入将会失败并显示设置错误，而不是在没有音频路径的情况下静默加入。

### Twilio

Twilio 传输是一个严格的拨号计划，委托给 Voice Call 插件。它不会在 Meet 页面中解析电话号码。

当 Chrome 参与不可用或您想要电话拨入回退时使用此选项。Google Meet 必须为会议公开电话拨入号码和 PIN；OpenClaw 不会从 Meet 页面发现这些信息。

在 Gateway(网关) 主机上而不是 Chrome 节点上启用 Voice Call 插件：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call"],
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
        },
      },
    },
  },
}
```

通过环境变量或配置提供 Twilio 凭证。环境变量可以将机密信息保留在 `openclaw.json` 之外：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

启用 `voice-call` 后，重启或重新加载 Gateway(网关)；插件配置的更改在重新加载之前不会显示在已运行的 Gateway(网关) 进程中。

然后验证：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

当 Twilio 委托连接好后，`googlemeet setup` 包括成功的 `twilio-voice-call-plugin` 和 `twilio-voice-call-credentials` 检查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

当会议需要自定义顺序时使用 `--dtmf-sequence`：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和预检查

创建 Meet 链接时 OAuth 是可选的，因为 `googlemeet create` 可以回退到浏览器自动化。如果您需要官方 OAuth 创建、空间解析或 Meet Media API 预检查，请配置 API。

Google Meet API 访问使用用户 OAuth：创建一个 Google Cloud OAuth 客户端，请求所需的范围，授权一个 Google 账户，然后将生成的刷新令牌存储在 Google Meet 插件配置中，或提供 `OPENCLAW_GOOGLE_MEET_*` 环境变量。

OAuth 并不替代 Chrome 加入路径。当您使用浏览器参与时，Chrome 和 Chrome-node 传输仍然通过已登录的 Chrome 配置文件、BlackHole/SoX 和连接的节点加入。OAuth 仅适用于官方 Google Meet API 路径：创建会议空间、解析空间以及运行 Meet Media API 预检查。

### 创建 Google 凭据

在 Google Cloud Console 中：

1. 创建或选择一个 Google Cloud 项目。
2. 为该项目启用 **Google Meet REST API**。
3. 配置 OAuth 同意屏幕。
   - **Internal** 对于 Google Workspace 组织来说是最简单的。
   - **External** 适用于个人/测试设置；当应用处于测试模式时，请将每个需要授权该应用的 Google 账号添加为测试用户。
4. 添加 OpenClaw 请求的范围：
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. 创建一个 OAuth 客户端 ID。
   - 应用类型：**Web 应用程序**。
   - 已授权的重定向 URI：

     ```text
     http://localhost:8085/oauth2callback
     ```

6. 复制客户端 ID 和客户端密钥。

`meetings.space.created` 是 Google Meet `spaces.create` 所必需的。
`meetings.space.readonly` 允许 OpenClaw 将 Meet URL/代码解析为空格。
`meetings.conference.media.readonly` 用于 Meet Media API 预检和媒体
工作；对于实际的 Media API 使用，Google 可能需要注册开发者预览版。
如果您只需要基于浏览器的 Chrome 加入，请完全跳过 OAuth。

### 获取刷新令牌

配置 `oauth.clientId` 并可选地配置 `oauth.clientSecret`，或将它们作为
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

如果您不希望在配置中包含刷新令牌，请优先使用环境变量。如果同时存在配置和环境变量值，插件将首先解析配置，然后再解析环境变量作为后备。

OAuth 同意内容包括 Meet 空间创建、Meet 空间读取访问权限和 Meet 会议媒体读取访问权限。如果您在创建会议支持功能存在之前进行了身份验证，请重新运行 `openclaw googlemeet auth login --json`，以便刷新令牌具有 `meetings.space.created` 范围。

### 使用 doctor 验证 OAuth

当您需要进行快速的非机密健康检查时，运行 OAuth doctor：

```bash
openclaw googlemeet doctor --oauth --json
```

这不会加载 Chrome 运行时，也不需要连接的 Chrome 节点。它检查 OAuth 配置是否存在，以及刷新令牌能否获取访问令牌。JSON 报告仅包含 `ok`、`configured`、`tokenSource`、`expiresAt` 等状态字段和检查消息；它不会打印访问令牌、刷新令牌或客户端密钥。

常见结果：

| 检查                 | 含义                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `oauth-config`       | 存在 `oauth.clientId` 加上 `oauth.refreshToken`，或缓存的访问令牌。 |
| `oauth-token`        | 缓存的访问令牌仍然有效，或者刷新令牌获取了新的访问令牌。            |
| `meet-spaces-get`    | 可选的 `--meeting` 检查解析了现有的 Meet 空间。                     |
| `meet-spaces-create` | 可选的 `--create-space` 检查创建了一个新的 Meet 空间。              |

为了证明 Google Meet API 已启用以及具有 `spaces.create` 作用域，请运行
具有副作用的创建检查：

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` 会创建一个一次性的 Meet URL。当您需要确认
Google Cloud 项目是否启用了 Meet API 以及授权账户是否具有
`meetings.space.created` 作用域时，请使用它。

要证明对现有会议空间的读取访问权限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` 和 `resolve-space` 证明已获得对授权 Google 账号可访问的现有空间的读取权限。这些检查中的 `403` 通常表示 Google Meet REST API 已被禁用、同意的刷新令牌缺少所需范围，或者 Google 账号无法访问该 Meet 空间。刷新令牌错误意味着重新运行 `openclaw googlemeet auth login
--` and store the new `oauth` 块。

浏览器回退不需要 OAuth 凭据。在该模式下，Google 身份验证来自所选节点上已登录的 Chrome 配置文件，而非来自 OpenClaw 配置。

接受这些环境变量作为回退方案：

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

在媒体处理工作之前运行预检查：

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

在 Meet 创建会议记录后，列出会议内容和出席情况：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting`、`artifacts` 和 `attendance` 时，默认使用最新的会议记录。当您需要该会议的所有保留记录时，请传递 `--all-conference-records`。

日历查找可以在读取 Meet 内容之前从 Google 日历解析会议 URL：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 在今天的 `primary` 日历中搜索包含 Google Meet 链接的日历活动。使用 `--event <query>` 搜索匹配的活动文本，并使用 `--calendar <id>` 搜索非主日历。日历查找需要包含 Calendar events readonly scope 的全新 OAuth 登录。`calendar-events` 预览匹配的 Meet 活动并标记 `latest`、`artifacts`、`attendance` 或 `export` 将选择的活动。

如果您已经知道会议记录 ID，请直接对其进行寻址：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

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

`artifacts` 返回会议记录元数据以及参与者、录音、转录文稿、结构化转录条目和智能笔记资源元数据（当 Google 为会议公开这些数据时）。使用 `--no-transcript-entries` 跳过大型会议的条目查找。`attendance` 将参与者扩展为参与者-会话行，其中包含首次/最后看到的时间、总会话持续时间、迟到/早退标志，以及通过登录用户或显示名合并的重复参与者资源。传递 `--no-merge-duplicates` 以保持原始参与者资源分离，传递 `--late-after-minutes` 以调整迟到检测，传递 `--early-before-minutes` 以调整早退检测。

`export` 会写入一个包含 `summary.md`、`attendance.csv`、
`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的文件夹。
`manifest.json` 记录所选的输入、导出选项、会议记录、
输出文件、计数、令牌来源、使用的日历事件（如果有）以及任何
部分检索警告。传递 `--zip` 以在文件夹旁边
写入一个便携式存档。传递 `--include-doc-bodies` 以通过 Google Drive `files.export` 导出链接的逐字稿和
智能笔记 Google Docs 文本；这需要进行一次新的 OAuth 登录，
该登录包含 Drive Meet 只读作用域。如果不使用
`--include-doc-bodies`，导出内容仅包含 Meet 元数据和结构化逐字稿条目。
如果 Google 返回部分构件失败，例如智能笔记列表、
逐字稿条目或 Drive 文档正文错误，摘要和清单将
保留警告，而不是导致整个导出失败。
使用 `--dry-run` 获取相同的构件/出席数据并打印
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

针对真实的保留会议运行受保护的实际冒烟测试：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

实际冒烟测试环境：

- `OPENCLAW_LIVE_TEST=1` 启用受保护的实际测试。
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` 指向保留的 Meet URL、代码或
  `spaces/{id}`。
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID` 提供 OAuth
  客户端 ID。
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN` 提供
  刷新令牌。
- 可选：`OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`、
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 和
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 使用相同的后备名称
  而不带 `OPENCLAW_` 前缀。

基本工件/出勤实时冒烟测试需要
`https://www.googleapis.com/auth/meetings.space.readonly` 和
`https://www.googleapis.com/auth/meetings.conference.media.readonly`。日历
查找需要 `https://www.googleapis.com/auth/calendar.events.readonly`。Drive
文档正文导出需要
`https://www.googleapis.com/auth/drive.meet.readonly`。

创建一个新的 Meet 空间：

```bash
openclaw googlemeet create
```

该命令会打印新的 `meeting uri`、源和加入会话。使用 OAuth
凭据时，它使用官方的 Google Meet API。如果没有 OAuth 凭据，它
将使用固定的 Chrome 节点的已登录浏览器配置文件作为后备。代理可以
使用 `google_meet` 工具配合 `action: "create"` 来创建并加入，一步完成。若要仅创建 URL，请传递 `"join": false`。

来自浏览器后备的示例 JSON 输出：

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

如果浏览器后备在能够创建 URL 之前遇到 Google 登录或 Meet 权限拦截器，Gateway(网关) 方法将返回失败的响应，且
`google_meet` 工具将返回结构化详细信息而不是纯字符串：

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

当代理看到 `manualActionRequired: true` 时，它应该报告
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
需要一个已登录的 Google Chrome 配置文件才能通过浏览器加入。如果
配置文件未登录，OpenClaw 将报告 `manualActionRequired: true` 或
浏览器后备错误，并要求操作员在重试前完成 Google 登录。

仅在确认您的 Cloud
项目、OAuth 主体和会议参与者已注册用于 Meet media APIs 的 Google
Workspace Developer Preview Program 后，才设置 `preview.enrollmentAcknowledged: true`。

## 配置

常见的 Chrome 实时路径只需要启用插件、BlackHole、SoX
和后端实时语音提供商密钥。OpenAI 是默认选项；设置
`realtime.provider: "google"` 以使用 Google Gemini Live：

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
- `defaultMode: "realtime"`
- `chromeNode.node`：用于 `chrome-node` 的可选节点 ID/名称/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`：在未登录的 Meet 访客屏幕上使用的名称
- `chrome.autoJoin: true`：尽力填充访客名称，并通过 OpenClaw 浏览器自动化在 `chrome-node` 上点击“立即加入”
- `chrome.reuseExistingTab: true`：激活现有的 Meet 标签页，而不是打开重复项
- `chrome.waitForInCallMs: 20000`：在触发实时介绍之前，等待 Meet 标签页报告处于通话中状态
- `chrome.audioFormat: "pcm16-24khz"`：命令对音频格式。仅对仍发出电话音频的传统/自定义命令对使用 `"g711-ulaw-8khz"`。
- `chrome.audioInputCommand`：从 CoreAudio `BlackHole 2ch` 读取并以 `chrome.audioFormat` 格式写入音频的 SoX 命令
- `chrome.audioOutputCommand`：以 `chrome.audioFormat` 格式读取音频并写入 CoreAudio `BlackHole 2ch` 的 SoX 命令
- `realtime.provider: "openai"`
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：简短的口头回复，使用 `openclaw_agent_consult` 获取更深入的答案
- `realtime.introMessage`：实时桥接器连接时的简短口头就绪检查；将其设置为 `""` 以静默加入
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
  },
  chromeNode: {
    node: "parallels-macos",
  },
  realtime: {
    provider: "google",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Kore",
      },
    },
  },
}
```

仅限 Twilio 的配置：

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

`voiceCall.enabled` 默认为 `true`；使用 Twilio 传输时，它将实际的 PSTN 呼叫和 DTMF 委托给语音呼叫插件。如果未启用 `voice-call`，Google Meet 仍然可以验证并记录拨号计划，但无法进行 Twilio 呼叫。

## 工具

代理可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

当 Chrome 在 Gateway(网关) 主机上运行时，请使用 `transport: "chrome"`。当 Chrome 在配对节点（如 Parallels VM）上运行时，请使用 `transport: "chrome-node"`。在这两种情况下，实时模型和 `openclaw_agent_consult` 都在 Gateway(网关) 主机上运行，因此模型凭据会保留在那里。

使用 `action: "status"` 列出活动会话或检查会话 ID。将 `action: "speak"` 与 `sessionId` 和 `message` 结合使用，使实时代理立即发言。使用 `action: "test_speech"` 创建或复用会话，触发已知短语，并在 Chrome 主机能够报告时返回 `inCall` 运行状况。使用 `action: "leave"` 标记会话已结束。

`status` 在可用时包含 Chrome 运行状况：

- `inCall`：Chrome 似乎已进入 Meet 通话
- `micMuted`：尽力而为的 Meet 麦克风状态
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`：
  在语音工作之前，浏览器配置文件需要手动登录、Meet 主持人准入、权限
  或浏览器控制修复
- `providerConnected` / `realtimeReady`：实时语音桥接状态
- `lastInputAt` / `lastOutputAt`：从桥接接收或发送到桥接的最后音频

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## 实时代理咨询

Chrome 实时模式针对实时语音循环进行了优化。实时语音提供商
听到会议音频并通过配置的音频桥接进行语音输出。当实时模型
需要更深层的推理、当前信息或常规 OpenClaw 工具时，
它可以调用 `openclaw_agent_consult`。

咨询工具在后台使用最近的会议记录上下文运行常规 OpenClaw 代理，
并向实时语音会话返回简明的口头回答。然后语音模型可以将该答案
回传到会议中。它使用与 Voice Call 相同的共享实时咨询工具。

默认情况下，咨询针对 `main` 代理运行。当 Meet 通道
应咨询专用的 OpenClaw 代理工作区、模型默认值、
工具策略、内存和会话历史时，设置 `realtime.agentId`。

`realtime.toolPolicy` 控制咨询运行：

- `safe-read-only`：公开咨询工具并将常规代理限制为
  `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和
  `memory_get`。
- `owner`：公开咨询工具并允许常规代理使用普通代理工具策略。
- `none`：不向实时语音模型公开咨询工具。

咨询会话密钥的范围限定为每次 Meet 会话，因此在同一会议期间，后续的咨询调用可以重用之前的咨询上下文。

要在 Chrome 完全加入通话后强制进行语音就绪检查：

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

要进行完整的加入并冒烟测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## 实时测试检查清单

在将会议移交给无人值守代理之前，请使用此顺序：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

预期的 Chrome 节点状态：

- `googlemeet setup` 全部显示绿色。
- 当 Chrome 节点为默认传输或节点已固定时，`googlemeet setup` 包含 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接。
- 所选节点同时广播 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 标签页加入通话，并且 `test-speech` 返回带有 `inCall: true` 的 Chrome 健康状态。

对于远程 Chrome 主机（如 Parallels macOS VM），这是更新 Gateway(网关) 或 VM 后的最简
安全检查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这证明 Gateway(网关) 插件已加载，VM 节点已使用当前令牌连接，并且 Meet 音频桥在代理打开真实会议标签页之前可用。

对于 Twilio 冒烟测试，请使用公开电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期的 Twilio 状态：

- `googlemeet setup` 包含绿色的 `twilio-voice-call-plugin` 和
  `twilio-voice-call-credentials` 检查。
- 在 CLI 重新加载后，Gateway(网关) 中提供了 `voicecall`。
- 返回的会话具有 `transport: "twilio"` 和 `twilio.voiceCallId`。
- `googlemeet leave <sessionId>` 挂断委派的语音通话。

## 故障排除

### 代理看不到 Google Meet 工具

确认插件已在 Gateway(网关) 配置中启用，然后重新加载 Gateway(网关)：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果您刚刚编辑了 `plugins.entries.google-meet`，请重启或重新加载 Gateway(网关)。
正在运行的代理只能看到当前 Gateway(网关) 进程注册的插件工具。

### 没有连接支持 Google Meet 的节点

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

节点必须已连接，并列出 `googlemeet.chrome` 和 `browser.proxy`。
Gateway(网关) 配置必须允许这些节点命令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 失败 `chrome-node-connected` 或 Gateway(网关) 日志报告
`gateway token mismatch`，请使用当前的 Gateway(网关) token 重新安装或重启节点。
对于 LAN Gateway(网关)，这通常意味着：

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

### 浏览器已打开，但代理无法加入

运行 `googlemeet test-speech` 并检查返回的 Chrome 运行状况。如果它
报告 `manualActionRequired: true`，则向操作员显示 `manualActionMessage`
并停止重试，直到浏览器操作完成。

常见的手动操作：

- 登录 Chrome 配置文件。
- 从 Meet 主持人帐号准许访客进入。
- 当 Chrome 的原生权限提示出现时，授予 Chrome 麦克风/摄像头权限。
- 关闭或修复卡住的 Meet 权限对话框。

不要仅仅因为 Meet 显示“Do you want people to hear you in the meeting?”就报告“not signed in”。那是 Meet 的音频选择插页；如果可能，OpenClaw 会通过浏览器自动化点击 **Use microphone**，并继续等待真正的会议状态。对于仅创建的浏览器回退，OpenClaw 可能会点击 **Continue without microphone**，因为创建 URL 不需要实时音频路径。

### 会议创建失败

当配置了 OAuth 凭据时，`googlemeet create` 首先使用 Google Meet API `spaces.create` 端点。
如果没有 OAuth 凭据，它会回退到固定的 Chrome 节点浏览器。请确认：

- 对于 API 创建：`oauth.clientId` 和 `oauth.refreshToken` 已配置，
  或者存在匹配的 `OPENCLAW_GOOGLE_MEET_*` 环境变量。
- 对于 API 创建：在添加创建支持后生成了刷新令牌。较旧的令牌可能缺少 `meetings.space.created` 范围；请重新运行 `openclaw googlemeet auth login --json` 并更新插件配置。
- 对于浏览器回退：`defaultTransport: "chrome-node"` 和 `chromeNode.node` 指向具有 `browser.proxy` 和 `googlemeet.chrome` 的已连接节点。
- 对于浏览器回退：该节点上的 OpenClaw Chrome 配置文件已登录 Google，并且可以打开 `https://meet.google.com/new`。
- 对于浏览器回退：在打开新标签页之前，重试会重用现有的 `https://meet.google.com/new` 或 Google 帐户提示标签页。如果代理超时，请重试工具调用，而不是手动打开另一个 Meet 标签页。
- 对于浏览器回退：如果工具返回 `manualActionRequired: true`，请使用返回的 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 来引导操作员。在该操作完成之前，请勿循环重试。
- 对于浏览器回退：如果 Meet 显示“您希望人们在会议中听到您的声音吗？”，请保持标签页打开。OpenClaw 应通过浏览器自动化点击 **使用麦克风**，或者对于仅创建回退，点击 **不使用麦克风继续**，然后继续等待生成的 Meet URL。如果无法执行此操作，错误应提及 `meet-audio-choice-required`，而不是 `google-login-required`。

### 代理加入但不说话

检查实时路径：

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

使用 `mode: "realtime"` 进行监听/回话。`mode: "transcribe"` 故意不启动双工实时语音桥。

还要验证：

- Gateway(网关) 主机上有一个实时提供商密钥可用，例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- `BlackHole 2ch` 在 Chrome 主机上可见。
- `sox` 存在于 Chrome 主机上。
- Meet 麦克风和扬声器通过 OpenClaw 使用的虚拟音频路径进行路由。

`googlemeet doctor [session-id]` 会打印会话、节点、通话中状态、手动操作原因、实时提供商连接、`realtimeReady`、音频输入/输出活动、最后音频时间戳、字节计数器和浏览器 URL。当您需要原始 JSON 时，请使用 `googlemeet status [session-id]`。当您需要在不暴露令牌的情况下验证 Google Meet OAuth 刷新时，请使用 `googlemeet doctor --oauth`；当您还需要 Google Meet API 证明时，请添加 `--meeting` 或 `--create-space`。

如果一个代理超时并且您可以看到一个 Meet 标签页已经打开，请检查该标签页而不要打开另一个：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

等效的工具操作是 `recover_current_tab`。它聚焦并检查选定传输的现有 Meet 标签页。对于 `chrome`，它通过 Gateway(网关) 使用本地浏览器控制；对于 `chrome-node`，它使用配置的 Chrome 节点。它不会打开新标签页或创建新会话；它会报告当前的阻碍因素，例如登录、准入、权限或音频选择状态。CLI 命令与配置的 Gateway(网关) 通信，因此 Gateway(网关) 必须正在运行；`chrome-node` 还要求 Chrome 节点已连接。

### Twilio 设置检查失败

当 `voice-call` 不被允许或未启用时，`twilio-voice-call-plugin` 会失败。
将其添加到 `plugins.allow`，启用 `plugins.entries.voice-call`，然后重新加载
Gateway(网关)。

当 Twilio 后端缺少帐户 SID、身份验证令牌或呼叫者号码时，`twilio-voice-call-credentials` 失败。请在 Gateway(网关) 主机上设置这些项：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

然后重启或重新加载 Gateway(网关) 并运行：

```bash
openclaw googlemeet setup
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 默认仅检查就绪状态。要对特定号码进行空运行：

```bash
openclaw voicecall smoke --to "+15555550123"
```

仅当您有意拨打实时出站通知电话时，才添加 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 呼叫开始但从未进入会议

确认 Meet 事件公开了电话拨入详情。传递确切的拨入号码和 PIN 或自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果提供商需要在输入 PIN 之前暂停，请在 `--dtmf-sequence` 中使用前导 `w` 或逗号。

## 注意事项

Google Meet 的官方媒体 API 是面向接收的，因此在 Meet 通话中发言仍然需要参与者路径。此插件保持该边界可见：Chrome 处理浏览器参与和本地音频路由；Twilio 处理电话拨入参与。

Chrome 实时模式需要以下两者之一：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：OpenClaw 拥有实时模型桥接器，并在 `chrome.audioFormat` 中在这些命令与选定的实时语音提供商之间传输音频。默认的 Chrome 路径是 24 kHz PCM16；8 kHz G.711 mu-law 仍可用于传统命令对。
- `chrome.audioBridgeCommand`：外部桥接命令拥有整个本地音频路径，并且必须在启动或验证其守护进程后退出。

为了获得清晰的全双工音频，请将 Meet 输出和 Meet 麦克风路由通过单独的
虚拟设备或 Loopback 风格的虚拟设备图。单个共享的
BlackHole 设备可能会将其他参会者的声音回声传回通话中。

`googlemeet speak` 会为 Chrome 会话触发活动的实时音频桥。
`googlemeet leave` 会停止该桥接。对于通过 Voice Call 插件代理的 Twilio 会话，
`leave` 也会挂断底层语音通话。

## 相关

- [Voice call plugin](/zh/plugins/voice-call)
- [Talk mode](/zh/nodes/talk)
- [Building plugins](/zh/plugins/building-plugins)
