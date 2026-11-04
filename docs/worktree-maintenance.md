# Espacio local de desarrollo

La aplicación publicada no necesita las copias de desarrollo de `.worktrees/`.
Los worktrees comparten Git, pero duplican los archivos curriculares y los builds.

`./scripts/maintenance-worktrees.ps1 -Mode Audit` crea el inventario local
`tmp/disk-cleanup/audit.json`, sin eliminar archivos. Excluye rutas externas al
proyecto, enlaces y el worktree activo de Notariado. Un worktree sólo es retirable
si está limpio, sus commits están integrados o son equivalentes a `main` y no
contiene ignorados distintos de builds y dependencias. PDFs, checkpoints y cambios
locales se conservan.

Con autorización de limpieza, `-Mode Clean` consume ese inventario y vuelve a
comprobar HEAD y estado antes de retirar cada worktree con `git worktree remove`,
sin `--force`. Conserva las ramas y todos sus commits. En los demás worktrees sólo
elimina `dist`, `.next` y `.vinext` previamente comprobados como no versionados.
Esos builds se regeneran con `npm run build`; las copias de código retiradas se
pueden recrear desde la rama que Git conserva.

`-Mode Compress` aplica compresión NTFS transparente a archivos de `data` y `app`
de las copias conservadas. Omite enlaces y el worktree activo; no cambia contenido
ni comprime el sistema operativo. El registro queda en
`tmp/disk-cleanup/compression.log`. Windows descomprime los archivos al leerlos.
La operación se puede repetir: omite archivos ya comprimidos.

Al cerrar futuras tareas, retirar su worktree después de integrar y verificar que
no conserve cambios ni fuentes únicas. No crear un worktree nuevo para cada
checkpoint de una misma tarea. Conservar los datos normalizados en Git y evitar
guardar builds históricos salvo que haya una necesidad concreta de reproducirlos.
