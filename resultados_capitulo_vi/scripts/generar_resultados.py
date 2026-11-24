from pathlib import Path
import json, shutil, zipfile
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'resultados_capitulo_vi'
RAW = json.loads((BASE/'evidencias/resultados_ejecucion.json').read_text(encoding='utf-8'))
DATE = RAW['metadata']['finished_at']
sns.set_theme(style='whitegrid', palette='deep')
plt.rcParams.update({'figure.dpi':120,'savefig.dpi':300,'font.size':9})

for d in ['6.2_resultados_etl/graficos','6.3_resultados_dw/graficos','6.4_analisis_descriptivo/graficos','6.5_analisis_exploratorio/graficos']:
    (BASE/d).mkdir(parents=True,exist_ok=True)

def csv(df, rel):
    p=BASE/rel; p.parent.mkdir(parents=True,exist_ok=True); df.to_csv(p,index=False,encoding='utf-8-sig'); return df
def num(df, cols):
    for c in cols:
        if c in df: df[c]=pd.to_numeric(df[c],errors='coerce')
    return df
def figsave(rel):
    plt.tight_layout(); plt.savefig(BASE/rel,bbox_inches='tight'); plt.close()
def mdtable(df):
    clean=df.copy().fillna('No disponible').astype(str)
    headers=list(clean.columns)
    rows=['| '+' | '.join(headers)+' |','|'+'|'.join(['---']*len(headers))+'|']
    rows += ['| '+' | '.join(v.replace('|','/') for v in row)+' |' for row in clean.itertuples(index=False,name=None)]
    return '\n'.join(rows)

# Datos base anonimizados
src=pd.DataFrame([x['summary'] for x in RAW['sources']])
dups=pd.DataFrame([x['duplicate'] for x in RAW['sources']])
nulls=pd.DataFrame([n for x in RAW['sources'] for n in x['nulls']])
nulls['porcentaje_nulos']=np.where(nulls.evaluados>0,nulls.nulos/nulls.evaluados*100,np.nan)
private=pd.DataFrame(RAW['dw']['privateRows']); public=pd.DataFrame(RAW['dw']['publicRows'])
for df in [private,public]: df['fecha']=pd.to_datetime(df['fecha'],utc=True).dt.tz_convert(None)
num(private,['anio','mes','trimestre','monto_subtotal','monto_impuesto','monto_total','descuento'])
num(public,['anio','mes','trimestre','monto_adjudicado','cantidad_items','precio_unitario'])
source_map={'CASTILLONV2':'Castillon V2','BD_CASTILLON_VETERINARIA':'Castillon Veterinaria','SamarImportadora':'Samar Importadora'}
private['fuente']=private.fuente_origen.map(source_map).fillna(private.fuente_origen)
private['moneda']=private.fuente.map({'Castillon V2':'PEN','Castillon Veterinaria':'PEN','Samar Importadora':'CLP no confirmado'})
public['fuente']='SIGA 1646'; public['moneda']='PEN'

# 6.2 ETL
loaded=private.groupby('fuente').size().to_dict(); loaded['SIGA 1646']=len(public)
dest={'Castillon V2':'fact_ventas_privadas','Castillon Veterinaria':'fact_ventas_privadas','Samar Importadora':'fact_ventas_privadas','SIGA 1646':'fact_compras_estatales'}
etl=src[['fuente','tabla_origen','registros_disponibles']].copy(); etl['registros_extraidos']=etl.fuente.map(loaded); etl['diferencia']=etl.registros_disponibles-etl.registros_extraidos; etl['tabla_destino']=etl.fuente.map(dest)
csv(etl,'6.2_resultados_etl/registros_extraidos.csv')
discard=etl.loc[etl.diferencia>0,['fuente','diferencia']].rename(columns={'diferencia':'registros_descartados'}); discard['motivo']='Fecha nula: el ETL omite filas sin fecha'; discard['regla_aplicada']='if (!f) continue'
csv(discard,'6.2_resultados_etl/registros_eliminados.csv')
dups['duplicados_eliminados']='No disponible'; dups['duplicados_restantes']='0 en DW según clave de auditoría'; csv(dups,'6.2_resultados_etl/duplicados.csv')
nulls['tratamiento_aplicado']='Según campo: valor derivado, predeterminado o descarte por fecha'; nulls['nulos_restantes']='No disponible por campo en log ETL'; csv(nulls,'6.2_resultados_etl/valores_nulos.csv')
trans=etl[['fuente','registros_extraidos']].copy(); trans['transformacion_aplicada']='Fecha→YYYYMMDD; importes→numérico; empresa→estrato; claves dimensionales'; trans['registros_afectados']='No instrumentado'; trans['resultado']='Hechos cargados, salvo filas descartadas'; csv(trans,'6.2_resultados_etl/registros_transformados.csv')
loaded_df=etl.rename(columns={'registros_extraidos':'extraidos'}); loaded_df['descartados']=loaded_df.diferencia; loaded_df['transformados']='No disponible'; loaded_df['cargados']=loaded_df.fuente.map(loaded); loaded_df['diferencia_carga']=loaded_df.extraidos-loaded_df.cargados; loaded_df['estado']=np.where(loaded_df.diferencia_carga==0,'CONCILIADO','REVISAR'); csv(loaded_df[['fuente','extraidos','descartados','transformados','cargados','diferencia_carga','estado']],'6.2_resultados_etl/registros_cargados.csv')
logs=num(pd.DataFrame(RAW['dw']['logs']),['id_log','duracion_segundos','total_filas_cargadas']); logs['registros_por_segundo']=np.where((logs.estado=='COMPLETADO')&(logs.duracion_segundos>0),logs.total_filas_cargadas/logs.duracion_segundos,np.nan); logs['duracion_minutos']=logs.duracion_segundos/60; csv(logs,'6.2_resultados_etl/tiempos_ejecucion.csv')
con_etl=pd.DataFrame([{'indicador':'Fuentes','valor':4},{'indicador':'Disponibles','valor':etl.registros_disponibles.sum()},{'indicador':'Cargados actuales','valor':sum(loaded.values())},{'indicador':'Ejecuciones registradas','valor':len(logs)},{'indicador':'Ejecuciones completadas','valor':(logs.estado=='COMPLETADO').sum()},{'indicador':'Ejecuciones con error','valor':(logs.estado=='ERROR').sum()}]); csv(con_etl,'6.2_resultados_etl/consolidado_etl.csv')

plt.figure(figsize=(7,4)); x=np.arange(len(etl)); plt.bar(x-.18,etl.registros_disponibles,.36,label='Disponibles'); plt.bar(x+.18,etl.registros_extraidos,.36,label='Cargados'); plt.xticks(x,etl.fuente,rotation=20,ha='right'); plt.ylabel('Registros'); plt.title('Registros disponibles y cargados por fuente'); plt.legend(); figsave('6.2_resultados_etl/graficos/etl_registros_fuente.png')
plt.figure(figsize=(7,4)); sns.barplot(data=dups,x='fuente',y='duplicados_excedentes'); plt.xticks(rotation=20,ha='right'); plt.title('Duplicados excedentes por fuente'); plt.ylabel('Registros'); figsave('6.2_resultados_etl/graficos/etl_duplicados.png')
plt.figure(figsize=(9,4)); nn=nulls[nulls.nulos>0]; sns.barplot(data=nn,x='campo',y='nulos',hue='fuente'); plt.xticks(rotation=35,ha='right'); plt.title('Valores nulos detectados en campos evaluados'); figsave('6.2_resultados_etl/graficos/etl_nulos.png')
plt.figure(figsize=(7,4)); completed=logs[logs.estado=='COMPLETADO']; sns.lineplot(data=completed,x='id_log',y='duracion_segundos',marker='o'); plt.title('Duración de ejecuciones ETL completadas'); plt.ylabel('Segundos'); figsave('6.2_resultados_etl/graficos/etl_duracion.png')

# 6.3 DW
facts=num(pd.DataFrame(RAW['dw']['facts']),['registros']); facts['proceso_negocio']=['Ventas privadas','Compras estatales']; facts['granularidad']=['Una fila por venta/documento extraído','Una fila por orden de adquisición extraída']; csv(facts[['tabla','proceso_negocio','granularidad','registros','fecha_min','fecha_max']],'6.3_resultados_dw/tablas_hechos.csv')
dims=num(pd.DataFrame(RAW['dw']['dimensions']),['registros']); dim_meta={'dim_tiempo':('id_tiempo','fecha, año, mes, trimestre, semestre','Ambas tablas de hechos'),'dim_empresa':('id_empresa','código origen, razón social, estrato, MYPE','Ambas tablas de hechos'),'dim_ubicacion':('id_ubicacion','departamento, provincia, distrito, país','Ambas tablas de hechos'),'dim_categoria_item':('id_categoria','código, nombre, categoría, rubro','Ambas tablas de hechos'),'dim_tipo_pago':('id_tipo_pago','método, tipo transacción','fact_ventas_privadas')}; dims['clave_primaria']=dims.tabla.map(lambda x:dim_meta[x][0]); dims['atributos_principales']=dims.tabla.map(lambda x:dim_meta[x][1]); dims['tabla_hechos_relacionada']=dims.tabla.map(lambda x:dim_meta[x][2]); csv(dims,'6.3_resultados_dw/dimensiones.csv')
hist_priv=private.groupby(['fuente','anio']).agg(registros=('monto_total','size'),fecha_inicial=('fecha','min'),fecha_final=('fecha','max')).reset_index(); hist_pub=public.groupby(['fuente','anio']).agg(registros=('monto_adjudicado','size'),fecha_inicial=('fecha','min'),fecha_final=('fecha','max')).reset_index(); historical=pd.concat([hist_priv,hist_pub]); csv(historical,'6.3_resultados_dw/registros_historicos.csv')
integ_raw={k:int(v) for k,v in RAW['dw']['integrity'].items()}; labels={'orphan_time_private':'Huérfanos tiempo ventas','orphan_company_private':'Huérfanos empresa ventas','orphan_provider_public':'Huérfanos proveedor compras','duplicate_private':'Duplicados hechos ventas','duplicate_public':'Duplicados hechos compras','invalid_private_amount':'Importes inválidos ventas','invalid_public_amount':'Importes inválidos compras','invalid_company_class':'Clasificaciones inválidas'}; integ=pd.DataFrame([{'codigo':f'INT-{i:03}','control':labels[k],'registros_evaluados':len(private) if 'private' in k or 'ventas' in labels[k] else len(public) if 'public' in k or 'compras' in labels[k] else len(dims),'incidencias':v} for i,(k,v) in enumerate(integ_raw.items(),1)]); integ['cumplimiento_pct']=np.where(integ.registros_evaluados>0,(integ.registros_evaluados-integ.incidencias)/integ.registros_evaluados*100,np.nan); integ['estado']=np.where(integ.incidencias==0,'APROBADO','REVISAR'); csv(integ,'6.3_resultados_dw/integridad.csv')
recon=etl[['fuente','registros_disponibles','registros_extraidos','diferencia']].copy(); recon['estado']=np.where(recon.diferencia==0,'CONCILIADO','DIFERENCIA EXPLICADA/PENDIENTE'); csv(recon,'6.3_resultados_dw/conciliacion.csv')
con_dw=pd.DataFrame([{'indicador':'Tablas de hechos','valor':len(facts)},{'indicador':'Dimensiones','valor':len(dims)},{'indicador':'Registros de hechos','valor':facts.registros.sum()},{'indicador':'Registros dimensionales','valor':dims.registros.sum()},{'indicador':'Incidencias controles DW','valor':integ.incidencias.sum()}]); csv(con_dw,'6.3_resultados_dw/consolidado_dw.csv')
plt.figure(figsize=(6,4)); sns.barplot(data=facts,x='tabla',y='registros'); plt.xticks(rotation=15); plt.title('Registros por tabla de hechos'); figsave('6.3_resultados_dw/graficos/dw_hechos.png')
plt.figure(figsize=(7,4)); sns.barplot(data=dims,x='tabla',y='registros'); plt.xticks(rotation=25,ha='right'); plt.title('Registros por dimensión'); figsave('6.3_resultados_dw/graficos/dw_dimensiones.png')
plt.figure(figsize=(8,4)); sns.lineplot(data=historical,x='anio',y='registros',hue='fuente',marker='o'); plt.yscale('log'); plt.title('Distribución histórica por fuente (escala logarítmica)'); figsave('6.3_resultados_dw/graficos/dw_historia.png')

# 6.4 descriptivo, sin sumar monedas distintas
priv_group=private.groupby(['fuente','moneda']).monto_total.agg(['count','sum','mean','median','std','min','max']).reset_index(); pub_group=public.groupby(['fuente','moneda']).monto_adjudicado.agg(['count','sum','mean','median','std','min','max']).reset_index(); totals=pd.concat([priv_group,pub_group]); csv(totals[['fuente','moneda','count','sum']].rename(columns={'count':'transacciones','sum':'total'}),'6.4_analisis_descriptivo/totales.csv'); csv(totals[['fuente','moneda','mean','median','std']],'6.4_analisis_descriptivo/promedios.csv'); csv(totals[['fuente','moneda','max']],'6.4_analisis_descriptivo/maximos.csv'); csv(totals[['fuente','moneda','min']],'6.4_analisis_descriptivo/minimos.csv')
freq=private.groupby(['fuente','anio']).size().rename('frecuencia_absoluta').reset_index(); freq['frecuencia_relativa_pct']=freq.groupby('fuente').frecuencia_absoluta.transform(lambda x:x/x.sum()*100); csv(freq,'6.4_analisis_descriptivo/frecuencias.csv')
comparisons=pd.concat([private.groupby(['fuente','moneda']).agg(transacciones=('monto_total','size'),total=('monto_total','sum'),ticket_promedio=('monto_total','mean')).reset_index(),public.groupby(['fuente','moneda']).agg(transacciones=('monto_adjudicado','size'),total=('monto_adjudicado','sum'),ticket_promedio=('monto_adjudicado','mean')).reset_index()]); csv(comparisons,'6.4_analisis_descriptivo/comparaciones.csv')
monthly_priv=private.assign(periodo=private.fecha.dt.to_period('M').astype(str)).groupby(['fuente','moneda','periodo']).agg(transacciones=('monto_total','size'),total=('monto_total','sum'),ticket=('monto_total','mean')).reset_index(); monthly_pub=public.assign(periodo=public.fecha.dt.to_period('M').astype(str)).groupby(['fuente','moneda','periodo']).agg(transacciones=('monto_adjudicado','size'),total=('monto_adjudicado','sum'),ticket=('monto_adjudicado','mean')).reset_index(); trends=pd.concat([monthly_priv,monthly_pub]); trends['variacion_pct']=trends.groupby('fuente').total.pct_change(fill_method=None)*100; csv(trends,'6.4_analisis_descriptivo/tendencias.csv')
stats_rows=[]
for source,g in [(n,g) for n,g in private.groupby('fuente')]+[('SIGA 1646',public)]:
    col='monto_adjudicado' if source=='SIGA 1646' else 'monto_total'; v=g[col].dropna(); stats_rows.append({'fuente':source,'variable':col,'n':len(v),'total':v.sum(),'media':v.mean(),'mediana':v.median(),'desviacion_estandar':v.std(),'minimo':v.min(),'q1':v.quantile(.25),'q3':v.quantile(.75),'maximo':v.max(),'moneda':g.moneda.iloc[0]})
desc=pd.DataFrame(stats_rows); csv(desc,'6.4_analisis_descriptivo/estadistica_descriptiva.csv')
plt.figure(figsize=(7,4)); sns.barplot(data=comparisons,x='fuente',y='total',hue='moneda'); plt.xticks(rotation=20,ha='right'); plt.title('Totales por fuente (no sumar entre monedas)'); figsave('6.4_analisis_descriptivo/graficos/totales_fuente.png')
plt.figure(figsize=(8,4)); for_plot=trends[trends.fuente!='Samar Importadora']; sns.lineplot(data=for_plot,x='periodo',y='total',hue='fuente'); plt.xticks(for_plot.periodo.iloc[::max(1,len(for_plot)//12)],rotation=45,ha='right'); plt.title('Evolución mensual en fuentes expresadas en PEN'); figsave('6.4_analisis_descriptivo/graficos/evolucion_mensual_pen.png')

# 6.5 EDA
out=[]
for _,r in desc.iterrows():
    iqr=r.q3-r.q1; lo=r.q1-1.5*iqr; hi=r.q3+1.5*iqr; frame=public if r.fuente=='SIGA 1646' else private[private.fuente==r.fuente]; v=frame[r.variable]; n=((v<lo)|(v>hi)).sum(); out.append({'fuente':r.fuente,'variable':r.variable,'q1':r.q1,'q3':r.q3,'iqr':iqr,'limite_inferior':lo,'limite_superior':hi,'atipicos':n,'porcentaje':n/len(v)*100})
outliers=pd.DataFrame(out); csv(outliers,'6.5_analisis_exploratorio/datos_atipicos.csv')
patterns=comparisons.copy(); patterns['participacion_transacciones_pct']=patterns.transacciones/patterns.transacciones.sum()*100; csv(patterns,'6.5_analisis_exploratorio/patrones.csv')
season=pd.concat([private.groupby(['fuente','mes']).agg(registros=('monto_total','size'),monto=('monto_total','sum')).reset_index(),public.groupby(['fuente','mes']).agg(registros=('monto_adjudicado','size'),monto=('monto_adjudicado','sum')).reset_index()]); csv(season,'6.5_analisis_exploratorio/estacionalidad.csv')
corr=[]
for source,g in trends.groupby('fuente'):
    if len(g)>=3 and g.transacciones.nunique()>1 and g.total.nunique()>1:
        coef,p=stats.spearmanr(g.transacciones,g.total); corr.append({'variable_x':'transacciones mensuales','variable_y':'monto mensual','fuente':source,'metodo':'Spearman','observaciones':len(g),'coeficiente':coef,'valor_p':p,'interpretacion':'Asociación, no causalidad'})
corr=pd.DataFrame(corr); csv(corr,'6.5_analisis_exploratorio/correlaciones.csv')
hall=[]
for _,r in outliers.iterrows(): hall.append({'codigo':f'H-{len(hall)+1:03}','descripcion':'Importes fuera de límites IQR','indicador':'Atípicos IQR','resultado_cuantitativo':f"{int(r.atipicos)} ({r.porcentaje:.2f}%)",'fuente':r.fuente,'periodo':'Cobertura completa disponible','evidencia':'datos_atipicos.csv','interpretacion':'Operaciones inusuales que requieren contexto; no se eliminan','limitacion':'IQR estadístico no prueba error','utilidad':'Priorización de revisión'})
hall.append({'codigo':f'H-{len(hall)+1:03}','descripcion':'Diferencia origen-destino Castillon V2','indicador':'Conciliación de filas','resultado_cuantitativo':f"{int(etl.loc[etl.fuente=='Castillon V2','diferencia'].iloc[0])} fila",'fuente':'Castillon V2','periodo':'Fecha de extracción','evidencia':'registros_extraidos.csv','interpretacion':'El ETL omite fecha nula','limitacion':'No implica eliminación física del origen','utilidad':'Mejorar calidad de fechas'}); csv(pd.DataFrame(hall),'6.5_analisis_exploratorio/hallazgos.csv')
plt.figure(figsize=(9,5)); sns.boxplot(data=pd.concat([private[['fuente','monto_total']].rename(columns={'monto_total':'monto'}),public[['fuente','monto_adjudicado']].rename(columns={'monto_adjudicado':'monto'})]),x='fuente',y='monto',showfliers=False); plt.yscale('symlog'); plt.xticks(rotation=20); plt.title('Distribución de importes por fuente (escala simétrica logarítmica)'); figsave('6.5_analisis_exploratorio/graficos/boxplot_importes.png')
heat=private.groupby(['mes','fuente']).size().unstack(fill_value=0); plt.figure(figsize=(7,4)); sns.heatmap(heat,annot=True,fmt='g',cmap='Blues'); plt.title('Actividad de ventas por mes y fuente'); figsave('6.5_analisis_exploratorio/graficos/mapa_calor_mensual.png')
if not corr.empty:
    plt.figure(figsize=(7,4)); sns.scatterplot(data=trends,x='transacciones',y='total',hue='fuente'); plt.title('Transacciones y monto mensual por fuente'); figsave('6.5_analisis_exploratorio/graficos/dispersion_transacciones_monto.png')

# Excel consolidado
with pd.ExcelWriter(BASE/'resultados_capitulo_vi.xlsx',engine='openpyxl') as w:
    for name,df in {'ETL':etl,'Nulos':nulls,'Duplicados':dups,'Ejecuciones_ETL':logs,'Hechos':facts,'Dimensiones':dims,'Historico':historical,'Integridad':integ,'Totales':comparisons,'Tendencias':trends,'Estadistica':desc,'Atipicos':outliers,'Correlaciones':corr,'Hallazgos':pd.DataFrame(hall)}.items(): df.to_excel(w,sheet_name=name[:31],index=False)

# Documentos técnicos
etl_md=f'''# 6.2 Resultados del proceso ETL\n\nFecha de consulta: {DATE}. La implementación activa es `admin-olap/src/lib/etl-engine.ts`, invocada por `/api/etl/run` y por el cron. Se confirmó recarga completa mediante `TRUNCATE`; no se ejecutó durante este análisis.\n\n## Extracción y carga\n\n{mdtable(etl)}\n\nEl total disponible fue {etl.registros_disponibles.sum():,.0f} y el DW contiene {sum(loaded.values()):,.0f} hechos atribuibles. Castillon V2 presenta una diferencia de una fila por fecha nula y por la regla `if (!f) continue`. Las cantidades de registros únicos transformados y descartes históricos no están instrumentadas; se indican como no disponibles.\n\n## Duplicados\n\n{mdtable(dups)}\n\n## Ejecuciones\n\nSe registraron {len(logs)} ejecuciones: {(logs.estado=='COMPLETADO').sum()} completadas y {(logs.estado=='ERROR').sum()} con error. En completadas, duración mínima {completed.duracion_segundos.min():.2f} s, máxima {completed.duracion_segundos.max():.2f} s y promedio {completed.duracion_segundos.mean():.2f} s.\n'''
(BASE/'6.2_resultados_etl/resultados_etl.md').write_text(etl_md,encoding='utf-8')
dw_md=f'''# 6.3 Resultados del Data Warehouse\n\nFecha de consulta: {DATE}. Modelo con {len(facts)} tablas de hechos y {len(dims)} dimensiones.\n\n## Hechos\n\n{mdtable(facts)}\n\n## Dimensiones\n\n{mdtable(dims)}\n\n## Integridad\n\n{mdtable(integ)}\n\nLos controles ejecutados no encontraron incidencias, pero esto no equivale a certificar calidad total: no cubren exactitud semántica ni monedas.\n'''; (BASE/'6.3_resultados_dw/resultados_dw.md').write_text(dw_md,encoding='utf-8')
ad_md=f'''# 6.4 Análisis descriptivo\n\nFecha de consulta: {DATE}. Los importes se analizaron por fuente y moneda, sin sumar Samar con fuentes PEN. La moneda de Samar se marca como no confirmada documentalmente.\n\n{mdtable(desc.round(2))}\n\nLa granularidad observada es una fila por registro extraído; el ticket se calcula por fila de hecho y no necesariamente por documento comercial único.\n'''; (BASE/'6.4_analisis_descriptivo/analisis_descriptivo.md').write_text(ad_md,encoding='utf-8')
eda_md=f'''# 6.5 Análisis exploratorio\n\nFecha de consulta: {DATE}. Se aplicó IQR por fuente y correlación de Spearman sobre agregados mensuales con variación suficiente.\n\n## Valores atípicos\n\n{mdtable(outliers.round(3))}\n\n## Correlaciones\n\n{mdtable(corr.round(4)) if not corr.empty else 'No hubo pares con variación y observaciones suficientes.'}\n\nLos atípicos son observaciones estadísticas, no errores demostrados. No se eliminó ningún dato. La estacionalidad no se afirma cuando no existen ciclos completos suficientes.\n'''; (BASE/'6.5_analisis_exploratorio/analisis_eda.md').write_text(eda_md,encoding='utf-8')

summary=f'''# Resumen ejecutivo\n\nExtracción de solo lectura finalizada el {DATE}. Se analizaron {etl.registros_disponibles.sum():,.0f} registros de origen y {facts.registros.sum():,.0f} hechos. El DW contiene {dims.registros.sum():,.0f} filas dimensionales. Se identificó una diferencia de una fila en Castillon V2 por fecha nula; las demás fuentes conciliaron por conteo. No se mezclaron importes de Samar con fuentes PEN porque su moneda requiere confirmación documental.\n'''; (BASE/'RESUMEN_EJECUTIVO.md').write_text(summary,encoding='utf-8')
limitations='''# Limitaciones\n\n- La moneda de Samar no está almacenada en el esquema dimensional y debe confirmarse documentalmente.\n- El ETL no registra conteos por regla de transformación, descarte ni etapa; esas métricas son no disponibles.\n- La recarga completa impide reconstruir históricamente qué filas fueron reemplazadas en cada ejecución.\n- Categoría, ubicación y método de pago usan asignaciones genéricas en la implementación TypeScript; limitan el análisis detallado.\n- Una fila de hecho se trata como transacción extraída; no se validó que equivalga siempre a un documento comercial único.\n- Los controles de integridad cubren reglas estructurales, no exactitud semántica completa.\n- No se ejecutó ETL ni se modificaron datos históricos.\n'''; (BASE/'LIMITACIONES.md').write_text(limitations,encoding='utf-8')

dictionary=pd.DataFrame([
['Registros cargados','Filas presentes en la tabla de hechos','COUNT(*)','fact_*','id_hecho','registro','Por ejecución/consulta','Recarga completa'],
['Total monetario','Suma por fuente y moneda','SUM(monto)','fact_ventas_privadas / fact_compras_estatales','monto_total / monto_adjudicado','moneda de fuente','Consulta','No sumar monedas distintas'],
['Ticket promedio','Media por fila de hecho','AVG(monto)','fact_*','monto_total / monto_adjudicado','moneda por hecho','Consulta','Puede no equivaler a documento único'],
['Participación MYPE','Monto MYPE sobre monto estatal','SUM(MYPE)/SUM(total)*100','fact_compras_estatales','flag_proveedor_mype,monto_adjudicado','porcentaje','Consulta','No MYPE no implica gran empresa'],
['Atípicos IQR','Importes fuera de Q1−1.5IQR y Q3+1.5IQR','Regla IQR por fuente','fact_*','monto','registro/porcentaje','Análisis','No prueba error']
],columns=['Indicador','Definición','Fórmula','Tabla','Campo','Unidad','Periodicidad','Limitación']);
(BASE/'DICCIONARIO_INDICADORES.md').write_text('# Diccionario de indicadores\n\n'+mdtable(dictionary),encoding='utf-8')

main=f'''# Informe consolidado del capítulo VI\n\n## Entorno y alcance\n\nExtracción: {DATE}; modo: solo lectura; ETL no ejecutado. Fuentes: Castillon V2, Castillon Veterinaria, Samar Importadora y SIGA 1646. Periodo efectivo: {min(private.fecha.min(),public.fecha.min()).date()} a {max(private.fecha.max(),public.fecha.max()).date()}. Castillon y SIGA se tratan como PEN; Samar queda separado porque su moneda no está documentada en el DW.\n\n## 6.2 ETL\n\n{mdtable(etl)}\n\nEjecuciones: {len(logs)} totales, {(logs.estado=='COMPLETADO').sum()} completadas. Duración completada mínima/promedio/máxima: {completed.duracion_segundos.min():.2f}/{completed.duracion_segundos.mean():.2f}/{completed.duracion_segundos.max():.2f} s. Los descartes y transformaciones por regla no están instrumentados.\n\n## 6.3 Data Warehouse\n\n{mdtable(facts)}\n\n{mdtable(dims)}\n\nLos {len(integ)} controles estructurales reportaron {integ.incidencias.sum()} incidencias. Esto no implica calidad absoluta.\n\n## 6.4 Estadística descriptiva\n\n{mdtable(desc.round(2))}\n\n## 6.5 EDA\n\n{mdtable(outliers.round(2))}\n\n{mdtable(corr.round(4)) if not corr.empty else 'Correlaciones no calculables.'}\n\n## Hallazgos y conclusiones\n\n- El DW contiene {facts.registros.sum():,.0f} hechos y {dims.registros.sum():,.0f} filas dimensionales.\n- Tres fuentes concilian por conteo; Castillon V2 difiere en una fila sin fecha, omitida por el ETL.\n- El origen Castillon V2 contiene {int(dups.loc[dups.fuente=='Castillon V2','duplicados_excedentes'].iloc[0])} duplicados excedentes según `DOCUMENTO`, mientras el DW no presenta duplicados según la clave compuesta de auditoría; ambas reglas no son equivalentes.\n- Las comparaciones monetarias entre Samar y fuentes PEN no son válidas hasta confirmar moneda o definir conversión.\n- Los atípicos IQR deben investigarse, no eliminarse automáticamente.\n\nConsultas reproducibles: `6.2_resultados_etl/consultas_etl.sql`, `6.3_resultados_dw/consultas_dw.sql` y `6.4_analisis_descriptivo/consultas_descriptivas.sql`.\n'''; (BASE/'INFORME_CONSOLIDADO.md').write_text(main,encoding='utf-8')

(BASE/'README.md').write_text('# Resultados del capítulo VI\n\nResultados reales, anonimizados y reproducibles. Ejecutar primero `node scripts/extraer_resultados.cjs` y después `python scripts/generar_resultados.py`.\n',encoding='utf-8')
(BASE/'scripts/requirements.txt').write_text('pandas\nnumpy\nmatplotlib\nseaborn\nscipy\nopenpyxl\n',encoding='utf-8')
(BASE/'scripts/generar_graficos.py').write_text("# Los gráficos se generan de forma reproducible mediante generar_resultados.py.\nfrom generar_resultados import *  # noqa\n",encoding='utf-8')

# Índice e inventario
files=[p for p in BASE.rglob('*') if p.is_file() and p.name not in {'resultados_capitulo_vi.zip'}]
idx=pd.DataFrame([{'Código':f'E-{i:03}','Apartado LRPD':'6.2' if '6.2_' in str(p) else '6.3' if '6.3_' in str(p) else '6.4' if '6.4_' in str(p) else '6.5' if '6.5_' in str(p) else 'General','Nombre de evidencia':p.stem,'Archivo':str(p.relative_to(BASE)).replace('\\','/'),'Consulta o script':'scripts/generar_resultados.py','Fecha de generación':DATE} for i,p in enumerate(files,1)])
(BASE/'INDICE_EVIDENCIAS.md').write_text('# Índice de evidencias\n\n'+mdtable(idx),encoding='utf-8')

# JSON consolidado sin datos a nivel fila
consolidated={'metadata':RAW['metadata'],'etl':etl.to_dict('records'),'hechos':facts.to_dict('records'),'dimensiones':dims.to_dict('records'),'integridad':integ.to_dict('records'),'estadistica':desc.replace({np.nan:None}).to_dict('records'),'atipicos':outliers.to_dict('records'),'correlaciones':corr.replace({np.nan:None}).to_dict('records')}
(BASE/'evidencias/resultados_consolidados.json').write_text(json.dumps(consolidated,ensure_ascii=False,indent=2,default=str),encoding='utf-8')

# ZIP final
zip_path=BASE/'resultados_capitulo_vi.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for p in BASE.rglob('*'):
        if p.is_file() and p!=zip_path: z.write(p,p.relative_to(BASE.parent))
print(f'Generados {len(list(BASE.rglob("*")))} artefactos en {BASE}')
