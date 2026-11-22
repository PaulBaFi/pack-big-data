"""
Pipeline ETL: Extraccion desde las 4 fuentes en Aiven PostgreSQL,
transformacion al modelo en estrella y carga en DW_Empresas_OLAP.
Soporta ejecucion manual e incremental, con registro de auditoria en etl_log_ejecucion.
"""

import sys
import os
import time
from datetime import datetime, date, timedelta
import psycopg2
from psycopg2.extras import execute_values

# Anadir directorio local al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import DB_CASTILLONV2, DB_VETERINARIA, DB_SAMAR, DB_SIGA, DB_DW_OLAP

def get_pg_conn(uri):
    conn = psycopg2.connect(uri)
    conn.autocommit = True
    return conn

def populate_dim_tiempo(dw_cur, start_year=2015, end_year=2026):
    print("  [ETL] Poblando Dimension Tiempo...")
    d_start = date(start_year, 1, 1)
    d_end = date(end_year, 12, 31)
    
    delta = timedelta(days=1)
    curr = d_start
    records = []
    
    nombres_mes = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
        5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
        9: 'Setiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }
    dias_semana = {
        0: 'Lunes', 1: 'Martes', 2: 'Miercoles', 3: 'Jueves',
        4: 'Viernes', 5: 'Sabado', 6: 'Domingo'
    }
    
    while curr <= d_end:
        id_t = curr.year * 10000 + curr.month * 100 + curr.day
        trimestre = (curr.month - 1) // 3 + 1
        semestre = 1 if curr.month <= 6 else 2
        dia_sem = dias_semana[curr.weekday()]
        es_fin = curr.weekday() in (5, 6)
        
        records.append((
            id_t, curr, curr.year, curr.month, nombres_mes[curr.month],
            trimestre, semestre, dia_sem, es_fin
        ))
        curr += delta
        
    sql = """
        INSERT INTO dim_tiempo (id_tiempo, fecha, anio, mes, nombre_mes, trimestre, semestre, dia_semana, es_fin_semana)
        VALUES %s
        ON CONFLICT (id_tiempo) DO NOTHING;
    """
    execute_values(dw_cur, sql, records, page_size=2000)
    print(f"    -> {len(records)} dias asegurados en dim_tiempo.")

def populate_dim_empresa(dw_cur, conn_c2, conn_vet, conn_samar, conn_siga):
    print("  [ETL] Poblando Dimension Empresa (Estratos y Contratistas MYPE)...")
    
    # 1. Castillon V2 (Microempresa)
    cur = conn_c2.cursor()
    cur.execute('SELECT "IDEMPRESA", "RUC", "RAZON_SOCIAL" FROM "EMPRESA";')
    c2_rows = cur.fetchall()
    cur.close()
    
    # 2. Veterinaria (Mediana Empresa)
    cur = conn_vet.cursor()
    cur.execute('SELECT "IDEMPRESA", "RUC", "RAZON_SOCIAL" FROM "EMPRESA";')
    vet_rows = cur.fetchall()
    cur.close()
    
    # 3. Samar Importadora (Gran Empresa)
    cur = conn_samar.cursor()
    cur.execute('SELECT DISTINCT "ID_CLIENTE", "NOMBRE", "APELLIDO" FROM "CLIENTES" WHERE "ID_CLIENTE" IS NOT NULL LIMIT 500;')
    samar_rows = cur.fetchall()
    cur.close()
    
    # 4. SIGA Contratistas (Estado / MYPEs y Grandes)
    cur = conn_siga.cursor()
    cur.execute('SELECT "PROVEEDOR", "NRO_RUC", "NOMBRE_PROV", "FLAG_MYPE" FROM "SIG_CONTRATISTAS";')
    siga_rows = cur.fetchall()
    cur.close()
    
    empresas = []
    
    # Micro
    for r in c2_rows:
        empresas.append((str(r[0]), str(r[2] or 'CASTILLON RESTAURANTE'), 'MICRO', 'PRIVADO', 'MYPE', 'CASTILLONV2'))
    if not c2_rows:
        empresas.append(('C2_MAIN', 'CASTILLONV2 RESTAURANTE', 'MICRO', 'PRIVADO', 'MYPE', 'CASTILLONV2'))
        
    # Mediana
    for r in vet_rows:
        empresas.append((str(r[0]), str(r[2] or 'CASTILLON VETERINARIA'), 'MEDIANA', 'PRIVADO', 'NO_MYPE', 'BD_CASTILLON_VETERINARIA'))
    if not vet_rows:
        empresas.append(('VET_MAIN', 'CASTILLON CLINICA VETERINARIA', 'MEDIANA', 'PRIVADO', 'NO_MYPE', 'BD_CASTILLON_VETERINARIA'))
        
    # Gran Empresa
    empresas.append(('SAMAR_CORP', 'SAMAR IMPORTADORA S.A.', 'GRANDE', 'PRIVADO', 'NO_MYPE', 'SamarImportadora'))
    for r in samar_rows:
        nom = f"{r[1] or ''} {r[2] or ''}".strip() or f"CLIENTE_SAMAR_{r[0]}"
        empresas.append((str(r[0]), nom, 'GRANDE', 'PRIVADO', 'NO_MYPE', 'SamarImportadora_Cliente'))
        
    # Sector Publico / SIGA
    for r in siga_rows:
        prov_id = str(r[0])
        nom = str(r[2] or f'PROVEEDOR_{prov_id}').strip()
        flag_raw = str(r[3] or '').strip().upper()
        flag_mype = 'MYPE' if flag_raw in ('S', '1', 'SI', 'MYPE') else 'NO_MYPE'
        empresas.append((prov_id, nom, 'ESTADO', 'PUBLICO', flag_mype, 'siga_1646'))
        
    sql = """
        INSERT INTO dim_empresa (codigo_origen, razon_social, estrato_tamanio, sector, flag_mype, fuente_origen)
        VALUES %s;
    """
    dw_cur.execute("TRUNCATE TABLE dim_empresa RESTART IDENTITY CASCADE;")
    execute_values(dw_cur, sql, empresas, page_size=2000)
    print(f"    -> {len(empresas)} registros insertados en dim_empresa.")

def populate_dim_ubicacion(dw_cur, conn_c2, conn_samar):
    print("  [ETL] Poblando Dimension Ubicacion Geografica...")
    cur = conn_samar.cursor()
    cur.execute("""
        SELECT c."COMUNA_NOMBRE", p."PROVINCIA_NOMBRE", r."REGION"
        FROM "COMUNA" c
        LEFT JOIN "PROVINCIA" p ON c."PROVINCIA_ID" = p."PROVINCIA_ID"
        LEFT JOIN "REGION" r ON p."REGION_ID" = r."REGION_ID";
    """)
    samar_locs = cur.fetchall()
    cur.close()
    
    cur = conn_c2.cursor()
    cur.execute("""
        SELECT d."NOMDISTRITO", p."NOMPROVINCIA", dep."NOMDEPARTAMENTO"
        FROM "DISTRITO" d
        LEFT JOIN "PROVINCIA" p ON d."IDPROVINCIA" = p."IDPROVINCIA"
        LEFT JOIN "DEPARTAMENTO" dep ON p."IDDEPARTAMENTO" = dep."IDDepartamento";
    """)
    c2_locs = cur.fetchall()
    cur.close()
    
    locs = set()
    for r in c2_locs:
        locs.add((r[2] or 'LIMA', r[1] or 'LIMA', r[0] or 'CENTRO', 'PERU'))
    for r in samar_locs:
        locs.add((r[2] or 'METROPOLITANA', r[1] or 'SANTIAGO', r[0] or 'CENTRO', 'CHILE'))
    locs.add(('LIMA', 'LIMA', 'LIMA', 'PERU'))
    
    dw_cur.execute("TRUNCATE TABLE dim_ubicacion RESTART IDENTITY CASCADE;")
    sql = "INSERT INTO dim_ubicacion (departamento, provincia, distrito_comuna, pais) VALUES %s;"
    execute_values(dw_cur, sql, list(locs), page_size=1000)
    print(f"    -> {len(locs)} ubicaciones cargadas en dim_ubicacion.")

def populate_dim_tipo_pago(dw_cur):
    print("  [ETL] Poblando Dimension Metodo de Pago...")
    metodos = [
        ('EFECTIVO', 'CONTADO'),
        ('TARJETA DE DEBITO', 'CONTADO'),
        ('TARJETA DE CREDITO', 'CREDITO'),
        ('TRANSFERENCIA BANCARIA', 'CONTADO'),
        ('YAPE / PLIN', 'CONTADO'),
        ('FACTURA A 30 DIAS', 'CREDITO'),
        ('FACTURA A 60 DIAS', 'CREDITO'),
        ('ORDEN DE COMPRA ESTATAL', 'GUBERNAMENTAL'),
        ('DEVENGADO SIAF/SIGA', 'GUBERNAMENTAL'),
        ('OTRO', 'CONTADO')
    ]
    dw_cur.execute("TRUNCATE TABLE dim_tipo_pago RESTART IDENTITY CASCADE;")
    sql = "INSERT INTO dim_tipo_pago (metodo_pago, tipo_transaccion) VALUES %s;"
    execute_values(dw_cur, sql, metodos)
    print(f"    -> {len(metodos)} metodos cargados en dim_tipo_pago.")

def populate_dim_categoria_item(dw_cur, conn_c2, conn_vet, conn_samar, conn_siga):
    print("  [ETL] Poblando Dimension Categoria / Items...")
    items = []
    
    # Castillon V2
    cur = conn_c2.cursor()
    cur.execute('SELECT p."IDPRODUCTO", p."NOMPRODUCTO", c."NOMCATEGORIA" FROM "PRODUCTO" p LEFT JOIN "CATEGORIA" c ON p."IDCATEGORIA" = c."IDCATEGORIA";')
    for r in cur.fetchall():
        items.append((f"C2_{r[0]}", r[1] or 'PLATO / BEBIDA', r[2] or 'RESTAURANTE', 'PRODUCTO', 'UNIDAD'))
    cur.close()
    
    # Veterinaria (NOMPRODUCTO y NOMCATEGORIA)
    cur = conn_vet.cursor()
    cur.execute('SELECT p."IDPRODUCTO", p."NOMPRODUCTO", c."NOMCATEGORIA" FROM "PRODUCTO" p LEFT JOIN "CATEGORIA" c ON p."IDCATEGORIA" = c."IDCATEGORIA";')
    for r in cur.fetchall():
        items.append((f"VET_{r[0]}", r[1] or 'MEDICAMENTO / ARTICULO', r[2] or 'CLINICA', 'PRODUCTO', 'UNIDAD'))
    items.append(('VET_SERV_CONSULTA', 'CONSULTA MEDICA GENERAL', 'SERVICIOS CLINICOS', 'SERVICIO', 'ATENCION'))
    items.append(('VET_SERV_CIRUGIA', 'CIRUGIA Y PROCEDIMIENTOS', 'SERVICIOS CLINICOS', 'SERVICIO', 'PROCEDIMIENTO'))
    cur.close()
    
    # Samar
    cur = conn_samar.cursor()
    cur.execute('SELECT "CODIGO_PRODUCTO", "NOMBRE", "CATEGORIA" FROM "ARTICULOS";')
    for r in cur.fetchall():
        items.append((f"SAMAR_{r[0]}", r[1] or 'ARTICULO MAYORISTA', r[2] or 'IMPORTACIONES', 'BIEN', 'UNIDAD'))
    cur.close()
    
    # SIGA Catalogo (muestra principal)
    cur = conn_siga.cursor()
    cur.execute('SELECT "ITEM_BIEN", "NOMBRE_ITEM", "TIPO_BIEN" FROM "CATALOGO_BIEN_SERV" LIMIT 5000;')
    for r in cur.fetchall():
        tipo = 'SERVICIO' if str(r[2]).upper() == 'S' else 'BIEN'
        items.append((f"SIGA_{r[0]}", r[1] or 'ITEM ESTATAL', 'ESTATAL', tipo, 'UNIDAD'))
    cur.close()
    
    dw_cur.execute("TRUNCATE TABLE dim_categoria_item RESTART IDENTITY CASCADE;")
    sql = "INSERT INTO dim_categoria_item (codigo_item, nombre_item, categoria, tipo_rubro, unidad_medida) VALUES %s;"
    execute_values(dw_cur, sql, items, page_size=2000)
    print(f"    -> {len(items)} items cargados en dim_categoria_item.")

def run_etl(trigger_user='BOTON_MANUAL'):
    print(f"\n=======================================================")
    print(f"Iniciando Pipeline ETL - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Disparador: {trigger_user}")
    print(f"=======================================================")
    
    t_start = datetime.now()
    t0 = time.time()
    
    # Conexiones
    conn_dw = get_pg_conn(DB_DW_OLAP)
    cur_dw = conn_dw.cursor()
    
    # Registrar inicio en etl_log_ejecucion
    cur_dw.execute("""
        INSERT INTO etl_log_ejecucion (fecha_inicio, estado, ejecutado_por)
        VALUES (%s, 'EN_PROCESO', %s) RETURNING id_log;
    """, (t_start, trigger_user))
    log_id = cur_dw.fetchone()[0]
    
    cnt_c2 = 0
    cnt_vet = 0
    cnt_samar = 0
    cnt_siga = 0
    
    try:
        conn_c2 = get_pg_conn(DB_CASTILLONV2)
        conn_vet = get_pg_conn(DB_VETERINARIA)
        conn_samar = get_pg_conn(DB_SAMAR)
        conn_siga = get_pg_conn(DB_SIGA)
        
        # 1. Poblar Dimensiones
        populate_dim_tiempo(cur_dw, 2015, 2026)
        populate_dim_empresa(cur_dw, conn_c2, conn_vet, conn_samar, conn_siga)
        populate_dim_ubicacion(cur_dw, conn_c2, conn_samar)
        populate_dim_tipo_pago(cur_dw)
        populate_dim_categoria_item(cur_dw, conn_c2, conn_vet, conn_samar, conn_siga)
        
        # Mapeos auxiliares para FKs rapidas
        cur_dw.execute("SELECT id_empresa, estrato_tamanio, fuente_origen, codigo_origen FROM dim_empresa;")
        empresa_map = cur_dw.fetchall()
        emp_c2 = next((r[0] for r in empresa_map if r[1] == 'MICRO'), 1)
        emp_vet = next((r[0] for r in empresa_map if r[1] == 'MEDIANA'), 1)
        emp_samar = next((r[0] for r in empresa_map if r[1] == 'GRANDE'), 1)
        
        siga_emp_map = {r[3]: r[0] for r in empresa_map if r[2] == 'siga_1646'}
        
        cur_dw.execute("SELECT id_tipo_pago, metodo_pago FROM dim_tipo_pago;")
        pago_map = {r[1]: r[0] for r in cur_dw.fetchall()}
        pago_def = next(iter(pago_map.values()), 1)
        
        cur_dw.execute("SELECT id_ubicacion FROM dim_ubicacion LIMIT 1;")
        ubicacion_def = cur_dw.fetchone()[0]
        
        cur_dw.execute("SELECT id_categoria FROM dim_categoria_item LIMIT 1;")
        cat_def = cur_dw.fetchone()[0]
        
        # Limpiar hechos antes de recarga total
        cur_dw.execute("TRUNCATE TABLE fact_ventas_privadas RESTART IDENTITY CASCADE;")
        cur_dw.execute("TRUNCATE TABLE fact_compras_estatales RESTART IDENTITY CASCADE;")
        
        # 2. Cargar Ventas CASTILLONV2 (Microempresa)
        print("  [ETL] Extrayendo y transformando ventas CASTILLONV2...")
        cur = conn_c2.cursor()
        cur.execute('SELECT "FECHAVENTA", "DOCUMENTO", "SUBTOTOTAL", "IGV", "TOTALPAGAR", "DESCUENTO" FROM "VENTAS";')
        c2_ventas = []
        for r in cur.fetchall():
            f = r[0]
            if not f: continue
            id_t = f.year * 10000 + f.month * 100 + f.day
            sub = float(r[2] or 0)
            igv = float(r[3] or 0)
            tot = float(r[4] or (sub + igv))
            desc = float(r[5] or 0)
            c2_ventas.append((
                id_t, emp_c2, ubicacion_def, cat_def, pago_def,
                r[1] or 'VENTA_C2', 'BOLETA', 1.0, sub, igv, tot, desc, tot
            ))
        cur.close()
        if c2_ventas:
            sql_vp = """
                INSERT INTO fact_ventas_privadas 
                (id_tiempo, id_empresa, id_ubicacion, id_categoria, id_tipo_pago, nro_comprobante, tipo_comprobante, cantidad, monto_subtotal, monto_impuesto, monto_total, descuento, ticket_promedio)
                VALUES %s;
            """
            execute_values(cur_dw, sql_vp, c2_ventas, page_size=2000)
            cnt_c2 = len(c2_ventas)
            print(f"    -> {cnt_c2} hechos insertados de CASTILLONV2 (Microempresa).")
            
        # 3. Cargar Ventas VETERINARIA (Mediana Empresa)
        print("  [ETL] Extrayendo y transformando ventas BD_CASTILLON_VETERINARIA...")
        cur = conn_vet.cursor()
        cur.execute('SELECT COALESCE("FECH_VENTA", "FECCRE"), "SUBTOTAL", "IGV", "MONTOTOTAL", "DESCUENTO", "TIPO_COMPROBANTE" FROM "VENTA";')
        vet_ventas = []
        for r in cur.fetchall():
            f = r[0]
            if not f: continue
            id_t = f.year * 10000 + f.month * 100 + f.day
            sub = float(r[1] or 0)
            igv = float(r[2] or 0)
            tot = float(r[3] or (sub + igv))
            desc = float(r[4] or 0)
            vet_ventas.append((
                id_t, emp_vet, ubicacion_def, cat_def, pago_def,
                'VENTA_VET', r[5] or 'BOLETA', 1.0, sub, igv, tot, desc, tot
            ))
        cur.close()
        if vet_ventas:
            execute_values(cur_dw, sql_vp, vet_ventas, page_size=2000)
            cnt_vet = len(vet_ventas)
            print(f"    -> {cnt_vet} hechos insertados de VETERINARIA (Mediana Empresa).")
            
        # 4. Cargar Ventas SAMAR (Gran Empresa)
        print("  [ETL] Extrayendo y transformando ventas SamarImportadora...")
        cur = conn_samar.cursor()
        cur.execute('SELECT "FECHA", "DOCUMENTO", "TIPO_DOCUMENTO", "TOTAL_NETO", "IMPUESTO", "TOTAL_DOCUMENTO" FROM "VENTAS";')
        samar_ventas = []
        for r in cur.fetchall():
            f = r[0]
            if not f: continue
            id_t = f.year * 10000 + f.month * 100 + f.day
            sub = float(r[3] or 0)
            igv = float(r[4] or 0)
            tot = float(r[5] or (sub + igv))
            samar_ventas.append((
                id_t, emp_samar, ubicacion_def, cat_def, pago_def,
                r[1] or 'DOC_SAMAR', r[2] or 'FACTURA', 1.0, sub, igv, tot, 0.0, tot
            ))
        cur.close()
        if samar_ventas:
            execute_values(cur_dw, sql_vp, samar_ventas, page_size=2000)
            cnt_samar = len(samar_ventas)
            print(f"    -> {cnt_samar} hechos insertados de SamarImportadora (Gran Empresa).")
            
        # 5. Cargar Compras del Estado (SIGA)
        print("  [ETL] Extrayendo compras publicas siga_1646 (MYPEs vs Grandes)...")
        cur = conn_siga.cursor()
        cur.execute("""
            SELECT o."ANO_EJE", o."NRO_ORDEN", o."FECHA_ORDEN", o."PROVEEDOR", o."TIPO_BIEN", o."TOTAL_FACT_SOLES", o."ESTADO", c."FLAG_MYPE"
            FROM "SIG_ORDEN_ADQUISICION" o
            LEFT JOIN "SIG_CONTRATISTAS" c ON o."PROVEEDOR" = c."PROVEEDOR";
        """)
        siga_compras = []
        for r in cur.fetchall():
            f = r[2]
            if not f:
                ano = int(r[0] or 2026)
                f = date(ano, 1, 1)
            id_t = f.year * 10000 + f.month * 100 + f.day
            prov_id = str(r[3])
            emp_id = siga_emp_map.get(prov_id, emp_samar)
            
            flag_raw = str(r[7] or '').strip().upper()
            flag_mype = 'MYPE' if flag_raw in ('S', '1', 'SI', 'MYPE') else 'NO_MYPE'
            monto = float(r[5] or 0)
            tipo_b = 'B' if str(r[4]).upper() == 'B' else 'S'
            
            siga_compras.append((
                id_t, emp_id, ubicacion_def, cat_def,
                str(r[1]), int(r[0] or f.year), tipo_b, monto, 1.0, monto, flag_mype, r[6] or 'ATENDIDO'
            ))
        cur.close()
        if siga_compras:
            sql_ce = """
                INSERT INTO fact_compras_estatales
                (id_tiempo, id_proveedor, id_ubicacion, id_categoria, nro_orden, ano_eje, tipo_bien, monto_adjudicado, cantidad_items, precio_unitario, flag_proveedor_mype, estado_orden)
                VALUES %s;
            """
            execute_values(cur_dw, sql_ce, siga_compras, page_size=2000)
            cnt_siga = len(siga_compras)
            print(f"    -> {cnt_siga} hechos insertados de SIGA (Compras Publicas y MYPEs).")
            
        # Cerrar fuentes
        conn_c2.close()
        conn_vet.close()
        conn_samar.close()
        conn_siga.close()
        
        # Registrar finalizacion exitosa
        total_rows = cnt_c2 + cnt_vet + cnt_samar + cnt_siga
        t_end = datetime.now()
        dur = time.time() - t0
        
        cur_dw.execute("""
            UPDATE etl_log_ejecucion
            SET fecha_fin = %s,
                duracion_segundos = %s,
                estado = 'COMPLETADO',
                filas_castillonv2 = %s,
                filas_veterinaria = %s,
                filas_samar = %s,
                filas_siga = %s,
                total_filas_cargadas = %s
            WHERE id_log = %s;
        """, (t_end, round(dur, 2), cnt_c2, cnt_vet, cnt_samar, cnt_siga, total_rows, log_id))
        
        print(f"\n=======================================================")
        print(f"ETL FINALIZADA CON EXITO en {dur:.2f}s")
        print(f"Total registros cargados en DW: {total_rows}")
        print(f"  - CastillonV2 (Micro): {cnt_c2}")
        print(f"  - Veterinaria (Mediana): {cnt_vet}")
        print(f"  - Samar (Gran Empresa): {cnt_samar}")
        print(f"  - SIGA (Estado / MYPEs): {cnt_siga}")
        print(f"=======================================================\n")
        
    except Exception as e:
        dur = time.time() - t0
        cur_dw.execute("""
            UPDATE etl_log_ejecucion
            SET fecha_fin = %s,
                duracion_segundos = %s,
                estado = 'ERROR',
                mensaje_error = %s
            WHERE id_log = %s;
        """, (datetime.now(), round(dur, 2), str(e), log_id))
        print(f"[ERROR EN ETL]: {e}")
        raise e
    finally:
        cur_dw.close()
        conn_dw.close()

if __name__ == '__main__':
    run_etl('BOTON_MANUAL')
