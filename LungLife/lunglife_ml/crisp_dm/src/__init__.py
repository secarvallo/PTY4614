"""
CRISP-DM Source Module

This module contains utility functions and processing scripts for the CRISP-DM pipeline.
"""

from .taxi_data_processor import (
    agregar_columna_color_taxi,
    cargar_dataset_con_color,
    crear_dataset_final
)

__all__ = [
    'agregar_columna_color_taxi',
    'cargar_dataset_con_color',
    'crear_dataset_final'
]
