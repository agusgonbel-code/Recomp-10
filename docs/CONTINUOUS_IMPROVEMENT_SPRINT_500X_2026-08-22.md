# Recomp 10M — Continuous Improvement Sprint 500X

Fecha: 2026-08-22

## Objetivo de producto
Especializar Recomp 10M como sistema de recomposición corporal guiada, no como clon de FitCoach.

## Benchmark funcional
Se adopta el patrón de las mejores apps de coaching nutricional: decisiones semanales basadas en tendencia y adherencia, evitando reaccionar a fluctuaciones diarias. Recomp añade señales de cintura, rendimiento y contexto visual estandarizado para una lectura específicamente orientada a recomposición.

## Arquitectura incorporada
- `recomp-profile-v2.js`: perfil único.
- `recomp-review-v3.js`: motor multiseñal de recomposición.
- `recomp-trend-v3.js`: tendencia de peso, cintura y rendimiento.
- `recomp-checkin-v4.js`: check-in 360° con peso, cintura, adherencia de dieta/entreno, rendimiento, sueño, hambre, estrés y presencia de fotos estandarizadas.
- Historial auditable de aceptar/rechazar/mantener recomendaciones.
- Bundle móvil actualizado para incluir los motores dinámicos v2/v3/v4.

## Principios de decisión
- No modificar kcal por una medición aislada.
- No modificar kcal con adherencia insuficiente.
- Peso estable + cintura descendente + rendimiento conservado se interpreta como señal compatible con recomposición favorable.
- Pérdida demasiado rápida + caída de rendimiento puede justificar un aumento conservador de energía.
- Estancamiento sostenido con alta adherencia puede justificar una reducción pequeña.
- Las fotos estandarizadas aportan contexto longitudinal, no se usan como estimación clínica automática de porcentaje graso.

## Recorrido probado como usuario
1. Completar perfil único.
2. Generar nutrición y entrenamiento coordinados.
3. Registrar check-in 360°.
4. Obtener explicación de estado y nivel de confianza.
5. Aceptar/mantener/rechazar el ajuste.
6. Persistir la decisión para revisión futura.

## Fallos encontrados y corregidos
- El nuevo check-in podía cargarse antes que `recomp-review-v3.js`; se corrigió el orden de carga en `date-engine.js`.
- El build móvil original no copiaba los módulos de perfil/tendencia/revisión; corregido en `scripts/build-mobile.mjs`.
- Se añadió Browser Smoke específico para comprobar que el check-in 360° realmente aparece, guarda datos y no genera errores de página.

## Gates de calidad
- Tests del perfil unificado.
- Tests del motor de revisión.
- Tests de tendencia.
- Tests del check-in v4 y log de decisiones.
- Browser Smoke de onboarding y check-in 360°.
- CI general e iOS Native CI.

## Riesgos pendientes antes de App Store
- Prueba física con diferentes tamaños de iPhone.
- Firma de Apple y Archive final.
- Si se habilita sincronización remota de fotos, requerirá backend seguro, consentimiento y política de retención explícita. En esta fase las fotos se tratan como contexto local.

## Resultado del sprint
Recomp 10M evoluciona a un ciclo de recomposición 360°: perfil → plan → ejecución → tendencias → check-in multiseñal → explicación → ajuste conservador → nueva medición.
