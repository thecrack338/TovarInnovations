const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

let configAdmin = { pass: 'admin123' };
let editandoId = null;
let imagenActual = '';

db.ref('config').on('value', snapshot => {
  const data = snapshot.val();
  if (data) configAdmin = data;
});

$('loginBtn').onclick = tryLogin;
$('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

function tryLogin(){
  const val = $('passInput').value;
  if (val === (configAdmin.pass || 'admin123')){
    $('loginAlert').classList.remove('show');
    sessionStorage.setItem('tovar_admin_logged', '1');
    entrarAlPanel();
  } else {
    $('loginAlert').classList.add('show');
  }
}

function entrarAlPanel(){
  $('loginView').style.display = 'none';
  $('panelView').style.display = 'block';
  $('passInput').value = '';
  cargarProductosAdmin();
  cargarFormConfig();
}

if (sessionStorage.getItem('tovar_admin_logged') === '1'){
  entrarAlPanel();
}

$('logoutBtn').onclick = () => {
  sessionStorage.removeItem('tovar_admin_logged');
  $('panelView').style.display = 'none';
  $('loginView').style.display = 'block';
};

document.querySelectorAll('.tab[data-tab]').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});
function switchTab(name){
  document.querySelectorAll('.tab[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
}

function cargarProductosAdmin(){
  db.ref('productos').on('value', snapshot => {
    const data = snapshot.val();
    const items = data ? Object.entries(data).map(([id, val]) => ({...val, id})) : [];
    renderAdminList(items);
  });
}

function renderAdminList(items){
  const cont = $('adminList');
  if (!items.length){
    cont.innerHTML = `<p class="hint" style="text-align:center;padding:26px">No hay productos todavía. Ve a la pestaña "Agregar".</p>`;
    return;
  }
  cont.innerHTML = items.map(p => `
    <div class="admin-item">
      ${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : `<div class="ph">🖼️</div>`}
      <div class="info">
        <strong>${esc(p.nombre)}</strong>
        <small>${esc(p.categoria || 'Sin categoría')} ${p.precio ? '· ' + esc(p.precio) : ''}</small>
      </div>
      <button class="mini" data-edit="${p.id}">✏ Editar</button>
      <button class="mini del" data-del="${p.id}">🗑</button>
    </div>
  `).join('');

  cont.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editProduct(b.dataset.edit));
  cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => deleteProduct(b.dataset.del));
}

function deleteProduct(id){
  if (!confirm('¿Eliminar este producto?')) return;
  db.ref('productos/' + id).remove()
    .then(() => console.log('Eliminado:', id))
    .catch(err => alert('Error al eliminar: ' + err.message));
}

$('pFile').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    imagenActual = await resizeImage(file);
    $('preview').innerHTML = `<img src="${imagenActual}" alt="preview">`;
    $('pUrl').value = '';
  } catch(err){
    alert('No se pudo procesar la imagen.');
  }
};

$('pUrl').oninput = e => {
  const url = e.target.value.trim();
  if (url){
    imagenActual = url;
    $('preview').innerHTML = `<img src="${esc(url)}" alt="preview" onerror="this.parentElement.innerHTML='<span>URL inválida</span>'">`;
    $('pFile').value = '';
  } else {
    imagenActual = '';
    $('preview').innerHTML = '<span>Sin imagen</span>';
  }
};

$('saveBtn').onclick = () => {
  const nombre = $('pNombre').value.trim();
  if (!nombre){ alert('El nombre del producto es obligatorio.'); return; }

  const prod = {
    nombre,
    descripcion: $('pDesc').value.trim(),
    precio: $('pPrecio').value.trim(),
    categoria: $('pCat').value.trim(),
    imagen: imagenActual
  };

  const alertBox = $('saveAlert');

  if (editandoId){
    db.ref('productos/' + editandoId).update(prod)
      .then(() => {
        alertBox.textContent = '✔ Producto actualizado';
        alertBox.classList.add('show');
        setTimeout(() => alertBox.classList.remove('show'), 2500);
        resetForm();
        switchTab('productos');
      })
      .catch(err => alert('Error: ' + err.message));
  } else {
    db.ref('productos/' + uid()).set(prod)
      .then(() => {
        alertBox.textContent = '✔ Producto agregado';
        alertBox.classList.add('show');
        setTimeout(() => alertBox.classList.remove('show'), 2500);
        resetForm();
        switchTab('productos');
      })
      .catch(err => alert('Error: ' + err.message));
  }
};

$('cancelBtn').onclick = resetForm;

function resetForm(){
  editandoId = null;
  imagenActual = '';
  $('pNombre').value = '';
  $('pDesc').value = '';
  $('pPrecio').value = '';
  $('pCat').value = '';
  $('pFile').value = '';
  $('pUrl').value = '';
  $('preview').innerHTML = '<span>Sin imagen</span>';
  $('saveBtn').textContent = '💾 Guardar producto';
  $('cancelBtn').style.display = 'none';
}

function editProduct(id){
  db.ref('productos/' + id).once('value').then(snapshot => {
    const p = snapshot.val();
    if (!p) return;
    editandoId = id;
    imagenActual = p.imagen || '';
    $('pNombre').value = p.nombre || '';
    $('pDesc').value = p.descripcion || '';
    $('pPrecio').value = p.precio || '';
    $('pCat').value = p.categoria || '';
    $('pUrl').value = (p.imagen && !p.imagen.startsWith('data:')) ? p.imagen : '';
    $('preview').innerHTML = imagenActual
      ? `<img src="${imagenActual}" alt="preview">`
      : '<span>Sin imagen</span>';
    $('saveBtn').textContent = '💾 Actualizar producto';
    $('cancelBtn').style.display = 'inline-flex';
    switchTab('nuevo');
  });
}

function cargarFormConfig(){
  $('cWa').value = configAdmin.whatsapp || '';
  $('cMail').value = configAdmin.email || '';
  $('cNombre').value = configAdmin.nombre || '';
  $('cPass').value = '';
}

$('saveCfg').onclick = () => {
  const nueva = {
    whatsapp: $('cWa').value.replace(/\D/g,''),
    email: $('cMail').value.trim() || configAdmin.email,
    nombre: $('cNombre').value.trim() || configAdmin.nombre,
    pass: configAdmin.pass || 'admin123'
  };
  const np = $('cPass').value.trim();
  if (np) nueva.pass = np;

  db.ref('config').set(nueva).then(() => {
    const a = $('cfgAlert');
    a.classList.add('show');
    setTimeout(() => a.classList.remove('show'), 2500);
    $('cPass').value = '';
  }).catch(err => alert('Error: ' + err.message));
};

function resizeImage(file, maxSize = 720, quality = 0.75){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize){ height = Math.round(height * maxSize / width); width = maxSize; }
        else if (height > maxSize){ width = Math.round(width * maxSize / height); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
}
