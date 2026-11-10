const firebaseConfig={apiKey:'AIzaSyAy631i8I0Ogo-_dFGy5CS-rmbBDR4Pe3k',authDomain:'vap-origin.firebaseapp.com',projectId:'vap-origin',storageBucket:'vap-origin.firebasestorage.app',messagingSenderId:'1051563205225',appId:'1:1051563205225:web:055a047d11d899213478f8',measurementId:'G-0KJZ50Z3LW'};
if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
const vapAuth=firebase.auth();
const vapApi=async(path,{method='GET',body}={})=>{
  const headers={'content-type':'application/json'};
  if(vapAuth.currentUser)headers.authorization=`Bearer ${await vapAuth.currentUser.getIdToken(true)}`;
  const response=await fetch(`/api/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  return data;
};
window.vapApi=vapApi;window.vapAuth=vapAuth;
const tr=key=>localizedText(key,state.preferences?.locale||'fr');
function showAuthMessage(message){
  el('authModal').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><div><p class="eyebrow">Vap'Origin</p><h2 class="serif">${esc(tr('Secure account access'))}</h2><p>${esc(message)}</p></div><button class="close-btn" data-close-auth aria-label="${esc(tr('Close'))}">×</button></div><button class="outline-btn" type="button" data-back-login>${esc(tr('Back to sign in'))}</button>`;
  el('authBackdrop').classList.add('open');
  el('authModal').querySelector('[data-close-auth]').addEventListener('click',closeAuth);
  el('authModal').querySelector('[data-back-login]').addEventListener('click',()=>{authMode='login';renderAuth()});
  localizeDom();
}
renderAuth=function(){
  const signup=authMode==='signup';
  el('authModal').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><div><p class="eyebrow">Vap'Origin</p><h2 class="serif">${esc(tr(signup?'Create a secure account':'Sign in securely'))}</h2><p>${esc(tr(signup?'Create a customer account. Verify your email before ordering.':'Sign in to see your account and orders.'))}</p></div><button class="close-btn" data-close-auth aria-label="${esc(tr('Close'))}">×</button></div><form id="authForm">${signup?`<div class="field"><label for="authName">${esc(tr('Name'))}</label><input id="authName" name="name" autocomplete="name" maxlength="100" required></div>`:''}<div class="field"><label for="authEmail">${esc(tr('Email'))}</label><input id="authEmail" name="email" type="email" autocomplete="email" maxlength="254" required></div><div class="field"><label for="authPassword">${esc(tr('Password'))}</label><input id="authPassword" name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="8" maxlength="128" required></div><button class="primary-btn" type="submit">${esc(tr(signup?'Create account':'Sign in'))}</button></form><p class="auth-switch">${signup?`${esc(tr('Already have an account?'))} <button type="button" data-auth-switch="login">${esc(tr('Sign in'))}</button>`:`${esc(tr('New around here?'))} <button type="button" data-auth-switch="signup">${esc(tr('Create account'))}</button>`}</p>${signup?'':`<p class="auth-switch"><button type="button" data-reset-password>${esc(tr('Forgot password?'))}</button></p>`}<div class="demo-note">${esc(tr('Secure authentication is enabled. Staff roles are assigned only by the verified owner.'))}</div>`;
  el('authBackdrop').classList.add('open');
  el('authModal').querySelector('[data-close-auth]').addEventListener('click',closeAuth);
  el('authModal').querySelector('[data-auth-switch]')?.addEventListener('click',()=>{authMode=signup?'login':'signup';renderAuth()});
  el('authModal').querySelector('[data-reset-password]')?.addEventListener('click',async()=>{
    const email=el('authEmail').value.trim().toLowerCase();
    if(!email){toast(tr('Enter your email address first.'));return}
    try{await vapAuth.sendPasswordResetEmail(email);toast(tr('Password reset email sent.'))}catch{toast(tr('Could not send password reset email.'))}
  });
  el('authForm').addEventListener('submit',authSubmit);localizeDom();
};
function toUiUser(user){return{...user,role:user.role==='owner'?'admin':user.role,owner:user.role==='owner'}}
async function syncRemoteState({render=true}={}){
  state.user=null;state.users=[];state.orders=[];
  try{const response=await vapApi('products');state.products=response.products||[]}catch(error){console.error('Catalog API unavailable',error.message)}
  if(vapAuth.currentUser){
    try{
      await vapAuth.currentUser.reload();
      if(vapAuth.currentUser.emailVerified){
        const {user}=await vapApi('session');state.user=toUiUser(user);
        const {orders}=await vapApi('orders');state.orders=orders||[];
        state.activePage=['owner','admin'].includes(user.role)?'admin':user.role==='seller'?'seller':'account';
      }
    }catch(error){console.warn('Session not active:',error.message);state.user=null;state.orders=[]}
  }
  save();if(render)shell();
}

authSubmit=async function(event){
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget));
  const email=String(data.email||'').trim().toLowerCase(),password=String(data.password||'');
  try{
    if(authMode==='signup'){
      const credential=await vapAuth.createUserWithEmailAndPassword(email,password);
      await credential.user.updateProfile({displayName:String(data.name||'').trim().slice(0,100)});
      await credential.user.sendEmailVerification();
      await vapAuth.signOut();
      showAuthMessage(tr('We sent a verification link to your email. Verify it, then sign in to continue.'));
      return;
    }
    const credential=await vapAuth.signInWithEmailAndPassword(email,password);
    await credential.user.reload();
    if(!credential.user.emailVerified){await credential.user.sendEmailVerification();await vapAuth.signOut();showAuthMessage(tr('Your email is not verified yet. We sent another verification link.'));return}
    await syncRemoteState({render:false});closeAuth();shell();toast(tr('You are signed in.'));
  }catch(error){
    const messages={'auth/email-already-in-use':'An account already uses this email.','auth/invalid-email':'Enter a valid email address.','auth/weak-password':'Choose a stronger password with at least 8 characters.','auth/invalid-credential':'Email or password is not correct.','auth/too-many-requests':'Too many attempts. Try again later.'};
    toast(tr(messages[error.code]||'Could not sign in. Check your details and try again.'));
  }
};
logout=async function(){await vapAuth.signOut();state.user=null;state.orders=[];state.activePage='newest';save();shell();toast(tr('You are signed out.'))};
isShopOwner=function(){return state.user?.role==='admin'&&state.user?.owner===true};
canManageShop=function(){return ['admin','owner'].includes(state.user?.role)};
isSellerUser=function(){return ['seller','admin'].includes(state.user?.role)};
placeOrder=async function(){
  if(!vapAuth.currentUser||state.user?.role!=='customer'){closeCart();showAuth();toast(tr('Sign in with a verified customer account before placing an order.'));return}
  const selected=state.checkoutSchedule;let scheduledAt=state.checkoutScheduledAt||'';
  if(selected&&selected!=='custom'){
    const date=new Date();if(selected==='1h')date.setHours(date.getHours()+1);else if(selected==='2h')date.setHours(date.getHours()+2);else if(selected==='4h')date.setHours(date.getHours()+4);else if(selected==='tomorrow-am'){date.setDate(date.getDate()+1);date.setHours(9,0,0,0)}else if(selected==='tomorrow-pm'){date.setDate(date.getDate()+1);date.setHours(14,0,0,0)}scheduledAt=date.toISOString();
  }
  if(!scheduledAt){toast(tr('Choose a delivery time before placing your order.'));return}
  try{
    const {order}=await vapApi('orders',{method:'POST',body:{items:state.cart,scheduledAt}});
    state.orders=[order,...state.orders];state.cart=[];state.checkoutSchedule='';state.checkoutScheduledAt='';closeCart();state.activePage='account';save();shell();toast(tr('Pickup order placed. No payment taken.'));
  }catch(error){toast(tr(error.message))}
};

function installOrderApiHandlers(){
  document.addEventListener('click',async event=>{
    const payment=event.target.closest('[data-seller-payment]'),delivery=event.target.closest('[data-seller-delivery]'),cancel=event.target.closest('[data-seller-cancel]'),remove=event.target.closest('[data-seller-delete-order]'),category=event.target.closest('[data-delete-category]'),product=event.target.closest('[data-delete-product]');
    const target=payment||delivery||cancel||remove||category||product;if(!target)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    try{
      if(payment){const id=payment.dataset.sellerPayment;const order=state.orders.find(item=>item.id===id);if(!order)return;const next=order.paymentStatus==='Paid'?'Unpaid':'Paid';await vapApi(`orders/${encodeURIComponent(id)}/payment`,{method:'PATCH',body:{paymentStatus:next}})}
      if(delivery){const id=delivery.dataset.sellerDelivery;const order=state.orders.find(item=>item.id===id);if(!order)return;const next=order.deliveryStatus==='Delivered'?'Pending':'Delivered';await vapApi(`orders/${encodeURIComponent(id)}/delivery`,{method:'PATCH',body:{deliveryStatus:next}})}
      if(cancel){const id=cancel.dataset.sellerCancel;if(!confirm(tr(`Cancel order ${id}?`)))return;await vapApi(`orders/${encodeURIComponent(id)}/cancel`,{method:'PATCH',body:{}})}
      if(remove){const id=remove.dataset.sellerDeleteOrder;if(!confirm(tr(`Delete order ${id} permanently? This cannot be undone.`)))return;await vapApi(`orders/${encodeURIComponent(id)}`,{method:'DELETE'})}
      if(category){const name=category.dataset.deleteCategory;if(!canManageShop())throw new Error('Accès administration requis.');if(!confirm(tr(`Delete category "${name}" and its products? Past orders will stay in order history.`)))return;await vapApi(`categories/${encodeURIComponent(name)}`,{method:'DELETE'})}
      if(product){const id=product.dataset.deleteProduct;if(!canManageShop())throw new Error('Accès administration requis.');if(!confirm(tr('Remove this product from the shop?')))return;await vapApi(`products/${encodeURIComponent(id)}`,{method:'DELETE'})}
      await syncRemoteState();toast(tr('Order status updated.'));
    }catch(error){toast(tr(error.message))}
  },true);
  document.addEventListener('submit',async event=>{
    const edit=event.target.closest('[data-seller-edit]'),sellerReview=event.target.closest('[data-seller-review]'),customerReview=event.target.closest('[data-customer-review]'),productReview=event.target.closest('[data-product-review]'),staffForm=event.target.closest('#createStaffAccount'),sellerCreate=event.target.closest('#sellerCreateOrder');
    const form=edit||sellerReview||customerReview||productReview||staffForm||sellerCreate;if(!form)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    try{
      if(edit){const id=edit.dataset.sellerEdit;const original=state.orders.find(item=>item.id===id);const items=[...edit.querySelectorAll('[data-edit-item-row]')].map(row=>{const select=row.querySelector('[data-item-product]');let productId=select.value;if(productId.startsWith('saved:'))productId=original.items[Number(productId.slice(6))]?.id;return{id:productId,qty:Number(row.querySelector('[data-item-quantity]').value)}});await vapApi(`orders/${encodeURIComponent(id)}`,{method:'PATCH',body:{name:edit.elements.name.value,scheduledAt:new Date(edit.elements.scheduledAt.value).toISOString(),items}})}
      if(sellerReview){const id=sellerReview.dataset.sellerReview;await vapApi(`orders/${encodeURIComponent(id)}/seller-note`,{method:'PATCH',body:{stars:Number(sellerReview.elements.stars.value),note:sellerReview.elements.note.value}})}
      if(customerReview){const id=customerReview.dataset.customerReview;await vapApi(`orders/${encodeURIComponent(id)}/review`,{method:'PATCH',body:{stars:Number(customerReview.elements.stars.value),note:customerReview.elements.note.value}})}
      if(productReview){const id=productReview.dataset.productReview;await vapApi(`products/${encodeURIComponent(id)}/reviews`,{method:'POST',body:{stars:Number(productReview.elements.stars.value),note:productReview.elements.note.value}})}
      if(staffForm){if(!isShopOwner())throw new Error('Accès propriétaire requis.');await vapApi('staff',{method:'POST',body:{email:staffForm.elements.email.value,role:staffForm.elements.role.value}})}
      if(sellerCreate){const data=new FormData(sellerCreate);const product=state.products.find(item=>item.id===data.get('productId'));const quantity=Number(data.get('quantity'));const items=product?[{id:product.id,qty:quantity}]:[];await vapApi('orders',{method:'POST',body:{customerEmail:data.get('email'),name:data.get('name'),scheduledAt:data.get('scheduledAt')?new Date(data.get('scheduledAt')).toISOString():'',items}})}
      await syncRemoteState();toast(tr('Saved successfully.'));
    }catch(error){toast(tr(error.message))}
  },true);
}

ownerAccountsPanel=function(){
  const html=`<div class="owner-warning">${tr('Staff roles are protected by verified Firebase accounts and server-side authorization.')}</div><div class="panel"><h2>${tr('Create a staff account')}</h2><form id="createStaffAccount" class="form-grid"><div class="field"><label for="staffEmail">${tr('Email')}</label><input id="staffEmail" name="email" type="email" required></div><div class="field"><label for="staffRole">${tr('Role')}</label><select id="staffRole" name="role"><option value="seller">${tr('Seller')}</option><option value="admin">${tr('Admin')}</option></select></div><div class="field full"><button class="primary-btn" type="submit">${tr('Invite staff account')}</button></div></form></div><div class="panel"><h2>${tr('Existing accounts')}</h2><input id="accountSearch" type="search" placeholder="${tr('Search accounts')}" aria-label="${tr('Search accounts')}"><div class="admin-list" id="accountList">${tr('Loading accounts…')}</div></div>`;
  queueMicrotask(async()=>{
    const list=document.getElementById('accountList');if(!list)return;
    try{
      const {accounts,invites}=await vapApi('staff');const entries=[...(accounts||[]),...(invites||[]).map(invite=>({...invite,display_name:tr('Invitation pending'),pending:true}))];
      list.innerHTML=entries.map(account=>`<div class="admin-item account-row" data-account-row data-search="${esc(`${account.display_name||''} ${account.email} ${account.role}`.toLowerCase())}"><div><strong>${esc(account.display_name||account.email)}</strong><small>${esc(account.email)} · ${tr(account.role==='owner'?'Owner':account.role==='admin'?'Admin':account.role==='seller'?'Seller':'Customer')}${account.pending?' · '+tr('Pending'):''}</small></div><div class="item-actions">${account.role==='owner'?'<span class="account-owner">Owner</span>':`<button class="small-btn" data-set-role="${esc(account.email)}" data-role="${account.role==='admin'?'seller':'admin'}">${tr(account.role==='admin'?'Make seller':'Make admin')}</button><button class="small-btn danger" data-remove-staff="${esc(account.email)}">${tr('Remove staff access')}</button>`}</div></div>`).join('')||`<p>${tr('No accounts yet.')}</p>`;
      localizeDom();
    }catch(error){list.textContent=tr(error.message)}
  });
  return html;
};
const baseBindPageForRemote=bindPage;
bindPage=function(){
  baseBindPageForRemote();
  const search=document.getElementById('accountSearch');
  search?.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();document.querySelectorAll('[data-account-row]').forEach(row=>row.hidden=!row.dataset.search.includes(query))});
  document.querySelectorAll('[data-set-role]').forEach(button=>button.addEventListener('click',async()=>{if(!isShopOwner())return;try{await vapApi('staff',{method:'POST',body:{email:button.dataset.setRole,role:button.dataset.role}});renderPage()}catch(error){toast(tr(error.message))}}));
  document.querySelectorAll('[data-remove-staff]').forEach(button=>button.addEventListener('click',async()=>{if(!isShopOwner()||!confirm(tr('Remove staff access?')))return;try{await vapApi(`staff?email=${encodeURIComponent(button.dataset.removeStaff)}`,{method:'DELETE'});renderPage()}catch(error){toast(tr(error.message))}}));
};
const baseProductEditorForRemote=productEditor;
productEditor=function(id){
  baseProductEditorForRemote(id);
  const form=document.getElementById('productForm');if(!form)return;
  form.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    try{const data=Object.fromEntries(new FormData(form));data.id=id||`prod-${crypto.randomUUID()}`;data.price=Number(data.price);await vapApi('products',{method:'POST',body:data});await syncRemoteState();closeProduct();renderPage();toast(tr('Product saved.'))}catch(error){toast(tr(error.message))}
  },true);
};
const baseDrawCartForRemote=drawCart;
drawCart=function(){baseDrawCartForRemote();localizeDom()};
const baseShellForRemote=shell;
shell=function(){baseShellForRemote();localizeDom()};
const baseRenderPageForRemote=renderPage;
renderPage=function(){baseRenderPageForRemote();localizeDom()};
installOrderApiHandlers();
state.user=null;state.users=[];state.orders=[];save();
vapAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
vapAuth.onAuthStateChanged(()=>{syncRemoteState().catch(error=>console.error('Session sync failed',error))});
shell();
