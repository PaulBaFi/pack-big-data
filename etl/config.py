import os

# Cargar variables desde .env si existe
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

AIVEN_HOST = os.environ.get("AIVEN_HOST", "pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com")
AIVEN_PORT = os.environ.get("AIVEN_PORT", "16290")
AIVEN_USER = os.environ.get("AIVEN_USER", "avnadmin")
AIVEN_PASSWORD = os.environ.get("AIVEN_PASSWORD", "")

DB_CASTILLONV2 = os.environ.get("DB_CASTILLONV2") or f"postgres://{AIVEN_USER}:{AIVEN_PASSWORD}@{AIVEN_HOST}:{AIVEN_PORT}/castillonv2?sslmode=require"
DB_VETERINARIA = os.environ.get("DB_VETERINARIA") or f"postgres://{AIVEN_USER}:{AIVEN_PASSWORD}@{AIVEN_HOST}:{AIVEN_PORT}/castillon_veterinaria?sslmode=require"
DB_SAMAR       = os.environ.get("DB_SAMAR")       or f"postgres://{AIVEN_USER}:{AIVEN_PASSWORD}@{AIVEN_HOST}:{AIVEN_PORT}/samar_importadora?sslmode=require"
DB_SIGA        = os.environ.get("DB_SIGA")        or f"postgres://{AIVEN_USER}:{AIVEN_PASSWORD}@{AIVEN_HOST}:{AIVEN_PORT}/siga_1646?sslmode=require"
DB_DW_OLAP     = os.environ.get("DB_DW_OLAP")     or f"postgres://{AIVEN_USER}:{AIVEN_PASSWORD}@{AIVEN_HOST}:{AIVEN_PORT}/dw_empresas_olap?sslmode=require"
