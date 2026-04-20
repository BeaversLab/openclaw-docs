---
summary: "Authentification de modèle : OAuth, clés API, réutilisation de Claude CLI et jeton de configuration Anthropic"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Authentification"
---

# Authentification (fournisseurs de modèles)

<Note>Cette page couvre l'authentification des **fournisseurs de modèles** (clés API, OAuth, réutilisation de Claude CLI et jeton de configuration Anthropic). Pour l'authentification de **connexion passerelle** (jeton, mot de passe, proxy de confiance), voir [Configuration](/fr/gateway/configuration) et [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth).</Note>

OpenClaw prend en charge OAuth et les clés API pour les fournisseurs de modèles. Pour les hôtes de passerelle toujours actifs, les clés API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth
sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre fournisseur.

Voir [/concepts/oauth](/fr/concepts/oauth) pour le flux OAuth complet et la disposition du stockage.
Pour l'authentification basée sur SecretRef (fournisseurs `env`/`file`/`exec`), voir [Gestion des secrets](/fr/gateway/secrets).
Pour les règles d'éligibilité des identifiants/codes de raison utilisées par `models status --probe`, voir
[Sémantique des identifiants d'authentification](/fr/auth-credential-semantics).

## Configuration recommandée (clé API, n'importe quel fournisseur)

Si vous exécutez une passerelle à longue durée de vie, commencez par une clé API pour votre
fournisseur choisi.
Pour Anthropic spécifiquement, l'authentification par clé API est toujours la configuration serveur la plus
prévisible, mais OpenClaw prend également en charge la réutilisation d'une connexion locale Claude CLI.

1. Créez une clé API dans la console de votre fournisseur.
2. Placez-la sur l'**hôte de la passerelle** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la passerelle fonctionne sous systemd/launchd, préférez placer la clé dans
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

Si vous préférez ne pas gérer les variables d'environnement vous-même, l'intégration peut stocker
les clés API pour une utilisation par le démon : `openclaw onboard`.

Voir [Aide](/fr/help) pour plus de détails sur l'héritage des variables d'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : Claude CLI et compatibilité des jetons

L'authentification par jeton de configuration Anthropic est toujours disponible dans OpenClaw en tant que chemin de jeton pris en charge. Le personnel d'Anthropic nous a depuis informés que l'utilisation de Claude CLI de style OpenClaw est
à nouveau autorisée, donc OpenClaw considère la réutilisation de Claude CLI et l'utilisation de `claude -p` comme
autorisées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Lorsque
la réutilisation de Claude CLI est disponible sur l'hôte, c'est désormais le chemin privilégié.

Pour les hôtes de passerelle longue durée, une clé API Anthropic reste toujours l'option la plus prévisible. Si vous souhaitez réutiliser une connexion Claude existante sur le même hôte, utilisez le chemin Anthropic Claude CLI dans onboarding/configure.

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

Les scripts ops facultatifs (systemd/Termux) sont documentés ici :
[Auth monitoring scripts](/fr/help/scripts#auth-monitoring-scripts)

## Note Anthropic

Le backend `claude-cli` d'Anthropic est à nouveau pris en charge.

- L'équipe d'Anthropic nous a informés que ce chemin d'intégration OpenClaw est à nouveau autorisé.
- OpenClaw considère donc la réutilisation du Claude CLI et l'utilisation de `claude -p` comme approuvées pour les exécutions supportées par Anthropic, sauf si Anthropic publie une nouvelle politique.
- Les clés API Anthropic restent le choix le plus prévisible pour les hôtes de passerelle longue durée et le contrôle explicite de la facturation côté serveur.

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

Définissez une priorité explicite de l'ordre des profils d'authentification pour un agent (stockée dans le `auth-state.json` de cet agent) :

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

Si le profil Anthropic est manquant, configurez une clé API Anthropic sur l'**hôte de passerelle** ou configurez le chemin setup-token Anthropic, puis vérifiez à nouveau :

```bash
openclaw models status
```

### Jeton expirant/expiré

Exécutez `openclaw models status` pour confirmer quel profil expire. Si un profil de jeton Anthropic est manquant ou expiré, actualisez cette configuration via setup-token ou migrez vers une clé API Anthropic.
