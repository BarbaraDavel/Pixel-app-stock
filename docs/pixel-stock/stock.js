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
 $("cards").innerHTML=[["Materiales",items.length],["⚠️ Por pedir",low],["🛒 Marcados para comprar",marked],["Mínimo predeterminado: 10",items.filter(x=>x.minimo===null).length],["Hojas estimadas",items.reduce((s,x)=>s+x.cantidad,0)]].map(([k,v])=>'<div class="card" '+(k.includes("Por pedir")?'data-filter="low" role="button" tabindex="0" title="Ver materiales con menos hojas que el mínimo"':k.includes("Marcados para comprar")?'data-filter="buy" role="button" tabindex="0" title="Ver mi lista de compras"':'')+'><small>'+k+'</small><strong>'+Number(v).toLocaleString("es-AR")+'</strong>'+(k.includes("Por pedir")||k.includes("Marcados para comprar")?'<small>Ver materiales →</small>':'')+'</div>').join("");
 document.querySelectorAll("[data-filter]").forEach(el=>{const go=()=>{$("status").value=el.dataset.filter;render();$("rows").scrollIntoView({block:"nearest",behavior:"smooth"})};el.onclick=go;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
 const q=$("search").value.toLowerCase(),cat=$("category").value,st=$("status").value;
 $("rows").innerHTML=items.filter(x=>(x.nombre+" "+x.marca).toLowerCase().includes(q)&&(!cat||x.categoria===cat)&&(!st||(st==="low"?x.cantidad<(x.minimo??10):st==="buy"?!!x.pedir:x.minimo===null))).map(x=>'<tr><td><input type="checkbox" data-buy="'+esc(x.id)+'" '+(x.pedir?'checked':'')+' aria-label="Marcar para comprar '+esc(x.nombre)+'"></td><td><b>'+esc(x.nombre)+'</b><br><small>'+esc(x.categoria)+'</small></td><td>'+esc(x.marca)+'</td><td>'+x.cantidad+'</td><td>'+x.paquetesCerrados+' cerrados · '+x.hojasAbiertas+' sueltas</td><td>'+(x.minimo??"10 (pred.)")+'</td><td>'+(x.precioPaquete===null?"—":"$"+x.precioPaquete.toLocaleString("es-AR")+(x.url?' <a href="'+esc(x.url)+'" target="_blank" rel="noopener">Tienda ↗</a>':""))+'</td><td><span class="pill '+(x.cantidad<(x.minimo??10)?"low":"")+'">'+state(x)+'</span></td><td><button data-edit="'+esc(x.id)+'">Editar</button></td></tr>').join("")||'<tr><td colspan="8">Sin resultados</td></tr>';
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
 const index=items.findIndex(x=>x.id===d.id);if(index>=0)items[index]={...items[index],...d};else items.push(d);
 save();$("editor").close();render();
};
$("cancel").onclick=()=>$("editor").close();$("new").onclick=()=>edit(null);
for(const id of ["search","category","status"])$(id).addEventListener(id==="search"?"input":"change",render);
$("reset").onclick=()=>{if(confirm("¿Reemplazar los cambios locales por el inventario inicial?")){items=structuredClone(initial);save();render()}};
$("export").onclick=()=>{
 const keys=["pedir","nombre","marca","categoria","cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete","minimo","precioPaquete","proveedor","url","fechaPrecio"];
 const csv=[keys.join(";"),...items.map(x=>keys.map(k=>'"'+String(x[k]??"").replace(/"/g,'""')+'"').join(";"))].join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="pixel-stock.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
try{const r=await fetch("./inventario-inicial.json");if(!r.ok)throw Error("No se pudo leer inventario");initial=await r.json();const stored=localStorage.getItem(KEY);items=stored?JSON.parse(stored):structuredClone(initial);for(const x of items){x.nombre=x.nombre.replace(/Olofan/g,"Holofan").replace("Canvas querina clásica","Canvas cuerina clásica")}for(const x of items){const prices={"pixel-007":[10506,"https://www.eshop.art-jet.com.ar/productos/blanco-frio/"],"pixel-008":[8262,"https://www.eshop.art-jet.com.ar/productos/filmilo-adhesivo-blanco-reluciente/"]};if(x.id==="pixel-026"&&x.precioPaquete==null){x.precioPaquete=12954;x.url="https://www.eshop.art-jet.com.ar/productos/winky-paper-blanco/";x.fechaPrecio="2026-10-23";x.precioNota="Referencia: Winky blanco A4 x 10 hojas; confirmar si el stock es blanco o semitransparente"}if(prices[x.id]&&x.precioPaquete==null){x.precioPaquete=prices[x.id][0];x.url=prices[x.id][1];x.fechaPrecio="2026-10-23";x.precioNota="Precio publicado para la variante inicial; confirmar presentación antes de comprar"}}render()}catch(e){$("rows").innerHTML='<tr><td colspan="9">Error cargando inventario: '+esc(e.message)+'</td></tr>'}
