const CONFIG_DEFAULT = {
  whatsapp: '584241234567',
  email: 'contacto@tovarinnovations.com',
  nombre: 'TOVARINNOVATIONS'
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
));

function waLink(msg, numero){
  const n = (numero || '').replace(/\D/g,'');
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
}

let configGlobal = {...CONFIG_DEFAULT};

db.ref('config').on('value', snapshot => {
  const data = snapshot.val();
  if (data) configGlobal = {...CONFIG_DEFAULT, ...data};
  aplicarConfig(configGlobal);
});

db.ref('productos').on('value', snapshot => {
  const data = snapshot.val();
  const items = data ? Object.values(data) : [];
  renderCatalog(items);
});

function aplicarConfig(c){
  document.title = c.nombre + ' | Reparamos el presente, diseñamos el futuro';
  document.querySelectorAll('.brand').forEach(el => el.textContent = c.nombre);
  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const general = `Hola ${c.nombre}, quiero información sobre sus servicios.`;
  if ($('floatWa')) $('floatWa').href = waLink(general, c.whatsapp);
  if ($('heroWa')) $('heroWa').href = waLink(general, c.whatsapp);
  if ($('contactWa')) $('contactWa').href = waLink(general, c.whatsapp);
  if ($('contactMail')) $('contactMail').href = 'mailto:' + c.email;
}

function renderCatalog(items){
  const cont = $('catalog');
  if (!cont) return;

  if (!items.length){
    cont.innerHTML = `<div class="empty"><span>📦</span>Aún no hay productos publicados.<br>Vuelve pronto.</div>`;
    return;
  }

  cont.innerHTML = items.map(p => {
    const img = p.imagen
      ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">`
      : `<div class="no-img">🖼️</div>`;
    const msg = `Hola, me interesa: ${p.nombre}${p.precio ? ' — ' + p.precio : ''}. ¿Está disponible?`;
    return `
      <article class="product">
        <div class="product-img">${img}</div>
        <div class="product-body">
          ${p.categoria ? `<span class="cat-chip">${esc(p.categoria)}</span>` : ''}
          <h3>${esc(p.nombre)}</h3>
          ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : '<p></p>'}
          ${p.precio ? `<div class="price">${esc(p.precio)}</div>` : ''}
          <a class="btn" href="${waLink(msg, configGlobal.whatsapp)}" target="_blank" rel="noopener">Consultar</a>
        </div>
      </article>`;
  }).join('');
}