// ====== Configuración ======
const ADMIN_PIN = "2025"; // <-- cámbialo
const SELLER = { name: "Mi Nombre", card: "1234 5678 9012 3456" };

// ====== Helpers ======
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const store = {
  load(k,f){ try{return JSON.parse(localStorage.getItem(k)) ?? f}catch{return f}},
  save(k,v){ localStorage.setItem(k, JSON.stringify(v)) },
};
const money = (n)=> new Intl.NumberFormat('es',{style:'currency',currency:'USD'}).format(+n||0);

// Genera portada SVG y vista previa rápida
function svgCover(title){
  title = (title||"Partitura").slice(0,28);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 800'>
    <defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#c7f9ff'/><stop offset='1' stop-color='#e0eaff'/></linearGradient></defs>
    <rect width='600' height='800' rx='24' fill='url(#g)'/>
    <g fill='#0ea5e9'><circle cx='520' cy='80' r='20' opacity='.5'/><circle cx='90' cy='690' r='14' opacity='.5'/><rect x='60' y='620' width='480' height='18' rx='9' opacity='.25'/></g>
    <text x='50%' y='46%' dominant-baseline='middle' text-anchor='middle' font-size='40' font-family='system-ui,Arial' fill='#0f172a' font-weight='700'>${title}</text>
    <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='20' font-family='system-ui,Arial' fill='#64748b'>MyScoreFav</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function svgPagePreview(){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'>
    <rect width='1200' height='800' fill='#ffffff'/>
    <g stroke='#e5e7eb' stroke-width='2'>
      <line x1='60' x2='1140' y1='150' y2='150'/><line x1='60' x2='1140' y1='250' y2='250'/><line x1='60' x2='1140' y1='350' y2='350'/>
      <line x1='60' x2='1140' y1='450' y2='450'/><line x1='60' x2='1140' y1='550' y2='550'/>
    </g>
    <g fill='#0f172a'>
      <rect x='200' y='130' width='4' height='460'/><rect x='350' y='130' width='4' height='460'/><rect x='500' y='130' width='4' height='460'/>
      <rect x='650' y='130' width='4' height='460'/><rect x='800' y='130' width='4' height='460'/>
    </g>
    <text x='50%' y='60' text-anchor='middle' font-family='system-ui,Arial' font-size='40' fill='#0f172a' font-weight='700'>Vista previa</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
// Convierte archivo a DataURL
const toDataURL = (file)=> new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });

// ====== Estado ======
let state = {
  user: null,
  screen: 'auth',
  catalog: [],
  cart: [],
  orders: [],
  selected: null,
  adminUnlocked: false,
};

// ====== Inicio / Seed de catálogo ======
function seedCatalogIfEmpty(){
  const exists = store.load('msf_catalog', null);
  if(exists){ return exists }
  const beep = "data:audio/wav;base64,UklGRuRdAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YcBdAAAAAAENeRgNIbcl7SWmIWQZIg40ASP0eOiV34f...";
  const demo = [
    {id:crypto.randomUUID(), title:'Vals en Do Mayor', composer:'A. González', info:'Pieza romántica breve.', genre:'Vals', instruments:'Piano', price:4.99, cover:svgCover('Vals en Do Mayor'), preview:svgPagePreview(), audio:beep, pdf:null, midi:null},
    {id:crypto.randomUUID(), title:'Estudio Nº1', composer:'L. Rivera', info:'Técnica de arpegios.', genre:'Estudio', instruments:'Guitarra', price:5.99, cover:svgCover('Estudio Nº1'), preview:svgPagePreview(), audio:beep, pdf:null, midi:null},
    {id:crypto.randomUUID(), title:'Nocturno en Sol', composer:'M. López', info:'Melodía lírica.', genre:'Nocturno', instruments:'Piano', price:6.49, cover:svgCover('Nocturno en Sol'), preview:svgPagePreview(), audio:beep, pdf:null, midi:null},
  ];
  store.save('msf_catalog', demo);
  return demo;
}
function loadAll(){
  state.user = store.load('msf_user', null);
  state.catalog = seedCatalogIfEmpty();
  state.cart = store.load('msf_cart', []);
  state.orders = store.load('msf_orders', []);
  $('#sellerName').textContent = SELLER.name;
  $('#sellerCard').textContent = SELLER.card;
  render();
}
const saveUser = ()=> store.save('msf_user', state.user);
const saveCart = ()=> store.save('msf_cart', state.cart);
const saveOrders = ()=> store.save('msf_orders', state.orders);

// ====== Render & Navegación ======
function show(screen){
  state.screen = screen;
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $(`#screen-${screen}`).classList.add('active');
  $$('.tabbar button').forEach(b=>b.classList.remove('active'));
  const tb = $(`.tabbar button[data-nav='${screen}']`);
  if(tb) tb.classList.add('active');
  render();
}
function render(){
  if(!state.user){ show('auth'); return }
  // Perfil
  $('#profileEmail').textContent = state.user.email;
  $('#authProviderBadge').textContent = state.user.provider==='google' ? 'Google' : 'Local';

  // Catálogo
  const grid = $('#catalogGrid'); grid.innerHTML='';
  if(!state.catalog.length){ $('#emptyCatalog').classList.remove('hidden') } else { $('#emptyCatalog').classList.add('hidden') }
  state.catalog.forEach(sc=>{
    const card = document.createElement('div');
    card.className='card score-card';
    card.innerHTML = `
      <div class='score-thumb'><img alt='Portada' src='${sc.cover}'/></div>
      <div class='score-body'>
        <h3 class='score-title'>${sc.title}</h3>
        <p class='score-meta'>${sc.composer}</p>
        <div class='row' style='justify-content:space-between;margin-top:8px'>
          <span class='chip'>${money(sc.price)}</span>
          <button class='btn' data-id='${sc.id}'>Ver</button>
        </div>
      </div>`;
    card.querySelector('button').addEventListener('click',()=>openDetail(sc.id));
    grid.appendChild(card);
  });

  // Carrito
  const cl = $('#cartList'); cl.innerHTML='';
  if(!state.cart.length){ $('#cartEmpty').classList.remove('hidden') } else { $('#cartEmpty').classList.add('hidden') }
  state.cart.forEach((ci,idx)=>{
    const sc = state.catalog.find(s=>s.id===ci.id); if(!sc) return;
    const row = document.createElement('div');
    row.className='card'; row.style.margin='8px 0'; row.style.padding='10px';
    row.innerHTML = `
      <div class='row' style='gap:10px'>
        <img src='${sc.cover}' alt='' style='width:54px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line)'/>
        <div style='flex:1'>
          <div style='font-weight:700'>${sc.title}</div>
          <div class='subtle'>${sc.composer}</div>
        </div>
        <div style='text-align:right'>
          <div class='chip'>${money(sc.price)}</div>
          <button class='btn' data-remove='${idx}' style='margin-top:6px'>Quitar</button>
        </div>
      </div>`;
    row.querySelector('[data-remove]').addEventListener('click', (e)=>{
      const i = +e.currentTarget.getAttribute('data-remove');
      state.cart.splice(i,1); saveCart(); render();
    });
    cl.appendChild(row);
  });

  // Pedidos del usuario
  const ol = $('#ordersList'); ol.innerHTML='';
  if(!state.orders.length){ $('#ordersEmpty').classList.remove('hidden') } else { $('#ordersEmpty').classList.add('hidden') }
  state.orders.filter(o=>o.user===state.user.email).forEach(o=>{
    const sc = state.catalog.find(s=>s.id===o.itemId);
    const box = document.createElement('div');
    box.className='card'; box.style.margin='10px 0'; box.style.padding='12px';
    box.innerHTML = `
      <div class='row' style='gap:10px'>
        <img src='${sc?.cover||svgCover()}' style='width:54px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line)'/>
        <div style='flex:1'>
          <div style='font-weight:800'>${sc?.title||'Partitura'}</div>
          <div class='subtle'>Estado: <strong>${o.status}</strong></div>
          <div class='subtle'>${o.note ? 'Ref: '+o.note : ''}</div>
        </div>
        <div style='text-align:right'>
          <div class='chip'>${money(sc?.price||0)}</div>
          <div style='margin-top:6px'>
            ${o.status==='aprobado' && o.pdfUrl ? `<a class='btn' href='${o.pdfUrl}' download>Descargar PDF</a>`:''}
            ${o.status==='aprobado' && o.midiUrl ? `<a class='btn' href='${o.midiUrl}' download>MIDI</a>`:''}
          </div>
        </div>
      </div>`;
    ol.appendChild(box);
  });

  // Admin: pedidos pendientes
  if(state.adminUnlocked){
    const ao = $('#adminOrders'); ao.innerHTML='';
    const pend = state.orders.filter(o=>o.status==='pendiente');
    if(!pend.length){ ao.innerHTML = `<div class='empty'>No hay pedidos pendientes.</div>` }
    pend.forEach(o=>{
      const sc = state.catalog.find(s=>s.id===o.itemId);
      const row = document.createElement('div');
      row.className='card'; row.style.margin='10px 0'; row.style.padding='12px';
      row.innerHTML = `
        <div class='row' style='gap:10px'>
          <img src='${sc?.cover}' style='width:54px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line)'/>
          <div style='flex:1'>
            <div style='font-weight:800'>${sc?.title}</div>
            <div class='subtle'>Usuario: ${o.user}</div>
            <div class='subtle'>Ref: ${o.note||'-'}</div>
          </div>
          <div class='row' style='gap:8px'>
            <button class='btn' data-approve='${o.id}'>Aprobar</button>
            <button class='btn' data-reject='${o.id}'>Rechazar</button>
          </div>
        </div>`;
      row.querySelector(`[data-approve='${o.id}']`).addEventListener('click',()=>{
        const item = state.catalog.find(s=>s.id===o.itemId);
        approveOrder(o.id, item?.pdf, item?.midi);
      });
      row.querySelector(`[data-reject='${o.id}']`).addEventListener('click',()=>rejectOrder(o.id));
      ao.appendChild(row);
    });

    // Admin: catálogo listado
    const ac = $('#adminCatalog'); ac.innerHTML='';
    state.catalog.forEach(it=>{
      const c = document.createElement('div');
      c.className='card'; c.innerHTML = `
        <div class='score-thumb'><img src='${it.cover}' alt='portada'/></div>
        <div class='score-body'>
          <div class='score-title'>${it.title}</div>
          <div class='score-meta'>${it.composer} • ${it.genre} • ${it.instruments}</div>
          <div class='row' style='justify-content:space-between;margin-top:8px'>
            <span class='chip'>${money(it.price)}</span>
            <button class='btn' data-del='${it.id}'>Eliminar</button>
          </div>
        </div>`;
      c.querySelector('[data-del]').addEventListener('click',()=>{
        state.catalog = state.catalog.filter(s=>s.id!==it.id);
        store.save('msf_catalog', state.catalog); render();
      });
      ac.appendChild(c);
    });
  }
}

// ====== Detalle modal ======
function openDetail(id){
  const sc = state.catalog.find(s=>s.id===id); if(!sc) return;
  state.selected = sc.id;
  $('#dTitle').textContent = sc.title;
  $('#dComposer').textContent = sc.composer;
  $('#dInfo').textContent = sc.info||'';
  $('#dTags').textContent = [sc.genre, sc.instruments].filter(Boolean).join(' • ');
  $('#dPrice').textContent = money(sc.price);
  $('#dPreview').innerHTML = `<img alt='Vista previa' src='${sc.preview||svgPagePreview()}'/>`;
  $('#dAudio').src = sc.audio || '';
  $('#detailModal').classList.add('show');
}
$('#closeDetail').addEventListener('click',()=> $('#detailModal').classList.remove('show'));
$('#detailModal').addEventListener('click',(e)=>{ if(e.target.id==='detailModal') $('#detailModal').classList.remove('show') });

// ====== Auth ======
$('#googleBtn').addEventListener('click',()=>{ state.user={email:'usuario.google@demo', provider:'google'}; saveUser(); show('home'); });
$('#emailRegisterBtn').addEventListener('click',()=>{
  const email = $('#authEmail').value.trim(), pass = $('#authPass').value.trim();
  if(!email || !pass){ alert('Completa correo y contraseña'); return }
  state.user = {email, provider:'local'}; saveUser(); show('home');
});
$('#emailLoginBtn').addEventListener('click',()=>{
  const email = $('#authEmail').value.trim(), pass = $('#authPass').value.trim();
  if(!email || !pass){ alert('Completa correo y contraseña'); return }
  state.user = {email, provider:'local'}; saveUser(); show('home');
});
$('#logoutBtn').addEventListener('click',()=>{ state.user=null; saveUser(); show('auth'); });

// ====== Nav ======
$$('.tabbar button').forEach(b=>b.addEventListener('click',()=>{
  const target = b.getAttribute('data-nav');
  if(!state.user){ show('auth'); return }
  show(target);
}));
$('#profileBtn').addEventListener('click',()=> show('profile'));
$('#cartBtn').addEventListener('click',()=> show('cart'));
$('#btnOrders').addEventListener('click',()=> show('orders'));
$('#btnAdmin').addEventListener('click',()=> show('admin'));

// ====== Carrito / Checkout ======
$('#goCheckoutBtn').addEventListener('click',()=>{
  if(!state.cart.length){ alert('Tu carrito está vacío'); return }
  show('checkout');
});
$('#btnAddCart').addEventListener('click',()=>{
  const sc = state.catalog.find(s=>s.id===state.selected);
  if(!sc) return; state.cart.push({id:sc.id}); saveCart(); $('#detailModal').classList.remove('show'); show('cart');
});
$('#btnBuyNow').addEventListener('click',()=>{
  const sc = state.catalog.find(s=>s.id===state.selected);
  if(!sc) return; state.cart=[{id:sc.id}]; saveCart(); $('#detailModal').classList.remove('show'); show('checkout');
});

// Enviar comprobante y crear pedidos pendientes
$('#submitPaymentBtn').addEventListener('click', async ()=>{
  if(!state.cart.length){ alert('No hay artículos en el carrito'); return }
  const note = $('#paymentNote').value.trim();
  const file = $('#receiptInput').files[0];
  if(!file){ alert('Sube un comprobante'); return }
  // (demo) no guardamos el archivo, solo registramos el pedido
  const now = Date.now();
  state.cart.forEach(ci=>{
    state.orders.push({ id:crypto.randomUUID(), user: state.user.email, itemId: ci.id, status:'pendiente', note, createdAt: now, pdfUrl:null, midiUrl:null });
  });
  saveOrders();
  state.cart = []; saveCart();
  alert('Comprobante enviado. Tu pedido quedó pendiente de aprobación.');
  show('orders');
});

// ====== Admin ======
$('#adminLoginBtn').addEventListener('click',()=>{
  const pin = $('#adminPin').value.trim();
  if(pin===ADMIN_PIN){
    state.adminUnlocked = true; $('#adminArea').classList.remove('hidden'); render();
  } else { alert('PIN incorrecto'); }
});

// Añadir partitura (con archivos)
$('#addScoreBtn').addEventListener('click', async ()=>{
  const title = $('#aTitle').value.trim();
  const composer = $('#aComposer').value.trim();
  const info = $('#aInfo').value.trim();
  const genre = $('#aGenre').value.trim();
  const instruments = $('#aInstruments').value.trim();
  const price = parseFloat($('#aPrice').value||'0');

  const fAudio = $('#aAudio').files[0];
  const fCover = $('#aCover').files[0];
  const fPdf = $('#aPdf').files[0];
  const fMidi = $('#aMidi').files[0];

  if(!title || !composer){ alert('Completa título y compositor'); return }

  // DataURLs (demo). Archivos grandes podrían no persistir entre recargas.
  const audio = fAudio ? await toDataURL(fAudio) : '';
  const cover = fCover ? await toDataURL(fCover) : svgCover(title);
  const pdf = fPdf ? await toDataURL(fPdf) : null;
  const midi = fMidi ? await toDataURL(fMidi) : null;
  const preview = svgPagePreview();

  const item = { id:crypto.randomUUID(), title, composer, info, genre, instruments, price:isNaN(price)?0:price, cover, preview, audio, pdf, midi };
  const cat = store.load('msf_catalog', []); cat.push(item); store.save('msf_catalog', cat); state.catalog = cat;
  // limpiar
  $('#aTitle').value=''; $('#aComposer').value=''; $('#aInfo').value=''; $('#aGenre').value=''; $('#aInstruments').value=''; $('#aPrice').value='';
  $('#aAudio').value=''; $('#aCover').value=''; $('#aPdf').value=''; $('#aMidi').value='';
  render();
  alert('Partitura añadida al catálogo');
});

function approveOrder(id, pdfUrl, midiUrl){
  const o = state.orders.find(x=>x.id===id); if(!o) return;
  o.status='aprobado'; o.pdfUrl=pdfUrl||null; o.midiUrl=midiUrl||null; saveOrders(); render();
}
function rejectOrder(id){
  const o = state.orders.find(x=>x.id===id); if(!o) return;
  o.status='rechazado'; saveOrders(); render();
}

// Botones rápidos de cabecera/nav
// (ya conectados arriba)

// ====== Boot ======
(function boot(){
  loadAll();
  if(state.user){ show('home'); } else { show('auth'); }
})();