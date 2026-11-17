"use client";
import {applyServerDocument,runDatabaseMutation,clearIdentityCache,writeDocument} from "@/lib/database-client";
import {suspendedUsers} from "@/lib/governance";
import { collaboration, type Action } from "@/lib/collaboration";
import { merchantTransition } from "@/lib/merchant";
import { restaurants, configuredSlots, pickupSlots } from "@/lib/data";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createOrder,
  expireOrders,
  localDate,
  nextPickupDate,
  submitSlip,
  type Order,
} from "@/lib/orders";
import { passwordHash, type DemoAccount } from "@/lib/browser-storage";
import { makeCartItem, type CartItem } from "@/lib/cart";
type Store = {
  accounts: DemoAccount[];
  orders: Order[];
  timeoutMinutes: number;
};
const initial: Store = { accounts: [], orders: [], timeoutMinutes: 10 };
const storeKey = "imjai-demo-v2";
type DemoContextType = {
  users: {id:string;name:string;email:string;phone:string}[];
  ready: boolean;
  account: DemoAccount | null;
  orders: Order[];
  allOrders: Order[];
  timeoutMinutes: number;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, phone: string) => void;
  changePassword: (current: string, next: string) => Promise<void>;
  requestReset: (email: string) => string | null;
  resetPassword: (token: string, password: string) => Promise<void>;
  placeOrder: (
    items: CartItem[],
    date: string,
    time: string,
    phone: string,
    note: string,
    requestKey: string,
  ) => Promise<string>;
  sendSlip: (orderId: string, slipId: string, fileName: string) => void;
  setTimeoutMinutes: (minutes: number) => void;
  addExamples: () => void;
  collaborate: (id: string, action: Action, merchantId?: string) => void;
  merchantAct: (
    id: string,
    restaurantId: string,
    action: "confirm" | "issue" | "ready" | "received",
    detail?: string,
  ) => void;
  merchantSeed: (restaurantId: string) => void;
};
const Context = createContext<DemoContextType | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const model = useRef<Store>(initial);
  const submitting = useRef(false);
  const [store, setStore] = useState(initial);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  function commit(next: Store) {
    try {
      writeDocument(storeKey, next);
    } catch {
      throw new Error(
        "บันทึกข้อมูลไม่สำเร็จ พื้นที่เบราว์เซอร์อาจเต็ม กรุณาลองใหม่",
      );
    }
    model.current = next;
    setStore(next);
  }
  function signIn(id: string) {
    sessionStorage.setItem("imjai-demo-session", id);
    setUserId(id);
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (
        saved &&
        Array.isArray(saved.accounts) &&
        Array.isArray(saved.orders)
      ) {
        const next: Store = {
          accounts: saved.accounts.filter(
            (a: DemoAccount) =>
              a &&
              typeof a.id === "string" &&
              typeof a.email === "string" &&
              typeof a.passwordHash === "string" &&
              typeof a.salt === "string",
          ),
          orders: saved.orders.filter(
            (o: Order) =>
              o &&
              typeof o.id === "string" &&
              Array.isArray(o.lines) &&
              Array.isArray(o.history) &&
              Array.isArray(o.slips) &&
              Number.isFinite(o.expiresAt),
          ),
          timeoutMinutes:
            Number.isInteger(saved.timeoutMinutes) &&
            saved.timeoutMinutes >= 1 &&
            saved.timeoutMinutes <= 30
              ? saved.timeoutMinutes
              : 10,
        };
        model.current = {
          ...next,
          orders: expireOrders(next.orders, Date.now()),
        };
        setStore(model.current);
      }
      setUserId(sessionStorage.getItem("imjai-demo-session"));
    } catch {
      /* Malformed local demo state falls back to an empty store. */
    }
    const sync = (event: StorageEvent) => {
      if (event.key !== storeKey || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue);
        if (Array.isArray(value.orders) && Array.isArray(value.accounts)) {
          model.current = value;
          setStore(value);
        }
      } catch {}
    };
    window.addEventListener("storage", sync);
    setReady(true);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      if(submitting.current)return;
      const current = model.current;
      const orders = expireOrders(current.orders, Date.now());
      if (orders !== current.orders) {
        try {
          commit({ ...current, orders });
        } catch {
          model.current = { ...current, orders };
          setStore(model.current);
        }
      }
    };
    const interval = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [ready]);
  const account = store.accounts.find((a) => a.id === userId) ?? null;
  function requireAccount() {
    if(account&&suspendedUsers.has(account.id))throw Error("บัญชีนี้ถูกระงับการใช้งาน");
    if (!account) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
    return account;
  }
  async function authenticate(action:string, email:string, password:string, name?:string, phone?:string) {
    const response=await fetch("/api/auth/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,role:"customer",email,password,name,phone})});
    const result=await response.json();if(!response.ok)throw Error(result.error);
    clearIdentityCache();
  }
  const register=(name:string,email:string,phone:string,password:string)=>authenticate("register",email,password,name,phone);
  const login=(email:string,password:string)=>authenticate("login",email,password);
  return (
    <Context.Provider
      value={{
        users:store.accounts.map(({id,name,email,phone})=>({id,name,email,phone})),
        ready,
        account,
        orders: store.orders.filter((o) => o.userId === account?.id),
        allOrders: store.orders,
        timeoutMinutes: store.timeoutMinutes,
        register,
        login,
        demoLogin: async () => {throw Error("กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ");},
        logout: () => {
          void fetch("/api/auth/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})}).then(()=>{clearIdentityCache();window.location.assign("/login/");});
        },
        updateProfile: (name, phone) => {
          const current = requireAccount();
          commit({
            ...model.current,
            accounts: model.current.accounts.map((a) =>
              a.id === current.id ? { ...a, name: name.trim(), phone } : a,
            ),
          });
        },
        changePassword: async (current,next) => {
          const r=await fetch("/api/auth/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"password",current,password:next})});
          const result=await r.json();if(!r.ok)throw Error(result.error);clearIdentityCache();window.location.assign("/login/");
        },
        requestReset: () => {throw Error("กรุณาติดต่อผู้ดูแลเพื่อตั้งรหัสผ่านใหม่ ขณะนี้ยังไม่มีระบบส่งอีเมลรีเซ็ตรหัสผ่าน");},
        resetPassword: async () => {throw Error("ลิงก์รีเซ็ตสาธิตถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล");},
        placeOrder: async (items,date,time,phone,note,requestKey) => {
          requireAccount();submitting.current=true;
          try{return await runDatabaseMutation(async()=>{
            const response=await fetch("/api/orders/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestKey,restaurantId:items[0]?.restaurantId,items,pickupDate:date,pickupTime:time,phone,note})});
            const result=await response.json();
            if(!response.ok)throw Error(result.error||"สร้างออเดอร์ไม่สำเร็จ กรุณาลองใหม่");
            model.current=result.document.payload;setStore(model.current);applyServerDocument(result.document);if(result.catalogDocument)applyServerDocument(result.catalogDocument);
            return result.order.id;
          });}finally{submitting.current=false;}
        },
        sendSlip: (orderId, slipId, fileName) => {
          const a = requireAccount();
          const found = model.current.orders.find(
            (o) => o.id === orderId && o.userId === a.id,
          );
          if (!found) throw new Error("ไม่พบออเดอร์ของคุณ");
          const updated = submitSlip(
            found,
            {
              id: slipId,
              name: fileName,
              submittedAt: Date.now(),
              status: "submitted",
            },
            Date.now(),
          );
          commit({
            ...model.current,
            orders: model.current.orders.map((o) =>
              o.id === orderId ? updated : o,
            ),
          });
        },
        setTimeoutMinutes: (minutes) => {
          if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30)
            throw new Error("กรุณาเลือก 1–30 นาที");
          commit({ ...model.current, timeoutMinutes: minutes });
        },
        merchantAct: (id, restaurantId, action, detail = "") => {
          const order = model.current.orders.find((o) => o.id === id);
          if (!order) throw Error("ไม่พบออเดอร์");
          const updated = merchantTransition(
            order,
            restaurantId,
            action,
            Date.now(),
            detail,
          );
          commit({
            ...model.current,
            orders: model.current.orders.map((o) =>
              o.id === id ? updated : o,
            ),
          });
        },
        merchantSeed: (restaurantId) => {
          const a = requireAccount();
          const r = restaurants.find((r) => r.id === restaurantId)!;
          const m = r.menus.find((m) => m.stock > 0);
          if (!m) throw Error("เพิ่มเมนูที่มีจำนวนคงเหลือก่อน");
          const now = Date.now();
          const order = createOrder({
            id: "SHOP-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
            userId: a.id,
            items: [makeCartItem(r.id, m.id, [], 1)],
            pickupDate: localDate(now + 86400000),
            pickupTime:
              (configuredSlots[restaurantId] ?? pickupSlots).find(
                (s) => s.available > 0,
              )?.time ?? "12:00–12:15",
            phone: a.phone,
            note: "ออเดอร์จำลองสำหรับฝึกร้านตรวจเงิน",
            timeoutMinutes: 10,
            now,
            existingOrders: [],
          });
          const review = submitSlip(
            order,
            {
              id: "demo-" + crypto.randomUUID(),
              name: "ภาพประกอบตัวอย่าง ไม่ใช่สลิปจริง",
              submittedAt: now,
              status: "submitted",
            },
            now,
          );
          commit({
            ...model.current,
            orders: [review, ...model.current.orders],
          });
        },
        collaborate: (id, action, merchantId) => {
          const o = model.current.orders.find((o) => o.id === id);
          if (!o) throw Error("ไม่พบออเดอร์");
          const actor = merchantId
            ? { role: "merchant" as const, id: merchantId }
            : { role: "customer" as const, id: requireAccount().id };
          const updated = collaboration(
            o,
            actor,
            action,
            Date.now(),
            model.current.orders,
          );
          commit({
            ...model.current,
            orders: model.current.orders.map((x) =>
              x.id === id ? updated : x,
            ),
          });
        },
        addExamples: () => {
          const a = requireAccount();
          if (
            model.current.orders.some((o) => o.userId === a.id && o.demoExample)
          )
            return;
          const now = Date.now();
          const base = createOrder({
            id: `EXAMPLE-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
            userId: a.id,
            items: [makeCartItem("pa-noi", "egg-rice", [], 1)],
            pickupDate: localDate(now + 86400000),
            pickupTime: "12:00–12:15",
            phone: a.phone,
            note: "ข้อมูลตัวอย่างสำหรับดูสถานะ",
            timeoutMinutes: 10,
            now: now - 1200000,
            existingOrders: [],
          });
          const examples = (
            ["ready", "received", "payment_issue"] as const
          ).map((status, i) => ({
            ...base,
            id: `${base.id}-${i}`,
            pickupCode: `DEMO0${i + 1}`,
            status,
            demoExample: true,
            slips: [],
            history: [
              ...base.history,
              { status: "payment_review" as const, at: now - 1000000 },
              ...(status === "payment_issue"
                ? []
                : [
                    { status: "preparing" as const, at: now - 900000 },
                    { status: "ready" as const, at: now - 600000 },
                  ]),
              {
                status,
                at: now - 300000,
                note:
                  status === "payment_issue"
                    ? "ตัวอย่าง: ภาพสลิปอ่านไม่ชัด กรุณาแนบใหม่"
                    : "ออเดอร์ตัวอย่าง",
              },
            ],
          }));
          commit({
            ...model.current,
            orders: [...model.current.orders, ...examples],
          });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProvider missing");
  return context;
}
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
