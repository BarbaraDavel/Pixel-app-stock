import { db } from "../../js/firebase.js";
import {
  collection, getDocs, addDoc, updateDoc, setDoc, deleteDoc, doc, serverTimestamp
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

// Google Drive: este Client ID es publico por diseno en una app web.
// Nunca agregar el Client Secret al frontend ni al repositorio.
const GOOGLE_CLIENT_ID = "342382119563-4pgth5tn1fp5fsjip2uuknja767evk5d.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
let driveTokenClient = null;

const state = {
  view: "inicio",
  pedidos: [], clientes: [], productos: [], insumos: [], recetas: {}, gastos: [], biblioteca: [],
  orderFilter: "ACTIVOS", orderSearch: "", clientSearch: "", productSearch: "", supplySearch: "", cashFilter: "TODOS", librarySearch: "", libraryFilter: "TODOS",
  driveConnected: false, driveAccessToken: "", driveResults: [], driveLoading: false, driveError: "", driveLastQuery: "",
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
  const [p,c,pr,i,r,g,b] = await Promise.all([
    getDocs(collection(db,"pedidos")), getDocs(collection(db,"clientes")),
    getDocs(collection(db,"productos")), getDocs(collection(db,"insumos")),
    getDocs(collection(db,"recetas")), getDocs(collection(db,"gastos")),
    getDocs(collection(db,"biblioteca"))
  ]);
  state.pedidos = p.docs.map(d=>({id:d.id,...d.data()}));
  state.clientes = c.docs.map(d=>({id:d.id,...d.data()}));
  state.productos = pr.docs.map(d=>({id:d.id,...d.data()}));
  state.insumos = i.docs.map(d=>({id:d.id,...d.data()}));
  state.recetas = Object.fromEntries(r.docs.map(d=>[d.id,{id:d.id,...d.data()}]));
  state.gastos = g.docs.map(d=>({id:d.id,...d.data()}));
  state.biblioteca = b.docs.map(d=>({id:d.id,...d.data()}));
  state.pedidos.sort((a,b)=> String(b.fecha||"").localeCompare(String(a.fecha||"")));
  state.clientes.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"}));
  state.productos.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"}));
  state.insumos.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"}));
  state.biblioteca.sort((a,b)=>String(b.updatedAt?.seconds||b.createdAt?.seconds||0).localeCompare(String(a.updatedAt?.seconds||a.createdAt?.seconds||0)));
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
    caja:["Caja","Cobros, saldos y movimientos de Pixel."],
    biblioteca:["Biblioteca","Encontrá instructivos, moldes, diseños y recursos sin revolver todo Drive."]
  }[view];
  $("#pageTitle").textContent=meta[0]; $("#pageSubtitle").textContent=meta[1];
  render();
}

function render(){
  if(state.view==="inicio") return renderHome();
  if(state.view==="pedidos") return renderOrders();
  if(state.view==="clientes") return renderClients();
  if(state.view==="productos") return renderProducts();
  if(state.view==="insumos") return renderSupplies();
  if(state.view==="caja") return renderCash();
  if(state.view==="biblioteca") return renderLibrary();
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

function openOrderForm(order=null, prefilledClient=""){
  state.editingOrderId=order?.id||null;
  state.draftItems=(order?.items||[]).map(x=>({...x}));
  state.draftPayments=(order?.pagos||[]).map(x=>({...x}));
  const clientName=order?.cliente || order?.clienteNombre || "";
  const existingClient=clientByName(clientName);
  openDrawer({eyebrow:order?"Editar pedido":"Nuevo pedido",title:order?clientName||"Pedido":"Crear pedido",body:orderFormHtml(order,existingClient,prefilledClient),footer:`<button class="btn ghost" id="orderCancel">Cancelar</button><button class="btn primary" id="orderSave">${order?"Guardar cambios":"Crear pedido"}</button>`});
  bindOrderForm(order);
}

function orderFormHtml(order,existingClient,prefilledClient=""){
  const phone=order?.telefono || order?.whatsapp || existingClient?.telefono || existingClient?.whatsapp || "";
  const red=order?.instagram || order?.red || existingClient?.instagram || existingClient?.red || "";
  return `
  <div class="form-section">
    <h3>Cliente</h3>
    <div class="field"><label>Nombre</label><input id="fClient" list="clientesList" value="${esc(order?.cliente || order?.clienteNombre || prefilledClient || "")}" placeholder="Buscar o escribir un cliente"></div>
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


function getSupplyUnitCost(ins){
  const saved=Number(ins?.costoUnitario||0), pack=Number(ins?.costoPaquete||0), qty=Number(ins?.cantidadPaquete||0);
  return pack>0 && qty>0 ? pack/qty : saved;
}
function productCost(p){
  const recipe=state.recetas[p.id];
  if(!recipe) return Number(p.costo||p.costoUnitario||0);
  const itemsCost=(recipe.items||[]).reduce((sum,item)=>{
    const ins=state.insumos.find(x=>x.id===item.insumoId);
    return sum + Number(item.cantidad||0)*getSupplyUnitCost(ins);
  },0);
  const extrasCost=(recipe.gastos||[]).reduce((sum,g)=>sum+Number(g.importe||0),0);
  if(itemsCost || extrasCost) return itemsCost + extrasCost;
  return Number(recipe.costoUnitario||p.costo||0);
}
function clientOrders(name){ const n=norm(name); return state.pedidos.filter(p=>norm(p.cliente||p.clienteNombre)===n); }
function clientStats(c){
  const orders=clientOrders(c.nombre), total=orders.reduce((a,p)=>a+orderTotal(p),0), paid=orders.reduce((a,p)=>a+orderPaid(p),0);
  return {orders,total,paid,debt:Math.max(0,total-paid)};
}
function setDrawer(eyebrow,title,body,footer=""){
  openDrawer({eyebrow,title,body,footer});
}

function renderClients(){
  const q=norm(state.clientSearch);
  const list=state.clientes.filter(c=>!q || norm(`${c.nombre||""} ${c.apodo||""} ${c.telefono||c.whatsapp||""} ${c.red||c.instagram||""}`).includes(q));
  content.innerHTML=`<section class="section" style="margin-top:0"><div class="section-head"><div><h2>Clientes</h2><p>${list.length} cliente${list.length===1?"":"s"}. Entrá a uno para ver su historial.</p></div><div class="right"><button class="btn primary" id="newClientBtn">+ Nuevo cliente</button></div></div><div class="section-body slim"><div class="toolbar"><div class="search"><input id="clientSearch" placeholder="Buscar por nombre, teléfono o Instagram..." value="${esc(state.clientSearch)}"></div></div></div>${clientsTable(list)}</section>`;
  $("#newClientBtn").onclick=()=>openClientForm();
  $("#clientSearch").oninput=e=>{state.clientSearch=e.target.value;renderClients();setTimeout(()=>{$("#clientSearch")?.focus(); const x=$("#clientSearch"); if(x)x.selectionStart=x.selectionEnd=x.value.length},0)};
  $$("tr[data-client-id]").forEach(r=>r.onclick=()=>openClientDetail(r.dataset.clientId));
}
function clientsTable(list){
  if(!list.length)return `<div class="empty"><strong>No encontré clientes</strong>Probá con otra búsqueda o creá uno nuevo.</div>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Pedidos</th><th>Compró</th><th>Debe</th></tr></thead><tbody>${list.map(c=>{const st=clientStats(c);return `<tr class="clickable" data-client-id="${c.id}"><td><strong>${esc(c.nombre||"Sin nombre")}</strong>${c.apodo?`<div class="subcell">${esc(c.apodo)}</div>`:""}</td><td>${esc(c.telefono||c.whatsapp||c.red||c.instagram||"—")}</td><td>${st.orders.length}</td><td class="money">${money(st.total)}</td><td>${st.debt>0?`<span class="badge debt">${money(st.debt)}</span>`:`<span class="badge paid">Al día</span>`}</td></tr>`}).join("")}</tbody></table></div>`;
}
function openClientDetail(id){
  const c=state.clientes.find(x=>x.id===id); if(!c)return; const st=clientStats(c);
  setDrawer("Cliente",c.nombre||"Cliente",`<div class="detail-hero"><div><div class="big">${money(st.total)}</div><div class="sub">Compras registradas · ${st.orders.length} pedido${st.orders.length===1?"":"s"}</div></div>${st.debt>0?`<span class="badge debt">Debe ${money(st.debt)}</span>`:`<span class="badge paid">Al día</span>`}</div><div class="detail-grid"><div class="mini-card"><span>Pagado</span><strong>${money(st.paid)}</strong></div><div class="mini-card"><span>Pendiente</span><strong>${money(st.debt)}</strong></div><div class="mini-card"><span>Pedidos</span><strong>${st.orders.length}</strong></div></div><div class="block-title">Contacto</div><div class="info-list"><div><span>Celular</span><strong>${esc(c.telefono||c.whatsapp||"—")}</strong></div><div><span>Instagram / contacto</span><strong>${esc(c.red||c.instagram||"—")}</strong></div>${c.nota?`<div><span>Nota</span><strong>${esc(c.nota)}</strong></div>`:""}</div><div class="block-title">Últimos pedidos</div>${st.orders.length?st.orders.slice().sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))).slice(0,6).map(p=>`<button class="list-link" data-open-order="${p.id}"><span><strong>${dateText(p.fecha)}</strong><small>${esc((p.items||[]).map(i=>i.nombre||i.producto).filter(Boolean).join(", ")||"Pedido")}</small></span><b>${money(orderTotal(p))}</b></button>`).join(""):`<div class="empty compact">Todavía no tiene pedidos.</div>`}`,`<button class="btn ghost" id="editClientBtn">Editar</button><button class="btn primary" id="clientNewOrderBtn">+ Nuevo pedido</button>`);
  $("#editClientBtn").onclick=()=>openClientForm(c); $("#clientNewOrderBtn").onclick=()=>openOrderForm(null,c.nombre);
  $$('[data-open-order]').forEach(b=>b.onclick=()=>openOrderDetail(b.dataset.openOrder));
}
function openClientForm(c=null){
  setDrawer(c?"Editar cliente":"Nuevo","Cliente",`<div class="form-section"><div class="form-grid"><div class="field full"><label>Nombre *</label><input id="cName" value="${esc(c?.nombre||"")}" autofocus></div><div class="field"><label>Apodo</label><input id="cNick" value="${esc(c?.apodo||"")}"></div><div class="field"><label>Celular / WhatsApp</label><input id="cPhone" value="${esc(c?.telefono||c?.whatsapp||"")}"></div><div class="field full"><label>Instagram / contacto</label><input id="cRed" value="${esc(c?.red||c?.instagram||"")}" placeholder="@usuario"></div><div class="field full"><label>Nota</label><textarea id="cNote" rows="3">${esc(c?.nota||"")}</textarea></div></div><div id="clientFormError" class="form-error"></div></div>`,`<button class="btn ghost" id="clientCancel">Cancelar</button><button class="btn primary" id="clientSave">${c?"Guardar cambios":"Crear cliente"}</button>`);
  $("#clientCancel").onclick=closeDrawer; $("#clientSave").onclick=async()=>{const nombre=$("#cName").value.trim();if(!nombre)return $("#clientFormError").textContent="El nombre es obligatorio."; const data={nombre,apodo:$("#cNick").value.trim(),telefono:$("#cPhone").value.trim(),whatsapp:$("#cPhone").value.trim(),red:$("#cRed").value.trim(),instagram:$("#cRed").value.trim(),nota:$("#cNote").value.trim(),updatedAt:serverTimestamp()};try{if(c){await updateDoc(doc(db,"clientes",c.id),data);Object.assign(c,data);toast("Cliente actualizado")}else{const ref=await addDoc(collection(db,"clientes"),{...data,createdAt:serverTimestamp()});state.clientes.push({id:ref.id,...data});toast("Cliente creado")}state.clientes.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"}));clientesList.innerHTML=state.clientes.map(x=>`<option value="${esc(x.nombre)}"></option>`).join("");closeDrawer();renderClients()}catch(err){console.error(err);$("#clientFormError").textContent="No se pudo guardar."}};
}

function renderProducts(){
  const q=norm(state.productSearch), list=state.productos.filter(p=>!q||norm(p.nombre||p.producto||"").includes(q));
  content.innerHTML=`<section class="section" style="margin-top:0"><div class="section-head"><div><h2>Productos</h2><p>Tu catálogo reutilizable. Los trabajos únicos pueden seguir viviendo solo en Pedidos.</p></div><div class="right"><button class="btn primary" id="newProductBtn">+ Nuevo producto</button></div></div><div class="section-body slim"><div class="toolbar"><div class="search"><input id="productSearch" placeholder="Buscar producto..." value="${esc(state.productSearch)}"></div></div></div>${productsTable(list)}</section>`;
  $("#newProductBtn").onclick=()=>openProductForm(); $("#productSearch").oninput=e=>{state.productSearch=e.target.value;renderProducts();setTimeout(()=>$("#productSearch")?.focus(),0)}; $$('tr[data-product-id]').forEach(r=>r.onclick=()=>openProductDetail(r.dataset.productId));
}
function productsTable(list){if(!list.length)return `<div class="empty"><strong>No hay productos</strong>Creá los que realmente repetís.</div>`;return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Producto</th><th>Precio</th><th>Costo</th><th>Ganancia</th><th>Margen</th></tr></thead><tbody>${list.map(p=>{const price=Number(p.precio||0),cost=productCost(p),gain=price-cost,margin=price>0?gain/price*100:0;return `<tr class="clickable" data-product-id="${p.id}"><td><strong>${esc(p.nombre||"Producto")}</strong>${state.recetas[p.id]?`<div class="subcell">Con receta</div>`:""}</td><td class="money">${money(price)}</td><td>${money(cost)}</td><td class="money">${money(gain)}</td><td><span class="badge ${margin>=50?"paid":margin>=25?"process":"debt"}">${margin.toFixed(0)}%</span></td></tr>`}).join("")}</tbody></table></div>`}
function openProductDetail(id){const p=state.productos.find(x=>x.id===id);if(!p)return;const price=Number(p.precio||0),cost=productCost(p),gain=price-cost,margin=price>0?gain/price*100:0,recipe=state.recetas[p.id];setDrawer("Producto",p.nombre||"Producto",`<div class="detail-hero"><div><div class="big">${money(price)}</div><div class="sub">Precio de venta</div></div><span class="badge ${margin>=50?"paid":margin>=25?"process":"debt"}">${margin.toFixed(0)}% margen</span></div><div class="detail-grid"><div class="mini-card"><span>Costo</span><strong>${money(cost)}</strong></div><div class="mini-card"><span>Ganancia</span><strong>${money(gain)}</strong></div><div class="mini-card"><span>Margen</span><strong>${margin.toFixed(1)}%</strong></div></div><div class="block-title">Costo / receta</div>${recipe&&Array.isArray(recipe.items)&&recipe.items.length?recipe.items.map(item=>{const ins=state.insumos.find(x=>x.id===item.insumoId);return `<div class="item-row"><div><strong>${esc(ins?.nombre||"Insumo")}</strong><div class="meta">${Number(item.cantidad||0)} usado</div></div><strong>${money(Number(item.cantidad||0)*getSupplyUnitCost(ins))}</strong></div>`}).join(""):`<div class="empty compact">Sin receta asociada. Podés usarlo igual en pedidos.</div>`}`,`<button class="btn ghost" id="editProductBtn">Editar</button><button class="btn primary" id="productOrderBtn">Usar en pedido</button>`);$("#editProductBtn").onclick=()=>openProductForm(p);$("#productOrderBtn").onclick=()=>{openOrderForm();setTimeout(()=>{const x=$("#fItemName");if(x){x.value=p.nombre; x.dispatchEvent(new Event("change"));}},80)}}
function openProductForm(p=null){
  const existingRecipe=p ? state.recetas[p.id] : null;
  let recipeItems=(existingRecipe?.items||[]).map(x=>({...x}));
  let extraCosts=(existingRecipe?.gastos||[]).map(x=>({...x}));
  const supplyOptions=(selected="")=>`<option value="">Elegir insumo...</option>${state.insumos.map(i=>`<option value="${i.id}" ${i.id===selected?"selected":""}>${esc(i.nombre)}</option>`).join("")}`;
  setDrawer(p?"Editar producto":"Nuevo","Producto",`
    <div class="form-section product-basic">
      <div class="form-grid">
        <div class="field full"><label>Nombre *</label><input id="pName" value="${esc(p?.nombre||"")}" placeholder="Ej. Sticker común"></div>
        <div class="field full"><label>Precio de venta *</label><input id="pPrice" type="number" min="0" step="0.01" value="${Number(p?.precio||0)||""}" placeholder="0"></div>
      </div>
    </div>
    <div class="form-section recipe-section">
      <div class="form-section-head"><div><h3>Materiales</h3><p>Qué usás para hacer una unidad de este producto.</p></div><button class="btn ghost small" id="addRecipeItem">+ Agregar material</button></div>
      <div id="recipeItems" class="recipe-list"></div>
    </div>
    <div class="form-section recipe-section">
      <div class="form-section-head"><div><h3>Otros gastos</h3><p>Packaging, impresión externa u otros costos que no están en Insumos.</p></div><button class="btn ghost small" id="addExtraCost">+ Agregar gasto</button></div>
      <div id="extraCosts" class="recipe-list"></div>
    </div>
    <div class="cost-summary">
      <div><span>Costo</span><strong id="sumCost">$0</strong></div>
      <div><span>Venta</span><strong id="sumPrice">$0</strong></div>
      <div class="profit"><span>Ganancia</span><strong id="sumGain">$0</strong></div>
      <div><span>Margen</span><strong id="sumMargin">0%</strong></div>
    </div>
    <details class="manual-cost"><summary>Usar costo manual</summary><div class="inside"><div class="field"><label>Costo manual (reemplaza la receta si no cargás materiales)</label><input id="pCost" type="number" min="0" step="0.01" value="${Number(p?.costo||0)||""}" placeholder="0"></div></div></details>
    <div id="productFormError" class="form-error"></div>`,
    `<button class="btn ghost" id="productCancel">Cancelar</button><button class="btn primary" id="productSave">Guardar producto</button>`);

  const calc=()=>{
    const materialCost=recipeItems.reduce((sum,item)=>{const ins=state.insumos.find(x=>x.id===item.insumoId);return sum+Number(item.cantidad||0)*getSupplyUnitCost(ins)},0);
    const extras=extraCosts.reduce((sum,g)=>sum+Number(g.importe||0),0);
    const manual=Number($("#pCost")?.value||0);
    const cost=(materialCost+extras)>0?materialCost+extras:manual;
    const price=Number($("#pPrice")?.value||0), gain=price-cost, margin=price>0?gain/price*100:0;
    $("#sumCost").textContent=money(cost); $("#sumPrice").textContent=money(price); $("#sumGain").textContent=money(gain); $("#sumMargin").textContent=`${margin.toFixed(0)}%`;
  };
  const renderRecipe=()=>{
    const host=$("#recipeItems");
    host.innerHTML=recipeItems.length?recipeItems.map((item,i)=>{const ins=state.insumos.find(x=>x.id===item.insumoId), sub=Number(item.cantidad||0)*getSupplyUnitCost(ins);return `<div class="recipe-row" data-i="${i}"><div class="field"><label>Insumo</label><select class="recipe-supply">${supplyOptions(item.insumoId)}</select>${ins?`<div class="hint">${money(getSupplyUnitCost(ins))} ${ins.unidad?`por ${esc(ins.unidad)}`:"por unidad"}</div>`:""}</div><div class="field qty"><label>Cantidad usada</label><input class="recipe-qty" type="number" min="0" step="0.01" value="${Number(item.cantidad||0)||""}" placeholder="0"></div><div class="recipe-sub"><span>Subtotal</span><strong>${money(sub)}</strong></div><button class="icon-btn recipe-remove" title="Eliminar material">🗑</button></div>`}).join(""):`<div class="empty compact">Todavía no agregaste materiales.</div>`;
    $$(".recipe-row",host).forEach(row=>{const i=Number(row.dataset.i);$(".recipe-supply",row).onchange=e=>{recipeItems[i].insumoId=e.target.value;renderRecipe();calc()};$(".recipe-qty",row).oninput=e=>{recipeItems[i].cantidad=Number(e.target.value||0);const ins=state.insumos.find(x=>x.id===recipeItems[i].insumoId);$(".recipe-sub strong",row).textContent=money(recipeItems[i].cantidad*getSupplyUnitCost(ins));calc()};$(".recipe-remove",row).onclick=()=>{recipeItems.splice(i,1);renderRecipe();calc()}});
  };
  const renderExtras=()=>{
    const host=$("#extraCosts");host.innerHTML=extraCosts.length?extraCosts.map((g,i)=>`<div class="extra-row" data-i="${i}"><div class="field"><label>Concepto</label><input class="extra-name" value="${esc(g.nombre||"")}" placeholder="Ej. Bolsita especial"></div><div class="field"><label>Importe</label><input class="extra-amount" type="number" min="0" step="0.01" value="${Number(g.importe||0)||""}" placeholder="0"></div><button class="icon-btn extra-remove" title="Eliminar gasto">🗑</button></div>`).join(""):`<div class="empty compact">Sin otros gastos.</div>`;
    $$(".extra-row",host).forEach(row=>{const i=Number(row.dataset.i);$(".extra-name",row).oninput=e=>extraCosts[i].nombre=e.target.value;$(".extra-amount",row).oninput=e=>{extraCosts[i].importe=Number(e.target.value||0);calc()};$(".extra-remove",row).onclick=()=>{extraCosts.splice(i,1);renderExtras();calc()}});
  };
  $("#addRecipeItem").onclick=()=>{recipeItems.push({insumoId:"",cantidad:1});renderRecipe();calc()};
  $("#addExtraCost").onclick=()=>{extraCosts.push({nombre:"",importe:0});renderExtras();calc()};
  $("#pPrice").oninput=calc; $("#pCost").oninput=calc; $("#productCancel").onclick=closeDrawer;
  renderRecipe();renderExtras();calc();
  $("#productSave").onclick=async()=>{
    const nombre=$("#pName").value.trim(),precio=Number($("#pPrice").value||0),costo=Number($("#pCost").value||0);
    if(!nombre)return $("#productFormError").textContent="Ingresá un nombre.";
    if(precio<0)return $("#productFormError").textContent="Revisá el precio.";
    if(recipeItems.some(x=>!x.insumoId || Number(x.cantidad||0)<=0))return $("#productFormError").textContent="Revisá los materiales: elegí un insumo y una cantidad mayor a 0.";
    const data={nombre,precio,costo,updatedAt:serverTimestamp()};
    try{
      let product=p;
      if(p){await updateDoc(doc(db,"productos",p.id),data);Object.assign(p,data);toast("Producto actualizado")}
      else{const ref=await addDoc(collection(db,"productos"),{...data,createdAt:serverTimestamp()});product={id:ref.id,...data};state.productos.push(product);toast("Producto creado")}
      const oldRecipe=state.recetas[product.id]||{};
      const recipeData={...oldRecipe,productoId:product.id,items:recipeItems,gastos:extraCosts,updatedAt:serverTimestamp()};
      await setDoc(doc(db,"recetas",product.id),recipeData);
      state.recetas[product.id]={id:product.id,...recipeData};
      state.productos.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"}));
      productosList.innerHTML=state.productos.map(x=>`<option value="${esc(x.nombre)}"></option>`).join("");closeDrawer();renderProducts();
    }catch(err){console.error(err);$("#productFormError").textContent="No se pudo guardar."}
  };
}

function renderSupplies(){const q=norm(state.supplySearch),list=state.insumos.filter(i=>!q||norm(i.nombre||"").includes(q));content.innerHTML=`<section class="section" style="margin-top:0"><div class="section-head"><div><h2>Insumos</h2><p>Acá importa el costo. El stock fino lo dejamos opcional por ahora.</p></div><div class="right"><button class="btn primary" id="newSupplyBtn">+ Nuevo insumo</button></div></div><div class="section-body slim"><div class="toolbar"><div class="search"><input id="supplySearch" placeholder="Buscar insumo..." value="${esc(state.supplySearch)}"></div></div></div>${suppliesTable(list)}</section>`;$("#newSupplyBtn").onclick=()=>openSupplyForm();$("#supplySearch").oninput=e=>{state.supplySearch=e.target.value;renderSupplies();setTimeout(()=>$("#supplySearch")?.focus(),0)};$$('tr[data-supply-id]').forEach(r=>r.onclick=()=>openSupplyDetail(r.dataset.supplyId));}
function suppliesTable(list){if(!list.length)return `<div class="empty"><strong>No hay insumos</strong>Agregá materiales a medida que los necesites para calcular costos.</div>`;return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Insumo</th><th>Costo del pack</th><th>Cantidad</th><th>Costo unitario</th></tr></thead><tbody>${list.map(i=>`<tr class="clickable" data-supply-id="${i.id}"><td><strong>${esc(i.nombre||"Insumo")}</strong></td><td>${money(i.costoPaquete||0)}</td><td>${Number(i.cantidadPaquete||0).toLocaleString("es-AR")}${i.unidad?` ${esc(i.unidad)}`:""}</td><td class="money">${money(getSupplyUnitCost(i))}</td></tr>`).join("")}</tbody></table></div>`}
function openSupplyDetail(id){const i=state.insumos.find(x=>x.id===id);if(!i)return;const used=Object.values(state.recetas).filter(r=>(r.items||[]).some(x=>x.insumoId===id)).length;setDrawer("Insumo",i.nombre||"Insumo",`<div class="detail-hero"><div><div class="big">${money(getSupplyUnitCost(i))}</div><div class="sub">Costo unitario</div></div></div><div class="detail-grid"><div class="mini-card"><span>Pack</span><strong>${money(i.costoPaquete||0)}</strong></div><div class="mini-card"><span>Cantidad</span><strong>${Number(i.cantidadPaquete||0).toLocaleString("es-AR")}</strong></div><div class="mini-card"><span>En recetas</span><strong>${used}</strong></div></div><div class="soft-note">Modificar el costo de este insumo actualiza automáticamente el costo estimado de los productos con receta.</div>`,`<button class="btn primary" id="editSupplyBtn">Editar insumo</button>`);$("#editSupplyBtn").onclick=()=>openSupplyForm(i)}
function openSupplyForm(i=null){setDrawer(i?"Editar insumo":"Nuevo","Insumo",`<div class="form-section"><div class="form-grid"><div class="field full"><label>Nombre *</label><input id="iName" value="${esc(i?.nombre||"")}"></div><div class="field"><label>Costo del paquete *</label><input id="iPack" type="number" min="0" step="0.01" value="${Number(i?.costoPaquete||0)||""}" placeholder="0"></div><div class="field"><label>Cuántas unidades trae *</label><input id="iQty" type="number" min="0.0001" step="0.01" value="${Number(i?.cantidadPaquete||0)||""}" placeholder="Ej. 100"></div><div class="field full"><label>Unidad (opcional)</label><input id="iUnit" value="${esc(i?.unidad||"")}" placeholder="hojas, unidades, metros..."></div></div><div class="live-cost" id="unitPreview">Costo unitario: ${money(getSupplyUnitCost(i||{}))}</div><div id="supplyFormError" class="form-error"></div></div>`,`<button class="btn ghost" id="supplyCancel">Cancelar</button><button class="btn primary" id="supplySave">Guardar</button>`);const preview=()=>{const pack=Number($("#iPack").value||0),qty=Number($("#iQty").value||0);$("#unitPreview").textContent=`Costo unitario: ${money(qty>0?pack/qty:0)}`};$("#iPack").oninput=preview;$("#iQty").oninput=preview;$("#supplyCancel").onclick=closeDrawer;$("#supplySave").onclick=async()=>{const nombre=$("#iName").value.trim(),costoPaquete=Number($("#iPack").value||0),cantidadPaquete=Number($("#iQty").value||0),unidad=$("#iUnit").value.trim();if(!nombre)return $("#supplyFormError").textContent="Ingresá un nombre.";if(cantidadPaquete<=0)return $("#supplyFormError").textContent="La cantidad del paquete debe ser mayor a 0.";const data={nombre,costoPaquete,cantidadPaquete,costoUnitario:costoPaquete/cantidadPaquete,unidad,updatedAt:serverTimestamp()};try{if(i){await updateDoc(doc(db,"insumos",i.id),data);Object.assign(i,data);toast("Insumo actualizado")}else{const ref=await addDoc(collection(db,"insumos"),{...data,createdAt:serverTimestamp()});state.insumos.push({id:ref.id,...data});toast("Insumo creado")}state.insumos.sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{sensitivity:"base"}));closeDrawer();renderSupplies()}catch(err){console.error(err);$("#supplyFormError").textContent="No se pudo guardar."}}}

function cashMovements(){
  const pays=[]; state.pedidos.forEach(p=>{ const detailed=(p.pagos||[]); if(detailed.length){ detailed.forEach((x,idx)=>pays.push({type:"INGRESO",id:`${p.id}-${idx}`,fecha:x.fecha||p.fecha,monto:Number(x.monto||0),medio:x.medio||"Pago",concepto:p.cliente||p.clienteNombre||"Pedido",pedidoId:p.id})); } else if(p.pagado && orderTotal(p)>0){ pays.push({type:"INGRESO",id:`${p.id}-legacy`,fecha:p.fecha,monto:orderTotal(p),medio:"Pago histórico",concepto:p.cliente||p.clienteNombre||"Pedido",pedidoId:p.id}); } });
  const expenses=state.gastos.map(g=>({type:"GASTO",id:g.id,fecha:g.fecha,monto:Number(g.monto||0),medio:g.medio||"",concepto:g.concepto||g.descripcion||"Gasto",nota:g.nota||""}));
  return [...pays,...expenses].sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||"")));
}
function renderCash(){const moves=cashMovements(),filtered=state.cashFilter==="TODOS"?moves:moves.filter(x=>x.type===state.cashFilter),income=moves.filter(x=>x.type==="INGRESO").reduce((a,x)=>a+x.monto,0),expenses=moves.filter(x=>x.type==="GASTO").reduce((a,x)=>a+x.monto,0),debt=state.pedidos.reduce((a,p)=>a+Math.max(0,orderTotal(p)-orderPaid(p)),0);content.innerHTML=`<div class="grid-cards cash-cards"><div class="metric emphasis"><div class="label">Cobrado</div><div class="value">${money(income)}</div><div class="hint">Pagos registrados</div></div><div class="metric"><div class="label">Por cobrar</div><div class="value">${money(debt)}</div><div class="hint">Saldos pendientes</div></div><div class="metric"><div class="label">Gastos</div><div class="value">${money(expenses)}</div><div class="hint">Gastos registrados en Caja</div></div><div class="metric"><div class="label">Caja neta</div><div class="value">${money(income-expenses)}</div><div class="hint">Cobrado menos gastos</div></div></div><section class="section"><div class="section-head"><div><h2>Movimientos</h2><p>Ingresos de pedidos y gastos de Pixel.</p></div><div class="right action-row"><button class="btn soft" id="newExpenseBtn">+ Gasto</button><button class="btn primary" id="newPaymentBtn">+ Registrar cobro</button></div></div><div class="section-body slim"><div class="segmented">${[["TODOS","Todos"],["INGRESO","Ingresos"],["GASTO","Gastos"]].map(([v,t])=>`<button data-cash-filter="${v}" class="${state.cashFilter===v?"active":""}">${t}</button>`).join("")}</div></div>${cashTable(filtered)}</section>`;$("#newExpenseBtn").onclick=openExpenseForm;$("#newPaymentBtn").onclick=openPaymentForm;$$('[data-cash-filter]').forEach(b=>b.onclick=()=>{state.cashFilter=b.dataset.cashFilter;renderCash()});$$('[data-cash-order]').forEach(r=>r.onclick=()=>openOrderDetail(r.dataset.cashOrder));}
function cashTable(list){if(!list.length)return `<div class="empty"><strong>Sin movimientos</strong>Cuando registres pagos o gastos van a aparecer acá.</div>`;return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Medio</th><th>Importe</th></tr></thead><tbody>${list.map(m=>`<tr ${m.pedidoId?`class="clickable" data-cash-order="${m.pedidoId}"`:""}><td>${dateText(m.fecha)}</td><td><strong>${esc(m.concepto)}</strong><div class="subcell">${m.type==="INGRESO"?"Cobro de pedido":"Gasto"}</div></td><td>${esc(m.medio||"—")}</td><td class="money ${m.type==="GASTO"?"negative":"positive"}">${m.type==="GASTO"?"−":"+"}${money(m.monto)}</td></tr>`).join("")}</tbody></table></div>`}
function openExpenseForm(){setDrawer("Caja","Registrar gasto",`<div class="form-section"><div class="form-grid"><div class="field full"><label>Concepto *</label><input id="gConcept" placeholder="Ej. Papel, envío, herramientas..."></div><div class="field"><label>Importe *</label><input id="gAmount" type="number" min="0" step="0.01" placeholder="0"></div><div class="field"><label>Fecha</label><input id="gDate" type="date" value="${today()}"></div><div class="field full"><label>Medio</label><select id="gMethod"><option>Mercado Pago</option><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option></select></div><div class="field full"><label>Nota</label><textarea id="gNote" rows="3"></textarea></div></div><div id="expenseError" class="form-error"></div></div>`,`<button class="btn ghost" id="expenseCancel">Cancelar</button><button class="btn primary" id="expenseSave">Guardar gasto</button>`);$("#expenseCancel").onclick=closeDrawer;$("#expenseSave").onclick=async()=>{const concepto=$("#gConcept").value.trim(),monto=Number($("#gAmount").value||0);if(!concepto||monto<=0)return $("#expenseError").textContent="Completá concepto e importe.";const data={concepto,monto,fecha:$("#gDate").value||today(),medio:$("#gMethod").value,nota:$("#gNote").value.trim(),createdAt:serverTimestamp()};try{const ref=await addDoc(collection(db,"gastos"),data);state.gastos.unshift({id:ref.id,...data});toast("Gasto registrado");closeDrawer();renderCash()}catch(err){console.error(err);$("#expenseError").textContent="No se pudo guardar."}}}
function openPaymentForm(){const pending=state.pedidos.filter(p=>orderTotal(p)-orderPaid(p)>0);setDrawer("Caja","Registrar cobro",pending.length?`<div class="form-section"><div class="form-grid"><div class="field full"><label>Pedido *</label><select id="payOrder">${pending.map(p=>`<option value="${p.id}">${esc(p.cliente||p.clienteNombre||"Cliente")} · debe ${money(orderTotal(p)-orderPaid(p))}</option>`).join("")}</select></div><div class="field"><label>Importe *</label><input id="payAmount" type="number" min="0" step="0.01"></div><div class="field"><label>Fecha</label><input id="payDate" type="date" value="${today()}"></div><div class="field full"><label>Medio</label><select id="payMethod"><option>Mercado Pago</option><option>Transferencia</option><option>Efectivo</option><option>Otro</option></select></div></div><div id="paymentError" class="form-error"></div></div>`:`<div class="empty"><strong>No hay saldos pendientes</strong>Todos los pedidos están al día.</div>`,pending.length?`<button class="btn ghost" id="paymentCancel">Cancelar</button><button class="btn primary" id="paymentSave">Registrar cobro</button>`:`<button class="btn primary" id="paymentClose">Cerrar</button>`);if(!pending.length){$("#paymentClose").onclick=closeDrawer;return}const syncAmount=()=>{const p=state.pedidos.find(x=>x.id===$("#payOrder").value);if(p)$("#payAmount").value=Math.max(0,orderTotal(p)-orderPaid(p))};$("#payOrder").onchange=syncAmount;syncAmount();$("#paymentCancel").onclick=closeDrawer;$("#paymentSave").onclick=async()=>{const p=state.pedidos.find(x=>x.id===$("#payOrder").value),monto=Number($("#payAmount").value||0);if(!p||monto<=0)return $("#paymentError").textContent="Revisá el pedido y el importe.";const deuda=Math.max(0,orderTotal(p)-orderPaid(p));if(monto>deuda)return $("#paymentError").textContent=`El saldo pendiente es ${money(deuda)}.`;const pagos=[...(p.pagos||[]),{monto,medio:$("#payMethod").value,fecha:$("#payDate").value||today()}],total=orderTotal(p),paid=pagos.reduce((a,x)=>a+Number(x.monto||0),0);try{await updateDoc(doc(db,"pedidos",p.id),{pagos,pagado:paid>=total&&total>0,updatedAt:serverTimestamp()});p.pagos=pagos;p.pagado=paid>=total&&total>0;toast("Cobro registrado");closeDrawer();renderCash()}catch(err){console.error(err);$("#paymentError").textContent="No se pudo registrar."}}}


function libraryIcon(cat){return ({INSTRUCTIVO:"📖",MOLDE:"✂",IMAGEN:"▧",PDF:"PDF",DISENO:"✦",MATERIAL:"◇",PACKAGING:"▣",OTRO:"•"}[String(cat||"OTRO").toUpperCase()]||"•")}
function driveCategory(file){
  const m=String(file.mimeType||"");
  if(m==="application/pdf")return "PDF";
  if(m.startsWith("image/"))return "IMAGEN";
  if(m.includes("drawing"))return "DISENO";
  return "OTRO";
}
function driveIcon(file){
  const m=String(file.mimeType||"");
  if(m==="application/pdf")return "PDF";
  if(m.startsWith("image/"))return "▧";
  if(m.includes("document"))return "DOC";
  if(m.includes("spreadsheet"))return "XLS";
  if(m.includes("presentation"))return "PPT";
  if(m.includes("folder"))return "▣";
  return "◫";
}
function driveTypeText(file){
  const m=String(file.mimeType||"");
  if(m==="application/pdf")return "PDF"; if(m.startsWith("image/"))return "Imagen";
  if(m.includes("document"))return "Google Docs"; if(m.includes("spreadsheet"))return "Google Sheets";
  if(m.includes("presentation"))return "Google Slides"; if(m.includes("drawing"))return "Google Drawing";
  return "Archivo";
}
function initDriveClient(){
  if(driveTokenClient || !window.google?.accounts?.oauth2)return Boolean(driveTokenClient);
  driveTokenClient=google.accounts.oauth2.initTokenClient({
    client_id:GOOGLE_CLIENT_ID, scope:DRIVE_SCOPE,
    callback:(resp)=>{
      if(resp.error){state.driveError=resp.error;state.driveConnected=false;renderLibrary();return;}
      state.driveAccessToken=resp.access_token;state.driveConnected=true;state.driveError="";toast("Google Drive conectado");renderLibrary();
      if(state.librarySearch.trim()) searchDrive(state.librarySearch);
    }
  });
  return true;
}
function connectDrive(){
  if(!initDriveClient()){toast("Google todavía está cargando. Probá de nuevo en un segundo.","error");return;}
  driveTokenClient.requestAccessToken({prompt:state.driveAccessToken?"":"consent"});
}
function disconnectDrive(){
  if(state.driveAccessToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(state.driveAccessToken,()=>{});
  state.driveAccessToken="";state.driveConnected=false;state.driveResults=[];state.driveLastQuery="";state.driveError="";renderLibrary();
}
async function driveQuery(q){
  const params=new URLSearchParams({q,pageSize:"100",orderBy:"modifiedTime desc",fields:"files(id,name,mimeType,webViewLink,thumbnailLink,modifiedTime,description,iconLink,size)"});
  const res=await fetch(`https://www.googleapis.com/drive/v3/files?${params}`,{headers:{Authorization:`Bearer ${state.driveAccessToken}`}});
  if(res.status===401){state.driveAccessToken="";state.driveConnected=false;throw new Error("La sesión de Drive venció. Volvé a conectarla.");}
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||"No pude consultar Google Drive.");}
  return (await res.json()).files||[];
}
async function searchDrive(query){
  const q=query.trim(); if(!state.driveAccessToken||q.length<2){state.driveResults=[];state.driveLastQuery=q;renderLibrary();return;}
  state.driveLoading=true;state.driveError="";state.driveLastQuery=q;renderLibrary();
  try{
    const escaped = q.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const nq=norm(q);
    const seed=(nq.match(/[a-z0-9]+/i)?.[0]||nq).slice(0,Math.min(4,Math.max(2,nq.length)));
    const escapedSeed=seed.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const [contentHits,nameCandidates]=await Promise.all([
      driveQuery(`trashed = false and fullText contains '${escaped}'`),
      driveQuery(`trashed = false and name contains '${escapedSeed}'`)
    ]);
    const byId=new Map(contentHits.map(f=>[f.id,f]));
    nameCandidates
      .filter(f=>norm(f.name||"").includes(nq))
      .forEach(f=>byId.set(f.id,f));
    state.driveResults=[...byId.values()].sort((a,b)=>String(b.modifiedTime||"").localeCompare(String(a.modifiedTime||"")));
  }catch(err){console.error(err);state.driveResults=[];state.driveError=err.message||"No pude buscar en Drive.";}
  finally{state.driveLoading=false;renderLibrary();}
}
let driveSearchTimer=null;
function scheduleDriveSearch(q){clearTimeout(driveSearchTimer);driveSearchTimer=setTimeout(()=>searchDrive(q),450)}
function renderLibrary(){
  const q=norm(state.librarySearch);
  const cats=[["TODOS","Todos"],["INSTRUCTIVO","Instructivos"],["MOLDE","Moldes"],["IMAGEN","Imágenes"],["PDF","PDF"],["DISENO","Diseños"],["MATERIAL","Materiales"],["PACKAGING","Packaging"],["OTRO","Otros"]];
  const list=state.biblioteca.filter(x=>{
    const matches=!q||norm([x.nombre,x.descripcion,(x.tags||[]).join(" "),x.categoria].join(" ")).includes(q);
    return matches&&(state.libraryFilter==="TODOS"||String(x.categoria||"OTRO").toUpperCase()===state.libraryFilter);
  });
  const driveList=state.driveResults.filter(x=>state.libraryFilter==="TODOS"||driveCategory(x)===state.libraryFilter);
  const driveStatus=state.driveConnected
    ? `<div class="drive-status connected"><span>● Drive conectado</span><button class="btn ghost small" id="disconnectDriveBtn">Desconectar</button></div>`
    : `<div class="drive-connect"><div><strong>Buscá directamente en tu Google Drive</strong><p>Pixel solo tendrá acceso de lectura: no puede modificar ni borrar tus archivos.</p></div><button class="btn primary" id="connectDriveBtn">Conectar Google Drive</button></div>`;
  let driveBody="";
  if(state.driveConnected){
    if(state.driveLoading) driveBody=`<div class="drive-message">Buscando en Drive…</div>`;
    else if(state.driveError) driveBody=`<div class="drive-message error">${esc(state.driveError)}</div>`;
    else if(state.librarySearch.trim().length<2) driveBody=`<div class="drive-message">Escribí al menos 2 caracteres para buscar por nombre y por contenido indexado dentro de tus archivos.</div>`;
    else if(state.driveLastQuery!==state.librarySearch.trim()) driveBody=`<div class="drive-message">Buscando…</div>`;
    else if(!driveList.length) driveBody=`<div class="drive-message">No encontré coincidencias en Drive para “${esc(state.librarySearch)}”.</div>`;
    else driveBody=`<div class="drive-results-head"><strong>Google Drive</strong><span>${driveList.length} resultado${driveList.length===1?"":"s"}</span></div><div class="library-grid drive-grid">${driveList.map(x=>`<a class="library-card drive-card" href="${esc(x.webViewLink||'#')}" target="_blank" rel="noopener"><div class="library-preview ${x.thumbnailLink?'has-thumb':''}" ${x.thumbnailLink?`style="background-image:url('${esc(x.thumbnailLink)}')"`:''}>${x.thumbnailLink?'':driveIcon(x)}</div><div class="library-card-body"><div class="library-card-top"><span class="badge done">${esc(driveTypeText(x))}</span><span class="drive-source">Drive</span></div><h3>${esc(x.name||"Sin nombre")}</h3><p>${esc(x.description||`Modificado ${x.modifiedTime?new Date(x.modifiedTime).toLocaleDateString("es-AR"):""}`)}</p></div></a>`).join("")}</div>`;
  }
  content.innerHTML=`<section class="section">
    <div class="section-head"><div><h2>Biblioteca</h2><p>Encontrá tus recursos guardados y buscá también dentro de Google Drive.</p></div><div class="right"><button class="btn primary" id="newLibraryBtn">+ Agregar recurso</button></div></div>
    <div class="section-body slim"><div class="toolbar"><div class="search"><input id="librarySearch" placeholder="Buscar: cajita, sticker, resina, molde..." value="${esc(state.librarySearch)}"></div><div class="segmented library-filters">${cats.map(([v,t])=>`<button data-library-filter="${v}" class="${state.libraryFilter===v?"active":""}">${t}</button>`).join("")}</div></div>${driveStatus}</div>
    ${driveBody}
    <div class="saved-library-head"><strong>Guardados en Pixel</strong><span>${list.length} recurso${list.length===1?"":"s"}</span></div>
    ${list.length?`<div class="library-grid">${list.map(x=>`<article class="library-card" data-library-id="${x.id}"><div class="library-preview">${libraryIcon(x.categoria)}</div><div class="library-card-body"><div class="library-card-top"><span class="badge done">${esc(String(x.categoria||"Otro").replace("DISENO","Diseño"))}</span></div><h3>${esc(x.nombre||"Sin nombre")}</h3><p>${esc(x.descripcion||"Sin descripción")}</p><div class="tag-row">${(x.tags||[]).slice(0,5).map(t=>`<span>${esc(t)}</span>`).join("")}</div></div></article>`).join("")}</div>`:`<div class="empty"><strong>No encontré recursos guardados</strong>${state.biblioteca.length?"Probá otra búsqueda o filtro.":"Podés agregar recursos manualmente o encontrarlos directamente en Drive."}</div>`}
  </section>`;
  $("#newLibraryBtn").onclick=()=>openLibraryForm();
  $("#connectDriveBtn")?.addEventListener("click",connectDrive);$("#disconnectDriveBtn")?.addEventListener("click",disconnectDrive);
  $("#librarySearch").oninput=e=>{state.librarySearch=e.target.value;renderLibrary();scheduleDriveSearch(state.librarySearch);setTimeout(()=>{const x=$("#librarySearch");if(x){x.focus();x.selectionStart=x.selectionEnd=x.value.length}},0)};
  $$('[data-library-filter]').forEach(b=>b.onclick=()=>{state.libraryFilter=b.dataset.libraryFilter;renderLibrary()});
  $$('[data-library-id]').forEach(c=>c.onclick=()=>openLibraryDetail(c.dataset.libraryId));
}

function openLibraryDetail(id){
  const x=state.biblioteca.find(r=>r.id===id); if(!x)return;
  setDrawer("Biblioteca",x.nombre||"Recurso",`<div class="detail-hero"><div><div class="big library-detail-icon">${libraryIcon(x.categoria)}</div><div class="sub">${esc(x.categoria||"Otro")}</div></div></div><div class="block-title">Descripción</div><div class="soft-note">${esc(x.descripcion||"Sin descripción")}</div><div class="block-title">Palabras clave</div><div class="tag-row drawer-tags">${(x.tags||[]).map(t=>`<span>${esc(t)}</span>`).join("")||"<span>Sin tags</span>"}</div>${x.url?`<div class="block-title">Archivo</div><a class="btn soft library-open" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir archivo en Drive ↗</a>`:""}`,`<button class="btn ghost" id="deleteLibraryBtn">Eliminar</button><button class="btn primary" id="editLibraryBtn">Editar</button>`);
  $("#editLibraryBtn").onclick=()=>openLibraryForm(x);
  $("#deleteLibraryBtn").onclick=async()=>{
    const ok=confirm(`¿Eliminar “${x.nombre||"este recurso"}” de la Biblioteca? El archivo de Drive no se toca.`); if(!ok)return;
    try{await deleteDoc(doc(db,"biblioteca",x.id));state.biblioteca=state.biblioteca.filter(r=>r.id!==x.id);closeDrawer();toast("Recurso eliminado");renderLibrary()}catch(err){console.error(err);toast("No se pudo eliminar","error")};
  };
}
function openLibraryForm(x=null){
  const categories=[["INSTRUCTIVO","Instructivo"],["MOLDE","Molde"],["IMAGEN","Imagen"],["PDF","PDF"],["DISENO","Diseño"],["MATERIAL","Material"],["PACKAGING","Packaging"],["OTRO","Otro"]];
  setDrawer(x?"Editar recurso":"Nuevo recurso","Biblioteca",`<div class="form-section"><div class="form-grid"><div class="field full"><label>Nombre *</label><input id="lName" value="${esc(x?.nombre||"")}" placeholder="Ej. Molde cajita 10x10"></div><div class="field"><label>Categoría</label><select id="lCategory">${categories.map(([v,t])=>`<option value="${v}" ${String(x?.categoria||"OTRO").toUpperCase()===v?"selected":""}>${t}</option>`).join("")}</select></div><div class="field"><label>Link de Drive</label><input id="lUrl" value="${esc(x?.url||"")}" placeholder="https://drive.google.com/..."></div><div class="field full"><label>Descripción</label><textarea id="lDescription" rows="4" placeholder="Qué contiene o para qué sirve...">${esc(x?.descripcion||"")}</textarea></div><div class="field full"><label>Palabras clave</label><input id="lTags" value="${esc((x?.tags||[]).join(", "))}" placeholder="cajita, souvenir, cumpleaños, packaging"></div></div><div class="hint">Separá las palabras clave con comas. Después podés buscar por cualquiera de ellas.</div><div id="libraryFormError" class="form-error"></div></div>`,`<button class="btn ghost" id="libraryCancel">Cancelar</button><button class="btn primary" id="librarySave">${x?"Guardar cambios":"Agregar recurso"}</button>`);
  $("#libraryCancel").onclick=closeDrawer;
  $("#librarySave").onclick=async()=>{
    const nombre=$("#lName").value.trim(); if(!nombre)return $("#libraryFormError").textContent="El nombre es obligatorio.";
    const data={nombre,categoria:$("#lCategory").value,url:$("#lUrl").value.trim(),descripcion:$("#lDescription").value.trim(),tags:$("#lTags").value.split(",").map(t=>t.trim()).filter(Boolean),updatedAt:serverTimestamp()};
    try{if(x){await updateDoc(doc(db,"biblioteca",x.id),data);Object.assign(x,data);toast("Recurso actualizado")}else{const ref=await addDoc(collection(db,"biblioteca"),{...data,createdAt:serverTimestamp()});state.biblioteca.unshift({id:ref.id,...data});toast("Recurso agregado")}closeDrawer();renderLibrary()}catch(err){console.error(err);$("#libraryFormError").textContent="No se pudo guardar."}
  };
}

$$(".nav-link").forEach(b=>b.addEventListener("click",()=>{setView(b.dataset.view); $("#sidebar").classList.remove("open");}));
$("#globalNewOrderBtn").addEventListener("click",()=>openOrderForm());
$("#drawerCloseBtn").addEventListener("click",closeDrawer); drawerBackdrop.addEventListener("click",closeDrawer);
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))closeDrawer();});

content.innerHTML=`<div class="empty"><strong>Cargando Pixel…</strong>Un segundo.</div>`;
try{await loadData(); render();}catch(err){console.error(err);content.innerHTML=`<div class="empty"><strong>No pude cargar los datos</strong>Revisá la consola del navegador.</div>`;}
