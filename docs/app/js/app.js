import { db } from "../../js/firebase.js";
import {
  collection, getDocs, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const content = $("#appContent");
const drawer = $("#drawer");
const drawerBackdrop = $("#drawerBackdrop");
const drawerBody = $("#drawerBody");
const drawerFooter = $("#drawerFooter");
const drawerTitle = $("#drawerTitle");
const drawerEyebrow = $("#drawerEyebrow");
const clientesList = $("#clientesList");
const productosList = $("#productosList");

const state = {
  view: "inicio",
  pedidos: [], clientes: [], productos: [], insumos: [],
  orderFilter: "ACTIVOS", orderSearch: "",
  editingOrderId: null,
  draftItems: [], draftPayments: []
};

const money = (v=0) => `$${Number(v || 0).toLocaleString("es-AR", {maximumFractionDigits:2})}`;
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const esc = s => String(s ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const today = () => new Date().toISOString().slice(0,10);
function dateText(v){ if(!v) return "—"; const d = typeof v === "string" ? new Date(`${v}T12:00:00`) : v?.toDate?.() || new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR"); }
function statusClass(s){ return ({PENDIENTE:"pending",PROCESO:"process",LISTO:"ready",ENTREGADO:"done"}[s] || "done"); }
function statusText(s){ return ({PENDIENTE:"Pendiente",PROCESO:"En proceso",LISTO:"Listo",ENTREGADO:"Entregado"}[s] || s || "Pendiente"); }
function orderPaid(p){ if(Array.isArray(p.pagos) && p.pagos.length) return p.pagos.reduce((a,x)=>a+Number(x.monto||0),0); return p.pagado ? Number(p.total||0) : 0; }
function orderTotal(p){ return Number(p.total ?? (p.items||[]).reduce((a,x)=>a+Number(x.subtotal||0),0)); }
function toast(msg,type="ok"){ const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=msg; $("#toastStack").append(el); setTimeout(()=>el.remove(),2600); }

async function loadData(){
  const [p,c,pr,i] = await Promise.all([
    getDocs(collection(db,"pedidos")), getDocs(collection(db,"clientes")),
    getDocs(collection(db,"productos")), getDocs(collection(db,"insumos"))
  ]);
  state.pedidos = p.docs.map(d=>({id:d.id,...d.data()}));
  state.clientes = c.docs.map(d=>({id:d.id,...d.data()}));
  state.productos = pr.docs.map(d=>({id:d.id,...d.data()}));
  state.insumos = i.docs.map(d=>({id:d.id,...d.data()}));
  state.pedidos.sort((a,b)=> String(b.fecha||"").localeCompare(String(a.fecha||"")));
  clientesList.innerHTML = state.clientes.map(x=>`<option value="${esc(x.nombre)}"></option>`).join("");
  productosList.innerHTML = state.productos.map(x=>`<option value="${esc(x.nombre || x.producto || x.titulo)}"></option>`).join("");
}

function setView(view){
  state.view=view;
  $$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const meta={
    inicio:["Inicio","Lo importante de Pixel, sin vueltas."],
    pedidos:["Pedidos","Vendé, cobrá y seguí cada trabajo desde un solo lugar."],
    clientes:["Clientes","Historial y datos útiles, sin convertir esto en un CRM."],
    productos:["Productos","Tu catálogo reutilizable, no una obligación para vender."],
    insumos:["Insumos","Costos y materiales cuando realmente los necesitás."],
    caja:["Caja","Cobros, saldos y movimientos de Pixel."]
  }[view];
  $("#pageTitle").textContent=meta[0]; $("#pageSubtitle").textContent=meta[1];
  render();
}

function render(){
  if(state.view==="inicio") return renderHome();
  if(state.view==="pedidos") return renderOrders();
  return renderPlaceholder(state.view);
}

function renderHome(){
  const active=state.pedidos.filter(p=>!["ENTREGADO"].includes(p.estado)).length;
  const debt=state.pedidos.reduce((a,p)=>a+Math.max(0,orderTotal(p)-orderPaid(p)),0);
  const total=state.pedidos.reduce((a,p)=>a+orderTotal(p),0);
  const paid=state.pedidos.reduce((a,p)=>a+orderPaid(p),0);
  const recent=state.pedidos.slice(0,6);
  content.innerHTML=`
    <div class="grid-cards">
      <div class="metric emphasis"><div class="label">Pedidos activos</div><div class="value">${active}</div><div class="hint">Pendientes, en proceso o listos</div></div>
      <div class="metric"><div class="label">Por cobrar</div><div class="value">${money(debt)}</div><div class="hint">Saldo pendiente acumulado</div></div>
      <div class="metric"><div class="label">Cobrado</div><div class="value">${money(paid)}</div><div class="hint">Según pagos registrados</div></div>
      <div class="metric"><div class="label">Ventas registradas</div><div class="value">${money(total)}</div><div class="hint">Total histórico</div></div>
    </div>
    <section class="section">
      <div class="section-head"><div><h2>Pedidos recientes</h2><p>Entrá a cualquiera para ver el detalle.</p></div><div class="right"><button class="btn ghost small" id="homeSeeOrders">Ver todos</button></div></div>
      ${ordersTable(recent)}
    </section>`;
  $("#homeSeeOrders")?.addEventListener("click",()=>setView("pedidos"));
  bindOrderRows();
}

function filteredOrders(){
  const q=norm(state.orderSearch);
  return state.pedidos.filter(p=>{
    const st=String(p.estado||"PENDIENTE").toUpperCase();
    const byState = state.orderFilter==="TODOS" ? true : state.orderFilter==="ACTIVOS" ? st!=="ENTREGADO" : st===state.orderFilter;
    const blob=norm(`${p.cliente || p.clienteNombre || ""} ${(p.items||[]).map(x=>x.nombre||x.producto||"").join(" ")}`);
    return byState && (!q || blob.includes(q));
  });
}

function renderOrders(){
  const list=filteredOrders();
  content.innerHTML=`
    <section class="section" style="margin-top:0">
      <div class="section-head"><div><h2>Todos tus pedidos</h2><p>${list.length} resultado${list.length===1?"":"s"}</p></div><div class="right"><button class="btn primary" id="ordersNewBtn">+ Nuevo pedido</button></div></div>
      <div class="section-body" style="padding-bottom:10px">
        <div class="toolbar">
          <div class="search"><input id="orderSearch" placeholder="Buscar por cliente o producto..." value="${esc(state.orderSearch)}"></div>
          <div class="segmented" id="orderSegments">
            ${[["ACTIVOS","Activos"],["PENDIENTE","Pendientes"],["LISTO","Listos"],["ENTREGADO","Entregados"],["TODOS","Todos"]].map(([v,t])=>`<button data-filter="${v}" class="${state.orderFilter===v?"active":""}">${t}</button>`).join("")}
          </div>
        </div>
      </div>
      ${ordersTable(list)}
    </section>`;
  $("#ordersNewBtn").addEventListener("click",()=>openOrderForm());
  $("#orderSearch").addEventListener("input",e=>{state.orderSearch=e.target.value; renderOrders(); setTimeout(()=>$("#orderSearch")?.focus(),0);});
  $$("#orderSegments button").forEach(b=>b.addEventListener("click",()=>{state.orderFilter=b.dataset.filter;renderOrders();}));
  bindOrderRows();
}

function ordersTable(list){
  if(!list.length) return `<div class="empty"><strong>No hay pedidos acá</strong>Probá otro filtro o creá uno nuevo.</div>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Pago</th><th>Total</th></tr></thead><tbody>
    ${list.map(p=>{const total=orderTotal(p),paid=orderPaid(p),debt=Math.max(0,total-paid);return `<tr class="clickable order-row" data-id="${p.id}"><td><strong>${esc(p.cliente || p.clienteNombre || "Sin cliente")}</strong><div class="muted" style="font-size:11px;margin-top:2px">${esc((p.items||[])[0]?.nombre || (p.items||[])[0]?.producto || "")}${(p.items||[]).length>1?` +${(p.items||[]).length-1}`:""}</div></td><td>${dateText(p.fecha)}</td><td><span class="badge ${statusClass(p.estado)}">${statusText(p.estado)}</span></td><td>${debt<=0?`<span class="badge paid">Pagado</span>`:`<span class="badge debt">Debe ${money(debt)}</span>`}</td><td class="money">${money(total)}</td></tr>`}).join("")}
  </tbody></table></div>`;
}
function bindOrderRows(){ $$(".order-row").forEach(r=>r.addEventListener("click",()=>openOrderDetail(r.dataset.id))); }

function openDrawer({eyebrow="",title="",body="",footer=""}){
  drawerEyebrow.textContent=eyebrow; drawerTitle.textContent=title; drawerBody.innerHTML=body; drawerFooter.innerHTML=footer;
  drawer.classList.add("open"); drawerBackdrop.classList.add("open"); drawer.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
}
function closeDrawer(){ drawer.classList.remove("open"); drawerBackdrop.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }

function openOrderDetail(id){
  const p=state.pedidos.find(x=>x.id===id); if(!p)return;
  const total=orderTotal(p), paid=orderPaid(p), debt=Math.max(0,total-paid);
  const items=p.items||[]; const payments=p.pagos||[];
  openDrawer({eyebrow:"Pedido",title:p.cliente || p.clienteNombre || "Sin cliente",body:`
    <div class="detail-hero"><div><div class="big">${money(total)}</div><div class="sub">${dateText(p.fecha)} · ${statusText(p.estado)}</div></div><span class="badge ${statusClass(p.estado)}">${statusText(p.estado)}</span></div>
    <div class="detail-grid"><div class="mini-card"><span>Pagado</span><strong>${money(paid)}</strong></div><div class="mini-card"><span>Pendiente</span><strong>${money(debt)}</strong></div><div class="mini-card"><span>Ítems</span><strong>${items.length}</strong></div></div>
    <div class="block-title">Productos / trabajos</div>
    ${items.length?items.map(x=>`<div class="item-row"><div><strong>${esc(x.nombre||x.producto||"Ítem")}</strong><div class="meta">${Number(x.cantidad||1)} × ${money(x.precioUnitario ?? (Number(x.cantidad||1)?Number(x.subtotal||0)/Number(x.cantidad||1):0))}</div></div><strong>${money(x.subtotal||0)}</strong></div>`).join(""):`<div class="muted">Sin ítems guardados.</div>`}
    <div class="block-title">Pagos</div>
    ${payments.length?payments.map(x=>`<div class="payment-row"><div><strong>${esc(x.medio||"Pago")}</strong><div class="meta">${dateText(x.fecha)}</div></div><strong>${money(x.monto)}</strong></div>`).join(""):`<div class="muted">Todavía no hay pagos detallados.</div>`}
    ${p.nota?`<div class="block-title">Nota</div><div class="mini-card">${esc(p.nota)}</div>`:""}
  `,footer:`<button class="btn ghost" id="detailClose">Cerrar</button><button class="btn primary" id="detailEdit">Editar pedido</button>`});
  $("#detailClose").addEventListener("click",closeDrawer);
  $("#detailEdit").addEventListener("click",()=>openOrderForm(p));
}

function productByName(name){ return state.productos.find(p=>norm(p.nombre||p.producto||p.titulo)===norm(name)); }
function clientByName(name){ return state.clientes.find(c=>norm(c.nombre)===norm(name)); }

function openOrderForm(order=null){
  state.editingOrderId=order?.id||null;
  state.draftItems=(order?.items||[]).map(x=>({...x}));
  state.draftPayments=(order?.pagos||[]).map(x=>({...x}));
  const clientName=order?.cliente || order?.clienteNombre || "";
  const existingClient=clientByName(clientName);
  openDrawer({eyebrow:order?"Editar pedido":"Nuevo pedido",title:order?clientName||"Pedido":"Crear pedido",body:orderFormHtml(order,existingClient),footer:`<button class="btn ghost" id="orderCancel">Cancelar</button><button class="btn primary" id="orderSave">${order?"Guardar cambios":"Crear pedido"}</button>`});
  bindOrderForm(order);
}

function orderFormHtml(order,existingClient){
  const phone=order?.telefono || order?.whatsapp || existingClient?.telefono || existingClient?.whatsapp || "";
  const red=order?.instagram || order?.red || existingClient?.instagram || existingClient?.red || "";
  return `
  <div class="form-section">
    <h3>Cliente</h3>
    <div class="field"><label>Nombre</label><input id="fClient" list="clientesList" value="${esc(order?.cliente || order?.clienteNombre || "")}" placeholder="Buscar o escribir un cliente"></div>
    <details class="collapsible"><summary>Datos opcionales del cliente</summary><div class="inside form-grid"><div class="field"><label>Celular</label><input id="fPhone" value="${esc(phone)}" placeholder="WhatsApp"></div><div class="field"><label>Instagram / contacto</label><input id="fRed" value="${esc(red)}" placeholder="@usuario"></div></div></details>
  </div>
  <div class="form-section">
    <h3>Productos o trabajos</h3>
    <div class="order-item-editor">
      <div class="field item-name"><label>Producto o trabajo</label><input id="fItemName" list="productosList" placeholder="Ej. 60 etiquetas XV"></div>
      <div class="field"><label>Cant.</label><input id="fQty" type="number" min="0.01" step="0.01" value="1"></div>
      <div class="field"><label>Precio</label><input id="fPrice" type="number" min="0" step="0.01" placeholder="0"></div>
      <div class="field price-mode"><label>Tipo</label><select id="fPriceMode"><option value="total">Total</option><option value="unit">Por unidad</option></select></div>
      <button class="btn soft add-action" id="addDraftItem">Agregar</button>
    </div>
    <div class="order-items" id="draftItems"></div>
    <div class="total-line"><span>Total del pedido</span><strong id="draftTotal">${money(0)}</strong></div>
  </div>
  <div class="form-section">
    <h3>Pago</h3>
    <div id="draftPaymentSummary"></div>
    <details class="collapsible"><summary>+ Registrar pago</summary><div class="inside"><div class="pay-inline"><div class="field"><label>Monto</label><input id="fPayAmount" type="number" min="0" step="0.01" placeholder="0"></div><div class="field"><label>Medio</label><select id="fPayMethod"><option>Mercado Pago</option><option>Transferencia</option><option>Efectivo</option><option>Otro</option></select></div><div class="field full"><label>Fecha</label><input id="fPayDate" type="date" value="${today()}"></div></div><button class="btn soft small" id="addDraftPayment" style="margin-top:10px">Agregar pago</button></div></details>
  </div>
  <details class="collapsible" ${order?"open":""}><summary>Más opciones</summary><div class="inside form-grid"><div class="field"><label>Fecha</label><input id="fDate" type="date" value="${esc(order?.fecha || today())}"></div><div class="field"><label>Estado</label><select id="fStatus">${["PENDIENTE","PROCESO","LISTO","ENTREGADO"].map(s=>`<option value="${s}" ${(order?.estado||"PENDIENTE")===s?"selected":""}>${statusText(s)}</option>`).join("")}</select></div><div class="field full"><label>Nota</label><textarea id="fNote" rows="3" placeholder="Solo si hace falta">${esc(order?.nota||"")}</textarea></div></div></details>
  <div id="orderFormError" class="form-error"></div>`;
}

function bindOrderForm(order){
  renderDraftItems(); renderDraftPayments();
  $("#fItemName").addEventListener("change",e=>{const p=productByName(e.target.value); if(p){ $("#fPrice").value=Number(p.precio||p.valor||p.importe||0); $("#fPriceMode").value="unit"; }});
  $("#addDraftItem").addEventListener("click",()=>{
    const name=$("#fItemName").value.trim(), qty=Number($("#fQty").value||0), price=Number($("#fPrice").value||0), mode=$("#fPriceMode").value;
    if(!name || qty<=0 || price<0) return showFormError("Completá producto, cantidad y precio.");
    const subtotal=mode==="unit"?qty*price:price;
    state.draftItems.push({nombre:name,cantidad:qty,precioUnitario:mode==="unit"?price:(qty?price/qty:price),subtotal,tipoPrecio:mode});
    $("#fItemName").value=""; $("#fQty").value="1"; $("#fPrice").value=""; $("#fPriceMode").value="total";
    renderDraftItems(); renderDraftPayments(); $("#fItemName").focus();
  });
  $("#addDraftPayment").addEventListener("click",()=>{
    const amount=Number($("#fPayAmount").value||0); if(amount<=0)return showFormError("Ingresá un monto de pago válido.");
    state.draftPayments.push({monto:amount,medio:$("#fPayMethod").value,fecha:$("#fPayDate").value||today()});
    $("#fPayAmount").value=""; renderDraftPayments();
  });
  $("#orderCancel").addEventListener("click",closeDrawer);
  $("#orderSave").addEventListener("click",()=>saveOrder(order));
}
function showFormError(msg){$("#orderFormError").textContent=msg;setTimeout(()=>{if($("#orderFormError"))$("#orderFormError").textContent=""},2600)}
function draftTotal(){return state.draftItems.reduce((a,x)=>a+Number(x.subtotal||0),0)}
function renderDraftItems(){
  const host=$("#draftItems"); if(!host)return;
  host.innerHTML=state.draftItems.length?state.draftItems.map((x,i)=>`<div class="editable-item"><div><div class="name">${esc(x.nombre||x.producto||"Ítem")}</div><div class="meta">${x.cantidad||1} · ${x.tipoPrecio==="unit"?`${money(x.precioUnitario)} c/u`:"precio total"}</div></div><strong class="item-price">${money(x.subtotal)}</strong><button class="icon-btn remove-item" data-i="${i}" style="width:34px;height:34px;font-size:16px">×</button></div>`).join(""):`<div class="muted" style="font-size:12px">Todavía no agregaste productos.</div>`;
  $("#draftTotal").textContent=money(draftTotal());
  $$(".remove-item",host).forEach(b=>b.addEventListener("click",()=>{state.draftItems.splice(Number(b.dataset.i),1);renderDraftItems();renderDraftPayments();}));
}
function renderDraftPayments(){
  const host=$("#draftPaymentSummary"); if(!host)return;
  const total=draftTotal(), paid=state.draftPayments.reduce((a,x)=>a+Number(x.monto||0),0), debt=Math.max(0,total-paid);
  host.innerHTML=`<div class="detail-grid" style="margin-top:0"><div class="mini-card"><span>Total</span><strong>${money(total)}</strong></div><div class="mini-card"><span>Pagado</span><strong>${money(paid)}</strong></div><div class="mini-card"><span>Pendiente</span><strong>${money(debt)}</strong></div></div>${state.draftPayments.map((x,i)=>`<div class="payment-row"><div><strong>${esc(x.medio)}</strong><div class="meta">${dateText(x.fecha)}</div></div><strong>${money(x.monto)}</strong><button class="icon-btn remove-pay" data-i="${i}" style="width:32px;height:32px;font-size:15px">×</button></div>`).join("")}`;
  $$(".remove-pay",host).forEach(b=>b.addEventListener("click",()=>{state.draftPayments.splice(Number(b.dataset.i),1);renderDraftPayments();}));
}

async function saveOrder(existing){
  const cliente=$("#fClient").value.trim(); if(!cliente)return showFormError("Ingresá el nombre del cliente.");
  if(!state.draftItems.length)return showFormError("Agregá al menos un producto o trabajo.");
  const phone=$("#fPhone").value.trim(), red=$("#fRed").value.trim();
  const total=draftTotal(), paid=state.draftPayments.reduce((a,x)=>a+Number(x.monto||0),0);
  const payload={cliente,clienteNombre:cliente,telefono:phone,whatsapp:phone,instagram:red,red,items:state.draftItems,total,pagos:state.draftPayments,pagado:paid>=total && total>0,fecha:$("#fDate").value||today(),estado:$("#fStatus").value,nota:$("#fNote").value.trim(),updatedAt:serverTimestamp()};
  try{
    let cl=clientByName(cliente);
    if(!cl){const ref=await addDoc(collection(db,"clientes"),{nombre:cliente,telefono:phone,whatsapp:phone,instagram:red,red,createdAt:serverTimestamp()});state.clientes.push({id:ref.id,nombre:cliente,telefono:phone,whatsapp:phone,instagram:red,red});}
    else if(phone || red){await updateDoc(doc(db,"clientes",cl.id),{telefono:phone||cl.telefono||"",whatsapp:phone||cl.whatsapp||"",instagram:red||cl.instagram||"",red:red||cl.red||""}); Object.assign(cl,{telefono:phone||cl.telefono,whatsapp:phone||cl.whatsapp,instagram:red||cl.instagram,red:red||cl.red});}
    if(existing){await updateDoc(doc(db,"pedidos",existing.id),payload);Object.assign(existing,payload);toast("Pedido actualizado");}
    else{const ref=await addDoc(collection(db,"pedidos"),{...payload,createdAt:serverTimestamp()});state.pedidos.unshift({id:ref.id,...payload});toast("Pedido creado");}
    clientesList.innerHTML=state.clientes.map(x=>`<option value="${esc(x.nombre)}"></option>`).join(""); closeDrawer(); render();
  }catch(err){console.error(err);showFormError("No se pudo guardar. Revisá la consola para más detalle.");}
}

function renderPlaceholder(view){
  const cfg={clientes:["Clientes","Acá vamos a tener ficha, historial de pedidos, total comprado y saldo pendiente.","../clientes.html","Abrir Clientes clásico"],productos:["Productos","Va a quedar como catálogo reutilizable: precio, costo, margen y estado.","../productos.html","Abrir Productos clásico"],insumos:["Insumos","Vamos a simplificar costos, unidades y stock opcional.","../insumos.html","Abrir Insumos clásico"],caja:["Caja","Este módulo va a concentrar cobros, saldos y gastos.","../dashboard.html","Ver dashboard actual"]}[view];
  content.innerHTML=`<div class="placeholder"><h2>${cfg[0]} está en la siguiente etapa</h2><p>${cfg[1]} Mientras la remasterizamos, podés seguir usando el módulo anterior con los mismos datos.</p><a class="btn soft" href="${cfg[2]}">${cfg[3]} ↗</a></div>`;
}

$$(".nav-link").forEach(b=>b.addEventListener("click",()=>{setView(b.dataset.view); $("#sidebar").classList.remove("open");}));
$("#globalNewOrderBtn").addEventListener("click",()=>openOrderForm());
$("#drawerCloseBtn").addEventListener("click",closeDrawer); drawerBackdrop.addEventListener("click",closeDrawer);
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))closeDrawer();});

content.innerHTML=`<div class="empty"><strong>Cargando Pixel…</strong>Un segundo.</div>`;
try{await loadData(); render();}catch(err){console.error(err);content.innerHTML=`<div class="empty"><strong>No pude cargar los datos</strong>Revisá la consola del navegador.</div>`;}
