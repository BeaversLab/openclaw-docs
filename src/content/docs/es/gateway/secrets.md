---
summary: "Gestión de secretos: contrato SecretRef, comportamiento de la instantánea en tiempo de ejecución y limpieza unidireccional segura"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Gestión de secretos"
sidebarTitle: "Gestión de secretos"
---

OpenClaw soporta SecretRefs aditivos para que las credenciales compatibles no necesiten almacenarse como texto sin formato en la configuración.

<Note>El texto plano aún funciona. Los SecretRefs son optativos por cada credencial.</Note>

<Warning>
  Las credenciales en texto plano siguen siendo legibles por el agente si se almacenan en archivos que el agente puede inspeccionar, incluyendo `openclaw.json`, `auth-profiles.json`, `.env`, o archivos `agents/*/agent/models.json` generados. SecretRefs reducen ese radio de explosión local solo después de que se haya migrado cada credencial compatible y `openclaw secrets audit --check` reporte que
  no hay residuos de secretos en texto plano.
</Warning>

## Objetivos y modelo de tiempo de ejecución

Los secretos se resuelven en una instantánea de tiempo de ejecución en memoria.

- La resolución es ansiosa durante la activación, no perezosa en las rutas de solicitud.
- El inicio falla rápido cuando un SecretRef efectivamente activo no puede ser resuelto.
- La recarga usa un intercambio atómico: éxito total, o mantener la última instantánea conocida buena.
- Las violaciones de la política de SecretRef (por ejemplo, perfiles de autenticación en modo OAuth combinados con entrada SecretRef) fallan la activación antes del intercambio de tiempo de ejecución.
- Las solicitudes de tiempo de ejecución leen solo de la instantánea en memoria activa.
- Después de la primera activación/carga exitosa de la configuración, las rutas de código de tiempo de ejecución siguen leyendo esa instantánea en memoria activa hasta que una recarga exitosa la intercambia.
- Las rutas de entrega saliente también leen de esa instantánea activa (por ejemplo, entrega de respuestas/hilos de Discord y envíos de acciones de Telegram); no resuelven de nuevo los SecretRefs en cada envío.

Esto mantiene las interrupciones del proveedor de secretos fuera de las rutas de solicitud activas.

## Límite de acceso del agente

SecretRefs protege las credenciales de ser persistidas en configuraciones compatibles y
superficies de modelo generadas, pero no son un límite de aislamiento de procesos. Si una
credencial en texto plano permanece en el disco en una ruta que el agente puede leer, el agente puede
eludir la redacción a nivel de API usando herramientas de archivo o shell para inspeccionar ese archivo.

Para despliegues de producción donde los archivos accesibles por el agente están dentro del alcance, trate
la migración de SecretRef como completa solo cuando todo lo siguiente sea cierto:

- las credenciales compatibles usan SecretRefs en lugar de valores en texto plano
- el residuo de texto plano heredado se ha eliminado de `openclaw.json`,
  `auth-profiles.json`, `.env` y los archivos `models.json` generados
- `openclaw secrets audit --check` está limpio después de la migración
- las credenciales restantes no admitidas o rotativas están protegidas por el aislamiento
  del sistema operativo, el aislamiento del contenedor o un proxy de credenciales externo

Por eso el flujo de trabajo de auditoría/configuración/aplicación es una puerta de migración de seguridad, no
solo un asistente de conveniencia.

<Warning>SecretRefs no hace que los archivos legibles arbitrarios sean seguros. Las copias de seguridad, las configuraciones copiadas, los catálogos de modelos generados antiguos y las clases de credenciales no admitidas deben tratarse como secretos de producción hasta que se eliminen, se muevan fuera del límite de confianza del agente o se protejan con una capa de aislamiento separada.</Warning>

## Filtrado de superficie activa

SecretRefs solo se validan en superficies activas efectivas.

- Superficies habilitadas: las referencias sin resolver bloquean el inicio/recarga.
- Superficies inactivas: las referencias sin resolver no bloquean el inicio/recarga.
- Las referencias inactivas emiten diagnósticos no fatales con el código `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

<AccordionGroup>
  <Accordion title="Ejemplos de superficies inactivas">
    - Entradas de canal/cuenta deshabilitadas.
    - Credenciales de canal de nivel superior que ninguna cuenta habilitada hereda.
    - Superficies de herramientas/características deshabilitadas.
    - Claves específicas del proveedor de búsqueda web que no son seleccionadas por `tools.web.search.provider`. En modo automático (proveedor no configurado), se consultan las claves por precedencia para la detección automática del proveedor hasta que una se resuelve. Después de la selección, las claves de proveedor no seleccionadas se tratan como inactivas hasta que sean seleccionadas.
    - El material de autenticación SSH de Sandbox (`agents.defaults.sandbox.ssh.identityData`, `certificateData`, `knownHostsData`, más anulaciones por agente) está activo solo cuando el backend efectivo de Sandbox es `ssh` para el agente predeterminado o un agente habilitado.
    - Los SecretRefs `gateway.remote.token` / `gateway.remote.password` están activos si se cumple una de estas condiciones:
      - `gateway.mode=remote`
      - `gateway.remote.url` está configurado
      - `gateway.tailscale.mode` es `serve` o `funnel`
      - En modo local sin esas superficies remotas:
        - `gateway.remote.token` está activo cuando la autenticación por token puede ganar y no se ha configurado ningún token de entorno/autenticación.
        - `gateway.remote.password` está activo solo cuando la autenticación por contraseña puede ganar y no se ha configurado ninguna contraseña de entorno/autenticación.
    - El SecretRef `gateway.auth.token` está inactivo para la resolución de autenticación al inicio cuando `OPENCLAW_GATEWAY_TOKEN` está establecido, porque la entrada del token de entorno tiene prioridad en ese tiempo de ejecución.

  </Accordion>
</AccordionGroup>

## Diagnósticos de la superficie de autenticación de la puerta de enlace

Cuando se configura un SecretRef en `gateway.auth.token`, `gateway.auth.password`, `gateway.remote.token` o `gateway.remote.password`, el registro de inicio/recarga de la puerta de enlace muestra explícitamente el estado de la superficie:

- `active`: el SecretRef es parte de la superficie de autenticación efectiva y debe resolverse.
- `inactive`: el SecretRef se ignora para este tiempo de ejecución porque otra superficie de autenticación tiene prioridad, o porque la autenticación remota está deshabilitada/inactiva.

Estas entradas se registran con `SECRETS_GATEWAY_AUTH_SURFACE` e incluyen el motivo utilizado por la política de superficie activa, para que pueda ver por qué una credencial se trató como activa o inactiva.

## Verificación previa de referencia de incorporación

Cuando la incorporación se ejecuta en modo interactivo y elige almacenamiento SecretRef, OpenClaw ejecuta una validación previa antes de guardar:

- Referencias de entorno (Env refs): valida el nombre de la variable de entorno y confirma que un valor no vacío sea visible durante la configuración.
- Referencias de proveedor (`file` o `exec`): valida la selección del proveedor, resuelve `id` y verifica el tipo de valor resuelto.
- Ruta de reutilización de inicio rápido: cuando `gateway.auth.token` ya es un SecretRef, la incorporación lo resuelve antes del arranque del sondeador/tablero (para referencias `env`, `file` y `exec`) utilizando la misma puerta de fallo rápido.

Si la validación falla, la incorporación muestra el error y le permite reintentarlo.

## Contrato SecretRef

Use una forma de objeto en todas partes:

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    Los campos SecretInput admitidos también aceptan atajos de cadena exactos:

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
    ```

    Validación:

    - `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
    - `id` debe coincidir con `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    Validación:

    - `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
    - `id` debe ser un puntero JSON absoluto (`/...`)
    - Escapado RFC6901 en segmentos: `~` => `~0`, `/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey#value" }
    ```

    Validación:

    - `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
    - `id` debe coincidir con `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (admite selectores como `secret#json_key`)
    - `id` no debe contener `.` ni `..` como segmentos de ruta delimitados por barras (por ejemplo, `a/../b` se rechaza)

  </Tab>
</Tabs>

## Configuración del proveedor

Defina los proveedores en `secrets.providers`:

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Proveedor Env">
    - Lista de permitidos opcional mediante `allowlist`.
    - Los valores de entorno faltantes o vacíos fallan la resolución.

  </Accordion>
  <Accordion title="Proveedor File">
    - Lee el archivo local desde `path`.
    - `mode: "json"` espera una carga útil de objeto JSON y resuelve `id` como puntero.
    - `mode: "singleValue"` espera el ID de referencia `"value"` y devuelve el contenido del archivo.
    - La ruta debe pasar las comprobaciones de propiedad/permisos.
    - Nota de falla cerrada de Windows: si la verificación de ACL no está disponible para una ruta, la resolución falla. Solo para rutas confiables, establezca `allowInsecurePath: true` en ese proveedor para omitir las comprobaciones de seguridad de ruta.

  </Accordion>
  <Accordion title="Proveedor Exec">
    - Ejecuta la ruta binaria absoluta configurada, sin shell.
    - De manera predeterminada, `command` debe apuntar a un archivo regular (no a un enlace simbólico).
    - Establezca `allowSymlinkCommand: true` para permitir rutas de comandos de enlaces simbólicos (por ejemplo, shims de Homebrew). OpenClaw valida la ruta de destino resuelta.
    - Combine `allowSymlinkCommand` con `trustedDirs` para rutas de administradores de paquetes (por ejemplo, `["/opt/homebrew"]`).
    - Admite tiempo de espera, tiempo de espera sin salida, límites de bytes de salida, lista de permitidos de entorno y directorios de confianza.
    - Nota de fallo cerrado en Windows: si la verificación de ACL no está disponible para la ruta del comando, la resolución falla. Solo para rutas de confianza, establezca `allowInsecurePath: true` en ese proveedor para omitir las comprobaciones de seguridad de la ruta.

    Carga de la solicitud (stdin):

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    Carga de la respuesta (stdout):

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    Errores opcionales por ID:

    ```json
    {
      "protocolVersion": 1,
      "values": {},
      "errors": { "providers/openai/apiKey": { "message": "not found" } }
    }
    ```

  </Accordion>
</AccordionGroup>

## Claves de API respaldadas por archivo

No coloque cadenas `file:...` en el bloque `env` de configuración. El bloque `env` es
literal y no anulable, por lo que `file:...` no se resuelve.

Utilice en su lugar un archivo SecretRef en un campo de credencial compatible:

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

Para `mode: "singleValue"`, el SecretRef `id` es `"value"`. Para
`mode: "json"`, use un puntero JSON absoluto como
`"/providers/xai/apiKey"`.

Consulte [Superficie de credenciales de SecretRef](/es/reference/secretref-credential-surface) para ver
los campos de configuración que aceptan SecretRefs.

## Ejemplos de integración Exec

<AccordionGroup>
  <Accordion title="CLI de 1Password">
    ```json5
    {
      secrets: {
        providers: {
          onepassword_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/op",
            allowSymlinkCommand: true, // required for Homebrew symlinked binaries
            trustedDirs: ["/opt/homebrew"],
            args: ["read", "op://Personal/OpenClaw QA API Key/password"],
            passEnv: ["HOME"],
            jsonOnly: false,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
          },
        },
      },
    }
    ```
  </Accordion>
  <Accordion title="Bitwarden Secrets Manager (`bws`)">
    Utilice un contenedor de resolución (resolver wrapper) cuando desee que los identificadores SecretRef se asignen a claves de elementos de Bitwarden Secrets Manager. El repositorio incluye
    `scripts/secrets/openclaw-bws-resolver.mjs`; instálelo o cópielo en una ruta de confianza absoluta en el host que ejecuta el Gateway.

    Requisitos:

    - Bitwarden Secrets Manager CLI (`bws`) instalado en el host del Gateway.
    - `BWS_ACCESS_TOKEN` disponible para el servicio Gateway.
    - `PATH` pasado al resolutor, o `BWS_BIN` establecido en la ruta `bws`
      absoluta del binario.

    ```json5
    {
      secrets: {
        providers: {
          bws: {
            source: "exec",
            command: "/usr/local/bin/openclaw-bws-resolver.mjs",
            passEnv: ["BWS_ACCESS_TOKEN", "PATH", "BWS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "bws",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    El resolutor agrupa los identificadores solicitados, ejecuta `bws secret list` y devuelve
    los valores para los campos `key` de secretos coincidentes. Utilice claves que cumplan con el contrato de
    identificación SecretRef de ejecución, como `openclaw/providers/openai/apiKey`; las claves
    de estilo de variable de entorno con guiones bajos se rechazan antes de que se ejecute el resolutor. Si hay más
    de un secreto de Bitwarden visible con la misma clave solicitada, el resolutor
    falla ese identificador como ambiguo en lugar de elegir uno. Después de actualizar la configuración,
    verifique la ruta del resolutor:

    ```bash
    openclaw secrets audit --allow-exec
    ```

  </Accordion>
  <Accordion title="CLI de HashiCorp Vault">
    ```json5
    {
      secrets: {
        providers: {
          vault_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/vault",
            allowSymlinkCommand: true, // required for Homebrew symlinked binaries
            trustedDirs: ["/opt/homebrew"],
            args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
            passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
            jsonOnly: false,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: { source: "exec", provider: "vault_openai", id: "value" },
          },
        },
      },
    }
    ```
  </Accordion>
  <Accordion title="password-store (`pass`)">
    Use un pequeño contenedor de resolución cuando desee que los ids de SecretRef se asignen directamente a
    las entradas de `pass`. Guarde esto como un ejecutable en una ruta absoluta que pase
    sus comprobaciones de ruta del proveedor exec, por ejemplo
    `/usr/local/bin/openclaw-pass-resolver`. El shebang `#!/usr/bin/env node`
    resuelve `node` desde el proceso de resolución `PATH`, por lo que incluya `PATH` en
    `passEnv`. Si `pass` no está en ese `PATH`, establezca `PASS_BIN` en el entorno
    principal e inclúyalo también en `passEnv`:

    ```js
    #!/usr/bin/env node
    const { spawnSync } = require("node:child_process");

    let stdin = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      stdin += chunk;
    });
    process.stdin.on("error", (err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
    process.stdin.on("end", () => {
      let request;
      try {
        request = JSON.parse(stdin || "{}");
      } catch (err) {
        process.stderr.write(`Failed to parse request: ${err.message}\n`);
        process.exit(1);
      }

      const passBin = process.env.PASS_BIN || "pass";
      const values = {};
      const errors = {};

      for (const id of request.ids ?? []) {
        const result = spawnSync(passBin, ["show", id], { encoding: "utf8" });
        if (result.status === 0) {
          values[id] = result.stdout.split(/\r?\n/, 1)[0] ?? "";
        } else {
          errors[id] = { message: (result.stderr || `pass exited ${result.status}`).trim() };
        }
      }

      process.stdout.write(JSON.stringify({ protocolVersion: 1, values, errors }));
    });
    ```

    Luego configure el proveedor exec y apunte `apiKey` a la ruta de la entrada de `pass`:

    ```json5
    {
      secrets: {
        providers: {
          pass_store: {
            source: "exec",
            command: "/usr/local/bin/openclaw-pass-resolver",
            passEnv: ["PATH", "HOME", "GNUPGHOME", "GPG_TTY", "PASSWORD_STORE_DIR", "PASS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "pass_store",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    Mantenga el secreto en la primera línea de la entrada de `pass`, o personalice el
    contenedor si desea devolver la salida completa de `pass show` en su lugar. Después
    de actualizar la configuración, verifique tanto la auditoría estática como la ruta de resolución exec:

    ```bash
    openclaw secrets audit --check
    openclaw secrets audit --allow-exec
    ```

  </Accordion>
  <Accordion title="sops">
    ```json5
    {
      secrets: {
        providers: {
          sops_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/sops",
            allowSymlinkCommand: true, // required for Homebrew symlinked binaries
            trustedDirs: ["/opt/homebrew"],
            args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
            passEnv: ["SOPS_AGE_KEY_FILE"],
            jsonOnly: false,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: { source: "exec", provider: "sops_openai", id: "value" },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## Variables de entorno del servidor MCP

Las variables de entorno del servidor MCP configuradas a través de `plugins.entries.acpx.config.mcpServers` admiten SecretInput. Esto mantiene las claves de API y los tokens fuera de la configuración en texto plano:

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

Los valores de cadena de texto plano aún funcionan. Las referencias de plantilla de entorno como `${MCP_SERVER_API_KEY}` y los objetos SecretRef se resuelven durante la activación de la puerta de enlace antes de que se genere el proceso del servidor MCP. Al igual que con otras superficies SecretRef, las referencias sin resolver solo bloquean la activación cuando el complemento `acpx` está efectivamente activo.

## Material de autenticación SSH de Sandbox

El backend de caja de arena `ssh` principal también admite SecretRefs para el material de autenticación SSH:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

Comportamiento en tiempo de ejecución:

- OpenClaw resuelve estas referencias durante la activación del sandbox, no de forma diferida durante cada llamada SSH.
- Los valores resueltos se escriben en archivos temporales con permisos restrictivos y se utilizan en la configuración SSH generada.
- Si el backend de caja de arena efectivo no es `ssh`, estas referencias permanecen inactivas y no bloquean el inicio.

## Superficie de credenciales compatible

Las credenciales canónicas compatibles y no compatibles se enumeran en:

- [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)

<Note>Las credenciales generadas en tiempo de ejecución o rotativas y el material de actualización de OAuth se excluyen intencionadamente de la resolución de SecretRef de solo lectura.</Note>

## Comportamiento y precedencia requeridos

- Campo sin referencia: sin cambios.
- Campo con referencia: requerido en superficies activas durante la activación.
- Si están presentes tanto el texto plano como la referencia, la referencia tiene prioridad en las rutas de precedencia compatibles.
- El centinela de redacción `__OPENCLAW_REDACTED__` está reservado para la redacción/restauración de la configuración interna y se rechaza como datos de configuración enviados literales.

Advertencias y señales de auditoría:

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (advertencia de tiempo de ejecución)
- `REF_SHADOWED` (hallazgo de auditoría cuando las credenciales `auth-profiles.json` tienen prioridad sobre las referencias `openclaw.json`)

Comportamiento de compatibilidad con Google Chat:

- `serviceAccountRef` tiene prioridad sobre el texto sin formato `serviceAccount`.
- El valor en texto plano se ignora cuando se establece la referencia del mismo nivel.

## Activadores de activación

La activación de secretos se ejecuta en:

- Inicio (preflight más activación final)
- Ruta de aplicación en caliente de recarga de configuración
- Ruta de comprobación de reinicio de recarga de configuración
- Recarga manual a través de `secrets.reload`
- Preflight de RPC de escritura de configuración de Gateway (`config.set` / `config.apply` / `config.patch`) para la resolubilidad de SecretRef de superficie activa dentro de la carga útil de configuración enviada antes de persistir las ediciones

Contrato de activación:

- El éxito intercambia la instantánea atómicamente.
- El fallo de inicio aborta el inicio de la puerta de enlace.
- El fallo de recarga en tiempo de ejecución mantiene la última instantánea conocida buena.
- El fallo de preflight de Write-RPC rechaza la configuración enviada y mantiene tanto la configuración del disco como la instantánea de tiempo de ejecución activa sin cambios.
- Proporcionar un token de canal por llamada explícito a una llamada de herramienta/ayuda saliente no activa la activación de SecretRef; los puntos de activación siguen siendo el inicio, la recarga y la `secrets.reload` explícita.

## Señales degradadas y recuperadas

Cuando la activación en el momento de la recarga falla después de un estado saludable, OpenClaw entra en un estado de secretos degradado.

Códigos de eventos y registros del sistema de un solo disparo:

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportamiento:

- Degradado: el tiempo de ejecución mantiene la instantánea del último estado conocido bueno (last-known-good).
- Recuperado: se emite una vez después de la próxima activación exitosa.
- Los fallos repetidos mientras ya se está degradado registran advertencias pero no saturan los eventos.
- El fallo rápido (fail-fast) en el inicio no emite eventos degradados porque el tiempo de ejecución nunca se activó.

## Resolución de ruta de comandos

Las rutas de comandos pueden optar por la resolución de SecretRef compatible mediante RPC de instantánea de gateway.

Existen dos comportamientos generales:

<Tabs>
  <Tab title="Rutas de comandos estrictas">
    Por ejemplo `openclaw memory` rutas de memoria remota y `openclaw qr --remote` cuando necesita referencias de secretos compartidos remotos. Leen de la instantánea activa y fallan rápido cuando un SecretRef requerido no está disponible.
  </Tab>
  <Tab title="Rutas de comandos de solo lectura">
    Por ejemplo `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, y flujos de reparación de configuración/doctor de solo lectura. También prefieren la instantánea activa, pero degradan en lugar de abortar cuando un SecretRef objetivo no está disponible en esa ruta de comando.

    Comportamiento de solo lectura:

    - Cuando el gateway se está ejecutando, estos comandos leen primero de la instantánea activa.
    - Si la resolución del gateway está incompleta o el gateway no está disponible, intentan una alternativa local específica para la superficie de comando específica.
    - Si un SecretRef objetivo aún no está disponible, el comando continúa con una salida de solo lectura degradada y diagnósticos explícitos como "configurado pero no disponible en esta ruta de comando".
    - Este comportamiento degradado es solo local al comando. No debilita el inicio en tiempo de ejecución, la recarga, o las rutas de envío/autenticación.

  </Tab>
</Tabs>

Otras notas:

- La actualización de la instantánea después de la rotación del secreto de backend está gestionada por `openclaw secrets reload`.
- Método RPC de Gateway utilizado por estas rutas de comandos: `secrets.resolve`.

## Flujo de trabajo de auditoría y configuración

Flujo de operador predeterminado:

<Steps>
  <Step title="Auditar estado actual">```bash openclaw secrets audit --check ```</Step>
  <Step title="Configurar y aplicar SecretRefs">```bash openclaw secrets configure --apply ```</Step>
  <Step title="Reauditar">```bash openclaw secrets audit --check ```</Step>
</Steps>

No considere la migración como completa hasta que la reaudición esté limpia. Si la auditoría
aún reporta valores de texto plano en reposo, el riesgo de acceso del agente aún está presente
ejemplo cuando las APIs de tiempo de ejecución devuelven valores redactados.

Si guarda un plan en lugar de aplicarlo durante `configure`, aplique ese plan guardado
con `openclaw secrets apply --from <plan-path>` antes de la reauditoría.

<AccordionGroup>
  <Accordion title="auditoría de secretos">
    Los hallazgos incluyen:

    - valores de texto plano en reposo (`openclaw.json`, `auth-profiles.json`, `.env` y `agents/*/agent/models.json` generados)
    - residuos de encabezados de proveedores sensibles en texto plano en `models.json` generados
    - referencias no resueltas
    - sombreado de precedencia (`auth-profiles.json` tomando prioridad sobre las referencias `openclaw.json`)
    - residuos heredados (`auth.json`, recordatorios de OAuth)

    Nota de Exec:

    - De forma predeterminada, la auditoría omite las comprobaciones de resolución de SecretRef de exec para evitar efectos secundarios de comandos.
    - Use `openclaw secrets audit --allow-exec` para ejecutar proveedores exec durante la auditoría.

    Nota de residuos de encabezado:

    - La detección de encabezados de proveedores sensibles se basa en heurística de nombres (nombres de encabezados comunes de autenticación/credenciales y fragmentos como `authorization`, `x-api-key`, `token`, `secret`, `password` y `credential`).

  </Accordion>
  <Accordion title="secrets configure">
    Asistente interactivo que:

    - configura `secrets.providers` primero (`env`/`file`/`exec`, añadir/editar/eliminar)
    - le permite seleccionar los campos compatibles que portan secretos en `openclaw.json` más `auth-profiles.json` para un ámbito de agente
    - puede crear una nueva asignación `auth-profiles.json` directamente en el selector de destino
    - captura los detalles de SecretRef (`source`, `provider`, `id`)
    - ejecuta la resolución previa al vuelo
    - puede aplicarse inmediatamente

    Nota de Exec:

    - La comprobación previa al vuelo omite las comprobaciones de exec SecretRef a menos que `--allow-exec` esté configurado.
    - Si aplica directamente desde `configure --apply` y el plan incluye referencias/proveedores exec, mantenga `--allow-exec` configurado para el paso de aplicación también.

    Modos útiles:

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` aplicar valores predeterminados:

    - elimina las credenciales estáticas coincidentes de `auth-profiles.json` para los proveedores específicos
    - elimina las entradas estáticas heredadas `api_key` de `auth.json`
    - elimina las líneas de secreto conocidas coincidentes de `<config-dir>/.env`

  </Accordion>
  <Accordion title="secrets apply">
    Aplicar un plan guardado:

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Nota de Exec:

    - dry-run omite las comprobaciones exec a menos que `--allow-exec` esté configurado.
    - el modo de escritura rechaza los planes que contienen exec SecretRefs/proveedores a menos que `--allow-exec` esté configurado.

    Para obtener detalles estrictos del contrato de destino/ruta y las reglas exactas de rechazo, consulte [Secrets Apply Plan Contract](/es/gateway/secrets-plan-contract).

  </Accordion>
</AccordionGroup>

## Política de seguridad unidireccional

<Warning>OpenClaw intencionalmente no escribe copias de seguridad de reversión que contengan valores secretos en texto plano históricos.</Warning>

Modelo de seguridad:

- preflight debe tener éxito antes del modo de escritura
- la activación en tiempo de ejecución se valida antes de la confirmación
- aplica actualizaciones a los archivos mediante reemplazo atómico de archivos y restauración con mejor esfuerzo en caso de fallo

## Notas de compatibilidad de autenticación heredada

Para las credenciales estáticas, el tiempo de ejecución ya no depende del almacenamiento de autenticación heredada en texto sin formato.

- El origen de la credencial en tiempo de ejecución es la instantánea resuelta en memoria.
- Las entradas estáticas heredadas `api_key` se eliminan cuando se descubren.
- El comportamiento de compatibilidad relacionado con OAuth permanece separado.

## Nota sobre la interfaz de usuario web

Algunas uniones de SecretInput son más fáciles de configurar en el modo de editor sin formato que en el modo de formulario.

## Relacionado

- [Authentication](/es/gateway/authentication) — configuración de autenticación
- [CLI: secrets](/es/cli/secrets) — comandos de CLI
- [Environment Variables](/es/help/environment) — precedencia del entorno
- [SecretRef Credential Surface](/es/reference/secretref-credential-surface) — superficie de credenciales
- [Secrets Apply Plan Contract](/es/gateway/secrets-plan-contract) — detalles del contrato del plan
- [Security](/es/gateway/security) — postura de seguridad
