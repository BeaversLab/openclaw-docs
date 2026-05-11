---
summary: "Comment OpenClaw résume les longues conversations pour rester dans les limites du modèle"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactage"
---

Chaque modèle dispose d'une fenêtre de contexte : le nombre maximum de jetons qu'il peut traiter. Lorsqu'une conversation approche cette limite, OpenClaw **compacte** les anciens messages dans un résumé afin que la conversation puisse continuer.

## Fonctionnement

1. Les anciens tours de conversation sont résumés en une entrée compacte.
2. Le résumé est enregistré dans la transcription de la session.
3. Les messages récents sont conservés intacts.

Lorsque OpenClaw divise l'historique en blocs de compactage, il garde les appels d'outil de l'assistant associés à leurs entrées `toolResult` correspondantes. Si un point de division tombe à l'intérieur d'un bloc d'outil, OpenClaw déplace la limite pour que la paire reste ensemble et que la queue non résumée actuelle soit préservée.

L'historique complet de la conversation reste sur le disque. Le compactage ne modifie que ce que le modèle voit au tour suivant.

## Auto-compactage

L'auto-compactage est activé par défaut. Il s'exécute lorsque la session approche de la limite de contexte, ou lorsque le modèle renvoie une erreur de dépassement de contexte (auquel cas OpenClaw compacte et réessaie).

Vous verrez :

- `🧹 Auto-compaction complete` en mode verbeux.
- `/status` affichant `🧹 Compactions: <count>`.

<Info>Avant de compacter, OpenClaw rappelle automatiquement à l'agent de sauvegarder des notes importantes dans les fichiers [mémoire](/fr/concepts/memory). Cela empêche la perte de contexte.</Info>

<AccordionGroup>
  <Accordion title="Signatures de dépassement reconnues">
    OpenClaw détecte les dépassements de contexte à partir de ces modèles d'erreur de fournisseur :

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## Compactage manuel

Tapez `/compact` dans n'importe quelle discussion pour forcer un compactage. Ajoutez des instructions pour guider le résumé :

```
/compact Focus on the API design decisions
```

Lorsque `agents.defaults.compaction.keepRecentTokens` est défini, le compactage manuel respecte ce point de coupure Pi et conserve la queue récente dans le contexte reconstruit. Sans un budget de conservation explicite, le compactage manuel se comporte comme un point de contrôle strict et continue à partir du nouveau résumé seul.

## Configuration

Configurez la compaction sous `agents.defaults.compaction` dans votre `openclaw.json`. Les paramètres les plus courants sont répertoriés ci-dessous ; pour la référence complète, consultez [Approfondissement de la gestion de session](/fr/reference/session-management-compaction).

### Utilisation d'un modèle différent

Par défaut, la compaction utilise le modèle principal de l'agent. Définissez `agents.defaults.compaction.model` pour déléguer le résumé à un modèle plus performant ou spécialisé. Le remplacement accepte n'importe quelle chaîne `provider/model-id` :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

Cela fonctionne également avec les modèles locaux, par exemple un deuxième modèle Ollama dédié au résumé :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

Lorsqu'il n'est pas défini, la compaction utilise le modèle principal de l'agent.

### Préservation des identifiants

Le résumé de compaction préserve les identifiants opaques par défaut (`identifierPolicy: "strict"`). Remplacez par `identifierPolicy: "off"` pour désactiver, ou `identifierPolicy: "custom"` plus `identifierInstructions` pour une guidance personnalisée.

### Garde d'octets de transcription active

Lorsque `agents.defaults.compaction.maxActiveTranscriptBytes` est défini, OpenClaw déclenche une compaction locale normale avant une exécution si le JSONL actif atteint cette taille. Ceci est utile pour les sessions de longue durée où la gestion du contexte côté fournisseur peut garder le contexte du modèle sain tandis que la transcription locale continue de croître. Il ne divise pas les octets JSONL bruts ; il demande au pipeline de compaction normal de créer un résumé sémantique.

<Warning>La garde d'octets nécessite `truncateAfterCompaction: true`. Sans la rotation des transcriptions, le fichier actif ne réduirait pas sa taille et la garde reste inactive.</Warning>

### Transcriptions successeurs

Lorsque `agents.defaults.compaction.truncateAfterCompaction` est activé, OpenClaw ne réécrit pas la transcription existante sur place. Il crée une nouvelle transcription successeur active à partir du résumé de compaction, de l'état préservé et de la queue non résumée, puis conserve le JSONL précédent comme source de point de contrôle archivé.
Les transcriptions successeurs suppriment également les tours d'utilisateur longs en double exact qui arrivent
dans une courte fenêtre de nouvelle tentative, de sorte que les tempêtes de nouvelles tentative de canal ne sont pas transférées vers la
prochaine transcription active après la compaction.

Les points de contrôle pré-compaction sont conservés uniquement tant qu'ils restent en dessous de la limite de taille
des points de contrôle de OpenClaw ; les transcriptions actives trop volumineuses sont toujours compactées, mais OpenClaw
saute le grand instantané de débogage au lieu de doubler l'utilisation du disque.

### Notifications de compaction

Par défaut, la compaction s'exécute en silence. Définissez `notifyUser` pour afficher de brefs messages de statut lorsque la compaction commence et se termine :

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

### Vidange de la mémoire

Avant la compaction, OpenClaw peut exécuter un tour de **vidange de mémoire silencieuse** pour stocker des notes durables sur le disque. Voir [Mémoire](/fr/concepts/memory) pour plus de détails et la configuration.

## Fournisseurs de compaction enfichables

Les plugins peuvent enregistrer un fournisseur de compaction personnalisé via `registerCompactionProvider()` sur l'API du plugin. Lorsqu'un fournisseur est enregistré et configuré, OpenClaw délègue le résumé à celui-ci au lieu du pipeline LLM intégré.

Pour utiliser un fournisseur enregistré, définissez son identifiant dans votre configuration :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

Définir un `provider` force automatiquement `mode: "safeguard"`. Les fournisseurs reçoivent les mêmes instructions de compaction et la même politique de préservation des identifiants que le chemin intégré, et OpenClaw préserve toujours le contexte du suffixe des tours récents et divisés après la sortie du fournisseur.

<Note>Si le fournisseur échoue ou renvoie un résultat vide, OpenClaw revient par défaut au résumé LLM intégré.</Note>

## Compaction vs élagage

|                   | Compaction                             | Élagage                                  |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| **Ce qu'il fait** | Résume l'ancienne conversation         | Supprime les anciens résultats d'outils  |
| **Sauvegardé ?**  | Oui (dans la transcription de session) | Non (en mémoire uniquement, par requête) |
| **Portée**        | Conversation entière                   | Résultats des outils uniquement          |

[L'élagage de session](/fr/concepts/session-pruning) est un complément plus léger qui supprime la sortie des outils sans résumer.

## Dépannage

**Compactation trop fréquente ?** La fenêtre contextuelle du modèle peut être petite, ou les sorties d'outils peuvent être volumineuses. Essayez d'activer [l'élagage de session](/fr/concepts/session-pruning).

**Le contexte semble périmé après la compaction ?** Utilisez `/compact Focus on <topic>` pour guider le résumé, ou activez la [vidange de la mémoire](/fr/concepts/memory) pour que les notes soient conservées.

**Besoin d'un nouveau départ ?** `/new` démarre une nouvelle session sans compaction.

Pour une configuration avancée (réservation de jetons, préservation des identifiants, moteurs de contexte personnalisés, compaction côté serveur OpenAI), voir la [plongée approfondie dans la gestion de session](/fr/reference/session-management-compaction).

## Connexes

- [Session](/fr/concepts/session) : gestion de session et cycle de vie.
- [Élagage de session](/fr/concepts/session-pruning) : suppression des résultats d'outils.
- [Contexte](/fr/concepts/context) : la manière dont le contexte est construit pour les tours de l'agent.
- [Hooks](/fr/automation/hooks) : hooks du cycle de vie de la compactage (`before_compaction`, `after_compaction`).
