# ServeNow QA Test Report — 2026-07-13 18:28 UTC


## Auth — Login (all roles)

```json
customer login: {"success":true,"data":{"user":{"id":"[CUST-USER-ID]","email":"customer@servenow.in","phone":"+91 XXXXX XXXXX","fullName":"Priya Sharma","avatarUrl":"[REDACTED-STORAGE-URL]"success":true,"data":{"user":{"id":"[PART-USER-ID]","email":"partner@servenow.in","phone":"+91 XXXXX XXXXX","fullName":"Rajan Vermaa","avatarUrl":null,"role":"partner","emailVerified":true,"createdAt":"2026-07-06T13:25:04.164Z"},"accessToken":"[REDACTED-JWT]
admin login: {"success":true,"data":{"user":{"id":"[ADMIN-USER-ID]","email":"admin@servenow.in","phone":"+91 XXXXX XXXXX","fullName":"Admin ServeNow","avatarUrl":null,"role":"admin","emailVerified":true,"createdAt":"2026-07-06T13:25:03.960Z"},"accessToken":"[REDACTED-JWT]
```

## Customer — Profile

```json
GET /profile/me -> {"success":true,"data":{"id":"[CUST-USER-ID]","email":"customer@servenow.in","phone":"+91 XXXXX XXXXX","fullName":"Priya Sharma","avatarUrl":"[REDACTED-STORAGE-URL]","role":"customer","emailVerified":true,"createdAt":"2026-07-06T13:25:04.297Z"}}
```
```json
PATCH /profile/me {fullName: Priya Sharma QA} -> {"success":true,"data":{"id":"[CUST-USER-ID]","email":"customer@servenow.in","phone":"+91 XXXXX XXXXX","fullName":"Priya Sharma QA","avatarUrl":"[REDACTED-STORAGE-URL]","role":"customer","emailVerified":true,"createdAt":"2026-07-06T13:25:04.297Z"}}
```

## Customer — Addresses (CRUD)

```json
POST /addresses -> {"success":true,"data":{"id":"[ADDR-ID-1]","userId":"[CUST-USER-ID]","label":"Home QA","line1":"123 Test Street","line2":null,"city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India","latitude":null,"longitude":null,"isDefault":true,"createdAt":"2026-07-13T18:28:13.235Z","updatedAt":"2026-07-13T18:28:13.235Z","deletedAt":null}}
```
```json
GET /addresses -> {"success":true,"data":[{"id":"[ADDR-ID-1]","userId":"[CUST-USER-ID]","label":"Home QA","line1":"123 Test Street","line2":null,"city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India","latitude":null,"longitude":null,"isDefault":true,"createdAt":"2026-07-13T18:28:13.235Z","updatedAt":"2026-07-13T18:28:13.235Z","deletedAt":null},{"id":"[ADDR-ID-2]","userId":"[CUST-USER-ID]","label":"Other","line1":"Plot 7, DLF Phase 2","line2":"Near Rapid Metro Station","city":"Gurugram","state":"Haryana","postalCode":"122008","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.594Z","updatedAt":"2026-07-13T14:22:03.594Z","deletedAt":null},{"id":"[ADDR-ID-3]","userId":"[CUST-USER-ID]","label":"Other","line1":"23, Linking Road","line2":"Bandra West","city":"Mumbai","state":"Maharashtra","postalCode":"400050","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.462Z","updatedAt":"2026-07-13T14:22:03.462Z","deletedAt":null},{"id":"[ADDR-ID-4]","userId":"[CUST-USER-ID]","label":"Work","line1":"10th Floor, BKC Tower","line2":"Bandra Kurla Complex","city":"Mumbai","state":"Maharashtra","postalCode":"400051","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.328Z","updatedAt":"2026-07-13T14:22:03.328Z","deletedAt":null},{"id":"[ADDR-ID-5]","userId":"[CUST-USER-ID]","label":"Home","line1":"Flat 4B, Sunrise Apartments","line2":"Near City Mall, Andheri West","city":"Mumbai","state":"Maharashtra","postalCode":"400053","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.199Z","updatedAt":"2026-07-13T14:22:03.199Z","deletedAt":null}]}
```
```json
PATCH /addresses/[ADDR-ID-1] -> {"success":true,"data":{"id":"[ADDR-ID-1]","userId":"[CUST-USER-ID]","label":"Home QA Updated","line1":"123 Test Street","line2":null,"city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India","latitude":null,"longitude":null,"isDefault":true,"createdAt":"2026-07-13T18:28:13.235Z","updatedAt":"2026-07-13T18:28:13.683Z","deletedAt":null}}
```

## Customer — Categories & Professionals (read)

```json
GET /categories -> {"success":true,"data":[{"id":"[CAT-ID-cleaning]","name":"Cleaning","description":"","iconName":"Sparkles","color":"#EDE9FD","iconColor":"#5B3EF5","serviceCount":120,"sortOrder":1,"isActive":true,"createdAt":"2026-07-04T12:35:27.827Z","updatedAt":"2026-07-13T17:39:25.039Z"},{"id":"[CAT-ID-plumbing]","name":"Plumbing","description":null,"iconName":"Wrench","col...
```
```json
GET /professionals -> {"success":true,"data":[{"id":"[PART-PROF-ID]","userId":"[PART-USER-ID]","categoryId":"[CAT-ID-ac]","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"10+ years experience in plumbing, AC installation and repair across Mumbai. Certified technician.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","ba...
```
```json
GET /professionals/[PART-PROF-ID] -> {"success":true,"data":{"id":"[PART-PROF-ID]","userId":"[PART-USER-ID]","categoryId":"[CAT-ID-ac]","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"10+ years experience in plumbing, AC installation and repair across Mumbai. Certified technician.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"[REDACTED-STORAGE-URL]"success":true,"data":{"isFavorite":false}}
```
```json
GET /favorites -> {"success":true,"data":[{"id":"[FAV-PROF-ID-1]","userId":null,"categoryId":"[CAT-ID-cleaning]","name":"Priya Sharma","title":"Home Cleaning Expert","bio":"Certified deep cleaning specialist with 7+ years of experience. Trusted by 300+ happy customers.","rating":5,"reviewCount":1,"basePrice":399,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&auto=format","tags":["Deep Clean","Sanitize"],"isActive":true,"createdAt":"2026-07-04T12:35:28.029Z","updatedAt":"2026-07-08T15:25:38.384Z","deletedAt":null,"isFavorite":true},{"id":"[FAV-PROF-ID-2]","userId":null,"categoryId":"[CAT-ID-salon]","name":"Meena Pillai","title":"Beauty & Salon Pro","bio":"Award-winning beauty professional specialising in hair, facials, and bridal makeup.","rating":4.9,"reviewCount":447,"basePrice":599,"priceUnit":"/session","badge":"Top Rated","avatarUrl":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&auto=format","tags":["Hair","Facial"],"isActive":true,"createdAt":"2026-07-04T12:35:28.029Z","updatedAt":"2026-07-04T12:35:28.029Z","deletedAt":null,"isFavorite":true}]}
```

## Customer — Bookings (CRUD)

```json
POST /bookings -> {"success":true,"data":{"id":"[BOOKING-ID-1]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":"[ADDR-ID-1]","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-25T10:00:00.000Z","status":"upcoming","notes":"QA test booking - full flow","price":599,"createdAt":"2026-07-13T18:28:15.379Z","updatedAt":"2026-07-13T18:28:15.379Z","deletedAt":null}}
```
```json
GET /bookings -> {"success":true,"data":[{"id":"[BOOKING-ID-4]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Expert","proName":"Rajan Verma","scheduledAt":"2026-12-01T10:00:00.000Z","status":"cancelled","notes":null,"price":1500,"createdAt":...
```
```json
GET /bookings/[BOOKING-ID-1] -> {"success":true,"data":{"id":"[BOOKING-ID-1]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":"[ADDR-ID-1]","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-25T10:00:00.000Z","status":"upcoming","notes":"QA test booking - full flow","price":599,"createdAt":"2026-07-13T18:28:15.379Z","updatedAt":"2026-07-13T18:28:15.379Z","deletedAt":null}}
```
```json
PATCH /bookings/[BOOKING-ID-1]/reschedule -> {"success":true,"data":{"id":"[BOOKING-ID-1]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":"[ADDR-ID-1]","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-26T14:00:00.000Z","status":"upcoming","notes":"QA test booking - full flow","price":599,"createdAt":"2026-07-13T18:28:15.379Z","updatedAt":"2026-07-13T18:28:16.040Z","deletedAt":null}}
```
```json
GET /bookings/[BOOKING-ID-1]/qr -> {"success":true,"data":{"qrToken":"[REDACTED-JWT]","expiresIn":300}}
```
```json
POST /bookings (second, for cancel test) -> {"success":true,"data":{"id":"[BOOKING-ID-2]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-27T09:00:00.000Z","status":"upcoming","notes":"QA booking to be cancelled","price":599,"createdAt":"2026-07-13T18:28:16.446Z","updatedAt":"2026-07-13T18:28:16.446Z","deletedAt":null}}
```
```json
PATCH /bookings/[BOOKING-ID-2]/cancel -> {"success":true,"data":{"id":"[BOOKING-ID-2]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-27T09:00:00.000Z","status":"cancelled","notes":"QA booking to be cancelled","price":599,"createdAt":"2026-07-13T18:28:16.446Z","updatedAt":"2026-07-13T18:28:16.748Z","deletedAt":null}}
```

## Customer — Points & Rewards

```json
GET /points -> {"success":true,"data":{"balance":20,"redeemableValue":20,"minRedeemPoints":100,"earnRate":"1 point per ₹10 spent","history":[{"id":"[POINTS-TXN-ID-1]","userId":"[CUST-USER-ID]","bookingId":null,"type":"redeem","points":-100,"description":"Redeemed 100 points for ₹100","createdAt":"2026-07-13T10:56:51.197Z"},{"id":"[POINTS-TXN-ID-2]","userId":"[CUST-USER-ID]","bookingId":"[BOOKING-ID-6]","type":"earn","points":60,"description":"Earned from completed booking","createdAt":"2026-07-13T10:56:49.849Z"},{"id":"[POINTS-TXN-ID-3]","userId":"[CUST-USER-ID]","bookingId":"[BOOKING-ID-7]","type":"earn","points":60,"description":"Earned from completed booking","createdAt":"2026-07-13T10:56:30.796Z"}]}}
```

## Customer — Notifications

```json
GET /notifications -> {"success":true,"data":[{"id":"[NOTIF-ID-1]","userId":"[CUST-USER-ID]","title":"Job Completed ✅","body":"Your Plumbing service has been completed. Rate your experience to help others.","type":"booking","isRead":true,"data":null,"createdAt":"2026-07-13T10:09:36.488Z"},{"id":"[NOTIF-ID-2]","userId":"[CUST-USER-ID]
```
```json
GET /notifications/unread-count -> {"success":true,"data":{"count":0}}
```

## Customer — Offers & Platform Policies (public)

```json
GET /offers -> {"success":true,"data":[{"id":"[OFFER-ID-1]","title":"40% Off Your First Booking!","subtitle":"Exclusive for new users — book any service","tag":"WELCOME OFFER","discountText":"40% OFF","bgColor":"#5B3EF5","ctaText":"Claim Now","ctaRoute":"/(tabs)/services","isActive":true,...
```
```json
GET /platform-policies -> {"success":true,"data":[{"id":"[POLICY-ID-1]","slug":"community_guidelines","title":"Community Guidelines","content":"Be respectful to professionals and staff. Harassment, abuse, or discriminatory behaviour will result in account suspension. Payments must be made through the a...
```

## Partner — Profile

```json
GET /partner/profile -> {"success":true,"data":{"id":"[PART-PROF-ID]","userId":"[PART-USER-ID]","categoryId":"[CAT-ID-ac]","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"10+ years experience in plumbing, AC installation and repair across Mumbai. Certified technician.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"[REDACTED-STORAGE-URL]"success":true,"data":{"id":"[PART-PROF-ID]","userId":"[PART-USER-ID]","categoryId":"[CAT-ID-ac]","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"QA-updated bio: 10+ years experience in plumbing, AC installation and repair across Mumbai.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"[REDACTED-STORAGE-URL]","tags":["Plumbing","AC Repair","Installation","Maintenance"],"isActive":true,"createdAt":"2026-07-04T12:35:28.029Z","updatedAt":"2026-07-13T18:28:58.320Z","deletedAt":null}}
```

## Partner — Jobs

```json
GET /partner/jobs -> {"success":true,"data":[{"id":"[BOOKING-ID-4]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Expert","proName":"Rajan Verma","scheduledAt":"2026-12-01T10:00:00.000Z","status":"cancelled","notes":null,"price":1500,"createdAt":"2026-07-13T07:08:51.897Z","updatedAt":"2026-07-13T15:06:34.783Z","customerName":"Priya Sharma","customerPhone":"+91 XXXXX XXXXX"},{"id":"[BOOKING-ID-5]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Expert","proName":"Rajan ...
```
```json
GET /partner/jobs/[BOOKING-ID-4] -> {"success":true,"data":{"id":"[BOOKING-ID-4]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Expert","proName":"Rajan Verma","scheduledAt":"2026-12-01T10:00:00.000Z","status":"cancelled","notes":null,"price":1500,"createdAt":"2026-07-13T07:08:51.897Z","updatedAt":"2026-07-13T15:06:34.783Z","customerName":"Priya Sharma","customerPhone":"+91 XXXXX XXXXX"}}
```

## Partner — Earnings & Payouts

```json
GET /partner/earnings -> {"success":true,"data":{"total":4418,"thisMonth":4418,"today":1200,"completedJobs":5,"weekly":[{"date":"2026-07-07","amount":0},{"date":"2026-07-08","amount":0},{"date":"2026-07-09","amount":2222},{"date":"2026-07-10","amount":0},{"date":"2026-07-11","amount":0},{"date":"2026-07-12","amount":0},{"date":"2026-07-13","amount":0}],"pendingPayout":100,"paidOut":0,"available":4318}}
```
```json
POST /partner/payouts {amount:100} -> {"success":true,"data":{"id":"[PAYOUT-ID-1]","professionalId":"[PART-PROF-ID]","amount":100,"status":"pending","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":null}}
```
```json
GET /partner/payouts -> {"success":true,"data":[{"id":"[PAYOUT-ID-1]","professionalId":"[PART-PROF-ID]","amount":100,"status":"pending","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":null},{"id":"[PAYOUT-ID-2]","professionalId":"[PART-PROF-ID]","amount":100,"status":"pending","note":null,"requestedAt":"2026-07-08T20:35:11.000Z","resolvedAt":null}]}
```

## Partner — Check-in / Complete Job (full lifecycle)

```json
POST /bookings (new job for lifecycle test) -> {"success":true,"data":{"id":"[BOOKING-ID-3]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"upcoming","notes":"QA job for checkin/complete flow","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:16.098Z","deletedAt":null}}
```
```json
PATCH /partner/jobs/[BOOKING-ID-3]/checkin -> {"success":true,"data":{"id":"[BOOKING-ID-3]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"in_progress","notes":"QA job for checkin/complete flow","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:16.839Z","deletedAt":null}}
```
```json
PATCH /partner/jobs/[BOOKING-ID-3]/complete -> {"success":true,"data":{"id":"[BOOKING-ID-3]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"completed","notes":"QA job for checkin/complete flow","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:17.361Z","deletedAt":null}}
```

## Customer — Reviews

```json
POST /reviews -> {"success":true,"data":{"id":"[REVIEW-ID-1]","bookingId":"[BOOKING-ID-3]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","rating":5,"comment":"QA test review — excellent service!","createdAt":"2026-07-13T18:29:17.757Z","updatedAt":"2026-07-13T18:29:17.757Z"}}
```

## Admin — Dashboard Stats

```json
GET /admin/stats -> {"success":true,"data":{"totalBookings":210,"totalRevenue":196773,"activeBookings":57,"totalProfessionals":38,"totalCustomers":24}}
```

## Admin — Bookings management

```json
GET /admin/bookings -> {"success":true,"data":{"bookings":[{"id":"[BOOKING-ID-3]","status":"completed","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","price":599,"notes":"QA job for checkin/complete flow","scheduledAt":"2026-07-13T18:30:00.000Z","createdAt":"2026-07-13T18:29:16.098Z","customerName":"Priya Sharma","customerEmail":"customer@servenow.in"},{"id":"[BOOKING-ID-2]","status":"cancelled","serviceName":"Senior Plumber & AC Expert","proName":"Rajan ...
```
```json
PATCH /admin/bookings/[BOOKING-ID-3] {notes} -> {"success":true,"data":{"id":"[BOOKING-ID-3]","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","categoryId":"[CAT-ID-ac]","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"completed","notes":"QA admin-edited note","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:41.323Z","deletedAt":null}}
```

## Admin — Professionals management

```json
GET /admin/professionals -> {"success":true,"data":{"professionals":[{"id":"[PROF-ID-2]","name":"Prakash Rao","title":"Refrigeration & AC Expert","bio":"Updated bio via QA test","rating":4.7,"reviewCount":167,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","tags":["Refrigerator","Compressor","Gas Top-Up","PCB Repair","Cooling"],"isActive":false,"avatarUrl":null,"categoryId":"[CAT-ID-acrepair]","categoryName":"AC Repair","createdAt":"2026-07-05T20:56:24.170Z"},{"id":"0148...
```
```json
PATCH /admin/professionals/.../suspend -> {"success":true,"data":{"id":"[PART-PROF-ID]","isActive":false}}
```
```json
PATCH /admin/professionals/.../activate -> {"success":true,"data":{"id":"[PART-PROF-ID]","isActive":true}}
```

## Admin — Users

```json
GET /admin/users -> {"success":true,"data":{"users":[{"id":"[USER-ID-3]","fullName":"Riyaz Test","email":"[REDACTED-EMAIL]","phone":"+91XXXXXXXXXX","role":"customer","isActive":true,"avatarUrl":null,"createdAt":"2026-07-13T17:55:57.353Z"},{"id":"[USER-ID-4]","fullName":"Test Flow","email":"testflow@example.com","phone":"+91XXXXXXXXXX","role":"customer","isActive":true,"avatarUrl":null,"createdAt":"2026-07-13T17:41:53.704Z"},{"id":"[USER-ID-5]...
```

## Admin — Categories (CRUD)

```json
POST /admin/categories -> {"success":true,"data":{"id":"[QA-CAT-ID]","name":"QA Test Category","description":null,"iconName":"Sparkles","color":"#EDE9FD","iconColor":"#5B3EF5","serviceCount":0,"sortOrder":99,"isActive":true,"createdAt":"2026-07-13T18:29:43.506Z","updatedAt":"2026-07-13T18:29:43.506Z"}}
```
```json
PATCH /admin/categories/[QA-CAT-ID] -> {"success":true,"data":{"id":"[QA-CAT-ID]","name":"QA Test Category","description":null,"iconName":"Sparkles","color":"#EDE9FD","iconColor":"#5B3EF5","serviceCount":0,"sortOrder":99,"isActive":true,"createdAt":"2026-07-13T18:29:43.506Z","updatedAt":"2026-07-13T18:29:44.063Z"}}
```
```json
DELETE /admin/categories/[QA-CAT-ID] -> {"success":true,"data":{"id":"[QA-CAT-ID]"}}
```

## Admin — Offers (CRUD)

```json
POST /admin/offers -> {"success":true,"data":{"id":"[QA-OFFER-ID]","title":"QA Test Offer","subtitle":"QA subtitle","tag":"QA","discountText":"10% OFF","bgColor":"#5B3EF5","ctaText":"Try","ctaRoute":"/","isActive":true,"sortOrder":0,"expiresAt":null,"createdAt":"2026-07-13T18:29:44.977Z","updatedAt":"2026-07-13T18:29:44.977Z"}}
```
```json
DELETE /admin/offers/[QA-OFFER-ID] -> {"success":true,"data":{"id":"[QA-OFFER-ID]"}}
```

## Admin — Reviews & Audit log & Payouts

```json
GET /admin/reviews -> {"success":true,"data":{"reviews":[{"id":"[REVIEW-ID-1]","rating":5,"comment":"QA test review — excellent service!","createdAt":"2026-07-13T18:29:17.757Z","customerId":"[CUST-USER-ID]","professionalId":"[PART-PROF-ID]","customerName":"Priya Sharma","customerEmail":"customer@servenow.in","proName":"Rajan Verma"},{"id":"[REVIEW-ID-2]...
```
```json
GET /admin/audit-logs -> {"success":true,"data":{"logs":[{"id":"[AUDIT-ID-1]","adminId":"[ADMIN-USER-ID]","action":"category.delete","targetType":"category","targetId":"[QA-CAT-ID]","metadata":{},"createdAt":"2026-07-13T18:29:44.712Z"},{"id":"[AUDIT-ID-2]","adminId":"[ADMIN-USER-ID]","action":"category.update...
```
```json
GET /admin/payouts -> {"success":true,"data":{"payouts":[{"id":"[PAYOUT-ID-1]","professionalId":"[PART-PROF-ID]","proName":"Rajan Verma","amount":100,"status":"pending","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":null},{"id":"[PAYOUT-ID-2]","professionalId":"[PART-PROF-ID]","proName":"Rajan Verma","amount":100,"status":"pending","note":null,"requestedAt":"2026-07-08T20:35:11.000Z","resol...
```
```json
PATCH /admin/payouts/5d6f9189.../ {status: approved} -> {"success":false,"error":{"message":"status must be \"paid\" or \"rejected\""}}
```
```json
PATCH /admin/payouts/5d6f9189.../ {status: paid} -> {"success":true,"data":{"id":"[PAYOUT-ID-1]","professionalId":"[PART-PROF-ID]","amount":100,"status":"paid","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":"2026-07-13T18:30:00.762Z"}}
```

## Support Tickets

```json
POST /support-tickets -> {"success":false,"error":{"message":"name, email, subject, message are all required."}}
```
```json
GET /support-tickets/mine -> {"success":true,"data":[{"id":"[TICKET-ID-1]","userId":"[CUST-USER-ID]","name":"Rahul Verma","email":"customer@servenow.in","subject":"Partner arrived 2 hours late without any notice","message":"I booked an AC service for 10 AM but the partner arrived at 12 PM with no prior notification. I had to cancel an office meeting to wait. Please look into this.","status":"in_progress","response":"We are looking into this.","createdAt":"2026-07-13T10:11:44.968Z","updatedAt":"2026-07-13T13:25:37.887Z"},{"id":"[TICKET-ID-2]","userId":"[CUST-USER-ID]","name":"Rahul Verma","email":"customer@servenow.in","subject":"Bookings tab showing empty — past bookings missing","message":"The Bookings tab is completely empty even though I made 3 bookings last month. The 5 July booking is confirmed but not showing. Please fix.","status":"open","response":null,"createdAt":"2026-07-13T10:11:44.968Z","updatedAt":"2026-07-13T10:11:44.968Z"}]}
```
```json
POST /support-tickets (corrected payload) -> {"success":true,"data":{"id":"[TICKET-ID-3]","userId":"[CUST-USER-ID]","name":"Priya Sharma","email":"customer@servenow.in","subject":"QA test ticket","message":"This is a QA test support ticket.","status":"open","response":null,"createdAt":"2026-07-13T18:30:10.577Z","updatedAt":"2026-07-13T18:30:10.577Z"}}
```
