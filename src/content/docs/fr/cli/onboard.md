---
summary: "Référence CLI pour `openclaw onboard` (onboarding interactif)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

Onboarding interactif pour la configuration locale ou distante de Gateway.

## Guides connexes

- Hub d'onboarding CLI : [Onboarding (CLI)](/en/start/wizard)
- Aperçu de l'onboarding : [Onboarding Overview](/en/start/onboarding-overview)
- Référence de l'onboarding CLI : [CLI Setup Reference](/en/start/wizard-cli-reference)
- Automatisation CLI : [CLI Automation](/en/start/wizard-cli-automation)
- Onboarding macOS : [Onboarding (macOS App)](/en/start/onboarding)

## Exemples

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

Pour les cibles `ws://` de réseau privé en texte brut (réseaux de confiance uniquement), définissez
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` dans l'environnement du processus d'onboarding.

Provider personnalisé non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai
```

`--custom-api-key` est facultatif en mode non interactif. S'il est omis, l'onboarding vérifie `CUSTOM_API_KEY`.

Ollama non interactif :

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` correspond par défaut à `http://127.0.0.1:11434`. `--custom-model-id` est facultatif ; s'il est omis, l'onboarding utilise les valeurs par défaut suggérées par Ollama. Les ID de modèle cloud tels que `kimi-k2.5:cloud` fonctionnent également ici.

Stocker les clés de provider en tant que références au lieu de texte brut :

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Avec `--secret-input-mode ref`, l'onboarding écrit des références basées sur des variables d'environnement au lieu des valeurs de clés en texte brut.
Pour les providers basés sur un profil d'authentification, cela écrit des entrées `keyRef` ; pour les providers personnalisés, cela écrit `models.providers.<id>.apiKey` en tant que référence d'environnement (par exemple `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrat du mode non interactif `ref` :

- Définissez la variable d'environnement du provider dans l'environnement du processus d'onboarding (par exemple `OPENAI_API_KEY`).
- Ne transmettez pas de drapeaux de clé en ligne (par exemple `--openai-api-key`) sauf si cette variable d'environnement est également définie.
- Si un indicateur de clé inline est transmis sans la env var requise, l'onboarding échoue rapidement avec des instructions.

Options de jeton Gateway en mode non interactif :

- `--gateway-auth token --gateway-token <token>` stocke un jeton en texte clair.
- `--gateway-auth token --gateway-token-ref-env <name>` stocke `gateway.auth.token` en tant qu'env SecretRef.
- `--gateway-token` et `--gateway-token-ref-env` s'excluent mutuellement.
- `--gateway-token-ref-env` nécessite une env var non vide dans l'environnement du processus d'onboarding.
- Avec `--install-daemon`, lorsque l'authentification par jeton nécessite un jeton, les jetons de gateway gérés par SecretRef sont validés mais ne sont pas persistés en texte clair résolu dans les métadonnées de l'environnement du service superviseur.
- Avec `--install-daemon`, si le mode jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, l'onboarding échoue de manière fermée avec des instructions de correction.
- Avec `--install-daemon`, si `gateway.auth.token` et `gateway.auth.password` sont configurés et que `gateway.auth.mode` n'est pas défini, l'onboarding bloque l'installation jusqu'à ce que le mode soit défini explicitement.
- L'onboarding local écrit `gateway.mode="local"` dans la configuration. Si un fichier de configuration ultérieur manque `gateway.mode`, considérez cela comme une corruption de la configuration ou une modification manuelle incomplète, et non comme un raccourci de mode local valide.
- `--allow-unconfigured` est une porte de secours d'exécution de passerelle séparée. Cela ne signifie pas que l'onboarding peut omettre `gateway.mode`.

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

Santé non interactive de la passerelle locale :

- À moins que vous ne passiez `--skip-health`, l'onboarding attend une passerelle locale accessible avant de se terminer avec succès.
- `--install-daemon` lance d'abord le chemin d'installation de la passerelle gérée. Sans cela, vous devez déjà avoir une passerelle locale en cours d'exécution, par exemple `openclaw gateway run`.
- Si vous souhaitez uniquement des écritures de configuration/espace de travail/bootstrap en automatisation, utilisez `--skip-health`.
- Sur Windows natif, `--install-daemon` essaie d'abord les tâches planifiées et se replie sur un élément de connexion dans le dossier Démarrage par utilisateur si la création de tâche est refusée.

Comportement de l'onboarding interactif avec le mode de référence :

- Choisissez **Use secret reference** lorsqu'on vous le demande.
- Ensuite, choisissez soit :
  - Variable d'environnement
  - Fournisseur de secrets configuré (`file` ou `exec`)
- L'onboarding effectue une validation préalable rapide avant d'enregistrer la référence.
  - Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

Choix de point de terminaison Z.AI non interactif :

Remarque : `--auth-choice zai-api-key` détecte désormais automatiquement le meilleur point de terminaison Z.AI pour votre clé (préfère l'API générale avec `zai/glm-5`).
Si vous souhaitez spécifiquement les points de terminaison du plan de codage GLM, choisissez `zai-coding-global` ou `zai-coding-cn`.

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

Exemple non interactif Mistral :

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

Notes de flux :

- `quickstart` : invites minimales, génère automatiquement un jeton de passerelle.
- `manual` : invites complets pour le port/bind/auth (alias de `advanced`).
- Lorsqu'un choix d'auth implique un provider préféré, l'onboarding pré-filtre
  les sélecteurs de modèle par défaut et de liste d'autorisation vers ce provider. Pour Volcengine et
  BytePlus, cela correspond également aux variantes de coding-plan
  (`volcengine-plan/*`, `byteplus-plan/*`).
- Si le filtre de provider préféré ne donne encore aucun modèle chargé, l'onboarding
  revient au catalogue non filtré au lieu de laisser le sélecteur vide.
- Dans l'étape de recherche web, certains providers peuvent déclencher des
  invites de suivi spécifiques au provider :
  - **Grok** peut proposer une configuration `x_search` facultative avec le même `XAI_API_KEY`
    et un choix de modèle `x_search`.
  - **Kimi** peut demander la région de l'Moonshot API (`api.moonshot.ai` vs
    `api.moonshot.cn`) et le modèle de recherche web Kimi par défaut.
- Comportement de la portée DM de l'onboarding local : [Référence de configuration CLI](/en/start/wizard-cli-reference#outputs-and-internals).
- Premier chat le plus rapide : `openclaw dashboard` (UI de contrôle, aucune configuration de channel).
- Provider personnalisé : connectez n'importe quel point de terminaison compatible OpenAI ou Anthropic,
  y compris les providers hébergés non répertoriés. Utilisez Inconnu pour la détection automatique.

## Commandes de suivi courantes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` n'implique pas le mode non interactif. Utilisez `--non-interactive` pour les scripts.</Note>
