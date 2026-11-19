import {useEffect,useState} from 'react'; import {readStore,writeStore, type Store} from '../data/repository';
export function useStore(){const [store,setStore]=useState<Store>(()=>readStore()); useEffect(()=>writeStore(store),[store]); return [store,setStore] as const;}
