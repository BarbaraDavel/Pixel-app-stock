const KEY="pixel-stock-preview-v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let initial=[],items=[];
const num=v=>v===""||v===null?null:Number(v);
const save=()=>localStorage.setItem(KEY,JSON.stringify(items));
function state(x){return x.minimo===null?"Sin mínimo":x.cantidad===0?"Agotado":x.cantidad<=x.minimo?"Por pedir":"Disponible"}
function render(){
 const cats=[...new Set(items.map(x=>x.categoria))].sort();
 const old=$("category").value;$("category").innerHTML='<option value="">Todas las categorías</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");$("category").value=cats.includes(old)?old:"";
 const low=items.filter(x=>x.minimo!==null&&x.cantidad<=x.minimo).length;
 $("cards").innerHTML=[["Materiales",items.length],["Por pedir",low],["Sin mínimo",items.filter(x=>x.minimo===null).length],["Hojas estimadas",items.reduce((s,x)=>s+x.cantidad,0)]].map(([k,v])=>'<div class="card"><small>'+k+'</small><strong>'+Number(v).toLocaleString("es-AR")+'</strong></div>').join("");
 const q=$("search").value.toLowerCase(),cat=$("category").value,st=$("status").value;
 $("rows").innerHTML=items.filter(x=>(x.nombre+" "+x.marca).toLowerCase().includes(q)&&(!cat||x.categoria===cat)&&(!st||(st==="low"?x.minimo!==null&&x.cantidad<=x.minimo:x.minimo===null))).map(x=>'<tr><td><b>'+esc(x.nombre)+'</b><br><small>'+esc(x.categoria)+'</small></td><td>'+esc(x.marca)+'</td><td>'+x.cantidad+'</td><td>'+x.paquetesCerrados+' cerrados · '+x.hojasAbiertas+' sueltas</td><td>'+(x.minimo??"—")+'</td><td>'+(x.precioPaquete===null?"—":"$"+x.precioPaquete.toLocaleString("es-AR"))+'</td><td><span class="pill '+(x.minimo!==null&&x.cantidad<=x.minimo?"low":"")+'">'+state(x)+'</span></td><td><button data-edit="'+esc(x.id)+'">Editar</button></td></tr>').join("")||'<tr><td colspan="8">Sin resultados</td></tr>';
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit));
}
function edit(id){
 const x=items.find(i=>i.id===id)||{id:"",nombre:"",marca:"Artjet",categoria:"Fotográficos",cantidad:0,paquetesCerrados:0,hojasAbiertas:0,hojasPorPaquete:0,minimo:null,precioPaquete:null,proveedor:"",url:"",fechaPrecio:""};
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
$("reset").onclick=()=>{if(confirm("¿Reemplazar los cambios locales por el inventario inicial?")){items=structuredClone(initial);save();render()}};
$("export").onclick=()=>{
 const keys=["nombre","marca","categoria","cantidad","paquetesCerrados","hojasAbiertas","hojasPorPaquete","minimo","precioPaquete","proveedor","url","fechaPrecio"];
 const csv=[keys.join(";"),...items.map(x=>keys.map(k=>'"'+String(x[k]??"").replace(/"/g,'""')+'"').join(";"))].join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="pixel-stock.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
try{const r=await fetch("./inventario-inicial.json");if(!r.ok)throw Error("No se pudo leer inventario");initial=await r.json();const stored=localStorage.getItem(KEY);items=stored?JSON.parse(stored):structuredClone(initial);render()}catch(e){$("rows").innerHTML='<tr><td colspan="8">Error cargando inventario: '+esc(e.message)+'</td></tr>'}
