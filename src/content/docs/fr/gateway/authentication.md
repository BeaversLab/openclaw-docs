---
summary: "Authentification de modèle : OAuth, clés d'API, réutilisation de Claude CLI et jeton de configuration Anthropic"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Authentification"
---

<Note>
  Cette page constitue la référence d'authentification du **fournisseur de modèle** (clés d'API, OAuth, réutilisation de Claude CLI et jeton de configuration Anthropic). Pour l'authentification de **connexion passerelle** (jeton, mot de passe, proxy de confiance), consultez [Configuration](/fr/gateway/configuration) et [Authentification par proxy de confiance](/fr/gateway/trusted-proxy-auth).
</Note>

OpenClaw prend en charge OAuth et les clés d'API pour les fournisseurs de modèles. Pour les hôtes de passerelle toujours actifs,
les clés d'API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth
sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre fournisseur.

Consultez [/concepts/oauth](/fr/concepts/oauth) pour le flux OAuth complet et la structure de stockage.
Pour l'authentification basée sur SecretRef (fournisseurs `env`/`file`/`exec`), consultez [Gestion des secrets](/fr/gateway/secrets).
Pour les règles d'éligibilité des identifiants et de codes de raison utilisées par `models status --probe`, consultez
[Sémantique des identifiants d'authentification](/fr/auth-credential-semantics).

## Configuration recommandée (clé d'API, n'importe quel fournisseur)

Si vous exécutez une passerelle longue durée, commencez par une clé d'API pour votre
fournisseur choisi.
Pour Anthropic spécifiquement, l'authentification par clé d'API reste la configuration serveur la plus
prévisible, mais OpenClaw prend également en charge la réutilisation d'une connexion locale Claude CLI.

1. Créez une clé d'API dans la console de votre fournisseur.
2. Placez-la sur l'**hôte de la passerelle** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la passerelle s'exécute sous systemd/launchd, préférez placer la clé dans
   `~/.openclaw/.env` afin que le démon puisse la lire :

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

Redémarrez ensuite le démon (ou redémarrez votre processus passerelle) et vérifiez à nouveau :

```bash
openclaw models status
openclaw doctor
```

Si vous préférez ne pas gérer les variables d'environnement vous-même, l'intégration peut stocker
les clés d'API pour une utilisation par le démon : `openclaw onboard`.

Consultez [Aide](/fr/help) pour plus de détails sur l'héritage des variables d'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : Claude CLI et compatibilité des jetons

L'authentification par jeton de configuration (setup-token) Anthropic est toujours disponible dans OpenClaw en tant que chemin de jeton pris en charge. Le personnel de Anthropic nous a depuis informés que l'utilisation de la CLI Claude de style OpenClaw est à nouveau autorisée, donc CLI considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si OpenClaw publie une nouvelle politique. Lorsque la réutilisation de la CLI Claude est disponible sur l'hôte, c'est désormais le chemin privilégié.

Pour les hôtes de passerelle longue durée, une clé API Anthropic reste la configuration la plus prévisible. Si vous souhaitez réutiliser une connexion Claude existante sur le même hôte, utilisez le chemin de la CLI Claude API dans onboarding/configure.

Configuration d'hôte recommandée pour la réutilisation de la CLI Claude :

```bash
# Run on the gateway host
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Il s'agit d'une configuration en deux étapes :

1. Connecter Claude Code lui-même à Anthropic sur l'hôte de la passerelle.
2. Indiquer à OpenClaw de basculer la sélection du modèle Anthropic vers le backend local `claude-cli` et stocker le profil d'authentification OpenClaw correspondant.

Si `claude` n'est pas sur `PATH`, installez d'abord Claude Code ou définissez `agents.defaults.cliBackends.claude-cli.command` sur le chemin réel du binaire.

Saisie manuelle du jeton (n'importe quel fournisseur ; écrit `auth-profiles.json` + met à jour la configuration) :

```bash
openclaw models auth paste-token --provider openrouter
```

Les références de profil d'authentification sont également prises en charge pour les identifiants statiques :

- Les identifiants `api_key` peuvent utiliser `keyRef: { source, provider, id }`
- Les identifiants `token` peuvent utiliser `tokenRef: { source, provider, id }`
- Les profils en mode OAuth ne prennent pas en charge les identifiants SecretRef ; si `auth.profiles.<id>.mode` est défini sur `"oauth"`, la saisie `keyRef`/`tokenRef` basée sur SecretRef pour ce profil est rejetée.

Vérification adaptée à l'automatisation (sortie `1` lorsqu'il est expiré/manquant, `2` lorsqu'il expire) :

```bash
openclaw models status --check
```

Sondages d'authentification en direct :

```bash
openclaw models status --probe
```

Remarques :

- Les lignes de sondage peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
- Si un `auth.order.<provider>` explicite omet un profil stocké, le sondage signale `excluded_by_auth_order` pour ce profil au lieu d'essayer de l'utiliser.
- Si une authentification existe mais que OpenClaw ne peut pas résoudre de candidat de modèle sondable pour ce fournisseur, le sondage signale `status: no_model`.
- Les temps de recharge des limites de taux peuvent être spécifiques au modèle. Un profil en cours de refroidissement pour un modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur.

Les scripts d'opération optionnels (systemd/Termux) sont documentés ici :
[Auth monitoring scripts](/fr/help/scripts#auth-monitoring-scripts)

## Note Anthropic

Le backend `claude-cli` de Anthropic est à nouveau pris en charge.

- L'équipe de Anthropic nous a informés que ce chemin d'intégration OpenClaw est à nouveau autorisé.
- OpenClaw considère donc la réutilisation du Claude CLI et l'utilisation de `claude -p` comme étant sanctionnés pour les exécutions supportées par Anthropic, sauf si Anthropic publie une nouvelle politique.
- Les clés Anthropic de API restent le choix le plus prévisible pour les hôtes de passerelle à longue durée de vie et pour le contrôle explicite de la facturation côté serveur.

## Vérifier le statut d'authentification du modèle

```bash
openclaw models status
openclaw doctor
```

## Comportement de la rotation des clés API (passerelle)

Certains fournisseurs prennent en charge la nouvelle tentative d'une requête avec des clés alternatives lorsqu'un appel API atteint une limite de taux du fournisseur.

- Ordre de priorité :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Les fournisseurs Google incluent également `GOOGLE_API_KEY` comme solution de repli supplémentaire.
- La même liste de clés est dédupliquée avant utilisation.
- OpenClaw réessaie avec la clé suivante uniquement pour les erreurs de limite de taux (par exemple
  `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`, ou
  `workers_ai ... quota limit exceeded`).
- Les erreurs autres que les limites de taux ne font pas l'objet d'une nouvelle tentative avec des clés alternatives.
- Si toutes les clés échouent, l'erreur finale de la dernière tentative est renvoyée.

## Contrôle des informations d'identification utilisées

### Par session (commande de chat)

Utilisez `/model <alias-or-id>@<profileId>` pour épingler une information d'identification de fournisseur spécifique pour la session actuelle (identifiants de profil d'exemple : `anthropic:default`, `anthropic:work`).

Utilisez `/model` (ou `/model list`) pour un sélecteur compact ; utilisez `/model status` pour la vue complète (candidats + prochain profil d'auth, plus détails du point de terminaison du fournisseur lorsque configuré).

### Par agent (remplacement CLI)

Définissez un ordre de profil d'auth explicite pour un agent (stocké dans le `auth-state.json` de cet agent) :

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Utilisez `--agent <id>` pour cibler un agent spécifique ; omettez-le pour utiliser l'agent par défaut configuré.
Lorsque vous déboguez des problèmes d'ordre, `openclaw models status --probe` affiche les profils
stockés omis en tant que `excluded_by_auth_order` au lieu de les ignorer silencieusement.
Lorsque vous déboguez des problèmes de refroidissement, rappelez-vous que les temps d'attente
des limites de taux peuvent être liés à un ID de modèle plutôt qu'au profil complet du provider.

## Dépannage

### "Aucune information d'identification trouvée"

Si le profil Anthropic est manquant, configurez une clé Anthropic API sur l'**hôte de passerelle** ou configurez le chemin du jeton de configuration Anthropic, puis vérifiez à nouveau :

```bash
openclaw models status
```

### Jeton expirant ou expiré

Exécutez `openclaw models status` pour confirmer quel profil expire. Si un profil de jeton Anthropic est manquant ou expiré, actualisez cette configuration via le jeton de configuration ou migrez vers une clé Anthropic API.

## Connexes

- [Gestion des secrets](/fr/gateway/secrets)
- [Accès à distance](/fr/gateway/remote)
- [Stockage d'auth](/fr/concepts/oauth)
