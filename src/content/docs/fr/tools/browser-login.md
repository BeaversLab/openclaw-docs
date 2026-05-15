---
summary: "Connexions manuelles pour l'automatisation du navigateur + publications sur X/Twitter"
read_when:
  - You need to log into sites for browser automation
  - You want to post updates to X/Twitter
title: "Connexion via navigateur"
---

## Connexion manuelle (recommandée)

Lorsqu'un site nécessite une connexion, **connectez-vous manuellement** dans le **profil** du navigateur **hôte** (le navigateur openclaw).

**Ne** fournissez **pas** vos identifiants au modèle. Les connexions automatisées déclenchent souvent les défenses anti-bots et peuvent verrouiller le compte.

Retour à la documentation principale du navigateur : [Navigateur](/fr/tools/browser).

## Quel profil Chrome est utilisé ?

OpenClaw contrôle un **profil Chrome dédié** (nommé OpenClaw`openclaw`, interface orange). Celui-ci est distinct de votre profil de navigateur quotidien.

Pour les appels d'outil de navigateur de l'agent :

- Choix par défaut : l'agent doit utiliser son navigateur `openclaw` isolé.
- Utilisez `profile="user"` uniquement lorsque les sessions de connexion existantes sont importantes et que l'utilisateur est devant l'ordinateur pour cliquer/approuver toute invite de pièce jointe.
- Si vous avez plusieurs profils de navigateur utilisateur, spécifiez le profil explicitement au lieu de deviner.

Deux moyens simples d'y accéder :

1. **Demandez à l'agent d'ouvrir le navigateur** puis connectez-vous vous-même.
2. **Ouvrez-le via le CLI** :

```bash
openclaw browser start
openclaw browser open https://x.com
```

Si vous avez plusieurs profils, passez `--browser-profile <name>` (le défaut est `openclaw`).

## X/Twitter : flux recommandé

- **Lecture/recherche/fils :** utilisez le navigateur **hôte** (connexion manuelle).
- **Publier des mises à jour :** utilisez le navigateur **hôte** (connexion manuelle).

## Bac à sable + accès au navigateur hôte

Les sessions de navigateur isolées sont **plus susceptibles** de déclencher la détection de bots. Pour X/Twitter (et d'autres sites stricts), privilégiez le navigateur **hôte**.

Si l'agent est isolé, l'outil de navigateur utilise par défaut le bac à sable. Pour permettre le contrôle de l'hôte :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

Ciblez ensuite le navigateur hôte :

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

Ou désactivez l'isolation pour l'agent qui publie des mises à jour.

## Connexes

- [Navigateur](/fr/tools/browser)
- [Dépannage navigateur Linux](/fr/tools/browser-linux-troubleshooting)
- [Dépannage navigateur WSL2](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
