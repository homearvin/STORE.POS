export const uid=()=>crypto.randomUUID();
export const day=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
export function scaled(value, places=2){const str=String(value).trim();if(!(places===0?/^\d+$/:new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`)).test(str))throw Error(`Enter a positive number with up to ${places} decimal places.`);const [a,b='']=str.split('.');const n=Number(a)*10**places+Number(b.padEnd(places,'0'));if(!Number.isSafeInteger(n)||n>1e11)throw Error('Value is too large.');return n;}
export function prorate(a,b,divisor){if(![a,b,divisor].every(Number.isSafeInteger)||a<0||b<0||divisor<=0)throw Error('Invalid calculation.');const n=Number((BigInt(a)*BigInt(b)*2n+BigInt(divisor))/(2n*BigInt(divisor)));if(!Number.isSafeInteger(n)||n>1e11)throw Error('Transaction exceeds the supported amount.');return n;}
const need=(condition,message)=>{if(!condition)throw Error(message);};
const integer=(n,positive=false)=>need(Number.isSafeInteger(n)&&(positive?n>0:n>=0)&&n<=1e11,'Invalid amount or quantity.');
export const money=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2}).format(n/100);
export const qty=n=>new Intl.NumberFormat('en-PH',{maximumFractionDigits:3}).format(n/1000);
export const balance=(s,id)=>s.ledger.filter(x=>x.customerId===id).reduce((a,x)=>a+x.amount,0);
export const currentSession=s=>s.sessions.find(x=>!x.closedAt);
export function expectedCash(s,session=currentSession(s)){return session?session.opening+s.payments.filter(x=>x.sessionId===session.id&&x.method==='Cash').reduce((a,x)=>a+x.amount,0)-s.expenses.filter(x=>x.sessionId===session.id&&x.source==='Register').reduce((a,x)=>a+x.amount,0)+s.cashMoves.filter(x=>x.sessionId===session.id).reduce((a,x)=>a+x.amount,0):0;}
export function emptyState(){return {schema:1,revision:0,store:{name:'Your rice store',owner:'Store Owner',address:''},demo:false,products:[],customers:[],sales:[],payments:[],ledger:[],movements:[],purchases:[],expenses:[],sessions:[],cashMoves:[],refunds:[],audit:[],processed:[]};}
export function transact(original,type,data,options={}){
 const s=structuredClone(original),now=options.now||new Date().toISOString(),id=options.id||uid(),actor=options.actor||'Store Owner';
 if(s.processed.includes(id))return original;
 const session=currentSession(s),requireSession=()=>need(session,'Open a cash session before recording transactions.');
 const product=id=>{const p=s.products.find(x=>x.id===id);need(p,'Product not found.');return p;};
 const customer=id=>{const c=s.customers.find(x=>x.id===id);need(c,'Select a customer for utang.');return c;};
 const movement=(p,amount,reason)=>s.movements.push({id:uid(),productId:p.id,quantity:amount,source:id,reason,at:now,actor});
 const payment=(amount,method,extra={})=>{integer(Math.abs(amount));need(['Cash','GCash','Maya','Bank Transfer'].includes(method),'Select a payment method.');if(amount)s.payments.push({id:uid(),amount,method,at:now,sessionId:session.id,source:id,actor,...extra});};
 if(type==='profile'){need(data.name.trim(),'Enter a store name.');s.store={name:data.name.trim(),owner:data.owner.trim()||actor,address:data.address.trim()};}
 else if(type==='product'){
  need(data.name.trim(),'Enter a product name.');need(!s.products.some(x=>x.sku.toLowerCase()===data.sku.trim().toLowerCase()),'This SKU already exists.');need(data.sku.trim(),'Enter a SKU.');['stock','price','cost','minimum','sackPrice'].forEach(k=>integer(data[k]));integer(data.sackGrams,true);
  const p={...data,name:data.name.trim(),sku:data.sku.trim(),id,stockValue:prorate(data.stock,data.cost,1000)};integer(p.stockValue);s.products.push(p);movement(p,data.stock,'Opening inventory');
 }else if(type==='customer'){need(data.name.trim(),'Enter a customer name.');integer(data.opening);integer(data.limit);s.customers.push({id,name:data.name.trim(),phone:data.phone.trim(),limit:data.limit});if(data.opening)s.ledger.push({id:uid(),customerId:id,amount:data.opening,source:id,kind:'Opening receivable',at:now});}
 else if(type==='open'){need(!session,'A cash session is already open.');integer(data.amount);s.sessions.push({id,opening:data.amount,openedAt:now,actor,userId:options.userId||null});}
 else if(type==='sale'){
  requireSession();need(data.items.length,'Add a product first.');integer(data.discount);const seen=new Set();
  const items=data.items.map(line=>{const p=product(line.productId);need(!seen.has(p.id),'Combine duplicate product lines.');seen.add(p.id);integer(line.quantity,true);need(p.stock>=line.quantity,`Not enough ${p.name} in stock.`);need(['kg','sack'].includes(line.unit),'Invalid selling unit.');const unitGrams=line.unit==='sack'?p.sackGrams:1000;const price=line.unit==='sack'?p.sackPrice:p.price;const revenue=prorate(line.quantity,price,unitGrams);const cost=line.quantity===p.stock?p.stockValue:prorate(p.stockValue,line.quantity,p.stock);return {productId:p.id,name:p.name,quantity:line.quantity,unit:line.unit,unitGrams,price,revenue,cost};});
  const subtotal=items.reduce((a,x)=>a+x.revenue,0);need(data.discount<=subtotal,'Discount cannot exceed subtotal.');const total=subtotal-data.discount;integer(total);let paid=0;
  const payments=data.payments.map(p=>{integer(p.amount);if(p.method!=='Cash'&&p.amount)need(p.verified,'Verify the digital payment before completing the sale.');paid+=p.amount;return p;});need(paid<=total,'Applied payments cannot exceed the sale total.');
  const debt=total-paid;if(debt){const c=customer(data.customerId);need(!c.limit||balance(s,c.id)+debt<=c.limit,'This sale exceeds the customer’s credit limit.');need(data.dueDate,'Set a due date for the unpaid balance.');}
  if(data.customerId)customer(data.customerId);
  const sale={id,ref:`TXN-${day(now).replaceAll('-','')}-${String(s.sales.length+1).padStart(4,'0')}`,at:now,actor,sessionId:session.id,customerId:data.customerId||null,items,subtotal,discount:data.discount,total,cost:items.reduce((a,x)=>a+x.cost,0),dueDate:debt?data.dueDate:null,refunded:false};s.sales.push(sale);
  for(const line of items){const p=product(line.productId);p.stock-=line.quantity;p.stockValue-=line.cost;movement(p,-line.quantity,'Sale');}
  for(const p of payments)payment(p.amount,p.method,{saleId:id,reference:p.reference||'',kind:'Sale'});
  if(debt)s.ledger.push({id:uid(),customerId:data.customerId,saleId:id,amount:debt,source:id,kind:'Credit sale',at:now});
 }else if(type==='collection'){
  requireSession();const c=customer(data.customerId);integer(data.amount,true);need(data.amount<=balance(s,c.id),'Payment exceeds the outstanding balance.');if(data.method!=='Cash')need(data.verified,'Verify the digital payment first.');
  let remaining=data.amount;const debts=s.ledger.filter(x=>x.customerId===c.id&&x.amount>0);for(const debt of debts){if(!remaining)break;const outstanding=s.ledger.filter(x=>x.customerId===c.id&&(debt.saleId?x.saleId===debt.saleId:x.openingId===debt.id||x.id===debt.id)).reduce((a,x)=>a+x.amount,0);const amount=Math.min(remaining,Math.max(0,outstanding));if(!amount)continue;remaining-=amount;s.ledger.push({id:uid(),customerId:c.id,saleId:debt.saleId||null,openingId:debt.saleId?null:debt.id,amount:-amount,source:id,kind:'Collection',at:now});payment(amount,data.method,{customerId:c.id,saleId:debt.saleId||null,kind:'Collection',reference:data.reference||''});}
  need(remaining===0,'Unable to allocate payment.');
 }else if(type==='purchase'){
  const p=product(data.productId);integer(data.sacks,true);integer(data.sackGrams,true);integer(data.costPerSack,true);need(data.supplier.trim(),'Enter a supplier.');integer(data.sacks*data.sackGrams,true);integer(data.sacks*data.costPerSack,true);s.purchases.push({...data,id,at:now,receivedAt:null,productName:p.name,total:data.sacks*data.costPerSack,quantity:data.sacks*data.sackGrams});
 }else if(type==='receive'){
  const order=s.purchases.find(x=>x.id===data.purchaseId);need(order&&!order.receivedAt,'This purchase was already received or does not exist.');if(data.source==='Register')requireSession();need(['Register','External','Unpaid'].includes(data.source),'Choose payment source.');const p=product(order.productId);p.stock+=order.quantity;p.stockValue+=order.total;order.receivedAt=now;order.source=data.source;movement(p,order.quantity,'Purchase received');if(data.source==='Register')s.cashMoves.push({id,sessionId:session.id,at:now,amount:-order.total,reason:'Purchase '+order.supplier});
 }else if(type==='adjust'){
  const p=product(data.productId);integer(data.actual);need(data.reason.trim(),'A reason is required.');const diff=data.actual-p.stock;need(diff!==0,'The count has not changed.');p.stockValue=p.stock?prorate(p.stockValue,data.actual,p.stock):prorate(p.cost,data.actual,1000);p.stock=data.actual;movement(p,diff,data.reason.trim());
 }else if(type==='expense'){
  integer(data.amount,true);need(data.description.trim(),'Enter a description.');need(['Register','External'].includes(data.source),'Choose payment source.');if(data.source==='Register')requireSession();s.expenses.push({...data,id,at:now,sessionId:session?.id||null,actor});
 }else if(type==='cash'){
  requireSession();integer(data.amount,true);need(data.reason.trim(),'Enter a reason.');need(['in','out'].includes(data.direction),'Choose cash in or out.');s.cashMoves.push({id,sessionId:session.id,at:now,amount:data.direction==='out'?-data.amount:data.amount,reason:data.reason.trim()});
 }else if(type==='close'){
  requireSession();integer(data.actual);const expected=expectedCash(s);need(data.actual===expected||data.reason.trim(),'Explain the cash shortage or overage.');Object.assign(session,{closedAt:now,expected,actual:data.actual,variance:data.actual-expected,reason:data.reason.trim()});
 }else if(type==='refund'){
  requireSession();const sale=s.sales.find(x=>x.id===data.saleId);need(sale&&!sale.refunded,'This sale cannot be refunded again.');need(data.reason.trim(),'Enter a refund reason.');const debt=s.ledger.filter(x=>x.saleId===sale.id).reduce((a,x)=>a+x.amount,0);if(debt)s.ledger.push({id:uid(),customerId:sale.customerId,saleId:sale.id,amount:-debt,source:id,kind:'Refund reversal',at:now});
  const originalPayments=s.payments.filter(x=>x.saleId===sale.id&&x.amount>0);for(const p of originalPayments)payment(-p.amount,p.method,{saleId:sale.id,kind:'Refund'});
  if(data.restock)for(const line of sale.items){const p=product(line.productId);p.stock+=line.quantity;p.stockValue+=line.cost;movement(p,line.quantity,'Resalable return');}
  s.refunds.push({id,saleId:sale.id,at:now,revenue:sale.total,cost:data.restock?sale.cost:0,reason:data.reason.trim(),restock:data.restock});sale.refunded=true;
 }else throw Error('Unknown action.');
 s.audit.push({id,action:type,at:now,actor});s.processed.push(id);s.revision++;return s;
}
export function metrics(s,from=day(),to=from){const inRange=x=>day(x.at)>=from&&day(x.at)<=to;const sales=s.sales.filter(inRange),refunds=s.refunds.filter(inRange);const revenue=sales.reduce((a,x)=>a+x.total,0)-refunds.reduce((a,x)=>a+x.revenue,0);const cost=sales.reduce((a,x)=>a+x.cost,0)-refunds.reduce((a,x)=>a+x.cost,0);const expenses=s.expenses.filter(inRange).reduce((a,x)=>a+x.amount,0);return {revenue,cost,profit:revenue-cost,expenses,net:revenue-cost-expenses,collections:s.payments.filter(inRange).reduce((a,x)=>a+x.amount,0),credit:s.ledger.reduce((a,x)=>a+x.amount,0),cash:expectedCash(s),sales,refunds};}
export function demoState(){let s=emptyState();s.demo=true;s.store={name:'Bayanihan Rice Store',owner:'Alex',address:'Quezon City, Philippines'};const run=(t,d,now)=>s=transact(s,t,d,{now});
 const catalog=[['Dinorado Rice','Premium rice',5800,5000,185000,30000,280000,'DNR'],['Jasmine Rice','Premium rice',6200,5300,24000,30000,300000,'JSM'],['Regular Milled','Everyday rice',4800,4000,320000,50000,230000,'REG'],['Sinandomeng','Everyday rice',5400,4600,142000,30000,260000,'SNM'],['Malagkit Rice','Specialty rice',7200,6100,18000,20000,350000,'MLG'],['Brown Rice','Specialty rice',8500,7000,65000,15000,410000,'BRN']];
 for(const [name,category,price,cost,stock,minimum,sackPrice,sku]of catalog)run('product',{name,category,price,cost,stock,minimum,sackPrice,sku,sackGrams:50000});
 for(const [name,opening]of [['Juan Dela Cruz',125000],['Aling Nena',85000],['Rosa Santos',42000]])run('customer',{name,opening,phone:'',limit:500000});
 for(let i=6;i>=0;i--){const d=new Date();d.setUTCDate(d.getUTCDate()-i);d.setUTCHours(2,0,0,0);const now=d.toISOString();run('open',{amount:100000},now);for(let j=0;j<4;j++){const p=s.products[(i+j)%s.products.length],quantity=(j+1)*1000,total=p.price*(j+1);run('sale',{items:[{productId:p.id,quantity,unit:'kg'}],discount:0,payments:[{method:j===1?'GCash':'Cash',amount:total,verified:true}],customerId:'',dueDate:''},now);}if(i)run('close',{actual:expectedCash(s),reason:''},now);}
 return s;
}
