import { upgradePaNoiMenus } from "./menu-options.ts";
export type Category =
  | "ทั้งหมด"
  | "อาหารตามสั่ง"
  | "ก๋วยเตี๋ยว"
  | "อาหารสุขภาพ"
  | "ทานเล่น"
  | "เครื่องดื่ม";
export type MenuOption = { id: string; name: string; price: number; group?: "protein" | "portion" | "spice"; default?: boolean };
export type Menu = {
  legacyIds?: string[];
  enabled?: boolean;
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  options: MenuOption[];
};
export type Restaurant = {
 registered?:boolean;
  id: string;
  name: string;
  description: string;
  category: Category;
  image: string;
  location: string;
  open: boolean;
  tag: string;
  hours: string;
  menus: Menu[];
};
export const foodImages = {
  rice: "/images/rice.jpg",
  thai: "/images/thai.jpg",
  noodles: "/images/noodles.jpg",
  salad: "/images/salad.jpg",
  burger: "/images/burger.jpg",
  drink: "/images/drink.jpg",
};
const egg: MenuOption[] = [{ id: "egg", name: "เพิ่มไข่ดาว", price: 10 }];
export const categories: Category[] = ["ทั้งหมด", "อาหารตามสั่ง"];
const restaurantCatalog: Restaurant[] = [
  {
    id: "pa-noi",
    name: "ร้านป้าหน่อย",
    description: "อาหารตามสั่งรสมือแม่ ผัดใหม่ทุกจาน",
    category: "อาหารตามสั่ง",
    image: foodImages.thai,
    location: "โซน A · ล็อก 03",
    open: true,
    tag: "ร้านประจำของชาววิทยาลัย",
    hours: "08:00–14:00",
    menus: upgradePaNoiMenus([
      {
        id: "basil-chicken",
        name: "ข้าวกะเพราไก่",
        description: "ไก่ผัดพริกกระเทียม ใบกะเพราหอม ๆ เสิร์ฟพร้อมข้าวหอมมะลิ",
        price: 40,
        image: foodImages.thai,
        stock: 24,
        options: egg,
      },
      {
        id: "egg-rice",
        name: "ข้าวผัดไข่",
        description: "ข้าวผัดไข่หอมกระทะ พร้อมผักและมะนาวสด",
        price: 35,
        image: foodImages.rice,
        stock: 18,
        options: egg,
      },
      {
        id: "basil-pork",
        name: "ข้าวกะเพราหมูสับ",
        description: "กะเพราหมูสับรสจัดจ้าน สูตรประจำครัวป้าหน่อย",
        price: 45,
        image: foodImages.thai,
        stock: 0,
        options: egg,
      },
    ]),
  },
  {
    id: "sen-suk",
    name: "เส้นสุข ก๋วยเตี๋ยว",
    description: "เส้นนุ่ม น้ำซุปหอม เคี่ยวสดทุกเช้า",
    category: "ก๋วยเตี๋ยว",
    image: foodImages.noodles,
    location: "โซน A · ล็อก 07",
    open: true,
    tag: "น้ำซุปเคี่ยวทุกเช้า",
    hours: "08:30–14:00",
    menus: [
      {
        id: "pork-noodle",
        name: "บะหมี่น้ำหมู",
        description: "บะหมี่ไข่เหนียวนุ่ม หมูนุ่ม และน้ำซุปใสกลมกล่อม",
        price: 40,
        image: foodImages.noodles,
        stock: 20,
        options: [{ id: "extra-pork", name: "เพิ่มหมู", price: 10 }],
      },
      {
        id: "tom-yum",
        name: "ก๋วยเตี๋ยวต้มยำ",
        description: "น้ำต้มยำมะนาวสด รสแซ่บถึงเครื่อง",
        price: 45,
        image: foodImages.noodles,
        stock: 12,
        options: [],
      },
    ],
  },
  {
    id: "green-bowl",
    name: "กรีนโบวล์",
    description: "มื้อเบา ๆ ผักสดหลากสี อิ่มแบบพอดี",
    category: "อาหารสุขภาพ",
    image: foodImages.salad,
    location: "โซน B · ล็อก 02",
    open: true,
    tag: "สดใหม่ทุกวัน",
    hours: "09:00–13:30",
    menus: [
      {
        id: "mixed-salad",
        name: "สลัดผักรวม",
        description: "ผักสดตามฤดูกาล พร้อมน้ำสลัดงาคั่วแยกถ้วย",
        price: 45,
        image: foodImages.salad,
        stock: 10,
        options: [{ id: "extra-dressing", name: "เพิ่มน้ำสลัด", price: 5 }],
      },
      {
        id: "veggie-rice",
        name: "ข้าวผักรวม",
        description: "ข้าวหอมมะลิและผักผัดหลากสี ปรุงรสอ่อน",
        price: 50,
        image: foodImages.rice,
        stock: 15,
        options: [],
      },
    ],
  },
  {
    id: "after-class",
    name: "เบอร์เกอร์หลังเลิกเรียน",
    description: "เบอร์เกอร์ชิ้นโต ย่างสดตามออเดอร์",
    category: "ทานเล่น",
    image: foodImages.burger,
    location: "โซน B · ล็อก 05",
    open: false,
    tag: "เปิดพรุ่งนี้ 09:00",
    hours: "09:00–15:00",
    menus: [
      {
        id: "beef-burger",
        name: "เบอร์เกอร์เนื้อ",
        description: "เนื้อย่างหอม ผักสด และซอสสูตรของร้าน",
        price: 59,
        image: foodImages.burger,
        stock: 20,
        options: [{ id: "cheese", name: "เพิ่มชีส", price: 10 }],
      },
    ],
  },
  {
    id: "take-a-break",
    name: "พักก่อน คาเฟ่",
    description: "เติมความสดชื่น ให้ทุกคาบเรียน",
    category: "เครื่องดื่ม",
    image: foodImages.drink,
    location: "โซน C · ล็อก 01",
    open: true,
    tag: "แวะเติมความสดชื่น",
    hours: "07:30–15:00",
    menus: [
      {
        id: "fruit-soda",
        name: "น้ำผลไม้โซดา",
        description: "น้ำผลไม้โซดาสดชื่น เสิร์ฟเย็น พร้อมแก้วและฝาปิด",
        price: 30,
        image: foodImages.drink,
        stock: 30,
        options: [],
      },
    ],
  },
];
// Retain archived shop details for historical orders and payment information.
export const historicalRestaurants = restaurantCatalog;
export const restaurants = restaurantCatalog.filter((r) => r.id === "pa-noi");
export const pickupSlots = [
  { time: "11:30–11:45", available: 6 },
  { time: "11:45–12:00", available: 0 },
  { time: "12:00–12:15", available: 8 },
];
export const findRestaurant = (id: string) =>
  restaurants.find((r) => r.id === id);
export const baht = (amount: number) => `฿${amount.toLocaleString("th-TH")}`;

export const configuredSlots: Record<
  string,
  { time: string; available: number }[]
> = {};

export const configuredHours: Record<string, { start: string; end: string }> =
  {};
