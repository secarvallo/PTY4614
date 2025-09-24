### LungLife - Early Cancer Detection & Predictive Analytics.
#### Descripción General


El cáncer es una enfermedad grave que puede invadir los órganos vitales y en muchas ocasiones ser mortal, según las estadísticas, es la segunda causa de muerte en Chile y a nivel mundial, sin embargo, un diagnóstico temprano mejora considerablemente la expectativa de vida de las personas afectadas por esta enfermedad. El machine learning es de gran utilidad en el diagnóstico precoz del cáncer, los sistemas que lo incorporan pueden «aprender» sobre esta enfermedad y detectar una dolencia con la misma exactitud que un médico y comenzar a tratar los síntomas de la enfermedad cuando antes, incluso antes de que llegue a manifestarse.

El objetivo de este proyecto es desarrollar un sistema que prediga el cáncer en pacientes por medios de machine learning con metodologías CRISP-DM junto a un app mobile en base de ionic, que permita predecir si un paciente o varios pacientes pueden tener cáncer,identificar los factores de riesgos de estos pacientes, responder 5 preguntas de negocio y mostrar resultados predictivos utilizando Power BI, considerando la funcionalidad, usabilidad y confiabilidad del sistema, teniendo como usuarios finales personal de salud y usuario paciente.

La justificación de este proyecto radica en la urgente necesidad de desarrollar herramientas tecnológicas que apoyen la detección precoz del cáncer, específicamente el cáncer pulmonar, dado su impacto epidemiológico. El uso de machine learning permite analizar grandes volúmenes de datos clínicos y ambientales para identificar patrones predictivos con una precisión comparable a la de un especialista, facilitando diagnósticos antes de la aparición de síntomas. Este proyecto se propone cerrar la brecha en la detección temprana mediante un sistema que no solo predice la probabilidad de cáncer en pacientes, sino que también identifica factores de riesgo clave, optimizando la toma de decisiones clínicas y reduciendo la carga en los sistemas de salud.
	
#### Arquitectura del Sistema

#### Frontend Mobile (Ionic + Angular Standalone)

- **Framework**: Ionic Framework con Angular Standalone Components
- **Lenguaje**: TypeScript
- **Estilos**: SCSS con sistema de temas
- **Patrón**: Clean Architecture con separación de capas

#### Backend API (Node.js + TypeScript)

- **Framework**: Express.js con TypeScript
- **Base de Datos**: PostgreSQL local
- **Autenticación**: JWT con estrategias múltiples
- **Patrón**: Arquitectura en capas (Controllers → Services → Models)

#### Base de Datos (PostgreSQL)

- **Tipo**: Base de datos relacional local
- **Esquemas**: Autenticación completa, perfiles de usuario, logs de auditoría
- **Migraciones**: Scripts SQL organizados

#### Machine Learning (Python + CRISP-DM)

- **Metodología**: CRISP-DM (Cross Industry Standard Process for Data Mining)
- **Herramientas**: Jupyter Notebooks, Scikit-learn, Pandas
- **Visualización**: PowerBI para dashboards interactivos

#### Atributos de Calidad

#### Mantenibilidad

- **Modularidad**: Arquitectura modular con feature modules
- **Clean Code**: Convenciones de nomenclatura consistentes
- **Documentación**: README, comentarios en código, documentación de API

#### Usabilidad

- **Responsive Design**: Mobile-first con soporte cross-platform
- **UI Consistency**: Sistema de diseño unificado
- **User Feedback**: Estados de carga, mensajes de error, notificaciones

#### Escalabilidad

- **Layered Architecture**: Separación clara de responsabilidades
- **Dependency Injection**: Inyección de dependencias para testing y flexibilidad
- **Microservices Ready**: Arquitectura preparada para migración a microservicios

#### Confiabilidad

- **Error Handling**: Manejo robusto de errores en todas las capas
- **Logging**: Sistema de logging estructurado
- **Testing**: Tests unitarios e integración

###	Estrategía de Branching

Flujo de Trabajo en GitHub (Branching Strategy)

#### Ramas de publicación

flujo GitFlow adaptado a Scrum para evitar conflictos en dupla:

__Branch principal (main):__ Solo merges aprobados. Representa versiones estables para despliegue.

__Develop branch:__ Para integración continua. Mergea features aquí antes de main.

__Feature branches:__ Por task de Jira (e.g., "feature/predict-ml-model"). Cada miembro de la dupla trabaja en su branch.

__Pull Requests (PRs):__ Obligatorios para merges. El otro miembro revisa y aprueba. Usa templates de PR para incluir checklists (e.g., "Pruebas pasadas? Documentación actualizada?").

__Hotfix branches:__ Para bugs urgentes en producción.
Releases: Taggea versiones (e.g., v1.0) al final de sprints, alineado con fases CRISP-DM.

__Integra protecciones:__ En GitHub settings, requiere al menos 1 aprobación en PRs y status checks (tests) para merges.\

![Ramas de publicación](https://wac-cdn.atlassian.com/dam/jcr:8f00f1a4-ef2d-498a-a2c6-8020bb97902f/03%20Release%20branches.svg)

#### Ramas principales
main/master          # Código en producción

develop             # Integración de features

#### Ramas de trabajo
feature/LUNG-123-login-screen     # Features (con ticket Jira)

hotfix/LUNG-456-critical-bug      # Hotfixes

release/v1.2.0                    # Preparación releases

ml/experiment-lung-detection      # Experimentos ML

docs/api-documentation            # Documentación
