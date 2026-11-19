import type { Cliente } from '../../types/database';
const nombres=['Camila','Diego','Valentina','Matías','Fernanda','Nicolás','Sofía','Benjamín','Antonia','Joaquín','Martina','Sebastián','Isidora','Tomás','Catalina','Vicente','Emilia','Gabriel','Florencia','Andrés','Daniela','Pablo','Josefa','Cristóbal','María','Felipe','Constanza','Ignacio','Paula','Rodrigo'];
const apellidos=['Rojas','Muñoz','Soto','Pérez','Contreras','Silva','Martínez','Sepúlveda','Morales','Castro'];
export const clientes: Cliente[] = nombres.map((NOMBRE,i)=>({ID_CLIENTE:`CLI-${String(i+1).padStart(3,'0')}`,NOMBRE,APELLIDO:apellidos[i%10],EDAD:22+(i%35),ESTADO_CIVIL:i%3?'Soltero/a':'Casado/a',RESIDENCIA:['Centro','Norte','Sur','Cordillera'][i%4],ORIGEN:['Santiago','Valparaíso','Concepción','La Serena'][i%4]}));
