"use client";
import {applyServerDocument,runDatabaseMutation,writeDocument} from "@/lib/database-client";
import {shopAccess,desiredOpen,applicationPayout} from "@/lib/governance";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  restaurants,
  historicalRestaurants,
  configuredSlots,
  type Restaurant,
} from "@/lib/data";
export type ShopConfig = {
  reopensAt?: string|null;
  name: string;
  phone: string;
  hours: string;
  bank: string;
  account: string;
  recipient: string;
  qr: string;
  slots: { time: string; available: number }[];
  menus: Restaurant["menus"];
  open: boolean;
  orderStart: string;
  orderEnd: string;
};
const Context = createContext<{
  setAcceptance:(id:string,open:boolean,reopensAt:string|null)=>Promise<void>;
  revision: number;
  config: (id: string) => ShopConfig;
  save: (id: string, value: ShopConfig) => void;
} | null>(null);
const slotOverrides = configuredSlots;
export function MerchantCatalog({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<Record<string, ShopConfig>>({});
  const [revision, setRevision] = useState(0);
  const defaults = (id: string): ShopConfig => {
    const r = historicalRestaurants.find((r) => r.id === id);
    const app=applicationPayout[id];
    return {
      name: r?.name ?? app?.name ?? "ร้านเดิม",
      phone: app?.phone??"0890000000",
      hours: r?.hours ?? "08:00–14:00",
      bank: app?.bank??"ธนาคารตัวอย่าง",
      account: app?.account??"000-0-00000-0",
      recipient: app?.recipient??r?.name??"ร้านเดิม",
      qr: app?.qr??"",
      slots: [
        { time: "11:30–11:45", available: 6 },
        { time: "11:45–12:00", available: 0 },
        { time: "12:00–12:15", available: 8 },
      ],
      menus: r?.menus ?? [],
      open: restaurants.some((shop) => shop.id === id) && (r?.open ?? false),
      orderStart: "07:00",
      orderEnd: "23:59",
    };
  };
  function apply(values: Record<string, ShopConfig>) {
    for (const [id, c] of Object.entries(values)) {
      const r = restaurants.find((r) => r.id === id);
      if (!r || !Array.isArray(c.menus) || !Array.isArray(c.slots)) continue;
      desiredOpen[id]=c.open;
      Object.assign(r, {
        name: c.name,
        hours: c.hours,
        open: c.open&&(shopAccess[id]?.approved??true)&&!shopAccess[id]?.suspended,
        menus: c.menus.map((m) => ({
          ...m,
          stock: m.enabled === false ? 0 : m.stock,
        })),
      });
      slotOverrides[id] = c.slots;
    }
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("imjai-merchant-catalog") || "{}",
      );
      apply(saved);
      setConfigs(saved);
    } catch {}
    setRevision((n) => n + 1);
    const sync = (event: StorageEvent) => {
      if (event.key !== "imjai-merchant-catalog" || !event.newValue) return;
      try {
        const saved = JSON.parse(event.newValue);
        apply(saved); setConfigs(saved); setRevision(n => n + 1);
      } catch {}
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <Context.Provider
      value={{
        revision,
        setAcceptance: async(id,open,reopensAt) => runDatabaseMutation(async()=>{
          const response=await fetch(`/api/shops/${encodeURIComponent(id)}/accepting/`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({open,reopensAt})});
          const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||"ไม่มีสิทธิ์เปลี่ยนสถานะร้าน หรือบันทึกไม่สำเร็จ");
          applyServerDocument(result.document);
        }),
        config: (id) => configs[id] ?? defaults(id),
        save: (id, c) => {
          if(c.open&&shopAccess[id]&&(!shopAccess[id].approved||shopAccess[id].suspended))throw Error("ร้านยังไม่ผ่านอนุมัติหรือถูกระงับ จึงเปิดขายไม่ได้");
          if (
            !c.name.trim() ||
            c.menus.some(
              (m) =>
                !m.name.trim() ||
                !Number.isFinite(m.price) ||
                m.price < 0 ||
                !Number.isInteger(m.stock) ||
                m.stock < 0 ||
                m.options.some(o => !o.name.trim() || !Number.isFinite(o.price) || o.price < 0),
            )
          )
            throw Error("ชื่อ ราคา หรือจำนวนอาหารไม่ถูกต้อง");
          const next = { ...configs, [id]: c };
          writeDocument("imjai-merchant-catalog", next);
          apply(next);
          setConfigs(next);
          setRevision((n) => n + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMerchantCatalog() {
  const c = useContext(Context);
  if (!c) throw Error("MerchantCatalog missing");
  return c;
}
