---
title: "插件运行时辅助程序"
sidebarTitle: "运行时辅助程序"
summary: "api.runtime -- 插件可用的注入运行时辅助程序"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

# 插件运行时辅助程序

注入到每个插件中的 `api.runtime` 对象的参考。请使用这些辅助程序，而不是直接导入主机内部组件。

<Tip>**正在寻找分步指南？** 请参阅 [Channel Plugins](/en/plugins/sdk-channel-plugins) 或 [Provider Plugins](/en/plugins/sdk-provider-plugins)，查看在具体上下文中 演示这些辅助函数的分步指南。</Tip>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## 运行时命名空间

### `api.runtime.agent`

Agent 身份、目录和会话管理。

```typescript
// Resolve the agent's working directory
const agentDir = api.runtime.agent.resolveAgentDir(cfg);

// Resolve agent workspace
const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

// Get agent identity
const identity = api.runtime.agent.resolveAgentIdentity(cfg);

// Get default thinking level
const thinking = api.runtime.agent.resolveThinkingDefault(cfg, provider, model);

// Get agent timeout
const timeoutMs = api.runtime.agent.resolveAgentTimeoutMs(cfg);

// Ensure workspace exists
await api.runtime.agent.ensureAgentWorkspace(cfg);

// Run an embedded Pi agent
const agentDir = api.runtime.agent.resolveAgentDir(cfg);
const result = await api.runtime.agent.runEmbeddedPiAgent({
  sessionId: "my-plugin:task-1",
  runId: crypto.randomUUID(),
  sessionFile: path.join(agentDir, "sessions", "my-plugin-task-1.jsonl"),
  workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg),
  prompt: "Summarize the latest changes",
  timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
});
```

**会话存储辅助程序** 位于 `api.runtime.agent.session` 下：

```typescript
const storePath = api.runtime.agent.session.resolveStorePath(cfg);
const store = api.runtime.agent.session.loadSessionStore(cfg);
await api.runtime.agent.session.saveSessionStore(cfg, store);
const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
```

### `api.runtime.agent.defaults`

默认模型和提供商常量：

```typescript
const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
```

### `api.runtime.subagent`

启动和管理后台子代理运行。

```typescript
// Start a subagent run
const { runId } = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai", // optional override
  model: "gpt-4.1-mini", // optional override
  deliver: false,
});

// Wait for completion
const result = await api.runtime.subagent.waitForRun({ runId, timeoutMs: 30000 });

// Read session messages
const { messages } = await api.runtime.subagent.getSessionMessages({
  sessionKey: "agent:main:subagent:search-helper",
  limit: 10,
});

// Delete a session
await api.runtime.subagent.deleteSession({
  sessionKey: "agent:main:subagent:search-helper",
});
```

<Warning>
  模型覆盖 (`provider`/`model`) 需要操作员通过配置中的
  `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。
  不受信任的插件仍可运行子代理，但覆盖请求将被拒绝。
</Warning>

### `api.runtime.tts`

文本转语音合成。

```typescript
// Standard TTS
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

// Telephony-optimized TTS
const telephonyClip = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

// List available voices
const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

使用核心 `messages.tts` 配置和提供商选择。返回 PCM 音频缓冲区 + 采样率。

### `api.runtime.mediaUnderstanding`

图像、音频和视频分析。

```typescript
// Describe an image
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

// Transcribe audio
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  mime: "audio/ogg", // optional, for when MIME cannot be inferred
});

// Describe a video
const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});

// Generic file analysis
const result = await api.runtime.mediaUnderstanding.runFile({
  filePath: "/tmp/inbound-file.pdf",
  cfg: api.config,
});
```

当未产生输出时（例如跳过输入），返回 `{ text: undefined }`。

<Info>`api.runtime.stt.transcribeAudioFile(...)` 保留为 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的兼容性别名。</Info>

### `api.runtime.imageGeneration`

图像生成。

```typescript
const result = await api.runtime.imageGeneration.generate({
  prompt: "A robot painting a sunset",
  cfg: api.config,
});

const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
```

### `api.runtime.webSearch`

Web 搜索。

```typescript
const providers = api.runtime.webSearch.listProviders({ config: api.config });

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: { query: "OpenClaw plugin SDK", count: 5 },
});
```

### `api.runtime.media`

低级媒体实用程序。

```typescript
const webMedia = await api.runtime.media.loadWebMedia(url);
const mime = await api.runtime.media.detectMime(buffer);
const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
const metadata = await api.runtime.media.getImageMetadata(filePath);
const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
```

### `api.runtime.config`

配置加载和写入。

```typescript
const cfg = await api.runtime.config.loadConfig();
await api.runtime.config.writeConfigFile(cfg);
```

### `api.runtime.system`

系统级实用程序。

```typescript
await api.runtime.system.enqueueSystemEvent(event);
api.runtime.system.requestHeartbeatNow();
const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
const hint = api.runtime.system.formatNativeDependencyHint(pkg);
```

### `api.runtime.events`

事件订阅。

```typescript
api.runtime.events.onAgentEvent((event) => {
  /* ... */
});
api.runtime.events.onSessionTranscriptUpdate((update) => {
  /* ... */
});
```

### `api.runtime.logging`

日志记录。

```typescript
const verbose = api.runtime.logging.shouldLogVerbose();
const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
```

### `api.runtime.modelAuth`

模型和提供商身份验证解析。

```typescript
const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
  provider: "openai",
  cfg,
});
```

### `api.runtime.state`

状态目录解析。

```typescript
const stateDir = api.runtime.state.resolveStateDir();
```

### `api.runtime.tools`

Memory 工具工厂和 CLI。

```typescript
const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
api.runtime.tools.registerMemoryCli(/* ... */);
```

### `api.runtime.channel`

特定的渠道运行时助手（在加载渠道插件时可用）。

## 存储运行时引用

使用 `createPluginRuntimeStore` 存储运行时引用，以便在 `register` 回调之外使用：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>("my-plugin runtime not initialized");

// In your entry point
export default defineChannelPluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Example",
  plugin: myPlugin,
  setRuntime: store.setRuntime,
});

// In other files
export function getRuntime() {
  return store.getRuntime(); // throws if not initialized
}

export function tryGetRuntime() {
  return store.tryGetRuntime(); // returns null if not initialized
}
```

## 其他顶层 `api` 字段

除了 `api.runtime`，API 对象还提供：

| 字段                     | 类型                      | 描述                                              |
| ------------------------ | ------------------------- | ------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                           |
| `api.name`               | `string`                  | 插件显示名称                                      |
| `api.config`             | `OpenClawConfig`          | 当前配置快照                                      |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置 |
| `api.logger`             | `PluginLogger`            | 作用域记录器 (`debug`, `info`, `warn`, `error`)   |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`、`"setup-only"` 或 `"setup-runtime"`     |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                        |

## 相关

- [SDK Overview](/en/plugins/sdk-overview) -- 子路径参考
- [SDK Entry Points](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 选项
- [Plugin Internals](/en/plugins/architecture) -- 能力模型和注册表
