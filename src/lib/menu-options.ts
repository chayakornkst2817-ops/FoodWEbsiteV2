import type { Menu, MenuOption } from "./data.ts";

export const optionGroupLabels = { protein: "เลือกเนื้อสัตว์", portion: "เลือกขนาด", spice: "ระดับความเผ็ด" };
export type OptionGroup = keyof typeof optionGroupLabels;
export const optionGroups = Object.keys(optionGroupLabels) as OptionGroup[];
export function defaultOptionIds(menu: Menu, selected: string[] = []) {
  return [...new Set([...selected, ...optionGroups.flatMap(group => {
    const choices = menu.options.filter(o => o.group === group);
    if (!choices.length || choices.some(o => selected.includes(o.id))) return [];
    return [(choices.find(o => o.default) ?? choices[0]).id];
  })])];
}
export function validOptionSelection(menu: Menu, ids: string[]) {
  return new Set(ids).size === ids.length && ids.every(id => menu.options.some(o => o.id === id)) &&
    optionGroups.every(group => !menu.options.some(o => o.group === group) || menu.options.filter(o => o.group === group && ids.includes(o.id)).length === 1);
}
export function matchesMenu(menu: Menu, id: string) {
  return menu.id === id || !!menu.legacyIds?.includes(id);
}

// Idempotent upgrade: preserve current prices, availability and custom extras.
export function upgradePaNoiMenus(menus: Menu[]): Menu[] {
  const chicken = menus.find(m => m.id === "basil-chicken");
  const pork = menus.find(m => m.id === "basil-pork");
  const merge = !!chicken && (!!pork || !chicken.options.some(o => o.group === "protein"));
  return menus.filter(m => !(merge && m.id === "basil-pork")).map(original => {
    let m = { ...original, options: [...original.options] };
    if (merge && m.id === "basil-chicken") {
      m = { ...m, name: "ข้าวกะเพรา", description: "กะเพราผัดหอม ๆ เสิร์ฟพร้อมข้าว เลือกไก่หรือหมูสับได้", stock: m.stock + (pork?.stock ?? 0), enabled: m.enabled !== false || (!!pork && pork.enabled !== false), legacyIds: [...new Set([...(m.legacyIds ?? []), "basil-pork"])] };
      m.options = [
        { id: "protein-chicken", name: "ไก่", price: 0, group: "protein", default: true },
        { id: "protein-pork", name: "หมูสับ", price: Math.max(0, (pork?.price ?? m.price + 5) - m.price), group: "protein" },
        ...m.options.filter(o => o.group !== "protein"),
      ];
    }
    const groups: MenuOption[] = [
      { id: "portion-normal", name: "ธรรมดา", price: 0, group: "portion", default: true },
      { id: "portion-special", name: "พิเศษ", price: 10, group: "portion" },
      { id: "spice-none", name: "ไม่เผ็ด", price: 0, group: "spice" },
      { id: "spice-mild", name: "เผ็ดน้อย", price: 0, group: "spice" },
      { id: "spice-normal", name: "เผ็ดปกติ", price: 0, group: "spice", default: true },
      { id: "spice-hot", name: "เผ็ดมาก", price: 0, group: "spice" },
    ];
    const supportsSpice = m.id !== "egg-rice";
    if (!supportsSpice) m.options = m.options.filter(o => o.group !== "spice");
    m.options = [...m.options.filter(o => !!o.group), ...groups.filter(o => (supportsSpice || o.group !== "spice") && !m.options.some(existing => existing.group === o.group)), ...m.options.filter(o => !o.group)];
    return m;
  });
}
