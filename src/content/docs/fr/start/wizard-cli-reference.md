---
summary: "Référence complète pour le flux de configuration CLI, la configuration auth/modèle, les sorties et les éléments internes"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Référence de la configuration CLI"
sidebarTitle: "CLI reference"
---

Cette page est la référence complète pour `openclaw onboard`.
Pour le guide court, consultez [Onboarding (CLI)](/fr/start/wizard).

## Action de l'assistant

Le mode local (par défaut) vous guide à travers :

- Configuration du model et de l'authentification (abonnement Code OpenAI OAuth, Anthropic Claude CLI ou clé API, ainsi que les options MiniMax, GLM, Ollama, Moonshot, StepFun et AI Gateway)
- Emplacement de l'espace de travail et fichiers d'amorçage
- Paramètres du Gateway (port, liaison, authentification, tailscale)
- Chaînes et fournisseurs (Telegram, WhatsApp, Discord, Google Chat, Mattermost, Signal, iMessage et autres plugins de chaîne inclus)
- Installation du démon (LaunchAgent, unité utilisateur systemd ou tâche planifiée native Windows avec repli vers le dossier Démarrage)
- Vérification de santé
- Configuration des Skills

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.
Il n'installe ni ne modifie quoi que ce soit sur l'hôte distant.

## Détails du flux local

<Steps>
  <Step title="Détection de la configuration existante">
    - Si `~/.openclaw/openclaw.json` existe, choisissez Keep, Modify ou Reset.
    - Le fait de relancer l'assistant n'efface rien, sauf si vous choisissez explicitement Reset (ou si vous passez `--reset`).
    - Le CLI `--reset` est `config+creds+sessions` par défaut ; utilisez `--reset-scope full` pour également supprimer l'espace de travail.
    - Si la configuration n'est pas valide ou contient des clés obsolètes, l'assistant s'arrête et vous demande d'exécuter `openclaw doctor` avant de continuer.
    - Reset utilise `trash` et propose des portées :
      - Config uniquement
      - Config + identifiants + sessions
      - Réinitialisation complète (supprime également l'espace de travail)

  </Step>
  <Step title="Modèle et authentification">
    - La matrice complète des options se trouve dans [Auth and model options](#auth-and-model-options).

  </Step>
  <Step title="Espace de travail">
    - `~/.openclaw/workspace` par défaut (configurable).
    - Initialise les fichiers de l'espace de travail nécessaires au rituel de bootstrap du premier lancement.
    - Disposition de l'espace de travail : [Agent workspace](/fr/concepts/agent-workspace).

  </Step>
  <Step title="GatewayGateway">
    - Demande le port, le bind, le mode d'authentification et l'exposition Tailscale.
    - Recommandé : gardez l'authentification par jeton activée même pour le bouclage local afin que les clients WS locaux doivent s'authentifier.
    - En mode jeton, la configuration interactive offre :
      - **Générer/stocker un jeton en clair** (par défaut)
      - **Utiliser SecretRef** (optionnel)
    - En mode mot de passe, la configuration interactive prend également en charge le stockage en clair ou par SecretRef.
    - Chemin SecretRef pour jeton non-interactif : `--gateway-token-ref-env <ENV_VAR>`.
      - Nécessite une variable d'environnement non vide dans l'environnement du processus d'onboarding.
      - Ne peut pas être combiné avec `--gateway-token`.
    - Désactivez l'authentification uniquement si vous faites pleinement confiance à chaque processus local.
    - Les binds non-bouclage nécessitent toujours une authentification.

  </Step>
  <Step title="Channels"WhatsApp>
    - [WhatsApp](/fr/channels/whatsappTelegram) : connexion QR facultative
    - [Telegram](/fr/channels/telegramDiscord) : jeton de bot
    - [Discord](/en/channels/discordGoogle Chat) : jeton de bot
    - [Google Chat](/fr/channels/googlechatMattermost) : JSON de compte de service + audience webhook
    - [Mattermost](/fr/channels/mattermostSignal) : jeton de bot + URL de base
    - [Signal](/fr/channels/signal) : installation facultative de `signal-cli`iMessage + configuration de compte
    - [iMessage](/fr/channels/imessage) : chemin `imsg`CLIGateway du CLI + accès à la base de données Messages ; utilisez un wrapper SSH lorsque la Gateway s'exécute hors Mac
    - Sécurité des DM : la valeur par défaut est le jumelage. Le premier DM envoie un code ; approuvez via
      `openclaw pairing approve <channel> <code>` ou utilisez des listes d'autorisation.
  </Step>
  <Step title="Daemon install"macOSLinuxWindowsWSL2>
    - macOS : LaunchAgent
      - Nécessite une session utilisateur connecté ; pour sans interface, utilisez un LaunchDaemon personnalisé (non fourni).
    - Linux et Windows via WSL2 : unité utilisateur systemd
      - L'assistant tente `loginctl enable-linger <user>` afin que la passerelle reste active après la déconnexion.
      - Peut demander le mot de passe sudo (écrit `/var/lib/systemd/linger`WindowsOpenClawWhatsAppTelegramBun) ; il essaie d'abord sans sudo.
    - Windows natif : Tâche planifiée en priorité
      - Si la création de la tâche est refusée, OpenClaw se replie sur un élément de connexion du dossier Démarrage par utilisateur et démarre la passerelle immédiatement.
      - Les tâches planifiées restent préférées car elles offrent un meilleur statut de superviseur.
    - Sélection de l'environnement d'exécution : Node (recommandé ; requis pour WhatsApp et Telegram). Bun n'est pas recommandé.

  </Step>
  <Step title="Health check">
    - Démarre la passerelle (si nécessaire) et exécute `openclaw health`.
    - `openclaw status --deep` ajoute la sonde de santé de la passerelle en temps réel à la sortie de statut, y compris les sondes de canal lorsque pris en charge.

  </Step>
  <Step title="Skills"npmmacOS>
    - Lit les compétences disponibles et vérifie les prérequis.
    - Vous permet de choisir le gestionnaire de nœuds : npm, pnpm ou bun.
    - Installe les dépendances facultatives (certains utilisent Homebrew sur macOS).

  </Step>
  <Step title="Finish"iOSAndroidmacOS>
    - Résumé et prochaines étapes, y compris les options d'application iOS, Android et macOS.

  </Step>
</Steps>

<Note>Si aucune interface graphique n'est détectée, l'assistant imprime les instructions de transfert de port SSH pour l'interface de contrôle au lieu d'ouvrir un navigateur. Si les assets de l'interface de contrôle sont manquants, l'assistant tente de les construire ; la solution de repli est `pnpm ui:build` (installe automatiquement les dépendances de l'interface).</Note>

## Détails du mode distant

Le mode distant configure cette machine pour se connecter à une passerelle située ailleurs.

<Info>Le mode distant n'installe ou ne modifie rien sur l'hôte distant.</Info>

Ce que vous définissez :

- URL de la passerelle distante (`ws://...`)
- Jeton si l'authentification de la passerelle distante est requise (recommandé)

<Note>
- Si la passerelle est en boucle locale uniquement, utilisez le tunnel SSH ou un tailnet.
- Indices de découverte :
  - macOS : Bonjour (macOSBonjour`dns-sd`Linux)
  - Linux : Avahi (`avahi-browse`)

</Note>

## Options d'authentification et de modèle

<AccordionGroup>
  <Accordion title="Clé API Anthropic">
    Utilise `ANTHROPIC_API_KEY` si elle est présente ou demande une clé, puis l'enregistre pour une utilisation par le démon.
  </Accordion>
  <Accordion title="OpenAIOAuthAbonnement Code OpenAI (OAuth)">
    Flux du navigateur ; collez `code#state`.

    Définit `agents.defaults.model` sur `openai/gpt-5.5`OpenAI via le runtime Codex lorsque le model n'est pas défini ou est déjà de la famille OpenAI.

  </Accordion>
  <Accordion title="OpenAIAbonnement Code OpenAI (appareil)">
    Flux d'appareil du navigateur avec un code à courte durée de vie.

    Définit `agents.defaults.model` sur `openai/gpt-5.5`OpenAI via le runtime Codex lorsque le model n'est pas défini ou est déjà de la famille OpenAI.

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
  <Accordion title="VercelGatewayVercel AI Gateway">
    Demande `AI_GATEWAY_API_KEY`VercelGateway.
    Plus de détails : [Vercel AI Gateway](/fr/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="GatewayCloudflare AI Gateway">
    Demande l'ID de compte, l'ID de passerelle et `CLOUDFLARE_AI_GATEWAY_API_KEY`Gateway.
    Plus de détails : [Cloudflare AI Gateway](/fr/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMaxMiniMax">
    La configuration est écrite automatiquement. L'hébergement par défaut est `MiniMax-M2.7`API ; la configuration de la clé API utilise
    `minimax/...`OAuth, et la configuration OAuth utilise `minimax-portal/...`MiniMax.
    Plus de détails : [MiniMax](/fr/providers/minimax).
  </Accordion>
  <Accordion title="StepFun">
    La configuration est écrite automatiquement pour StepFun standard ou Step Plan sur les points de terminaison en Chine ou mondiaux.
    Le mode standard inclut actuellement `step-3.5-flash`, et Step Plan inclut également `step-3.5-flash-2603`.
    Plus de détails : [StepFun](/fr/providers/stepfun).
  </Accordion>
  <Accordion title="Synthétique (compatible Anthropic)">
    Invite à entrer `SYNTHETIC_API_KEY`.
    Plus de détails : [Synthétique](/fr/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud et modèles open locaux)">
    Invite à entrer `Cloud + Local`, `Cloud only`, ou `Local only` en premier.
    `Cloud only` utilise `OLLAMA_API_KEY` avec `https://ollama.com`.
    Les modes basés sur l'hôte demandent l'URL de base (par défaut `http://127.0.0.1:11434`), découvrent les modèles disponibles et suggèrent des valeurs par défaut.
    `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
    Plus de détails : [Ollama](/fr/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot et Kimi Coding">
    Les configurations Moonshot (Kimi K2) et Kimi Coding sont écrites automatiquement.
    Plus de détails : [Moonshot AI (Kimi + Kimi Coding)](/fr/providers/moonshot).
  </Accordion>
  <Accordion title="Fournisseur personnalisé"OpenAIAnthropicAPIAPIAPI>
    Fonctionne avec les points de terminaison compatibles OpenAI et Anthropic.

    L'onboarding interactif prend en charge les mêmes options de stockage de clé API que les autres flux de clés API de fournisseur :
    - **Coller la clé API maintenant** (en texte clair)
    - **Utiliser une référence secrète** (réf env ou réf fournisseur configurée, avec validation préalable)

    Indicateurs non interactifs :
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (optionnel ; revient à `CUSTOM_API_KEY`)
    - `--custom-provider-id` (optionnel)
    - `--custom-compatibility <openai|anthropic>` (optionnel ; par défaut `openai`)
    - `--custom-image-input` / `--custom-text-input` (optionnel ; remplace la capacité d'entrée du modèle déduite)

  </Accordion>
  <Accordion title="Ignorer">
    Laisse l'authentification non configurée.
  </Accordion>
</AccordionGroup>

Comportement du modèle :

- Choisissez le modèle par défaut parmi les options détectées, ou entrez le fournisseur et le modèle manuellement.
- L'onboarding du fournisseur personnalisé déduit la prise en charge des images pour les ID de modèle courants et ne demande que lorsque le nom du modèle est inconnu.
- Lorsque l'intégration commence par un choix d'authentification de provider, le sélecteur de modèle préfère
  automatiquement ce provider. Pour Volcengine et BytePlus, la même préférence
  correspond également à leurs variantes de plan de codage (`volcengine-plan/*`,
  `byteplus-plan/*`).
- Si ce filtre de fournisseur préféré devait être vide, le sélecteur revient au catalogue complet au lieu de n'afficher aucun modèle.
- L'assistant exécute une vérification du modèle et avertit si le modèle configuré est inconnu ou s'il manque une authentification.

Chemins des identifiants et des profils :

- Profils d'authentification (clés API + OAuth) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Importation OAuth héritée : `~/.openclaw/credentials/oauth.json`

Mode de stockage des identifiants :

- Le comportement d'intégration par défaut enregistre les clés API sous forme de valeurs en texte clair dans les profils d'authentification.
- `--secret-input-mode ref` active le mode de référence au lieu du stockage de clé en texte brut.
  Dans la configuration interactive, vous pouvez choisir entre :
  - référence de variable d'environnement (par exemple `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - référence de fournisseur configurée (`file` ou `exec`) avec l'alias et l'ID du fournisseur
- Le mode de référence interactif exécute une validation préalable rapide avant l'enregistrement.
  - Réf. d'environnement : valide le nom de la variable + une valeur non vide dans l'environnement d'intégration actuel.
  - Réf. de fournisseur : valide la configuration du fournisseur et résout l'ID demandé.
  - Si la préconfiguration échoue, l'onboarding affiche l'erreur et vous permet de réessayer.
- En mode non interactif, `--secret-input-mode ref` est uniquement basé sur les variables d'environnement.
  - Définissez la variable d'environnement du provider dans l'environnement du processus d'onboarding.
  - Les indicateurs de clé en ligne (par exemple `--openai-api-key`) exigent que cette variable d'environnement soit définie ; sinon, l'intégration échoue rapidement.
  - Pour les fournisseurs personnalisés, le mode non interactif `ref` stocke `models.providers.<id>.apiKey` sous la forme `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - Dans ce cas de fournisseur personnalisé, `--custom-api-key` exige que `CUSTOM_API_KEY` soit défini ; sinon, l'intégration échoue rapidement.
- Les identifiants d'authentification du Gateway prennent en charge les choix de texte en clair et de SecretRef dans la configuration interactive :
  - Mode jeton : **Générer/stocker un jeton en texte en clair** (par défaut) ou **Utiliser SecretRef**.
  - Mode mot de passe : texte en clair ou SecretRef.
- Chemin SecretRef du jeton non interactif : `--gateway-token-ref-env <ENV_VAR>`.
- Les configurations existantes en texte en clair continuent de fonctionner sans changement.

<Note>
Conseil pour headless et serveur : terminez OAuth sur une machine disposant d'un navigateur, puis copiez
le `auth-profiles.json` de cet agent (par exemple
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, ou le chemin
`$OPENCLAW_STATE_DIR/...` correspondant) vers l'hôte de la passerelle. `credentials/oauth.json`
n'est qu'une source d'importation héritée.
</Note>

## Sorties et éléments internes

Champs typiques dans `~/.openclaw/openclaw.json` :

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` lorsque `--skip-bootstrap` est passé
- `agents.defaults.model` / `models.providers` (si Minimax est choisi)
- `tools.profile` (l'onboarding local définit cela par défaut à `"coding"` s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (l'onboarding local définit cela par défaut à `per-channel-peer` s'il n'est pas défini ; les valeurs explicites existantes sont conservées)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listes d'autorisation de canaux (Slack, Discord, Matrix, Microsoft Teams) lorsque vous acceptez lors des invites (les noms sont résolus en ID lorsque cela est possible)
- `skills.install.nodeManager`
  - Le drapeau `setup --node-manager` accepte `npm`, `pnpm` ou `bun`.
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

- Hub d'onboarding : [Onboarding (CLI)](/fr/start/wizard)
- Automatisation et scripts : [Automatisation CLI](/fr/start/wizard-cli-automation)
- Référence de commande : [`openclaw onboard`](/fr/cli/onboard)
