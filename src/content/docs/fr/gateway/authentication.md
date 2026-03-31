---
summary: "Authentification du modèle : OAuth, clés API et setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Authentification"
---

# Authentification

OpenClaw prend en charge OAuth et les clés API pour les providers de modèles. Pour les hôtes de gateway actifs en permanence, les clés API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre provider.

Voir [/concepts/oauth](/en/concepts/oauth) pour le flux OAuth complet et la disposition du stockage.
Pour l'authentification basée sur SecretRef (fournisseurs `env`/`file`/`exec`), voir [Secrets Management](/en/gateway/secrets).
Pour les règles d'éligibilité des identifiants/codes de raison utilisées par `models status --probe`, voir
[Auth Credential Semantics](/en/auth-credential-semantics).

## Configuration recommandée (clé API, n'importe quel provider)

Si vous exécutez une gateway longue durée, commencez par une clé API pour le provider de votre choix.
Pour Anthropic spécifiquement, l'authentification par clé API est la voie sûre et est recommandée par rapport à l'authentification par setup-token d'abonnement.

1. Créez une clé API dans la console de votre provider.
2. Placez-le sur l'**hôte de passerelle** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la Gateway fonctionne sous systemd/launchd, il est préférable de placer la clé dans
   `~/.openclaw/.env` afin que le démon puisse la lire :

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

Redémarrez ensuite le démon (ou redémarrez votre processus Gateway) et vérifiez à nouveau :

```bash
openclaw models status
openclaw doctor
```

Si vous préférez ne pas gérer les env vars vous-même, onboarding peut stocker
les API pour le démon : `openclaw onboard`.

Consultez [Help](/en/help) pour plus de détails sur l'héritage des variables d'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : setup-token (authentification par abonnement)

Si vous utilisez un abonnement Claude, le flux setup-token est pris en charge. Exécutez-le
sur l'**hôte de la gateway** :

```bash
claude setup-token
```

Collez-le ensuite dans OpenClaw :

```bash
openclaw models auth setup-token --provider anthropic
```

Si le jeton a été créé sur une autre machine, collez-le manuellement :

```bash
openclaw models auth paste-token --provider anthropic
```

Si vous voyez une erreur Anthropic telle que :

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…utilisez plutôt une clé Anthropic API.

<Warning>La prise en charge du setup-token Anthropic est une compatibilité technique uniquement. Anthropic a bloqué par le passé certaines utilisations d'abonnement en dehors de Claude Code. Utilisez-le uniquement si vous décidez que le risque stratégique est acceptable, et vérifiez vous-même les conditions actuelles de Anthropic.</Warning>

Saisie manuelle du jeton (n'importe quel provider ; écrit `auth-profiles.json` + met à jour la configuration) :

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

Les références de profil d'authentification sont également prises en charge pour les identifiants statiques :

- Les identifiants `api_key` peuvent utiliser `keyRef: { source, provider, id }`
- Les identifiants `token` peuvent utiliser `tokenRef: { source, provider, id }`

Vérification adaptée à l'automatisation (exit `1` lorsqu'expiré/absent, `2` lors de l'expiration) :

```bash
openclaw models status --check
```

Des scripts d'exploitation facultatifs (systemd/Termux) sont documentés ici :
[/automation/auth-monitoring](/en/automation/auth-monitoring)

> `claude setup-token` nécessite un TTY interactif.

## Anthropic : migration de Claude CLI

Si Claude CLI est déjà installé et connecté sur l'hôte de la passerelle, vous pouvez
basculer une configuration Anthropic existante vers le backend CLI au lieu de coller un
setup-token :

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Cela conserve vos profils d'auth Anthropic existants pour le retour en arrière, mais modifie la
sélection du modèle par défaut vers `claude-cli/...` et ajoute les entrées correspondantes de la liste d'autorisation (allowlist) de Claude CLI
sous `agents.defaults.models`.

Raccourci Onboarding :

```bash
openclaw onboard --auth-choice anthropic-cli
```

## Vérification du statut d'auth du modèle

```bash
openclaw models status
openclaw doctor
```

## Comportement de la rotation des clés API (passerelle)

Certains fournisseurs prennent en charge la réessai d'une demande avec des clés alternatives lorsqu'un appel API atteint une limite de taux du fournisseur.

- Ordre de priorité :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Les fournisseurs Google incluent également `GOOGLE_API_KEY` comme solution de repli supplémentaire.
- La même liste de clés est dédupliquée avant utilisation.
- OpenClaw réessaie avec la clé suivante uniquement pour les erreurs de limite de taux (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`).
- Les erreurs non liées aux limites de taux ne sont pas réessayées avec des clés alternatives.
- Si toutes les clés échouent, l'erreur finale de la dernière tentative est renvoyée.

## Contrôle des informations d'identification utilisées

### Par session (commande de chat)

Utilisez `/model <alias-or-id>@<profileId>` pour épingler un identifiant de fournisseur spécifique pour la session en cours (exemples d'identifiants de profil : `anthropic:default`, `anthropic:work`).

Utilisez `/model` (ou `/model list`) pour un sélecteur compact ; utilisez `/model status` pour la vue complète (candidats + prochain profil d'authentification, ainsi que les détails du point de terminaison du fournisseur lorsque configuré).

### Par agent (remplacement CLI)

Définissez un ordre de remplacement explicite du profil d'authentification pour un agent (stocké dans le `auth-profiles.json` de cet agent) :

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Utilisez `--agent <id>` pour cibler un agent spécifique ; omettez-le pour utiliser l'agent par défaut configuré.

## Dépannage

### "Aucune identité trouvée"

Si le profil de jeton Anthropic est manquant, exécutez `claude setup-token` sur l'
**hôte de passerelle**, puis vérifiez à nouveau :

```bash
openclaw models status
```

### Jeton en cours d'expiration ou expiré

Exécutez `openclaw models status` pour confirmer quel profil expire. Si le profil
est manquant, relancez `claude setup-token` et collez à nouveau le jeton.

## Conditions requises

- Compte d'abonnement Anthropic (pour `claude setup-token`)
- Claude Code CLI installé (commande `claude` disponible)
