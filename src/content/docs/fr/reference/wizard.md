---
summary: "Référence complète pour l'onboarding CLI : chaque étape, indicateur et champ de configuration"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "Onboarding reference"
sidebarTitle: "Référence d'onboarding"
---

Il s'agit de la référence complète pour `openclaw onboard`CLI.
Pour une vue d'ensemble générale, consultez [Onboarding (CLI)](/fr/start/wizard).

## Détails du flux (mode local)

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez **Conserver les valeurs actuelles**, **Réviser et mettre à jour** ou **Réinitialiser avant la configuration**.
    - Le fait de relancer l'onboarding **ne** supprime rien à moins que vous ne choisissiez explicitement **Réinitialiser**
      (ou que vous passiez `--reset`).
    - La CLI `--reset` par défaut est `config+creds+sessions` ; utilisez `--reset-scope full`
      pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés obsolètes, l'assistant s'arrête et vous demande
      d'exécuter `openclaw doctor` avant de continuer.
    - La réinitialisation utilise `trash` (jamais `rm`) et propose des portées :
      - Configuration uniquement
      - Configuration + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)

  </Step>
  <Step title="Modèle/Auth">
    - **Clé API AnthropicAPI** : utilise `ANTHROPIC_API_KEY` si elle est présente ou demande une clé, puis l'enregistre pour une utilisation par le démon.
    - **Clé API AnthropicAPI** : choix préféré de l'assistant Anthropic dans l'intégration/configuration.
    - **Jeton de configuration Anthropic** : toujours disponible dans l'intégration/configuration, bien que OpenClaw préfère désormais la réutilisation du CLI Claude lorsque cela est possible.
    - **Abonnement OpenAI Code (Codex) (OAuth)** : flux dans le navigateur ; collez le `code#state`.
      - Définit `agents.defaults.model` sur `openai/gpt-5.5` via le runtime Codex lorsque le modèle n'est pas défini ou fait déjà partie de la famille OpenAI.
    - **Abonnement OpenAI Code (Codex) (appareillage de l'appareil)** : flux d'appareillage dans le navigateur avec un code d'appareil à courte durée de vie.
      - Définit `agents.defaults.model` sur `openai/gpt-5.5` via le runtime Codex lorsque le modèle n'est pas défini ou fait déjà partie de la famille OpenAI.
    - **Clé API OpenAIAPI** : utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis la stocke dans les profils d'authentification.
      - Définit `agents.defaults.model` sur `openai/gpt-5.5` lorsque le modèle n'est pas défini, `openai/*`, ou des références de modèle Codex héritées.
    - **xAI (Grok) OAuthAPI / Clé API** : se connecte avec xAI OAuth lorsqu'il est choisi, ou demande `XAI_API_KEY`API sur le chemin de la clé API, et configure xAI comme fournisseur de modèle.
    - **OpenCode** : demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`, obtenez-le sur https://opencode.ai/auth) et vous permet de choisir le catalogue Zen ou Go.
    - **Ollama** : propose d'abord **Cloud + Local**, **Cloud uniquement** ou **Local uniquement**. `Cloud only` demande `OLLAMA_API_KEY` et utilise `https://ollama.com` ; les modes pris en charge par l'hôte demandent l'URL de base Ollama, découvrent les modèles disponibles et téléchargent automatiquement le modèle local sélectionné si nécessaire ; `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès au cloud.
    - Plus de détails : [Ollama](/fr/providers/ollamaAPI)
    - **Clé API** : stocke la clé pour vous.
    - **Vercel AI Gateway (proxy multi-modèle)** : demande `AI_GATEWAY_API_KEY`.
    - Plus de détails : [Vercel AI Gateway](/fr/providers/vercel-ai-gateway)
    - **Gateway AI Cloudflare** : demande l'ID de compte, l'ID de Gateway et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Plus de détails : [Gateway AI Cloudflare](/fr/providers/cloudflare-ai-gateway)
    - **MiniMax** : la configuration est écrite automatiquement ; l'hébergement par défaut est `MiniMax-M2.7`API.
      La configuration de la clé API utilise `minimax/...` et la configuration OAuth utilise
      `minimax-portal/...`.
    - Plus de détails : [MiniMax](/fr/providers/minimax)
    - **StepFun** : la configuration est écrite automatiquement pour StepFun standard ou Step Plan sur les points de terminaison chinois ou mondiaux.
    - Standard comprend actuellement `step-3.5-flash` et Step Plan comprend également `step-3.5-flash-2603`.
    - Plus de détails : [StepFun](/fr/providers/stepfun)
    - **Synthétique (compatible Anthropic)** : demande `SYNTHETIC_API_KEY`.
    - Plus de détails : [Synthétique](/fr/providers/synthetic)
    - **Moonshot (Kimi K2)** : la configuration est écrite automatiquement.
    - **Kimi Coding** : la configuration est écrite automatiquement.
    - Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshotAPI)
    - **Ignorer** : aucune authentification configurée pour le moment.
    - Choisissez un modèle par défaut parmi les options détectées (ou entrez le fournisseur/modèle manuellement). Pour une meilleure qualité et un risque moindre d'injection de prompt, choisissez le modèle de la plus récente génération le plus puissant disponible dans votre pile de fournisseurs.
    - L'intégration exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou manque d'authentification.
    - Le mode de stockage des clés API est défini par défaut sur des valeurs de profil d'authentification en texte clair. Utilisez `--secret-input-mode ref` pour stocker des références basées sur des variables d'environnement à la place (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Les profils d'authentification se trouvent dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`API (clés API + OAuth). `~/.openclaw/credentials/oauth.json` est une importation héritée uniquement.
    - Plus de détails : [/concepts/oauth](/fr/concepts/oauth)
    <Note>
    Conseil pour headless/serveur : complétez l'OAuth sur une machine avec un navigateur, puis copiez
    le `auth-profiles.json` de cet agent (par exemple
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, ou le chemin correspondant
    `$OPENCLAW_STATE_DIR/...`) vers l'hôte de la passerelle. `credentials/oauth.json`
    n'est qu'une source d'importation héritée.
    </Note>
  </Step>
  <Step title="Espace de travail">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires au rituel d'amorçage de l'agent.
    - Guide complet de la disposition et de la sauvegarde de l'espace de travail : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

  </Step>
  <Step title="GatewayGateway">
    - Port, liaison, mode d'authentification, exposition Tailscale.
    - Recommandation d'authentification : conservez le **Jeton (Token)**, même pour la boucle locale, afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive offre :
      - **Générer/stocker le jeton en texte brut** (par défaut)
      - **Utiliser SecretRef** (optionnel)
      - Le démarrage rapide réutilise les SecretRefs existants `gateway.auth.token` sur les fournisseurs `env`, `file` et `exec` pour l'amorçage de la sonde/tableau de bord d'onboarding.
      - Si ce SecretRef est configuré mais ne peut pas être résolu, l'onboarding échoue tôt avec un message de correction clair au lieu de dégrader silencieusement l'authentification d'exécution.
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en texte brut ou SecretRef.
    - Chemin SecretRef du jeton en mode non interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une env var non vide dans l'environnement du processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites entièrement confiance à chaque processus local.
    - Les liaisons non boucle locale nécessitent toujours une authentification.

  </Step>
  <Step title="Canaux"WhatsApp>
    - [WhatsApp](/fr/channels/whatsappTelegram) : connexion QR optionnelle.
    - [Telegram](/fr/channels/telegramDiscord) : jeton de bot.
    - [Discord](/en/channels/discordGoogle Chat) : jeton de bot.
    - [Google Chat](/fr/channels/googlechatMattermost) : JSON de compte de service + audience webhook.
    - [Mattermost](/fr/channels/mattermostSignal) (plugin) : jeton de bot + URL de base.
    - [Signal](/fr/channels/signal) : installation optionnelle de `signal-cli`iMessage + configuration du compte.
    - [iMessage](/fr/channels/imessage) : chemin du `imsg` CLI + accès à la base de données Messages ; utilisez un wrapper SSH lorsque le Gateway s'exécute hors Mac.
    - Sécurité DM : la valeur par défaut est le jumelage. Le premier DM envoie un code ; approuvez via `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.

  </Step>
  <Step title="Recherche Web">
    - Choisissez un fournisseur pris en charge tel que Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG ou Tavily (ou ignorez).
    - Les fournisseurs basés sur une API peuvent utiliser des variables d'environnement ou une configuration existante pour une configuration rapide ; les fournisseurs sans clé utilisent plutôt leurs prérequis spécifiques au fournisseur.
    - Ignorer avec `--skip-search`.
    - Configurer plus tard : `openclaw configure --section web`.

  </Step>
  <Step title="Daemon install">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connectée ; pour sans tête, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux (et Windows via WSL2) : unité utilisateur systemd
      - L'onboarding tente d'activer le mode persistant via `loginctl enable-linger <user>` afin que le Gateway reste actif après la déconnexion.
      - Peut demander sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - **Sélection du runtime :** Node (recommandé ; requis pour WhatsApp/Telegram). Bun est **non recommandé**.
    - Si l'authentification par token nécessite un token et que `gateway.auth.token` est géré par SecretRef, l'installation du daemon le valide mais ne persiste pas les valeurs de token en texte brut résolues dans les métadonnées d'environnement du service superviseur.
    - Si l'authentification par token nécessite un token et que le SecretRef de token configuré n'est pas résolu, l'installation du daemon est bloquée avec des instructions exploitables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, l'installation du daemon est bloquée jusqu'à ce que le mode soit défini explicitement.

  </Step>
  <Step title="Health check">
    - Démarre le Gateway (si nécessaire) et exécute `openclaw health`.
    - Astuce : `openclaw status --deep` ajoute la sonde de santé active de la passerelle à la sortie de statut, incluant les sondes de canal lorsque supporté (nécessite une passerelle accessible).

  </Step>
  <Step title="Skills (recommended)">
    - Lit les compétences (Skills) disponibles et vérifie les prérequis.
    - Vous permet de choisir un gestionnaire de nœuds : **npm / pnpm** (bun non recommandé).
    - Installe les dépendances facultatives (certains utilisent Homebrew sur macOS).

  </Step>
  <Step title="Finish">
    - Résumé + étapes suivantes, y compris l'invite **Comment souhaitez-vous faire éclore votre agent ?** pour Terminal, Navigateur ou plus tard.

  </Step>
</Steps>

<Note>Si aucune interface graphique n'est détectée, l'onboarding imprime les instructions de transfert de port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les assets de l'interface de contrôle sont manquants, l'onboarding tente de les construire ; le repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface).</Note>

## Mode non interactif

Utilisez `--non-interactive` pour automatiser ou scripter l'onboarding :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Ajoutez `--json` pour un résumé lisible par machine.

SecretRef du jeton Gateway en mode non interactif :

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` et `--gateway-token-ref-env` sont mutuellement exclusifs.

<Note>`--json` n'implique **pas** le mode non interactif. Utilisez `--non-interactive` (et `--workspace`) pour les scripts.</Note>

Les exemples de commandes spécifiques aux fournisseurs se trouvent dans [CLI Automation](/fr/start/wizard-cli-automation#provider-specific-examples).
Utilisez cette page de référence pour la sémantique des indicateurs et l'ordre des étapes.

### Ajouter un agent (non-interactif)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Assistant RPC Gateway

Le Gateway expose le flux d'onboarding via RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Les clients (application macOS, UI de contrôle) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

## Configuration Signal (signal-cli)

L'onboarding peut installer `signal-cli` depuis les versions GitHub :

- Télécharge l'actif de version approprié.
- Le stocke sous `~/.openclaw/tools/signal-cli/<version>/`.
- Écrit `channels.signal.cliPath` dans votre configuration.

Notes :

- Les builds JVM nécessitent **Java 21**.
- Les builds natifs sont utilisés lorsqu'ils sont disponibles.
- Windows utilise WSL2 ; l'installation de signal-cli suit le flux Linux à l'intérieur de WSL.

## Ce que l'assistant écrit

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'onboarding local par défaut est `"coding"` si non défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (détails du comportement : [CLI Setup Reference](/fr/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listes d'autorisation de canal (Slack/Discord/Matrix/Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID lorsque cela est possible).
- `skills.install.nodeManager`
  - `setup --node-manager` accepte `npm`, `pnpm` ou `bun`.
  - La configuration manuelle peut toujours utiliser `yarn` en définissant directement `skills.install.nodeManager`.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et l'optionnel `bindings`.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

Certains canaux sont fournis sous forme de plugins. Lorsque vous en sélectionnez un lors de la configuration, l'onboarding
vous invitera à l'installer (npm ou un chemin local) avant qu'il puisse être configuré.

## Documentation connexe

- Aperçu de l'onboarding : [Onboarding (CLI)](/fr/start/wizard)
- Onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Référence de configuration : [Gateway configuration](/fr/gateway/configuration)
- Fournisseurs : [WhatsApp](/fr/channels/whatsapp), [Telegram](/fr/channels/telegram), [Discord](/fr/channels/discord), [Google Chat](/fr/channels/googlechat), [Signal](/fr/channels/signal), [iMessage](/fr/channels/imessage)
- Compétences : [Skills](/fr/tools/skills), [Skills config](/fr/tools/skills-config)
