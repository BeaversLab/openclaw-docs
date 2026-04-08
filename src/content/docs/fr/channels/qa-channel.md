---
title: "Channel QA"
summary: "Plug-in de channel de classe Slack synthétique pour les scénarios QA déterministes OpenClaw "
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

# Channel QA

`qa-channel` est un transport de messages synthétique intégré pour les tests QA automatisés OpenClaw.

Ce n'est pas un channel de production. Il existe pour exercer la même limite
(boundary) de plug-in de channel utilisée par les transports réels tout en
maintenant l'état déterministe et entièrement inspectable.

## Ce qu'il fait aujourd'hui

- Grammaire cible de classe Slack :
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- Bus synthétique soutenu par HTTP pour :
  - injection de messages entrants
  - capture de transcription sortante
  - création de fils de discussion
  - réactions
  - modifications
  - suppressions
  - actions de recherche et de lecture
- Runner d'auto-vérification intégré côté hôte qui écrit un rapport Markdown

## Config

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

Clés de compte prises en charge :

- `baseUrl`
- `botUserId`
- `botDisplayName`
- `pollTimeoutMs`
- `allowFrom`
- `defaultTo`
- `actions.messages`
- `actions.reactions`
- `actions.search`
- `actions.threads`

## Runner

Tranche verticale actuelle :

```bash
pnpm qa:e2e
```

Cela passe maintenant par l'extension intégrée `qa-lab`. Elle démarre le bus QA
dans le dépôt, lance la tranche d'exécution intégrée `qa-channel`, exécute une auto-vérification
déterministe et écrit un rapport Markdown sous `.artifacts/qa-e2e/`.

Interface utilisateur du débogueur privé :

```bash
pnpm qa:lab:build
pnpm openclaw qa ui
```

Suite QA complète soutenue par le dépôt :

```bash
pnpm openclaw qa suite
```

Cela lance le débogueur QA privé à une URL locale, distinct du bundle
Control UI expédié.

## Portée (Scope)

La portée actuelle est volontairement étroite :

- bus + transport de plug-in
- grammaire de routage en fils de discussion
- actions de message possédées par le channel
- rapports Markdown

Les travaux ultérieurs ajouteront :

- orchestration OpenClaw conteneurisée (Dockerized)
- exécution de matrice provider/model
- découverte de scénarios plus riches
- orchestration native OpenClaw ultérieurement
