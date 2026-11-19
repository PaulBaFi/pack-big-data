export const TAX_RATE=.18;
export const lineTotal=(price:number, quantity:number)=>Math.round(price*quantity);
export const saleTotals=(lines:{PRECIO_UNITARIO:number|null;CANTIDAD:number|null}[])=>{const TOTAL_NETO=lines.reduce((s,l)=>s+lineTotal(l.PRECIO_UNITARIO||0,l.CANTIDAD||0),0);const IMPUESTO=Math.round(TOTAL_NETO*TAX_RATE);return {TOTAL_NETO,IMPUESTO,TOTAL_DOCUMENTO:TOTAL_NETO+IMPUESTO}};
