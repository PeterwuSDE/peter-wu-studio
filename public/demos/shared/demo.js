import { products, days, times, filterProducts, addToCart, setQuantity, cartTotal, createBooking, moveBooking, cancelBooking, validateInquiry, availableTime } from "./model.mjs";
const $ = selector => document.querySelector(selector);
const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const announce = (selector, message) => { $(selector).textContent = message; };
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
const art = (p, color = "Chalk") => '<div class="object-art object-' + p.shape + (color === "Clay" ? ' color-clay' : '') + '" aria-hidden="true"><i></i></div>';
if (document.body.dataset.demo === "inquiry") {
  const form = $("#inquiry-form");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    announce("#inquiry-status", validateInquiry(data) || "Sample request created: " + data.service + " · " + data.area + " area · " + data.timing + ". Nothing was sent. A real site would pass this request to your team.");
  });
  form.addEventListener("reset", () => announce("#inquiry-status", ""));
  document.querySelectorAll("[data-service]").forEach(link => link.addEventListener("click", () => { form.elements.service.value = link.dataset.service; }));
}
if (document.body.dataset.demo === "store") {
  let cart = [], category = "All";
  const renderProducts = () => {
    const list = filterProducts(category, $("#product-search").value);
    $("#product-grid").innerHTML = list.map(p => '<article class="product-card"><button type="button" class="product-open" data-product="' + p.id + '" aria-label="View ' + p.name + '">' + art(p) + '<span class="product-info"><strong>' + p.name + '</strong><span>' + money(p.price) + '</span></span><span class="product-category">' + p.category + ' · 2 colors</span></button></article>').join("") || '<p class="empty-state">No objects match that search. Try another name or category.</p>';
    announce("#product-count", list.length + (list.length === 1 ? " object" : " objects"));
  };
  const renderBag = () => {
    $("#bag-count").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    $("#bag-lines").innerHTML = cart.map(item => {
      const p = products.find(p => p.id === item.id);
      return '<article class="bag-line">' + art(p, item.color) + '<div><h3>' + p.name + '</h3><p>' + item.color + ' · ' + money(p.price) + '</p><div class="quantity-control"><button type="button" data-action="decrease" data-cart-key="' + item.key + '" aria-label="Decrease ' + p.name + ' in ' + item.color + '">−</button><span aria-label="Quantity">' + item.quantity + '</span><button type="button" data-action="increase" data-cart-key="' + item.key + '" aria-label="Increase ' + p.name + ' in ' + item.color + '">+</button><button type="button" class="remove-item" data-action="remove" data-cart-key="' + item.key + '">Remove</button></div></div></article>';
    }).join("") || '<p class="empty-state">Your bag is empty. Choose an object to get started.</p>';
    $("#bag-total").textContent = money(cartTotal(cart));
    $("#demo-checkout").disabled = !cart.length;
  };
  const openBag = () => { if ($("#product-dialog").open) $("#product-dialog").close(); renderBag(); announce("#checkout-status", ""); $("#bag-dialog").showModal(); };
  $("#product-grid").addEventListener("click", event => {
    const button = event.target.closest("[data-product]");
    if (!button) return;
    const p = products.find(p => p.id === button.dataset.product);
    $("#product-detail").innerHTML = art(p) + '<p class="kicker">' + p.category + '</p><h2 id="product-name">' + p.name + '</h2><p class="detail-price">' + money(p.price) + '</p><p>' + p.description + '</p><form id="add-form"><label for="product-color">Color</label><select id="product-color" name="color">' + p.colors.map(c => '<option>' + c + '</option>').join("") + '</select><p class="small-note">Sample product · Up to ' + p.stock + ' per color.</p><button type="submit" class="demo-button">Add to bag →</button></form><p id="add-status" class="feedback" role="status"></p><button type="button" class="quiet-button" id="detail-bag">View your bag →</button>';
    $("#add-form").addEventListener("submit", event => {
      event.preventDefault();
      try {
        cart = addToCart(cart, p.id, $("#product-color").value); renderBag();
        announce("#add-status", p.name + " added to your bag."); announce("#store-status", p.name + " added to your bag.");
      } catch (error) { announce("#add-status", error.message); }
    });
    $("#product-color").addEventListener("change", () => {
      $("#product-detail > .object-art").classList.toggle("color-clay", $("#product-color").value === "Clay"); announce("#add-status", "");
    });
    $("#detail-bag").addEventListener("click", openBag);
    $("#product-dialog").showModal();
  });
  document.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => {
    category = button.dataset.category;
    document.querySelectorAll("[data-category]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    renderProducts();
  }));
  $("#product-search").addEventListener("input", renderProducts);
  $("#open-bag").addEventListener("click", openBag);
  $("#bag-lines").addEventListener("click", event => {
    const button = event.target.closest("[data-cart-key]");
    if (!button) return;
    try {
      const item = cart.find(item => item.key === button.dataset.cartKey);
      const qty = button.dataset.action === "remove" ? 0 : item.quantity + (button.dataset.action === "increase" ? 1 : -1);
      cart = setQuantity(cart, item.key, qty); renderBag(); announce("#checkout-status", qty ? "Bag updated." : "Item removed.");
      const next = [...document.querySelectorAll("[data-cart-key]")].find(b => b.dataset.cartKey === item.key && b.dataset.action === button.dataset.action);
      (next || ($("#demo-checkout").disabled ? $("#bag-dialog [data-close]") : $("#demo-checkout"))).focus();
    } catch (error) { announce("#checkout-status", error.message); }
  });
  $("#demo-checkout").addEventListener("click", () => announce("#checkout-status", "Demo checkout complete. No payment was taken and no order was placed. Your sample bag is still here to explore."));
  renderProducts(); renderBag();
}
if (document.body.dataset.demo === "bookings") {
  const initial = () => [{ id: "booking-1", service: "Site visit", day: "Monday", time: "10:30" }, { id: "booking-2", service: "Project review", day: "Wednesday", time: "09:00" }];
  let bookings = initial(), pickedTime = "", movingId = "";
  const renderSlots = () => {
    const day = $("#booking-day").value;
    if (bookings.some(b => b.day === day && b.time === pickedTime)) pickedTime = "";
    $("#time-slots").innerHTML = times.map(time => {
      const busy = bookings.some(b => b.day === day && b.time === time);
      return '<label class="time-slot' + (busy ? ' unavailable' : '') + '"><input type="radio" name="time" value="' + time + '"' + (busy ? ' disabled' : ' required') + (pickedTime === time ? ' checked' : '') + '><span>' + time + '<small>' + (busy ? 'Booked' : 'Available') + '</small></span></label>';
    }).join("");
    $("#confirm-booking").disabled = times.every(time => bookings.some(b => b.day === day && b.time === time));
  };
  const renderSchedule = () => {
    $("#schedule-summary").textContent = bookings.length + " sample appointments · " + (days.length * times.length - bookings.length) + " open slots";
    $("#schedule-list").innerHTML = days.map(day => {
      const items = bookings.filter(b => b.day === day).sort((a, b) => a.time.localeCompare(b.time));
      return '<section class="schedule-day"><h3>' + day + '</h3>' + (items.map(b => '<article class="appointment"><span class="appointment-time">' + b.time + '</span><div><strong>' + b.service + '</strong><small>Sample appointment</small></div><div class="appointment-actions"><button type="button" data-move="' + b.id + '" aria-label="Reschedule ' + day + ' ' + b.time + ' ' + b.service + '">Reschedule</button><button type="button" data-cancel="' + b.id + '" aria-label="Cancel ' + day + ' ' + b.time + ' ' + b.service + '">Cancel</button></div></article>').join("") || '<p class="schedule-empty">No appointments yet.</p>') + '</section>';
    }).join("");
  };
  const updateMoveTimes = () => {
    const options = [...$("#move-time").options];
    for (const o of options) o.disabled = bookings.some(b => b.id !== movingId && b.day === $("#move-day").value && b.time === o.value);
    $("#move-time").value = availableTime(bookings, movingId, $("#move-day").value, $("#move-time").value);
    $("#reschedule-form button[type=submit]").disabled = options.every(o => o.disabled);
  };
  $("#time-slots").addEventListener("change", event => { pickedTime = event.target.value; });
  $("#booking-day").addEventListener("change", () => { pickedTime = ""; renderSlots(); announce("#booking-status", ""); });
  $("#booking-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      const data = { service: $("#booking-service").value, day: $("#booking-day").value, time: pickedTime };
      bookings = createBooking(bookings, data); announce("#booking-status", "Sample booking confirmed: " + data.day + " at " + data.time + ". Find it in the business view.");
      pickedTime = ""; renderSlots(); renderSchedule();
    } catch (error) { announce("#booking-status", error.message); }
  });
  $("#schedule-list").addEventListener("click", event => {
    const cancel = event.target.closest("[data-cancel]"), move = event.target.closest("[data-move]");
    if (cancel) { bookings = cancelBooking(bookings, cancel.dataset.cancel); renderSlots(); renderSchedule(); announce("#schedule-status", "Sample appointment cancelled. Its time is available again."); $("#reset-schedule").focus(); }
    if (move) { movingId = move.dataset.move; const b = bookings.find(b => b.id === movingId); $("#move-day").value = b.day; $("#move-time").value = b.time; updateMoveTimes(); announce("#move-status", ""); $("#reschedule-dialog").showModal(); }
  });
  $("#move-day").addEventListener("change", updateMoveTimes);
  $("#reschedule-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      bookings = moveBooking(bookings, movingId, $("#move-day").value, $("#move-time").value);
      $("#reschedule-dialog").close(); renderSlots(); renderSchedule();
      announce("#schedule-status", "Appointment moved to " + $("#move-day").value + " at " + $("#move-time").value + "."); $("#reset-schedule").focus();
    } catch (error) { announce("#move-status", error.message); }
  });
  $("#reset-schedule").addEventListener("click", () => { bookings = initial(); pickedTime = ""; $("#booking-form").reset(); renderSlots(); renderSchedule(); announce("#booking-status", ""); announce("#schedule-status", "The sample week has been reset."); });
  renderSlots(); renderSchedule();
}

