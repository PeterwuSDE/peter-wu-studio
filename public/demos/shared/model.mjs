export const products = [
  { id: "arc-vase", name: "Arc vase", category: "Objects", price: 4800, stock: 8, shape: "vase", colors: ["Chalk", "Clay"], description: "A sculptural vase for a single stem or a small arrangement. 18 cm tall." },
  { id: "everyday-cup", name: "Everyday cup", category: "Tableware", price: 2400, stock: 8, shape: "cup", colors: ["Chalk", "Clay"], description: "A gently curved cup with a generous handle. 280 ml." },
  { id: "low-bowl", name: "Low bowl", category: "Tableware", price: 3200, stock: 8, shape: "bowl", colors: ["Chalk", "Clay"], description: "A wide, low bowl for breakfast or small meals. 16 cm wide." },
  { id: "stem-vessel", name: "Stem vessel", category: "Objects", price: 3600, stock: 8, shape: "vessel", colors: ["Chalk", "Clay"], description: "A small vessel with a narrow opening and a quiet silhouette. 12 cm tall." },
];
export const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const times = ["09:00", "10:30", "14:00", "15:30"];
export const services = ["Consultation", "Site visit", "Project review"];
export const inquiryOptions = { service: ["Painting", "Small repairs", "Seasonal maintenance"], area: ["North", "Central", "South"], timing: ["This month", "Next month", "Just planning"] };
export function filterProducts(category = "All", query = "") {
  return products.filter(p => (category === "All" || p.category === category) && p.name.toLowerCase().includes(String(query).trim().toLowerCase()));
}
function productFor(id, color) {
  const p = products.find(p => p.id === id);
  if (!p || !p.colors.includes(color)) throw new Error("Choose a product and an available color.");
  return p;
}
export function addToCart(cart, id, color) {
  const p = productFor(id, color), key = id + ":" + color, line = cart.find(item => item.key === key);
  if ((line?.quantity ?? 0) >= p.stock) throw new Error("The demo limit is " + p.stock + " per color.");
  return line ? cart.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : { ...item }) : [...cart, { key, id, color, quantity: 1 }];
}
export function setQuantity(cart, key, quantity) {
  const item = cart.find(item => item.key === key);
  if (!item) throw new Error("This item is no longer in your bag.");
  const p = productFor(item.id, item.color);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > p.stock) throw new Error("Choose a quantity from 0 to " + p.stock + ".");
  return quantity === 0 ? cart.filter(item => item.key !== key) : cart.map(item => item.key === key ? { ...item, quantity } : { ...item });
}
export function cartTotal(cart) {
  return cart.reduce((total, item) => total + productFor(item.id, item.color).price * item.quantity, 0);
}
function checkBooking(bookings, data, excludeId) {
  if (!services.includes(data.service) || !days.includes(data.day) || !times.includes(data.time)) throw new Error("Choose a service and an available weekday time.");
  if (bookings.some(b => b.id !== excludeId && b.day === data.day && b.time === data.time)) throw new Error("That time is already booked. Choose another slot.");
}
export function createBooking(bookings, data) {
  checkBooking(bookings, data);
  const id = "booking-" + (Math.max(0, ...bookings.map(b => Number(b.id.replace("booking-", "")) || 0)) + 1);
  return [...bookings, { id, service: data.service, day: data.day, time: data.time }];
}
export function moveBooking(bookings, id, day, time) {
  const b = bookings.find(b => b.id === id);
  if (!b) throw new Error("This booking is no longer in the schedule.");
  checkBooking(bookings, { ...b, day, time }, id);
  return bookings.map(item => item.id === id ? { ...item, day, time } : { ...item });
}
export function cancelBooking(bookings, id) {
  if (!bookings.some(b => b.id === id)) throw new Error("This booking is no longer in the schedule.");
  return bookings.filter(b => b.id !== id);
}
export function availableTime(bookings, excludeId, day, preferred) {
  const available = times.filter(time => !bookings.some(b => b.id !== excludeId && b.day === day && b.time === time));
  return available.includes(preferred) ? preferred : available[0] || "";
}
export function validateInquiry(data) {
  for (const [field, options] of Object.entries(inquiryOptions)) if (!options.includes(data[field])) return "Please choose a " + field + " from the available options.";
  return "";
}

