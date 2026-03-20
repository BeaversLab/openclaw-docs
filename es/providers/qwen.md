---
summary: "Usar Qwen OAuth (nivel gratuito) en OpenClaw"
read_when:
  - Quieres usar Qwen con OpenClaw
  - Quieres acceso OAuth de nivel gratuito a Qwen Coder
title: "Qwen"
---

# Qwen

Qwen proporciona un flujo OAuth de nivel gratuito para los modelos Qwen Coder y Qwen Vision
(2.000 solicitudes/día, sujeto a los límites de velocidad de Qwen).

## Habilitar el complemento

```bash
openclaw plugins enable qwen-portal-auth
```

Reinicia la puerta de enlace después de habilitar.

## Autenticar

```bash
openclaw models auth login --provider qwen-portal --set-default
```

Esto ejecuta el flujo OAuth del código de dispositivo de Qwen y escribe una entrada de proveedor en tu
`models.json` (además de un alias `qwen` para un cambio rápido).

## Identificadores de modelo

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Cambia los modelos con:

```bash
openclaw models set qwen-portal/coder-model
```

## Reutilizar el inicio de sesión de Qwen Code CLI

Si ya has iniciado sesión con Qwen Code CLI, OpenClaw sincronizará las credenciales
desde `~/.qwen/oauth_creds.json` cuando cargue el almacén de autenticación. Aún necesitas una
entrada `models.providers.qwen-portal` (usa el comando de inicio de sesión anterior para crear una).

## Notas

- Los tokens se actualizan automáticamente; vuelve a ejecutar el comando de inicio de sesión si la actualización falla o si se revoca el acceso.
- URL base predeterminada: `https://portal.qwen.ai/v1` (anular con
  `models.providers.qwen-portal.baseUrl` si Qwen proporciona un punto final diferente).
- Consulta [Model providers](/es/concepts/model-providers) para las reglas generales del proveedor.

import en from "/components/footer/en.mdx";

<en />
