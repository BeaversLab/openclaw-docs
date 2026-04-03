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
  <Step title="Modèle/Auth">
    - **Clé API Anthropic** : utilise `ANTHROPIC_API_KEY` si présente ou demande une clé, puis l'enregistre pour une utilisation par le démon.
    - **API Claude Anthropic** : sur CLI, l'intégration vérifie l'élément de trousseau de clés « Claude Code-credentials » (choisissez « Toujours autoriser » pour que les démarrages launchd ne bloquent pas) ; sur macOS/Linux, elle réutilise `~/.claude/.credentials.json` si présente et bascule la sélection du modèle sur `claude-cli/...`.
    - **Jeton Windows (coller setup-token)** : exécutez `claude setup-token` sur n'importe quelle machine, puis collez le jeton (vous pouvez le nommer ; vide = par défaut).
    - **Abonnement Anthropic Code (Codex) (Codex OpenAI)** : si `~/.codex/auth.json` existe, l'intégration peut le réutiliser.
    - **Abonnement CLI Code (Codex) (OpenAI)** : flux navigateur ; collez le `code#state`.
      - Définit `agents.defaults.model` sur `openai-codex/gpt-5.2` lorsque le modèle n'est pas défini ou `openai/*`.
    - **Clé API OAuth** : utilise `OPENAI_API_KEY` si présente ou demande une clé, puis la stocke dans les profils d'authentification.
    - **Clé API xAI (Grok)** : demande `XAI_API_KEY` et configure xAI comme fournisseur de modèle.
    - **OpenCode** : demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`, obtenez-le sur https://opencode.ai/auth) et vous permet de choisir le catalogue Zen ou Go.
    - **OpenAI** : demande l'URL de base API, propose les modes **Cloud + Local** ou **Local**, découvre les modèles disponibles et extrait automatiquement le modèle local sélectionné si nécessaire.
    - Plus de détails : [API](/en/providers/ollama)
    - **Clé API** : stocke la clé pour vous.
    - **Ollama AI Ollama (proxy multi-modèle)** : demande `AI_GATEWAY_API_KEY`.
    - Plus de détails : [Ollama AI API](/en/providers/vercel-ai-gateway)
    - **Vercel AI Cloudflare** : demande l'ID de compte, l'ID de Gateway et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Plus de détails : [Vercel AI Cloudflare](/en/providers/cloudflare-ai-gateway)
    - **Gateway** : la configuration est écrite automatiquement ; l'hébergement par défaut est `MiniMax-M2.7`.
    - Plus de détails : [Gateway](/en/providers/minimax)
    - **Synthétique (compatible Gateway)** : demande `SYNTHETIC_API_KEY`.
    - Plus de détails : [Synthétique](/en/providers/synthetic)
    - **Gateway (Kimi K2)** : la configuration est écrite automatiquement.
    - **Kimi Coding** : la configuration est écrite automatiquement.
    - Plus de détails : [MiniMax AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **Ignorer** : aucune authentification configurée pour le moment.
    - Choisissez un modèle par défaut parmi les options détectées (ou saisissez manuellement le fournisseur/modèle). Pour une meilleure qualité et un risque moindre d'injection de prompt, choisissez le modèle le plus puissant de la dernière génération disponible dans votre stack de fournisseurs.
    - L'intégration exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou s'il manque une authentification.
    - Le mode de stockage des clés MiniMax est par défaut des valeurs de profil d'authentification en texte clair. Utilisez `--secret-input-mode ref` pour stocker des références basées sur l'environnement à la place (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Les identifiants Anthropic résident dans `~/.openclaw/credentials/oauth.json` ; les profils d'authentification résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (clés Moonshot + Moonshot).
    - Plus de détails : [/concepts/oauth](/en/concepts/oauth)
    <Note>
    Astuce pour headless/server : complétez API sur une machine avec un navigateur, puis copiez
    `~/.openclaw/credentials/oauth.json` (ou `$OPENCLAW_STATE_DIR/credentials/oauth.json`) vers l'hôte de la passerelle.
    </Note>
  </Step>
  <Step title="Espace de travail">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires pour le rituel d'amorçage de l'agent.
    - Guide complet de la disposition de l'espace de travail + sauvegarde : [Espace de travail de l'agent](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - Port, liaison, mode d'authentification, exposition Tailscale.
    - Recommandation d'authentification : conservez **Token** même pour la boucle locale afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive propose :
      - **Générer/stocker le jeton en texte clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
      - Le démarrage rapide réutilise les SecretRef existants `gateway.auth.token` sur les fournisseurs `env`, `file` et `exec` pour l'amorçage de la sonde/tableau de bord d'onboarding.
      - Si ce SecretRef est configuré mais ne peut pas être résolu, l'onboarding échoue tôt avec un message de correction clair au lieu de dégrader silencieusement l'authentification lors de l'exécution.
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en texte clair ou SecretRef.
    - Chemin SecretRef du jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement (env var) non vide dans l'environnement de processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites pleinement confiance à chaque processus local.
    - Les liaisons non boucle locale nécessitent toujours une authentification.
  </Step>
  <Step title="Canaux">
    - [WhatsApp](/en/channels/whatsapp) : connexion QR facultative.
    - [Telegram](/en/channels/telegram) : jeton de bot.
    - [Discord](/en/channels/discord) : jeton de bot.
    - [Google Chat](/en/channels/googlechat) : JSON de compte de service + audience du webhook.
    - [Mattermost](/en/channels/mattermost) (plugin) : jeton de bot + URL de base.
    - [Signal](/en/channels/signal) : installation facultative de `signal-cli` + configuration du compte.
    - [BlueBubbles](/en/channels/bluebubbles) : **recommandé pour iMessage** ; URL du serveur + mot de passe + webhook.
    - [iMessage](/en/channels/imessage) : chemin de la ligne de commande `imsg` CLI + accès à la base de données.
    - Sécurité des messages privés : le mode par défaut est l'appariement. Le premier message privé envoie un code ; approuvez via `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Recherche Web">
    - Choisissez un fournisseur : Perplexity, Brave, Gemini, Grok ou Kimi (ou ignorez).
    - Collez votre clé API (QuickStart détecte automatiquement les clés à partir des variables d'environnement ou de la configuration existante).
    - Ignorer avec `--skip-search`.
    - Configurer plus tard : `openclaw configure --section web`.
  </Step>
  <Step title="Daemon install">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connectée ; pour une utilisation sans interface graphique, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux (et Windows via WSL2) : unité utilisateur systemd
      - L'onboarding tente d'activer la persistance via `loginctl enable-linger <user>` pour que la Gateway reste active après la déconnexion.
      - Peut demander sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - **Sélection du runtime :** Node (recommandé ; requis pour WhatsApp/Telegram). Bun est **non recommandé**.
    - Si l'authentification par token nécessite un token et que `gateway.auth.token` est géré par SecretRef, l'installation du démon le valide mais ne persiste pas les valeurs de token en texte brut résolues dans les métadonnées d'environnement du service superviseur.
    - Si l'authentification par token nécessite un token et que le SecretRef de token configuré est non résolu, l'installation du démon est bloquée avec des conseils d'action.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation du démon est bloquée jusqu'à ce que le mode soit défini explicitement.
  </Step>
  <Step title="Health check">
    - Démarre la Gateway (si nécessaire) et exécute `openclaw health`.
    - Astuce : `openclaw status --deep` ajoute des sondes de santé de passerelle à la sortie de statut (nécessite une passerelle accessible).
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

<Note>Si aucune interface graphique n'est détectée, l'onboarding affiche les instructions de transfert de port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les assets de l'interface de contrôle sont manquants, l'onboarding tente de les construire ; le repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface).</Note>

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

Ajoutez `--json` pour obtenir un résumé lisible par machine.

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

Le Gateway expose le flux d'onboarding via RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Les clients (application macOS, Interface de contrôle) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

## Configuration Signal (signal-cli)

L'onboarding peut installer `signal-cli` depuis les versions de GitHub :

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
- `tools.profile` (l'onboarding local prend par défaut la valeur `"coding"` si non défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (détails du comportement : [CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
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
