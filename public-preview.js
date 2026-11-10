const previewMessages={
  fr:{title:'Aperçu de la boutique',message:'La boutique est en mode aperçu public. Les commandes et les comptes seront activés après configuration d’une authentification et d’un stockage sécurisés.',authTitle:'Connexion temporairement indisponible',authMessage:'La connexion client, administrateur et vendeur sera activée une fois le service d’authentification sécurisé configuré.',checkout:'Commandes temporairement indisponibles',checkoutMessage:'Vous pouvez consulter le catalogue. Le passage de commande sera activé après configuration du service sécurisé.',ownerTitle:'Accès de gestion désactivés',ownerMessage:'L’administration et l’espace vendeur nécessitent des comptes vérifiés côté serveur. Les rôles enregistrés dans ce navigateur ne sont pas utilisés.',notice:'Aperçu public : commande en ligne temporairement désactivée.'},
  en:{title:'Store preview',message:'The store is in public preview mode. Orders and accounts will be enabled after secure authentication and shared storage are configured.',authTitle:'Sign-in temporarily unavailable',authMessage:'Customer, administrator, and seller sign-in will be enabled after secure authentication is configured.',checkout:'Ordering temporarily unavailable',checkoutMessage:'You can browse the catalog. Checkout will be enabled after the secure service is configured.',ownerTitle:'Staff access disabled',ownerMessage:'Admin and seller tools require server-verified accounts. Roles saved in this browser are not used.',notice:'Public preview: online ordering is temporarily disabled.'}
};
const previewText=()=>previewMessages[state.preferences?.locale==='en'?'en':'fr'];
state.user=null;
if(['admin','seller','account'].includes(state.activePage))state.activePage='newest';
state.users=(state.users||[]).filter(user=>user.role==='customer');
save();
isSellerUser=function(){return false};
isShopOwner=function(){return false};
canManageShop=function(){return false};
function showPreviewModal(title,message){
  el('authModal').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><div><p class="eyebrow">${esc(previewText().title)}</p><h2 class="serif">${esc(title)}</h2><p>${esc(message)}</p></div><button class="close-btn" data-close-preview aria-label="Close">×</button></div>`;
  el('authBackdrop').classList.add('open');
  el('authModal').querySelector('[data-close-preview]').addEventListener('click',()=>el('authBackdrop').classList.remove('open'));
}
renderAuth=function(){showPreviewModal(previewText().authTitle,previewText().authMessage)};
authSubmit=function(event){event.preventDefault();showPreviewModal(previewText().authTitle,previewText().authMessage)};
placeOrder=function(){closeCart();toast(previewText().checkout);showPreviewModal(previewText().checkout,previewText().checkoutMessage)};
const previewDrawCart=drawCart;
drawCart=function(){
  previewDrawCart();
  const place=el('cartDrawer').querySelector('[data-place-order]');
  if(!place)return;
  place.disabled=true;
  place.textContent=previewText().checkout;
  el('cartDrawer').querySelector('.checkout-schedule')?.remove();
  const message=document.createElement('p');
  message.className='pickup-note';
  message.textContent=previewText().notice;
  place.before(message);
};
const previewAdminPage=adminPage;
adminPage=function(){return `<div class="panel"><h2>${esc(previewText().ownerTitle)}</h2><p>${esc(previewText().ownerMessage)}</p></div>`};
const previewSellerPage=sellerPage;
sellerPage=function(){return `<div class="panel"><h2>${esc(previewText().ownerTitle)}</h2><p>${esc(previewText().ownerMessage)}</p></div>`};
const previewStorefront=storefront;
storefront=function(){return `<div class="owner-warning" role="status">${esc(previewText().notice)}</div>`+previewStorefront()};
const previewRenderPage=renderPage;
renderPage=function(){
  if(['admin','seller','account'].includes(state.activePage)){state.activePage='newest';save()}
  previewRenderPage();
};
shell();
