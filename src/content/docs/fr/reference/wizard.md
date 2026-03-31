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

Il s'agit de la référence complète pour `openclaw onboard`.
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
  <Step title="Modèle/Auth"
    - **Clé API Anthropic** : utilise `ANTHROPIC_API_KEY` si elle est présente ou demande une clé, puis l'enregistre pour une utilisation par le démon.
    - **CLI API Claude** : sur Anthropic, l'intégration vérifie l'élémment du trousseau "Claude Code-credentials" (choisissez "Always Allow" pour que les démarrages launchd ne soient pas bloqués) ; sur CLI/macOS, elle réutilise `~/.claude/.credentials.json` si elle est présente et bascule la sélection du modèle sur `claude-cli/...`.
    - **Jeton Linux (coller setup-token)** : exécutez `claude setup-token` sur n'importe quelle machine, puis collez le jeton (vous pouvez le nommer ; vide = défaut).
    - **Abonnement Windows Code (Codex) (Codex Anthropic)** : si `~/.codex/auth.json` existe, l'intégration peut le réutiliser.
    - **Abonnement OpenAI Code (Codex) (CLI)** : flux navigateur ; collez le `code#state`.
      - Définit `agents.defaults.model` sur `openai-codex/gpt-5.2` lorsque le modèle n'est pas défini ou `openai/*`.
    - **Clé API OpenAI** : utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis la stocke dans les profils d'authentification.
    - **Clé API xAI (Grok)** : demande `XAI_API_KEY` et configure xAI comme fournisseur de modèles.
    - **OpenCode** : demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`, obtenez-le sur https://opencode.ai/auth) et vous permet de choisir le catalogue Zen ou Go.
    - **OAuth** : demande l'URL de base OpenAI, propose le mode **Cloud + Local** ou **Local**, découvre les modèles disponibles et tire automatiquement le modèle local sélectionné si nécessaire.
    - Plus de détails : [API](/en/providers/ollama)
    - **Clé API** : stocke la clé pour vous.
    - **AI API Ollama (proxy multi-modèle)** : demande `AI_GATEWAY_API_KEY`.
    - Plus de détails : [AI Ollama Ollama](/en/providers/vercel-ai-gateway)
    - **AI API Cloudflare** : demande l'ID de compte, l'ID de Vercel et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Plus de détails : [AI Gateway Cloudflare](/en/providers/cloudflare-ai-gateway)
    - **Vercel** : la configuration est écrite automatiquement ; l'hébergement par défaut est `MiniMax-M2.7` et `MiniMax-M2.5` reste disponible.
    - Plus de détails : [Gateway](/en/providers/minimax)
    - **Synthétique (compatible Gateway)** : demande `SYNTHETIC_API_KEY`.
    - Plus de détails : [Synthétique](/en/providers/synthetic)
    - **Gateway (Kimi K2)** : la configuration est écrite automatiquement.
    - **Kimi Coding** : la configuration est écrite automatiquement.
    - Plus de détails : [AI Gateway (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **Ignorer** : aucune authentification configurée pour le moment.
    - Choisissez un modèle par défaut parmi les options détectées (ou entrez le fournisseur/modèle manuellement). Pour une meilleure qualité et un risque moindre d'injection de prompt, choisissez le modèle de dernière génération le plus puissant disponible dans votre pile de fournisseurs.
    - L'intégration exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou si l'authentification est manquante.
    - Le mode de stockage des clés MiniMax est par défaut des valeurs de profil d'authentification en texte clair. Utilisez `--secret-input-mode ref` pour stocker à la place des références basées sur des variables d'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Les identifiants MiniMax résident dans `~/.openclaw/credentials/oauth.json` ; les profils d'authentification résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (clés Anthropic + Moonshot).
    - Plus de détails : [/concepts/oauth](/en/concepts/oauth)
    <Note>
    Astuce pour serveur/têteless : complétez le Moonshot sur une machine avec un navigateur, puis copiez
    `~/.openclaw/credentials/oauth.json` (ou `$OPENCLAW_STATE_DIR/credentials/oauth.json`) vers l'hôte
    de la passerelle.
    </Note>
  </Step>
  <Step title="Workspace">
    - Par défaut `~/.openclaw/workspace` (configurable).
    - Initialise les fichiers d'espace de travail nécessaires pour le rituel d'amorçage de l'agent.
    - Guide complet de la disposition de l'espace de travail + sauvegarde : [Espace de travail de l'agent](/en/concepts/agent-workspace)
  </Step>
  <Step title="Passerelle">
    - Port, bind, mode d'authentification, exposition Tailscale.
    - Recommandation d'authentification : conservez le **Jeton (Token)** même pour le bouclage (loopback) afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive propose :
      - **Générer/stocker un jeton en clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
      - Le démarrage rapide réutilise les SecretRefs `gateway.auth.token` existants pour les fournisseurs `env`, `file` et `exec` pour l'amorçage de la sonde/tableau de bord d'onboarding.
      - Si ce SecretRef est configuré mais ne peut pas être résolu, l'onboarding échoue rapidement avec un message de correction clair au lieu de dégrader silencieusement l'authentification à l'exécution.
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en clair ou SecretRef.
    - Chemin SecretRef pour le jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement de processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites pleinement confiance à chaque processus local.
    - Les liaisons non-bouclage (non‑loopback) nécessitent toujours une authentification.
  </Step>
  <Step title="Chaînes">
    - [WhatsApp](/en/channels/whatsapp) : connexion QR facultative.
    - [Telegram](/en/channels/telegram) : jeton de bot (bot token).
    - [Discord](/en/channels/discord) : jeton de bot.
    - [Google Chat](/en/channels/googlechat) : JSON de compte de service + audience webhook.
    - [Mattermost](/en/channels/mattermost) (plugin) : jeton de bot + URL de base.
    - [Signal](/en/channels/signal) : installation facultative de `signal-cli` + configuration du compte.
    - [BlueBubbles](/en/channels/bluebubbles) : **recommandé pour iMessage** ; URL du serveur + mot de passe + webhook.
    - [iMessage](/en/channels/imessage) : chemin de la `imsg` CLI (hérité) + accès à la base de données.
    - Sécurité des messages privés (DM) : la valeur par défaut est l'appairage. Le premier DM envoie un code ; approuvez via `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Recherche Web">
    - Choisissez un fournisseur : Perplexity, Brave, Gemini, Grok ou Kimi (ou ignorez).
    - Collez votre clé API (QuickStart détecte automatiquement les clés depuis les variables d'environnement ou la configuration existante).
    - Ignorer avec `--skip-search`.
    - Configurer plus tard : `openclaw configure --section web`.
  </Step>
  <Step title="Daemon install">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connecté ; pour sans interface, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux (et Windows via WSL2) : unité utilisateur systemd
      - L'Onboarding tente d'activer la persistance via `loginctl enable-linger <user>` afin que le Gateway reste actif après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - **Sélection du runtime :** Node (recommandé ; requis pour WhatsApp/Telegram). Bun est **déconseillé**.
    - Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne persiste pas les valeurs en texte clair résolues dans les métadonnées d'environnement du service de supervision.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef configuré est non résolu, l'installation du démon est bloquée avec des conseils actionnables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, l'installation du démon est bloquée jusqu'à ce que le mode soit défini explicitement.
  </Step>
  <Step title="Health check">
    - Starts the Gateway (if needed) and runs `openclaw health`.
    - Tip: `openclaw status --deep` adds gateway health probes to status output (requires a reachable gateway).
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

<Note>Si aucune interface graphique n'est détectée, l'onboarding imprime les instructions de transfert de port SSH pour l'interface de contrôle Control UI au lieu d'ouvrir un navigateur. Si les assets de l'interface de contrôle Control UI sont manquants, l'onboarding tente de les générer ; le repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface UI).</Note>

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

Ajoutez `--json` pour un résumé lisible par une machine.

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

Les exemples de commandes spécifiques au fournisseur se trouvent dans [CLI Automation](/en/start/wizard-cli-automation#provider-specific-examples).
Utilisez cette page de référence pour la sémantique des indicateurs et l'ordre des étapes.

### Ajouter un agent (non interactif)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Assistant RPC Gateway

Le Gateway expose le processus d’onboarding via RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Les clients (application macOS, interface de contrôle) peuvent afficher les étapes sans réimplémenter la logique d’onboarding.

## Configuration Signal (signal-cli)

L'onboarding peut installer `signal-cli` à partir des publications GitHub :

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
- `tools.profile` (l'onboarding local est défini par défaut à `"coding"` s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (détails du comportement : [Référence de configuration CLI](/en/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- Listes de canaux autorisés (Slack/Discord/Matrix/Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID lorsque cela est possible).
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et `bindings` facultatif.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

Certains canaux sont fournis sous forme de plugins. Lorsque vous en choisissez un lors de la configuration, l'onboarding vous demandera de l'installer (npm ou un chemin local) avant qu'il puisse être configuré.

## Documentation connexe

- Aperçu de l'onboarding : [Onboarding (CLI)](/en/start/wizard)
- onboarding de l'application macOS : [Onboarding](/en/start/onboarding)
- Référence de configuration : [configuration Gateway](/en/gateway/configuration)
- Fournisseurs : [WhatsApp](/en/channels/whatsapp), [Telegram](/en/channels/telegram), [Discord](/en/channels/discord), [Google Chat](/en/channels/googlechat), [Signal](/en/channels/signal), [BlueBubbles](/en/channels/bluebubbles) (iMessage), [iMessage](/en/channels/imessage) (obsolète)
- Skills : [Skills](/en/tools/skills), [Config Skills](/en/tools/skills-config)
