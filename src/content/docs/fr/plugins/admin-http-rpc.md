---
summary: "Expose selected Gateway control-plane methods through the bundled, opt-in admin-http-rpc plugin"
read_when:
  - Building host tooling that cannot use the Gateway WebSocket RPC client
  - Exposing Gateway admin automation behind a private trusted ingress
  - Auditing the security model for HTTP access to Gateway methods
title: "Admin HTTP RPC plugin"
---

Le plugin fourni `admin-http-rpc` expose certaines méthodes de plan de contrôle du Gateway via HTTP pour l'automatisation d'hôte de confiance qui ne peut pas utiliser le client Gateway WebSocket normal du RPC.

Le plugin est inclus avec OpenClaw, mais il est désactivé par défaut. Lorsqu'il est désactivé, la route n'est pas enregistrée. Lorsqu'il est activé, il ajoute :

- `POST /api/v1/admin/rpc`
- le même listener que le Gateway : `http://<gateway-host>:<port>/api/v1/admin/rpc`

Activez-le uniquement pour les outils d'hôte privés, l'automatisation de tailnet, ou un ingress interne de confiance. N'exposez pas cette route directement à l'internet public.

## Avant de l'activer

Admin HTTP RPC est une surface complète de plan de contrôle pour l'opérateur. Tout appelant qui réussit l'authentification HTTP du Gateway peut invoquer les méthodes autorisées sur cette page.

Utilisez-le lorsque toutes ces conditions sont vraies :

- L'appelant est digne de confiance pour faire fonctionner le Gateway.
- L'appelant ne peut pas utiliser le client RPC WebSocket.
- La route n'est accessible que via loopback, un tailnet, ou un ingress privé authentifié.
- Vous avez examiné les méthodes autorisées et elles correspondent à l'automatisation que vous prévoyez d'exécuter.

Utilisez le chemin RPC WebSocket pour les clients OpenClaw et les outils interactifs qui peuvent maintenir une connexion WebSocket Gateway ouverte.

## Activer

Activez le plugin fourni :

<Tabs>
  <Tab title="CLI">
    ```bash
    openclaw plugins enable admin-http-rpc
    openclaw gateway restart
    ```
  </Tab>
  <Tab title="Config">
    ```json5
    {
      plugins: {
        entries: {
          "admin-http-rpc": { enabled: true },
        },
      },
    }
    ```
  </Tab>
</Tabs>

La route est enregistrée lors du démarrage du plugin. Redémarrez le Gateway après avoir modifié la configuration du plugin.

Désactivez-le lorsque vous n'avez plus besoin de la surface HTTP :

```bash
openclaw plugins disable admin-http-rpc
openclaw gateway restart
```

## Vérifier la route

Utilisez `health` comme la plus petite requête sûre :

```bash
curl -sS http://<gateway-host>:<port>/api/v1/admin/rpc \
  -H 'Authorization: Bearer <gateway-token>' \
  -H 'Content-Type: application/json' \
  -d '{"method":"health","params":{}}'
```

Une réponse réussie a `ok: true` :

```json
{
  "id": "generated-request-id",
  "ok": true,
  "payload": {
    "status": "ok"
  }
}
```

Lorsque le plugin est désactivé, la route renvoie `404` car elle n'est pas enregistrée.

## Authentification

La route du plugin utilise l'authentification HTTP Gateway.

Chemins d'authentification courants :

- authentification par secret partagé (`gateway.auth.mode="token"` ou `"password"`) : `Authorization: Bearer <token-or-password>`
- authentification HTTP approuvée avec identité (`gateway.auth.mode="trusted-proxy"`) : acheminez via le proxy conscient de l'identité configuré et laissez-le injecter les en-têtes d'identité requis
- authentification ouverte pour entrée privée (`gateway.auth.mode="none"`) : aucun en-tête d'authentification requis

## Modèle de sécurité

Traitez ce plugin comme une surface d'opérateur complet du Gateway.

- L'activation du plugin offre intentionnellement l'accès aux méthodes administratives RPC figurant sur la liste autorisée à `/api/v1/admin/rpc`.
- Le plugin déclare le contrat de manifeste réservé `contracts.gatewayMethodDispatch: ["authenticated-request"]` afin que sa route HTTP authentifiée par Gateway puisse distribuer les méthodes du plan de contrôle en processus.
- L'authentification du porteur par secret partagé prouve la possession du secret d'opérateur de la passerelle.
- Pour l'authentification `token` et `password`, les en-têtes `x-openclaw-scopes` plus étroits sont ignorés et les valeurs par défaut normales de l'opérateur complet sont rétablies.
- Les modes HTTP approuvés avec identité honorent `x-openclaw-scopes` lorsqu'ils sont présents.
- `gateway.auth.mode="none"` signifie que cette route n'est pas authentifiée si le plugin est activé. Utilisez cela uniquement derrière une entrée privée en laquelle vous avez pleinement confiance.
- Les requêtes sont distribuées via les mêmes gestionnaires de méthodes et vérifications de portée Gateway que le RPC WebSocket une fois l'authentification de la route du plugin réussie.
- Conservez cette route en boucle locale (loopback), sur un tailnet ou sur une entrée privée approuvée. Ne l'exposez pas directement à l'internet public.
- Les contrats de manifeste de plugin ne sont pas un bac à sable (sandbox). Ils empêchent l'utilisation accidentelle des assistants SDK réservés ; les plugins approuvés s'exécutent toujours dans le processus Gateway.

Utilisez des passerelles distinctes lorsque les appelants franchissent les limites de confiance.

## Requête

```http
POST /api/v1/admin/rpc
Authorization: Bearer <gateway-token>
Content-Type: application/json
```

```json
{
  "id": "optional-request-id",
  "method": "health",
  "params": {}
}
```

Champs :

- `id` (chaîne, facultatif) : copié dans la réponse. Un UUID est généré en cas d'omission.
- `method`Gateway (chaîne, obligatoire) : nom de la méthode Gateway autorisée.
- `params` (any, facultatif) : paramètres spécifiques à la méthode.

La taille maximale par défaut du corps de la requête est de 1 Mo.

## Réponse

Les réponses réussies utilisent le format RPC Gateway :

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

Les erreurs de méthode Gateway utilisent :

```json
{
  "id": "optional-request-id",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "bad params"
  }
}
```

Le statut HTTP suit l'erreur Gateway lorsque cela est possible. Par exemple, Gateway`INVALID_REQUEST` renvoie `400`, et `UNAVAILABLE` renvoie `503`.

## Méthodes autorisées

- discovery : `commands.list`RPC
  Renvoie les noms des méthodes HTTP RPC autorisées par ce plugin.
- gateway : `health`, `status`, `logs.tail`, `usage.status`, `usage.cost`, `gateway.restart.request`
- config : `config.get`, `config.schema`, `config.schema.lookup`, `config.set`, `config.patch`, `config.apply`
- channels : `channels.status`, `channels.start`, `channels.stop`, `channels.logout`
- web : `web.login.start`, `web.login.wait`
- models : `models.list`, `models.authStatus`
- agents : `agents.list`, `agents.create`, `agents.update`, `agents.delete`
- approvals : `exec.approvals.get`, `exec.approvals.set`, `exec.approvals.node.get`, `exec.approvals.node.set`
- cron : `cron.status`, `cron.list`, `cron.get`, `cron.runs`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`
- devices : `device.pair.list`, `device.pair.approve`, `device.pair.reject`, `device.pair.remove`
- nodes : `node.list`, `node.describe`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove`, `node.rename`
- tasks : `tasks.list`, `tasks.get`, `tasks.cancel`
- diagnostics : `doctor.memory.status`, `update.status`

Les autres méthodes du Gateway sont bloquées jusqu'à ce qu'elles soient ajoutées intentionnellement.

## Comparaison avec WebSocket

Le chemin normal Gateway WebSocket RPC reste l'API de plan de contrôle privilégié pour les clients OpenClaw. Utilisez l'admin HTTP RPC uniquement pour les outils d'hôte qui ont besoin d'une surface HTTP requête/réponse.

Les clients WebSocket à jeton partagé sans identité d'appareil de confiance ne peuvent pas s'auto-déclarer des étendues d'administrateur lors de la connexion. L'admin HTTP RPC suit délibérément le modèle d'opérateur HTTP de confiance existant : lorsque le plugin est activé, l'authentification bearer par secret partagé est traitée comme un accès opérateur complet pour cette surface d'administration.

## Dépannage

`404 Not Found`

: Le plugin est désactivé, le Gateway n'a pas redémarré depuis son activation, ou la requête est adressée à un processus Gateway différent.

`401 Unauthorized`

: La requête n'a pas satisfait l'authentification HTTP du Gateway. Vérifiez le jeton porteur (bearer token) ou les en-têtes d'identité du proxy de confiance.

`400 INVALID_REQUEST`

: Le corps de la requête n'est pas un JSON valide, le champ `method` est manquant, ou la méthode ne figure pas dans la liste d'autorisation du plugin.

`503 UNAVAILABLE`

: Le gestionnaire de méthode du Gateway est indisponible. Vérifiez les journaux du Gateway et réessayez une fois le Gateway terminé son démarrage.

## Connexes

- [Portées de l'opérateur](/fr/gateway/operator-scopes)
- [Sécurité du Gateway](/fr/gateway/security)
- [Accès à distance](/fr/gateway/remote)
- [Manifeste du plugin](/fr/plugins/manifest#contracts)
- [Sous-chemins du SDK](/fr/plugins/sdk-subpaths)
