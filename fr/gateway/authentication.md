---
summary: "Authentification du modèle : OAuth, clés API et setup-token"
read_when:
  - Débogage de l'authentification du modèle ou de l'expiration OAuth
  - Documentation sur l'authentification ou le stockage des informations d'identification
title: "Authentication"
---

# Authentication

OpenClaw prend en charge OAuth et les clés API pour les providers de modèles. Pour les hôtes de passerelle (gateway) toujours actifs, les clés API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre provider.

Consultez [/concepts/oauth](/fr/concepts/oauth) pour le flux complet OAuth et la structure de stockage.
Pour l'authentification basée sur SecretRef (providers `env`/`file`/`exec`), consultez [Gestion des secrets](/fr/gateway/secrets).
Pour les règles d'éligibilité des informations d'identification et les codes de raison utilisés par `models status --probe`, consultez
[Sémantique des informations d'identification d'authentification](/fr/auth-credential-semantics).

## Configuration recommandée (clé API, n'importe quel provider)

Si vous exécutez une passerelle (gateway) longue durée, commencez par une clé API pour le provider de votre choix.
Pour Anthropic spécifiquement, l'authentification par clé API est la voie sûre et est recommandée par rapport à l'authentification par setup-token d'abonnement.

1. Créez une clé API dans la console de votre provider.
2. Placez-la sur l'**hôte de la passerelle** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si le Gateway s'exécute sous systemd/launchd, il est préférable de placer la clé dans
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

Si vous préférez ne pas gérer les env vars vous-même, l'intégration (onboarding) peut stocker
les clés API pour une utilisation par le démon : `openclaw onboard`.

Consultez [Aide](/fr/help) pour plus de détails sur l'héritage des variables d'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : setup-token (authentification par abonnement)

Si vous utilisez un abonnement Claude, le flux setup-token est pris en charge. Exécutez-le
sur l'**hôte de la passerelle** :

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

<Warning>
Le support du Anthropic setup-token est uniquement une compatibilité technique. Anthropic a bloqué
par le passé certaines utilisations d'abonnement en dehors de Claude Code. Utilisez-le uniquement si vous décidez
que le risque de politique est acceptable, et vérifiez vous-même les conditions actuelles de Anthropic.
</Warning>

Saisie manuelle de jeton (n'importe quel fournisseur ; écrit `auth-profiles.json` + met à jour la configuration) :

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

Les références de profil d'authentification sont également prises en charge pour les identifiants statiques :

- Les identifiants `api_key` peuvent utiliser `keyRef: { source, provider, id }`
- Les identifiants `token` peuvent utiliser `tokenRef: { source, provider, id }`

Vérification conviviale pour l'automatisation (sort `1` lorsqu'il est expiré/manquant, `2` lorsqu'il est sur le point d'expirer) :

```bash
openclaw models status --check
```

Les scripts d'exploitation facultatifs (systemd/Termux) sont documentés ici :
[/automation/auth-monitoring](/fr/automation/auth-monitoring)

> `claude setup-token` nécessite un TTY interactif.

## Vérification du statut d'authentification du modèle

```bash
openclaw models status
openclaw doctor
```

## Comportement de la rotation des clés API (passerelle)

Certains fournisseurs prennent en charge la réessaye d'une demande avec des clés alternatives lorsqu'un appel API
atteint une limite de taux du fournisseur.

- Ordre de priorité :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Les fournisseurs Google incluent également `GOOGLE_API_KEY` comme solution de repli supplémentaire.
- La même liste de clés est dédupliquée avant utilisation.
- OpenClaw réessaie avec la clé suivante uniquement pour les erreurs de limite de taux (par exemple
  `429`, `rate_limit`, `quota`, `resource exhausted`).
- Les erreurs non liées aux limites de taux ne sont pas réessayées avec des clés alternatives.
- Si toutes les clés échouent, l'erreur finale de la dernière tentative est renvoyée.

## Contrôle de l'identifiant utilisé

### Par session (commande de chat)

Utilisez `/model <alias-or-id>@<profileId>` pour épingler un identifiant de fournisseur spécifique pour la session actuelle (exemples d'ids de profil : `anthropic:default`, `anthropic:work`).

Utilisez `/model` (ou `/model list`) pour un sélecteur compact ; utilisez `/model status` pour la vue complète (candidats + prochain profil d'authentification, plus détails du point de terminaison du fournisseur lorsque configuré).

### Par agent (remplacement CLI)

Définir un ordre explicite de remplacement du profil d'authentification pour un agent (stocké dans le `auth-profiles.json` de cet agent) :

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Utilisez `--agent <id>` pour cibler un agent spécifique ; omettez-le pour utiliser l'agent par défaut configuré.

## Dépannage

### "Aucune identifiants trouvés"

Si le profil de jeton Anthropic est manquant, exécutez `claude setup-token` sur l'hôte de la passerelle (gateway host), puis revérifiez :

```bash
openclaw models status
```

### Jeton expirant/expiré

Exécutez `openclaw models status` pour confirmer quel profil expire. Si le profil est manquant, relancez `claude setup-token` et collez à nouveau le jeton.

## Conditions requises

- Compte d'abonnement Anthropic (pour `claude setup-token`)
- Claude Code CLI installé (commande `claude` disponible)

import en from "/components/footer/en.mdx";

<en />
