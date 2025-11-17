# Taxi Data Processing - Adding taxi_color Feature

## Overview

This solution implements the correct workflow for adding taxi color features to NYC taxi datasets **BEFORE** creating the final combined dataset.

## Problem Statement

Previously, the `taxi_color` column was being added inside the `crear_dataset_final` function, which meant that individual datasets didn't have the color feature when loaded. This made it difficult to analyze each dataset separately and could lead to errors in data processing.

## Solution

The solution implements a clear separation of concerns:

1. **Load individual datasets** (Yellow taxis, Green taxis)
2. **Add `taxi_color` column** to each dataset based on its source
3. **Combine datasets** using `crear_dataset_final()`

## Implementation

### Module: `src/taxi_data_processor.py`

The module provides three main functions:

#### 1. `agregar_columna_color_taxi(df, tipo_taxi)`

Adds a `taxi_color` column to a DataFrame.

**Parameters:**
- `df`: DataFrame to process
- `tipo_taxi`: Either `'yellow'` or `'green'`

**Returns:** DataFrame with `taxi_color` column added

**Example:**
```python
df_yellow = agregar_columna_color_taxi(df_yellow_raw, 'yellow')
# Result: df_yellow now has a 'taxi_color' column with value 'Yellow'
```

#### 2. `cargar_dataset_con_color(ruta_archivo, tipo_taxi)`

Convenience function that loads a CSV file and automatically adds the color column.

**Parameters:**
- `ruta_archivo`: Path to CSV file
- `tipo_taxi`: Either `'yellow'` or `'green'`

**Returns:** DataFrame loaded from file with `taxi_color` column

**Example:**
```python
df_yellow = cargar_dataset_con_color('data/yellow_taxi_2023.csv', 'yellow')
```

#### 3. `crear_dataset_final(*dataframes, validar_columna_color=True)`

Combines multiple taxi datasets into a single final dataset.

**Parameters:**
- `*dataframes`: One or more DataFrames to combine
- `validar_columna_color`: Whether to validate that all DataFrames have `taxi_color` column (default: True)

**Returns:** Combined DataFrame

**Example:**
```python
df_final = crear_dataset_final(df_yellow, df_green)
```

## Usage

### Correct Workflow ✅

```python
import pandas as pd
from taxi_data_processor import agregar_columna_color_taxi, crear_dataset_final

# Load raw datasets
df_yellow_raw = pd.read_csv('yellow_taxis.csv')
df_green_raw = pd.read_csv('green_taxis.csv')

# STEP 1: Add taxi_color column BEFORE combining
df_yellow = agregar_columna_color_taxi(df_yellow_raw, 'yellow')
df_green = agregar_columna_color_taxi(df_green_raw, 'green')

# STEP 2: Create final dataset (with validation)
df_final = crear_dataset_final(df_yellow, df_green)
```

### Incorrect Workflow ❌

```python
# DON'T DO THIS - it will fail validation
df_yellow_raw = pd.read_csv('yellow_taxis.csv')
df_green_raw = pd.read_csv('green_taxis.csv')

# Trying to combine without adding color first
df_final = crear_dataset_final(df_yellow_raw, df_green_raw)  # ValueError!
```

## Benefits

1. **Clear separation**: Each dataset is properly labeled before processing
2. **Individual analysis**: Can analyze Yellow or Green taxis separately
3. **Error prevention**: Validation ensures all datasets have the required column
4. **Better maintainability**: Code is more readable and maintainable

## Files

- `src/taxi_data_processor.py` - Main module with processing functions
- `tests/test_taxi_data_processor.py` - Unit tests (15 tests, all passing)
- `notebooks/taxi_data_processing_demo.ipynb` - Interactive demonstration notebook

## Running Tests

```bash
cd LungLife/lunglife_ml/crisp_dm
python3 tests/test_taxi_data_processor.py
```

Expected output: `Ran 15 tests in X.XXXs - OK`

## Running Demo

```bash
cd LungLife/lunglife_ml/crisp_dm
python3 src/taxi_data_processor.py
```

This will run the example workflow showing:
- Creating sample Yellow and Green taxi datasets
- Adding color columns to each
- Combining into final dataset
- Displaying the results

## Integration with CRISP-DM

This module fits into the **Data Preparation** phase (Phase 3) of the CRISP-DM methodology, specifically in the data transformation and feature engineering steps.

## Requirements

- pandas >= 1.5.0
- numpy (optional, for numerical operations)

## Author

Implemented to resolve issue: "Adding taxi color feature before dataset processing"
