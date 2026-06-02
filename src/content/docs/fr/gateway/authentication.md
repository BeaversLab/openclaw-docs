---
summary: "OAuthAPICLIAnthropicAuthentification de modèle : OAuth, clés API, réutilisation de Claude CLI et jeton de configuration Anthropic"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Authentification"
---

<Note>
  Cette page est la référence d'authentification du **fournisseur de modèle** (clés API, OAuth, réutilisation de Claude CLI et jeton de configuration Anthropic). Pour l'authentification de **connexion Gateway** (jeton, mot de passe, proxy de confiance), voir [Configuration](APIOAuthCLIAnthropic/en/gateway/configuration) et [Authentification par proxy de confiance](/fr/gateway/trusted-proxy-auth).
</Note>

OpenClaw prend en charge OAuth et les clés d'API pour les fournisseurs de modèles. Pour les hôtes de passerelle toujours actifs,
les clés d'API sont généralement l'option la plus prévisible. Les flux d'abonnement/OAuth
sont également pris en charge lorsqu'ils correspondent au modèle de compte de votre fournisseur.

Voir [/concepts/oauth](/fr/concepts/oauthOAuth) pour le flux OAuth complet et la disposition du stockage.
Pour l'authentification basée sur SecretRef (fournisseurs `env`/`file`/`exec`), voir [Gestion des secrets](/fr/gateway/secrets).
Pour les règles d'éligibilité des identifiants et des codes de raison utilisées par `models status --probe`, voir
[Sémantique des identifiants d'authentification](/fr/auth-credential-semantics).

## Configuration recommandée (clé d'API, n'importe quel fournisseur)

Si vous exécutez une Gateway à longue durée de vie, commencez par une clé API pour votre fournisseur choisi.
Pour Anthropic spécifiquement, l'authentification par clé API reste toujours la configuration serveur la plus prévisible, mais OpenClaw prend également en charge la réutilisation d'une connexion locale à la CLI Claude.

1. Créez une clé d'API dans la console de votre fournisseur.
2. Placez-le sur l'**hôte Gateway** (la machine exécutant `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la Gateway s'exécute sous systemd/launchd, préférez placer la clé dans
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
les clés API pour une utilisation par le démon : API`openclaw onboard`.

Voir [Aide](/fr/help) pour plus de détails sur l'héritage des variables d'environnement (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic : Claude CLI et compatibilité des jetons

L'authentification par token de configuration Anthropic est toujours disponible dans OpenClaw en tant que chemin de token pris en charge. Le personnel d'Anthropic nous a depuis informés que l'utilisation de la CLI Claude style OpenClaw est à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de AnthropicOpenClawAnthropicOpenClawCLIOpenClawCLI`claude -p`AnthropicCLI comme étant approuvées pour cette intégration, à moins qu'Anthropic ne publie une nouvelle politique. Lorsque la réutilisation de la CLI Claude est disponible sur l'hôte, c'est désormais le chemin privilégié.

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
2. Indiquez à OpenClaw de basculer la sélection du modèle Anthropic vers le backend OpenClawAnthropic`claude-cli`OpenClaw local et de stocker le profil d'authentification OpenClaw correspondant.

Si `claude` n'est pas dans `PATH`, installez d'abord Claude Code ou définissez `agents.defaults.cliBackends.claude-cli.command` sur le chemin réel du binaire.

Saisie manuelle du token (n'importe quel fournisseur ; écrit `auth-profiles.json` + met à jour la configuration) :

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

OpenClaw s'attend à la forme canonique OpenClaw`version` + `profiles` lors de l'exécution. Si une ancienne installation possède encore un fichier plat tel que `{ "openrouter": { "apiKey": "..." } }`, exécutez `openclaw doctor --fix` pour le réécrire en tant que profil de clé API `openrouter:default`API ; le médecin conserve une copie `.legacy-flat.*.bak` à côté de l'original. Les détails du point de terminaison tels que `baseUrl`, `api`, les identifiants de modèle, les en-têtes et les délais d'attente appartiennent sous `models.providers.<id>` dans `openclaw.json` ou `models.json`, et non dans `auth-profiles.json`.

Les routes d'authentification externe telles que Bedrock `auth: "aws-sdk"` ne sont pas non plus des informations d'identification. Si vous souhaitez une route Bedrock nommée, placez `auth.profiles.<id>.mode: "aws-sdk"` dans `openclaw.json` ; n'écrivez pas `type: "aws-sdk"` dans `auth-profiles.json`. `openclaw doctor --fix` déplace les marqueurs hérités du SDK AWS du magasin d'informations d'identification vers les métadonnées de configuration.

Les références de profil d'authentification sont également prises en charge pour les identifiants statiques :

- Les informations d'identification `api_key` peuvent utiliser `keyRef: { source, provider, id }`
- Les informations d'identification `token` peuvent utiliser `tokenRef: { source, provider, id }`
- Les profils en mode OAuth ne prennent pas en charge les informations d'identification SecretRef ; si `auth.profiles.<id>.mode` est défini sur `"oauth"`, la saisie `keyRef`/`tokenRef` basée sur SecretRef pour ce profil est rejetée.

Vérification adaptée à l'automatisation (sortie `1` lorsqu'expiré/manquant, `2` lorsqu'en cours d'expiration) :

```bash
openclaw models status --check
```

Sondages d'authentification en direct :

```bash
openclaw models status --probe
```

Notes :

- Les lignes de sondage peuvent provenir de profils d'authentification, d'informations d'identification d'environnement ou de `models.json`.
- Si un `auth.order.<provider>` explicite omet un profil stocké, le sondage signale
  `excluded_by_auth_order` pour ce profil au lieu de l'essayer.
- Si une authentification existe mais que OpenClaw ne peut pas résoudre de candidat de modèle sondeable pour
  ce fournisseur, le sondage signale `status: no_model`.
- Les temps de recharge limites de débit peuvent être limités au modèle. Un profil en cours de recharge pour un
  modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur.

Les scripts ops facultatifs (systemd/Termux) sont documentés ici :
[Scripts de surveillance d'authentification](/fr/help/scripts#auth-monitoring-scripts)

## Note Anthropic

Le backend `claude-cli` de Anthropic est pris en charge à nouveau.

- Le personnel de Anthropic nous a informés que ce chemin d'intégration OpenClaw est à nouveau autorisé.
- %PH:GLOSSARY:158:f4d34464%% traite donc la réutilisation du Claude OpenClawCLI et l'utilisation de `claude -p` comme autorisées
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
- Les fournisseurs Google incluent également `GOOGLE_API_KEY` comme solution de repli supplémentaire.
- La même liste de clés est dédupliquée avant utilisation.
- OpenClaw réessaie avec la clé suivante uniquement pour les erreurs de limite de débit (par exemple
  OpenClaw`429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`, ou
  `workers_ai ... quota limit exceeded`).
- Les erreurs non liées aux limites de débit ne font pas l'objet d'une nouvelle tentative avec des clés alternatives.
- Si toutes les clés échouent, l'erreur finale de la dernière tentative est renvoyée.

## Suppression de l'authentification du fournisseur pendant que la passerelle est en cours d'exécution

Lorsque l'authentification du fournisseur est supprimée via le plan de contrôle du Gateway, OpenClaw supprime
les profils d'authentification enregistrés pour ce fournisseur et abandonne les conversations actives ou les exécutions d'agents
dont le fournisseur de modèles sélectionné correspond au fournisseur supprimé. Les exécutions abandonnées émettent
les événements normaux d'annulation de conversation et de cycle de vie avec
GatewayOpenClaw`stopReason: "auth-revoked"`, afin que les clients connectés puissent indiquer que l'exécution a été
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

### Par session (commande de chat)

Utilisez `/model <alias-or-id>@<profileId>` pour épingler un identifiant de fournisseur spécifique pour la session actuelle (exemples d'ids de profil : `anthropic:default`, `anthropic:work`).

Utilisez `/model` (ou `/model list`) pour un sélecteur compact ; utilisez `/model status` pour la vue complète (candidats + prochain profil d'authentification, ainsi que les détails du point de terminaison du fournisseur lorsque configuré).

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
Lorsque vous déboguez des problèmes de temps de recharge, rappelez-vous que les temps de recharge de limite de débit peuvent être liés
à un id de modèle plutôt qu'au profil complet du fournisseur.

Si vous modifiez l'ordre d'authentification ou l'épinglage de profil pour une discussion déjà en cours, envoyez `/new` ou `/reset` dans cette discussion pour démarrer une nouvelle session. Les sessions existantes peuvent conserver leur sélection de modèle/profil actuelle jusqu'à la réinitialisation.

## Dépannage

### "Aucune information d'identification trouvée"

Si le profil Anthropic est manquant, configurez une clé Anthropic API sur l'**hôte de la passerelle** ou configurez le chemin du jeton de configuration Anthropic, puis revérifiez :

```bash
openclaw models status
```

### Jeton expirant ou expiré

Exécutez `openclaw models status` pour confirmer le profil qui expire. Si un profil de jeton Anthropic est manquant ou expiré, actualisez cette configuration via le jeton de configuration ou migrez vers une clé Anthropic API.

## Connexes

- [Gestion des secrets](/fr/gateway/secrets)
- [Accès à distance](/fr/gateway/remote)
- [Stockage de l'authentification](/fr/concepts/oauth)
