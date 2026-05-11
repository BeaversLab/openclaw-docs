---
summary: "Référence complète pour le flux de configuration CLI, la configuration auth/modèle, les sorties et les éléments internes"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Référence de la configuration CLI"
sidebarTitle: "CLI reference"
---

Cette page constitue la référence complète pour `openclaw onboard`.
Pour le guide court, consultez [Onboarding (CLI)](/fr/start/wizard).

## Action de l'assistant

Le mode local (par défaut) vous guide à travers :

- Configuration du model et de l'authentification (abonnement Code OpenAI OAuth, Anthropic Claude CLI ou clé API, ainsi que les options MiniMax, GLM, Ollama, Moonshot, StepFun et AI Gateway)
- Emplacement de l'espace de travail et fichiers d'amorçage
- Paramètres du Gateway (port, liaison, authentification, tailscale)
- Canaux et fournisseurs (Telegram, WhatsApp, Discord, Google Chat, Mattermost, Signal, BlueBubbles et autres plugins de canal intégrés)
- Installation du démon (LaunchAgent, unité utilisateur systemd ou tâche planifiée native Windows avec repli vers le dossier Démarrage)
- Vérification de santé
- Configuration des Skills

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.
Il n'installe ni ne modifie quoi que ce soit sur l'hôte distant.

## Détails du flux local

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez Conserver, Modifier ou Réinitialiser.
    - Relancer l'assistant n'efface rien sauf si vous choisissez explicitement Réinitialiser (ou si vous transmettez `--reset`).
    - CLI `--reset` par défaut est `config+creds+sessions` ; utilisez `--reset-scope full` pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés obsolètes, l'assistant s'arrête et vous demande d'exécuter `openclaw doctor` avant de continuer.
    - La réinitialisation utilise `trash` et propose des portées :
      - Configuration uniquement
      - Configuration + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)
  </Step>
  <Step title="Model et authentification">
    - La matrice complète des options se trouve dans [Auth and model options](#auth-and-model-options).
  </Step>
  <Step title="Espace de travail">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires au rituel d'amorçage de la première exécution.
    - Structure de l'espace de travail : [Agent workspace](/fr/concepts/agent-workspace).
  </Step>
  <Step title="Gateway">
    - Demande le port, le bind, le mode d'authentification et l'exposition Tailscale.
    - Recommandé : gardez l'auth par jeton activée même pour le loopback afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive propose :
      - **Générer/stocker le jeton en clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en clair ou par SecretRef.
    - Chemin SecretRef pour jeton non-interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une var d'env non vide dans l'environnement du processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'auth uniquement si vous faites pleinement confiance à chaque processus local.
    - Les binds non-loopback nécessitent toujours une auth.
  </Step>
  <Step title="Canaux">
    - [WhatsApp](/fr/channels/whatsapp) : connexion QR optionnelle
    - [Telegram](/fr/channels/telegram) : jeton de bot
    - [Discord](/fr/channels/discord) : jeton de bot
    - [Google Chat](/fr/channels/googlechat) : JSON de compte de service + audience webhook
    - [Mattermost](/fr/channels/mattermost) : jeton de bot + URL de base
    - [Signal](/fr/channels/signal) : installation `signal-cli` optionnelle + configuration de compte
    - [BlueBubbles](/fr/channels/bluebubbles) : recommandé pour iMessage ; URL du serveur + mot de passe + webhook
    - [iMessage](/fr/channels/imessage) : chemin CLI `imsg` hérité + accès DB
    - Sécurité DM : la valeur par défaut est l'appariement. Le premier DM envoie un code ; approuvez via
      `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Daemon install">
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connecté ; pour les systèmes sans interface, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux et Windows via WSL2 : unité utilisateur systemd
      - L'assistant tente `loginctl enable-linger <user>` pour que la passerelle reste active après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`) ; il essaie d'abord sans sudo.
    - Windows natif : Tâche planifiée en premier
      - Si la création de la tâche est refusée, Windows revient à un élément de connexion dans le dossier de démarrage par utilisateur et démarre la passerelle immédiatement.
      - Les tâches planifiées restent préférées car elles offrent un meilleur statut de superviseur.
    - Sélection du runtime : Node (recommandé ; requis pour OpenClaw et WhatsApp). Telegram n'est pas recommandé.
  </Step>
  <Step title="Health check">
    - Démarre la passerelle (si nécessaire) et exécute `openclaw health`.
    - `openclaw status --deep` ajoute la sonde de santé de la passerelle en direct à la sortie de statut, incluant les sondes de canal lorsque prises en charge.
  </Step>
  <Step title="Skills">
    - Lit les compétences disponibles et vérifie les prérequis.
    - Vous permet de choisir le gestionnaire de nœuds : npm, pnpm ou bun.
    - Installe les dépendances optionnelles (certains utilisent Homebrew sur macOS).
  </Step>
  <Step title="Finish">
    - Résumé et étapes suivantes, y compris les options d'application pour iOS, Android et macOS.
  </Step>
</Steps>

<Note>Si aucune interface graphique n'est détectée, l'assistant imprime les instructions de transfert de port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les assets de l'interface de contrôle sont manquants, l'assistant tente de les construire ; la solution de repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface).</Note>

## Détails du mode distant

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.

<Info>Le mode distant n'installe ou ne modifie rien sur l'hôte distant.</Info>

Ce que vous définissez :

- URL de la passerelle distante (`ws://...`)
- Jeton si l'authentification de la passerelle distante est requise (recommandé)

<Note>- Si la passerelle est uniquement en boucle locale (loopback), utilisez un tunnel SSH ou un tailnet. - Indices de découverte : - macOS : Bonjour (`dns-sd`) - Linux : Avahi (`avahi-browse`)</Note>

## Options d'authentification et de modèle

<AccordionGroup>
  <Accordion title="Clé API Anthropic">
    Utilise `ANTHROPIC_API_KEY` si elle est présente ou demande une clé, puis l'enregistre pour une utilisation par le démon.
  </Accordion>
  <Accordion title="Abonnement OpenAI Code (OAuth)">
    Flux navigateur ; collez `code#state`.

    Définit `agents.defaults.model` sur `openai-codex/gpt-5.5` lorsque le modèle n'est pas défini ou est déjà de la famille OpenAI.

  </Accordion>
  <Accordion title="Abonnement OpenAI Code (appareil)">
    Flux de couplage du navigateur avec un code d'appareil à courte durée de vie.

    Définit `agents.defaults.model` sur `openai-codex/gpt-5.5` lorsque le modèle n'est pas défini ou est déjà de la famille OpenAI.

  </Accordion>
  <Accordion title="Clé API OpenAI">
    Utilise `OPENAI_API_KEY` si elle est présente ou demande une clé, puis stocke les identifiants dans les profils d'authentification.

    Définit `agents.defaults.model` sur `openai/gpt-5.5` lorsque le modèle n'est pas défini, `openai/*` ou `openai-codex/*`.

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
  <Accordion%%PH:JSX_ATTR:39:da09ded0%Vercel AI Gateway">
    Demande `AI_GATEWAY_API_KEY`.
    Plus de détails : [Vercel AI Gateway](/fr/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    Demande l'identifiant du compte, l'identifiant de la passerelle et `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    Plus de détails : [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax">
    La configuration est écrite automatiquement. L'hébergement par défaut est `MiniMax-M2.7` ; la configuration de la clé API utilise
    `minimax/...`, et la configuration OAuth utilise `minimax-portal/...`.
    Plus de détails : [MiniMax](/fr/providers/minimax).
  </Accordion>
  <Accordion title="StepFun">
    La configuration est écrite automatiquement pour StepFun standard ou Step Plan sur les points de terminaison en Chine ou mondiaux.
    Standard inclut actuellement `step-3.5-flash`, et Step Plan inclut également `step-3.5-flash-2603`.
    Plus de détails : [StepFun](/fr/providers/stepfun).
  </Accordion>
  <Accordion title="Synthétique (compatible Anthropic)">
    Demande `SYNTHETIC_API_KEY`.
    Plus de détails : [Synthétique](/fr/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (modèles ouverts cloud et locaux)">
    Demande d'abord `Cloud + Local`, `Cloud only`, ou `Local only`.
    `Cloud only` utilise `OLLAMA_API_KEY` avec `https://ollama.com`.
    Les modes pris en charge par l'hôte demandent l'URL de base (par défaut `http://127.0.0.1:11434`), découvrent les modèles disponibles et suggèrent des valeurs par défaut.
    `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
    Plus de détails : [Ollama](/fr/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot et Kimi Coding">
    Les configurations Moonshot (Kimi K2) et Kimi Coding sont écrites automatiquement.
    Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot).
  </Accordion>
  <Accordion title="Fournisseur personnalisé">
    Fonctionne avec les points de terminaison compatibles OpenAI et Anthropic.

    L'intégration interactive prend en charge les mêmes options de stockage de clés d'API que les autres flux de clés d'API de fournisseur :
    - **Coller la clé d'API maintenant** (en texte clair)
    - **Utiliser une référence secrète** (réf. env ou réf. de fournisseur configuré, avec validation préalable)

    Indicateurs non interactifs :
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (optionnel ; revient à `CUSTOM_API_KEY`)
    - `--custom-provider-id` (optionnel)
    - `--custom-compatibility <openai|anthropic>` (optionnel ; par défaut `openai`)

  </Accordion>
  <Accordion title="Ignorer">
    Laisse l'authentification non configurée.
  </Accordion>
</AccordionGroup>

Comportement du modèle :

- Choisissez le modèle par défaut parmi les options détectées, ou entrez le fournisseur et le modèle manuellement.
- Lorsque l'intégration commence par un choix d'authentification de fournisseur, le sélecteur de modèle privilégie
  automatiquement ce fournisseur. Pour Volcengine et BytePlus, la même préférence
  correspond également à leurs variantes de plan de codage (`volcengine-plan/*`,
  `byteplus-plan/*`).
- Si ce filtre de fournisseur préféré est vide, le sélecteur revient à
  l'intégralité du catalogue au lieu de n'afficher aucun modèle.
- L'assistant exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou s'il manque une authentification.

Chemins d'accès aux identifiants et aux profils :

- Profils d'authentification (clés d'API + OAuth) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Importation OAuth héritée : `~/.openclaw/credentials/oauth.json`

Mode de stockage des identifiants :

- Le comportement d'intégration par défaut enregistre les clés d'API en tant que valeurs en texte clair dans les profils d'authentification.
- `--secret-input-mode ref` active le mode référence au lieu du stockage de clé en texte clair.
  Dans la configuration interactive, vous pouvez choisir :
  - référence de variable d'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - référence de fournisseur configurée (`file` ou `exec`) avec l'alias et l'ID du fournisseur
- Le mode référence interactif exécute une validation préalable rapide avant l'enregistrement.
  - Références d'env : valide le nom de la variable + une valeur non vide dans l'environnement d'intégration actuel.
  - Références de provider : valide la configuration du provider et résout l'ID demandé.
  - Si le prévol échoue, l'onboarding affiche l'erreur et vous permet de réessayer.
- En mode non interactif, `--secret-input-mode ref` est soutenu uniquement par une variable d'environnement.
  - Définissez l'env var du provider dans l'environnement du processus d'onboarding.
  - Les drapeaux de clé en ligne (par exemple `--openai-api-key`) exigent que cette env var soit définie ; sinon, l'onboarding échoue rapidement.
  - Pour les providers personnalisés, le mode non interactif `ref` stocke `models.providers.<id>.apiKey` sous la forme `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - Dans ce cas de provider personnalisé, `--custom-api-key` exige que `CUSTOM_API_KEY` soit défini ; sinon, l'onboarding échoue rapidement.
- Les identifiants d'authentification Gateway prennent en charge les choix de texte brut et SecretRef dans la configuration interactive :
  - Mode jeton : **Générer/stocker un jeton en texte brut** (par défaut) ou **Utiliser SecretRef**.
  - Mode mot de passe : texte brut ou SecretRef.
- Chemin SecretRef pour jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
- Les configurations existantes en texte brut continuent de fonctionner sans modification.

<Note>
Astuce pour les serveurs et sans interface (headless) : terminez OAuth sur une machine avec un navigateur, puis copiez
le `auth-profiles.json` de cet agent (par exemple
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, ou le chemin
`$OPENCLAW_STATE_DIR/...` correspondant) vers l'hôte de la passerelle (gateway). `credentials/oauth.json`
n'est qu'une source d'importation héritée.
</Note>

## Sorties et fonctionnement interne

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` lorsque `--skip-bootstrap` est passé
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'intégration locale par défaut est `"coding"` si non défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (l'intégration locale définit cela par défaut à `per-channel-peer` si non défini ; les valeurs explicites existantes sont conservées)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listes d'autorisation de canaux (Slack, Discord, Matrix, Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID lorsque cela est possible)
- `skills.install.nodeManager`
  - L'indicateur `setup --node-manager` accepte `npm`, `pnpm` ou `bun`.
  - La configuration manuelle peut toujours définir `skills.install.nodeManager: "yarn"` plus tard.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` écrit `agents.list[]` et `bindings` en option.

Les identifiants WhatsApp sont placés sous `~/.openclaw/credentials/whatsapp/<accountId>/`.
Les sessions sont stockées sous `~/.openclaw/agents/<agentId>/sessions/`.

<Note>Certains canaux sont fournis sous forme de plugins. Lorsqu'ils sont sélectionnés lors de la configuration, l'assistant invite à installer le plugin (npm ou chemin local) avant la configuration du canal.</Note>

Assistant Gateway RPC :

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Les clients (application macOS et interface de contrôle) peuvent afficher les étapes sans réimplémenter la logique d'onboarding.

Comportement de la configuration Signal :

- Télécharge l'actif de version approprié
- Le stocke sous `~/.openclaw/tools/signal-cli/<version>/`
- Écrit `channels.signal.cliPath` dans la configuration
- Les builds JVM nécessitent Java 21
- Les builds natifs sont utilisés lorsqu'ils sont disponibles
- Windows utilise WSL2 et suit le flux signal-cli Linux à l'intérieur de WSL

## Documentation connexe

- Hub d'intégration : [Intégration (CLI)](/fr/start/wizard)
- Automatisation et scripts : [Automatisation CLI](/fr/start/wizard-cli-automation)
- Référence des commandes : [`openclaw onboard`](/fr/cli/onboard)
