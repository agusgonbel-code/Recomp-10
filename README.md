# Recomp 10M

Plataforma privada de recomposición corporal, entrenamiento, nutrición y progreso compatible con GitHub Pages.

## Novedades
- Interfaz estilo Apple más limpia.
- Dashboard renovado.
- Tarjetas, fondos, animaciones y navegación mejoradas.
- Se mantienen entrenamiento, recetas, macros, progreso y copias de seguridad.
- Compatible con los datos locales de la Beta 0.7.

## Actualización en GitHub
Sustituye en la raíz del repositorio todos estos archivos y haz un commit con el mensaje:

`FitCoach Phase 1 - rediseño completo`

## Nutrición
- Objetivos de calorías y macros validados con Mifflin-St Jeor.
- Menús diarios y semanales ajustados por porciones al objetivo guardado.
- Cálculos y planificación cubiertos por pruebas automáticas.

## Fotografías y progreso
- Fotos comprimidas localmente antes de guardarse en IndexedDB.
- Compatibilidad controlada con JPG, PNG, WebP y HEIC/HEIF.
- Migración conservadora de las fotos antiguas guardadas en localStorage.
- Comparación privada de dos fotografías con liberación de memoria.
- Copias de seguridad versionadas con datos y fotografías, y restauración con rollback.


## Persistencia principal
- Cada colección valida su tipo antes de usarse.
- Se conserva localmente el último estado válido cuando el tamaño lo permite.
- Si una clave principal está dañada, la aplicación recupera su copia compatible.
- Una escritura fallida revierte la clave y mantiene los datos anteriores.


## Coach explicable
- Prioriza adherencia semanal, esfuerzo mediante RIR, proteína según la hora y tendencia de peso cuando existen suficientes registros.
- Cada recomendación muestra el dato que la origina y limita los ajustes a acciones prudentes.
- No diagnostica, no estima composición corporal desde fotografías y no inventa recomendaciones cuando faltan datos.

## Fechas locales en iPhone
- Comidas, entrenamientos, métricas y fotografías conservan el día y la zona horaria local del dispositivo.
- Las copias de seguridad usan el día local en el nombre del archivo.
- Pruebas automáticas cubren Madrid, Los Ángeles y Kiritimati para evitar regresiones cerca de medianoche.

## Copias de seguridad en iPhone
- Las descargas usan el nombre `recomp-10m-backup-AAAA-MM-DD.json`.
- La URL temporal de cada exportación se libera después de descargar para evitar acumular memoria en sesiones largas de Safari.

## Generador de menús de 30 días
- Formulario guiado con calorías, proteína, número de comidas, estilo alimentario, exclusiones, despensa, tiempo, presupuesto y variedad.
- Plan local de 30 días, navegación semanal, sustitución individual y lista de compra agrupada.
- Las exclusiones actúan como filtro preventivo; las alergias graves requieren revisión profesional y del etiquetado.
- Pruebas automáticas cubren duración, restricciones, sustituciones y compra semanal.
- La interfaz está optimizada para navegación táctil y el área segura de iPhone.
