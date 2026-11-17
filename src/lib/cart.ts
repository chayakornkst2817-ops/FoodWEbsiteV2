import { defaultOptionIds, validOptionSelection } from "./menu-options.ts";
import { restaurants } from "./data.ts";
export type CartItem = {
  key: string;
  restaurantId: string;
  menuId: string;
  optionIds: string[];
  quantity: number;
};
export type CartAction =
  | { type: "add"; item: CartItem; replace?: boolean }
  | { type: "quantity"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "restore"; items: unknown };
export function resolveItem(item: CartItem) {
  const restaurant = restaurants.find((r) => r.id === item.restaurantId);
  const menu = restaurant?.menus.find((m) => m.id === item.menuId);
  if (!restaurant || !menu || !validOptionSelection(menu, item.optionIds)) return null;
  const options = menu.options.filter((o) => item.optionIds.includes(o.id));
  return {
    restaurant,
    menu,
    options,
    price: menu.price + options.reduce((sum, o) => sum + o.price, 0),
  };
}
export function makeCartItem(
  restaurantId: string,
  menuId: string,
  optionIds: string[],
  quantity: number,
): CartItem {
  const menu = restaurants.find(r => r.id === restaurantId)?.menus.find(m => m.id === menuId);
  const sorted = (menu ? defaultOptionIds(menu, optionIds) : [...new Set(optionIds)]).sort();
  return {
    key: `${restaurantId}:${menuId}:${sorted.join(",")}`,
    restaurantId,
    menuId,
    optionIds: sorted,
    quantity,
  };
}
function canAdd(items: CartItem[], item: CartItem, restoring=false) {
  const resolved = resolveItem(item);
  return (
    !!resolved &&
    (restoring || resolved.restaurant.open) &&
    resolved.menu.enabled !== false &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.optionIds.every((id) =>
      resolved.menu.options.some((o) => o.id === id),
    ) &&
    items
      .filter((x) => x.menuId === item.menuId)
      .reduce((sum, x) => sum + x.quantity, 0) +
      item.quantity <=
      resolved.menu.stock
  );
}
function restore(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  let result: CartItem[] = [];
  for (const raw of value) {
    if (
      !raw ||
      typeof raw !== "object" ||
      typeof raw.restaurantId !== "string" ||
      typeof raw.menuId !== "string" ||
      !Array.isArray(raw.optionIds) ||
      !raw.optionIds.every((x: unknown) => typeof x === "string") ||
      !Number.isInteger(raw.quantity)
    )
      continue;
    const item = makeCartItem(
      raw.restaurantId,
      raw.menuId,
      raw.optionIds,
      raw.quantity,
    );
    if (result.length && result[0].restaurantId !== item.restaurantId) continue;
    if (canAdd(result,item,true)) {
      const existing=result.find(x=>x.key===item.key);
      result=existing?result.map(x=>x.key===item.key?{...x,quantity:x.quantity+item.quantity}:x):[...result,item];
    }
  }
  return result;
}
export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  if (action.type === "restore") return restore(action.items);
  if (action.type === "remove")
    return items.filter((x) => x.key !== action.key);
  if (action.type === "quantity") {
    const item = items.find((x) => x.key === action.key);
    if (!item || !Number.isInteger(action.quantity) || action.quantity < 0)
      return items;
    if (!action.quantity) return items.filter((x) => x.key !== item.key);
    const others = items.filter((x) => x.key !== item.key);
    const updated = { ...item, quantity: action.quantity };
    return canAdd(others, updated)
      ? items.map((x) => (x.key === item.key ? updated : x))
      : items;
  }
  const base = action.replace ? [] : items;
  if (base.length && base[0].restaurantId !== action.item.restaurantId)
    return items;
  if (!canAdd(base, action.item)) return items;
  const existing = base.find((x) => x.key === action.item.key);
  return existing
    ? base.map((x) =>
        x.key === existing.key
          ? { ...x, quantity: x.quantity + action.item.quantity }
          : x,
      )
    : [...base, action.item];
}
export function cartTotal(items: CartItem[]) {
  return items.reduce(
    (total, item) => total + (resolveItem(item)?.price ?? 0) * item.quantity,
    0,
  );
}
