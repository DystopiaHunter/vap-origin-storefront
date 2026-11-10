const sellerDefaults={theme:'light',themeName:'Market Green',color:'#246149'};
state.sellerSettings={...sellerDefaults,...(state.sellerSettings||{})};
const sellerBaseAuthSubmit=authSubmit;
authSubmit=function(event){
  event.preventDefault();
  sellerBaseAuthSubmit(event);
};
const sellerBaseRenderAuth=renderAuth;
renderAuth=function(){
  sellerBaseRenderAuth();
  const note=el('authModal').querySelector('.demo-note');
  if(note)note.textContent='Orders, customer accounts, and staff access are stored only in this browser demo. Online ordering and staff accounts are disabled until secure shared authentication is connected.';
};
function isSellerUser(){return false}
const sellerOriginalNav=nav;
nav=function(){
  const categories=[...new Set(state.products.map(product=>product.category).filter(Boolean))];
  const active=state.activePage;
  const browse=`<div class="nav-group"><div class="nav-label">Browse</div>${pageLink('newest','Newest',iconMap.newest,active==='newest')}${pageLink('all','All goods',iconMap.all,active==='all')}</div>`;
  const categoryLinks=`<div class="nav-group"><div class="nav-label">Shop by</div>${categories.map(category=>pageLink('category:'+category,category,iconMap[category]||'○',active==='category:'+category)).join('')}</div>`;
  const customLinks=state.pages.length?`<div class="nav-group"><div class="nav-label">The shop</div>${state.pages.map(customPage=>pageLink('custom:'+customPage.id,customPage.title,iconMap.page,active==='custom:'+customPage.id)).join('')}</div>`:'';
  const fixedLinks=`<div class="side-bottom">${pageLink('settings','Settings','⚙',active==='settings')}${isSellerUser()?pageLink('seller','Seller app','▣',active==='seller'):''}${state.user?.role==='admin'?pageLink('admin','Admin panel',iconMap.admin,active==='admin'):''}${pageLink('account','My account',iconMap.account,active==='account')}<div class="side-note"><strong>A little more local.</strong><p>Good things, picked with care. Ready for pickup when you are.</p></div></div>`;
  return `<div class="sidebar-scroll">${browse}${categoryLinks}${customLinks}</div>${fixedLinks}`;
};
productCard=function(product){
  const rating=product.reviews||[];
  const average=rating.length?rating.reduce((sum,review)=>sum+Number(review.stars||0),0)/rating.length:0;
  return `<article class="product-card"><div class="product-image-wrap"><button class="product-image-open" data-open-product="${esc(product.id)}" aria-label="View ${esc(product.name)} details"><img class="product-image" src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=800&q=80'"></button><span class="tag ${product.tag?'':'hidden'}">${esc(product.tag)}</span><button class="quick-add" data-add="${esc(product.id)}" aria-label="Add ${esc(product.name)} to bag">+</button></div><div class="product-info"><span class="product-category">${esc(product.category)}</span><button class="product-open" data-open-product="${esc(product.id)}"><h3>${esc(product.name)}</h3></button>${rating.length?`<div class="product-rating"><span class="seller-stars">${'★'.repeat(Math.round(average))}${'☆'.repeat(5-Math.round(average))}</span><span>${average.toFixed(1)} (${rating.length})</span></div>`:`<button class="text-link" data-open-product="${esc(product.id)}">Be the first to review</button>`}<span class="product-price">${money(product.price)}</span></div></article>`;
};
function productDetail(productId){
  const product=state.products.find(item=>item.id===productId);
  if(!product)return;
  const reviews=product.reviews||[];
  const average=reviews.length?reviews.reduce((sum,review)=>sum+Number(review.stars||0),0)/reviews.length:0;
  const userReview=state.user?.role==='customer'?reviews.find(review=>review.email===state.user.email):null;
  const reviewList=reviews.slice().reverse().map(review=>`<article class="product-review"><div class="product-review-head"><strong>${esc(review.name||'Customer')}</strong><span class="seller-stars">${'★'.repeat(Number(review.stars))}${'☆'.repeat(5-Number(review.stars))}</span></div><time>${new Date(review.date).toLocaleDateString()}</time><p>${esc(review.note||'No written review.')}</p></article>`).join('');
  const verifiedPurchase=state.user?.role==='customer'&&state.orders.some(order=>order.email===state.user.email&&sellerDeliveryStatus(order)==='Delivered'&&(order.items||[]).some(item=>item.name===product.name));
  const reviewForm=verifiedPurchase?`<form class="product-review-form" data-product-review="${esc(product.id)}"><div class="field"><label for="productReviewStars">Your rating</label><select id="productReviewStars" name="stars" required><option value="">Choose stars</option>${[1,2,3,4,5].map(star=>`<option value="${star}" ${Number(userReview?.stars)===star?'selected':''}>${star} star${star===1?'':'s'}</option>`).join('')}</select></div><div class="field"><label for="productReviewNote">Your review</label><textarea id="productReviewNote" name="note" maxlength="700" placeholder="Share your experience with this product">${esc(userReview?.note||'')}</textarea></div><button class="primary-btn" type="submit">${userReview?'Update review':'Post review'}</button><small class="image-import-help">Verified purchase</small></form>`:state.user?.role==='customer'?'<p class="product-review-empty">Complete a delivery for this product to leave a verified review.</p>':'<p class="product-review-empty"><button class="text-link" data-auth>Sign in</button> and complete a delivery to leave a verified review.</p>';
  el('productModal').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><div><p class="eyebrow">${esc(product.category)}</p><h2 class="serif">${esc(product.name)}</h2></div><button class="close-btn" data-close-product aria-label="Close product details">×</button></div><img class="product-detail-image" src="${esc(product.image)}" alt="${esc(product.name)}"><div class="product-detail-meta"><strong>${money(product.price)}</strong><span class="seller-stars">${reviews.length?'★'.repeat(Math.round(average))+'☆'.repeat(5-Math.round(average)):'☆☆☆☆☆'}</span><span>${reviews.length?`${average.toFixed(1)} · ${reviews.length} review${reviews.length===1?'':'s'}`:'No reviews yet'}</span></div><p class="product-detail-description">${esc(product.description)}</p><button class="primary-btn" data-detail-add="${esc(product.id)}">Add to bag</button><div class="section-row"><div><h2 class="serif">Customer reviews</h2><p>Ratings and notes from customers.</p></div></div>${reviewForm}<div class="product-review-list">${reviewList||'<p class="product-review-empty">No reviews yet. Your experience can help the next customer.</p>'}</div>`;
  el('productBackdrop').classList.add('open');
  el('productModal').querySelector('[data-close-product]').addEventListener('click',closeProduct);
  el('productModal').querySelector('[data-detail-add]').addEventListener('click',()=>{addCart(product.id);closeProduct()});
  el('productModal').querySelector('[data-auth]')?.addEventListener('click',()=>{closeProduct();showAuth()});
  el('productModal').querySelector('[data-product-review]')?.addEventListener('submit',event=>{
    event.preventDefault();
    const hasDeliveredPurchase=state.user?.role==='customer'&&state.orders.some(order=>order.email===state.user.email&&sellerDeliveryStatus(order)==='Delivered'&&(order.items||[]).some(item=>item.name===product.name));
    if(!hasDeliveredPurchase){toast('A delivered order is required to post a verified review.');return}
    const data=Object.fromEntries(new FormData(event.currentTarget));
    product.reviews=product.reviews||[];
    const review={email:state.user.email,name:state.user.name.split(' ')[0],stars:Number(data.stars),note:data.note.trim(),date:new Date().toISOString()};
    const existingIndex=product.reviews.findIndex(existing=>existing.email===state.user.email);
    if(existingIndex<0)product.reviews.push(review);else product.reviews[existingIndex]=review;
    save();renderPage();productDetail(product.id);toast('Product review saved.');
  });
}
function sellerDeliveryStatus(order){return order.deliveryStatus||(order.status==='Canceled'?'Canceled':order.status==='Delivered'?'Delivered':'Pending')}
function sellerPaymentStatus(order){return order.paymentStatus||(order.paid?'Paid':'Unpaid')}
function sellerDateValue(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function sellerDateLabel(value){
  if(!value)return 'Time not scheduled';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'Time not scheduled':date.toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
}
function sellerOrderCard(order){
  const delivery=sellerDeliveryStatus(order);
  const payment=sellerPaymentStatus(order);
  const items=(order.items||[]).map(item=>`${item.qty} × ${esc(item.name)}`).join(' · ')||'Order details not recorded';
  const review=order.sellerReview||{};
  return `<article class="seller-order" data-seller-order="${esc(order.id)}"><div class="seller-order-head"><div><h3>Order ${esc(order.id)}</h3><p>${esc(order.name||'Customer')} · ${esc(order.email||'No email')}</p><p class="seller-order-meta">${esc(items)} · ${money(order.total)}</p><p class="seller-order-meta">Scheduled: ${esc(sellerDateLabel(order.scheduledAt))}</p></div><div class="seller-badges"><span class="seller-badge ${delivery==='Canceled'?'is-canceled':''}">${esc(delivery)}</span><span class="seller-badge">${esc(payment)}</span></div></div><div class="seller-order-actions"><button class="small-btn" data-seller-delivery="${esc(order.id)}" ${delivery==='Canceled'?'disabled':''}>${delivery==='Canceled'?'Order canceled':delivery==='Delivered'?'Undo delivery':'Confirm delivered'}</button><button class="small-btn" data-seller-payment="${esc(order.id)}" ${delivery==='Canceled'?'disabled':''}>${payment==='Paid'?'Mark unpaid':'Mark paid'}</button><button class="small-btn danger" data-seller-cancel="${esc(order.id)}" ${delivery==='Canceled'?'disabled':''}>Cancel order</button></div><details><summary>Edit order details</summary><form class="form-grid" data-seller-edit="${esc(order.id)}"><div class="field"><label>Customer name</label><input name="name" value="${esc(order.name||'')}" required></div><div class="field"><label>Customer email</label><input name="email" type="email" value="${esc(order.email||'')}" required></div><div class="field"><label>Delivery date and time</label><input name="scheduledAt" type="datetime-local" value="${sellerDateValue(order.scheduledAt)}"></div><div class="field"><label>Order total</label><input name="total" type="number" min="0" step="0.01" value="${Number(order.total)||0}" required></div><div class="field full"><button class="primary-btn" type="submit">Save order changes</button></div></form></details><div class="seller-private-note"><h4>Private customer note</h4>${review.stars?`<div class="review-summary"><span class="seller-stars">${'★'.repeat(Number(review.stars))}${'☆'.repeat(5-Number(review.stars))}</span> ${esc(review.note||'No note added')}</div>`:''}<form class="form-grid" data-seller-review="${esc(order.id)}"><div class="field"><label>Reliability rating</label><select name="stars" required><option value="">Choose stars</option>${[1,2,3,4,5].map(star=>`<option value="${star}" ${Number(review.stars)===star?'selected':''}>${star} star${star===1?'':'s'}</option>`).join('')}</select></div><div class="field"><label>Private note</label><textarea name="note" maxlength="500" placeholder="Payment, communication, or delivery details">${esc(review.note||'')}</textarea></div><div class="field full"><button class="small-btn" type="submit">Save private note</button></div></form></div></article>`;
}
function sellerPage(){
  const settings=state.sellerSettings;
  const orders=(state.orders||[]).slice().reverse();
  const pending=orders.filter(order=>sellerDeliveryStatus(order)==='Pending').length;
  const unpaid=orders.filter(order=>sellerPaymentStatus(order)!=='Paid'&&sellerDeliveryStatus(order)!=='Canceled').length;
  const filter=state.sellerFilter||'all';
  const visible=orders.filter(order=>filter==='all'||sellerDeliveryStatus(order)===filter||sellerPaymentStatus(order)===filter);
  return `<section class="seller-workspace" data-seller-theme="${esc(settings.theme)}" style="--seller-accent:${/^#[0-9a-f]{6}$/i.test(settings.color)?settings.color:'#246149'}"><header class="seller-header"><div><p class="eyebrow">Seller workspace</p><h1 class="serif">${esc(settings.themeName||'Seller app')}</h1><p>Manage delivery times, order changes, and payment confirmation.</p></div><div class="seller-theme-controls"><div class="field"><label for="sellerTheme">App theme</label><select id="sellerTheme"><option value="light" ${settings.theme==='light'?'selected':''}>Light</option><option value="dark" ${settings.theme==='dark'?'selected':''}>Dark</option><option value="color" ${settings.theme==='color'?'selected':''}>Color</option></select></div><div class="field"><label for="sellerThemeName">Theme name</label><input id="sellerThemeName" maxlength="32" value="${esc(settings.themeName)}"></div><div class="field"><label for="sellerThemeColor">Accent</label><input id="sellerThemeColor" type="color" value="${/^#[0-9a-f]{6}$/i.test(settings.color)?settings.color:'#246149'}"></div></div></header><div class="seller-metrics"><div class="seller-metric"><span>Orders</span><strong>${orders.length}</strong></div><div class="seller-metric"><span>Need delivery</span><strong>${pending}</strong></div><div class="seller-metric"><span>Unpaid</span><strong>${unpaid}</strong></div></div><form class="seller-create" id="sellerCreateOrder"><h2>Add an order</h2><div class="form-grid"><div class="field"><label for="sellerCustomerName">Customer name</label><input id="sellerCustomerName" name="name" autocomplete="name" required></div><div class="field"><label for="sellerCustomerEmail">Customer email</label><input id="sellerCustomerEmail" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="sellerProduct">Product</label><select id="sellerProduct" name="productId" required>${state.products.map(product=>`<option value="${esc(product.id)}">${esc(product.name)} · ${money(product.price)}</option>`).join('')}</select></div><div class="field"><label for="sellerQuantity">Quantity</label><input id="sellerQuantity" name="quantity" type="number" min="1" max="99" value="1" required></div><div class="field"><label for="sellerSchedule">Delivery date and time</label><input id="sellerSchedule" name="scheduledAt" type="datetime-local"></div><div class="field full"><button class="primary-btn" type="submit">Add order to list</button></div></div></form><div class="seller-section-title"><h2>Order list</h2><select id="sellerFilter" aria-label="Filter orders"><option value="all" ${filter==='all'?'selected':''}>All orders</option><option value="Pending" ${filter==='Pending'?'selected':''}>Pending delivery</option><option value="Delivered" ${filter==='Delivered'?'selected':''}>Delivered</option><option value="Canceled" ${filter==='Canceled'?'selected':''}>Canceled</option><option value="Unpaid" ${filter==='Unpaid'?'selected':''}>Unpaid</option><option value="Paid" ${filter==='Paid'?'selected':''}>Paid</option></select></div><div class="seller-order-list">${visible.map(sellerOrderCard).join('')||'<div class="seller-empty">No orders match this filter.</div>'}</div></section>`;
}
function sellerOrderItemRow(item,index){
  const saved=item?`<option value="saved:${index}" data-price="${Number(item.price)||0}" selected>Current: ${esc(item.name)} · ${money(item.price)}</option>`:'';
  return `<div class="seller-item-edit" data-edit-item-row>${item?'':`<select aria-label="Order product" data-item-product><option value="">Choose a product</option>${state.products.map(product=>`<option value="${esc(product.id)}">${esc(product.name)} · ${money(product.price)}</option>`).join('')}</select>`}${item?`<select aria-label="Order product" data-item-product>${saved}${state.products.map(product=>`<option value="${esc(product.id)}">${esc(product.name)} · ${money(product.price)}</option>`).join('')}</select>`:''}<input aria-label="Item quantity" data-item-quantity type="number" min="1" max="99" value="${item?.qty||1}"><button type="button" class="small-btn danger" data-remove-order-item>Remove</button></div>`;
}
sellerOrderCard=function(order){
  const delivery=sellerDeliveryStatus(order);
  const payment=sellerPaymentStatus(order);
  const items=(order.items||[]).map(item=>`${item.qty} × ${esc(item.name)}`).join(' · ')||'Order details not recorded';
  const review=order.sellerReview||{};
  const customerReview=order.customerReview||{};
  const itemRows=(order.items||[]).map((item,index)=>sellerOrderItemRow(item,index)).join('');
  const availableProducts=state.products.map(product=>`<option value="${esc(product.id)}">${esc(product.name)} · ${money(product.price)}</option>`).join('');
  return `<article class="seller-order" data-seller-order="${esc(order.id)}"><div class="seller-order-head"><div><h3>Order ${esc(order.id)}</h3><p>${esc(order.name||'Customer')} · ${esc(order.email||'No email')}</p><p class="seller-order-meta">${esc(items)} · ${money(order.total)}</p><p class="seller-order-meta">Scheduled: ${esc(sellerDateLabel(order.scheduledAt))}</p></div><div class="seller-badges"><span class="seller-badge ${delivery==='Canceled'?'is-canceled':''}">${esc(delivery)}</span><span class="seller-badge">${esc(payment)}</span></div></div><div class="seller-order-actions"><button class="small-btn" data-seller-delivery="${esc(order.id)}" ${delivery==='Canceled'?'disabled':''}>${delivery==='Canceled'?'Order canceled':delivery==='Delivered'?'Undo delivery':'Confirm delivered'}</button><button class="small-btn" data-seller-payment="${esc(order.id)}" ${delivery==='Canceled'?'disabled':''}>${payment==='Paid'?'Mark unpaid':'Mark paid'}</button><button class="small-btn danger" data-seller-cancel="${esc(order.id)}" ${delivery==='Canceled'?'disabled':''}>Cancel order</button></div><details><summary>Edit order details</summary><form class="form-grid" data-seller-edit="${esc(order.id)}"><div class="field"><label>Customer name</label><input name="name" value="${esc(order.name||'')}" required></div><div class="field"><label>Customer email</label><input name="email" type="email" value="${esc(order.email||'')}" required></div><div class="field"><label>Delivery date and time</label><input name="scheduledAt" type="datetime-local" value="${sellerDateValue(order.scheduledAt)}"></div><div class="field"><label>Order total</label><input name="total" type="number" min="0" step="0.01" value="${Number(order.total)||0}" required></div><div class="field full"><label>Order items</label><div data-order-items>${itemRows}</div><div class="seller-item-edit"><select aria-label="New order product" data-new-item-product><option value="">Choose a product to add</option>${availableProducts}</select><input aria-label="New item quantity" data-new-item-quantity type="number" min="1" max="99" value="1"><button type="button" class="small-btn" data-add-order-item>Add item</button></div></div><div class="field full"><button class="primary-btn" type="submit">Save order changes</button></div></form></details>${customerReview.stars?`<div class="seller-customer-feedback"><h4>Customer delivery feedback</h4><div class="review-summary"><span class="seller-stars">${'★'.repeat(Number(customerReview.stars))}${'☆'.repeat(5-Number(customerReview.stars))}</span> ${esc(customerReview.note||'No written note')}</div></div>`:''}<div class="seller-private-note"><h4>Private customer note</h4>${review.stars?`<div class="review-summary"><span class="seller-stars">${'★'.repeat(Number(review.stars))}${'☆'.repeat(5-Number(review.stars))}</span> ${esc(review.note||'No note added')}</div>`:''}<form class="form-grid" data-seller-review="${esc(order.id)}"><div class="field"><label>Reliability rating</label><select name="stars" required><option value="">Choose stars</option>${[1,2,3,4,5].map(star=>`<option value="${star}" ${Number(review.stars)===star?'selected':''}>${star} star${star===1?'':'s'}</option>`).join('')}</select></div><div class="field"><label>Private note</label><textarea name="note" maxlength="500" placeholder="Payment, communication, or delivery details">${esc(review.note||'')}</textarea></div><div class="field full"><button class="small-btn" type="submit">Save private note</button></div></form></div></article>`;
};
const sellerOrderCardBeforePaymentRules=sellerOrderCard;
sellerOrderCard=function(order){
  let markup=sellerOrderCardBeforePaymentRules(order);
  const delivery=sellerDeliveryStatus(order);
  const payment=sellerPaymentStatus(order);
  const orderId=esc(order.id);
  const deliveryAttribute=`data-seller-delivery="${orderId}"`;
  const paymentAttribute=`data-seller-payment="${orderId}"`;
  if(delivery==='Canceled'){
    markup=markup.replace(deliveryAttribute,`${deliveryAttribute} disabled`);
  }
  if(delivery==='Canceled'||delivery==='Delivered'){
    markup=markup.replace(paymentAttribute,`${paymentAttribute} disabled`);
  }
  return markup.replace('</button></div><details><summary>Edit order details</summary>',`</button><button type="button" class="small-btn danger permanent-delete" data-seller-delete-order="${orderId}">Delete permanently</button></div><details><summary>Edit order details</summary>`);
};
const sellerBaseOrderMarkup=orderMarkup;
orderMarkup=function(order){
  let markup=sellerBaseOrderMarkup(order);
  if(order.scheduledAt)markup+=`<small class="order-schedule">Delivery scheduled: ${esc(sellerDateLabel(order.scheduledAt))}</small>`;
  if(state.user?.role!=='customer'||state.user.email!==order.email||sellerDeliveryStatus(order)!=='Delivered')return markup;
  const review=order.customerReview||{};
  if(review.stars)return `${markup}<div class="review-summary"><span class="seller-stars">${'★'.repeat(Number(review.stars))}${'☆'.repeat(5-Number(review.stars))}</span> Your delivery review: ${esc(review.note||'Thanks for your feedback.')}</div><button class="small-btn" data-edit-customer-review="${esc(order.id)}">Edit review</button>`;
  return `${markup}<form class="review-form" data-customer-review="${esc(order.id)}"><div class="field"><label>Rate your delivery</label><select name="stars" required><option value="">Choose stars</option>${[1,2,3,4,5].map(star=>`<option value="${star}">${star} star${star===1?'':'s'}</option>`).join('')}</select></div><div class="field"><label>Note for the shop</label><textarea name="note" maxlength="500" placeholder="How was your delivery?" rows="2"></textarea></div><button class="small-btn" type="submit">Send review</button></form>`;
};
const sellerBaseAccountMarkup=accountPage;
accountPage=function(){
  const markup=sellerBaseAccountMarkup();
  if(state.user?.role==='seller'||state.user?.role==='admin')return markup;
  return markup.replaceAll('Your orders will show up here.','Your delivered orders will show a review form here.');
};
const sellerBaseRenderPage=renderPage;
renderPage=function(){
  if(state.activePage==='seller'&&!isSellerUser()){
    state.activePage='newest';
    save();
  }
  if(state.activePage==='seller'){
    el('mainContent').innerHTML=sellerPage();
    bindPage();
    bindSellerPage();
  }else sellerBaseRenderPage();
  applyTypography();
};
const sellerBaseShell=shell;
shell=function(){
  sellerBaseShell();
  if(!isSellerUser())return;
  const mobile=el('app').querySelector('.mobile-nav');
  if(!mobile||mobile.querySelector('[data-page="seller"]'))return;
  const button=document.createElement('button');
  button.className=`nav-link ${state.activePage==='seller'?'active':''}`;
  button.dataset.page='seller';
  button.innerHTML='<span class="nav-icon">▣</span><span class="nav-label">Seller</span>';
  button.addEventListener('click',()=>{state.activePage='seller';state.search='';save();shell();window.scrollTo(0,0)});
  mobile.append(button);
};
const sellerBasePlaceOrder=placeOrder;
const sellerBaseDrawCart=drawCart;
drawCart=function(){
  sellerBaseDrawCart();
  const placeButton=el('cartDrawer').querySelector('[data-place-order]');
  if(!placeButton)return;
  const schedule=state.checkoutSchedule||'';
  placeButton.insertAdjacentHTML('beforebegin',`<div class="checkout-schedule"><label for="checkoutSchedule">Delivery delay / time</label><select id="checkoutSchedule" required><option value="">Choose a delivery time</option><option value="1h" ${schedule==='1h'?'selected':''}>In about 1 hour</option><option value="2h" ${schedule==='2h'?'selected':''}>In about 2 hours</option><option value="4h" ${schedule==='4h'?'selected':''}>In about 4 hours</option><option value="tomorrow-am" ${schedule==='tomorrow-am'?'selected':''}>Tomorrow morning</option><option value="tomorrow-pm" ${schedule==='tomorrow-pm'?'selected':''}>Tomorrow afternoon</option><option value="custom" ${schedule==='custom'?'selected':''}>Choose a date and time</option></select><input id="checkoutCustomSchedule" type="datetime-local" aria-label="Choose a delivery date and time" ${schedule==='custom'?'':'hidden'}><p class="checkout-payment-note">Payment must be confirmed before delivery.</p></div>`);
  const select=el('checkoutSchedule');
  const custom=el('checkoutCustomSchedule');
  custom.min=sellerDateValue(new Date().toISOString());
  if(state.checkoutScheduledAt)custom.value=sellerDateValue(state.checkoutScheduledAt);
  select.addEventListener('change',()=>{
    state.checkoutSchedule=select.value;
    custom.hidden=select.value!=='custom';
    save();
  });
  custom.addEventListener('change',()=>{state.checkoutScheduledAt=custom.value?new Date(custom.value).toISOString():'';save()});
};
placeOrder=function(){
  if(state.user?.role!=='customer'){
    closeCart();
    if(!state.user){showAuth();toast('Sign in or create a customer account before placing an order.')}
    else toast('Sign out and sign in with a customer account to place an order.');
    return;
  }
  const selectedSchedule=state.checkoutSchedule;
  if(!selectedSchedule){toast('Choose a delivery time before placing your order.');return}
  let scheduledAt='';
  if(selectedSchedule==='custom'){
    const customValue=el('checkoutCustomSchedule')?.value;
    if(!customValue){toast('Choose a delivery date and time.');return}
    scheduledAt=new Date(customValue).toISOString();
    if(new Date(scheduledAt)<=new Date()){toast('Choose a future delivery time.');return}
  }else{
    const now=new Date();
    if(selectedSchedule==='1h')now.setHours(now.getHours()+1);
    if(selectedSchedule==='2h')now.setHours(now.getHours()+2);
    if(selectedSchedule==='4h')now.setHours(now.getHours()+4);
    if(selectedSchedule==='tomorrow-am'){now.setDate(now.getDate()+1);now.setHours(9,0,0,0)}
    if(selectedSchedule==='tomorrow-pm'){now.setDate(now.getDate()+1);now.setHours(14,0,0,0)}
    scheduledAt=now.toISOString();
  }
  const previousCount=state.orders.length;
  sellerBasePlaceOrder();
  if(state.orders.length>previousCount){
    const order=state.orders[state.orders.length-1];
    order.deliveryStatus='Pending';
    order.paymentStatus='Unpaid';
    order.scheduledAt=scheduledAt;
    order.paymentDueAt=scheduledAt;
    order.customerReview=null;
    order.sellerReview=null;
    state.checkoutSchedule='';
    state.checkoutScheduledAt='';
    save();
  }
};
const sellerBaseProductEditor=productEditor;
productEditor=function(id){
  sellerBaseProductEditor(id);
  const form=el('productForm');
  const imageField=form?.querySelector('input[name="image"]')?.closest('.field');
  if(!form||!imageField)return;
  const imageInput=form.querySelector('input[name="image"]');
  imageInput.type='text';
  imageInput.placeholder='https://... or import an image below';
  imageField.querySelector('label').textContent='Image URL (optional if importing)';
  imageField.insertAdjacentHTML('afterend','<div class="field full"><label for="productImageFile">Import product image</label><input id="productImageFile" type="file" accept="image/png,image/jpeg,image/webp"><span class="image-import-help">PNG, JPG, or WebP. Images are resized and stored in this browser.</span><img id="productImagePreview" class="image-import-preview" alt="Product image preview"></div>');
  const fileInput=el('productImageFile');
  const preview=el('productImagePreview');
  preview.hidden=!imageInput.value;
  if(imageInput.value)preview.src=imageInput.value;
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){toast('Choose a PNG, JPG, or WebP image under 15 MB.');fileInput.value='';return}
    try{
      const bitmap=await createImageBitmap(file);
      const factor=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*factor));
      canvas.height=Math.max(1,Math.round(bitmap.height*factor));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      bitmap.close();
      const imageData=canvas.toDataURL('image/webp',.8);
      imageInput.value=imageData;
      preview.src=imageData;
      preview.hidden=false;
    }catch{toast('That image could not be imported. Try another PNG or JPG.')}
  });
};
function bindSellerPage(){
  const workspace=document.querySelector('.seller-workspace');
  if(!workspace)return;
  const updateSellerTheme=()=>{
    const theme=el('sellerTheme').value;
    const name=el('sellerThemeName').value.trim()||'Seller app';
    const color=el('sellerThemeColor').value;
    state.sellerSettings={theme,themeName:name,color};
    workspace.dataset.sellerTheme=theme;
    workspace.style.setProperty('--seller-accent',color);
    workspace.querySelector('.seller-header h1').textContent=name;
    save();
  };
  ['sellerTheme','sellerThemeName','sellerThemeColor'].forEach(id=>el(id).addEventListener('change',updateSellerTheme));
  el('sellerFilter').addEventListener('change',event=>{state.sellerFilter=event.target.value;renderPage()});
  el('sellerCreateOrder').addEventListener('submit',event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(event.currentTarget));
    const product=state.products.find(item=>item.id===data.productId);
    const quantity=Number(data.quantity);
    if(!product||!Number.isInteger(quantity)||quantity<1)return;
    const order={id:'GG-'+Date.now().toString().slice(-6),email:data.email.trim().toLowerCase(),name:data.name.trim(),items:[{name:product.name,price:Number(product.price),qty:quantity}],total:Number(product.price)*quantity,status:'Awaiting confirmation',deliveryStatus:'Pending',paymentStatus:'Unpaid',scheduledAt:data.scheduledAt?new Date(data.scheduledAt).toISOString():'',date:new Date().toISOString(),customerReview:null,sellerReview:null};
    state.orders.push(order);
    save();
    shell();
    toast('Order added to the seller list.');
  });
  workspace.querySelectorAll('[data-seller-edit]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const order=state.orders.find(item=>item.id===form.dataset.sellerEdit);
    if(!order)return;
    const data=Object.fromEntries(new FormData(form));
    order.name=data.name.trim();
    order.email=data.email.trim().toLowerCase();
    order.total=Number(data.total);
    order.scheduledAt=data.scheduledAt?new Date(data.scheduledAt).toISOString():'';
    save();
    renderPage();
    toast('Order changes saved.');
  }));
  workspace.querySelectorAll('[data-seller-delivery]').forEach(button=>button.addEventListener('click',()=>{
    const order=state.orders.find(item=>item.id===button.dataset.sellerDelivery);
    if(!order||sellerDeliveryStatus(order)==='Canceled')return;
    if(sellerDeliveryStatus(order)!=='Delivered'&&sellerPaymentStatus(order)!=='Paid'){
      toast('Mark the payment as paid before confirming delivery.');
      return;
    }
    order.deliveryStatus=sellerDeliveryStatus(order)==='Delivered'?'Pending':'Delivered';
    order.status=order.deliveryStatus==='Delivered'?'Delivered':'Awaiting confirmation';
    order.deliveredAt=order.deliveryStatus==='Delivered'?new Date().toISOString():'';
    save();renderPage();toast(order.deliveryStatus==='Delivered'?'Delivery confirmed.':'Delivery confirmation undone.');
  }));
  workspace.querySelectorAll('[data-seller-payment]').forEach(button=>button.addEventListener('click',()=>{
    const order=state.orders.find(item=>item.id===button.dataset.sellerPayment);
    if(!order||sellerDeliveryStatus(order)==='Canceled')return;
    if(sellerDeliveryStatus(order)==='Delivered'){
      toast('Payment cannot be changed after delivery.');
      return;
    }
    order.paymentStatus=sellerPaymentStatus(order)==='Paid'?'Unpaid':'Paid';
    save();renderPage();toast(order.paymentStatus==='Paid'?'Payment marked as received.':'Payment marked unpaid.');
  }));
  workspace.querySelectorAll('[data-seller-cancel]').forEach(button=>button.addEventListener('click',()=>{
    const order=state.orders.find(item=>item.id===button.dataset.sellerCancel);
    if(!order||!confirm(`Cancel order ${order.id}?`))return;
    order.deliveryStatus='Canceled';order.status='Canceled';order.canceledAt=new Date().toISOString();
    save();renderPage();toast('Order canceled.');
  }));
  workspace.querySelectorAll('[data-seller-delete-order]').forEach(button=>button.addEventListener('click',()=>{
    const order=state.orders.find(item=>item.id===button.dataset.sellerDeleteOrder);
    const confirmation=state.preferences?.locale==='fr'?`Supprimer définitivement la commande ${order.id} ? Cette action est irréversible.`:`Delete order ${order.id} permanently? This cannot be undone.`;
    if(!order||!confirm(confirmation))return;
    state.orders=state.orders.filter(item=>item.id!==order.id);
    save();renderPage();toast('Order permanently deleted.');
  }));
  workspace.querySelectorAll('[data-seller-review]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const order=state.orders.find(item=>item.id===form.dataset.sellerReview);
    if(!order)return;
    const data=Object.fromEntries(new FormData(form));
    order.sellerReview={stars:Number(data.stars),note:data.note.trim(),date:new Date().toISOString()};
    save();renderPage();toast('Private customer note saved.');
  }));
}
function sellerEditedItems(form,order){
  return [...form.querySelectorAll('[data-edit-item-row]')].map(row=>{
    const select=row.querySelector('[data-item-product]');
    const quantity=Number(row.querySelector('[data-item-quantity]').value);
    if(!Number.isInteger(quantity)||quantity<1)return null;
    if(select.value.startsWith('saved:')){
      const item=order.items[Number(select.value.slice(6))];
      return item?{name:item.name,price:Number(item.price)||0,qty:quantity}:null;
    }
    const product=state.products.find(item=>item.id===select.value);
    return product?{name:product.name,price:Number(product.price),qty:quantity}:null;
  }).filter(Boolean);
}
function updateSellerEditedTotal(form){
  const rows=[...form.querySelectorAll('[data-edit-item-row]')];
  if(rows.some(row=>!row.querySelector('[data-item-product]').value))return;
  const amount=rows.reduce((total,row)=>{
    const productSelect=row.querySelector('[data-item-product]');
    const savedPrice=productSelect.selectedOptions[0]?.dataset.price;
    const product=state.products.find(item=>item.id===productSelect.value);
    const price=product?Number(product.price):Number(savedPrice)||0;
    return total+price*Number(row.querySelector('[data-item-quantity]').value||0);
  },0);
  form.querySelector('[name="total"]').value=amount.toFixed(2);
}
const sellerOriginalBindSellerPage=bindSellerPage;
bindSellerPage=function(){
  sellerOriginalBindSellerPage();
  const workspace=document.querySelector('.seller-workspace');
  if(!workspace)return;
  workspace.querySelectorAll('[data-seller-edit]').forEach(form=>{
    form.addEventListener('submit',()=>{
      if(form.dataset.itemsChanged!=='true')return;
      const order=state.orders.find(item=>item.id===form.dataset.sellerEdit);
      if(!order)return;
      order.items=sellerEditedItems(form,order);
      form.querySelector('[name="total"]').value=order.items.reduce((total,item)=>total+item.price*item.qty,0).toFixed(2);
    },true);
    form.addEventListener('input',event=>{
      if(event.target.matches('[data-item-quantity]')){
        form.dataset.itemsChanged='true';
        updateSellerEditedTotal(form);
      }
    });
    form.addEventListener('change',event=>{
      if(event.target.matches('[data-item-product]')){
        form.dataset.itemsChanged='true';
        updateSellerEditedTotal(form);
      }
    });
    form.querySelectorAll('[data-remove-order-item]').forEach(button=>button.addEventListener('click',()=>{
      button.closest('[data-edit-item-row]').remove();
      form.dataset.itemsChanged='true';
      updateSellerEditedTotal(form);
    }));
    form.querySelector('[data-add-order-item]').addEventListener('click',()=>{
      const addSelect=form.querySelector('[data-new-item-product]');
      const product=state.products.find(item=>item.id===addSelect.value);
      const quantity=Number(form.querySelector('[data-new-item-quantity]').value);
      if(!product||!Number.isInteger(quantity)||quantity<1){toast('Choose a product and valid quantity first.');return}
      const container=form.querySelector('[data-order-items]');
      container.insertAdjacentHTML('beforeend',sellerOrderItemRow(null,-1));
      form.dataset.itemsChanged='true';
      addSelect.value='';
      form.querySelector('[data-new-item-quantity]').value='1';
      updateSellerEditedTotal(form);
      const row=container.lastElementChild;
      row.querySelector('[data-item-product]').value=product.id;
      row.querySelector('[data-item-quantity]').value=quantity;
      updateSellerEditedTotal(form);
      row.querySelector('[data-remove-order-item]').addEventListener('click',()=>{
        row.remove();form.dataset.itemsChanged='true';updateSellerEditedTotal(form);
      });
    });
  });
};
const sellerBaseBindPage=bindPage;
bindPage=function(){
  sellerBaseBindPage();
  document.querySelectorAll('[data-open-product]').forEach(node=>{
    node.addEventListener('click',event=>{
      if(event.target.closest('[data-add]'))return;
      productDetail(node.dataset.openProduct);
    });
  });
  document.querySelectorAll('[data-customer-review]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const order=state.orders.find(item=>item.id===form.dataset.customerReview);
    if(!order||order.email!==state.user?.email||sellerDeliveryStatus(order)!=='Delivered')return;
    const data=Object.fromEntries(new FormData(form));
    order.customerReview={stars:Number(data.stars),note:data.note.trim(),date:new Date().toISOString()};
    save();renderPage();toast('Thanks for rating your delivery.');
  }));
  document.querySelectorAll('[data-edit-customer-review]').forEach(button=>button.addEventListener('click',()=>{
    const order=state.orders.find(item=>item.id===button.dataset.editCustomerReview);
    if(!order||order.email!==state.user?.email)return;
    order.customerReview=null;save();renderPage();
  }));
};
const vapOriginBaseShell=shell;
shell=function(){
  vapOriginBaseShell();
  const wordmark=document.querySelector('.wordmark');
  if(!wordmark)return;
  wordmark.innerHTML=`<span id="brandName">${esc(state.store.name)}</span>`;
};
shell();

const SHOP_OWNER_EMAIL='';
const roleBootstrapAuth=authSubmit;
function isShopOwner(user=state.user){return user?.role==='admin'&&(user.owner===true||user.email?.toLowerCase()===SHOP_OWNER_EMAIL)}
function canManageShop(){return state.user?.role==='admin'}
authSubmit=function(event){
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget));
  const email=data.email.trim().toLowerCase();
  if(email!==SHOP_OWNER_EMAIL)return roleBootstrapAuth(event);
  if(authMode==='signup'){
    if(state.users.some(user=>user.email===email)){toast('An account already uses this email. Sign in to claim the owner account.');return}
    const owner={name:'Noah',email,password:data.password,role:'admin',owner:true};
    state.users.push(owner);
    state.user={name:owner.name,email,role:'admin',owner:true};
    state.activePage='admin';
    closeAuth();save();shell();toast('Owner account created for Noah.');return;
  }
  const account=state.users.find(user=>user.email===email&&user.password===data.password);
  if(!account){toast('Email or password is not correct.');return}
  account.name='Noah';account.role='admin';account.owner=true;
  state.user={name:'Noah',email,role:'admin',owner:true};
  state.activePage='admin';closeAuth();save();shell();toast('Welcome, Noah. You are the shop owner.');
};
const ownerAdminPage=adminPage;
function ownerTabsMarkup(markup){
  const tabs=markup.indexOf('<div class="admin-tabs">');
  if(tabs<0)return markup;
  const end=markup.indexOf('</div>',tabs)+6;
  const ownerTab=isShopOwner()?'<button class="admin-tab" data-admin-tab="accounts">Accounts</button>':'';
  const extra='<button class="admin-tab" data-admin-tab="categories">Categories</button>'+ownerTab;
  const prefix=markup.slice(0,end);
  const closing=prefix.lastIndexOf('</div>');
  return prefix.slice(0,closing)+extra+prefix.slice(closing)+markup.slice(end);
}
function ownerAccountsPanel(){
  const users=(state.users||[]).slice();
  if(isShopOwner()&&!users.some(user=>user.email?.toLowerCase()===state.user.email.toLowerCase()))users.unshift({...state.user});
  const rows=users.map(user=>{
    const isOwner=isShopOwner(user);
    const roleLabel=isOwner?'Owner':user.role==='admin'?'Admin':user.role==='seller'?'Seller':'Customer';
    const roleControl=isOwner?'<span class="account-owner">Owner</span>':`<select class="account-role" data-account-role="${esc(user.email)}" aria-label="Role for ${esc(user.email)}"><option value="customer" ${user.role==='customer'?'selected':''}>Customer</option><option value="seller" ${user.role==='seller'?'selected':''}>Seller</option><option value="admin" ${user.role==='admin'?'selected':''}>Admin</option></select>`;
    return `<div class="admin-item account-row" data-account-row data-search="${esc(`${user.name} ${user.email} ${roleLabel}`.toLowerCase())}"><div class="account-avatar">${esc((user.name||'?').slice(0,1).toUpperCase())}</div><div><strong>${esc(user.name)}</strong><small>${esc(user.email)} · ${roleLabel}</small></div><div class="item-actions">${roleControl}${isOwner?'':`<button class="small-btn danger" data-delete-account="${esc(user.email)}">Delete</button>`}</div></div>`;
  }).join('');
  return `<div class="owner-warning">Demo mode: this account manager is stored in this browser and does not verify email addresses. Before publishing for real users, connect secure authentication and shared storage.</div><div class="panel"><h2>Create a staff account</h2><form id="createStaffAccount" class="form-grid"><div class="field"><label for="staffName">Name</label><input id="staffName" name="name" required></div><div class="field"><label for="staffEmail">Email</label><input id="staffEmail" name="email" type="email" required></div><div class="field"><label for="staffPassword">Temporary password</label><input id="staffPassword" name="password" type="password" minlength="8" required></div><div class="field"><label for="staffRole">Role</label><select id="staffRole" name="role"><option value="seller">Seller</option><option value="admin">Admin</option></select></div><div class="field full"><button class="primary-btn" type="submit">Create account</button></div></form></div><div class="panel"><div class="section-row" style="margin:0 0 16px"><div><h2>Existing accounts</h2><p>${users.length} accounts</p></div></div><label class="search-wrap account-search"><span class="search-symbol">⌕</span><input id="accountSearch" type="search" placeholder="Search name, email, or role" aria-label="Search accounts"></label><div class="admin-list" id="accountList">${rows||'<p class="empty-state">No accounts yet.</p>'}</div></div>`;
}
function ownerCategoriesPanel(){
  const categories=[...new Set(state.products.map(product=>product.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  return `<div class="panel"><h2>Manage product categories</h2><p class="owner-warning">Deleting a category permanently removes every product in that category from the shop and removes those products from active carts. Past orders remain in order history.</p><div class="category-admin-list">${categories.map(category=>{const count=state.products.filter(product=>product.category===category).length;return `<div class="category-admin-row"><div><strong>${esc(category)}</strong><small>${count} product${count===1?'':'s'}</small></div><button class="small-btn danger" data-delete-category="${esc(category)}">Delete category</button></div>`}).join('')||'<p class="empty-state">No categories to manage.</p>'}</div></div>`;
}
adminPage=function(){
  const markup=ownerTabsMarkup(ownerAdminPage());
  if(state.adminTab==='accounts'&&isShopOwner()){
    const tabEnd=markup.indexOf('</div>',markup.indexOf('class="admin-tabs"'))+6;
    return markup.slice(0,tabEnd)+ownerAccountsPanel();
  }
  if(state.adminTab==='categories'&&canManageShop()){
    const tabEnd=markup.indexOf('</div>',markup.indexOf('class="admin-tabs"'))+6;
    return markup.slice(0,tabEnd)+ownerCategoriesPanel();
  }
  return markup;
};
const ownerBaseBindPage=bindPage;
bindPage=function(){
  ownerBaseBindPage();
  if(!isShopOwner())return;
  const search=document.getElementById('accountSearch');
  if(search)search.addEventListener('input',()=>{
    const query=search.value.trim().toLowerCase();
    document.querySelectorAll('[data-account-row]').forEach(row=>row.hidden=!row.dataset.search.includes(query));
  });
  const createForm=document.getElementById('createStaffAccount');
  if(createForm)createForm.addEventListener('submit',event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(createForm));
    const email=values.email.trim().toLowerCase();
    if(email===SHOP_OWNER_EMAIL){toast('The owner account is reserved for Noah.');return}
    if(state.users.some(user=>user.email===email)){toast('An account already uses this email.');return}
    if(String(values.password).length<8){toast('Use a password with at least 8 characters.');return}
    state.users.push({name:values.name.trim(),email,password:values.password,role:values.role==='admin'?'admin':'seller'});
    save();renderPage();toast('Staff account created.');
  });
  document.querySelectorAll('[data-account-role]').forEach(select=>select.addEventListener('change',()=>{
    const user=state.users.find(account=>account.email===select.dataset.accountRole);
    if(!user||isShopOwner(user))return;
    user.role=select.value;
    save();renderPage();toast('Account role updated.');
  }));
  document.querySelectorAll('[data-delete-account]').forEach(button=>button.addEventListener('click',()=>{
    const email=button.dataset.deleteAccount;
    const user=state.users.find(account=>account.email===email);
    if(!user||isShopOwner(user)||!confirm(`Delete the account for ${user.name}? Past orders will be kept.`))return;
    state.users=state.users.filter(account=>account.email!==email);
    if(state.user?.email===email)state.user=null;
    save();renderPage();toast('Account deleted.');
  }));
  document.querySelectorAll('[data-delete-category]').forEach(button=>button.addEventListener('click',()=>{
    if(!canManageShop())return;
    const category=button.dataset.deleteCategory;
    const productIds=state.products.filter(product=>product.category===category).map(product=>product.id);
    const confirmation=state.preferences?.locale==='fr'?`Supprimer la catégorie « ${category} » et ${productIds.length===1?'son produit':'ses '+productIds.length+' produits'} ? Les commandes passées seront conservées.`:`Delete category "${category}" and its ${productIds.length} product(s)? Past orders will stay in order history.`;
    if(!confirm(confirmation))return;
    state.products=state.products.filter(product=>product.category!==category);
    state.cart=state.cart.filter(item=>!productIds.includes(item.id));
    if(state.activePage==='category:'+category)state.activePage='all';
    save();shell();toast('Category and its products deleted.');
  }));
};
function markExistingOwner(){
  const user=state.users.find(account=>account.email?.toLowerCase()===SHOP_OWNER_EMAIL);
  if(user){user.name='Noah';user.role='admin';user.owner=true}
  if(state.user?.email?.toLowerCase()===SHOP_OWNER_EMAIL){state.user.name='Noah';state.user.role='admin';state.user.owner=true}
}
markExistingOwner();
save();
shell();
const ownerRecoveryBaseRenderAuth=renderAuth;
renderAuth=function(){
  ownerRecoveryBaseRenderAuth();
  const ownerExists=state.users.some(user=>user.email?.toLowerCase()===SHOP_OWNER_EMAIL);
  const demoNote=el('authModal').querySelector('.demo-note');
  if(authMode!=='login'||ownerExists||!demoNote)return;
  demoNote.insertAdjacentHTML('beforeend','<br><button type="button" class="text-link" data-owner-recovery>Restore owner account</button>');
  demoNote.querySelector('[data-owner-recovery]').addEventListener('click',()=>{
    authMode='signup';
    renderAuth();
    el('authName').value='Noah';
    el('authEmail').value=SHOP_OWNER_EMAIL;
    el('authPassword').focus();
  });
};