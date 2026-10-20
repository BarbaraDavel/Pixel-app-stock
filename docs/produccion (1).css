/** Confirmaciones visuales de Pixel Gestión. Devuelve true solo al confirmar. */
export function pixelConfirm({title='¿Confirmar acción?',message='',detail='',confirmText='Confirmar',danger=false}={}) {
  return new Promise(resolve=>{
    const overlay=document.createElement('div');
    overlay.className='pixel-dialog-backdrop';
    overlay.innerHTML=`<section class="pixel-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pixelDialogTitle" aria-describedby="pixelDialogMessage">
      <div class="pixel-dialog-head"><span class="pixel-dialog-icon" aria-hidden="true">${danger?'!':'?'}</span><button type="button" class="mc-close" data-pixel-dismiss aria-label="Cerrar">✕</button></div>
      <h2 id="pixelDialogTitle"></h2><p id="pixelDialogMessage"></p><p class="pixel-dialog-detail" hidden></p>
      <div class="pixel-dialog-actions"><button type="button" class="btn ghost" data-pixel-dismiss>Volver</button><button type="button" class="btn ${danger?'pixel-danger-btn':'primary'}" data-pixel-confirm></button></div>
    </section>`;
    overlay.querySelector('#pixelDialogTitle').textContent=title;
    overlay.querySelector('#pixelDialogMessage').textContent=message;
    const info=overlay.querySelector('.pixel-dialog-detail');if(detail){info.textContent=detail;info.hidden=false;}
    overlay.querySelector('[data-pixel-confirm]').textContent=confirmText;
    const previous=document.activeElement;
    const finish=(answer)=>{document.removeEventListener('keydown',keyHandler,true);overlay.remove();previous?.focus?.();resolve(answer)};
    const keyHandler=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false)}else if(e.key==='Tab'){const focusables=[...overlay.querySelectorAll('button')];const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
    overlay.querySelectorAll('[data-pixel-dismiss]').forEach(b=>b.addEventListener('click',()=>finish(false)));
    overlay.querySelector('[data-pixel-confirm]').addEventListener('click',()=>finish(true));
    overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});
    document.body.append(overlay);document.addEventListener('keydown',keyHandler,true);
    overlay.querySelector('[data-pixel-dismiss]').focus();
  });
}
