---
summary: "OpenClawUtiliser la synthèse vocale Gradium dans OpenClaw"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key, voice, or directive token configuration
title: "Gradium"
---

[Gradium](https://gradium.ai) est un fournisseur de synthèse vocale intégré pour OpenClaw. Le plugin peut générer des réponses audio normales (WAV), des sorties Opus compatibles avec les notes vocales et de laudio u-law à 8 kHz pour les surfaces de téléphonie.

| Propriété         | Valeur                                |
| ----------------- | ------------------------------------- |
| ID du fournisseur | `gradium`                             |
| Authentification  | `GRADIUM_API_KEY` ou config `apiKey`  |
| URL de base       | `https://api.gradium.ai` (par défaut) |
| Voix par défaut   | `Emma` (`YTpq7expH9539ERJ`)           |

## Configuration

Créez une clé API Gradium, puis exposez-la à OpenClaw soit via une variable d'environnement, soit via la clé de configuration.

<Tabs>
  <Tab title="Variable d'environnement">
    ```bash
    export GRADIUM_API_KEY="gsk_..."
    ```
  </Tab>

  <Tab title="Clé de configuration">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "gradium",
          providers: {
            gradium: {
              apiKey: "${GRADIUM_API_KEY}",
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

Le plugin vérifie d'abord le `apiKey` résolu et se rabat sur la variable d'environnement `GRADIUM_API_KEY`.

## Configuration

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          voiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

| Clé                                      | Type   | Description                                                                                                |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `messages.tts.providers.gradium.apiKey`  | chaîne | Clé API résolue. Prend en charge `${ENV}` et les références secrètes.                                      |
| `messages.tts.providers.gradium.baseUrl` | chaîne | Remplacer l'origine API. Les barres obliques de fin sont supprimées. Par défaut, `https://api.gradium.ai`. |
| `messages.tts.providers.gradium.voiceId` | chaîne | ID de voix par défaut utilisé lorsqu'aucune directive de remplacement n'est présente.                      |

Le format audio de sortie est sélectionné automatiquement par le runtime en fonction de la surface cible et n'est pas configurable depuis `openclaw.json`. Voir [Sortie](#output) ci-dessous.

## Voix

| Nom       | ID de voix         |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

Voix par défaut : Emma.

### Remplacement de voix par message

Lorsque la politique vocale active autorise le remplacement des voix, vous pouvez changer de voix en ligne à l'aide d'un jeton de directive. Tous ceux-ci résolvent le même remplacement `voiceId` :

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

Si la politique vocale désactive le remplacement des voix, la directive est consommée mais ignorée.

## Sortie

L'environnement d'exécution choisit le format de sortie en fonction de la surface cible. Le provider ne synthétise pas aujourd'hui d'autres formats.

| Cible          | Format      | Ext. de fichier | Taux d'échantillonnage | Indicateur de compatibilité vocale |
| -------------- | ----------- | --------------- | ---------------------- | ---------------------------------- |
| Audio standard | `wav`       | `.wav`          | provider               | non                                |
| Note vocale    | `opus`      | `.opus`         | provider               | oui                                |
| Téléphonie     | `ulaw_8000` | n/a             | 8 kHz                  | n/a                                |

## Ordre de sélection automatique

Parmi les fournisseurs TTS configurés, l'ordre de sélection automatique de Gradium est `30`. Voir [Text-to-Speech](/fr/tools/tts) pour savoir comment OpenClaw choisit le fournisseur actif lorsque `messages.tts.provider` n'est pas épinglé.

## Connexes

- [Text-to-Speech](/fr/tools/tts)
- [Aperçu des médias](/fr/tools/media-overview)
