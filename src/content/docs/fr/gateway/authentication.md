---
summary: "OAuthAPICLIAnthropicAuthentification du modèle : OAuth, clés API, réutilisation de la CLI Claude et jeton de configuration Anthropic"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Authentification"
---

<Note>
  Cette page constitue la référence d'authentification du **fournisseur de modèle** (clés API, OAuth, réutilisation de la CLI Claude et jeton de configuration Anthropic). Pour l'authentification de **connexion passerelle** (jeton, mot de passe, proxy de confiance), consultez [Configuration](APIOAuthCLIAnthropic/en/gateway/configuration) et [Authentification par proxy de
  confiance](/fr/gateway/trusted-proxy-auth).
</Note>

OpenClaw prend en charge OAuth et les clés d'API pour les fournisseurs de modèles. Pour les hôtes de passerelle toujours actifs,
les clés d'API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth
sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre fournisseur.

Consultez [/concepts/oauth](/fr/concepts/oauthOAuth) pour le flux OAuth complet et la disposition du stockage.
Pour l'authentification basée sur SecretRef (fournisseurs `env`/`file`/`exec`), consultez [Gestion des secrets](/fr/gateway/secrets).
Pour les règles d'éligibilité des identifiants et de codes de raison utilisées par `models status --probe`, consultez
[Sémantique des identifiants d'authentification](/fr/auth-credential-semantics).

## Configuration recommandée (clé d'API, n'importe quel fournisseur)

Si vous exécutez une Gateway à longue durée de vie, commencez par une clé API pour votre fournisseur choisi.
Pour Anthropic spécifiquement, l'authentification par clé API reste toujours la configuration serveur la plus prévisible, mais OpenClaw prend également en charge la réutilisation d'une connexion locale à la CLI Claude.

1. Créez une clé d'API dans la console de votre fournisseur.
2. Placez-le sur l'**hôte de la passerelle** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la passerelle s'exécute sous systemd/launchd, préférez placer la clé dans
   Gateway`~/.openclaw/.env` afin que le démon puisse la lire :

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
les clés API pour le démon : API`openclaw onboard`.

Consultez [Aide](/fr/help) pour plus de détails sur l'héritage des variables d'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : Claude CLI et compatibilité des jetons

L'authentification par jeton de configuration d'Anthropic est toujours disponible dans OpenClaw en tant que chemin de jeton pris en charge. Le personnel d'Anthropic nous a depuis informés que l'utilisation de la CLI Claude à la manière d'OpenClaw est à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de AnthropicOpenClawAnthropicOpenClawCLIOpenClawCLI`claude -p`AnthropicCLI comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Lorsque la réutilisation de la CLI Claude est disponible sur l'hôte, c'est désormais le chemin privilégié.

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
2. Indiquez à OpenClaw de basculer la sélection du modèle Anthropic vers le backend local OpenClawAnthropic`claude-cli`OpenClaw et de stocker le profil d'authentification OpenClaw correspondant.

Si `claude` n'est pas dans `PATH`, installez d'abord Claude Code ou définissez `agents.defaults.cliBackends.claude-cli.command` sur le chemin réel du binaire.

Saisie manuelle du jeton (n'importe quel fournisseur ; écrit `auth-profiles.json` + met à jour la configuration) :

```bash
openclaw models auth paste-token --provider openrouter
```

`auth-profiles.json` stocke uniquement les identifiants. La forme canonique est :

```json
{
  "version": 1,
  "profiles": {
    "openrouter:default": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "OPENROUTER_API_KEY"
    }
  }
}
```

OpenClaw s'attend à la forme canonique OpenClaw`version` + `profiles` au moment de l'exécution. Si une ancienne installation possède toujours un fichier plat tel que `{ "openrouter": { "apiKey": "..." } }`, exécutez `openclaw doctor --fix``openrouter:default` pour le réécrire en tant que profil de clé API ; doctor conserve une copie `.legacy-flat.*.bak` à côté de l'original. Les détails du point de terminaison tels que `baseUrl`, `api`, les identifiants de modèle, les en-têtes et les délais d'attente appartiennent sous `models.providers.<id>` dans `openclaw.json` ou `models.json`, et non dans `auth-profiles.json`.

Les routes d'authentification externes telles que Bedrock `auth: "aws-sdk"` ne sont pas non plus des identifiants. Si vous souhaitez une route Bedrock nommée, placez `auth.profiles.<id>.mode: "aws-sdk"` dans `openclaw.json` ; n'écrivez pas `type: "aws-sdk"` dans `auth-profiles.json`. `openclaw doctor --fix` déplace les marqueurs hérités du AWS SDK du stockage d'identifiants vers les métadonnées de configuration.

Les références de profil d'authentification sont également prises en charge pour les identifiants statiques :

- Les identifiants `api_key` peuvent utiliser `keyRef: { source, provider, id }`
- Les identifiants `token` peuvent utiliser `tokenRef: { source, provider, id }`
- Les profils en mode OAuth ne prennent pas en charge les identifiants SecretRef ; si `auth.profiles.<id>.mode` est défini sur `"oauth"`, l'entrée `keyRef`/`tokenRef` soutenue par SecretRef pour ce profil est rejetée.

Vérification adaptée à l'automatisation (sortie `1` en cas d'expiration/absence, `2` en cas d'expiration imminente) :

```bash
openclaw models status --check
```

Sondages d'authentification en direct :

```bash
openclaw models status --probe
```

Notes :

- Les lignes de sonde peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
- Si un `auth.order.<provider>` explicite omet un profil stocké, la sonde signale
  `excluded_by_auth_order` pour ce profil au lieu de l'essayer.
- Si une authentification existe mais que OpenClaw ne peut pas résoudre de candidat de modèle sondeable pour
  ce fournisseur, la sonde signale `status: no_model`.
- Les temps de recharge limites de débit peuvent être limités au modèle. Un profil en cours de recharge pour un
  modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur.

Les scripts d'exploitation facultatifs (systemd/Termux) sont documentés ici :
[Scripts de surveillance d'authentification](/fr/help/scripts#auth-monitoring-scripts)

## Note Anthropic

Le backend Anthropic `claude-cli` est pris en charge à nouveau.

- Le personnel de Anthropic nous a informés que ce chemin d'intégration OpenClaw est à nouveau autorisé.
- OpenClaw traite donc la réutilisation du CLI Claude et l'utilisation de `claude -p` comme étant autorisées
  pour les exécutions soutenues par Anthropic, sauf si Anthropic publie une nouvelle politique.
- Les clés API AnthropicAPI restent le choix le plus prévisible pour les hébergeurs de passerelle à longue durée de vie et le contrôle explicite de la facturation côté serveur.

## Vérification du statut d'authentification du modèle

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
- Les fournisseurs Google incluent également `GOOGLE_API_KEY` comme secours supplémentaire.
- La même liste de clés est dédupliquée avant utilisation.
- OpenClaw réessaie avec la clé suivante uniquement pour les erreurs de limitation de débit (par exemple
  `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`, ou
  `workers_ai ... quota limit exceeded`).
- Les erreurs non liées aux limites de débit ne font pas l'objet d'une nouvelle tentative avec des clés alternatives.
- Si toutes les clés échouent, l'erreur finale de la dernière tentative est renvoyée.

## Suppression de l'authentification du fournisseur pendant que la passerelle est en cours d'exécution

Lorsque l'authentification du fournisseur est supprimée via le panneau de contrôle du Gateway, OpenClaw supprime
les profils d'authentification enregistrés pour ce fournisseur et interrompt les exécutions de chat ou d'agent actives
dont le fournisseur de model sélectionné correspond au fournisseur supprimé. Les exécutions interrompues émettent
les événements normaux d'annulation de chat et de cycle de vie avec
`stopReason: "auth-revoked"`, afin que les clients connectés puissent indiquer que l'exécution a été
arrêtée car les identifiants ont été supprimés.

La suppression de l'authentification enregistrée ne révoque pas les clés chez le fournisseur. Faites pivoter ou révoquez la
clé dans le tableau de bord du fournisseur lorsque vous avez besoin d'une invalidation côté fournisseur.

## Contrôle de l'identifiant utilisé

### Lors de la connexion (CLI)

Utilisez `openclaw models auth login --provider <id> --profile-id <profileId>` pour
les fournisseurs qui prennent en charge les profils d'authentification nommés lors de la connexion.

```bash
openclaw models auth login --provider openai --profile-id openai:ritsuko
openclaw models auth login --provider openai --profile-id openai:lain
```

C'est le moyen le plus simple de garder plusieurs connexions OAuth pour le même fournisseur
séparées au sein d'un même agent.

Utilisez `--force` lorsqu'un profil de fournisseur enregistré est bloqué, expiré ou lié au
mauvais compte et que la commande de connexion normale continue de le réutiliser. `--force` supprime
les profils d'authentification enregistrés pour ce fournisseur dans le répertoire de l'agent sélectionné, puis
relance le même flux d'authentification de fournisseur. Cela ne révoque pas les identifiants auprès du
fournisseur ; faites-les pivoter ou révoquez-les dans le tableau de bord du fournisseur lorsque vous avez besoin
d'une invalidation du côté du fournisseur.

```bash
openclaw models auth login --provider anthropic --force
```

### Par session (commande de chat)

Utilisez `/model <alias-or-id>@<profileId>` pour épingler un identifiant de fournisseur spécifique pour la session en cours (exemples d'ids de profil : `anthropic:default`, `anthropic:work`).

Utilisez `/model` (ou `/model list`) pour un sélecteur compact ; utilisez `/model status` pour la vue complète (candidats + prochain profil d'authentification, plus détails du point de terminaison du fournisseur lorsque configuré).

### Par agent (remplacement CLI)

Définissez un ordre explicite de remplacement des profils d'authentification pour un agent (stocké dans le `auth-state.json` de cet agent) :

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Utilisez `--agent <id>` pour cibler un agent spécifique ; omettez-le pour utiliser l'agent par défaut configuré.
Lorsque vous déboguez des problèmes d'ordre, `openclaw models status --probe` affiche les profils
stockés omis sous la forme `excluded_by_auth_order` au lieu de les ignorer silencieusement.
Lorsque vous déboguez des problèmes de refroidissement (cooldown), rappelez-vous que les temps d'attente de limite de débit peuvent être liés
à un identifiant de modèle plutôt qu'au profil complet du provider.

Si vous modifiez l'ordre d'authentification ou l'épinglage de profil pour une conversation déjà en cours,
envoyez `/new` ou `/reset` dans cette conversation pour démarrer une nouvelle session. Les
sessions existantes peuvent conserver leur sélection de modèle/profil actuelle jusqu'à la réinitialisation.

## Dépannage

### "Aucune information d'identification trouvée"

Si le profil Anthropic est manquant, configurez une clé Anthropic API sur
l'**hôte de la passerelle** ou configurez le chemin du setup-token Anthropic, puis vérifiez à nouveau :

```bash
openclaw models status
```

### Jeton expirant/expiré

Exécutez `openclaw models status` pour confirmer quel profil expire. Si un
profil de jeton Anthropic est manquant ou expiré, rafraîchissez cette configuration via
setup-token ou migrez vers une clé Anthropic API.

## Connexes

- [Gestion des secrets](/fr/gateway/secrets)
- [Accès à distance](/fr/gateway/remote)
- [Stockage de l'authentification](/fr/concepts/oauth)
