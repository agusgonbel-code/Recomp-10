# Recomp 10M — Rediseño Nutrición + Menús v5

Fecha: 2026-08-22

## Resumen ejecutivo

La auditoría de uso detectó que las pestañas Nutrición y Menús se comportaban como un conjunto de herramientas acumuladas, no como dos flujos de producto coherentes. Nutrición abría con una calculadora de macros aunque la tarea frecuente del usuario es saber qué ha consumido y qué le queda. Menús contenía dos generadores distintos, biblioteca y compra en la misma jerarquía; además el generador de 30 días era reubicado dinámicamente dentro de Nutrición, rompiendo el modelo mental de navegación.

El rediseño v5 separa responsabilidades:

- Nutrición = estado de hoy, diario y objetivos.
- Menús = planificación, recetas y compra.

Se preservan los motores existentes, datos locales y compatibilidad con el diario, pero se sustituye la jerarquía de interfaz.

## Benchmark de producto

Patrones adoptados de productos líderes del ámbito nutricional:

- Dashboard diario primero; configuración después.
- Comparación consumido/restante frente a objetivos.
- Registro y edición de comidas como flujo principal de baja fricción.
- Planificación separada del registro real.
- Recetas revisables antes de registrarlas.
- Recomendaciones basadas en el día completo y en tendencias, evitando respuestas agresivas a una sola comida.

No se copian diseños, textos, marcas ni activos de terceros.

## Problemas encontrados como usuario

1. La primera pantalla de Nutrición era una calculadora, una tarea ocasional presentada como tarea principal.
2. Nutrición mezclaba calculadora, diario y acceso al generador de 30 días.
3. Menús tenía un generador de 30 días y, además, generadores rápidos diario/semanal, creando dos fuentes de verdad.
4. El generador de 30 días se movía automáticamente desde Menús a Nutrición.
5. La biblioteca de recetas tenía el mismo peso visual que el menú activo.
6. Era difícil responder de un vistazo a: kcal consumidas, proteína consumida y cuánto queda.
7. El reparto energético entre las comidas del plan no se visualizaba claramente.
8. En móvil había demasiados bloques largos antes de llegar a la acción principal.

## Nueva arquitectura UX

### Nutrición

#### Hoy
- Hero con estado diario.
- kcal, proteína, carbohidratos y grasas consumidos/objetivo.
- barras de progreso.
- restante aproximado.
- estado contextual: día en curso, proteína retrasada, día bien encaminado o exceso energético.
- resumen de comidas registradas.
- tira con el plan de comidas previsto desde Menús.

#### Diario
- selector de fecha existente.
- alta, edición y eliminación de comidas mediante el motor existente.
- registro real separado del menú planificado.

#### Objetivos
- cálculo de macros desplazado a una tarea secundaria.
- objetivos compartidos con el generador de menú.

### Menús

- Un único estudio de planificación.
- Si no existe plan: mensaje y generador principal.
- Si existe plan: número de días, comidas/día y kcal promedio visibles antes del detalle.
- reparto real de kcal del primer día mostrado por comida.
- generadores rápidos legacy ocultos para evitar fuentes de verdad paralelas.
- biblioteca de recetas mantenida como herramienta opcional.
- recetas, sustituciones, registro y lista de compra continúan usando el motor avanzado existente.

## Lógica de seguridad nutricional

La interfaz no etiqueta una comida aislada como éxito o fracaso. El estado diario considera energía y proteína acumuladas. Cuando el usuario supera el objetivo energético se evita recomendar compensación extrema. Las recomendaciones son informativas y no sustituyen consejo médico.

## Integración técnica

Archivos nuevos:

- `nutrition-menu-experience-v5.js`
- `nutrition-menu-runtime-v5.js`
- `tests/nutrition-menu-experience-v5.test.mjs`
- `qa/nutrition-menu-v5.spec.js`

Archivos actualizados:

- `date-engine.js`
- `scripts/build-mobile.mjs`
- `sw.js`
- `.github/workflows/browser-smoke.yml`

La experiencia v5 se carga después de los motores Recomp v2/v3/v4. El build nativo empaqueta explícitamente todos los recursos nuevos y la PWA los incluye en la caché versionada.

## QA

### Unitario
- totales diarios por fecha.
- cálculo de restante.
- clasificación del estado diario.
- reparto porcentual de kcal del menú.

### Navegador como usuario

Recorrido Nutrición:
1. abrir app con perfil existente;
2. entrar en Nutrición;
3. verificar dashboard diario;
4. comprobar comida ya registrada;
5. abrir Objetivos;
6. abrir Diario;
7. verificar ausencia de errores JS.

Recorrido Menús:
1. entrar en Menús;
2. comprobar un único estudio de planificación;
3. confirmar que el generador rápido legacy está oculto;
4. generar 7 días;
5. comprobar aparición de días y resumen;
6. confirmar que `mealPlanner30` pertenece a la pestaña Menús;
7. verificar ausencia de errores JS.

## Gate de publicación

No fusionar hasta obtener verde en:

- Recomp 10 CI
- Recomp Browser Smoke
- Recomp 10 iOS Native CI

Después de fusionar, GitHub Pages debe desplegar `main` y se realizará una comprobación web final.
