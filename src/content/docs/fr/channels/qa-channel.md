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
pnpm qa:lab:up
```

Cette commande unique construit le site QA, démarre la passerelle avec support Docker et la pile QA Lab, et imprime l'URL du QA Lab. À partir de ce site, vous pouvez sélectionner des scénarios, choisir la voie de modèle, lancer des exécutions individuelles et regarder les résultats en direct.

Suite QA complète basée sur le dépôt :

```bash
pnpm openclaw qa suite
```

Cela lance le débogueur QA privé à une URL locale, distinct du bundle d'interface utilisateur de contrôle expédié.

## Portée

La portée actuelle est intentionnellement étroite :

- transport bus + plugin
- grammaire de routage threadé
- actions de message possédées par le channel
- rapports Markdown
- site QA avec support Docker et contrôles d'exécution

Le travail ultérieur ajoutera :

- exécution de matrice fournisseur/modèle
- découverte de scénarios plus riche
- orchestration native OpenClaw plus tard
