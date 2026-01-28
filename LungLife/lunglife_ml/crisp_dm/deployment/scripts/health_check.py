#!/usr/bin/env python3
# ============================================================================
# LungLife MVP - Health Check Script
# Ejecutar: python health_check.py
# ============================================================================

import requests
import sys
from datetime import datetime
from typing import Dict, Tuple

# Configuración de servicios
SERVICES = {
    "frontend": {
        "url": "http://localhost:8100/health",
        "port": 8100,
        "description": "Frontend (Nginx)"
    },
    "backend": {
        "url": "http://localhost:3000/api/health",
        "port": 3000,
        "description": "Backend (Node.js)"
    },
    "ml_service": {
        "url": "http://localhost:8000/health",
        "port": 8000,
        "description": "ML Service (FastAPI)"
    }
}

TIMEOUT = 5  # segundos


def check_service(name: str, config: Dict) -> Tuple[bool, str]:
    """
    Verifica el estado de un servicio.

    Args:
        name: Nombre del servicio
        config: Configuración del servicio

    Returns:
        Tupla (is_healthy, message)
    """
    try:
        response = requests.get(config["url"], timeout=TIMEOUT)
        if response.status_code == 200:
            return True, f"OK (status: {response.status_code})"
        else:
            return False, f"WARN (status: {response.status_code})"
    except requests.ConnectionError:
        return False, "ERROR: Connection refused"
    except requests.Timeout:
        return False, f"ERROR: Timeout ({TIMEOUT}s)"
    except Exception as e:
        return False, f"ERROR: {str(e)}"


def print_report(results: Dict[str, Tuple[bool, str]]) -> None:
    """Imprime reporte de estado."""
    print("\n" + "=" * 60)
    print(f"LUNGLIFE MVP - HEALTH CHECK REPORT")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 60)

    all_healthy = True

    for name, (is_healthy, message) in results.items():
        status = "✓" if is_healthy else "✗"
        config = SERVICES[name]
        print(f"\n{status} {config['description']}")
        print(f"  URL: {config['url']}")
        print(f"  Status: {message}")

        if not is_healthy:
            all_healthy = False

    print("\n" + "=" * 60)
    if all_healthy:
        print("RESULTADO: Todos los servicios están saludables ✓")
    else:
        print("RESULTADO: Algunos servicios tienen problemas ✗")
    print("=" * 60 + "\n")


def main():
    """Ejecuta health check de todos los servicios."""
    results = {}

    for name, config in SERVICES.items():
        is_healthy, message = check_service(name, config)
        results[name] = (is_healthy, message)

    print_report(results)

    # Exit code
    all_healthy = all(is_healthy for is_healthy, _ in results.values())
    sys.exit(0 if all_healthy else 1)


if __name__ == "__main__":
    main()
