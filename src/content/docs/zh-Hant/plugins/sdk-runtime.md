---
title: "Plugin Runtime Helpers"
sidebarTitle: "Runtime Helpers"
summary: "api.runtime -- the injected runtime helpers available to plugins"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

# Plugin Runtime Helpers

在註冊期間注入到每個外掛程式中的 `api.runtime` 物件參考。請使用這些輔助程式，而不是直接匯入主機內部元件。

<Tip>**正在尋找逐步教學？** 請參閱 [頻道外掛程式](/en/plugins/sdk-channel-plugins) 或 [提供者外掛程式](/en/plugins/sdk-provider-plugins)，以查看展示這些輔助函式實際應用的 逐步指南。</Tip>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Runtime namespaces

### `api.runtime.agent`

Agent identity, directories, and session management.

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

**Session store helpers** 位於 `api.runtime.agent.session` 下：

```typescript
const storePath = api.runtime.agent.session.resolveStorePath(cfg);
const store = api.runtime.agent.session.loadSessionStore(cfg);
await api.runtime.agent.session.saveSessionStore(cfg, store);
const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
```

### `api.runtime.agent.defaults`

Default model and provider constants:

```typescript
const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
```

### `api.runtime.subagent`

Launch and manage background subagent runs.

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
  模型覆寫 (`provider`/`model`) 需要操作員透過組態中的
  `plugins.entries.<id>.subagent.allowModelOverride: true` 選擇加入。
  不受信任的外掛程式仍然可以執行子代理程式，但覆寫請求會被拒絕。
</Warning>

### `api.runtime.taskFlow`

將 Task Flow 運行時綁定到現有的 OpenClaw 工作階段金鑰或受信任的工具上下文，然後建立和管理 Task Flow，而無需在每次呼叫時傳遞擁有者。

```typescript
const taskFlow = api.runtime.taskFlow.fromToolContext(ctx);

const created = taskFlow.createManaged({
  controllerId: "my-plugin/review-batch",
  goal: "Review new pull requests",
});

const child = taskFlow.runTask({
  flowId: created.flowId,
  runtime: "acp",
  childSessionKey: "agent:main:subagent:reviewer",
  task: "Review PR #123",
  status: "running",
  startedAt: Date.now(),
});

const waiting = taskFlow.setWaiting({
  flowId: created.flowId,
  expectedRevision: created.revision,
  currentStep: "await-human-reply",
  waitJson: { kind: "reply", channel: "telegram" },
});
```

當您已經從自己的綁定層獲得受信任的 OpenClaw 工作階段金鑰時，請使用 `bindSession({ sessionKey, requesterOrigin })`。不要從原始使用者輸入進行綁定。

### `api.runtime.tts`

文字轉語音合成。

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

使用核心 `messages.tts` 組態和提供者選擇。傳回 PCM 音訊緩衝區 + 取樣率。

### `api.runtime.mediaUnderstanding`

影像、音訊和視訊分析。

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

當未產生輸出時（例如跳過輸入），傳回 `{ text: undefined }`。

<Info>`api.runtime.stt.transcribeAudioFile(...)` 作為 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的相容性別名保留。</Info>

### `api.runtime.imageGeneration`

影像生成。

```typescript
const result = await api.runtime.imageGeneration.generate({
  prompt: "A robot painting a sunset",
  cfg: api.config,
});

const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
```

### `api.runtime.webSearch`

網路搜尋。

```typescript
const providers = api.runtime.webSearch.listProviders({ config: api.config });

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: { query: "OpenClaw plugin SDK", count: 5 },
});
```

### `api.runtime.media`

低階媒體公用程式。

```typescript
const webMedia = await api.runtime.media.loadWebMedia(url);
const mime = await api.runtime.media.detectMime(buffer);
const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
const metadata = await api.runtime.media.getImageMetadata(filePath);
const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
```

### `api.runtime.config`

組態載入和寫入。

```typescript
const cfg = await api.runtime.config.loadConfig();
await api.runtime.config.writeConfigFile(cfg);
```

### `api.runtime.system`

系統層級公用程式。

```typescript
await api.runtime.system.enqueueSystemEvent(event);
api.runtime.system.requestHeartbeatNow();
const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
const hint = api.runtime.system.formatNativeDependencyHint(pkg);
```

### `api.runtime.events`

事件訂閱。

```typescript
api.runtime.events.onAgentEvent((event) => {
  /* ... */
});
api.runtime.events.onSessionTranscriptUpdate((update) => {
  /* ... */
});
```

### `api.runtime.logging`

日誌記錄。

```typescript
const verbose = api.runtime.logging.shouldLogVerbose();
const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
```

### `api.runtime.modelAuth`

模型和提供者驗證解析。

```typescript
const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
  provider: "openai",
  cfg,
});
```

### `api.runtime.state`

狀態目錄解析。

```typescript
const stateDir = api.runtime.state.resolveStateDir();
```

### `api.runtime.tools`

記憶工具工廠和 CLI。

```typescript
const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
api.runtime.tools.registerMemoryCli(/* ... */);
```

### `api.runtime.channel`

通道特定的執行時期輔助程式（載入通道外掛程式時可用）。

## 儲存執行時期參照

使用 `createPluginRuntimeStore` 儲存執行時期參照以便在 `register` 回呼之外使用：

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

## 其他頂層 `api` 欄位

除了 `api.runtime` 之外，API 物件也提供：

| 欄位                     | 類型                      | 描述                                                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛程式 ID                                                         |
| `api.name`               | `string`                  | 外掛程式顯示名稱                                                    |
| `api.config`             | `OpenClawConfig`          | 目前的組態快照（可用時為現有的記憶體內執行時期快照）                |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定組態               |
| `api.logger`             | `PluginLogger`            | 作用域記錄器（`debug`、`info`、`warn`、`error`）                    |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前的載入模式；`"setup-runtime"` 是輕量級的完整進入啟動/設定前視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                      |

## 相關

- [SDK 概觀](/en/plugins/sdk-overview) -- 子路徑參照
- [SDK 進入點](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 選項
- [外掛程式內部](/en/plugins/architecture) -- 功能模型和註冊表
