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

Lorsqu'OpenClaw divise l'historique en blocs de compactage, il garde les appels d'outil de l'assistant associés à leurs entrées OpenClaw`toolResult`OpenClaw correspondantes. Si un point de division tombe à l'intérieur d'un bloc d'outil, OpenClaw déplace la limite pour que la paire reste ensemble et que la queue non résumée actuelle soit préservée.

L'historique complet de la conversation reste sur le disque. Le compactage ne modifie que ce que le modèle voit au tour suivant.

## Auto-compactage

L'auto-compactage est activé par défaut. Il s'exécute lorsque la session approche de la limite de contexte, ou lorsque le modèle renvoie une erreur de dépassement de contexte (auquel cas OpenClaw compacte et réessaie).

Vous verrez :

- `embedded run auto-compaction start` / `complete` dans les journaux normaux du Gateway.
- `🧹 Auto-compaction complete` en mode verbeux.
- `/status` affichant `🧹 Compactions: <count>`.

<Info>Avant compactage, OpenClaw rappelle automatiquement à l'agent d'enregistrer des notes importantes dans les fichiers [mémoire](/fr/concepts/memory). Cela empêche la perte de contexte.</Info>

<AccordionGroup>
  <Accordion title="Signatures de débordement reconnues">
    OpenClaw détecte le débordement de contexte à partir de ces modèles d'erreur de fournisseur :

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## Compactage manuel

Tapez `/compact` dans n'importe quel chat pour forcer un compactage. Ajoutez des instructions pour guider le résumé :

```
/compact Focus on the API design decisions
```

Lorsque `agents.defaults.compaction.keepRecentTokens` est défini, le compactage manuel respecte ce point de coupure Pi et conserve la file récente dans le contexte reconstruit. Sans budget de conservation explicite, le compactage manuel agit comme un point de contrôle strict et continue à partir du nouveau résumé seul.

## Configuration

Configurez le compactage sous `agents.defaults.compaction` dans votre `openclaw.json`. Les paramètres les plus courants sont listés ci-dessous ; pour la référence complète, consultez [Plongée en profondeur dans la gestion de session](/fr/reference/session-management-compaction).

### Utilisation d'un modèle différent

Par défaut, le compactage utilise le modèle principal de l'agent. Définissez `agents.defaults.compaction.model` pour déléguer la synthèse à un modèle plus capable ou spécialisé. Le remplacement accepte n'importe quelle chaîne `provider/model-id` :

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

Cela fonctionne aussi avec les modèles locaux, par exemple un deuxième modèle Ollama dédié à la synthèse :

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

Lorsqu'il n'est pas défini, la compactage commence avec le modèle de session active. Si la résumé échoue avec une erreur de fournisseur éligible pour le repli de modèle, OpenClaw réessaie cette tentative de compactage via la chaîne de repli de modèle existante de la session. Le choix de repli est temporaire et n'est pas réécrit dans l'état de la session. Un remplacement explicite `agents.defaults.compaction.model` reste exact et n'hérite pas de la chaîne de repli de session.

### Préservation des identifiants

La résumé de compactage préserve les identifiants opaques par défaut (`identifierPolicy: "strict"`). Remplacez par `identifierPolicy: "off"` pour désactiver, ou `identifierPolicy: "custom"` plus `identifierInstructions` pour une guidage personnalisé.

### Garde d'octets de transcription active

Lorsque `agents.defaults.compaction.maxActiveTranscriptBytes` est défini, OpenClaw déclenche un compactage local normal avant une exécution si le JSONL actif atteint cette taille. Ceci est utile pour les sessions de longue durée où la gestion du contexte côté fournisseur peut garder le contexte du modèle en bonne santé pendant que la transcription locale continue de croître. Cela ne divise pas les octets JSONL bruts ; il demande au pipeline de compactage normal de créer un résumé sémantique.

<Warning>La garde d'octets nécessite `truncateAfterCompaction: true`. Sans la rotation des transcriptions, le fichier actif ne rétrécirait pas et la garde reste inactive.</Warning>

### Transcriptions successeurs

Lorsque `agents.defaults.compaction.truncateAfterCompaction` est activé, OpenClaw ne réécrit pas la transcription existante sur place. Il crée une nouvelle transcription successeur active à partir du résumé de compactage, de l'état préservé et de la queue non résumée, puis conserve le JSONL précédent comme source de point de contrôle archivé.
Les transcriptions successeurs suppriment également les tours d'utilisateur longs en double exact qui arrivent
à l'intérieur d'une courte fenêtre de réessai, de sorte que les tempêtes de réessai du canal ne soient pas reportées dans la
prochaine transcription active après compactage.

Les points de contrôle pré-compaction sont conservés uniquement tant qu'ils restent en dessous de la limite de taille de point de contrôle de OpenClaw ; les transcriptions actives volumineuses se compactent toujours, mais OpenClaw
saute le grand instantané de débogage au lieu de doubler l'utilisation du disque.

### Notifications de compactage

Par défaut, le compactage s'exécute en silence. Définissez `notifyUser` pour afficher de brefs messages d'état lorsque le compactage commence et se termine :

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

### Memory flush

Avant la compaction, OpenClaw peut exécuter un tour de **silent memory flush** pour stocker des notes durables sur le disque. Définissez `agents.defaults.compaction.memoryFlush.model` lorsque ce tour de maintenance doit utiliser un modèle local au lieu du modèle de conversation actif :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

Le remplacement du modèle de mémoire-flush est exact et n'hérite pas de la chaîne de repli de session active. Voir [Memory](/fr/concepts/memory) pour les détails et la configuration.

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

<Note>Si le fournisseur échoue ou renvoie un résultat vide, OpenClaw revient au résumé LLM intégré.</Note>

## Compaction vs élagage

|                   | Compaction                             | Élagage                                  |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| **Ce qu'il fait** | Résume l'ancienne conversation         | Coupe les anciens résultats d'outil      |
| **Sauvegardé ?**  | Oui (dans la transcription de session) | Non (en mémoire uniquement, par requête) |
| **Portée**        | Conversation entière                   | Résultats d'outil uniquement             |

[L'élagage de session](/fr/concepts/session-pruning) est un complément plus léger qui coupe la sortie des outils sans résumer.

## Dépannage

**Compaction trop fréquente ?** La fenêtre contextuelle du modèle peut être petite, ou les sorties d'outils peuvent être volumineuses. Essayez d'activer [l'élagage de session](/fr/concepts/session-pruning).

**Le contexte semble périmé après la compaction ?** Utilisez `/compact Focus on <topic>` pour guider le résumé, ou activez le [memory flush](/fr/concepts/memory) pour que les notes survivent.

**Besoin d'un nouveau départ ?** `/new` démarre une nouvelle session sans compaction.

Pour une configuration avancée (réservation de jetons, préservation des identifiants, moteurs de contexte personnalisés, compactage côté serveur OpenAI), consultez la section [Session management deep dive](/fr/reference/session-management-compaction).

## Connexes

- [Session](/fr/concepts/session) : gestion et cycle de vie de session.
- [Session pruning](/fr/concepts/session-pruning) : suppression des résultats d'outils.
- [Context](/fr/concepts/context) : construction du contexte pour les tours de l'agent.
- [Hooks](/fr/automation/hooks) : hooks du cycle de vie de compactage (`before_compaction`, `after_compaction`).
