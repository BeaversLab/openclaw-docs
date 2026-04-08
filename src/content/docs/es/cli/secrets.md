---
summary: "Referencia de CLI para `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secretos"
---

# `openclaw secrets`

Use `openclaw secrets` para administrar SecretRefs y mantener la instantánea de runtime activa sana.

Roles de comando:

- `reload`: RPC de gateway (`secrets.reload`) que resuelve nuevamente las referencias e intercambia la instantánea de runtime solo si tiene éxito total (no escribe configuración).
- `audit`: escaneo de solo lectura de los almacenes de configuración/autenticación/modelo-generado y residuos heredados para texto sin formato, referencias sin resolver y deriva de precedencia (las referencias de ejecución se omiten a menos que se establezca `--allow-exec`).
- `configure`: planificador interactivo para la configuración del proveedor, mapeo de destino y verificación previa (se requiere TTY).
- `apply`: ejecuta un plan guardado (`--dry-run` para validación únicamente; la ejecución en seco omite las verificaciones de ejecución de forma predeterminada, y el modo de escritura rechaza los planes que contienen ejecuciones a menos que se establezca `--allow-exec`), y luego depura los residuos de texto sin formato objetivo.

Bucle de operador recomendado:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Si su plan incluye `exec` SecretRefs/proveedores, pase `--allow-exec` en los comandos de aplicación de ejecución en seco y de escritura.

Nota del código de salida para CI/compuertas:

- `audit --check` devuelve `1` en los hallazgos.
- las referencias no resueltas devuelven `2`.

Relacionado:

- Guía de secretos: [Gestión de secretos](/en/gateway/secrets)
- Superficie de credenciales: [Superficie de credenciales SecretRef](/en/reference/secretref-credential-surface)
- Guía de seguridad: [Seguridad](/en/gateway/security)

## Recargar instantánea de tiempo de ejecución

Resolver referencias de secretos nuevamente e intercambiar la instantánea de tiempo de ejecución de forma atómica.

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

Notas:

- Usa el método RPC de puerta de enlace `secrets.reload`.
- Si la resolución falla, la puerta de enlace mantiene la última instantánea conocida como buena y devuelve un error (sin activación parcial).
- La respuesta JSON incluye `warningCount`.

Opciones:

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--json`

## Auditoría

Escanear el estado de OpenClaw en busca de:

- almacenamiento de secretos en texto plano
- referencias sin resolver
- deriva de precedencia (credenciales `auth-profiles.json` ensombreciendo referencias `openclaw.json`)
- residuos `agents/*/agent/models.json` generados (valores `apiKey` del proveedor y encabezados sensibles del proveedor)
- residuos heredados (entradas de almacén de autenticación heredadas, recordatorios de OAuth)

Nota sobre residuos de encabezados:

- La detección de encabezados sensibles del proveedor se basa en heurística de nombres (nombres y fragmentos comunes de encabezados de autenticación/credenciales, como `authorization`, `x-api-key`, `token`, `secret`, `password` y `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

Comportamiento de salida:

- `--check` sale con código distinto de cero si hay hallazgos.
- las referencias sin resolver salen con un código distinto de cero de mayor prioridad.

Aspectos destacados del informe:

- `status`: `clean | findings | unresolved`
- `resolution`: `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- códigos de hallazgo:
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurar (asistente interactivo)

Construya cambios de proveedor y SecretRef de forma interactiva, ejecute verificaciones previas y opcionalmente aplique:

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

Flujo:

- Configuración del proveedor primero (`add/edit/remove` para alias `secrets.providers`).
- Asignación de credenciales en segundo lugar (seleccione campos y asigne referencias `{source, provider, id}`).
- Verificación previa y aplicación opcional al final.

Opciones:

- `--providers-only`: configure `secrets.providers` only, skip credential mapping.
- `--skip-provider-setup`: skip provider setup and map credentials to existing providers.
- `--agent <id>`: scope `auth-profiles.json` target discovery and writes to one agent store.
- `--allow-exec`: allow exec SecretRef checks during preflight/apply (may execute provider commands).

Notas:

- Requiere un TTY interactivo.
- No puede combinar `--providers-only` con `--skip-provider-setup`.
- `configure` targets secret-bearing fields in `openclaw.json` plus `auth-profiles.json` for the selected agent scope.
- `configure` supports creating new `auth-profiles.json` mappings directly in the picker flow.
- Superficie compatible canónica: [SecretRef Credential Surface](/en/reference/secretref-credential-surface).
- Realiza la resolución previa al vuelo antes de aplicar.
- Si preflight/apply incluye exec refs, mantenga `--allow-exec` configurado para ambos pasos.
- Los planes generados por defecto a las opciones de scrub (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` todas habilitadas).
- La ruta de aplicación es unidireccional para los valores de texto plano limpiados.
- Sin `--apply`, la CLI todavía solicita `Apply this plan now?` después de preflight.
- Con `--apply` (y sin `--yes`), la CLI solicita una confirmación irreversible adicional.
- `--json` imprime el plan + informe previo al vuelo, pero el comando todavía requiere un TTY interactivo.

Nota de seguridad del proveedor Exec:

- Las instalaciones de Homebrew a menudo exponen binarios enlazados simbólicamente bajo `/opt/homebrew/bin/*`.
- Configure `allowSymlinkCommand: true` solo cuando sea necesario para las rutas de administrador de paquetes confiables y emparéjelo con `trustedDirs` (por ejemplo, `["/opt/homebrew"]`).
- En Windows, si la verificación de ACL no está disponible para una ruta de proveedor, OpenClaw falla de forma cerrada. Solo para rutas confiables, configure `allowInsecurePath: true` en ese proveedor para omitir las comprobaciones de seguridad de ruta.

## Aplicar un plan guardado

Aplicar o realizar un chequeo previo de un plan generado previamente:

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Comportamiento de exec:

- `--dry-run` valida el chequeo previo sin escribir archivos.
- las comprobaciones exec de SecretRef se omiten por defecto en la ejecución en seco (dry-run).
- el modo de escritura rechaza los planes que contienen SecretRefs/proveedores exec a menos que se establezca `--allow-exec`.
- Use `--allow-exec` para aceptar explícitamente las comprobaciones/ejecución del proveedor exec en cualquiera de los dos modos.

Detalles del contrato del plan (rutas de destino permitidas, reglas de validación y semántica de fallos):

- [Contrato del plan de aplicación de Secrets](/en/gateway/secrets-plan-contract)

Qué puede actualizar `apply`:

- `openclaw.json` (objetivos SecretRef + inserciones/eliminaciones de proveedores)
- `auth-profiles.json` (limpieza de objetivos de proveedores)
- residuos `auth.json` heredados
- `~/.openclaw/.env` claves secretas conocidas cuyos valores fueron migrados

## Por qué no hay copias de seguridad de reversión

`secrets apply` intencionalmente no escribe copias de seguridad de reversión que contengan valores de texto plano antiguos.

La seguridad proviene de un chequeo previo estricto + una aplicación casi atómica con restauración en memoria de mejor esfuerzo en caso de fallo.

## Ejemplo

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` todavía reporta hallazgos de texto plano, actualice las rutas de destino reportadas restantes y vuelva a ejecutar la auditoría.
