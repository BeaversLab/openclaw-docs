---
summary: "Connectez-vous à GitHub Copilot depuis OpenClaw à l'aide du flux d'appareil"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

## Qu'est-ce que GitHub Copilot ?

GitHub Copilot est l'assistant de codage IA de GitHub. Il donne accès aux modèles
Copilot pour votre compte GitHub et votre plan. OpenClaw peut utiliser Copilot en tant que fournisseur
de modèle de deux manières différentes.

## Deux façons d'utiliser Copilot dans OpenClaw

### 1) Fournisseur intégré GitHub Copilot (`github-copilot`)

Utilisez le flux natif de connexion par appareil pour obtenir un jeton GitHub, puis échangez-le contre
des jetons de l'API Copilot lorsque OpenClaw s'exécute. C'est le chemin par **défaut** et le plus simple
car cela ne nécessite pas VS Code.

### 2) Plugin Copilot Proxy (`copilot-proxy`)

Utilisez l'extension VS Code **Copilot Proxy** comme pont local. OpenClaw communique avec
le point de terminaison `/v1` du proxy et utilise la liste de modèles que vous y configurez. Choisissez
cette option si vous exécutez déjà Copilot Proxy dans VS Code ou si vous devez acheminer le trafic via celui-ci.
Vous devez activer le plugin et garder l'extension VS Code en cours d'exécution.

Utilisez GitHub Copilot comme fournisseur de modèles (`github-copilot`). La commande de connexion exécute
le flux d'appareil GitHub, enregistre un profil d'authentification et met à jour votre configuration pour utiliser ce
profil.

## Configuration CLI

```bash
openclaw models auth login-github-copilot
```

Il vous sera demandé de visiter une URL et d'entrer un code à usage unique. Gardez le terminal
ouvert jusqu'à ce qu'il se termine.

### Indicateurs optionnels

```bash
openclaw models auth login-github-copilot --yes
```

Pour appliquer également le modèle par défaut recommandé par le fournisseur en une seule étape, utilisez plutôt
la commande d'authentification générique :

```bash
openclaw models auth login --provider github-copilot --method device --set-default
```

## Définir un modèle par défaut

```bash
openclaw models set github-copilot/gpt-4o
```

### Extrait de configuration

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
}
```

## Notes

- Nécessite un TTY interactif ; exécutez-le directement dans un terminal.
- La disponibilité des modèles Copilot dépend de votre offre ; si un modèle est rejeté, essayez
  un autre identifiant (par exemple `github-copilot/gpt-4.1`).
- Les identifiants de modèles Claude utilisent automatiquement le transport Messages de Anthropic ; les modèles GPT, série o
  et Gemini conservent le transport Responses de OpenAI.
- La connexion stocke un jeton GitHub dans le magasin de profils d'authentification et l'échange contre un
  jeton API Copilot lorsque API s'exécute.
