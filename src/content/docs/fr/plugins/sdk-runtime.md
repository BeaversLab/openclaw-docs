---
summary: "api.runtime -- les assistants d'exécution injectés disponibles pour les plugins"
title: "Assistants d'exécution de plugin"
sidebarTitle: "Assistants d'exécution"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

Référence pour l'objet `api.runtime` injecté dans chaque plugin lors de l'enregistrement. Utilisez ces assistants au lieu d'importer directement les composants internes de l'hôte.

<CardGroup cols={2}>
  <Card title="Plugins de canal" href="/fr/plugins/sdk-channel-plugins">
    Guide étape par étape qui utilise ces assistants dans le contexte des plugins de canal.
  </Card>
  <Card title="Plugins de fournisseur" href="/fr/plugins/sdk-provider-plugins">
    Guide étape par étape qui utilise ces assistants dans le contexte des plugins de fournisseur.
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Chargement et écriture de la configuration

Préférez la configuration qui a déjà été transmise dans le chemin d'appel actif, par exemple `api.config` lors de l'enregistrement ou un argument `cfg` sur les rappels de canal/fournisseur. Cela permet à un instantané du processus de circuler à travers le travail au lieu de réanalyser la configuration sur les chemins critiques.

Utilisez `api.runtime.config.current()` uniquement lorsqu'un gestionnaire à longue durée de vie a besoin de l'instantané actuel du processus et qu'aucune configuration n'a été transmise à cette fonction. La valeur retournée est en lecture seule ; clonez-la ou utilisez un assistant de mutation avant de la modifier.

Les fabriques d'outils reçoivent `ctx.runtimeConfig` ainsi que `ctx.getRuntimeConfig()`. Utilisez le getter dans le rappel `execute` d'un outil à longue durée de vie lorsque la configuration peut changer après la création de la définition de l'outil.

Persistez les modifications avec `api.runtime.config.mutateConfigFile(...)` ou `api.runtime.config.replaceConfigFile(...)`. Chaque écriture doit choisir une stratégie `afterWrite` explicite :

- `afterWrite: { mode: "auto" }` laisse le planificateur de rechargement de la passerelle décider.
- `afterWrite: { mode: "restart", reason: "..." }` force un redémarrage propre lorsque l'enregistreur sait que le rechargement à chaud n'est pas sûr.
- `afterWrite: { mode: "none", reason: "..." }` supprime le rechargement/redémarrage automatique uniquement lorsque l'appelant gère la suite.

Les assistants de mutation renvoient `afterWrite` ainsi qu'un résumé `followUp` typé, afin que les appelants puissent enregistrer ou tester s'ils ont demandé un redémarrage. La passerelle conserve toujours la responsabilité du moment où ce redémarrage se produit réellement.

`api.runtime.config.loadConfig()` et `api.runtime.config.writeConfigFile(...)` sont des assistants de compatibilité obsolètes sous `runtime-config-load-write`. Ils avertissent une fois lors de l'exécution et restent disponibles pour les anciens plugins externes durant la fenêtre de migration. Les plugins intégrés ne doivent pas les utiliser ; les gardes de la limite de configuration échouent si le code du plugin les appelle ou importe ces assistants depuis les sous-chemins du SDK du plugin.

Pour les importations directes du SDK, utilisez les sous-chemins de configuration ciblés au lieu du baril de compatibilité large `openclaw/plugin-sdk/config-runtime` : `config-types` pour les types, `plugin-config-runtime` pour les assertions de configuration déjà chargées et la recherche d'entrées de plugin, `runtime-config-snapshot` pour les instantanés du processus actuel, et `config-mutation` pour les écritures. Les tests des plugins intégrés doivent simuler directement ces sous-chemins ciblés au lieu de simuler le baril de compatibilité large.

Le code d'exécution interne d'OpenClaw suit la même direction : charger la configuration une fois à la limite du CLI, de la passerelle ou du processus, puis transmettre cette valeur. Les écritures de mutation réussies actualisent l'instantané d'exécution du processus et avancent sa révision interne ; les caches à longue durée de vie doivent utiliser la clé de cache détenue par l'exécution au lieu de sérialiser la configuration localement. Les modules d'exécution à longue durée de vie disposent d'un scanner à tolérance zéro pour les `loadConfig()` ambiants ; utilisez un `cfg` transmis, une `context.getRuntimeConfig()` de requête, ou un `getRuntimeConfig()` à une limite de processus explicite.

## Espaces de noms d'exécution

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Identité de l'agent, répertoires et gestion de session.

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

    `runEmbeddedAgent(...)` est la fonction d'aide neutre pour démarrer un tour d'agent OpenClaw normal depuis le code du plugin. Elle utilise la même résolution de provider/modèle et la même sélection de harnais d'agent que les réponses déclenchées par le channel.

    `runEmbeddedPiAgent(...)` reste un alias de compatibilité.

    `resolveThinkingPolicy(...)` retourne les niveaux de réflexion pris en charge par le provider/modèle et l'option par défaut facultative. Les plugins provider possèdent le profil spécifique au modèle via leurs hooks de réflexion (thinking), donc les plugins tool doivent appeler cette fonction d'aide d'exécution plutôt que d'importer ou de dupliquer les listes de providers.

    `normalizeThinkingLevel(...)` convertit le texte utilisateur tel que `on`, `x-high` ou `extra high` au niveau stocké canonique avant de le vérifier par rapport à la stratégie résolue.

    Les **fonctions d'aide du magasin de session** se trouvent sous `api.runtime.agent.session` :

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(cfg);
    await api.runtime.agent.session.saveSessionStore(cfg, store);
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    Constantes de modèle et de provider par défaut :

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>
  <Accordion title="api.runtime.subagent">
    Lancer et gérer les exécutions de sous-agent en arrière-plan.

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
    Les substitutions de modèle (`provider`/`model`) nécessitent un opt-in de l'opérateur via `plugins.entries.<id>.subagent.allowModelOverride: true` dans la configuration. Les plugins non approuvés peuvent toujours exécuter des sous-agents, mais les demandes de substitution sont rejetées.
    </Warning>

    `deleteSession(...)` peut supprimer les sessions créées par le même plugin via `api.runtime.subagent.run(...)`. La suppression de sessions utilisateur ou opérateur arbitraires nécessite toujours une requête Gateway avec portée administrateur.

  </Accordion>
  <Accordion title="api.runtime.nodes">
    Lister les nœuds connectés et invoquer une commande node-hôte à partir du code de plugin chargé par le Gateway ou à partir des commandes CLI du plugin. Utilisez ceci lorsqu'un plugin possède le travail local sur un appareil couplé, par exemple un navigateur ou un pont audio sur un autre Mac.

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    À l'intérieur du Gateway, ce runtime est en processus. Dans les commandes CLI du plugin, il appelle le Gateway configuré via RPC, donc les commandes telles que `openclaw googlemeet recover-tab` peuvent inspecter les nœuds couplés depuis le terminal. Les commandes de nœud passent toujours par le couplage de nœud normal du Gateway, les listes d'autorisation de commandes et le gestionnaire de commandes local du nœud.

  </Accordion>
  <Accordion title="api.runtime.taskFlow">
    Lier un runtime Task Flow à une clé de session OpenClaw existante ou à un contexte d'outil de confiance, puis créer et gérer des Task Flows sans passer de propriétaire à chaque appel.

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

    Utilisez `bindSession({ sessionKey, requesterOrigin })` lorsque vous possédez déjà une clé de session OpenClaw de confiance issue de votre propre couche de liaison. Ne liez pas à partir de la saisie utilisateur brute.

  </Accordion>
  <Accordion title="api.runtime.tts">
    Synthèse vocale (texte-vers-parole).

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

    Utilise la configuration `messages.tts` principale et la sélection du provider. Renvoie le tampon audio PCM + la fréquence d'échantillonnage.

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    Analyse d'image, audio et vidéo.

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

    Renvoie `{ text: undefined }` lorsqu aucune sortie n'est produite (par ex. entrée ignorée).

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité pour `api.runtime.mediaUnderstanding.transcribeAudioFile(...)`.
    </Info>

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    Génération d'images.

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    Recherche Web.

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    Utilitaires multimédia de bas niveau.

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
    Instantané de la configuration d'exécution actuelle et écritures de configuration transactionnelles. Privilégiez
    la configuration qui a déjà été transmise au chemin d'appel actif ; utilisez
    `current()` uniquement lorsque le gestionnaire a besoin directement de l'instantané du processus.

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` et `replaceConfigFile(...)` renvoient une valeur `followUp`,
    par exemple `{ mode: "restart", requiresRestart: true, reason }`,
    qui enregistre l'intention de l'enregistreur sans retirer le contrôle de redémarrage à la
    passerelle.

  </Accordion>
  <Accordion title="api.runtime.system">
    Utilitaires de niveau système.

    ```typescript
    await api.runtime.system.enqueueSystemEvent(event);
    api.runtime.system.requestHeartbeatNow();
    const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
    const hint = api.runtime.system.formatNativeDependencyHint(pkg);
    ```

  </Accordion>
  <Accordion title="api.runtime.events">
    Abonnements aux événements.

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
    Journalisation.

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    Résolution de l'authentification du modèle et du provider.

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    Résolution du répertoire d'état.

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir();
    ```

  </Accordion>
  <Accordion title="api.runtime.tools">
    Fabriques d'outils (tools) mémoire et CLI.

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    Assistants d'exécution spécifiques au canal (disponibles lorsqu'un plugin de canal est chargé).

    `api.runtime.channel.mentions` est la surface partagée de stratégie de mention entrante pour les plugins de canal groupés qui utilisent l'injection d'exécution :

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

    Assistants de mention disponibles :

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` n'expose pas intentionnellement les anciens assistants de compatibilité `resolveMentionGating*`. Préférez le chemin normalisé `{ facts, policy }`.

  </Accordion>
</AccordionGroup>

## Stockage des références d'exécution

Utilisez `createPluginRuntimeStore` pour stocker la référence d'exécution pour une utilisation en dehors du rappel `register` :

<Steps>
  <Step title="Créer le magasin">
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

<Note>Préférez `pluginId` pour l'identité du magasin d'exécution. Le formulaire de niveau inférieur `key` est destiné aux cas peu courants où un plugin a intentionnellement besoin de plus d'un emplacement d'exécution.</Note>

## Autres champs de niveau supérieur `api`

Au-delà de `api.runtime`, l'objet API fournit également :

<ParamField path="api.id" type="string">
  ID du plugin.
</ParamField>
<ParamField path="api.name" type="string">
  Nom d'affichage du plugin.
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible).
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  Configuration spécifique au plugin provenant de `plugins.entries.<id>.config`.
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  Journalleur délimité (`debug`, `info`, `warn`, `error`).
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de démarrage/configuration pré-initialisation complète.
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  Résout un chemin relatif à la racine du plugin.
</ParamField>

## Connexes

- [Internes du plugin](/fr/plugins/architecture) — modèle de capacité et registre
- [Points d'entrée du SDK](/fr/plugins/sdk-entrypoints) — options `definePluginEntry`
- [Aperçu du SDK](/fr/plugins/sdk-overview) — référence de sous-chemin
