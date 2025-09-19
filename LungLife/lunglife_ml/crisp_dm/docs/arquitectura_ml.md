proyecto_diagnostico_cancer/        # Carpeta principal en Google Drive
│
├── data/                           # Almacenamiento de datos
│   ├── raw/                        # Datos originales
│   │   └── dataset_cancer.csv      # Dataset demo (ej. cáncer de seno)
│   ├── processed/                  # Datos listos para modelado
│   │   ├── cleaned_data.csv        # Datos limpios
│   │   ├── train.csv              # Conjunto de entrenamiento
│   │   ├── test.csv               # Conjunto de prueba
│   │   └── validation.csv         # Conjunto de validación
│   └── external/                   # Datos externos (opcional)
│
├── database/                       # Base de datos
│   ├── schema.sql                 # Esquema de la base de datos (SQLite)
│   ├── populate_db.sql            # Script para poblar datos de prueba
│   └── queries.sql                # Consultas predefinidas para la aplicación
│
├── notebooks/                      # Jupyter notebooks para CRISP-DM
│   ├── 01_business_understanding.ipynb  # Fase 1: Comprensión del negocio
│   ├── 02_data_understanding.ipynb     # Fase 2: Comprensión de datos
│   ├── 03_data_preparation.ipynb       # Fase 3: Preparación de datos
│   ├── 04_modeling.ipynb               # Fase 4: Modelado y factores de riesgo
│   ├── 05_evaluation.ipynb             # Fase 5: Evaluación
│   ├── 06_deployment.ipynb             # Fase 6: Despliegue e integración con BD
│   └── 06_powerbi_visualization.ipynb  # Exportación a Power BI
│
├── src/                            # Código fuente
│   ├── data_processing.py          # Limpieza e ingeniería de características
│   ├── model_training.py           # Entrenamiento y optimización de modelos
│   ├── risk_factor_analysis.py     # Análisis de factores de riesgo
│   ├── app.py                     # Aplicación web para profesionales de salud
│   └── visualizations.py           # Funciones para visualizaciones
│
├── models/                         # Modelos entrenados
│   ├── model_final.pkl            # Modelo seleccionado
│   └── metrics.json               # Métricas de rendimiento
│
├── config/                         # Configuraciones
│   ├── config.yaml                # Rutas, parámetros de procesamiento y modelos
│
├── docs/                           # Documentación
│   ├── project_plan.md            # Planificación (cronograma, metodología)
│   ├── analysis_design.md         # Análisis y diseño (arquitectura, GUI, BD)
│   ├── test_plan.md               # Plan y resultados de pruebas
│   ├── usability_test.md           # Pruebas de usabilidad
│   └── project_closure.md         # Documento de cierre
│
├── visualizations/                 # Visualizaciones
│   ├── eda_plots.png              # Gráficos de análisis exploratorio
│   ├── roc_curves.png             # Curvas ROC de evaluación
│   ├── risk_factors.png           # Visualización de factores de riesgo
│   └── powerbi_dashboard.pbix     # Archivo de Power BI
│
├── tests/                          # Pruebas unitarias
│   ├── test_data_processing.py    # Pruebas de procesamiento
│   ├── test_models.py            # Pruebas de modelos
│   └── test_database.py           # Pruebas de integridad de la base de datos
│
├── requirements.txt                # Dependencias del proyecto
└── README.md                       # Documentación principal