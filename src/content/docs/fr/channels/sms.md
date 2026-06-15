---
summary: "Configuration du canal SMS Twilio, contrôles d'accès et configuration des webhooks"
read_when:
  - You want to connect OpenClaw to SMS through Twilio
  - You need SMS webhook or allowlist setup
title: "SMS"
---

OpenClaw peut recevoir et envoyer des SMS via un numéro de téléphone Twilio ou un service de messagerie (Messaging Service). Le Gateway enregistre un routeur de webhook entrant, valide les signatures des requêtes Twilio par défaut et renvoie les réponses via l'API Messages de Twilio.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La politique DM par défaut pour SMS est l'appariement.
  </Card>
  <Card title="Sécurité de la Gateway"%PH:JSX_ATTR:31:8a331fdd%% icon="shield" href="/fr/gateway/security">
    Vérifiez l'exposition du webhook et les contrôles d'accès de l'expéditeur.
  </Card>
  <Card title="Dépannage du canal" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics et guides de réparation inter-canaux.
  </Card>
</CardGroup>

## Avant de commencer

Vous avez besoin de :

- Un compte Twilio avec un numéro de téléphone capable d'envoyer des SMS, ou un service de messagerie Twilio.
- Le SID de compte Twilio et le jeton d'authentification (Auth Token).
- Une URL HTTPS publique qui atteint votre OpenClaw Gateway.
- Un choix de politique d'expéditeur : `pairing` pour un usage privé, `allowlist` pour les numéros de téléphone préapprouvés, ou `open` uniquement pour un accès SMS intentionnellement public.

Utilisez un même numéro Twilio pour les SMS et les appels vocaux si le numéro possède ces deux capacités. Configurez le webhook SMS et le webhook vocal séparément dans Twilio ; cette page couvre uniquement le webhook SMS.

## Configuration rapide

<Steps>
  <Step title="Créer ou choisir un expéditeur Twilio">
    Dans Twilio, ouvrez **Phone Numbers > Manage > Active numbers** et choisissez un numéro compatible SMS. Sauvegardez :

    - Le SID de compte, par exemple `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    - Le jeton d'authentification (Auth Token)
    - Le numéro de téléphone de l'expéditeur, par exemple `+15551234567`

    Si vous utilisez un service de messagerie (Messaging Service) au lieu d'un numéro d'expéditeur fixe, sauvegardez le SID du service de messagerie, par exemple `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

  </Step>

  <Step title="Configurer le canal SMS">

Enregistrez ceci sous `sms.patch.json5` et modifiez les espaces réservés :

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

Appliquez-le :

```bash
openclaw config patch --file ./sms.patch.json5 --dry-run
openclaw config patch --file ./sms.patch.json5
```

  </Step>

  <Step title="Pointer Twilio vers le webhook Gateway">
    Dans les paramètres du numéro de téléphone Twilio, ouvrez **Messaging** et définissez **A message comes in** sur :

```text
https://gateway.example.com/webhooks/sms
```

    Utilisez HTTP `POST`. Le chemin local par défaut est `/webhooks/sms` ; modifiez `channels.sms.webhookPath` si vous avez besoin d'une route différente.

  </Step>

  <Step title="Exposer le chemin exact du webhook SMS">
    Votre URL publique doit acheminer le chemin SMS vers le processus Gateway. Si vous utilisez Tailscale Funnel pour les tests locaux, exposez `/webhooks/sms` explicitement :

```bash
tailscale funnel --bg --set-path /webhooks/sms http://127.0.0.1:<gateway-port>/webhooks/sms
tailscale funnel status
```

    Les appels vocaux et les SMS utilisent des chemins de webhook distincts. Si le même numéro Twilio gère les deux, conservez les deux routes configurées dans Twilio et dans votre tunnel.

  </Step>

  <Step title="Démarrer le Gateway et approuver le premier expéditeur">

```bash
openclaw gateway
```

Envoyez un message texte au numéro Twilio. Le premier message crée une demande de jumelage. Approuvez-la :

```bash
openclaw pairing list sms
openclaw pairing approve sms <CODE>
```

    Les codes de jumelage expirent après 1 heure.

  </Step>
</Steps>

## Exemples de configuration

### Fichier de configuration

Utilisez la configuration par fichier lorsque vous souhaitez que la définition du canal voyage avec la configuration Gateway :

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

### Variables d'environnement

Utilisez la configuration par env pour les déploiements à compte unique où les secrets proviennent de l'environnement hôte :

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="<twilio-auth-token>"
export TWILIO_PHONE_NUMBER="+15551234567"
export SMS_PUBLIC_WEBHOOK_URL="https://gateway.example.com/webhooks/sms"
```

Activez ensuite le canal dans la configuration :

```json5
{
  channels: {
    sms: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

`TWILIO_SMS_FROM` est accepté comme un alias pour `TWILIO_PHONE_NUMBER`. Utilisez `TWILIO_MESSAGING_SERVICE_SID` au lieu d'un expéditeur avec numéro de téléphone lorsque Twilio doit choisir l'expéditeur parmi un service de messagerie.

### Jeton d'authentification SecretRef

`authToken` peut être un SecretRef. Utilisez ceci lorsque le Gateway doit résoudre le jeton d'authentification Twilio à partir du runtime des secrets OpenClaw au lieu de stocker une configuration en texte brut :

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: { source: "env", provider: "default", id: "TWILIO_AUTH_TOKEN" },
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

La variable d'environnement ou le fournisseur de secrets référencé doit être visible par le runtime Gateway. Redémarrez les processus gérés du Gateway après avoir modifié les variables d'environnement de l'hôte.

### Numéro privé avec liste d'autorisation uniquement

Utilisez `allowlist` lorsque seuls les numéros de téléphone connus doivent pouvoir communiquer avec l'agent :

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "allowlist",
      allowFrom: ["+15557654321"],
    },
  },
}
```

### Expéditeur de service de messagerie

Utilisez `messagingServiceSid` au lieu de `fromNumber` lorsque Twilio doit choisir l'expéditeur via un service de messagerie :

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

Si `fromNumber` et `messagingServiceSid` sont tous deux présents après la résolution de la configuration et de l'environnement, `fromNumber` est utilisé.

### Cible sortante par défaut

Définissez `defaultTo` lorsque la livraison automatisée ou initiée par l'agent doit avoir une destination par défaut si un flux d'envoi omet une cible explicite :

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      defaultTo: "+15557654321",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
    },
  },
}
```

## Contrôle d'accès

`channels.sms.dmPolicy` contrôle l'accès direct SMS :

- `pairing` (par défaut)
- `allowlist` (nécessite au moins un expéditeur dans `allowFrom`)
- `open` (nécessite que `allowFrom` inclue `"*"`)
- `disabled`

Les entrées `allowFrom` doivent être des numéros de téléphone E.164 tels que `+15551234567`. Les préfixes `sms:` sont acceptés et normalisés. Pour un assistant privé, préférez `dmPolicy: "allowlist"` avec des numéros de téléphone explicites.

## Envoi de SMS

Les cibles SMS sortantes utilisent le préfixe de service `sms:` avec le canal SMS sélectionné :

```bash
openclaw message send --channel sms --target sms:+15551234567 --message "hello"
```

Lorsque la sélection du canal est implicite, `twilio-sms:+15551234567` sélectionne ce canal sans reprendre le préfixe de service `sms:` existant propriétaire du canal utilisé par iMessage.

```bash
openclaw message send --target twilio-sms:+15551234567 --message "hello"
```

La CLI nécessite un `--target` explicite. `defaultTo` est destiné aux chemins de livraison automatisés et initiés par l'agent où la cible peut être résolue à partir de la configuration du canal.

Les réponses de l'agent provenant de conversations SMS entrantes retournent automatiquement à l'expéditeur via l'expéditeur Twilio configuré.

La sortie SMS est en texte brut. OpenClaw supprime le markdown, aplatit les blocs de code délimités, préserve les liens lisibles et fractionne les longues réponses avant de les envoyer via Twilio.

## Vérifier la configuration

Une fois que la Gateway a démarré :

1. Confirmez que le journal de la Gateway affiche la route du webhook SMS.
2. Exécutez une sonde côté Twilio :

```bash
openclaw channels capabilities --channel sms
openclaw channels status --channel sms --probe --json
```

3. Envoyez un SMS au numéro Twilio depuis votre téléphone.
4. Exécutez `openclaw pairing list sms`.
5. Approuvez le code de couplage avec `openclaw pairing approve sms <CODE>`.
6. Envoyez un autre SMS et confirmez que l'agent répond.

Pour les tests sortants uniquement, utilisez :

```bash
openclaw message send --channel sms --target sms:+15557654321 --message "OpenClaw SMS test"
```

### Test de bout en bout depuis macOS iMessage/SMS

Sur un Mac capable d'envoyer des SMS d'opérateur via Messages, vous pouvez utiliser `imsg` pour piloter le côté expéditeur sans toucher à votre téléphone :

```bash
imsg send --to "+15551234567" --service sms --text "OpenClaw SMS E2E $(date -u +%Y%m%dT%H%M%SZ)" --json
openclaw pairing list sms
openclaw pairing approve sms <CODE>
imsg send --to "+15551234567" --service sms --text "reply exactly SMS pong" --json
```

Le premier message doit créer une demande de couplage. Le deuxième message doit recevoir la réponse de l'agent via Twilio.

## Sécurité du webhook

Par défaut, OpenClaw valide `X-Twilio-Signature` en utilisant `publicWebhookUrl` et `authToken`. Assurez-vous que `publicWebhookUrl` est alignée octet par octet avec l'URL configurée dans Twilio, y compris le schéma, l'hôte, le chemin et la chaîne de requête.

Pour les tests de tunnel local uniquement, vous pouvez définir :

```json5
{
  channels: {
    sms: {
      dangerouslyDisableSignatureValidation: true,
    },
  },
}
```

N'utilisez pas la validation de signature désactivée sur une Gateway publique.

## Configuration multi-compte

Utilisez `accounts` lorsque vous exploitez plus d'un numéro Twilio :

```json5
{
  channels: {
    sms: {
      accounts: {
        support: {
          enabled: true,
          accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          authToken: "twilio-auth-token",
          fromNumber: "+15551234567",
          publicWebhookUrl: "https://gateway.example.com/webhooks/sms/support",
          webhookPath: "/webhooks/sms/support",
          dmPolicy: "allowlist",
          allowFrom: ["+15557654321"],
        },
      },
    },
  },
}
```

Chaque compte doit utiliser un `webhookPath` distinct.

## Dépannage

### Twilio renvoie 403 ou OpenClaw rejette le webhook

Vérifiez que `publicWebhookUrl` correspond exactement à l'URL configurée dans Twilio, y compris le schéma, l'hôte, le chemin et la chaîne de requête. Twilio signe la chaîne de l'URL publique, donc les réécritures de proxy et les noms d'hôte alternatifs peuvent briser la validation de signature.

### Aucune demande d'appariement n'apparaît

Vérifiez l'URL et la méthode du webhook **Messaging** du numéro Twilio. Elle doit pointer vers l'URL du webhook SMS et utiliser `POST`. Confirmez également que le Gateway est accessible depuis l'Internet public ou via votre tunnel.

Si le journal des messages Twilio affiche l'erreur `11200`, Twilio a accepté le SMS entrant mais n'a pas pu atteindre votre webhook. Vérifiez :

- Twilio **Messaging > A message comes in** pointe vers `publicWebhookUrl`.
- La méthode est `POST`.
- Le tunnel ou le proxy inverse expose le `webhookPath` exact ; pour Tailscale Funnel, exécutez `tailscale funnel status` et confirmez que `/webhooks/sms` est répertorié.
- `publicWebhookUrl` utilise le même schéma, hôte, chemin et chaîne de requête que ceux envoyés par Twilio, afin que la validation de signature puisse reproduire l'URL signée.

### Les envois sortants échouent

Confirmez que `accountSid`, `authToken`, et soit `fromNumber` soit `messagingServiceSid` sont résolus. Si vous utilisez un compte Twilio d'essai, le numéro de destination peut devoir être vérifié dans Twilio avant que les SMS sortants puissent être envoyés.

### Les messages arrivent mais l'agent ne répond pas

Vérifiez `dmPolicy` et `allowFrom`. Avec la stratégie `pairing` par défaut, l'expéditeur doit être approuvé avant que les tours normaux de l'agent soient traités.
