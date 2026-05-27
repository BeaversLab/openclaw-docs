---
summary: "CLIRéférence de la CLI pour `openclaw onboard` (onboarding interactif)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "Onboard"
---

# `openclaw onboard`

Onboarding guidé complet pour la configuration locale ou distante du Gateway. Utilisez ceci lorsque vous voulez qu'OpenClaw parcourt l'authentification du modèle, l'espace de travail, la passerelle, les canaux, les compétences et l'état de santé en un seul flux.

## Guides associés

<CardGroup cols={2}>
  <Card title="CLICentre d'onboarding CLI" href="/fr/start/wizard" icon="rocket" CLI>
    Procédure pas à pas du flux interactif de la CLI.
  </Card>
  <Card title="Aperçu de l'onboarding" href="/fr/start/onboarding-overview" icon="map" OpenClaw>
    Comment l'onboarding OpenClaw s'articule.
  </Card>
  <Card title="CLIRéférence de la configuration CLI" href="/fr/start/wizard-cli-reference" icon="book">
    Sorties, fonctionnement interne et comportement par étape.
  </Card>
  <Card title="CLIAutomatisation CLI" href="/fr/start/wizard-cli-automation" icon="terminal">
    Indicateurs non interactifs et configurations scriptées.
  </Card>
  <Card title="macOSOnboarding de l'application macOS" href="/fr/start/onboarding" icon="apple" macOS>
    Flux d'onboarding pour l'application de la barre de menus macOS.
  </Card>
</CardGroup>

## Exemples

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import`OpenClaw utilise des fournisseurs de migration appartenant aux plugins tels que Hermes. Il ne s'exécute que sur une nouvelle installation OpenClaw ; si des fichiers de configuration, d'identifiants, de sessions ou de mémoire/espace de travail existent, réinitialisez ou choisissez une nouvelle installation avant d'importer.

`--modern` lance l'aperçu de l'onboarding conversationnel Crestodian. Sans
`--modern`, `openclaw onboard` conserve le flux d'onboarding classique.

Sur une nouvelle installation où le fichier de configuration actif est manquant ou ne contient aucun paramètre rédigé (vide ou métadonnées uniquement), `openclaw` nu lance également le flux d'onboarding classique. Une fois qu'un fichier de configuration contient des paramètres rédigés, `openclaw` nu ouvre Crestodian à la place.

Le `ws://` en clair est accepté pour les adresses de bouclage, les littéraux d'IP privée, `.local`, et les URL de passerelle `*.ts.net` Tailnet. Pour d'autres noms DNS privés de confiance, définissez `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` dans l'environnement du processus d'onboarding.

## Paramètres régionaux

L'onboarding interactif utilise les paramètres régionaux de l'assistant CLI pour le texte de configuration fixe. L'ordre de résolution est :

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. Repli en anglais

Les paramètres régionaux pris en charge par l'assistant sont `en`, `zh-CN` et `zh-TW`. Les valeurs de paramètres régionaux peuvent utiliser des formes de suffixe avec tiret bas ou POSIX telles que `zh_CN.UTF-8`. Les noms de produits, les noms de commandes, les clés de configuration, les URL, les ID de fournisseur, les ID de modèle et les étiquettes de plugin/channel restent littéraux.

Exemple :

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

Fournisseur personnalisé non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

`--custom-api-key` est optionnel en mode non interactif. S'il est omis, l'onboarding vérifie `CUSTOM_API_KEY`. OpenClaw marque automatiquement les ID de modèle de vision courants comme capables d'images. Passez `--custom-image-input` pour les ID de vision personnalisés inconnus, ou `--custom-text-input` pour forcer les métadonnées texte uniquement.

LM Studio prend également en charge un indicateur de clé spécifique au fournisseur en mode non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

Ollama non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` par défaut est `http://127.0.0.1:11434`. `--custom-model-id` est optionnel ; s'il est omis, l'onboarding utilise les valeurs par défaut suggérées par Ollama. Les ID de modèle cloud tels que `kimi-k2.5:cloud` fonctionnent également ici.

Stocker les clés de fournisseur sous forme de références au lieu de texte en clair :

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Avec `--secret-input-mode ref`, l'onboarding écrit des refs basées sur env au lieu des valeurs de clé en texte brut.
Pour les providers basés sur auth-profile, cela écrit des entrées `keyRef` ; pour les providers personnalisés, cela écrit `models.providers.<id>.apiKey` en tant que réf env (par exemple `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrat du mode non interactif `ref` :

- Définissez l'env var du provider dans l'environnement du processus d'onboarding (par exemple `OPENAI_API_KEY`).
- Ne passez pas de drapeaux de clé en ligne (par exemple `--openai-api-key`) sauf si cette env var est également définie.
- Si un drapeau de clé en ligne est passé sans l'env var requise, l'onboarding échoue rapidement avec des instructions.

Options de jeton Gateway en mode non interactif :

- `--gateway-auth token --gateway-token <token>` stocke un jeton en texte brut.
- `--gateway-auth token --gateway-token-ref-env <name>` stocke `gateway.auth.token` en tant qu'env SecretRef.
- `--gateway-token` et `--gateway-token-ref-env` sont mutuellement exclusifs.
- `--gateway-token-ref-env` nécessite une env var non vide dans l'environnement du processus d'onboarding.
- Avec `--install-daemon`, lorsque l'auth par jeton nécessite un jeton, les jetons de gateway gérés par SecretRef sont validés mais ne sont pas persistés en tant que texte brut résolu dans les métadonnées de l'environnement du service superviseur.
- Avec `--install-daemon`, si le mode jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'onboarding échoue de manière fermée avec des instructions de correction.
- Avec `--install-daemon`, si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'onboarding bloque l'installation jusqu'à ce que le mode soit défini explicitement.
- L'onboarding local écrit `gateway.mode="local"` dans la configuration. Si un fichier de configuration ultérieur manque `gateway.mode`, considérez cela comme une corruption de la configuration ou une modification manuelle incomplète, et non comme un raccourci valide en mode local.
- L'onboarding local installe les plugins téléchargeables sélectionnés lorsque le chemin de configuration choisi les nécessite.
- L'onboarding distant écrit uniquement les informations de connexion pour le Gateway distant et n'installe pas les packages de plugins locaux.
- `--allow-unconfigured` est une échappatoire d'exécution de passerelle séparée. Cela ne signifie pas que l'onboarding peut omettre `gateway.mode`.

Exemple :

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

Santé de la passerelle locale non interactive :

- Sauf si vous passez `--skip-health`, l'onboarding attend une passerelle locale accessible avant de se terminer avec succès.
- `--install-daemon` lance d'abord le chemin d'installation de la passerelle gérée. Sans cela, vous devez déjà avoir une passerelle locale en cours d'exécution, par exemple `openclaw gateway run`.
- Si vous ne voulez que des écritures de config/workspace/bootstrap en automatisation, utilisez `--skip-health`.
- Si vous gérez les fichiers de l'espace de travail vous-même, passez `--skip-bootstrap` pour définir `agents.defaults.skipBootstrap: true` et sautez la création de `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` et `BOOTSTRAP.md`.
- Sur Windows natif, `--install-daemon` essaie d'abord les tâches planifiées et revient à un élément de connexion de dossier Démarrage par utilisateur si la création de tâche est refusée.

Comportement de l'onboarding interactif avec le mode de référence :

- Choisissez **Utiliser la référence secrète** lorsque vous y êtes invité.
- Choisissez ensuite soit :
  - Variable d'environnement
  - Provider de secrets configuré (`file` ou `exec`)
- L'onboarding effectue une validation préliminaire rapide avant d'enregistrer la référence.
  - Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

### Choix de point de terminaison Z.AI non interactif

<Note>`--auth-choice zai-api-key` détecte automatiquement le meilleur point de terminaison Z.AI pour votre clé (préfère l'API générale avec `zai/glm-5.1`). Si vous voulez spécifiquement les points de terminaison du plan de codage GLM, choisissez `zai-coding-global` ou `zai-coding-cn`.</Note>

```bash
# Promptless endpoint selection
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# Other Z.AI endpoint choices:
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

Exemple Mistral non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## Notes de flux

<AccordionGroup>
  <Accordion title="Types de flux">
    - `quickstart` : invites minimales, génère automatiquement un jeton de passerelle.
    - `manual` : invites complètes pour le port, la liaison et l'authentification (alias de `advanced`).
    - `import` : exécute un fournisseur de migration détecté, prévisualise le plan, puis l'applique après confirmation.

  </Accordion>
  <Accordion title="Préfiltrage du fournisseur">
    Lorsqu'un choix d'authentification implique un fournisseur préféré, l'onboarding préfiltre les sélecteurs de modèle par défaut et de liste verte vers ce fournisseur. Pour Volcengine et BytePlus, cela correspond également aux variantes de plan de codage (`volcengine-plan/*`, `byteplus-plan/*`).

    Si le filtre de fournisseur préféré ne donne encore aucun modèle chargé, l'onboarding revient au catalogue non filtré au lieu de laisser le sélecteur vide.

  </Accordion>
  <Accordion title="Suites de recherche Web">
    Certains fournisseurs de recherche Web déclenchent des invites de suite spécifiques au fournisseur :

    - **Grok** peut offrir une configuration facultative `x_search`OAuth avec le même profil OAuth xAI ou la même clé API et un choix de modèle `x_search`.
    - **Kimi** peut demander la région de l'Moonshot API (`api.moonshot.ai` contre `api.moonshot.cn`) et le modèle de recherche Web Kimi par défaut.

  </Accordion>
  <Accordion title="Autres comportements">
    - Comportement de la portée DM d'onboarding local : [Référence de configuration CLI](/fr/start/wizard-cli-reference#outputs-and-internals).
    - Premier chat le plus rapide : `openclaw dashboard` (Interface de contrôle, aucune configuration de canal).
    - Fournisseur personnalisé : connectez n'importe quel point de terminaison compatible OpenAI ou Anthropic, y compris les fournisseurs hébergés non répertoriés. Utilisez Inconnu pour détecter automatiquement.
    - Si un état Hermes est détecté, l'onboarding propose un flux de migration. Utilisez [Migrate](/fr/cli/migrate) pour les plans à blanc, le mode écrasement, les rapports et les mappages exacts.

  </Accordion>
</AccordionGroup>

## Commandes de suite courantes

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

Utilisez plutôt `openclaw setup` lorsque vous avez uniquement besoin de la configuration de base/de l'espace de travail. Utilisez `openclaw configure` ultérieurement pour des modifications ciblées et `openclaw channels add` pour une configuration de channel uniquement.

<Note>`--json` n'implique pas le mode non interactif. Utilisez `--non-interactive` pour les scripts.</Note>
