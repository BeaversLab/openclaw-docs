---
summary: "Usar Qwen OAuth (nivel gratuito) en OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You want free-tier OAuth access to Qwen Coder
title: "Qwen"
---

# Qwen

Qwen proporciona un flujo de OAuth de nivel gratuito para los modelos Qwen Coder y Qwen Vision
(2.000 solicitudes/día, sujeto a los límites de velocidad de Qwen).

## Habilitar el complemento

```bash
openclaw plugins enable qwen-portal-auth
```

Reinicie el Gateway después de habilitar.

## Autenticar

```bash
openclaw models auth login --provider qwen-portal --set-default
```

Esto ejecuta el flujo de OAuth de código de dispositivo de Qwen y escribe una entrada de proveedor en su
`models.json` (además de un alias `qwen` para cambiar rápidamente).

## ID de modelo

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Cambie de modelos con:

```bash
openclaw models set qwen-portal/coder-model
```

## Reutilizar el inicio de sesión de Qwen Code CLI

Si ya inició sesión con Qwen Code CLI, OpenClaw sincronizará las credenciales
desde `~/.qwen/oauth_creds.json` cuando cargue el almacén de autenticación. Aún necesita una
entrada `models.providers.qwen-portal` (use el comando de inicio de sesión anterior para crear una).

## Notas

- Los tokens se actualizan automáticamente; vuelva a ejecutar el comando de inicio de sesión si la actualización falla o se revoca el acceso.
- URL base predeterminada: `https://portal.qwen.ai/v1` (anúlela con
  `models.providers.qwen-portal.baseUrl` si Qwen proporciona un punto final diferente).
- Consulte [Model providers](/es/concepts/model-providers) para las reglas generales del proveedor.

import es from "/components/footer/es.mdx";

<es />
