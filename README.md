# Sistema de Predicción de Cáncer - PTY4614

## Descripción
Sistema integral que predice el cáncer en pacientes mediante machine learning con metodología CRISP-DM, junto con una aplicación móvil desarrollada en Ionic.

Este proyecto es la segunda y última etapa del Proceso de Portafolio de Título de la carrera de Ingeniería en Informática, consolidando conocimientos en machine learning, desarrollo móvil y metodologías de ciencia de datos.

## Arquitectura del Sistema

### Backend (Machine Learning)
- **Tecnología**: Python, Flask, scikit-learn
- **Metodología**: CRISP-DM (Cross-Industry Standard Process for Data Mining)
- **Modelo**: Random Forest Classifier
- **API REST**: Endpoints para entrenamiento y predicción

### Frontend (App Móvil)
- **Tecnología**: Ionic, Angular, TypeScript
- **Características**: 
  - Formulario de datos del paciente
  - Visualización de resultados
  - Identificación de factores de riesgo
  - Recomendaciones médicas

## Instalación y Configuración

### Requisitos Previos
- Python 3.8+
- Node.js 18+
- npm o yarn

### Instalación del Backend

```bash
# Navegar al directorio del backend
cd ml-backend

# Instalar dependencias de Python
pip install -r requirements.txt

# Ejecutar el servidor
python app.py
```

El backend estará disponible en `http://localhost:5000`

### Instalación de la App Móvil

```bash
# Navegar al directorio de la app móvil
cd mobile-app

# Instalar dependencias
npm install

# Instalar Ionic CLI (si no está instalado)
npm install -g @ionic/cli

# Ejecutar la aplicación
ionic serve
```

La aplicación estará disponible en `http://localhost:8100`

## Metodología CRISP-DM Implementada

### 1. Entendimiento del Negocio
- **Objetivo**: Predecir el riesgo de cáncer en pacientes
- **Criterio de éxito**: Precisión del modelo > 80%
- **Factores de riesgo**: Edad, IMC, tabaquismo, alcohol, actividad física, historia familiar, etc.

### 2. Entendimiento de los Datos
- Generación de datos sintéticos realistas para entrenamiento
- 10 variables de entrada (edad, IMC, factores de riesgo, síntomas)
- Variable objetivo binaria (riesgo alto/bajo)

### 3. Preparación de los Datos
- Normalización de variables continuas (edad, IMC)
- Codificación binaria de variables categóricas
- División en conjuntos de entrenamiento y prueba

### 4. Modelado
- Algoritmo: Random Forest Classifier
- Parámetros optimizados: 100 estimadores, profundidad máxima 10
- Validación cruzada estratificada

### 5. Evaluación
- Métricas: Precisión, Recall, F1-Score
- Precisión alcanzada: ~84%
- Cumple criterios de éxito del negocio

### 6. Despliegue
- API REST con endpoints para entrenamiento y predicción
- Aplicación móvil para interfaz de usuario
- Documentación y guías de uso

## API Endpoints

### Entrenar Modelo
```
POST /train-model
```

### Realizar Predicción
```
POST /predict
Content-Type: application/json

{
  "age": 65,
  "bmi": 32,
  "smoking": 1,
  "alcohol_consumption": 1,
  "physical_activity": 0,
  "family_history": 1,
  "previous_cancer_history": 0,
  "fatigue": 1,
  "weight_loss": 1,
  "shortness_of_breath": 1
}
```

### Evaluación del Modelo
```
GET /model-evaluation
```

### Objetivos del Negocio
```
GET /business-understanding
```

## Características de la App Móvil

- **Formulario interactivo** para ingreso de datos del paciente
- **Validación de datos** en tiempo real
- **Visualización de resultados** con códigos de colores
- **Identificación de factores de riesgo** específicos
- **Recomendaciones médicas** basadas en la predicción
- **Interfaz responsiva** para dispositivos móviles

## Factores de Riesgo Evaluados

1. **Demográficos**: Edad, IMC
2. **Estilo de vida**: Tabaquismo, consumo de alcohol, actividad física
3. **Historia médica**: Historia familiar, cáncer previo
4. **Síntomas**: Fatiga, pérdida de peso, dificultad respiratoria

## Consideraciones Importantes

- ⚠️ **Uso educativo**: Este sistema es para fines educativos y de demostración
- ⚠️ **No reemplaza diagnóstico médico**: Siempre consultar con profesionales de la salud
- ⚠️ **Datos sintéticos**: El modelo utiliza datos sintéticos para demostración

## Desarrollo y Contribución

### Estructura del Proyecto
```
PTY4614/
├── ml-backend/          # Backend de machine learning
│   ├── app.py          # API Flask principal
│   └── requirements.txt # Dependencias Python
├── mobile-app/         # Aplicación móvil Ionic
│   └── src/
│       └── app/        # Código fuente Angular/Ionic
└── README.md           # Documentación
```

### Próximas Mejoras
- [ ] Integración con datos reales (con permisos)
- [ ] Más algoritmos de ML para comparación
- [ ] Validación médica del modelo
- [ ] Despliegue en producción
- [ ] Tests automatizados

## Licencia
MIT License - Ver archivo LICENSE para más detalles

## Autor
Proyecto PTY4614 - Ingeniería en Informática
