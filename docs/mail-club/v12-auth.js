import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {getAuth,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {firebaseConfig} from './v12-firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app);
const form=document.getElementById('emailLinkForm');
const message=document.getElementById('authMessage');
const input=document.getElementById('accessEmail');
const out=document.getElementById('signOutClub');
const show=t=>{message.textContent=t;};
const emailKey='pixel_mail_club_pending_email';
form.addEventListener('submit',async e=>{e.preventDefault();const email=input.value.trim().toLowerCase();if(!email)return;
try{await sendSignInLinkToEmail(auth,email,{url:location.origin+location.pathname,handleCodeInApp:true});sessionStorage.setItem(emailKey,email);show('Te enviamos un enlace a tu correo. Revisá también la carpeta de spam.');}
catch(err){console.error(err);show('No pudimos enviar el enlace. Revisá que Email/Password (enlace por email) y el dominio estén habilitados en Firebase Authentication.');}});
if(isSignInWithEmailLink(auth,location.href)){
 let email=sessionStorage.getItem(emailKey);
 if(!email){email=window.prompt('Por seguridad, ingresá el mismo email al que enviamos el enlace:');}
 if(email){signInWithEmailLink(auth,email,location.href).then(()=>{sessionStorage.removeItem(emailKey);history.replaceState({},document.title,location.pathname);show('¡Bienvenida al club! Tu correo está verificado.');}).catch(err=>{console.error(err);show('El enlace expiró o no corresponde a este email. Solicitá uno nuevo.');});}
}
onAuthStateChanged(auth,user=>{out.hidden=!user;form.hidden=!!user;if(user)show('Sesión iniciada como '+user.email+'. La reserva online todavía no está habilitada: falta validar cupos de forma segura.');});
out.addEventListener('click',()=>signOut(auth));
