---
summary: "Authentification de modèle : OAuth, clés API et jeton de configuration hérité OAuth"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Authentification"
---

# Authentification (fournisseurs de modèles)

<Note>Cette page traite de l'authentification des **fournisseurs de modèles** (clés API, OAuth et jeton de configuration hérité Anthropic). Pour l'authentification de **connexion de passerelle** (jeton, mot de passe, trusted-proxy), voir [Configuration](/en/gateway/configuration) et [Authentification de proxy de confiance](/en/gateway/trusted-proxy-auth).</Note>

OpenClaw prend en charge OAuth et les clés API pour les fournisseurs de modèles. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth
sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre fournisseur.

Voir [/concepts/oauth](/en/concepts/oauth) pour le flux complet OAuth et la disposition du stockage.
Pour l'authentification basée sur SecretRef (fournisseurs `env`/`file`/`exec`), voir [Gestion des secrets](/en/gateway/secrets).
Pour les règles d'éligibilité des identifiants/codes de raison utilisées par `models status --probe`, voir
[Sémantique des identifiants d'authentification](/en/auth-credential-semantics).

## Configuration recommandée (clé API, n'importe quel fournisseur)

Si vous exécutez une passerelle longue durée, commencez par une clé API pour votre fournisseur
choisi.
Plus spécifiquement pour Anthropic, l'authentification par clé API est la voie sûre. L'authentification
de type abonnement Anthropic à l'intérieur de OpenClaw est la voie héritée du jeton de configuration et
doit être considérée comme une voie **Extra Usage**, et non comme une voie de limites de plan.

1. Créez une clé API dans la console de votre fournisseur.
2. Placez-la sur l'**hôte de passerelle** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la Gateway fonctionne sous systemd/launchd, préférez mettre la clé dans
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

Si vous préférez ne pas gérer les env vars vous-même, l'onboarding peut stocker
les clés API pour une utilisation par le démon : `openclaw onboard`.

Voir [Aide](/en/help) pour des détails sur l'héritage de l'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : compatibilité avec les jetons hérités

L'authentification par jeton de configuration Anthropic est toujours disponible dans OpenClaw comme une
voie héritée/manuelle. La documentation publique de Claude Code de Anthropic couvre toujours l'utilisation
directe du terminal Claude Code sous les plans Claude, mais Anthropic a indiqué séparément aux
utilisateurs de OpenClaw que la voie de connexion Claude de **OpenClaw** compte comme une utilisation
de tierce partie et nécessite un **Extra Usage** facturé séparément de
l'abonnement.

Pour la méthode de configuration la plus claire, utilisez une clé API Anthropic. Si vous devez conserver un chemin d'abonnement API dans Anthropic, utilisez le chemin legacy setup-token avec l'attente que OpenClaw le traite comme **Extra Usage**.

Saisie manuelle de jeton (n'importe quel fournisseur ; écrit `auth-profiles.json` + met à jour la configuration) :

```bash
openclaw models auth paste-token --provider openrouter
```

Les références de profil d'authentification sont également prises en charge pour les identifiants statiques :

- Les identifiants `api_key` peuvent utiliser `keyRef: { source, provider, id }`
- Les identifiants `token` peuvent utiliser `tokenRef: { source, provider, id }`
- Les profils en mode OAuth ne prennent pas en charge les identifiants SecretRef ; si `auth.profiles.<id>.mode` est défini sur `"oauth"`, la saisie `keyRef`/`tokenRef` basée sur SecretRef pour ce profil est rejetée.

Vérification adaptée à l'automatisation (code de sortie `1` lorsqu'il est expiré/manquant, `2` lorsqu'il expire) :

```bash
openclaw models status --check
```

Sondages d'authentification en direct :

```bash
openclaw models status --probe
```

Notes :

- Les lignes de sondage peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
- Si un `auth.order.<provider>` explicite omet un profil stocké, le sondage signale `excluded_by_auth_order` pour ce profil au lieu de l'essayer.
- Si une authentification existe mais que OpenClaw ne peut pas résoudre un candidat de modèle sondable pour ce fournisseur, le sondage signale `status: no_model`.
- Les temps de recharge de limite de taux peuvent être limités au modèle. Un profil en recharge pour un modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur.

Les scripts d'opération facultatifs (systemd/Termux) sont documentés ici :
[Auth monitoring scripts](/en/help/scripts#auth-monitoring-scripts)

## Note Anthropic

Le backend `claude-cli` Anthropic a été supprimé.

- Utilisez les clés API Anthropic API pour le trafic Anthropic dans OpenClaw.
- Le setup-token Anthropic reste un chemin legacy/manuel et doit être utilisé avec l'attente de facturation Extra Usage que Anthropic a communiquée aux utilisateurs OpenClaw.
- `openclaw doctor` détecte désormais l'état obsolète et supprimé du Claude Anthropic CLI. Si les octets d'identifiant stockés existent toujours, doctor les reconvertit en profils de jeton/OAuth Anthropic. Sinon, doctor supprime la configuration obsolète du Claude OAuth et vous dirige vers la récupération par clé API ou setup-token.

## Vérification de l'état de l'authentification du modèle

```bash
openclaw models status
openclaw doctor
```

## Comportement de la rotation des clés API (passerelle)

Certains fournisseurs prennent en charge la réessai d'une demande avec des clés alternatives lorsqu'un appel API atteint une limite de débit du fournisseur.

- Ordre de priorité :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Les fournisseurs Google incluent également `GOOGLE_API_KEY` comme repli supplémentaire.
- La même liste de clés est dédupliquée avant utilisation.
- OpenClaw réessaie avec la clé suivante uniquement pour les erreurs de limite de débit (par exemple
  `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`, ou
  `workers_ai ... quota limit exceeded`).
- Les erreurs non liées à la limite de débit ne sont pas réessayées avec des clés alternatives.
- Si toutes les clés échouent, l'erreur finale de la dernière tentative est renvoyée.

## Contrôle des informations d'identification utilisées

### Par session (commande de chat)

Utilisez `/model <alias-or-id>@<profileId>` pour épingler une information d'identification de fournisseur spécifique pour la session en cours (exemples d'identifiants de profil : `anthropic:default`, `anthropic:work`).

Utilisez `/model` (ou `/model list`) pour un sélecteur compact ; utilisez `/model status` pour la vue complète (candidats + prochain profil d'authentification, ainsi que les détails du point de terminaison du fournisseur lorsque configuré).

### Par agent (remplacement CLI)

Définissez un ordre de remplacement explicite du profil d'authentification pour un agent (stocké dans le `auth-profiles.json` de cet agent) :

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Utilisez `--agent <id>` pour cibler un agent spécifique ; omettez-le pour utiliser l'agent par défaut configuré.
Lorsque vous déboguez des problèmes d'ordre, `openclaw models status --probe` affiche les profils
stockés omis sous la forme `excluded_by_auth_order` au lieu de les ignorer silencieusement.
Lorsque vous déboguez des problèmes de temps de recharge, rappelez-vous que les temps de recharge des limites de débit peuvent être liés
à un identifiant de modèle plutôt qu'à l'ensemble du profil du fournisseur.

## Dépannage

### "Aucune information d'identification trouvée"

Si le profil Anthropic est manquant, configurez une clé Anthropic API sur l'**hôte de la passerelle** ou configurez le chemin du jeton de configuration Anthropic hérité, puis vérifiez à nouveau :

```bash
openclaw models status
```

### Jeton expirant/expiré

Exécutez `openclaw models status` pour confirmer le profil qui expire. Si un profil de jeton Anthropic hérité est manquant ou expiré, actualisez cette configuration via setup-token ou migrez vers une clé Anthropic API.

Si la machine possède encore un état Anthropic Claude CLI obsolète et supprimé des anciennes versions, exécutez :

```bash
openclaw doctor --yes
```

Doctor reconvertit `anthropic:claude-cli` en jeton Anthropic/OAuth lorsque les octets d'identification stockés existent toujours. Sinon, il supprime les références de profil/config/modèle obsolètes de Claude CLI et laisse les instructions pour l'étape suivante.
