"""
conftest.py - Configuracion global de pytest para el proyecto LRPD Big Data.
Proporciona fixtures de conexion reutilizables para todos los modulos de prueba.
"""
import os
import sys
import pytest
import psycopg2

# Agregar el directorio etl al path para acceder a config.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'etl'))

try:
    from config import DB_CASTILLONV2, DB_VETERINARIA, DB_SAMAR, DB_SIGA, DB_DW_OLAP
except ImportError:
    # Fallback: leer .env del directorio etl
    env_path = os.path.join(os.path.dirname(__file__), '..', 'etl', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())

    HOST = os.environ.get('AIVEN_HOST', '')
    PORT = os.environ.get('AIVEN_PORT', '16290')
    USER = os.environ.get('AIVEN_USER', 'avnadmin')
    PASS = os.environ.get('AIVEN_PASSWORD', '')
    BASE = f"postgres://{USER}:{PASS}@{HOST}:{PORT}"
    DB_CASTILLONV2 = f"{BASE}/castillonv2?sslmode=require"
    DB_VETERINARIA  = f"{BASE}/castillon_veterinaria?sslmode=require"
    DB_SAMAR        = f"{BASE}/samar_importadora?sslmode=require"
    DB_SIGA         = f"{BASE}/siga_1646?sslmode=require"
    DB_DW_OLAP      = f"{BASE}/dw_empresas_olap?sslmode=require"


def make_conn(uri: str):
    """Crea una conexion psycopg2 con autocommit desactivado."""
    conn = psycopg2.connect(uri)
    conn.autocommit = False
    return conn


# ---------------------------------------------------------------------------
# Fixtures de conexion por base de datos (scope=session para eficiencia)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def conn_castillonv2():
    conn = make_conn(DB_CASTILLONV2)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="session")
def conn_veterinaria():
    conn = make_conn(DB_VETERINARIA)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="session")
def conn_samar():
    conn = make_conn(DB_SAMAR)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="session")
def conn_siga():
    conn = make_conn(DB_SIGA)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="session")
def conn_dw():
    conn = make_conn(DB_DW_OLAP)
    yield conn
    conn.rollback()
    conn.close()


# ---------------------------------------------------------------------------
# Fixture transaccional para pruebas OLTP con rollback automatico
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def tx_castillonv2():
    """Conexion con rollback automatico al finalizar cada test OLTP."""
    conn = make_conn(DB_CASTILLONV2)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="function")
def tx_veterinaria():
    conn = make_conn(DB_VETERINARIA)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="function")
def tx_samar():
    conn = make_conn(DB_SAMAR)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="function")
def tx_siga():
    conn = make_conn(DB_SIGA)
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="function")
def tx_dw():
    conn = make_conn(DB_DW_OLAP)
    yield conn
    conn.rollback()
    conn.close()
