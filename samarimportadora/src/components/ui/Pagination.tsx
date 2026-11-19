import {ChevronLeft, ChevronRight} from 'lucide-react';

export default function Pagination({page, totalPages, onPageChange}: {page: number; totalPages: number; onPageChange: (page: number) => void}) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
    <span className="text-slate-500">Página {page} de {totalPages}</span>
    <div className="flex gap-2">
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={16}/></button>
      <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={16}/></button>
    </div>
  </div>;
}
