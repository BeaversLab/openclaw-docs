---
summary: "Plugin Webhooks : ingress TaskFlow authentifié pour l'automatisation externe de confiance"
read_when:
  - You want to trigger or drive TaskFlows from an external system
  - You are configuring the bundled webhooks plugin
title: "Plugin Webhooks"
---

# Webhooks (plugin)

Le plugin Webhooks ajoute des routes HTTP authentifiées qui lient l'automatisation externe aux TaskFlows OpenClaw.

Utilisez-le lorsque vous souhaitez qu'un système de confiance tel que Zapier, n8n, un travail CI, ou un service interne crée et pilote des TaskFlows gérés sans avoir à écrire un plugin personnalisé au préalable.

## Où il s'exécute

Le plugin Webhooks s'exécute dans le processus Gateway.

Si votre Gateway s'exécute sur une autre machine, installez et configurez le plugin sur cet hôte Gateway, puis redémarrez le Gateway.

## Configurer les routes

Définissez la configuration sous `plugins.entries.webhooks.config` :

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow bridge",
            },
          },
        },
      },
    },
  },
}
```

Champs de route :

- `enabled` : facultatif, valeur par défaut `true`
- `path` : facultatif, valeur par défaut `/plugins/webhooks/<routeId>`
- `sessionKey` : session requise qui possède les TaskFlows liés
- `secret` : secret partagé ou SecretRef requis
- `controllerId` : identifiant de contrôleur facultatif pour les flux gérés créés
- `description` : note d'opérateur facultative

Entrées `secret` prises en charge :

- Chaîne simple
- SecretRef avec `source: "env" | "file" | "exec"`

Si une route basée sur un secret ne peut pas résoudre son secret au démarrage, le plugin ignore cette route et enregistre un avertissement au lieu d'exposer un point de terminaison défaillant.

## Modèle de sécurité

Chaque route est de confiance pour agir avec l'autorité TaskFlow de sa `sessionKey` configurée.

Cela signifie que la route peut inspecter et modifier les TaskFlows appartenant à cette session, vous devez donc :

- Utiliser un secret unique et fort pour chaque route
- Préférer les références de secret aux secrets en texte brut en ligne
- Lier les routes à la session la plus restreinte correspondant au flux de travail
- Exposer uniquement le chemin webhook spécifique dont vous avez besoin

Le plugin applique :

- Authentification par secret partagé
- Gardiens de taille et de délai d'expiration du corps de la requête
- Limitation de débit à fenêtre fixe
- Limitation des requêtes en cours
- Accès TaskFlow lié au propriétaire via `api.runtime.taskFlow.bindSession(...)`

## Format de la requête

Envoyez des requêtes `POST` avec :

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` ou `x-openclaw-webhook-secret: <secret>`

Exemple :

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## Actions prises en charge

Le plugin accepte actuellement ces valeurs JSON `action` :

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

Crée un TaskFlow géré pour la session liée à la route.

Exemple :

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

Crée une tâche enfant gérée dans un TaskFlow géré existant.

Les runtimes autorisés sont :

- `subagent`
- `acp`

Exemple :

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "Inspect the next message batch"
}
```

## Format de réponse

Les réponses réussies renvoient :

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

Les requêtes rejetées renvoient :

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "TaskFlow not found.",
  "result": {}
}
```

Le plugin nettoie intentionnellement les métadonnées de propriétaire/session des réponses webhook.

## Documentation associée

- [Plugin runtime SDK](/fr/plugins/sdk-runtime)
- [Aperçu des hooks et webhooks](/fr/automation/hooks)
- [CLI webhooks](/fr/cli/webhooks)
