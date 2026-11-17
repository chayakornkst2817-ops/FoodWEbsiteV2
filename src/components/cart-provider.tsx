"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2 } from "lucide-react";
import {
  cartReducer,
  makeCartItem,
  resolveItem,
  type CartItem,
} from "@/lib/cart";
import { restaurants } from "@/lib/data";
import { Button, Modal } from "./ui";

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  addItem: (
    restaurantId: string,
    menuId: string,
    optionIds: string[],
    quantity: number,
  ) => void;
  changeQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  notify: (message: string) => void;
};
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, setPending] = useState<CartItem | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  const notify = useCallback(
    (message: string) => setToast({ message, id: Date.now() }),
    [],
  );
  useEffect(() => {
    try {
      dispatch({
        type: "restore",
        items: JSON.parse(localStorage.getItem("imjai-next-cart") || "[]"),
      });
    } catch {
      /* Invalid or unavailable local storage starts an empty cart. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("imjai-next-cart", JSON.stringify(items));
    } catch {
      /* The cart remains usable in memory. */
    }
  }, [items, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const addItem = (
    restaurantId: string,
    menuId: string,
    optionIds: string[],
    quantity: number,
  ) => {
    const item = makeCartItem(restaurantId, menuId, optionIds, quantity);
    const info = resolveItem(item);
    if (!info || !info.restaurant.open || !info.menu.stock) {
      notify("เมนูนี้ยังไม่เปิดรับออเดอร์");
      return;
    }
    if (items.length && items[0].restaurantId !== restaurantId) {
      setPending(item);
      return;
    }
    const next = cartReducer(items, { type: "add", item });
    if (next === items) {
      notify("จำนวนในตะกร้าถึงจำนวนคงเหลือแล้ว");
      return;
    }
    dispatch({ type: "add", item });
    notify("เพิ่มความอร่อยลงตะกร้าแล้ว");
  };
  return (
    <CartContext.Provider
      value={{
        items,
        ready,
        mobileOpen,
        setMobileOpen,
        addItem,
        changeQuantity: (key, quantity) => {
          const next = cartReducer(items, { type: "quantity", key, quantity });
          if (next === items) notify("จำนวนในตะกร้าถึงจำนวนคงเหลือแล้ว");
          else dispatch({ type: "quantity", key, quantity });
        },
        removeItem: (key) => dispatch({ type: "remove", key }),
        clearCart: () => dispatch({ type: 'restore', items: [] }),
        notify,
      }}
    >
      {children}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="ยืนยันเปลี่ยนร้านในตะกร้า"
      >
        <div className="p-7 pt-12">
          <p className="mb-2 text-xs font-semibold tracking-widest text-brand">
            หนึ่งร้าน ต่อหนึ่งออเดอร์
          </p>
          <h2 className="text-2xl font-bold">เปลี่ยนร้านในตะกร้า?</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            รายการจาก{" "}
            {restaurants.find((r) => r.id === items[0]?.restaurantId)?.name}{" "}
            จะถูกนำออก แล้วเพิ่มเมนูจาก{" "}
            {pending &&
              restaurants.find((r) => r.id === pending.restaurantId)?.name}{" "}
            แทน
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setPending(null)}>
              เก็บตะกร้าเดิม
            </Button>
            <Button
              onClick={() => {
                if (!pending) return;
                dispatch({ type: "add", item: pending, replace: true });
                setPending(null);
                notify("เปลี่ยนร้านและเพิ่มเมนูแล้ว");
              }}
            >
              เปลี่ยนตะกร้า
            </Button>
          </div>
        </div>
      </Modal>
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[80] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-3 text-center text-xs text-white shadow-xl md:bottom-6"
        >
          <CheckCircle2 size={16} className="shrink-0 text-[#f9bc8e]" />
          {toast.message}
        </div>
      )}
    </CartContext.Provider>
  );
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
