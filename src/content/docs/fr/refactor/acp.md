---
summary: "Plan de migration pour rendre explicite la propriété des sessions ACP et des processus ACPX"
read_when:
  - Refactoring ACP session lifecycle or ACPX process cleanup
  - Debugging ACPX orphan processes, PID reuse, or multi-gateway cleanup safety
  - Changing sessions_list visibility for spawned ACP or subagent sessions
  - Designing ownership metadata for background tasks, ACP sessions, or process leases
title: "Refactorisation du cycle de vie ACP"
sidebarTitle: "Refactorisation du cycle de vie ACP"
---

Le cycle de vie de l'ACP fonctionne actuellement, mais une trop grande partie est déduite a posteriori.
Le nettoyage des processus reconstruit la propriété à partir des PID, des chaînes de commande, des chemins du wrapper
et de la table des processus en direct. La visibilité des sessions reconstruit la propriété
à partir des chaînes de clés de session et de recherches secondaires `sessions.list({ spawnedBy })`.
Cela permet des correctifs ciblés, mais cela facilite aussi l'oubli des cas limites :
la réutilisation des PID, les commandes entre guillemets, les petits-enfants d'adaptateurs, les racines d'état multi-Gateway,
`cancel` contre `close`, et la visibilité `tree` contre `all` deviennent tous des
endroits distincts pour redécouvrir les mêmes règles de propriété.

Cette refactorisation rend la propriété de première classe. L'objectif n'est pas une nouvelle surface de produit ACP ;
c'est un contrat interne plus sûr pour le comportement existant de l'ACP et de l'ACPX.

## Objectifs

- Le nettoyage n'envoie jamais de signal à un processus à moins que la preuve en direct actuelle ne corresponde à un
  bail détenu par OpenClaw.
- `cancel`, `close` et le nettoyage au démarrage ont des intentions de cycle de vie distinctes.
- `sessions_list`, `sessions_history`, `sessions_send` et les vérifications de statut utilisent
  le même modèle de session détenu par le demandeur.
- Les installations multi-Gateway ne peuvent pas nettoyer les wrappers ACPX les unes des autres.
- Les anciens enregistrements de session ACPX continuent de fonctionner pendant la migration.
- Le runtime reste la propriété du plugin ; le cœur n'apprend pas les détails du paquet ACPX.

## Non-objectifs

- Remplacer l'ACPX ou modifier la surface de commande publique `/acp`.
- Déplacer le comportement de l'adaptateur ACP spécifique au fournisseur dans le cœur.
- Exiger des utilisateurs qu'ils nettoient manuellement l'état avant la mise à niveau.
- Faire en sorte que `cancel` ferme les sessions ACP réutilisables.

## Modèle cible

### Identité de l'instance Gateway

Chaque processus Gateway doit avoir un ID d'instance d'exécution stable :

```ts
type GatewayInstanceId = string;
```

Il peut être généré au démarrage du Gateway et persisté dans l'état pour la durée de vie de cette installation. Ce n'est pas un secret de sécurité ; c'est un discriminateur de propriété utilisé pour éviter de confondre les processus ACP d'un Gateway avec ceux d'un autre Gateway.

### Propriété de session ACP

Chaque session ACP générée doit comporter des métadonnées de propriété normalisées :

```ts
type AcpSessionOwner = {
  sessionKey: string;
  spawnedBy?: string;
  parentSessionKey?: string;
  ownerSessionKey: string;
  agentId: string;
  backend: "acpx";
  gatewayInstanceId: GatewayInstanceId;
  createdAt: number;
};
```

Le Gateway doit renvoyer ces champs sur les lignes de session lorsqu'ils sont connus.
Le filtrage de visibilité doit être une vérification pure sur les métadonnées de la ligne :

```ts
canSeeSessionRow({
  row,
  requesterSessionKey,
  visibility,
  a2aPolicy,
});
```

Cela supprime les appels secondaires cachés `sessions.list({ spawnedBy })` des
vérifications de visibilité. Un enfant ACP inter-agent généré est détenu par le demandeur parce que
la ligne l'indique, et non parce qu'une deuxième requête le trouve par hasard.

### Baux de processus ACPX

Chaque lancement de wrapper généré doit créer un enregistrement de bail :

```ts
type AcpxProcessLease = {
  leaseId: string;
  gatewayInstanceId: GatewayInstanceId;
  sessionKey: string;
  wrapperRoot: string;
  wrapperPath: string;
  rootPid: number;
  processGroupId?: number;
  commandHash: string;
  startedAt: number;
  state: "open" | "closing" | "closed" | "lost";
};
```

Le processus wrapper doit recevoir l'identifiant du bail et l'identifiant de l'instance de passerelle dans son
environnement :

```sh
OPENCLAW_ACPX_LEASE_ID=...
OPENCLAW_GATEWAY_INSTANCE_ID=...
```

Lorsque la plateforme le permet, la vérification doit privilégier les métadonnées en direct du processus
qui ne peuvent pas être confondues par les guillemets de commande :

- le PID racine existe toujours
- le chemin du wrapper en direct est sous `wrapperRoot`
- le groupe de processus correspond au bail lorsqu'il est disponible
- l'environnement contient l'identifiant de bail attendu lorsqu'il est lisible
- le hachage de commande ou le chemin de l'exécutable correspond au bail

Si le processus en direct ne peut pas être vérifié, le nettoyage échoue de manière fermée.

## Contrôleur de cycle de vie

Introduire un seul contrôleur de cycle de vie ACPX qui possède les baux de processus et la politique de
nettoyage :

```ts
interface AcpxLifecycleController {
  ensureSession(input: AcpRuntimeEnsureInput): Promise<AcpRuntimeHandle>;
  cancelTurn(handle: AcpRuntimeHandle): Promise<void>;
  closeSession(input: { handle: AcpRuntimeHandle; discardPersistentState?: boolean; reason?: string }): Promise<void>;
  reapStartupOrphans(): Promise<void>;
  verifyOwnedTree(lease: AcpxProcessLease): Promise<OwnedProcessTree | null>;
}
```

Les demandes `cancelTurn` ne doivent entraîner qu'une annulation. Elles ne doivent pas récolter les processus wrapper
ou adaptateur réutilisables.

`closeSession` est autorisé à récolter, mais seulement après avoir chargé l'enregistrement de session,
chargé le bail et vérifié que l'arborescence des processus en direct appartient toujours à ce
bail.

`reapStartupOrphans` part des baux ouverts dans l'état. Il peut utiliser la table des
processus pour trouver les descendants, mais il ne doit pas scanner d'abord les commandes arbitraires ressemblant à des ACP
puis décider qu'elles sont probablement les nôtres.

## Contrat de wrapper

Les wrappers générés doivent rester petits. Ils doivent :

- démarrer l'adaptateur dans un groupe de processus lorsque cela est pris en charge
- transférer les signaux de terminaison normaux au groupe de processus
- détecter la mort du parent
- en cas de mort du parent, envoyer SIGTERM, puis garder le wrapper en vie jusqu'à ce que le secours
  SIGKILL s'exécute
- signaler le PID racine et l'ID du groupe de processus au contrôleur de cycle de vie lorsque
  ceux-ci sont disponibles

Les wrappers ne doivent pas décider de la politique de session. Ils ne font qu'appliquer le nettoyage de l'arborescence des processus locale pour
leur propre groupe d'adaptateurs.

## Contrat de visibilité de session

La visibilité doit utiliser une propriété normalisée des lignes :

```ts
type SessionVisibilityInput = {
  requesterSessionKey: string;
  row: {
    key: string;
    agentId: string;
    ownerSessionKey?: string;
    spawnedBy?: string;
    parentSessionKey?: string;
  };
  visibility: "self" | "tree" | "agent" | "all";
  a2aPolicy: AgentToAgentPolicy;
};
```

Règles :

- `self` : uniquement la session demanderesse.
- `tree` : session demanderesse plus les lignes dont elle est propriétaire ou qu'elle a générées.
- `all` : toutes les lignes du même agent, les lignes inter-agents autorisées par a2a, et les lignes inter-agents
  générées appartenant au demandeur, même lorsque l'a2a général est désactivé.
- `agent` : même agent uniquement, sauf si une relation de propriété explicite indique que la ligne
  appartient au demandeur.

Cela rend `tree` et `all` monotones : `all` ne doit pas masquer un enfant possédé
que `tree` afficherait.

## Plan de migration

### Phase 1 : Ajouter l'identité et les baux

- Ajouter `gatewayInstanceId` à l'état du Gateway.
- Ajouter un stockage de baux ACPX sous le répertoire d'état ACPX.
- Écrire un bail avant de générer un wrapper.
- Stocker `leaseId` sur les nouveaux enregistrements de session ACPX.
- Conserver les champs PID et commande existants pour les anciens enregistrements.

### Phase 2 : Nettoyage prioritaire aux baux

- Modifier le nettoyage de fermeture pour charger `leaseId` en premier.
- Vérifier la propriété du processus actif par rapport au bail avant de signaler.
- Conserver le PID racine actuel et le repli wrapper-root uniquement pour les enregistrements hérités.
- Marquer les baux `closed` après nettoyage vérifié.
- Marquer les baux `lost` lorsque le processus a disparu avant le nettoyage.

### Phase 3 : Moissonnage au démarrage prioritaire aux baux

- Le moissonnage au démarrage analyse les baux ouverts.
- Pour chaque bail, vérifier le processus racine et collecter les descendants.
- Moissonner les arbres vérifiés des enfants en premier.
- Faire expirer les anciens baux `closed` et `lost` avec une fenêtre de rétention limitée.
- Conserver l'analyse des marqueurs de commande uniquement en tant que repli hérité temporaire, protégé par
  wrapper root et l'instance Gateway lorsque cela est possible.

### Phase 4 : Lignes de propriété de session

- Ajouter des métadonnées de propriété aux lignes de session du Gateway.
- Apprendre aux rédacteurs ACPX, sous-agent, tâche en arrière-plan et magasin de sessions à remplir
  `ownerSessionKey` ou `spawnedBy`.
- Convertir les vérifications de visibilité de session pour utiliser les métadonnées de ligne.
- Supprimer les recherches secondaires `sessions.list({ spawnedBy })` au moment de la visibilité.

### Phase 5 : Supprimer les heuristiques héritées

Après une fenêtre de version :

- cesser de s'appuyer sur les chaînes de commande racine stockées pour le nettoyage ACPX non hérité
- supprimer les analyses de démarrage des marqueurs de commande
- supprimer les recherches de liste de repli de visibilité
- conserver un comportement défensif de fermeture en échec pour les baux manquants ou invérifiables

## Tests

Ajouter deux suites pilotées par table.

Simulateur de cycle de vie des processus :

- PID réutilisé par un processus sans rapport
- PID réutilisé par la racine du wrapper d'un autre Gateway
- la commande de wrapper stockée est entre guillemets shell, la commande `ps` en direct ne l'est pas
- le fils de l'adaptateur se termine, le petit-fils reste dans le groupe de processus
- le repli SIGTERM en cas de mort du parent atteint SIGKILL
- liste des processus indisponible
- bail périmé avec processus manquant
- orphelin de démarrage avec wrapper, fils d'adaptateur et petit-fils

Matrice de visibilité des sessions :

- `self`, `tree`, `agent`, `all`
- a2a activé et désactivé
- ligne du même agent
- ligne inter-agents
- ligne ACP inter-agents engendrée appartenant au demandeur
- demandeur sandboxé limité à `tree`
- actions de liste, d'historique, d'envoi et d'état

L'invariant important : un fils engendré appartenant au demandeur est visible partout où
la visibilité configurée inclut l'arborescence de session du demandeur, et `all` n'est pas
moins capable que `tree`.

## Notes de compatibilité

Les anciens enregistrements de session peuvent ne pas avoir `leaseId`. Ils devraient utiliser le chemin de
nettoyage en fermeture d'échec hérité :

- exiger un processus racine en direct
- exiger la propriété de la racine du wrapper lorsqu'un wrapper généré est attendu
- exiger l'accord sur la commande pour les racines sans wrapper
- ne jamais signaler uniquement sur la base de métadonnées PID stockées périmées

Si un enregistrement hérité ne peut pas être vérifié, le laisser tel quel. Le nettoyage des baux au démarrage et
la prochaine fenêtre de version devraient éventuellement retirer le repli.

## Critères de succès

- La fermeture d'une ancienne session ACPX obsolète ne peut pas tuer le processus d'un autre Gateway.
- La mort du parent ne laisse pas les petits-enfants de l'adaptateur tenaces en cours d'exécution.
- `cancel` abandonne le tour actuel sans fermer les sessions réutilisables.
- `sessions_list` peut afficher les enfants ACP inter-agents appartenant au demandeur à la fois sous `tree` et `all`.
- Le nettoyage au démarrage est piloté par des baux, et non par des analyses larges de chaînes de commandes.
- Les tests de processus et de matrice de visibilité ciblés couvrent chaque cas limite qui nécessitait auparavant des correctifs de révision ponctuels.
