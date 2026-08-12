# Booking Rules

RULE ID: BOOK-001  
RULE NAME: Dispatch-based professional selection  
CURRENT BEHAVIOR: Customers submit services; the platform dispatches eligible partners.  
APPLIES TO: Legacy bookings and newer orders.  
EXCEPTIONS: Administrative manual assignment exists.  
SOURCE FILES: `server/src/services/dispatch.service.ts`, `server/src/services/orderDispatch.service.ts`  
RELATED MODULE: Booking, orders, dispatch  
RELATED WORKFLOW: [`../workflows/partner-dispatch-service.md`](../workflows/partner-dispatch-service.md)

RULE ID: BOOK-002  
RULE NAME: Legacy and itemized order models coexist  
CURRENT BEHAVIOR: `bookings`/`booking_items` and `orders`/`order_items` are both implemented.  
APPLIES TO: Checkout, dispatch, payments, history.  
EXCEPTIONS: None verified.  
SOURCE FILES: `server/src/database/schema/bookings.ts`, `orders.ts`, `orderItems.ts`  
RELATED MODULE: Booking/orders  
RELATED WORKFLOW: [`../workflows/booking-order-lifecycle.md`](../workflows/booking-order-lifecycle.md)

RULE ID: BOOK-003
RULE NAME: Cancellation fees use bounded percentage pricing
CURRENT BEHAVIOR: After partner acceptance or check-in, the server calculates the configured percentage of the item service amount, constrains it between the configured minimum and maximum rupee fees, rounds it, and caps it at the service price.
APPLIES TO: Itemized order cancellation and customer cancellation warnings.
EXCEPTIONS: No fee applies before partner acceptance.
SOURCE FILES: `server/src/controllers/orders.controller.ts`, `server/src/routes/index.ts`, `apps/customer-web/src/app/CustomerApp.tsx`, `apps/mobile/app/(tabs)/bookings.tsx`
RELATED MODULE: Booking/orders, Admin settings, Customer Web, Customer Mobile
RELATED WORKFLOW: [`../workflows/booking-order-lifecycle.md`](../workflows/booking-order-lifecycle.md)
