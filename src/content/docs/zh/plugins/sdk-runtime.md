---
summary: "api.runtime -- 注入到插件中的可用运行时助手"
title: "插件运行时助手"
sidebarTitle: "运行时助手"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

关于在注册期间注入到每个插件中的 `api.runtime` 对象的参考。请使用这些助手，而不是直接导入主机内部组件。

<CardGroup cols={2}>
  <Card title="渠道插件" href="/zh/plugins/sdk-channel-plugins">
    在渠道插件的上下文中使用这些助手的分步指南。
  </Card>
  <Card title="提供商插件" href="/zh/plugins/sdk-provider-plugins">
    在提供商插件的上下文中使用这些助手的分步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## 配置加载与写入

优先使用已经传入活动调用路径的配置，例如注册期间的 `api.config` 或渠道/提供商回调上的 `cfg` 参数。这可以使一个进程快照在工作流中传递，而不是在热路径上重新解析配置。

仅当长生命周期处理程序需要当前进程快照且没有配置传递给该函数时，才使用 `api.runtime.config.current()`。返回值是只读的；在编辑之前请克隆或使用变异助手。

工具工厂接收 `ctx.runtimeConfig` 加上 `ctx.getRuntimeConfig()`。当工具定义创建后配置可能发生变化时，请在长生命周期工具的 `execute` 回调中使用该获取器。

使用 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 持久化更改。每次写入必须选择一个明确的 `afterWrite` 策略：

- `afterWrite: { mode: "auto" }` 让网关重载计划器决定。
- 当写入者知道热重载不安全时，`afterWrite: { mode: "restart", reason: "..." }` 强制执行完全重启。
- 仅当调用者拥有后续操作权时，`afterWrite: { mode: "none", reason: "..." }` 才会抑制自动重载/重启。

变更辅助函数返回 `afterWrite` 加上一个类型化的 `followUp` 摘要，以便调用者可以记录或测试他们是否请求了重启。网关仍然拥有实际发生该重启的时机。

`api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)` 是 `runtime-config-load-write` 下已弃用的兼容性辅助函数。它们在运行时会警告一次，并且在迁移期间保持可用于旧的外部插件。捆绑插件绝不能使用它们；如果插件代码调用它们或从插件 SDK 子路径导入这些辅助函数，配置边界守卫将失败。

对于直接 SDK 导入，请使用专门的配置子路径，而不是广泛的 `openclaw/plugin-sdk/config-runtime` 兼容性聚合：使用 `config-contracts` 获取类型，使用 `plugin-config-runtime` 获取已加载的配置断言和插件入口查找，使用 `runtime-config-snapshot` 获取当前进程快照，以及使用 `config-mutation` 进行写入。捆绑插件测试应该直接模拟这些专门的子路径，而不是模拟广泛的兼容性聚合。

内部 OpenClaw 运行时代码遵循相同的方向：在 CLI、网关或进程边界处加载一次配置，然后传递该值。成功的变异写入会刷新进程运行时快照并推进其内部修订；长期缓存的键应基于运行时拥有的缓存键，而不是在本地序列化配置。长期存在的运行时模块对环境 `loadConfig()` 调用具有零容忍扫描器；在显式进程边界处使用传递的 `cfg`、请求 `context.getRuntimeConfig()` 或 `getRuntimeConfig()`。

提供商和渠道执行路径必须使用活动的运行时配置快照，而不是为配置回读或编辑返回的文件快照。文件快照保留源值（例如用于 UI 和写入的 SecretRef 标记）；提供商回调需要已解析的运行时视图。当辅助函数可能使用活动源快照或活动运行时快照调用时，请在读取凭据之前通过 `selectApplicableRuntimeConfig()` 路由。

## 可重用的运行时实用程序

对机器人创作的入站消息使用入站 `botLoopProtection` 事实。核心在会话记录和分发之前应用共享的内存滑动窗口守卫，而不将策略绑定到单个渠道。该守卫跟踪 `(scopeId, conversationId, participant pair)` 键，将一对的两个方向一起计数，一旦超出窗口预算就应用冷却，并主动修剪不活动的条目。

向操作员公开此行为的渠道插件应为基线预算首选共享的 `channels.defaults.botLoopProtection` 形状，然后在此基础上叠加特定于渠道/提供商的覆盖。共享配置使用秒，因为它是面向用户的：

```typescript
type ChannelBotLoopProtectionConfig = {
  enabled?: boolean;
  maxEventsPerWindow?: number;
  windowSeconds?: number;
  cooldownSeconds?: number;
};
```

传递标准化的机器人对事实以及解析的轮次。核心解析默认值、单位转换和 `enabled` 语义：

```typescript
return {
  channel: "example",
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  runDispatch,
  botLoopProtection: {
    scopeId: "account-1",
    conversationId: "channel-1",
    senderId: "bot-a",
    receiverId: "bot-b",
    config: channelConfig.botLoopProtection,
    defaultsConfig: runtimeConfig.channels?.defaults?.botLoopProtection,
    defaultEnabled: allowBotsMode !== "off",
  },
};
```

仅对不经过共享入站回复运行程序的自定义两方事件循环直接使用 `openclaw/plugin-sdk/pair-loop-guard-runtime`。

## 运行时命名空间

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    代理身份、目录和会话管理。

    ```typescript
    // Resolve the agent's working directory
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);

    // Resolve agent workspace
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

    // Get agent identity
    const identity = api.runtime.agent.resolveAgentIdentity(cfg);

    // Get default thinking level
    const thinking = api.runtime.agent.resolveThinkingDefault({
      cfg,
      provider,
      model,
    });

    // Validate a user-provided thinking level against the active provider profile
    const policy = api.runtime.agent.resolveThinkingPolicy({ provider, model });
    const level = api.runtime.agent.normalizeThinkingLevel("extra high");
    if (level && policy.levels.some((entry) => entry.id === level)) {
      // pass level to an embedded run
    }

    // Get agent timeout
    const timeoutMs = api.runtime.agent.resolveAgentTimeoutMs(cfg);

    // Ensure workspace exists
    await api.runtime.agent.ensureAgentWorkspace(cfg);

    // Run an embedded agent turn
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);
    const result = await api.runtime.agent.runEmbeddedAgent({
      sessionId: "my-plugin:task-1",
      runId: crypto.randomUUID(),
      sessionFile: path.join(agentDir, "sessions", "my-plugin-task-1.jsonl"),
      workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg),
      prompt: "Summarize the latest changes",
      timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
    });
    ```

    `runEmbeddedAgent(...)`OpenClaw 是从插件代码启动普通 OpenClaw 代理轮次的中性辅助函数。它使用与渠道触发回复相同的提供商/模型解析和代理线束选择。

    `runEmbeddedPiAgent(...)` 保留为现有插件的已弃用兼容性别名。新代码应使用 `runEmbeddedAgent(...)`。

    `resolveThinkingPolicy(...)` 返回提供商/模型支持的思考级别和可选默认值。提供商插件通过其思考钩子拥有特定于模型的配置文件，因此工具插件应调用此运行时辅助函数，而不是导入或复制提供商列表。

    `normalizeThinkingLevel(...)` 将用户文本（例如 `on`、`x-high` 或 `extra high`）转换为规范存储级别，然后再根据解析的策略进行检查。

    **会话存储辅助函数** 位于 `api.runtime.agent.session` 下：

    ```typescript
    const entry = api.runtime.agent.session.getSessionEntry({ agentId, sessionKey });
    for (const { sessionKey, entry } of api.runtime.agent.session.listSessionEntries({ agentId })) {
      // Iterate session rows without depending on the legacy sessions.json shape.
    }
    await api.runtime.agent.session.patchSessionEntry({
      agentId,
      sessionKey,
      update: (entry) => ({ thinkingLevel: "high" }),
    });
    ```

    对于会话工作流，请优先使用 `getSessionEntry(...)`、`listSessionEntries(...)`、`patchSessionEntry(...)` 或 `upsertSessionEntry(...)`。这些辅助函数通过代理/会话身份访问会话，因此插件不依赖于旧版 `sessions.json` 存储结构。对于不应刷新会话活动的仅元数据修补，请使用 `preserveActivity: true`；仅当回调返回完整条目且已删除字段必须保持删除状态时，才使用 `replaceEntry: true`。`loadSessionStore(...)` 保留为已弃用的兼容性应急方案，供故意需要可变整个存储克隆的调用者使用。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    默认模型和提供商常量：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm"OpenClaw>
    运行宿主拥有的文本补全，而无需导入提供商内部程序或
    重复 OpenClaw 模型/认证/基础 URL 准备工作。

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```OpenClaw

    该辅助函数使用与 OpenClaw 内置运行时和宿主拥有的运行时配置快照相同的简单补全准备路径。上下文引擎接收绑定会话的 `llm.complete` 能力，因此模型调用使用活动会话的代理，并且不会静默回退到默认代理。结果包含提供商/模型/代理归属，以及在可用时包含归一化的令牌、缓存和估计成本使用情况。

    <Warning>
    模型覆盖需要操作员通过配置中的 `plugins.entries.<id>.llm.allowModelOverride: true` 选择加入。使用 `plugins.entries.<id>.llm.allowedModels` 将受信任的插件限制为特定的规范 `provider/model` 目标。跨代理补全需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
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
    模型覆盖 (`provider`/`model`) 需要操作员通过配置中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。不受信任的插件仍可运行子代理，但覆盖请求将被拒绝。
    </Warning>

    `deleteSession(...)` 可以通过 `api.runtime.subagent.run(...)`Gateway(网关) 删除由同一插件创建的会话。删除任意用户或操作员会话仍需要管理员范围的 Gateway 请求。

  </Accordion>
  <Accordion title="api.runtime.nodes"Gateway(网关)CLI>
    列出已连接的节点，并从 Gateway(网关) 加载的插件代码或插件 CLI 命令中调用节点宿主命令。当插件拥有配对设备上的本地工作时（例如另一台 Mac 上的浏览器或音频桥接器），请使用此功能。

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```Gateway(网关)CLIGateway(网关)RPC

    在 Gateway(网关) 内部，此运行时是进程内的。在插件 CLI 命令中，它通过 RPC 调用已配置的 Gateway(网关)，因此诸如 `openclaw googlemeet recover-tab`Gateway(网关) 之类的命令可以从终端检查配对的节点。节点命令仍然通过正常的 Gateway(网关) 节点配对、命令允许列表、插件节点调用策略和节点本地命令处理。

    暴露危险节点宿主命令的插件应使用 `api.registerNodeInvokePolicy(...)`Gateway(网关) 注册节点调用策略。该策略在命令允许列表检查之后、命令转发到节点之前的 Gateway(网关) 中运行，因此直接的 `node.invoke` 调用和更高级别的插件工具共享相同的执行路径。

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows"OpenClaw>
    将任务流运行时绑定到现有的 OpenClaw 会话密钥或受信任的工具上下文，然后创建和管理任务流，而无需在每次调用时传递所有者。

    任务流跟踪持久的多步骤工作流状态。它不是调度器：
    请使用 Cron 或 `api.session.workflow.scheduleSessionTurn(...)` 进行未来的
    唤醒，然后在该工作需要流状态、子任务、等待或取消时，从计划的轮次中使用 `managedFlows`。

    ```typescript
    const taskFlow = api.runtime.tasks.managedFlows.fromToolContext(ctx);

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

    当您已经拥有来自自己绑定层的受信任 OpenClaw 会话密钥时，请使用 `bindSession({ sessionKey, requesterOrigin })`OpenClaw。不要从原始用户输入进行绑定。

  </Accordion>
  <Accordion title="api.runtime.tts">
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

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
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

    // Structured image extraction through a specific provider/model.
    // Include at least one image; text inputs are supplemental context.
    const evidence = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
      provider: "codex",
      model: "gpt-5.5",
      input: [
        {
          type: "image",
          buffer: receiptImageBuffer,
          fileName: "receipt.png",
          mime: "image/png",
        },
        { type: "text", text: "Prefer the printed total over handwritten notes." },
      ],
      instructions: "Extract vendor, total, and searchable tags.",
      schemaName: "receipt.evidence",
      jsonSchema: {
        type: "object",
        properties: {
          vendor: { type: "string" },
          total: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["vendor", "total"],
      },
      cfg: api.config,
    });
    ```

    当没有产生输出时（例如跳过输入），返回 `{ text: undefined }`。

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` 保留为 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的兼容性别名。
    </Info>

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    图像生成。

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    网络搜索。

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    底层媒体实用程序。

    ```typescript
    const webMedia = await api.runtime.media.loadWebMedia(url);
    const mime = await api.runtime.media.detectMime(buffer);
    const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
    const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
    const metadata = await api.runtime.media.getImageMetadata(filePath);
    const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
    const terminalQr = await api.runtime.media.renderQrTerminal("https://openclaw.ai");
    const pngQr = await api.runtime.media.renderQrPngBase64("https://openclaw.ai", {
      scale: 6, // 1-12
      marginModules: 4, // 0-16
    });
    const pngQrDataUrl = await api.runtime.media.renderQrPngDataUrl("https://openclaw.ai");
    const tmpRoot = resolvePreferredOpenClawTmpDir();
    const pngQrFile = await api.runtime.media.writeQrPngTempFile("https://openclaw.ai", {
      tmpRoot,
      dirPrefix: "my-plugin-qr-",
      fileName: "qr.png",
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.config">
    当前运行时配置快照和事务性配置写入。优先使用已经传递到活动调用路径中的配置；仅当处理程序直接需要进程快照时才使用 `current()`。

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` 和 `replaceConfigFile(...)` 返回一个 `followUp` 值，例如 `{ mode: "restart", requiresRestart: true, reason }`，它记录写入者的意图而不从网关接管重启控制。

  </Accordion>
  <Accordion title="api.runtime.system">
    系统级实用程序。

    ```typescript
    await api.runtime.system.enqueueSystemEvent(event);
    api.runtime.system.requestHeartbeat({
      source: "other",
      intent: "event",
      reason: "plugin-event",
    });
    api.runtime.system.requestHeartbeatNow({ reason: "plugin-event" }); // Deprecated compatibility alias.
    const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
    const hint = api.runtime.system.formatNativeDependencyHint(pkg);
    ```

  </Accordion>
  <Accordion title="api.runtime.events">
    事件订阅。

    ```typescript
    api.runtime.events.onAgentEvent((event) => {
      /* ... */
    });
    api.runtime.events.onSessionTranscriptUpdate((update) => {
      /* ... */
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.logging">
    日志记录。

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    模型和提供商的身份验证解析。

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    状态目录解析和基于 SQLite 的键值存储。

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir(process.env);
    const store = api.runtime.state.openKeyedStore<MyRecord>({
      namespace: "my-feature",
      maxEntries: 200,
      defaultTtlMs: 15 * 60_000,
    });

    await store.register("key-1", { value: "hello" });
    const claimed = await store.registerIfAbsent("dedupe-key", { value: "first" });
    const value = await store.lookup("key-1");
    await store.consume("key-1");
    await store.clear();
    ```

    键值存储在重启后仍然存在，并按运行时绑定的插件 ID 进行隔离。使用 `registerIfAbsent(...)` 进行原子去重声明：当键缺失或已过期并被注册时，它返回 `true`；当已存在有效值且不覆盖其值、创建时间或 TTL 时，它返回 `false`。限制：每个命名空间 `maxEntries`，每个插件 6,000 个有效行，JSON 值小于 64KB，以及可选的 TTL 过期时间。当写入操作超过插件的行数上限时，运行时可能会从正在写入的命名空间中逐出最旧的有效行；兄弟命名空间不会因该写入而被逐出，如果命名空间无法释放足够的行，写入仍然会失败。

    <Warning>
    本版本中仅限捆绑插件。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools"CLI>
    内存工具工厂和 CLI。

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.渠道">
    针对渠道的运行时助手（在加载渠道插件时可用）。

    `api.runtime.channel.media` 是用于渠道媒体下载和存储的首选接口：

    ```typescript
    const saved = await api.runtime.channel.media.saveRemoteMedia({
      url,
      subdir: "inbound",
      maxBytes,
      filePathHint: fileName,
    });
    ```

    当远程 URL 应变为 OpenClaw 媒体时，请使用 `saveRemoteMedia(...)`OpenClaw。当插件已使用插件拥有的身份验证、重定向或允许列表处理获取了 `Response` 时，请使用 `saveResponseMedia(...)`。仅当插件需要原始字节进行检查、转换、解密或重新上传时，才使用 `readRemoteMediaBuffer(...)`。`fetchRemoteMedia(...)` 仍然是 `readRemoteMediaBuffer(...)` 的已弃用兼容别名。

    `api.runtime.channel.mentions` 是使用运行时注入的捆绑渠道插件共享的入站提及策略接口：

    ```typescript
    const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
      mentionRegexes,
      mentionPatterns,
    });

    const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
      facts: {
        canDetectMention: true,
        wasMentioned: mentionMatch.matched,
        implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen(
          "reply_to_bot",
          isReplyToBot,
        ),
      },
      policy: {
        isGroup,
        requireMention,
        allowTextCommands,
        hasControlCommand,
        commandAuthorized,
      },
    });
    ```

    可用的提及助手：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` 故意不暴露较旧的 `resolveMentionGating*` 兼容助手。请优先使用标准化的 `{ facts, policy }` 路径。

  </Accordion>
</AccordionGroup>

## 存储运行时引用

使用 `createPluginRuntimeStore` 存储运行时引用，以便在 `register` 回调之外使用：

<Steps>
  <Step title="创建存储">
    ```typescript
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

    const store = createPluginRuntimeStore<PluginRuntime>({
      pluginId: "my-plugin",
      errorMessage: "my-plugin runtime not initialized",
    });
    ```

  </Step>
  <Step title="Wire into the entry point">
    ```typescript
    export default defineChannelPluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Example",
      plugin: myPlugin,
      setRuntime: store.setRuntime,
    });
    ```
  </Step>
  <Step title="Access from other files">
    ```typescript
    export function getRuntime() {
      return store.getRuntime(); // throws if not initialized
    }

    export function tryGetRuntime() {
      return store.tryGetRuntime(); // returns null if not initialized
    }
    ```

  </Step>
</Steps>

<Note>请优先使用 `pluginId` 作为运行时存储标识。较低级别的 `key` 形式仅适用于一个插件故意需要多个运行时槽位的罕见情况。</Note>

## 其他顶级 `api` 字段

除了 `api.runtime`API 之外，API 对象还提供了：

<ParamField path="api.id" type="string">
  插件 ID。
</ParamField>
<ParamField path="api.name" type="string">
  插件显示名称。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  当前配置快照（可用时的活动内存运行时快照）。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  来自 `plugins.entries.<id>.config` 的插件特定配置。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  作用域日志记录器（`debug`、`info`、`warn`、`error`）。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  当前加载模式；`"setup-runtime"` 是轻量级完整条目前启动/设置窗口。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相对于插件根目录的路径。
</ParamField>

## 相关

- [插件内部结构](/zh/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/zh/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概述](/zh/plugins/sdk-overview) — 子路径参考
