---
summary: "Référence : règles de nettoyage et de réparation des transcripts spécifiques aux providers"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Hygiène des transcripts"
---

# Hygiène des transcripts (Corrections du provider)

Ce document décrit les **corrections spécifiques aux providers** appliquées aux transcripts avant une exécution
(construction du contexte du model). Il s'agit d'ajustements **en mémoire** utilisés pour satisfaire les
exigences strictes des providers. Ces étapes d'hygiène ne **réécrivent pas** le transcript JSONL stocké
sur le disque ; cependant, une passe de réparation distincte du fichier de session peut réécrire les fichiers JSONL malformés
en supprimant les lignes invalides avant le chargement de la session. Lorsqu'une réparation se produit, le fichier
original est sauvegardé aux côtés du fichier de session.

La portée inclut :

- Nettoyage des identifiants d'appel d'outil
- Validation des entrées d'appel d'outil
- Réparation du couplage des résultats d'outil
- Validation / ordonnancement des tours
- Nettoyage des signatures de pensée
- Nettoyage des charges utiles d'image
- Étiquetage de la provenance des entrées utilisateur (pour les invites routées inter-sessions)

Si vous avez besoin de détails sur le stockage des transcripts, consultez :

- [/reference/session-management-compaction](/fr/reference/session-management-compaction)

---

## Où cela s'exécute

Toute l'hygiène des transcripts est centralisée dans le runner intégré :

- Sélection de la politique : `src/agents/transcript-policy.ts`
- Application de la nettoyage/réparation : `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/google.ts`

La politique utilise `provider`, `modelApi` et `modelId` pour décider quoi appliquer.

Indépendamment de l'hygiène des transcripts, les fichiers de session sont réparés (si nécessaire) avant le chargement :

- `repairSessionFileIfNeeded` dans `src/agents/session-file-repair.ts`
- Appelé depuis `run/attempt.ts` et `compact.ts` (runner intégré)

---

## Règle globale : nettoyage des images

Les charges utiles d'images sont toujours nettoyées pour éviter les rejets côté provider dus aux limites de taille
(réduire la taille/recompresser les images base64 trop volumineuses).

Cela aide également à contrôler la pression de tokens induite par les images pour les modèles dotés de capacités de vision.
Des dimensions maximales plus faibles réduisent généralement l'utilisation de tokens ; des dimensions plus élevées préservent les détails.

Mise en œuvre :

- `sanitizeSessionMessagesImages` dans `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` dans `src/agents/tool-images.ts`
- Le côté maximal de l'image est configurable via `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`).

---

## Règle globale : appels d'outil malformés

Les blocs d'appels d'outil de l'assistant qui n'ont ni `input` ni `arguments` sont supprimés
avant la construction du contexte du modèle. Cela empêche les rejets du provider dus à des appels d'outil
partiellement persistés (par exemple, après un échec de limite de taux).

Mise en œuvre :

- `sanitizeToolCallInputs` dans `src/agents/session-transcript-repair.ts`
- Appliqué dans `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/google.ts`

---

## Règle globale : provenance des entrées inter-sessions

Lorsqu'un agent envoie une invite dans une autre session via `sessions_send` (y compris
les étapes de réponse/annonce agent-à-agent), OpenClaw persiste le tour utilisateur créé avec :

- `message.provenance.kind = "inter_session"`

Ces métadonnées sont écrites au moment de l'ajout à la transcription et ne modifient pas le rôle
(`role: "user"` reste pour la compatibilité du provider). Les lecteurs de transcription peuvent utiliser
cela pour éviter de traiter les invites internes acheminées comme des instructions rédigées par l'utilisateur final.

Pendant la reconstruction du contexte, OpenClaw prépare également un marqueur court `[Inter-session message]`
à ces tours utilisateur en mémoire afin que le modèle puisse les distinguer des
instructions externes de l'utilisateur final.

---

## Matrice des providers (comportement actuel)

**OpenAI / OpenAI Codex**

- Assainissement des images uniquement.
- Supprimer les signatures de raisonnement orphelines (éléments de raisonnement autonomes sans bloc de contenu suivant) pour les transcriptions OpenAI Responses/Codex.
- Aucun assainissement de l'id d'appel d'outil.
- Aucune réparation du couplage des résultats d'outil.
- Aucune validation ou réorganisation des tours.
- Aucun résultat d'outil synthétique.
- Aucun retrait de signature de pensée.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Sanitisation de l'ID d'appel d'outil : alphanumérique strict.
- Réparation du couplage des résultats d'outil et résultats d'outil synthétiques.
- Validation des tours (alternance des tours style Gemini).
- Correction de l'ordre des tours Google (ajouter un petit amorçage utilisateur si l'historique commence par l'assistant).
- Antigravity Claude : normaliser les signatures de réflexion ; supprimer les blocs de réflexion non signés.

**Anthropic / Minimax (compatible Anthropic)**

- Réparation du couplage des résultats d'outil et résultats d'outil synthétiques.
- Validation des tours (fusionner les tours utilisateur consécutifs pour respecter l'alternance stricte).

**Mistral (y compris la détection basée sur l'ID de modèle)**

- Sanitisation de l'ID d'appel d'outil : strict9 (alphanumérique de longueur 9).

**OpenRouter Gemini**

- Nettoyage des signatures de pensée : supprimer les valeurs `thought_signature` non base64 (garder le base64).

**Tout le reste**

- Sanitisation des images uniquement.

---

## Comportement historique (avant le 22/01/2026)

Avant la version 2026.1.22, OpenClaw appliquait plusieurs couches d'hygiène de transcription :

- Une **extension transcript-sanitize** s'exécutait à chaque construction de contexte et pouvait :
  - Réparer le couplage utilisation/résultat d'outil.
  - Nettoyer les ID d'appel d'outil (y compris un mode non strict qui préservait `_`/`-`).
- Le runner effectuait également une sanitisation spécifique au fournisseur, ce qui doublait le travail.
- Des mutations supplémentaires se produisaient en dehors de la politique du fournisseur, notamment :
  - Suppression des balises `<final>` du texte de l'assistant avant la persistance.
  - Suppression des tours d'erreur d'assistant vides.
  - Coupe du contenu de l'assistant après les appels d'outil.

Cette complexité a provoqué des régressions inter-fournisseurs (notamment le couplage `openai-responses`
`call_id|fc_id`). Le nettoyage de la version 2026.1.22 a supprimé l'extension, centralisé
la logique dans le runner et rendu OpenAI **sans intervention** au-delà de la sanitisation des images.

import fr from "/components/footer/fr.mdx";

<fr />
