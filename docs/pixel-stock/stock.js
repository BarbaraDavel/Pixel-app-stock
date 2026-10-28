const KEY="pixel-stock-preview-v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let initial=[],items=[];
const num=v=>v===""||v===null?null:Number(v);
const save=()=>localStorage.setItem(KEY,JSON.stringify(items));
function state(x){return x.cantidad===0?"Agotado":x.cantidad<(x.minimo??10)?"Por pedir":"Disponible"}
function render(){
 const cats=[...new Set(items.map(x=>x.categoria))].sort();
 const old=$("category").value;$("category").innerHTML='<option value="">Todas las categorías</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");$("category").value=cats.includes(old)?old:"";
 const marked=items.filter(x=>x.pedir).length;
 const low=items.filter(x=>x.cantidad<(x.minimo??10)).length;
 $("cards").innerHTML=[["Materiales",items.length],["⚠️ Por pedir",low],["🛒 Marcados para comprar",marked],["Mínimo predeterminado: 10",items.filter(x=>x.minimo===null).length],["Hojas estimadas",items.reduce((s,x)=>s+x.cantidad,0)]].map(([k,v])=>'<div class="card"><small>'+k+'</small><strong>'+Number(v).toLocaleString("es-AR")+'</strong></div>').join("");
 const q=$("search").value.toLowerCase(),cat=$("category").value,st=$("status").value;
 $("rows").innerHTML=items.filter(x=>(x.nombre+" "+x.marca).toLowerCase().includes(q)&&(!cat||x.categoria===cat)&&(!st||(st==="low"?x.minimo!==null&&x.cantidad<=x.minimo:x.minimo===null))).map(x=>'<tr><td><input type="checkbox" data-buy="'+esc(x.id)+'" '+(x.pedir?'checked':'')+' aria-label="Marcar para comprar '+esc(x.nombre)+'"></td><td><b>'+esc(x.nombre)+'</b><br><small>'+esc(x.categoria)+'</small></td><td>'+esc(x.marca)+'</td><td>'+x.cantidad+'</td><td>'+x.paquetesCerrados+' cerrados · '+x.hojasAbiertas+' sueltas</td><td>'+(x.minimo??"10 (pred.)")+'</td><td>'+(x.precioPaquete===null?"—":"$"+x.precioPaquete.toLocaleString("es-AR")+(x.url?' <a href="'+esc(x.url)+'" target="_blank" rel="noopener">Tienda ↗</a>':""))+'</td><td><span class="pill '+(x.cantidad<(x.minimo??10)?"low":"")+'">'+state(x)+'</span></td><td><button data-edit="'+esc(x.id)+'">Editar</button></td></tr>').join("")||'<tr><td colspan="9">Sin resultados</td></tr>';
 document.querySelectorAll("[data-buy]").forEach(b=>b.onchange=()=>{const x=items.find(i=>i.id===b.dataset.buy);if(x){x.pedir=b.checked;save();render()}});
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit));
}
function edit(id){
 const x=items.find(i=>i.id===id)||{id:"",nombre:"",marca:"Artjet",categoria:"Fotográficos",cantidad:0,paquetesCerrados:0,hojasAbiertas:0,hojasPorPaquete:0,minimo:10,precioPaquete:null,proveedor:"",url:"",fechaPrecio:""};
 for(const [k,v] of Object.entries(x)){if($("form").elements.namedItem(k))$("form").elements.namedItem(k).value=v??""}
 $("formTitle").textContent=id?"Editar material":"Nuevo material";$("editor").showModal();
}
$("form").onsubmit=e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
 for(const k of ["cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete","minimo","precioPaquete"])d[k]=num(d[k]);
 if(["cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete"].some(k=>!Number.isInteger(d[k])||d[k]<0)){alert("Ingresá cantidades enteras no negativas");return}
 if(d.minimo!==null&&(!Number.isInteger(d.minimo)||d.minimo<0)){alert("Mínimo inválido");return}
 if(d.precioPaquete!==null&&(!Number.isFinite(d.precioPaquete)||d.precioPaquete<0)){alert("Precio inválido");return}
 if(d.hojasPorPaquete>0&&d.cantidad!==d.paquetesCerrados*d.hojasPorPaquete+d.hojasAbiertas){if(!confirm("El total no coincide con los paquetes y hojas abiertas. ¿Guardar igual como estimación?"))return}
 if(!d.id)d.id="pixel-"+Date.now();
 const index=items.findIndex(x=>x.id===d.id);if(index>=0)items[index]=d;else items.push(d);
 save();$("editor").close();render();
};
$("cancel").onclick=()=>$("editor").close();$("new").onclick=()=>edit(null);
for(const id of ["search","category","status"])$(id).addEventListener(id==="search"?"input":"change",render);

$("import").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const raw=(await file.text()).replace(/^\uFEFF/,"");
  const records=[];let record=[],field="",quoted=false;
  for(let i=0;i<raw.length;i++){
   const ch=raw[i];
   if(ch==='"'){
    if(quoted&&raw[i+1]==='"'){field+='"';i++}else quoted=!quoted;
   }else if(ch===';'&&!quoted){record.push(field);field=""}
   else if((ch==='\n'||ch==='\r')&&!quoted){
    if(ch==='\r'&&raw[i+1]==='\n')i++;
    record.push(field);field="";
    if(record.some(v=>v!==""))records.push(record);
    record=[];
   }else field+=ch;
  }
  if(quoted)throw Error("Comillas sin cerrar en el CSV");
  if(field!==""||record.length){record.push(field);records.push(record)}
  const header=records.shift()?.map(v=>v.trim());
  const required=["nombre","marca","categoria","cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete","precioPaquete"];
  if(!header||required.some(k=>!header.includes(k)))throw Error("El archivo no tiene las columnas de Pixel Stock");
  const seen=new Set();
  const parsed=records.map((values,i)=>{
   const d=Object.fromEntries(header.map((k,j)=>[k,values[j]??""]));
   if(values.length!==header.length)throw Error("Cantidad de columnas incorrecta en fila "+(i+2));
   if(!d.nombre.trim())throw Error("Material sin nombre en fila "+(i+2));
   const key=d.nombre.trim().toLocaleLowerCase("es-AR");
   if(seen.has(key))throw Error("Material duplicado: "+d.nombre);
   seen.add(key);
   for(const k of ["cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete"]){
    d[k]=Number(d[k]);if(!Number.isInteger(d[k])||d[k]<0)throw Error("Cantidad inválida para "+d.nombre);
   }
   for(const k of ["minimo","precioPaquete"]){
    d[k]=d[k]===""?null:Number(d[k]);
    if(d[k]!==null&&(!Number.isFinite(d[k])||d[k]<0))throw Error("Valor inválido para "+d.nombre);
   }
   const existing=items.find(x=>x.nombre.trim().toLocaleLowerCase("es-AR")===key);
   return {...existing,...d,id:existing?.id||"pixel-import-"+(i+1),pedir:d.pedir===""?(existing?.pedir??false):["true","1","si","sí"].includes(String(d.pedir).toLowerCase())};
  });
  if(!parsed.length)throw Error("El archivo no contiene materiales");
  if(!confirm("Se reemplazarán los "+items.length+" materiales actuales por los "+parsed.length+" del CSV. ¿Continuar?"))return;
  items=parsed;save();render();alert("¡Inventario importado! "+items.length+" materiales cargados.");
 }catch(err){alert("No se pudo importar: "+err.message)}
 finally{e.target.value=""}
};
$("reset").onclick=()=>{if(confirm("¿Reemplazar los cambios locales por el inventario inicial?")){items=structuredClone(initial);save();render()}};
$("export").onclick=()=>{
 const keys=["pedir","nombre","marca","categoria","cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete","minimo","precioPaquete","proveedor","url","fechaPrecio"];
 const csv=[keys.join(";"),...items.map(x=>keys.map(k=>'"'+String(x[k]??"").replace(/"/g,'""')+'"').join(";"))].join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="pixel-stock.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

function parseCSV(text){
 const records=[];let row=[],field="",quoted=false;
 text=text.replace(/^\uFEFF/,"");
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(c===";"&&!quoted){row.push(field);field=""}
  else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(x=>x!==""))records.push(row);row=[];field=""}
  else field+=c;
 }
 if(quoted)throw Error("CSV con comillas sin cerrar");
 row.push(field);if(row.some(x=>x!==""))records.push(row);
 const headers=records.shift();
 if(!headers||!["nombre","cantidad","precioPaquete"].every(k=>headers.includes(k)))throw Error("Formato CSV incompatible");
 return records.map(cols=>Object.fromEntries(headers.map((k,i)=>[k,cols[i]??""])));
}
$("import").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  const incoming=parseCSV(await file.text());
  if(!incoming.length)throw Error("El archivo está vacío");
  const parsed=incoming.map((x,i)=>{
   const o={...x};
   for(const k of ["cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete","minimo","precioPaquete"])o[k]=num(o[k]);
   if(!o.nombre||!Number.isInteger(o.cantidad)||o.cantidad<0)throw Error("Fila "+(i+2)+" inválida");
   for(const k of ["paquetesCerrados","hojasAbiertas","hojasPorPaquete"])if(!Number.isInteger(o[k])||o[k]<0)throw Error("Fila "+(i+2)+": "+k+" inválido");
   return o;
  });
  const oldByName=new Map(items.map(x=>[x.nombre.trim().toLocaleLowerCase("es"),x]));
  const seen=new Set();
  const next=parsed.map((x,i)=>{
   const key=x.nombre.trim().toLocaleLowerCase("es");
   if(seen.has(key))throw Error("Material duplicado: "+x.nombre);
   seen.add(key);
   const previous=oldByName.get(key);
   return {...previous,...x,id:previous?.id??("pixel-import-"+i+"-"+Date.now()),pedir:previous?.pedir??(x.pedir==="true")};
  });
  if(!confirm("¿Importar "+next.length+" materiales? Se reemplazará el inventario guardado en este navegador. Exportá una copia antes si querés conservarlo."))return;
  items=next;save();render();alert("Inventario importado: "+next.length+" materiales.");
 }catch(err){alert("No se pudo importar: "+err.message)}
 finally{e.target.value=""}
};

try{const r=await fetch("./inventario-inicial.json");if(!r.ok)throw Error("No se pudo leer inventario");initial=await r.json();const stored=localStorage.getItem(KEY);items=stored?JSON.parse(stored):structuredClone(initial);for(const x of items){const prices={"pixel-007":[10506,"https://www.eshop.art-jet.com.ar/productos/blanco-frio/"],"pixel-008":[8262,"https://www.eshop.art-jet.com.ar/productos/filmilo-adhesivo-blanco-reluciente/"]};if(prices[x.id]&&x.precioPaquete==null){x.precioPaquete=prices[x.id][0];x.url=prices[x.id][1];x.fechaPrecio="2026-10-23";x.precioNota="Precio publicado para la variante inicial; confirmar presentación antes de comprar"}}render()}catch(e){$("rows").innerHTML='<tr><td colspan="8">Error cargando inventario: '+esc(e.message)+'</td></tr>'}
