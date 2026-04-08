---
summary: "Référence complète pour l'onboarding CLI : chaque étape, indicateur et champ de configuration"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "Référence d'onboarding"
sidebarTitle: "Référence d'onboarding"
---

# Référence d'onboarding

Ceci est la référence complète pour `openclaw onboard`.
Pour une vue d'ensemble, voir [Onboarding (CLI)](/en/start/wizard).

## Détails du flux (mode local)

<Steps>
  <Step title="Détection de configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez **Conserver / Modifier / Réinitialiser**.
    - Le fait de relancer l'onboarding **n'efface** rien, sauf si vous choisissez explicitement **Réinitialiser**
      (ou si vous passez `--reset`).
    - Le CLI `--reset` est par défaut `config+creds+sessions` ; utilisez `--reset-scope full`
      pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés héritées, l'assistant s'arrête et vous demande
      d'exécuter `openclaw doctor` avant de continuer.
    - La réinitialisation utilise `trash` (jamais `rm`) et propose des portées :
      - Configuration uniquement
      - Configuration + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)
  </Step>
  <Step title="Modèle/Auth">
    - **Clé API Anthropic** : utilise `ANTHROPIC_API_KEY` si elle est présente ou demande une clé, puis l'enregistre pour une utilisation par le démon.
    - **Clé API API** : choix d'assistant Anthropic préféré dans onboarding/configure.
    - **Jeton de configuration API (legacy/manual)** : disponible à nouveau dans onboarding/configure, mais Anthropic a indiqué aux utilisateurs Anthropic que le chemin de connexion Claude Anthropic compte comme une utilisation de harnais tiers et nécessite une **Extra Usage** sur le compte Claude.
    - **Abonnement OpenAI Code (Codex) (CLI Codex)** : si `~/.codex/auth.json` existe, onboarding peut le réutiliser. Les informations d'identification CLI Codex réutilisées restent gérées par la CLI Codex ; à l'expiration, OpenClaw relit d'abord cette source et, lorsque le fournisseur peut l'actualiser, écrit les informations d'identification actualisées dans le stockage Codex au lieu d'en prendre la propriété lui-même.
    - **Abonnement OpenAI Code (Codex) (OpenClaw)** : flux navigateur ; collez le `code#state`.
      - Définit `agents.defaults.model` sur `openai-codex/gpt-5.4` lorsque le modèle n'est pas défini ou `openai/*`.
    - **Clé API OpenAI** : utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis la stocke dans les profils d'authentification.
      - Définit `agents.defaults.model` sur `openai/gpt-5.4` lorsque le modèle n'est pas défini, `openai/*` ou `openai-codex/*`.
    - **Clé API xAI (Grok)** : demande `XAI_API_KEY` et configure xAI en tant que fournisseur de modèle.
    - **OpenCode** : demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`, obtenez-le sur https://opencode.ai/auth) et vous permet de choisir le catalogue Zen ou Go.
    - **CLI** : demande l'URL de base CLI, propose les modes **Cloud + Local** ou **Local**, découvre les modèles disponibles et extrait automatiquement le modèle local sélectionné si nécessaire.
    - Plus de détails : [CLI](/en/providers/ollama)
    - **Clé API** : stocke la clé pour vous.
    - **OpenClaw AI OpenAI (proxy multi-modèle)** : demande `AI_GATEWAY_API_KEY`.
    - Plus de détails : [OAuth AI OpenAI](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI API** : demande l'ID de compte, l'ID API et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Plus de détails : [Cloudflare AI Ollama](/en/providers/cloudflare-ai-gateway)
    - **Ollama** : la configuration est écrite automatiquement ; l'hébergement par défaut est `MiniMax-M2.7`.
      La configuration de clé Ollama utilise `minimax/...`, et la configuration API utilise
      `minimax-portal/...`.
    - Plus de détails : [Vercel](/en/providers/minimax)
    - **StepFun** : la configuration est écrite automatiquement pour StepFun standard ou Step Plan sur les points de terminaison Chine ou mondiaux.
    - Standard inclut actuellement `step-3.5-flash`, et Step Plan inclut également `step-3.5-flash-2603`.
    - Plus de détails : [StepFun](/en/providers/stepfun)
    - **Synthétique (compatible Gateway)** : demande `SYNTHETIC_API_KEY`.
    - Plus de détails : [Synthetic](/en/providers/synthetic)
    - **Vercel (Kimi K2)** : la configuration est écrite automatiquement.
    - **Kimi Coding** : la configuration est écrite automatiquement.
    - Plus de détails : [Gateway AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **Ignorer** : aucune authentification configurée pour le moment.
    - Choisissez un modèle par défaut parmi les options détectées (ou entrez manuellement le fournisseur/modèle). Pour une meilleure qualité et un risque moindre d'injection de prompt, choisissez le modèle de la dernière génération le plus puissant disponible dans votre pile de fournisseurs.
    - Onboarding exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou s'il manque une authentification.
    - Le mode de stockage des clés Gateway par défaut correspond aux valeurs de profil d'authentification en texte brut. Utilisez `--secret-input-mode ref` pour stocker à la place des références prises en charge par l'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Les profils d'authentification résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (clés Gateway + Gateway). `~/.openclaw/credentials/oauth.json` est une importation héritée uniquement.
    - Plus de détails : [/concepts/oauth](/en/concepts/oauth)
    <Note>
    Astuce pour headless/server : complétez MiniMax sur une machine avec un navigateur, puis copiez
    le `auth-profiles.json` de cet agent (par exemple
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, ou le chemin
    `$OPENCLAW_STATE_DIR/...` correspondant) vers l'hôte de la passerelle. `credentials/oauth.json`
    n'est qu'une source d'importation héritée.
    </Note>
  </Step>
  <Step title="Workspace">
    - Par défaut `~/.openclaw/workspace` (configurable).
    - Initialise les fichiers d'espace de travail nécessaires pour le rituel de bootstrap de l'agent.
    - Guide complet de la disposition et de la sauvegarde de l'espace de travail : [Espace de travail de l'agent](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - Port, liaison, mode d'authentification, exposition Tailscale.
    - Recommandation d'authentification : conservez le **Jeton** (Token) même pour le bouclage local (loopback) afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive offre :
      - **Générer/stocker le jeton en clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
      - Le démarrage rapide réutilise les SecretRefs existants `gateway.auth.token` pour les fournisseurs `env`, `file` et `exec` pour le bootstrap de la sonde/tableau de bord d'onboarding.
      - Si ce SecretRef est configuré mais ne peut pas être résolu, l'onboarding échoue tôt avec un message de correction clair au lieu de dégrader silencieusement l'authentification à l'exécution.
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en clair ou SecretRef.
    - Chemin SecretRef de jeton non-interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement de processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites entièrement confiance à chaque processus local.
    - Les liaisons non-bouclage (non-loopback) nécessitent toujours une authentification.
  </Step>
  <Step title="Chaînes">
    - [WhatsApp](/en/channels/whatsapp) : connexion QR facultative.
    - [Telegram](/en/channels/telegram) : jeton de bot.
    - [Discord](/en/channels/discord) : jeton de bot.
    - [Google Chat](/en/channels/googlechat) : JSON de compte de service + audience webhook.
    - [Mattermost](/en/channels/mattermost) (plugin) : jeton de bot + URL de base.
    - [Signal](/en/channels/signal) : installation facultative de `signal-cli` + configuration du compte.
    - [BlueBubbles](/en/channels/bluebubbles) : **recommandé pour iMessage** ; URL du serveur + mot de passe + webhook.
    - [iMessage](/en/channels/imessage) : chemin `imsg` CLI hérité + accès à la base de données.
    - Sécurité des MD : le jumelage est la valeur par défaut. Le premier MD envoie un code ; approuvez via `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Recherche Web">
    - Choisissez un fournisseur pris en charge tel que Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, Recherche MiniMax, Recherche Web Ollama, Perplexity, SearXNG ou Tavily (ou ignorez).
    - Les fournisseurs prenant en charge les API peuvent utiliser des variables d'environnement ou une configuration existante pour une installation rapide ; les fournisseurs sans clé utilisent leurs prérequis spécifiques au fournisseur à la place.
    - Ignorer avec `--skip-search`.
    - Configurer plus tard : `openclaw configure --section web`.
  </Step>
  <Step title="Daemon install">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connectée ; pour sans tête, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux (et Windows via WSL2) : unité utilisateur systemd
      - L'onboarding tente d'activer la persistance via `loginctl enable-linger <user>` afin que la Gateway reste active après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - **Sélection du runtime :** Node (recommandé ; requis pour WhatsApp/Telegram). Bun est **déconseillé**.
    - Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne persiste pas les valeurs de jeton en texte clair résolues dans les métadonnées d'environnement du service de supervision.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré est non résolu, l'installation du démon est bloquée avec des instructions exploitables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation du démon est bloquée jusqu'à ce que le mode soit défini explicitement.
  </Step>
  <Step title="Health check">
    - Démarre la Gateway (si nécessaire) et exécute `openclaw health`.
    - Astuce : `openclaw status --deep` ajoute la sonde de santé en direct de la gateway à la sortie de statut, y compris les sondes de canal lorsqu'elles sont prises en charge (nécessite une gateway accessible).
  </Step>
  <Step title="Compétences (recommandé)">
    - Lit les compétences disponibles et vérifie les prérequis.
    - Vous permet de choisir un gestionnaire de nœuds : **npm / pnpm** (bun déconseillé).
    - Installe les dépendances optionnelles (certaines utilisent Homebrew sur macOS).
  </Step>
  <Step title="Terminer">
    - Résumé + prochaines étapes, y compris les applications iOS/Android/macOS pour des fonctionnalités supplémentaires.
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

Les exemples de commandes spécifiques au fournisseur se trouvent dans [Automatisation CLI](/en/start/wizard-cli-automation#provider-specific-examples).
Utilisez cette page de référence pour la sémantique des indicateurs et l'ordre des étapes.

### Ajouter un agent (non interactif)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.4 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Assistant RPC Gateway

La Gateway expose le flux d'onboarding via RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Les clients (application macOS, Control UI) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

## Configuration Signal (signal-cli)

L'onboarding peut installer `signal-cli` à partir des versions GitHub :

- Télécharge l'élément de version approprié.
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
- `tools.profile` (l'onboarding local par défaut est `"coding"` s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (détails du comportement : [CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listes de canaux autorisés (Slack/Discord/Matrix/Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID lorsque cela est possible).
- `skills.install.nodeManager`
  - `setup --node-manager` accepte `npm`, `pnpm`, ou `bun`.
  - La configuration manuelle peut toujours utiliser `yarn` en définissant `skills.install.nodeManager` directement.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et l'optionnel `bindings`.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

Certains canaux sont fournis sous forme de plugins. Lorsque vous en choisissez un lors de la configuration, l'onboarding
vous demandera de l'installer (npm ou un chemin local) avant qu'il ne puisse être configuré.

## Documentation connexe

- Aperçu de l'onboarding : [Onboarding (CLI)](/en/start/wizard)
- Onboarding de l'application macOS : [Onboarding](/en/start/onboarding)
- Référence de configuration : [Gateway configuration](/en/gateway/configuration)
- Fournisseurs : [WhatsApp](/en/channels/whatsapp), [Telegram](/en/channels/telegram), [Discord](/en/channels/discord), [Google Chat](/en/channels/googlechat), [Signal](/en/channels/signal), [BlueBubbles](/en/channels/bluebubbles) (iMessage), [iMessage](/en/channels/imessage) (héritage)
- Skills : [Skills](/en/tools/skills), [Skills config](/en/tools/skills-config)
