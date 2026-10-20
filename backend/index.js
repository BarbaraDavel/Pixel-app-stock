import {onRequest} from 'firebase-functions/v2/https';
import {defineString} from 'firebase-functions/params';
import admin from 'firebase-admin';
import crypto from 'node:crypto';
admin.initializeApp();
const db=admin.firestore();
const allowedOrigin=defineString('MAILCLUB_PUBLIC_ORIGIN');
const transferText=defineString('MAILCLUB_TRANSFER_INSTRUCTIONS',{default:''});
const activeEditionId=defineString('MAILCLUB_ACTIVE_EDITION',{default:'001'});
const validText=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max;
const clean=(v,max=200)=>String(v??'').trim().slice(0,max);
const fail=(res,code,msg)=>res.status(code).json({error:msg});
const asId=(s)=>String(s||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40);
export const mailClubApi=onRequest({region:'us-central1',maxInstances:5,timeoutSeconds:15,invoker:'public'},async(req,res)=>{
 const origin=req.headers.origin||'';
 if(origin&&origin!==allowedOrigin.value())return fail(res,403,'Origen no autorizado');
 if(origin)res.set('Access-Control-Allow-Origin',origin);
 res.set('Vary','Origin');res.set('Cache-Control','no-store');
 res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.set('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS')return res.status(204).end();
 const route=req.path.replace(/\/+$/,'');
 try{
 const editionId=asId(activeEditionId.value());
 const edQuery=await db.collection('pixel_mail_ediciones').where('id','==',editionId).limit(1).get();
 const edDoc=edQuery.docs[0];
 if(!edDoc)return fail(res,503,'La edición aún no está publicada');
 const ed=edDoc.data();
 const precio=Number(ed.precio);
 if(!Number.isSafeInteger(precio)||precio<=0)return fail(res,503,'Precio no configurado');
 if(route==='/edition'&&req.method==='GET')return res.json({edition:{id:editionId,nombre:clean(ed.nombre,100),periodo:clean(ed.periodo,60),descripcion:clean(ed.descripcion,250),precio}});
 if(route!=='/subscribe'||req.method!=='POST')return fail(res,404,'Ruta no encontrada');
 if(Number(req.headers['content-length']||0)>12000)return fail(res,413,'Solicitud demasiado grande');
 const p=req.body||{};
 if(p.edicionId!==editionId)return fail(res,409,'La edición cambió. Recargá la página');
 for(const [field,max] of Object.entries({nombre:100,email:150,telefono:25,localidad:80,provincia:80,codigoPostal:12}))if(!validText(p[field],max))return fail(res,400,'Revisá los datos obligatorios');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))return fail(res,400,'Email inválido');
 const cantidad=Number(p.cantidad);if(!Number.isSafeInteger(cantidad)||cantidad<1||cantidad>10)return fail(res,400,'Cantidad inválida');
 if(!['domicilio','sucursal','local'].includes(p.entrega))return fail(res,400,'Modalidad de entrega inválida');
 if(p.entrega==='domicilio'&&!validText(p.direccion,200))return fail(res,400,'Ingresá la dirección de entrega');
 if(!['transferencia','mercadopago'].includes(p.metodoPago))return fail(res,400,'Medio de pago inválido');
 if(p.metodoPago==='mercadopago')return fail(res,503,'Mercado Pago estará disponible cuando se configure el checkout y su confirmación segura');
 if(!transferText.value().trim())return fail(res,503,'La transferencia todavía no está habilitada');
 // Cupos y limitación por email dentro de una transacción para evitar duplicados.
 const email=clean(p.email,150).toLowerCase();
 const contactHash=crypto.createHash('sha256').update(email).digest('hex');
 const key=`${editionId}_${contactHash}`;
 const lock=db.collection('pixel_mail_registros_publicos').doc(key);
 const reservation=db.collection('pixel_mail_pedidos').doc();
 await db.runTransaction(async tx=>{
  const old=await tx.get(lock);
  if(old.exists)throw new Error('ALREADY_REGISTERED');
  const total=cantidad*precio;
  tx.create(lock,{reservationId:reservation.id,editionId,emailHash:contactHash,createdAt:admin.firestore.FieldValue.serverTimestamp()});
  tx.create(reservation,{nombre:clean(p.nombre,100),apodo:clean(p.apodo,60),email,telefono:clean(p.telefono,25),localidad:`${clean(p.localidad,80)} ${clean(p.provincia,80)}`,provincia:clean(p.provincia,80),codigoPostal:clean(p.codigoPostal,12),direccion:clean(p.direccion,200),entrega:p.entrega==='local'?'Entrega local':'Envío',tipoEnvio:p.entrega==='sucursal'?'sucursal':'domicilio',cantidad,precio,abonado:0,estado:'PENDIENTE_PAGO',medioPago:'transferencia',edicionId:editionId,edicion:`${editionId} · ${clean(ed.nombre,100)} (${clean(ed.periodo,60)})`,fecha:new Date().toISOString().slice(0,10),origen:'web-publica',comunicaciones:p.comunicaciones===true,noRecordatorios:p.comunicaciones!==true,createdAt:admin.firestore.FieldValue.serverTimestamp()});
 });
 return res.status(201).json({reference:reservation.id.slice(0,8).toUpperCase(),transferInstructions:transferText.value()});
 }catch(err){console.error('MailClub API:',err);if(err.message==='ALREADY_REGISTERED')return fail(res,409,'Ya existe una inscripción con este email para la edición. Contactá a Pixel si querés modificar la cantidad.');return fail(res,500,'No se pudo procesar la inscripción');}
});
