import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { cartItems, carts, services } from '../database/schema/index.js';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

async function getCart(customerId: string) {
  let [cart] = await db.select().from(carts).where(eq(carts.customerId, customerId)).limit(1);
  if (!cart) [cart] = await db.insert(carts).values({ customerId }).returning();
  const items = await db.select({ item: cartItems, service: services })
    .from(cartItems).innerJoin(services, eq(cartItems.serviceId, services.id))
    .where(and(eq(cartItems.cartId, cart.id), isNull(services.deletedAt), eq(services.isActive, true)));
  const data = items.map(({ item, service }) => ({
    id: item.id, serviceId: service.id, name: service.name, image: (service.images as string[])[0] ?? null,
    quantity: item.quantity, unitPrice: service.customerPrice, duration: service.duration,
    lineTotal: item.quantity * service.customerPrice,
  }));
  return { id: cart.id, items: data, total: data.reduce((sum, item) => sum + item.lineTotal, 0) };
}

export const cartController = {
  get: asyncHandler(async (req: Request, res: Response) => res.json({ success: true, data: await getCart(req.user!.userId) })),
  add: asyncHandler(async (req: Request, res: Response) => {
    const serviceId = String(req.body.serviceId ?? '');
    const quantity = Math.max(1, Number(req.body.quantity ?? 1));
    const [service] = await db.select({ id: services.id }).from(services)
      .where(and(eq(services.id, serviceId), eq(services.isActive, true), isNull(services.deletedAt))).limit(1);
    if (!service) throw AppError.notFound('Active service not found.');
    let [cart] = await db.select().from(carts).where(eq(carts.customerId, req.user!.userId)).limit(1);
    if (!cart) [cart] = await db.insert(carts).values({ customerId: req.user!.userId }).returning();
    const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.serviceId, serviceId))).limit(1);
    if (existing) await db.update(cartItems).set({ quantity: existing.quantity + quantity, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
    else await db.insert(cartItems).values({ cartId: cart.id, serviceId, quantity });
    res.status(201).json({ success: true, data: await getCart(req.user!.userId) });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const itemId = String(req.params.itemId);
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw AppError.badRequest('Quantity must be a positive integer.');
    const [cart] = await db.select().from(carts).where(eq(carts.customerId, req.user!.userId)).limit(1);
    if (!cart) throw AppError.notFound('Cart not found.');
    await db.update(cartItems).set({ quantity, updatedAt: new Date() }).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
    res.json({ success: true, data: await getCart(req.user!.userId) });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    const [cart] = await db.select().from(carts).where(eq(carts.customerId, req.user!.userId)).limit(1);
    if (cart) await db.delete(cartItems).where(and(eq(cartItems.id, req.params.itemId), eq(cartItems.cartId, cart.id)));
    res.json({ success: true, data: await getCart(req.user!.userId) });
  }),
};