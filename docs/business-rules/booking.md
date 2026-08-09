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
