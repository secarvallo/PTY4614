# Descripción de Características del Dataset de Cáncer de Pulmón

Este documento describe las columnas contenidas en el archivo `lung_cancer_data.csv`.

| Característica | Descripción | Tipo de Dato | Ejemplo / Rango |
| :--- | :--- | :--- | :--- |
| **Patient_ID** | Identificador único para cada paciente. | Entero | 1, 2, 3... |
| **Age** | Edad del paciente al momento del diagnóstico. | Entero | 18 - 89 años |
| **Gender** | Género biológico del paciente. | Categórico | Male, Female, Other |
| **Smoking_History** | Historial de tabaquismo del paciente. | Categórico | Never, Former, Current |
| **Years_Smoked** | Cantidad de años que el paciente ha fumado. | Entero | 0 - 49 años |
| **Pack_Years** | Medida de exposición al tabaco (paquetes/día × años). | Entero | 0 - 79 |
| **Family_History_Cancer** | Presencia de antecedentes de cáncer en la familia. | Booleano | True, False |
| **Occupation** | Ocupación principal o entorno laboral del paciente. | Categórico | Farmer, Office Worker, Factory Worker, Other |
| **Exposure_to_Toxins** | Exposición regular a toxinas ambientales o industriales. | Booleano | True, False |
| **Residential_Area** | Tipo de zona donde reside el paciente. | Categórico | Urban, Suburban, Rural |
| **BMI** | Índice de Masa Corporal (Body Mass Index). | Float | 16.1 - 39.9 |
| **Lung_Function_Test_Result**| Resultado de pruebas de función pulmonar (espirometría). | Float | 30.0 - 100.0 |
| **Chest_Pain_Symptoms** | Presencia de síntomas de dolor en el pecho. | Booleano | True, False |
| **Shortness_of_Breath** | Presencia de dificultad para respirar (disnea). | Booleano | True, False |
| **Chronic_Cough** | Presencia de tos crónica persistente. | Booleano | True, False |
| **Weight_Loss** | Pérdida de peso significativa e inexplicable. | Booleano | True, False |
| **Physical_Activity_Level** | Nivel de actividad física del paciente. | Categórico | Low, Moderate, High |
| **Dietary_Habits** | Calidad de los hábitos alimenticios del paciente. | Categórico | Poor, Average, Good |
| **Air_Quality_Index** | Índice de calidad del aire en la zona de residencia. | Entero | 10 - 499 |
| **Comorbidities** | Otras condiciones médicas preexistentes. | Categórico | None, COPD, Diabetes, Hypertension |
| **Previous_Cancer_Diagnosis** | Antecedentes de diagnósticos previos de cáncer. | Booleano | True, False |
| **Tumor_Size_cm** | Tamaño del tumor detectado en centímetros. | Float | 0.0 - 14.99 cm |
| **Metastasis_Status** | Indica si el cáncer se ha diseminado a otros órganos. | Booleano | True, False |
| **Stage_of_Cancer** | Etapa clínica del cáncer al momento del diagnóstico. | Categórico | I, II, III, IV |
| **Treatment_Type** | Tipo de tratamiento principal administrado. | Categórico | Surgery, Chemotherapy, Radiation, Palliative |
| **Survival_Years** | Años de supervivencia después del diagnóstico. | Entero | 0 - 19 años |
| **Follow_Up_Visits** | Número de visitas de seguimiento registradas. | Entero | 0 - 49 |
| **Medication_Response** | Eficacia de la respuesta al tratamiento farmacológico. | Categórico | Good, Moderate, Poor |
| **Symptom_Progression** | Evolución de los síntomas durante el seguimiento. | Categórico | Stable, Improving, Worsening |
| **Year_of_Diagnosis** | Año en el que se realizó el diagnóstico oficial. | Entero | 2000 - 2024 |
