#!/usr/bin/env python3
"""
Test script para validar el sistema de predicción de cáncer
"""

import requests
import json
import sys
import time

def test_api_endpoints():
    """Test all API endpoints"""
    base_url = "http://localhost:5000"
    
    print("🧪 Iniciando tests del sistema de predicción de cáncer...")
    
    # Test 1: Verificar que el servidor esté funcionando
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✅ Servidor backend funcionando correctamente")
        else:
            print("❌ Error en servidor backend")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al servidor backend")
        print("   Asegúrate de que el servidor esté ejecutándose en localhost:5000")
        return False
    
    # Test 2: Entrenar modelo
    try:
        response = requests.post(f"{base_url}/train-model")
        if response.status_code == 200:
            data = response.json()
            accuracy = data['metrics']['accuracy']
            print(f"✅ Modelo entrenado exitosamente (Precisión: {accuracy:.2%})")
        else:
            print("❌ Error al entrenar modelo")
            return False
    except Exception as e:
        print(f"❌ Error al entrenar modelo: {e}")
        return False
    
    # Test 3: Test de predicción con paciente de alto riesgo
    high_risk_patient = {
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
    
    try:
        response = requests.post(f"{base_url}/predict", json=high_risk_patient)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Predicción para paciente de alto riesgo:")
            print(f"   Predicción: {'Alto Riesgo' if result['prediction'] == 1 else 'Bajo Riesgo'}")
            print(f"   Probabilidad alto riesgo: {result['risk_probability']['high_risk']:.2%}")
            print(f"   Factores identificados: {len(result['risk_factors'])}")
        else:
            print("❌ Error en predicción de alto riesgo")
            return False
    except Exception as e:
        print(f"❌ Error en predicción: {e}")
        return False
    
    # Test 4: Test de predicción con paciente de bajo riesgo
    low_risk_patient = {
        "age": 25,
        "bmi": 22,
        "smoking": 0,
        "alcohol_consumption": 0,
        "physical_activity": 1,
        "family_history": 0,
        "previous_cancer_history": 0,
        "fatigue": 0,
        "weight_loss": 0,
        "shortness_of_breath": 0
    }
    
    try:
        response = requests.post(f"{base_url}/predict", json=low_risk_patient)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Predicción para paciente de bajo riesgo:")
            print(f"   Predicción: {'Alto Riesgo' if result['prediction'] == 1 else 'Bajo Riesgo'}")
            print(f"   Probabilidad bajo riesgo: {result['risk_probability']['low_risk']:.2%}")
            print(f"   Factores identificados: {len(result['risk_factors'])}")
        else:
            print("❌ Error en predicción de bajo riesgo")
            return False
    except Exception as e:
        print(f"❌ Error en predicción: {e}")
        return False
    
    # Test 5: Verificar evaluación del modelo
    try:
        response = requests.get(f"{base_url}/model-evaluation")
        if response.status_code == 200:
            data = response.json()
            print("✅ Evaluación del modelo disponible")
            print("   Fases CRISP-DM completadas:")
            for phase, status in data['crisp_dm_phases'].items():
                print(f"   - {phase.replace('_', ' ').title()}: {status}")
        else:
            print("❌ Error en evaluación del modelo")
            return False
    except Exception as e:
        print(f"❌ Error en evaluación: {e}")
        return False
    
    print("\n🎉 Todos los tests del backend pasaron exitosamente!")
    return True

def main():
    """Main test function"""
    print("🔬 Sistema de Predicción de Cáncer - Tests de Validación")
    print("=" * 60)
    
    success = test_api_endpoints()
    
    if success:
        print("\n✅ Sistema funcionando correctamente!")
        print("\n📱 Para probar la app móvil:")
        print("   1. cd mobile-app")
        print("   2. npm install")
        print("   3. ionic serve")
        print("\n🌐 La app estará disponible en: http://localhost:8100")
    else:
        print("\n❌ Se encontraron errores en el sistema")
        sys.exit(1)

if __name__ == "__main__":
    main()