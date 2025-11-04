"""
Unit tests for taxi_data_processor module

Tests the functionality of adding taxi_color column before dataset creation.
"""

import unittest
import pandas as pd
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from taxi_data_processor import (
    agregar_columna_color_taxi,
    cargar_dataset_con_color,
    crear_dataset_final
)


class TestAgregarColumnaColorTaxi(unittest.TestCase):
    """Tests for agregar_columna_color_taxi function"""
    
    def setUp(self):
        """Create sample dataframes for testing"""
        self.df_sample = pd.DataFrame({
            'trip_distance': [1.5, 2.0, 3.5],
            'fare_amount': [10.5, 12.0, 18.5]
        })
    
    def test_agregar_color_yellow(self):
        """Test adding Yellow taxi color"""
        df_result = agregar_columna_color_taxi(self.df_sample, 'yellow')
        
        self.assertIn('taxi_color', df_result.columns)
        self.assertTrue((df_result['taxi_color'] == 'Yellow').all())
        self.assertEqual(len(df_result), len(self.df_sample))
    
    def test_agregar_color_green(self):
        """Test adding Green taxi color"""
        df_result = agregar_columna_color_taxi(self.df_sample, 'green')
        
        self.assertIn('taxi_color', df_result.columns)
        self.assertTrue((df_result['taxi_color'] == 'Green').all())
        self.assertEqual(len(df_result), len(self.df_sample))
    
    def test_tipo_taxi_invalido(self):
        """Test that invalid taxi type raises ValueError"""
        with self.assertRaises(ValueError) as context:
            agregar_columna_color_taxi(self.df_sample, 'blue')
        
        self.assertIn('yellow', str(context.exception).lower())
        self.assertIn('green', str(context.exception).lower())
    
    def test_no_modifica_original(self):
        """Test that original dataframe is not modified"""
        df_original = self.df_sample.copy()
        agregar_columna_color_taxi(self.df_sample, 'yellow')
        
        # Original should not have taxi_color column
        self.assertNotIn('taxi_color', self.df_sample.columns)
        pd.testing.assert_frame_equal(self.df_sample, df_original)
    
    def test_preserva_otras_columnas(self):
        """Test that other columns are preserved"""
        df_result = agregar_columna_color_taxi(self.df_sample, 'yellow')
        
        for col in self.df_sample.columns:
            self.assertIn(col, df_result.columns)
            pd.testing.assert_series_equal(
                df_result[col], 
                self.df_sample[col],
                check_names=True
            )


class TestCrearDatasetFinal(unittest.TestCase):
    """Tests for crear_dataset_final function"""
    
    def setUp(self):
        """Create sample dataframes with taxi_color for testing"""
        self.df_yellow = pd.DataFrame({
            'trip_distance': [1.5, 2.0],
            'fare_amount': [10.5, 12.0],
            'taxi_color': ['Yellow', 'Yellow']
        })
        
        self.df_green = pd.DataFrame({
            'trip_distance': [0.8, 1.2],
            'fare_amount': [7.5, 9.0],
            'taxi_color': ['Green', 'Green']
        })
        
        self.df_sin_color = pd.DataFrame({
            'trip_distance': [3.0],
            'fare_amount': [15.0]
        })
    
    def test_crear_dataset_con_dos_dataframes(self):
        """Test creating final dataset with two dataframes"""
        df_final = crear_dataset_final(self.df_yellow, self.df_green)
        
        self.assertEqual(len(df_final), 4)
        self.assertIn('taxi_color', df_final.columns)
        self.assertEqual(df_final['taxi_color'].value_counts()['Yellow'], 2)
        self.assertEqual(df_final['taxi_color'].value_counts()['Green'], 2)
    
    def test_crear_dataset_con_un_dataframe(self):
        """Test creating final dataset with single dataframe"""
        df_final = crear_dataset_final(self.df_yellow)
        
        self.assertEqual(len(df_final), 2)
        self.assertTrue((df_final['taxi_color'] == 'Yellow').all())
    
    def test_crear_dataset_sin_dataframes(self):
        """Test that creating dataset with no dataframes raises ValueError"""
        with self.assertRaises(ValueError) as context:
            crear_dataset_final()
        
        self.assertIn('al menos un', str(context.exception).lower())
    
    def test_validar_columna_color_faltante(self):
        """Test that missing taxi_color column is detected"""
        with self.assertRaises(ValueError) as context:
            crear_dataset_final(self.df_yellow, self.df_sin_color)
        
        self.assertIn('taxi_color', str(context.exception))
    
    def test_sin_validacion_columna_color(self):
        """Test creating dataset without validating taxi_color column"""
        # Should not raise error when validation is disabled
        df_final = crear_dataset_final(
            self.df_sin_color, 
            validar_columna_color=False
        )
        
        self.assertEqual(len(df_final), 1)
    
    def test_indices_reseteados(self):
        """Test that indices are reset in final dataset"""
        df_final = crear_dataset_final(self.df_yellow, self.df_green)
        
        # Check that indices are sequential from 0
        expected_indices = list(range(len(df_final)))
        self.assertEqual(df_final.index.tolist(), expected_indices)
    
    def test_columnas_preservadas(self):
        """Test that all columns are preserved in final dataset"""
        df_final = crear_dataset_final(self.df_yellow, self.df_green)
        
        expected_columns = ['trip_distance', 'fare_amount', 'taxi_color']
        self.assertEqual(sorted(df_final.columns), sorted(expected_columns))


class TestIntegracionCompleta(unittest.TestCase):
    """Integration tests for complete workflow"""
    
    def test_flujo_completo_yellow_green(self):
        """Test complete workflow: load -> add color -> combine"""
        # Create raw datasets
        df_yellow_raw = pd.DataFrame({
            'trip_distance': [1.5, 2.0, 3.5],
            'fare_amount': [10.5, 12.0, 18.5]
        })
        
        df_green_raw = pd.DataFrame({
            'trip_distance': [0.8, 1.2],
            'fare_amount': [7.5, 9.0]
        })
        
        # Add color columns BEFORE creating final dataset
        df_yellow = agregar_columna_color_taxi(df_yellow_raw, 'yellow')
        df_green = agregar_columna_color_taxi(df_green_raw, 'green')
        
        # Create final dataset
        df_final = crear_dataset_final(df_yellow, df_green)
        
        # Verify results
        self.assertEqual(len(df_final), 5)
        self.assertIn('taxi_color', df_final.columns)
        self.assertEqual(df_final['taxi_color'].nunique(), 2)
        self.assertIn('Yellow', df_final['taxi_color'].values)
        self.assertIn('Green', df_final['taxi_color'].values)
    
    def test_flujo_incorrecto_sin_color(self):
        """Test that incorrect workflow (no color) is caught"""
        df_raw1 = pd.DataFrame({'distance': [1.5]})
        df_raw2 = pd.DataFrame({'distance': [2.0]})
        
        # Try to create final dataset without adding color first
        with self.assertRaises(ValueError):
            crear_dataset_final(df_raw1, df_raw2)


class TestCargadorConColor(unittest.TestCase):
    """Tests for cargar_dataset_con_color function"""
    
    def test_archivo_no_existe(self):
        """Test that FileNotFoundError is raised for non-existent file"""
        with self.assertRaises(FileNotFoundError):
            cargar_dataset_con_color('/tmp/no_existe.csv', 'yellow')


def suite():
    """Create test suite"""
    suite = unittest.TestSuite()
    
    # Add all test cases
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestAgregarColumnaColorTaxi))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestCrearDatasetFinal))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestIntegracionCompleta))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestCargadorConColor))
    
    return suite


if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite())
