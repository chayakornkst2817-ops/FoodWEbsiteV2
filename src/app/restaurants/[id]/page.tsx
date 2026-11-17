import { notFound } from "next/navigation";
import { restaurants, findRestaurant } from "@/lib/data";
import { RestaurantDetail } from "@/components/restaurant-detail";
export const dynamicParams = false;
export function generateStaticParams() {
  return restaurants.map((r) => ({ id: r.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: findRestaurant(id)?.name ?? "ไม่พบร้าน" };
}
export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = findRestaurant(id);
  if (!restaurant) notFound();
  return <RestaurantDetail restaurant={restaurant} />;
}
