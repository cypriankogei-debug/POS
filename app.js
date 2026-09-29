/* Browser POS demo. Data is saved in this browser's localStorage. */
const TAX_RATE = 0.16;
const PRODUCT_KEY = 'northstar-pos-products-v1';
const SALES_KEY = 'northstar-pos-sales-v1';
const starterProducts = [
  { id: 'P001', name: 'Milk', price: 70, stock: 20, category: 'Groceries', icon: '🥛', color: '#f1f7f9' },
  { id: 'P002', name: 'Bread', price: 60, stock: 15, category: 'Groceries', icon: '🍞', color: '#faf3e9' },
  { id: 'P003', name: 'Sugar', price: 120, stock: 10, category: 'Groceries', icon: '🍚', color: '#f4f1ec' },
  { id: '50', name: 'Cologne', price: 300, stock: 59, category: 'Personal care', icon: '🧴', color: '#eff2f9' },
];
const money = value => `KES ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const load = (key, fallback) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
};
let products = load(PRODUCT_KEY, starterProducts.map(product => ({ ...product })));
let sales = load(SALES_KEY, []);
let cart = new Map();
let category = 'All products';
let discountRate = 0;
const $ = selector => document.querySelector(selector);
const productGrid = $('#product-grid');
const toast = $('#toast');

function persist() {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2400);
}
function getCategory(product) {
  if (product.category) return product.category;
  return /milk|bread|sugar|food|tea|coffee|rice|flour/i.test(product.name) ? 'Groceries' : 'Other';
}
function renderProducts() {
  const query = $('#product-search').value.trim().toLowerCase();
  const filtered = products.filter(product => (category === 'All products' || getCategory(product) === category)
    && (!query || `${product.name} ${product.id}`.toLowerCase().includes(query)));
  $('#all-count').textContent = products.length;
  $('#catalog-count').textContent = `Showing ${filtered.length} product${filtered.length === 1 ? '' : 's'}`;
  productGrid.innerHTML = filtered.length ? filtered.map(product => {
    const stock = Number(product.stock) || 0;
    const safeName = escapeHtml(product.name);
    return `<article class="product-card ${stock === 0 ? 'out-of-stock' : ''}" data-id="${escapeHtml(product.id)}">
      <button class="add-product" aria-label="Add ${safeName} to order" ${stock === 0 ? 'disabled' : ''}>＋</button>
      <div class="product-art" style="--art:${product.color || '#f1f5f2'}">${product.icon || '📦'}</div>
      <div class="product-id">${escapeHtml(product.id)}</div><div class="product-name" title="${safeName}">${safeName}</div>
      <div class="product-bottom"><span class="product-price">${money(product.price)}</span><span class="product-stock ${stock < 6 ? 'low' : ''}">${stock} in stock</span></div>
    </article>`;
  }).join('') : '<div class="no-products">No products match your search.</div>';
  productGrid.querySelectorAll('.product-card').forEach(card => card.addEventListener('click', () => addToCart(card.dataset.id)));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function addToCart(id) {
  const product = products.find(item => String(item.id) === String(id));
  if (!product) return;
  const current = cart.get(id)?.quantity || 0;
  if (current >= Number(product.stock)) return showToast('No more stock available for this product.');
  if (cart.has(id)) cart.get(id).quantity += 1;
  else cart.set(id, { id: product.id, name: product.name, price: Number(product.price), quantity: 1 });
  renderCart();
}
function changeQuantity(id, delta) {
  const item = cart.get(id);
  const product = products.find(entry => String(entry.id) === String(id));
  if (!item || !product) return;
  const next = item.quantity + delta;
  if (next <= 0) cart.delete(id);
  else if (next <= Number(product.stock)) item.quantity = next;
  else showToast('That quantity exceeds available stock.');
  renderCart();
}
function subtotalValue() { return [...cart.values()].reduce((total, item) => total + item.price * item.quantity, 0); }
function renderCart() {
  const items = [...cart.values()];
  $('#cart-items').innerHTML = items.length ? items.map(item => `<div class="cart-item">
    <div><div class="cart-item-name">${escapeHtml(item.name)}</div><div class="cart-item-detail">${item.quantity} × ${money(item.price)}</div>
      <div class="quantity-controls"><button data-action="minus" data-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-action="plus" data-id="${escapeHtml(item.id)}" aria-label="Increase quantity">＋</button><button class="remove-item" data-action="remove" data-id="${escapeHtml(item.id)}" aria-label="Remove item">Remove</button></div></div>
    <span class="cart-line-price">${money(item.quantity * item.price)}</span></div>`).join('') : '<div class="empty-cart"><span>＋</span><strong>Your order is empty</strong><small>Select a product to get started.</small></div>';
  $('#cart-items').querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    const { id, action } = button.dataset;
    if (action === 'remove') cart.delete(id);
    else changeQuantity(id, action === 'plus' ? 1 : -1);
    renderCart();
  }));
  const rawSubtotal = subtotalValue();
  const discount = rawSubtotal * discountRate;
  const subtotal = rawSubtotal - discount;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  $('#subtotal').textContent = money(rawSubtotal);
  $('.totals > div:first-child span').innerHTML = discount ? `Subtotal <small>(−${Math.round(discountRate * 100)}% discount)</small>` : 'Subtotal';
  $('#tax').textContent = money(tax);
  $('#total').textContent = money(total);
  $('#charge-total').innerHTML = `${money(total)} <b>→</b>`;
  $('#checkout-btn').disabled = !items.length;
}
function localDay(date = new Date()) { return new Date(date).toLocaleDateString('en-CA'); }
function renderDashboard() {
  const todaySales = sales.filter(sale => localDay(sale.date_time) === localDay());
  const amount = todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  $('#stat-sales').textContent = money(amount);
  $('#stat-transactions').textContent = String(todaySales.length);
  $('#stat-average').textContent = money(todaySales.length ? amount / todaySales.length : 0);
  $('#stat-stock').textContent = products.reduce((sum, product) => sum + Number(product.stock || 0), 0).toLocaleString();
  const date = new Date();
  $('#today-label').textContent = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  $('.page-heading .eyebrow').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const tbody = $('#transactions-body');
  const recent = [...sales].reverse().slice(0, 5);
  tbody.innerHTML = recent.length ? recent.map(sale => {
    const dateTime = new Date(sale.date_time);
    const count = sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return `<tr><td class="transaction-id">${escapeHtml(sale.transaction_id)}</td><td>Walk-in customer</td><td>${count} item${count === 1 ? '' : 's'}</td><td>${dateTime.toLocaleDateString()} · ${dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td><span class="payment-pill">Cash</span></td><td class="amount-cell">${money(sale.total)}</td><td><button class="row-more" aria-label="Transaction options">···</button></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="table-empty">Your completed sales will appear here.</td></tr>';
}
function startCheckout() {
  if (!cart.size) return;
  const total = (subtotalValue() * (1 - discountRate)) * (1 + TAX_RATE);
  $('#dialog-total').textContent = money(total);
  $('#amount-paid').value = total.toFixed(2);
  $('#amount-paid').min = total.toFixed(2);
  $('#payment-error').textContent = '';
  updateChange();
  $('#checkout-dialog').showModal();
  $('#amount-paid').focus();
}
function updateChange() {
  const paid = Number($('#amount-paid').value) || 0;
  const total = (subtotalValue() * (1 - discountRate)) * (1 + TAX_RATE);
  const change = Math.max(0, paid - total);
  $('.change-due strong').textContent = money(change);
  $('#payment-error').textContent = paid > 0 && paid < total ? `Amount is short by ${money(total - paid)}.` : '';
}
function finishSale(event) {
  event.preventDefault();
  const paid = Number($('#amount-paid').value);
  const subtotal = subtotalValue() * (1 - discountRate);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  if (!Number.isFinite(paid) || paid < total) {
    $('#payment-error').textContent = `Please enter at least ${money(total)}.`;
    return;
  }
  const now = new Date();
  const sale = {
    transaction_id: `T${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    date_time: now.toISOString(), items: [...cart.values()].map(item => ({ ...item })),
    subtotal: Number(subtotal.toFixed(2)), tax: Number(tax.toFixed(2)), total: Number(total.toFixed(2)),
    amount_paid: Number(paid.toFixed(2)), change: Number((paid - total).toFixed(2)),
  };
  sales.push(sale);
  for (const item of cart.values()) {
    const product = products.find(entry => String(entry.id) === String(item.id));
    if (product) product.stock -= item.quantity;
  }
  persist();
  cart.clear(); discountRate = 0;
  $('#checkout-dialog').close();
  renderAll();
  showToast(`Sale complete. Change: ${money(sale.change)}.`);
}
function renderAll() { renderProducts(); renderCart(); renderDashboard(); }

$('#product-search').addEventListener('input', renderProducts);
$('#category-row').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  category = button.dataset.category;
  $('#category-row').querySelectorAll('.category').forEach(tab => tab.classList.toggle('active', tab === button));
  renderProducts();
});
$('#checkout-btn').addEventListener('click', startCheckout);
$('#amount-paid').addEventListener('input', updateChange);
$('#payment-form').addEventListener('submit', finishSale);
$('#new-sale-btn').addEventListener('click', () => {
  cart.clear(); discountRate = 0; renderCart();
  document.querySelector('.catalog-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#product-search').focus();
});
$('#clear-cart').addEventListener('click', () => { cart.clear(); discountRate = 0; renderCart(); showToast('Order cleared.'); });
$('#discount-btn').addEventListener('click', () => {
  if (!cart.size) return showToast('Add a product before applying a discount.');
  const answer = window.prompt('Discount percentage (0–100):', discountRate ? String(Math.round(discountRate * 100)) : '');
  if (answer === null) return;
  const value = Number(answer);
  if (!Number.isFinite(value) || value < 0 || value > 100) return showToast('Enter a discount from 0 to 100.');
  discountRate = value / 100; renderCart();
});
$('#manage-products').addEventListener('click', () => showToast('Product management can be added here.'));
$('#filter-button').addEventListener('click', () => showToast('Choose a product category to filter the catalog.'));
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#product-search').focus(); }
  if (event.key === 'Escape' && $('#checkout-dialog').open) $('#checkout-dialog').close();
});
renderAll();
