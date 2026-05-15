---
summary: "Exécuter des agents spécialisés en parallèle sans encombrer la capacité partagée des modèles et des outils"
title: "Voies spécialisées parallèles"
sidebarTitle: "Voies spécialisées"
read_when:
  - You route group chats to dedicated agents
  - You want parallel work without one long task blocking every chat
  - You are designing a multi-agent operations setup
status: active
---

Les voies spécialisées parallèles permettent à un Gateway de router différents chats ou salons vers
différents agents, tout en maintenant une expérience utilisateur rapide. L'astuce consiste à traiter
le parallélisme comme un problème de conception de ressources rares, et non simplement comme « plus d'agents ».

## Premiers principes

Une voie spécialisée n'améliore le débit que lorsqu'elle réduit la contention pour les
vrais goulots d'étranglement :

- **Verrous de session** : une seule exécution doit modifier une session donnée à la fois.
- **Capacité globale du modèle** : toutes les exécutions de chat visibles partagent toujours les limites du fournisseur.
- **Capacité des outils** : les travaux de shell, de navigateur, de réseau et de référentiel peuvent être plus lents
  que le tour de modèle lui-même.
- **Budget de contexte** : les longues transcriptions ralentissent et rendent moins
  concentrés chaque tour futur.
- **Ambiguïté de propriété** : les agents en double effectuant le même travail gaspillent la capacité.

OpenClaw sérialise déjà les exécutions par session et plafonne le parallélisme global via
la [file d'attente de commandes](/fr/concepts/queue). Les voies spécialisées ajoutent une politique par-dessus :
quel agent possède quel travail, ce qui reste dans le chat, et ce qui devient un travail
de fond.

## Déploiement recommandé

### Phase 1 : contrats de voie + travail lourd en arrière-plan

Donnez à chaque voie un contrat écrit dans son espace de travail et son invite système :

- **Objectif** : le travail que cette voie possède.
- **Non-objectifs** : le travail qu'elle doit transférer au lieu de tenter de le faire.
- **Budget de chat** : les réponses rapides restent dans le chat ; les tâches longues doivent accuser réception
  brièvement, puis s'exécuter dans un sous-agent ou une tâche d'arrière-plan.
- **Règle de transfert** : lorsqu'une autre voie possède le travail, indiquer où il doit aller et
  fournir un résumé de transfert concis.
- **Règle de risque d'outil** : préférer la plus petite surface d'outil capable de faire le travail.

C'est la phase la moins coûteuse et elle corrige la plupart des encombrements : un travail de codage ne transforme
plus la voie de recherche en mélasse, et chaque chat garde son propre contexte propre.

### Phase 2 : contrôles de priorité et de concurrence

Ajustez la file d'attente et la capacité du modèle en fonction de la valeur commerciale de chaque voie :

```json5
{
  agents: {
    defaults: {
      maxConcurrent: 4,
      subagents: { maxConcurrent: 8, delegationMode: "prefer" },
    },
  },
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
    },
  },
}
```

Utilisez des discussions directes/personnelles et des agents d'exploitation en production pour les travaux à haute priorité. Laissez la recherche, la rédaction et le codage par lots passer en tâches d'arrière-plan lorsque le système est occupé.

### Phase 3 : coordinateur / contrôleur de trafic

Ajoutez un petit modèle de coordinateur une fois que plusieurs voies sont actives :

- Suivez les tâches et les propriétaires des voies actives.
- Détectez les demandes en double entre les groupes.
- Acheminez les résumés de transfert entre les voies.
- N'affichez que les bloqueurs, les résultats terminés et les décisions que l'humain doit prendre.

Ne commencez pas ici. Un coordinateur sans contrats de voie ne fait que coordonner le chaos.

## Modèle minimal de contrat de voie

```md
# Lane contract

## Owns

- <job this lane is responsible for>

## Does not own

- <work to hand off>

## Chat budget

- Answer quick questions directly.
- For multi-step, slow, or tool-heavy work: acknowledge briefly, spawn/background
  the work, then return the result when complete.

## Handoff

If another lane owns the request, reply with:

- target lane
- objective
- relevant context
- exact next action

## Tool posture

Use the smallest tool surface that can complete the task. Avoid broad shell or
network work unless this lane explicitly owns it.
```

## Connexes

- [Routage multi-agent](/fr/concepts/multi-agent)
- [File de commandes](/fr/concepts/queue)
- [Sous-agents](/fr/tools/subagents)
