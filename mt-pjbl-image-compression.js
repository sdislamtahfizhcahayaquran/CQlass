/* CQlass — automatic client-side image compression for MT, Absensi & PjBL */
(function(){
  const MAX_DIMENSION = 1600;
  const TARGET_BYTES = 450 * 1024;
  const MIN_QUALITY = 0.56;
  const START_QUALITY = 0.80;

  function isTargetInput(input){
    if(!(input instanceof HTMLInputElement) || input.type !== 'file') return false;
    if(input.id === 'foto-profil-input') return false;
    const accept = String(input.accept || '').toLowerCase();
    if(accept && !accept.includes('image')) return false;

    const idText = `${input.id || ''} ${input.name || ''} ${input.className || ''}`.toLowerCase();
    if(/pjbl|absen|absensi|morning|\bmt\b/.test(idText)) return true;

    const moduleName = String(window.activeModule || '').toLowerCase();
    if(moduleName === 'pjbl' || moduleName === 'mt' || moduleName === 'absensi') return true;

    const scope = input.closest('.card, .content, form, section, main, div');
    const text = String(scope?.innerText || '').toLowerCase();
    return text.includes('pjbl') || text.includes('absensi') || text.includes('morning talk') || /(^|\s)mt(\s|$)/i.test(text);
  }

  function loadImage(file){
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca.')); };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality){
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function compressImage(file){
    if(!file || !String(file.type || '').startsWith('image/')) return file;
    const img = await loadImage(file);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha:false });
    if(!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let type = 'image/webp';
    let quality = START_QUALITY;
    let blob = await canvasToBlob(canvas, type, quality);
    if(!blob){ type = 'image/jpeg'; blob = await canvasToBlob(canvas, type, quality); }
    if(!blob) return file;

    while(blob.size > TARGET_BYTES && quality > MIN_QUALITY){
      quality = Math.max(MIN_QUALITY, quality - 0.06);
      const next = await canvasToBlob(canvas, type, quality);
      if(!next) break;
      blob = next;
    }
    if(file.size <= TARGET_BYTES && blob.size >= file.size) return file;
    const ext = type === 'image/webp' ? 'webp' : 'jpg';
    const baseName = String(file.name || 'foto').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${ext}`, { type, lastModified: Date.now() });
  }

  function replaceFiles(input, file){
    try{ const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; return true; }
    catch(_){ return false; }
  }

  document.addEventListener('change', async function(event){
    const input = event.target;
    if(!isTargetInput(input)) return;
    if(input.dataset.cqCompressed === '1'){ delete input.dataset.cqCompressed; return; }
    const file = input.files && input.files[0];
    if(!file || !String(file.type || '').startsWith('image/')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const originalBytes = file.size;
    const box = input.id === 'pjbl-foto-input' ? document.getElementById('pjbl-foto-upload-box') : null;
    const oldText = box?.textContent || '';
    if(box) box.textContent = 'Menyiapkan foto...';
    try{
      const compressed = await compressImage(file);
      if(!replaceFiles(input, compressed)) throw new Error('Browser tidak mendukung penggantian file otomatis.');
      input.dataset.cqCompressed = '1';
      const saved = Math.max(0, originalBytes - compressed.size);
      if(typeof window.showToast === 'function' && saved > 64 * 1024){
        const before = (originalBytes / 1024 / 1024).toFixed(1);
        const after = (compressed.size / 1024).toFixed(0);
        window.showToast(`Foto otomatis diperkecil: ${before} MB → ${after} KB`);
      }
      input.dispatchEvent(new Event('change', { bubbles:true }));
    }catch(err){
      if(box) box.textContent = oldText || 'Klik untuk pilih foto';
      if(typeof window.showToast === 'function') window.showToast('Foto gagal diperkecil otomatis. Silakan pilih foto lain.', true);
      console.error('CQlass image compression:', err);
    }
  }, true);
})();