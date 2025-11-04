"""
Taxi Data Processing Module

This module provides functions to load and process NYC taxi datasets,
including functions to add taxi color features before final dataset creation.
"""

import pandas as pd
import os
from typing import Literal, Optional


def agregar_columna_color_taxi(
    df: pd.DataFrame, 
    tipo_taxi: Literal['yellow', 'green']
) -> pd.DataFrame:
    """
    Agrega una columna 'taxi_color' al DataFrame basado en el tipo de taxi.
    
    Esta función debe ser llamada ANTES de crear_dataset_final para asegurar
    que cada dataset tenga la columna de color apropiada.
    
    Parameters:
    -----------
    df : pd.DataFrame
        DataFrame del dataset de taxi
    tipo_taxi : Literal['yellow', 'green']
        Tipo de taxi: 'yellow' para taxis amarillos o 'green' para taxis verdes
        
    Returns:
    --------
    pd.DataFrame
        DataFrame con la columna 'taxi_color' agregada
        
    Examples:
    ---------
    >>> df_yellow = pd.DataFrame({'trip_distance': [1.5, 2.3]})
    >>> df_yellow = agregar_columna_color_taxi(df_yellow, 'yellow')
    >>> print(df_yellow['taxi_color'].iloc[0])
    Yellow
    """
    df_copy = df.copy()
    
    # Mapeo de tipo a etiqueta de color
    color_map = {
        'yellow': 'Yellow',
        'green': 'Green'
    }
    
    if tipo_taxi not in color_map:
        raise ValueError(f"tipo_taxi debe ser 'yellow' o 'green', recibido: {tipo_taxi}")
    
    df_copy['taxi_color'] = color_map[tipo_taxi]
    
    return df_copy


def cargar_dataset_con_color(
    ruta_archivo: str,
    tipo_taxi: Literal['yellow', 'green']
) -> pd.DataFrame:
    """
    Carga un dataset de taxi y automáticamente agrega la columna taxi_color.
    
    Esta es una función conveniente que combina la carga del archivo
    con la adición de la columna de color en un solo paso.
    
    Parameters:
    -----------
    ruta_archivo : str
        Ruta al archivo CSV del dataset de taxi
    tipo_taxi : Literal['yellow', 'green']
        Tipo de taxi para identificar el color
        
    Returns:
    --------
    pd.DataFrame
        DataFrame cargado con la columna 'taxi_color' ya agregada
        
    Examples:
    ---------
    >>> df = cargar_dataset_con_color('data/yellow_taxi_2023.csv', 'yellow')
    >>> assert 'taxi_color' in df.columns
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"Archivo no encontrado: {ruta_archivo}")
    
    # Cargar el dataset
    df = pd.read_csv(ruta_archivo)
    
    # Agregar columna de color ANTES de cualquier otro procesamiento
    df = agregar_columna_color_taxi(df, tipo_taxi)
    
    return df


def crear_dataset_final(
    *dataframes: pd.DataFrame,
    validar_columna_color: bool = True,
    verbose: bool = True
) -> pd.DataFrame:
    """
    Combina múltiples datasets de taxi en un dataset final.
    
    IMPORTANTE: Cada DataFrame debe tener la columna 'taxi_color' agregada
    ANTES de llamar a esta función. Use agregar_columna_color_taxi() o
    cargar_dataset_con_color() para asegurar que la columna esté presente.
    
    Parameters:
    -----------
    *dataframes : pd.DataFrame
        Uno o más DataFrames de taxi para combinar
    validar_columna_color : bool, default=True
        Si es True, valida que todos los DataFrames tengan la columna 'taxi_color'
    verbose : bool, default=True
        Si es True, imprime información sobre el dataset creado
        
    Returns:
    --------
    pd.DataFrame
        DataFrame combinado con todos los datos de taxi
        
    Raises:
    -------
    ValueError
        Si validar_columna_color es True y algún DataFrame no tiene la columna 'taxi_color'
        
    Examples:
    ---------
    >>> df_yellow = pd.DataFrame({'distance': [1.5]})
    >>> df_yellow = agregar_columna_color_taxi(df_yellow, 'yellow')
    >>> df_green = pd.DataFrame({'distance': [2.3]})
    >>> df_green = agregar_columna_color_taxi(df_green, 'green')
    >>> df_final = crear_dataset_final(df_yellow, df_green)
    >>> assert len(df_final) == 2
    >>> assert 'taxi_color' in df_final.columns
    """
    if len(dataframes) == 0:
        raise ValueError("Se debe proporcionar al menos un DataFrame")
    
    # Validar que todos los DataFrames tengan la columna taxi_color
    if validar_columna_color:
        for i, df in enumerate(dataframes):
            if 'taxi_color' not in df.columns:
                raise ValueError(
                    f"DataFrame en posición {i} no tiene la columna 'taxi_color'. "
                    "Use agregar_columna_color_taxi() antes de llamar a crear_dataset_final()."
                )
    
    # Combinar todos los DataFrames
    df_final = pd.concat(dataframes, ignore_index=True)
    
    if verbose:
        print(f"Dataset final creado con {len(df_final)} registros")
        
        # Solo mostrar distribución de colores si la columna existe
        if 'taxi_color' in df_final.columns:
            print(f"Distribución de colores:")
            print(df_final['taxi_color'].value_counts())
    
    return df_final


# Ejemplo de uso correcto
def ejemplo_uso_correcto():
    """
    Ejemplo que muestra el flujo correcto de procesamiento de datos:
    1. Cargar datasets
    2. Agregar columna de color (ANTES de crear_dataset_final)
    3. Crear dataset final
    """
    # Supongamos que tenemos archivos de datos
    # df_yellow_raw = pd.read_csv('yellow_taxi_2023.csv')
    # df_green_raw = pd.read_csv('green_taxi_2023.csv')
    
    # Ejemplo con datos simulados
    df_yellow_raw = pd.DataFrame({
        'trip_distance': [1.5, 2.0, 3.5],
        'fare_amount': [10.5, 12.0, 18.5]
    })
    
    df_green_raw = pd.DataFrame({
        'trip_distance': [0.8, 1.2],
        'fare_amount': [7.5, 9.0]
    })
    
    # PASO 1: Agregar columna de color ANTES de crear_dataset_final
    print("Paso 1: Agregando columnas de color a cada dataset...")
    df_yellow = agregar_columna_color_taxi(df_yellow_raw, 'yellow')
    df_green = agregar_columna_color_taxi(df_green_raw, 'green')
    
    print("\nDataset Yellow con columna de color:")
    print(df_yellow.head())
    print("\nDataset Green con columna de color:")
    print(df_green.head())
    
    # PASO 2: Crear dataset final (ahora ambos DataFrames tienen taxi_color)
    print("\nPaso 2: Creando dataset final...")
    df_final = crear_dataset_final(df_yellow, df_green)
    
    print("\nDataset final:")
    print(df_final)
    
    return df_final


if __name__ == "__main__":
    print("=" * 60)
    print("EJEMPLO DE USO CORRECTO")
    print("=" * 60)
    print()
    df = ejemplo_uso_correcto()
