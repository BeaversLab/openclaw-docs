---
summary: "Héberger OpenClaw sur Upstash Box avec keep-alive et accès via tunnel SSH"
read_when:
  - Deploying OpenClaw to Upstash Box
  - You want a managed Linux environment for OpenClaw with SSH-tunneled dashboard access
title: "Upstash Box"
---

Exécutez un OpenClaw Gateway persistant sur Upstash Box, un environnement Linux géré
avec prise en charge du cycle de vie keep-alive.

Utilisez un tunnel SSH pour l'accès au tableau de bord. N'exposez pas directement le port du Gateway
à l'internet public.

## Prérequis

- Compte Upstash
- Upstash Box Keep-alive
- Client SSH sur votre machine locale

## Créer une Box

Créez une Box Keep-alive dans la console Upstash. Notez l'ID de la Box, tel que
`right-flamingo-14486`, et votre clé API de Box.

Upstash maintient son guide actuel pour la Box OpenClaw à
[Configuration OpenClaw](https://upstash.com/docs/box/guides/openclaw-setup).

## Se connecter avec un tunnel SSH

Transférezz le port du tableau de bord OpenClaw vers votre machine locale. Utilisez votre clé API de Box
comme mot de passe SSH lorsque cela vous est demandé :

```bash
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

Les options keepalive réduisent les déconnexions du tunnel inactif pendant l'onboarding.

## Installer OpenClaw

Dans la Box :

```bash
sudo npm install -g openclaw
```

## Exécuter l'onboarding

```bash
openclaw onboard --install-daemon
```

Suivez les invites. Copiez l'URL et le jeton du tableau de bord lorsque l'onboarding est terminé.

## Démarrer le Gateway

Configurez le Gateway pour le réseau Box et démarrez-le en arrière-plan :

```bash
openclaw config set gateway.bind lan
nohup openclaw gateway > gateway.log 2>&1 &
```

Avec le tunnel SSH actif, ouvrez l'URL du tableau de bord en local :

```text
http://127.0.0.1:18789/#token=<your-token>
```

## Redémarrage automatique

Définissez cette commande comme script d'initialisation de la Box afin que le Gateway redémarre lorsque la Box
démarre :

```bash
nohup openclaw gateway > gateway.log 2>&1 &
```

## Dépannage

Si SSH se fige pendant l'onboarding, reconnectez-vous avec une configuration SSH propre et
les keepalives :

```bash
ssh -F /dev/null -o ControlMaster=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

Cela contourne les paramètres `~/.ssh/config` locaux obsolètes et maintient le tunnel actif
pendant les périodes d'inactivité du réseau.

## Connexes

- [Accès à distance](/fr/gateway/remote)
- [Sécurité du Gateway](/fr/gateway/security)
- [Mise à jour de OpenClaw](/fr/install/updating)
