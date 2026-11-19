import {readStore} from '../data/repository'; export const resumenVentas=()=>readStore().ventas.reduce((total,v)=>total+(v.TOTAL_DOCUMENTO||0),0);
