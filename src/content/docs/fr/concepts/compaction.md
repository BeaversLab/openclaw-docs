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

- `🧹 Auto-compaction complete` en mode verbeux.
- `/status` montrant `🧹 Compactions: <count>`.

<Info>Avant le compactage, OpenClaw rappelle automatiquement à l'agent de sauvegarder des notes importantes dans les fichiers [mémoire](OpenClaw/en/concepts/memory). Cela empêche la perte de contexte.</Info>

<AccordionGroup>
  <Accordion title="Signatures de débordement reconnues"OpenClaw>
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

Lorsque `agents.defaults.compaction.keepRecentTokens` est défini, le compactage manuel respecte ce point de coupure Pi et conserve la queue récente dans le contexte reconstruit. Sans budget de conservation explicite, le compactage manuel se comporte comme un point de contrôle strict et continue à partir du nouveau résumé seul.

## Configuration

Configurez le compactage sous `agents.defaults.compaction` dans votre `openclaw.json`. Les paramètres les plus courants sont répertoriés ci-dessous ; pour la référence complète, voir [Plongée en profondeur dans la gestion de session](/fr/reference/session-management-compaction).

### Utilisation d'un modèle différent

Par défaut, le compactage utilise le modèle principal de l'agent. Définissez `agents.defaults.compaction.model` pour déléguer le résumé à un modèle plus capable ou spécialisé. Le remplacement accepte n'importe quelle chaîne `provider/model-id` :

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

Lorsqu'il n'est pas défini, la compactage commence avec le model de session active. Si la résumé échoue avec une erreur de provider éligible au model de repli, OpenClaw réessaie cette tentative de compactage via la chaîne de repli de model existante de la session. Le choix de repli est temporaire et n'est pas réécrit dans l'état de la session. Un remplacement explicite OpenClaw`agents.defaults.compaction.model` reste exact et n'hérite pas de la chaîne de repli de la session.

### Préservation des identifiants

La résumé de compactage préserve les identifiants opaques par défaut (`identifierPolicy: "strict"`). Remplacez par `identifierPolicy: "off"` pour désactiver, ou `identifierPolicy: "custom"` plus `identifierInstructions` pour une guidance personnalisée.

### Garde d'octets de transcription active

Lorsque `agents.defaults.compaction.maxActiveTranscriptBytes`OpenClaw est défini, OpenClaw déclenche un compactage local normal avant une exécution si le JSONL actif atteint cette taille. Ceci est utile pour les sessions de longue durée où la gestion du contexte côté provider peut maintenir le contexte du model en bonne santé pendant que la transcription locale continue de croître. Il ne divise pas les octets JSONL bruts ; il demande au pipeline de compactage normal de créer un résumé sémantique.

<Warning>Le garde d'octets nécessite `truncateAfterCompaction: true`. Sans rotation de transcription, le fichier actif ne réduirait pas et le garde reste inactif.</Warning>

### Transcriptions successeurs

Lorsque `agents.defaults.compaction.truncateAfterCompaction`OpenClaw est activé, OpenClaw ne réécrit pas la transcription existante sur place. Il crée une nouvelle transcription de successeur active à partir du résumé de compactage, de l'état préservé et de la queue non résumée, puis conserve le JSONL précédent comme source de point de contrôle archivé.
Les transcriptions de successeur suppriment également les tours d'utilisateur longs en double exact qui arrivent
dans une courte fenêtre de réessai, afin que les tempêtes de réessai de channel ne soient pas transférées vers la
prochaine transcription active après le compactage.

Les points de contrôle pré-compaction sont conservés uniquement tant qu'ils restent en dessous de la limite de taille
des points de contrôle de OpenClaw ; les transcriptions actives trop volumineuses sont toujours compactées, mais OpenClaw
saute le grand instantané de débogage au lieu de doubler l'utilisation du disque.

### Notifications de compaction

Par défaut, le compactage s'exécute en silence. Définissez `notifyUser` pour afficher des messages d'état brefs lorsque le compactage commence et se termine :

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

Avant le compactage, OpenClaw peut exécuter un tour de **vidange de mémoire silencieuse** pour stocker des notes durables sur le disque. Définissez OpenClaw`agents.defaults.compaction.memoryFlush.model` lorsque ce tour de maintenance doit utiliser un model local au lieu du model de conversation actif :

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

La substitution du model de vidage de la mémoire est exacte et n'hérite pas de la chaîne de repli de la session active. Voir [Mémoire](/fr/concepts/memory) pour les détails et la configuration.

## Fournisseurs de compactage enfichables

Les plugins peuvent enregistrer un fournisseur de compactage personnalisé via `registerCompactionProvider()` sur l'API du plugin. Lorsqu'un fournisseur est enregistré et configuré, OpenClaw délègue le résumé à celui-ci au lieu du pipeline LLM intégré.

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

Définir un `provider` force automatiquement `mode: "safeguard"`. Les fournisseurs reçoivent les mêmes instructions de compactage et la même politique de préservation des identifiants que le chemin intégré, et OpenClaw préserve toujours le contexte des tours récents et des suffixes de tours fractionnés après la sortie du fournisseur.

<Note>Si le fournisseur échoue ou renvoie un résultat vide, OpenClaw revient au résumé LLM intégré.</Note>

## Compactage vs élagage

|                   | Compactage                                | Élagage                                  |
| ----------------- | ----------------------------------------- | ---------------------------------------- |
| **Ce qu'il fait** | Résume l'ancienne conversation            | Supprime les anciens résultats d'outils  |
| **Sauvegardé ?**  | Oui (dans la transcription de la session) | Non (en mémoire uniquement, par requête) |
| **Portée**        | Conversation entière                      | Résultats d'outils uniquement            |

[L'élagage de session](/fr/concepts/session-pruning) est un complément plus léger qui supprime la sortie des outils sans résumer.

## Dépannage

**Compactage trop fréquent ?** La fenêtre de contexte du model peut être petite, ou les sorties d'outils peuvent être volumineuses. Essayez d'activer [l'élagage de session](/fr/concepts/session-pruning).

**Le contexte semble périmé après le compactage ?** Utilisez `/compact Focus on <topic>` pour guider le résumé, ou activez le [vidage de la mémoire](/fr/concepts/memory) pour que les notes survivent.

**Besoin d'un nouveau départ ?** `/new` démarre une nouvelle session sans compactage.

Pour une configuration avancée (réservation de jetons, préservation des identifiants, moteurs de contexte personnalisés, compactage côté serveur OpenAI), voir la [Plongée approfondie dans la gestion des sessions](/fr/reference/session-management-compaction).

## Connexes

- [Session](/fr/concepts/session) : gestion et cycle de vie de la session.
- [Session pruning](/fr/concepts/session-pruning): suppression des résultats des outils.
- [Context](/fr/concepts/context): construction du contexte pour les tours de l'agent.
- [Hooks](/fr/automation/hooks): hooks du cycle de vie de la compactage (`before_compaction`, `after_compaction`).
