---
summary: "Référence complète pour le flux de configuration CLI, la configuration auth/modèle, les sorties et les éléments internes"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Référence de configuration CLI"
sidebarTitle: "CLI reference"
---

# Référence de configuration CLI

Cette page constitue la référence complète pour `openclaw onboard`.
Pour le guide court, consultez [Onboarding (CLI)](/fr/start/wizard).

## Ce que fait l'assistant

Le mode local (par défaut) vous guide à travers :

- Configuration du modèle et de l'authentification (abonnement Code OpenAI OAuth, clé Anthropic ou jeton de configuration API, ainsi que les options MiniMax, GLM, Ollama, Moonshot et AI Gateway)
- Emplacement de l'espace de travail et fichiers d'amorçage
- Paramètres Gateway (port, liaison, auth, tailscale)
- Canaux et fournisseurs (Telegram, WhatsApp, Discord, Google Chat, plugin Mattermost, Signal)
- Installation du démon (LaunchAgent ou unité utilisateur systemd)
- Contrôle de santé
- Configuration des Skills

Le mode distant configure cette machine pour se connecter à une passerelle ailleurs.
Il n'installe ni ne modifie quoi que ce soit sur l'hôte distant.

## Détails du flux local

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez Conserver, Modifier ou Réinitialiser.
    - Relancer l'assistant n'efface rien à moins que vous ne choisissiez explicitement Réinitialiser (ou que vous passiez `--reset`).
    - CLI `--reset` par défaut est `config+creds+sessions` ; utilisez `--reset-scope full` pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés obsolètes, l'assistant s'arrête et vous demande d'exécuter `openclaw doctor` avant de continuer.
    - La réinitialisation utilise `trash` et propose des portées :
      - Configuration uniquement
      - Configuration + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)
  </Step>
  <Step title="Model and auth">
    - La matrice complète des options se trouve dans [Auth and model options](#auth-and-model-options).
  </Step>
  <Step title="Workspace">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires pour le rituel d'amorçage de la première exécution.
    - Structure de l'espace de travail : [Agent workspace](/fr/concepts/agent-workspace).
  </Step>
  <Step title="Gateway">
    - Invite à entrer le port, la liaison, le mode d'authentification et l'exposition Tailscale.
    - Recommandé : gardez l'authentification par jeton activée même pour le bouclage local afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive offre :
      - **Générer/stocker un jeton en texte clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en texte clair ou SecretRef.
    - Chemin SecretRef de jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement de processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites pleinement confiance à chaque processus local.
    - Les liaisons non bouclage local nécessitent toujours une authentification.
  </Step>
  <Step title="Channels">
    - [WhatsApp](/fr/channels/whatsapp) : connexion QR facultative
    - [Telegram](/fr/channels/telegram) : jeton de bot
    - [Discord](/fr/channels/discord) : jeton de bot
    - [Google Chat](/fr/channels/googlechat) : compte de service JSON + audience webhook
    - [Mattermost](/fr/channels/mattermost) plugin : jeton de bot + URL de base
    - [Signal](/fr/channels/signal) : installation facultative de `signal-cli` + configuration du compte
    - [BlueBubbles](/fr/channels/bluebubbles) : recommandé pour iMessage ; URL du serveur + mot de passe + webhook
    - [iMessage](/fr/channels/imessage) : chemin CLI `imsg` de l'ancienne génération + accès DB
    - Sécurité DM : le mode par défaut est l'appairage. Le premier DM envoie un code ; approuvez via
      `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Installation du démon">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connecté ; pour le mode sans interface, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux et Windows via WSL2 : unité utilisateur systemd
      - L'assistant tente `loginctl enable-linger <user>` pour que la passerelle reste active après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - Sélection du runtime : Node (recommandé ; requis pour WhatsApp et Telegram). Bun n'est pas recommandé.
  </Step>
  <Step title="Vérification de l'état de santé">
    - Démarre la passerelle (si nécessaire) et exécute `openclaw health`.
    - `openclaw status --deep` ajoute des sondes de santé de la passerelle à la sortie d'état.
  </Step>
  <Step title="Skills">
    - Lit les compétences disponibles et vérifie les prérequis.
    - Vous permet de choisir le gestionnaire de nœuds : npm ou pnpm (bun n'est pas recommandé).
    - Installe les dépendances facultatives (certaines utilisent Homebrew sur macOS).
  </Step>
  <Step title="Finish">
    - Résumé et prochaines étapes, y compris les options d'application iOS, Android et macOS.
  </Step>
</Steps>

<Note>
  Si aucune interface graphique n'est détectée, l'assistant imprime les instructions de transfert de
  port SSH pour l'interface utilisateur de contrôle au lieu d'ouvrir un navigateur. Si les assets de
  l'interface utilisateur de contrôle sont manquants, l'assistant tente de les compiler; le repli
  est `pnpm ui:build` (installe automatiquement les dépendances de l'interface utilisateur).
</Note>

## Détails du mode distant

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.

<Info>Le mode distant n'installe ni ne modifie quoi que ce soit sur l'hôte distant.</Info>

Ce que vous définissez :

- URL de la passerelle distante (`ws://...`)
- Jeton si l'authentification de la passerelle distante est requise (recommandé)

<Note>
  - Si la passerelle est en boucle locale uniquement, utilisez un tunnel SSH ou un tailnet. -
  Indices de découverte : - macOS : Bonjour (`dns-sd`) - Linux : Avahi (`avahi-browse`)
</Note>

## Options d'authentification et de modèle

<AccordionGroup>
  <Accordion title="Clé Anthropic API">
    Utilise `ANTHROPIC_API_KEY` si présent ou demande une clé, puis l'enregistre pour une utilisation par le démon.
  </Accordion>
  <Accordion title="Anthropic OAuth (CLI Claude Code)">
    - macOS : vérifie l'élément de trousseau de clés "Claude Code-credentials"
    - Linux et Windows : réutilise `~/.claude/.credentials.json` si présent

    Sur macOS, choisissez "Toujours autoriser" pour que les démarrages launchd ne bloquent pas.

  </Accordion>
  <Accordion title="Jeton Anthropic (coller setup-token)">
    Exécutez `claude setup-token` sur n'importe quelle machine, puis collez le jeton.
    Vous pouvez le nommer ; vide utilise la valeur par défaut.
  </Accordion>
  <Accordion title="Abonnement Code OpenAI (réutilisation CLI Codex)">
    Si `~/.codex/auth.json` existe, l'assistant peut le réutiliser.
  </Accordion>
  <Accordion title="Abonnement Code OpenAI (OAuth)">
    Flux navigateur ; collez `code#state`.

    Définit `agents.defaults.model` sur `openai-codex/gpt-5.4` lorsque le modèle n'est pas défini ou `openai/*`.

  </Accordion>
  <Accordion title="Clé API OpenAI">
    Utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis stocke l'identifiant dans les profils d'authentification.

    Définit `agents.defaults.model` sur `openai/gpt-5.4` lorsque le modèle n'est pas défini, `openai/*` ou `openai-codex/*`.

  </Accordion>
  <Accordion title="Clé API xAI (Grok)">
    Demande `XAI_API_KEY` et configure xAI en tant que fournisseur de modèle.
  </Accordion>
  <Accordion title="OpenCode">
    Demande `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`) et vous permet de choisir le catalogue Zen ou Go.
    URL de configuration : [opencode.ai/auth](https://opencode.ai/auth).
  </Accordion>
  <Accordion title="Clé API (générique)">
    Stocke la clé pour vous.
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    Demande `AI_GATEWAY_API_KEY`.
    Plus de détails : [Vercel AI Gateway](/fr/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    Demande l'ID de compte, l'ID de passerelle et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    Plus de détails : [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax">
    La configuration est écrite automatiquement. L'hébergement par défaut est `MiniMax-M2.7` ; `MiniMax-M2.5` reste disponible.
    Plus de détails : [MiniMax](/fr/providers/minimax).
  </Accordion>
  <Accordion title="Synthetic (compatible Anthropic)">
    Demande `SYNTHETIC_API_KEY`.
    Plus de détails : [Synthetic](/fr/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    Demande l'URL de base (par défaut `http://127.0.0.1:11434`), puis propose les modes Cloud + Local ou Local.
    Détecte les modèles disponibles et suggère les valeurs par défaut.
    Plus de détails : [Ollama](/fr/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Les configurations Moonshot (Kimi K2) et Kimi Coding sont écrites automatiquement.
    Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot).
  </Accordion>
  <Accordion title="Custom provider">
    Fonctionne avec les points de terminaison compatibles OpenAI et Anthropic.

    L'onboarding interactif prend en charge les mêmes options de stockage de clé API que les autres flux de clés API de provider :
    - **Coller la clé API maintenant** (en clair)
    - **Utiliser une référence secrète** (réf. env ou réf. provider configurée, avec validation préalable)

    Indicateurs non interactifs :
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (facultatif ; revient à `CUSTOM_API_KEY`)
    - `--custom-provider-id` (facultatif)
    - `--custom-compatibility <openai|anthropic>` (facultatif ; par défaut `openai`)

  </Accordion>
  <Accordion title="Skip">
    Laisse l'auth non configurée.
  </Accordion>
</AccordionGroup>

Comportement du modèle :

- Choisit le modèle par défaut parmi les options détectées, ou entre le provider et le modèle manuellement.
- L'assistant exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou si l'auth est manquante.

Chemins des identifiants et des profils :

- Identifiants OAuth : `~/.openclaw/credentials/oauth.json`
- Profils d'authentification (clés API + OAuth) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

Mode de stockage des informations d'identification :

- Le comportement d'onboarding par défaut enregistre les clés API en tant que valeurs en clair dans les profils d'auth.
- `--secret-input-mode ref` active le mode référence au lieu du stockage de clé en texte brut.
  Dans la configuration interactive, vous pouvez choisir :
  - référence de variable d'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - référence de fournisseur configurée (`file` ou `exec`) avec l'alias et l'identifiant du fournisseur
- Le mode référence interactif exécute une validation préliminaire rapide avant l'enregistrement.
  - Réf Env : valide le nom de la variable + la valeur non vide dans l'environnement d'onboarding actuel.
  - Réf Provider : valide la configuration du provider et résout l'identifiant demandé.
  - Si la validation préliminaire échoue, l'onboarding affiche l'erreur et vous permet de réessayer.
- En mode non interactif, `--secret-input-mode ref` est uniquement basé sur l'environnement.
  - Définissez la variable d'environnement du provider dans l'environnement du processus d'onboarding.
  - Les indicateurs de clé en ligne (par exemple `--openai-api-key`) nécessitent que cette variable d'environnement soit définie ; sinon, l'onboarding échoue rapidement.
  - Pour les fournisseurs personnalisés, le mode non interactif `ref` stocke `models.providers.<id>.apiKey` en tant que `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - Dans ce cas de fournisseur personnalisé, `--custom-api-key` exige que `CUSTOM_API_KEY` soit défini ; sinon, l'onboarding échoue rapidement.
- Les identifiants d'authentification Gateway prennent en charge les choix en texte clair et SecretRef dans la configuration interactive :
  - Mode Jeton : **Générer/stocker le jeton en clair** (par défaut) ou **Utiliser SecretRef**.
  - Mode Mot de passe : en clair ou SecretRef.
- Chemin SecretRef du jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
- Les configurations en clair existantes continuent de fonctionner sans modification.

<Note>
  Astuce pour headless et serveur : complétez OAuth sur une machine disposant d'un navigateur, puis
  copiez `~/.openclaw/credentials/oauth.json` (ou `$OPENCLAW_STATE_DIR/credentials/oauth.json`) vers
  l'hôte de la passerelle.
</Note>

## Sorties et éléments internes

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'onboarding local utilise par défaut `"coding"` s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (l'onboarding local définit cela par défaut à `per-channel-peer` s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- Listes de canaux autorisés (Slack, Discord, Matrix, Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID si possible)
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et `bindings` facultatif.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

<Note>
  Certains canaux sont fournis sous forme de plugins. Lorsqu'ils sont sélectionnés lors de la
  configuration, l'assistant invite à installer le plugin (npm ou chemin local) avant la
  configuration du canal.
</Note>

Assistant de l'Gateway RPC :

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Les clients (application macOS et Interface de contrôle) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

Comportement de configuration Signal :

- Télécharge l'actif de version approprié
- Le stocke sous `~/.openclaw/tools/signal-cli/<version>/`
- Écrit `channels.signal.cliPath` dans la configuration
- Les versions JVM nécessitent Java 21
- Les versions natives sont utilisées lorsqu'elles sont disponibles
- Windows utilise WSL2 et suit le flux signal-cli Linux à l'intérieur de WSL

## Documentation connexe

- Hub Onboarding : [Onboarding (CLI)](/fr/start/wizard)
- Automatisation et scripts : [CLI Automation](/fr/start/wizard-cli-automation)
- Référence des commandes : [`openclaw onboard`](/fr/cli/onboard)

import fr from "/components/footer/fr.mdx";

<fr />
