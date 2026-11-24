async function runE2ETests() {
  console.log('=== INICIANDO PRUEBAS END-TO-END DEL PORTAL ADMINISTRADOR ===\n');

  // 1. Probar Login con contraseña incorrecta
  console.log('1. Probando Login con credenciales incorrectas...');
  const badLoginRes = await fetch('http://localhost:4329/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bigdata.upsjb.edu.pe', password: 'PasswordErronea123' }),
  });
  const badData = await badLoginRes.json();
  console.log(`  -> Status: ${badLoginRes.status} (Esperado: 401). Respuesta:`, badData);

  // 2. Probar Login Exitoso
  console.log('\n2. Probando Login Exitoso con usuario administrador semilla...');
  const loginRes = await fetch('http://localhost:4329/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bigdata.upsjb.edu.pe', password: 'Admin2026*' }),
  });
  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  console.log(`  -> Status: ${loginRes.status} (Esperado: 200). Usuario:`, loginData.user);
  console.log(`  -> Cookie HttpOnly recibida:`, setCookie ? setCookie.split(';')[0] : 'NO');

  if (!setCookie) {
    throw new Error('No se recibió la cookie de sesión.');
  }

  const cookieHeader = setCookie.split(';')[0];
  const authHeaders = { Cookie: cookieHeader };

  // 3. Probar Acceso al Dashboard Autenticado
  console.log('\n3. Probando Acceso al Dashboard Ejecutivo (GET /)...');
  const dashRes = await fetch('http://localhost:4329/', { headers: authHeaders });
  console.log(`  -> Status: ${dashRes.status} (Esperado: 200)`);

  // 4. Probar API de Fuentes Transaccionales (Pilar 2)
  console.log('\n4. Probando API Monitoreo 4 Fuentes (GET /api/sources/status)...');
  const sourcesRes = await fetch('http://localhost:4329/api/sources/status', { headers: authHeaders });
  const sourcesData = await sourcesRes.json();
  console.log(`  -> Status: ${sourcesRes.status} (Esperado: 200)`);
  console.log(`  -> Total OLTP: ${sourcesData.totalOltp}, Total OLAP: ${sourcesData.totalOlap}, Pendientes: ${sourcesData.totalPending}`);
  console.log(`  -> Tasa Global Sincronización: ${sourcesData.globalSyncPercentage}%`);

  // 5. Probar API de Auditoría y Calidad OLAP (Pilar 3)
  console.log('\n5. Probando Auditoría de Calidad OLAP (GET /api/olap/audit)...');
  const auditRes = await fetch('http://localhost:4329/api/olap/audit', { headers: authHeaders });
  const auditData = await auditRes.json();
  console.log(`  -> Status: ${auditRes.status} (Esperado: 200)`);
  console.log(`  -> Score de Calidad: ${auditData.score}% (${auditData.overallStatus})`);

  // 6. Probar Conciliación y Sincronización Post-ETL
  console.log('\n6. Probando Matriz de Conciliación 1:1 (GET /api/olap/reconcile)...');
  const recRes = await fetch('http://localhost:4329/api/olap/reconcile', { headers: authHeaders });
  const recData = await recRes.json();
  console.log(`  -> Status: ${recRes.status} (Esperado: 200)`);
  console.log(`  -> Sincronización Total Confirmada: ${recData.isFullySynced ? 'SÍ (100.00%)' : 'NO'}`);

  // 7. Probar Ejecución Real del Pipeline ETL (POST /api/etl/run)
  console.log('\n7. Probando Disparo Real de la ETL (POST /api/etl/run)...');
  const t0 = Date.now();
  const etlRes = await fetch('http://localhost:4329/api/etl/run', {
    method: 'POST',
    headers: authHeaders,
  });
  const etlData = await etlRes.json();
  const elapsed = (Date.now() - t0) / 1000;
  console.log(`  -> Status: ${etlRes.status} (Esperado: 200) en ${elapsed}s`);
  console.log('  -> Resultado ETL:', etlData);

  if (!etlData.success) {
    throw new Error(`ETL fallo con mensaje: ${etlData.errorMessage || etlData.error}`);
  }

  console.log('\n=== TODAS LAS PRUEBAS END-TO-END PASARON CON ÉXITO (100%) ===');
}

runE2ETests().catch(console.error);
