import {unitWord} from './core.js';
// Receipt content and layout for thermal receipt printers (58 mm and 80 mm paper).
// One layout feeds all three outputs: the paper on screen, the browser Print backup and Bluetooth printers.
// Pure functions (no screen, no printer) so they can be tested. Amounts are centavos, quantities grams.
// mm = paper width, printMm = the part the print head reaches, columns = letters per line.
export const RECEIPT_PAPERS={58:{label:'58 mm',hint:'Small · portable',mm:58,printMm:48,columns:32},80:{label:'80 mm',hint:'Big · desktop',mm:80,printMm:72,columns:48}};
export const DEFAULT_PAPER=58;
const RECEIPT_TITLE='SALES SLIP',RECEIPT_THANKS='Salamat po! Balik kayo!',RECEIPT_DISCLAIMER='Not an official receipt';
const RECEIPT_RULE='-',RECEIPT_CURRENCY='P';   // thermal printers have no peso sign, so totals print as "P1,700.00"
const METHOD_NAMES={'Bank Transfer':'Bank'};

const peso=n=>new Intl.NumberFormat('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
const stamp=at=>new Date(at).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
// "3 pieces x 16.00", "2.5 kg x 58.00", "1 box x 1,080.00": the amount in the unit it was sold by, times its price.
function itemAmount(item){const n=item.quantity/item.unitSize;return `${new Intl.NumberFormat('en-PH',{maximumFractionDigits:3}).format(n)} ${unitWord(item.unit,n)} x ${peso(item.price)}`;}

// What the receipt says, line by line. type: title · center · text · pair (left … right) · total · rule
// tendered = cash the customer handed over (known only right after checkout); debt = what stays as utang.
export function receiptLines(sale,{store,cashier,customer='',payments=[],tendered=0,debt=0}){
 const lines=[{type:'title',left:store.name}];
 if(store.address)lines.push({type:'center',left:store.address});
 lines.push({type:'rule'},{type:'center',left:RECEIPT_TITLE},{type:'text',left:`No. ${sale.ref}`},{type:'text',left:stamp(sale.at)},{type:'text',left:`Cashier: ${cashier}`});
 if(customer)lines.push({type:'text',left:`Customer: ${customer}`});
 lines.push({type:'rule'});
 for(const item of sale.items)lines.push({type:'text',left:item.name},{type:'pair',left:'  '+itemAmount(item),right:peso(item.revenue)});
 lines.push({type:'rule'},{type:'pair',left:'Subtotal',right:peso(sale.subtotal)});
 if(sale.discount)lines.push({type:'pair',left:'Discount',right:'-'+peso(sale.discount)});
 lines.push({type:'total',left:'TOTAL',right:RECEIPT_CURRENCY+peso(sale.total)});
 for(const p of payments){const given=p.method==='Cash'&&tendered>p.amount?tendered:p.amount;lines.push({type:'pair',left:METHOD_NAMES[p.method]||p.method,right:peso(given)});if(p.reference)lines.push({type:'text',left:`  Ref: ${p.reference}`});if(given>p.amount)lines.push({type:'pair',left:'Sukli / Change',right:peso(given-p.amount)});}
 if(debt){lines.push({type:'pair',left:'Utang balance',right:peso(debt)});if(sale.dueDate)lines.push({type:'text',left:`Pay by ${sale.dueDate}`});}
 if(sale.refunded)lines.push({type:'center',left:'*** REFUNDED ***'});
 lines.push({type:'rule'},{type:'center',left:RECEIPT_THANKS},{type:'center',left:RECEIPT_DISCLAIMER});
 return lines;}

// Thermal printers only know plain letters: "Piñas" prints as "Pinas", unknown signs as "?".
export const plainText=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/₱/g,RECEIPT_CURRENCY).replace(/[^\x20-\x7E]/g,'?');
function wrap(text,columns){const words=plainText(text).split(' '),out=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(next.length<=columns){line=next;continue;}if(line)out.push(line);line=word;while(line.length>columns){out.push(line.slice(0,columns));line=line.slice(columns);}}if(line||!out.length)out.push(line);return out;}
const centered=(text,columns)=>' '.repeat(Math.floor((columns-text.length)/2))+text;
function pair(left,right,columns){const l=plainText(left),r=plainText(right);return l.length+r.length+1<=columns?[l+' '.repeat(columns-l.length-r.length)+r]:[...wrap(l,columns),' '.repeat(Math.max(0,columns-r.length))+r];}

// Fixed-width rows, exactly as the printer prints them. style: big (title, total) · bold · plain
export function receiptRows(lines,columns){return lines.flatMap(line=>{
 if(line.type==='rule')return [{text:RECEIPT_RULE.repeat(columns),style:''}];
 if(line.type==='title')return wrap(line.left.toUpperCase(),columns).map(t=>({text:centered(t,columns),style:'big'}));
 if(line.type==='center')return wrap(line.left,columns).map(t=>({text:centered(t,columns),style:''}));
 if(line.type==='pair')return pair(line.left,line.right,columns).map(text=>({text,style:''}));
 if(line.type==='total')return pair(line.left,line.right,columns).map(text=>({text,style:'big'}));
 return wrap(line.left,columns).map(text=>({text,style:''}));});}

// ESC/POS: the command language of almost every receipt printer.
const ESC=0x1b,GS=0x1d,LF=0x0a,FEED_LINES=4;
const ESC_POS={reset:[ESC,0x40],bold:on=>[ESC,0x45,on?1:0],tall:on=>[GS,0x21,on?0x01:0x00],feed:[ESC,0x64,FEED_LINES],cut:[GS,0x56,0x42,0x00]};
export function escPos(rows){const bytes=[...ESC_POS.reset];for(const row of rows){const big=row.style==='big',bold=big||row.style==='bold';bytes.push(...ESC_POS.bold(bold),...ESC_POS.tall(big));for(const ch of plainText(row.text))bytes.push(ch.charCodeAt(0));bytes.push(LF);}bytes.push(...ESC_POS.bold(false),...ESC_POS.tall(false),...ESC_POS.feed,...ESC_POS.cut);return Uint8Array.from(bytes);}
