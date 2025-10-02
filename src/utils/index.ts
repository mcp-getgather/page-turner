import type { PurchaseHistory } from '../modules/DataTransformSchema';

export const filterUniqueOrders = (
  orders: PurchaseHistory[]
): PurchaseHistory[] => {
  const seen = new Set<string>();
  return orders.filter((order) => {
    const key = `${order.product_name}__${order.product_image}__${order.product_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
