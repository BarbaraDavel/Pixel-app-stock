import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {getAuth,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {firebaseConfig} from './v12-firebase-config.js';

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app);
// Solicitar los mensajes de Firebase Authentication en español.
auth.languageCode='es';
const form=document.getElementById('emailLinkForm');
const message=document.getElementById('authMessage');
const input=document.getElementById('accessEmail');
const sendButton=document.getElementById('sendAccessLink');
const out=document.getElementById('signOutClub');
const welcome=document.getElementById('clubWelcome');
const welcomeEmail=document.getElementById('clubWelcomeEmail');
const intro=document.getElementById('clubAccessIntro');
const accessNote=document.getElementById('clubAccessNote');
const verifyForm=document.getElementById('confirmEmailForm');
const verifyInput=document.getElementById('confirmAccessEmail');
const emailKey='pixel_mail_club_pending_email';
const show=(text,isError=false)=>{message.textContent=text;message.dataset.error=String(isError);};
const normalizeEmail=value=>value.trim().toLowerCase();
const linkInUrl=isSignInWithEmailLink(auth,window.location.href);
let completingLink=false;

function readableError(err){
 const code=err?.code||'';
 if(code==='auth/unauthorized-domain'||code==='auth/invalid-continue-uri')return 'El dominio de esta página no está autorizado en Firebase Authentication. Revisá Dominios autorizados.';
 if(code==='auth/too-many-requests')return 'Se solicitaron demasiados enlaces. Esperá un momento y volvé a intentar.';
 if(code==='auth/invalid-email')return 'Revisá que el correo electrónico esté escrito correctamente.';
 if(code==='auth/invalid-action-code'||code==='auth/expired-action-code')return 'Este enlace ya se utilizó o venció. Solicitá uno nuevo.';
 if(code==='auth/network-request-failed')return 'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.';
 return 'No pudimos completar el acceso. Probá de nuevo o solicitá otro enlace.';
}

form.addEventListener('submit',async event=>{
 event.preventDefault();
 const email=normalizeEmail(input.value);
 if(!email||!input.checkValidity())return;
 sendButton.disabled=true;
 show('Preparando tu enlace de acceso…');
 try{
  await sendSignInLinkToEmail(auth,email,{
   url:new URL(window.location.pathname,window.location.origin).href,
   handleCodeInApp:true
  });
  sessionStorage.setItem(emailKey,email);
  show('¡Listo! Si el correo puede recibir enlaces, revisá tu bandeja de entrada y spam. Abrí el enlace para continuar.');
 }catch(err){console.error('Mail Club Auth:',err.code||err);show(readableError(err),true);}
 finally{sendButton.disabled=false;}
});

async function completeLink(email){
 if(completingLink)return;
 completingLink=true;
 verifyForm.hidden=true;
 show('Verificando tu enlace de acceso…');
 try{
  await signInWithEmailLink(auth,email,window.location.href);
  sessionStorage.removeItem(emailKey);
  // El código de acceso no debe permanecer visible en la barra de direcciones.
  window.history.replaceState({},document.title,window.location.pathname);
  show('¡Correo verificado! Bienvenida a Pixel Mail Club.');
 }catch(err){
  console.error('Mail Club Auth:',err.code||err);
  show(readableError(err),true);
  verifyForm.hidden=false;
 }finally{completingLink=false;}
}

if(linkInUrl){
 form.hidden=true;
 const pending=sessionStorage.getItem(emailKey);
 if(pending){completeLink(pending);}
 else{
  verifyForm.hidden=false;
  show('Para proteger tu cuenta, confirmá el mismo correo al que enviamos el enlace.');
 }
}
verifyForm.addEventListener('submit',event=>{
 event.preventDefault();
 const email=normalizeEmail(verifyInput.value);
 if(!email||!verifyInput.checkValidity())return;
 completeLink(email);
});
onAuthStateChanged(auth,user=>{
 out.hidden=!user;
 welcome.hidden=!user;
 intro.hidden=!!user;
 accessNote.hidden=!!user;
 if(user){
  form.hidden=true;verifyForm.hidden=true;
  welcomeEmail.textContent=user.email||'';
  show('');
 }else if(!linkInUrl){
  form.hidden=false;verifyForm.hidden=true;welcomeEmail.textContent='';
 }
});
out.addEventListener('click',async()=>{
 try{await signOut(auth);show('Cerraste sesión. Podés pedir otro enlace cuando quieras.');}
 catch(err){show(readableError(err),true);}
});
