proyecto_diagnostico_cancer/        # Carpeta principal en Google Drive
│
├── data/                                                   # Almacenamiento de datos
│   ├── raw/                                               # Datos originales
│   │   └── dataset_cancer.csv                # Dataset demo (ej. cáncer de seno)
│   ├── processed/                                    # Datos listos para modelado
│   └── external/                                       # Datos externos (opcional)
│
├── database/                       # Base de datos
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
│
├── config/                         # Configuraciones
│
├── docs/                           # Documentación
│
├── visualizations/                 # Visualizaciones
│
├── tests/                          # Pruebas unitarias│
├── requirements.txt                # Dependencias del proyecto
└── README.md                       # Documentación principal