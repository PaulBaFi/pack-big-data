import {useEffect, useState, type ReactNode} from 'react';
import Pagination from './Pagination';

export default function DataTable({headers,rows,pageSize=10}:{headers:string[],rows:ReactNode[][],pageSize?:number}){
  const [page,setPage]=useState(1);
  const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  const visibleRows=rows.slice((page-1)*pageSize,page*pageSize);
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map(h=><th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleRows.map((r,i)=><tr key={i} className="hover:bg-slate-50">{r.map((c,j)=><td key={j} className="px-5 py-3 text-slate-700">{c}</td>)}</tr>)}</tbody></table></div>
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage}/>
  </div>;
}
