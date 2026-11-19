import {createInitialData} from '../data/initialData';
import type {Database} from '../types/database';
const KEY='castillonv2-db-v1';
export const loadData=():Database=>{if(typeof localStorage==='undefined')return createInitialData();try{return JSON.parse(localStorage.getItem(KEY)||'null')||createInitialData()}catch{return createInitialData()}};
export const saveData=(data:Database)=>localStorage.setItem(KEY,JSON.stringify(data));
export const resetData=()=>{const d=createInitialData();saveData(d);return d};
