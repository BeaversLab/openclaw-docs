---
summary: "Cómo OpenClaw actualiza el complemento de Matrix anterior in situ, incluidos los límites de recuperación del estado cifrado y los pasos de recuperación manual."
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Migración de Matrix"
---

Esta página cubre las actualizaciones del complemento público `matrix` anterior a la implementación actual.

Para la mayoría de los usuarios, la actualización se realiza in situ:

- el complemento se mantiene `@openclaw/matrix`
- el canal se mantiene `matrix`
- su configuración se mantiene en `channels.matrix`
- las credenciales en caché se mantienen en `~/.openclaw/credentials/matrix/`
- el estado de ejecución se mantiene en `~/.openclaw/matrix/`

No necesita cambiar el nombre de las claves de configuración ni reinstalar el complemento con un nuevo nombre.

## Lo que hace la migración automáticamente

Cuando se inicia la puerta de enlace y cuando ejecuta [`openclaw doctor --fix`](/es/gateway/doctor), OpenClaw intenta reparar automáticamente el estado antiguo de Matrix.
Antes de que cualquier paso de migración de Matrix accionable mute el estado en disco, OpenClaw crea o reutiliza una instantánea de recuperación enfocada.

Cuando usa `openclaw update`, el disparador exacto depende de cómo esté instalado OpenClaw:

- las instalaciones desde el código fuente ejecutan `openclaw doctor --fix` durante el flujo de actualización y luego reinician la puerta de enlace de manera predeterminada
- las instalaciones mediante gestor de paquetes actualizan el paquete, ejecutan un pase de doctor no interactivo y luego se basan en el reinicio predeterminado de la puerta de enlace para que el inicio pueda finalizar la migración de Matrix
- si usa `openclaw update --no-restart`, la migración de Matrix respaldada por el inicio se difiere hasta que posteriormente ejecute `openclaw doctor --fix` y reinicie la puerta de enlace

La migración automática cubre:

- crear o reutilizar una instantánea previa a la migración bajo `~/Backups/openclaw-migrations/`
- reutilizar sus credenciales de Matrix en caché
- mantener la misma selección de cuenta y la configuración `channels.matrix`
- mover el almacén de sincronización plano más antiguo de Matrix a la ubicación actual con ámbito de cuenta
- mover el almacén criptográfico plano más antiguo de Matrix a la ubicación actual con ámbito de cuenta cuando la cuenta de destino se puede resolver de forma segura
- extraer una clave de desencriptación de copia de seguridad de claves de sala de Matrix guardada previamente del antiguo almacén criptográfico de rust, cuando esa clave existe localmente
- reutilizar la raíz de almacenamiento de hash de token existente más completa para la misma cuenta de Matrix, servidor de inicio y usuario cuando el token de acceso cambie más tarde
- escanear las raíces de almacenamiento de hash de token hermanas en busca de metadatos de restauración de estado cifrado pendientes cuando el token de acceso de Matrix haya cambiado pero la identidad de la cuenta/dispositivo siga siendo la misma
- restaurar las claves de sala respaldadas en el nuevo almacén criptográfico en el próximo inicio de Matrix

Detalles de la instantánea:

- OpenClaw escribe un archivo de marcador en `~/.openclaw/matrix/migration-snapshot.json` después de una instantánea exitosa para que los siguientes inicios y pasadas de reparación puedan reutilizar el mismo archivo.
- Estas instantáneas automáticas de migración de Matrix solo respaldan la configuración y el estado (`includeWorkspace: false`).
- Si Matrix solo tiene un estado de migración de solo advertencia, por ejemplo porque `userId` o `accessToken` aún faltan, OpenClaw aún no crea la instantánea porque ninguna mutación de Matrix es ejecutable.
- Si el paso de la instantánea falla, OpenClaw omite la migración de Matrix para esa ejecución en lugar de mutar el estado sin un punto de recuperación.

Acerca de las actualizaciones multicuenta:

- el almacén plano de Matrix más antiguo (`~/.openclaw/matrix/bot-storage.json` y `~/.openclaw/matrix/crypto/`) provenía de un diseño de almacén único, por lo que OpenClaw solo puede migrarlo a un objetivo de cuenta de Matrix resuelto
- los almacenes heredados de Matrix con ámbito de cuenta ya se detectan y preparan por cada cuenta de Matrix configurada

## Lo que la migración no puede hacer automáticamente

El complemento público anterior de Matrix **no** creaba automáticamente copias de seguridad de las claves de sala de Matrix. Persistía el estado criptográfico local y solicitaba la verificación del dispositivo, pero no garantizaba que sus claves de sala estuvieran respaldadas en el servidor de inicio.

Eso significa que algunas instalaciones cifradas solo se pueden migrar parcialmente.

OpenClaw no puede recuperar automáticamente:

- claves de sala solo locales que nunca se respaldaron
- estado cifrado cuando la cuenta de Matrix de destino aún no se puede resolver porque `homeserver`, `userId` o `accessToken` aún no están disponibles
- migración automática de un almacén plano compartido de Matrix cuando se configuran varias cuentas de Matrix pero `channels.matrix.defaultAccount` no está configurado
- instalaciones de ruta de complemento personalizado que están fijadas a una ruta de repositorio en lugar del paquete estándar de Matrix
- una clave de recuperación faltante cuando el antiguo almacén tenía claves respaldadas pero no conservaba la clave de descifrado localmente

Ámbito actual de advertencia:

- las instalaciones personalizadas de la ruta del complemento de Matrix se muestran tanto al iniciar la puerta de enlace como en `openclaw doctor`

Si su instalación anterior tenía un historial cifrado solo local que nunca se respaldó, es posible que algunos mensajes cifrados antiguos sigan siendo ilegibles después de la actualización.

## Flujo de actualización recomendado

1. Actualice OpenClaw y el complemento de Matrix normalmente.
   Prefiera `openclaw update` simple sin `--no-restart` para que el inicio pueda finalizar la migración de Matrix inmediatamente.
2. Ejecute:

   ```bash
   openclaw doctor --fix
   ```

   Si Matrix tiene trabajo de migración procesable, el doctor primero creará o reutilizará la instantánea previa a la migración e imprimirá la ruta del archivo.

3. Inicie o reinicie la puerta de enlace.
4. Verifique el estado actual de verificación y copia de seguridad:

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. Coloque la clave de recuperación de la cuenta de Matrix que está reparando en una variable de entorno específica de la cuenta. Para una sola cuenta predeterminada, `MATRIX_RECOVERY_KEY` es suficiente. Para varias cuentas, use una variable por cuenta, por ejemplo `MATRIX_RECOVERY_KEY_ASSISTANT`, y agregue `--account assistant` al comando.

6. Si OpenClaw le indica que se necesita una clave de recuperación, ejecute el comando para la cuenta correspondiente:

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify backup restore --recovery-key-stdin --account assistant
   ```

7. Si este dispositivo aún no está verificado, ejecute el comando para la cuenta correspondiente:

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify device --recovery-key-stdin --account assistant
   ```

   Si se acepta la clave de recuperación y la copia de seguridad es utilizable, pero `Cross-signing verified`
   sigue siendo `no`, complete la autoverificación desde otro cliente de Matrix:

   ```bash
   openclaw matrix verify self
   ```

   Acepte la solicitud en otro cliente de Matrix, compare los emojis o los decimales,
   y escriba `yes` solo cuando coincidan. El comando finaliza con éxito solo
   después de que `Cross-signing verified` se convierta en `yes`.

8. Si está abandonando intencionalmente el historial antiguo irrecuperable y desea una línea base de copia de seguridad nueva para mensajes futuros, ejecute:

   ```bash
   openclaw matrix verify backup reset --yes
   ```

9. Si aún no existe una copia de seguridad de clave en el servidor, cree una para recuperaciones futuras:

   ```bash
   openclaw matrix verify bootstrap
   ```

## Cómo funciona la migración cifrada

La migración cifrada es un proceso de dos etapas:

1. El inicio o `openclaw doctor --fix` crea o reutiliza la instantánea previa a la migración si la migración cifrada es procesable.
2. El inicio o `openclaw doctor --fix` inspecciona el antiguo almacén criptográfico de Matrix a través de la instalación activa del complemento de Matrix.
3. Si se encuentra una clave de descifrado de copia de seguridad, OpenClaw la escribe en el nuevo flujo de clave de recuperación y marca la restauración de claves de sala como pendiente.
4. En el próximo inicio de Matrix, OpenClaw restaura las claves de sala respaldadas en el nuevo almacén criptográfico automáticamente.

Si el almacén antiguo reporta claves de sala que nunca fueron respaldadas, OpenClaw advierte en lugar de pretender que la recuperación tuvo éxito.

## Mensajes comunes y lo que significan

### Mensajes de actualización y detección

`Matrix plugin upgraded in place.`

- Significado: se detectó el estado antiguo de Matrix en disco y se migró a la estructura actual.
- Qué hacer: nada a menos que la misma salida también incluya advertencias.

`Matrix migration snapshot created before applying Matrix upgrades.`

- Significado: OpenClaw creó un archivo de recuperación antes de modificar el estado de Matrix.
- Qué hacer: conserve la ruta del archivo impreso hasta que confirme que la migración tuvo éxito.

`Matrix migration snapshot reused before applying Matrix upgrades.`

- Significado: OpenClaw encontró un marcador de instantánea de migración de Matrix existente y reutilizó ese archivo en lugar de crear una copia de seguridad duplicada.
- Qué hacer: conserve la ruta del archivo impreso hasta que confirme que la migración tuvo éxito.

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- Significado: existe un estado antiguo de Matrix, pero OpenClaw no puede asignarlo a una cuenta actual de Matrix porque Matrix no está configurado.
- Qué hacer: configure `channels.matrix`, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Significado: OpenClaw encontró un estado antiguo, pero aún no puede determinar la raíz exacta de la cuenta/dispositivo actual.
- Qué hacer: inicie la puerta de enlace una vez con un inicio de sesión de Matrix funcional, o vuelva a ejecutar `openclaw doctor --fix` después de que existan las credenciales en caché.

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Significado: OpenClaw encontró un almacén plano compartido de Matrix, pero se niega a adivinar qué cuenta con nombre de Matrix debería recibirlo.
- Qué hacer: establezca `channels.matrix.defaultAccount` en la cuenta deseada, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Matrix legacy sync store not migrated because the target already exists (...)`

- Significado: la nueva ubicación con ámbito de cuenta ya tiene un almacén de sincronización o criptográfico, por lo que OpenClaw no lo sobrescribió automáticamente.
- Qué hacer: verifique que la cuenta actual sea la correcta antes de eliminar o mover manualmente el destino conflictivo.

`Failed migrating Matrix legacy sync store (...)` o `Failed migrating Matrix legacy crypto store (...)`

- Significado: OpenClaw intentó mover el antiguo estado de Matrix, pero falló la operación del sistema de archivos.
- Qué hacer: inspeccione los permisos del sistema de archivos y el estado del disco, luego vuelva a ejecutar `openclaw doctor --fix`.

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- Significado: OpenClaw encontró un antiguo almacén cifrado de Matrix, pero no hay una configuración actual de Matrix a la cual adjuntarlo.
- Qué hacer: configure `channels.matrix`, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Significado: el almacén cifrado existe, pero OpenClaw no puede decidir de forma segura a qué cuenta/dispositivo actual pertenece.
- Qué hacer: inicie la puerta de enlace una vez con un inicio de sesión de Matrix que funcione, o vuelva a ejecutar `openclaw doctor --fix` una vez que las credenciales en caché estén disponibles.

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Significado: OpenClaw encontró un antiguo almacén criptográfico plano y compartido, pero se niega a adivinar qué cuenta de Matrix con nombre debería recibirlo.
- Qué hacer: establezca `channels.matrix.defaultAccount` en la cuenta prevista, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- Significado: OpenClaw detectó un antiguo estado de Matrix, pero la migración todavía está bloqueada por falta de datos de identidad o credenciales.
- Qué hacer: termine el inicio de sesión o la configuración de Matrix, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- Significado: OpenClaw encontró un antiguo estado cifrado de Matrix, pero no pudo cargar el punto de entrada auxiliar desde el complemento de Matrix que normalmente inspecciona ese almacén.
- Qué hacer: reinstale o repare el complemento de Matrix (`openclaw plugins install @openclaw/matrix`, o `openclaw plugins install ./path/to/local/matrix-plugin` para una copia del repositorio), luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- Significado: OpenClaw encontró una ruta de archivo auxiliar que escapa de la raíz del complemento o falla las comprobaciones de límites del complemento, por lo que se negó a importarlo.
- Qué hacer: reinstale el complemento de Matrix desde una ruta de confianza, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- Significado: OpenClaw se negó a mutar el estado de Matrix porque no pudo crear primero la instantánea de recuperación.
- Qué hacer: resuelva el error de copia de seguridad, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Failed migrating legacy Matrix client storage: ...`

- Significado: el respaldo del lado del cliente de Matrix encontró un almacenamiento plano antiguo, pero el movimiento falló. OpenClaw ahora aborta ese respaldo en lugar de iniciar silenciosamente con un nuevo almacén.
- Qué hacer: inspeccione los permisos o conflictos del sistema de archivos, mantenga el estado antiguo intacto y vuelva a intentar después de corregir el error.

`Matrix is installed from a custom path: ...`

- Significado: Matrix está fijado a una instalación de ruta, por lo que las actualizaciones de la línea principal no lo reemplazan automáticamente con el paquete estándar de Matrix del repositorio.
- Qué hacer: reinstale con `openclaw plugins install @openclaw/matrix` cuando desee volver al complemento predeterminado de Matrix.

### Mensajes de recuperación del estado cifrado

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- Significado: las claves de sala respaldadas se restauraron correctamente en el nuevo almacén criptográfico.
- Qué hacer: generalmente nada.

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- Significado: algunas claves de sala antiguas existían solo en el almacén local antiguo y nunca se habían cargado en la copia de seguridad de Matrix.
- Qué hacer: espere que parte del historial cifrado antiguo no esté disponible a menos que pueda recuperar esas claves manualmente desde otro cliente verificado.

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key-stdin" after upgrade if they have the recovery key.`

- Significado: existe una copia de seguridad, pero OpenClaw no pudo recuperar la clave de recuperación automáticamente.
- Qué hacer: ejecute `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`.

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- Significado: OpenClaw encontró el almacén cifrado antiguo, pero no pudo inspeccionarlo con la suficiente seguridad para preparar la recuperación.
- Qué hacer: vuelva a ejecutar `openclaw doctor --fix`. Si se repite, mantenga el directorio de estado antiguo intacto y recupere usando otro cliente verificado de Matrix más `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`.

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- Significado: OpenClaw detectó un conflicto de clave de copia de seguridad y se negó a sobrescribir el archivo de clave de recuperación actual automáticamente.
- Qué hacer: verifique qué clave de recuperación es correcta antes de volver a intentar cualquier comando de restauración.

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- Significado: este es el límite estricto del formato de almacenamiento antiguo.
- Qué hacer: las claves respaldadas aún se pueden restaurar, pero el historial cifrado solo local puede no estar disponible.

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- Significado: el nuevo complemento intentó la restauración pero Matrix devolvió un error.
- Qué hacer: ejecuta `openclaw matrix verify backup status`, luego reintenta con `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` si es necesario.

### Mensajes de recuperación manual

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- Significado: OpenClaw sabe que deberías tener una clave de respaldo, pero no está activa en este dispositivo.
- Qué hacer: ejecuta `openclaw matrix verify backup restore`, o establece `MATRIX_RECOVERY_KEY` y ejecuta `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` si es necesario.

`Store a recovery key with 'openclaw matrix verify device --recovery-key-stdin', then run 'openclaw matrix verify backup restore'.`

- Significado: este dispositivo actualmente no tiene la clave de recuperación almacenada.
- Qué hacer: establece `MATRIX_RECOVERY_KEY`, ejecuta `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`, luego restaura el respaldo.

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin' with the matching recovery key.`

- Significado: la clave almacenada no coincide con el respaldo de Matrix activo.
- Qué hacer: establece `MATRIX_RECOVERY_KEY` a la clave correcta y ejecuta `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

Si aceptas perder el historial encriptado antiguo irrecuperable, en su lugar puedes restablecer la
línea base del respaldo actual con `openclaw matrix verify backup reset --yes`. Cuando el
secreto de respaldo almacenado está dañado, ese restablecimiento también puede recrear el almacenamiento de secretos para que la
nueva clave de respaldo pueda cargarse correctamente después del reinicio.

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin'.`

- Significado: el respaldo existe, pero este dispositivo aún no confía lo suficiente en la cadena de firma cruzada.
- Qué hacer: establece `MATRIX_RECOVERY_KEY` y ejecuta `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

`Matrix recovery key is required`

- Significado: intentaste un paso de recuperación sin proporcionar una clave de recuperación cuando era necesaria.
- Qué hacer: vuelve a ejecutar el comando con `--recovery-key-stdin`, por ejemplo `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

`Invalid Matrix recovery key: ...`

- Significado: la clave proporcionada no pudo ser analizada o no coincidía con el formato esperado.
- Qué hacer: reintenta con la clave de recuperación exacta de tu cliente de Matrix o archivo de clave de recuperación.

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- Significado: OpenClaw pudo aplicar la clave de recuperación, pero Matrix aún no ha
  establecido la confianza completa de identidad de firma cruzada para este dispositivo. Verifica la
  salida del comando para `Recovery key accepted`, `Backup usable`,
  `Cross-signing verified` y `Device verified by owner`.
- Qué hacer: ejecute `openclaw matrix verify self`, acepte la solicitud en otro cliente de Matrix, compare el SAS y escriba `yes` solo cuando coincida. El comando espera la confianza completa de la identidad de Matrix antes de informar éxito. Use `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify bootstrap --recovery-key-stdin --force-reset-cross-signing` solo cuando intencionalmente desee reemplazar la identidad de cross-signing actual.

`Matrix key backup is not active on this device after loading from secret storage.`

- Significado: el almacenamiento de secretos no produjo una sesión de respaldo activa en este dispositivo.
- Qué hacer: verifique el dispositivo primero, luego vuelva a comprobar con `openclaw matrix verify backup status`.

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device --recovery-key-stdin' first.`

- Significado: este dispositivo no puede restaurar desde el almacenamiento de secretos hasta que se complete la verificación del dispositivo.
- Qué hacer: ejecute `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin` primero.

### Mensajes de instalación de complemento personalizado

`Matrix is installed from a custom path that no longer exists: ...`

- Significado: el registro de instalación de su complemento apunta a una ruta local que ya no existe.
- Qué hacer: reinstale con `openclaw plugins install @openclaw/matrix`, o si está ejecutando desde un repositorio, `openclaw plugins install ./path/to/local/matrix-plugin`.

## Si el historial cifrado aún no vuelve

Ejecute estas comprobaciones en orden:

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

Si el respaldo se restaura correctamente pero a algunas salas antiguas les falta el historial, probablemente esas claves faltantes nunca fueron respaldadas por el complemento anterior.

## Si desea empezar de cero para mensajes futuros

Si acepta perder el historial cifrado antiguo irrecuperable y solo desea una línea base de respaldo limpia en el futuro, ejecute estos comandos en orden:

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Si el dispositivo aún no está verificado después de eso, complete la verificación desde su cliente de Matrix comparando los emoji o códigos decimales del SAS y confirmando que coinciden.

## Páginas relacionadas

- [Matrix](/es/channels/matrix)
- [Doctor](/es/gateway/doctor)
- [Migrating](/es/install/migrating)
- [Plugins](/es/tools/plugin)
