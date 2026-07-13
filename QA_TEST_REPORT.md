# ServeNow QA Test Report — 2026-07-13 18:28 UTC


## Auth — Login (all roles)

```json
customer login: {"success":true,"data":{"user":{"id":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","email":"customer@servenow.in","phone":"+91 98765 43210","fullName":"Priya Sharma","avatarUrl":"https://ugcbxncpipowxqtsczpy.supabase.co/storage/v1/object/public/avatars/fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0/avatar-1783924436...
partner login: {"success":true,"data":{"user":{"id":"4f96622c-43d6-4bc2-8b03-1d32913d3973","email":"partner@servenow.in","phone":"+91 98765 43211","fullName":"Rajan Vermaa","avatarUrl":null,"role":"partner","emailVerified":true,"createdAt":"2026-07-06T13:25:04.164Z"},"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...
admin login: {"success":true,"data":{"user":{"id":"a984920a-743e-4b5f-8e4f-23756a3cadf7","email":"admin@servenow.in","phone":"+91 98765 43210","fullName":"Admin ServeNow","avatarUrl":null,"role":"admin","emailVerified":true,"createdAt":"2026-07-06T13:25:03.960Z"},"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC...
```

## Customer — Profile

```json
GET /profile/me -> {"success":true,"data":{"id":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","email":"customer@servenow.in","phone":"+91 98765 43210","fullName":"Priya Sharma","avatarUrl":"https://ugcbxncpipowxqtsczpy.supabase.co/storage/v1/object/public/avatars/fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0/avatar-1783924436739.jpg","role":"customer","emailVerified":true,"createdAt":"2026-07-06T13:25:04.297Z"}}
```
```json
PATCH /profile/me {fullName: Priya Sharma QA} -> {"success":true,"data":{"id":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","email":"customer@servenow.in","phone":"+91 98765 43210","fullName":"Priya Sharma QA","avatarUrl":"https://ugcbxncpipowxqtsczpy.supabase.co/storage/v1/object/public/avatars/fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0/avatar-1783924436739.jpg","role":"customer","emailVerified":true,"createdAt":"2026-07-06T13:25:04.297Z"}}
```

## Customer — Addresses (CRUD)

```json
POST /addresses -> {"success":true,"data":{"id":"83e76ce0-e5fe-4309-87d3-837fe9cdffe8","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Home QA","line1":"123 Test Street","line2":null,"city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India","latitude":null,"longitude":null,"isDefault":true,"createdAt":"2026-07-13T18:28:13.235Z","updatedAt":"2026-07-13T18:28:13.235Z","deletedAt":null}}
```
```json
GET /addresses -> {"success":true,"data":[{"id":"83e76ce0-e5fe-4309-87d3-837fe9cdffe8","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Home QA","line1":"123 Test Street","line2":null,"city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India","latitude":null,"longitude":null,"isDefault":true,"createdAt":"2026-07-13T18:28:13.235Z","updatedAt":"2026-07-13T18:28:13.235Z","deletedAt":null},{"id":"014946f3-378c-4d48-a505-3d75a54824b5","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Other","line1":"Plot 7, DLF Phase 2","line2":"Near Rapid Metro Station","city":"Gurugram","state":"Haryana","postalCode":"122008","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.594Z","updatedAt":"2026-07-13T14:22:03.594Z","deletedAt":null},{"id":"c30be4be-db55-447f-940c-835495497372","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Other","line1":"23, Linking Road","line2":"Bandra West","city":"Mumbai","state":"Maharashtra","postalCode":"400050","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.462Z","updatedAt":"2026-07-13T14:22:03.462Z","deletedAt":null},{"id":"2455cf97-3b4a-4411-aa6e-b0aa36aeecdc","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Work","line1":"10th Floor, BKC Tower","line2":"Bandra Kurla Complex","city":"Mumbai","state":"Maharashtra","postalCode":"400051","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.328Z","updatedAt":"2026-07-13T14:22:03.328Z","deletedAt":null},{"id":"6d6a8c19-72ce-4628-95b5-a3d429b7b4a1","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Home","line1":"Flat 4B, Sunrise Apartments","line2":"Near City Mall, Andheri West","city":"Mumbai","state":"Maharashtra","postalCode":"400053","country":"India","latitude":null,"longitude":null,"isDefault":false,"createdAt":"2026-07-13T14:22:03.199Z","updatedAt":"2026-07-13T14:22:03.199Z","deletedAt":null}]}
```
```json
PATCH /addresses/83e76ce0-e5fe-4309-87d3-837fe9cdffe8 -> {"success":true,"data":{"id":"83e76ce0-e5fe-4309-87d3-837fe9cdffe8","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","label":"Home QA Updated","line1":"123 Test Street","line2":null,"city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India","latitude":null,"longitude":null,"isDefault":true,"createdAt":"2026-07-13T18:28:13.235Z","updatedAt":"2026-07-13T18:28:13.683Z","deletedAt":null}}
```

## Customer — Categories & Professionals (read)

```json
GET /categories -> {"success":true,"data":[{"id":"aac8f0d9-f174-40f8-92d6-efcb68592d8c","name":"Cleaning","description":"","iconName":"Sparkles","color":"#EDE9FD","iconColor":"#5B3EF5","serviceCount":120,"sortOrder":1,"isActive":true,"createdAt":"2026-07-04T12:35:27.827Z","updatedAt":"2026-07-13T17:39:25.039Z"},{"id":"02922b73-1d60-4905-835d-77e9efdd7c6b","name":"Plumbing","description":null,"iconName":"Wrench","col...
```
```json
GET /professionals -> {"success":true,"data":[{"id":"86858cf6-4a2e-409c-88de-8344237d1a6a","userId":"4f96622c-43d6-4bc2-8b03-1d32913d3973","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"10+ years experience in plumbing, AC installation and repair across Mumbai. Certified technician.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","ba...
```
```json
GET /professionals/86858cf6-4a2e-409c-88de-8344237d1a6a -> {"success":true,"data":{"id":"86858cf6-4a2e-409c-88de-8344237d1a6a","userId":"4f96622c-43d6-4bc2-8b03-1d32913d3973","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"10+ years experience in plumbing, AC installation and repair across Mumbai. Certified technician.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"https://ugcbxncpipowxqtsczpy.supabase.co/storage/v1/object/public/avata...
```

## Customer — Favorites

```json
POST /favorites/86858cf6-4a2e-409c-88de-8344237d1a6a -> {"success":true,"data":{"isFavorite":false}}
```
```json
GET /favorites -> {"success":true,"data":[{"id":"778ab2b2-4cac-4178-8692-cdcb742b8cbf","userId":null,"categoryId":"aac8f0d9-f174-40f8-92d6-efcb68592d8c","name":"Priya Sharma","title":"Home Cleaning Expert","bio":"Certified deep cleaning specialist with 7+ years of experience. Trusted by 300+ happy customers.","rating":5,"reviewCount":1,"basePrice":399,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&auto=format","tags":["Deep Clean","Sanitize"],"isActive":true,"createdAt":"2026-07-04T12:35:28.029Z","updatedAt":"2026-07-08T15:25:38.384Z","deletedAt":null,"isFavorite":true},{"id":"fdfa0bff-7f25-4efc-8edd-ebd512c66301","userId":null,"categoryId":"578df177-545a-414f-9e5d-a1999f484fc4","name":"Meena Pillai","title":"Beauty & Salon Pro","bio":"Award-winning beauty professional specialising in hair, facials, and bridal makeup.","rating":4.9,"reviewCount":447,"basePrice":599,"priceUnit":"/session","badge":"Top Rated","avatarUrl":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&auto=format","tags":["Hair","Facial"],"isActive":true,"createdAt":"2026-07-04T12:35:28.029Z","updatedAt":"2026-07-04T12:35:28.029Z","deletedAt":null,"isFavorite":true}]}
```

## Customer — Bookings (CRUD)

```json
POST /bookings -> {"success":true,"data":{"id":"334073ec-f6a8-44be-b086-94aee4f0e19f","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":"83e76ce0-e5fe-4309-87d3-837fe9cdffe8","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-25T10:00:00.000Z","status":"upcoming","notes":"QA test booking - full flow","price":599,"createdAt":"2026-07-13T18:28:15.379Z","updatedAt":"2026-07-13T18:28:15.379Z","deletedAt":null}}
```
```json
GET /bookings -> {"success":true,"data":[{"id":"0f463dbe-25a7-4808-8d91-75fb826d42e7","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Expert","proName":"Rajan Verma","scheduledAt":"2026-12-01T10:00:00.000Z","status":"cancelled","notes":null,"price":1500,"createdAt":...
```
```json
GET /bookings/334073ec-f6a8-44be-b086-94aee4f0e19f -> {"success":true,"data":{"id":"334073ec-f6a8-44be-b086-94aee4f0e19f","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":"83e76ce0-e5fe-4309-87d3-837fe9cdffe8","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-25T10:00:00.000Z","status":"upcoming","notes":"QA test booking - full flow","price":599,"createdAt":"2026-07-13T18:28:15.379Z","updatedAt":"2026-07-13T18:28:15.379Z","deletedAt":null}}
```
```json
PATCH /bookings/334073ec-f6a8-44be-b086-94aee4f0e19f/reschedule -> {"success":true,"data":{"id":"334073ec-f6a8-44be-b086-94aee4f0e19f","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":"83e76ce0-e5fe-4309-87d3-837fe9cdffe8","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-26T14:00:00.000Z","status":"upcoming","notes":"QA test booking - full flow","price":599,"createdAt":"2026-07-13T18:28:15.379Z","updatedAt":"2026-07-13T18:28:16.040Z","deletedAt":null}}
```
```json
GET /bookings/334073ec-f6a8-44be-b086-94aee4f0e19f/qr -> {"success":true,"data":{"qrToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib29raW5nSWQiOiIzMzQwNzNlYy1mNmE4LTQ0YmUtYjA4Ni05NGFlZTRmMGUxOWYiLCJ0eXAiOiJjaGVja2luIiwiaWF0IjoxNzgzOTY3Mjk2LCJleHAiOjE3ODM5Njc1OTZ9.FjycODHgYnzbkUrgBbT0w0QHzXoBzRLDfr7ek7b3Ego","expiresIn":300}}
```
```json
POST /bookings (second, for cancel test) -> {"success":true,"data":{"id":"14b2ad99-b255-4327-8ab8-cb0cb35339e6","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-27T09:00:00.000Z","status":"upcoming","notes":"QA booking to be cancelled","price":599,"createdAt":"2026-07-13T18:28:16.446Z","updatedAt":"2026-07-13T18:28:16.446Z","deletedAt":null}}
```
```json
PATCH /bookings/14b2ad99-b255-4327-8ab8-cb0cb35339e6/cancel -> {"success":true,"data":{"id":"14b2ad99-b255-4327-8ab8-cb0cb35339e6","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-27T09:00:00.000Z","status":"cancelled","notes":"QA booking to be cancelled","price":599,"createdAt":"2026-07-13T18:28:16.446Z","updatedAt":"2026-07-13T18:28:16.748Z","deletedAt":null}}
```

## Customer — Points & Rewards

```json
GET /points -> {"success":true,"data":{"balance":20,"redeemableValue":20,"minRedeemPoints":100,"earnRate":"1 point per ₹10 spent","history":[{"id":"37f104a8-66a4-4e77-bb64-556c1a23a004","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","bookingId":null,"type":"redeem","points":-100,"description":"Redeemed 100 points for ₹100","createdAt":"2026-07-13T10:56:51.197Z"},{"id":"db1d254b-d8c3-4399-84c5-dcab2264e42f","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","bookingId":"5a0a1973-8958-453f-81d9-3c59acf041d0","type":"earn","points":60,"description":"Earned from completed booking","createdAt":"2026-07-13T10:56:49.849Z"},{"id":"de48b947-e861-4af8-bad9-cf070f771140","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","bookingId":"4148741b-e12c-4db7-811c-9c365c657565","type":"earn","points":60,"description":"Earned from completed booking","createdAt":"2026-07-13T10:56:30.796Z"}]}}
```

## Customer — Notifications

```json
GET /notifications -> {"success":true,"data":[{"id":"8eff3267-8318-47d9-bc7c-960ead005728","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","title":"Job Completed ✅","body":"Your Plumbing service has been completed. Rate your experience to help others.","type":"booking","isRead":true,"data":null,"createdAt":"2026-07-13T10:09:36.488Z"},{"id":"712c65da-9ede-452e-86a3-21882844f605","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc...
```
```json
GET /notifications/unread-count -> {"success":true,"data":{"count":0}}
```

## Customer — Offers & Platform Policies (public)

```json
GET /offers -> {"success":true,"data":[{"id":"b4d7f16a-ca51-4390-9855-6e7fb61b58ad","title":"40% Off Your First Booking!","subtitle":"Exclusive for new users — book any service","tag":"WELCOME OFFER","discountText":"40% OFF","bgColor":"#5B3EF5","ctaText":"Claim Now","ctaRoute":"/(tabs)/services","isActive":true,...
```
```json
GET /platform-policies -> {"success":true,"data":[{"id":"7bd1d042-4c67-4048-906f-c271c947a902","slug":"community_guidelines","title":"Community Guidelines","content":"Be respectful to professionals and staff. Harassment, abuse, or discriminatory behaviour will result in account suspension. Payments must be made through the a...
```

## Partner — Profile

```json
GET /partner/profile -> {"success":true,"data":{"id":"86858cf6-4a2e-409c-88de-8344237d1a6a","userId":"4f96622c-43d6-4bc2-8b03-1d32913d3973","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"10+ years experience in plumbing, AC installation and repair across Mumbai. Certified technician.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"https://ugcbxncpipowxqtsczpy.supabase.co/storage/v1/object/public/avata...
```
```json
PATCH /partner/profile {bio} -> {"success":true,"data":{"id":"86858cf6-4a2e-409c-88de-8344237d1a6a","userId":"4f96622c-43d6-4bc2-8b03-1d32913d3973","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","name":"Rajan Verma","title":"Senior Plumber & AC Expert","bio":"QA-updated bio: 10+ years experience in plumbing, AC installation and repair across Mumbai.","rating":5,"reviewCount":2,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","avatarUrl":"https://ugcbxncpipowxqtsczpy.supabase.co/storage/v1/object/public/avatars/4f96622c-43d6-4bc2-8b03-1d32913d3973/avatar-1783927679203.jpg","tags":["Plumbing","AC Repair","Installation","Maintenance"],"isActive":true,"createdAt":"2026-07-04T12:35:28.029Z","updatedAt":"2026-07-13T18:28:58.320Z","deletedAt":null}}
```

## Partner — Jobs

```json
GET /partner/jobs -> {"success":true,"data":[{"id":"0f463dbe-25a7-4808-8d91-75fb826d42e7","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Expert","proName":"Rajan Verma","scheduledAt":"2026-12-01T10:00:00.000Z","status":"cancelled","notes":null,"price":1500,"createdAt":"2026-07-13T07:08:51.897Z","updatedAt":"2026-07-13T15:06:34.783Z","customerName":"Priya Sharma","customerPhone":"+91 98765 43210"},{"id":"0c8f4217-038c-4ca3-874b-710cabe00149","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Expert","proName":"Rajan ...
```
```json
GET /partner/jobs/0f463dbe-25a7-4808-8d91-75fb826d42e7 -> {"success":true,"data":{"id":"0f463dbe-25a7-4808-8d91-75fb826d42e7","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Expert","proName":"Rajan Verma","scheduledAt":"2026-12-01T10:00:00.000Z","status":"cancelled","notes":null,"price":1500,"createdAt":"2026-07-13T07:08:51.897Z","updatedAt":"2026-07-13T15:06:34.783Z","customerName":"Priya Sharma","customerPhone":"+91 98765 43210"}}
```

## Partner — Earnings & Payouts

```json
GET /partner/earnings -> {"success":true,"data":{"total":4418,"thisMonth":4418,"today":1200,"completedJobs":5,"weekly":[{"date":"2026-07-07","amount":0},{"date":"2026-07-08","amount":0},{"date":"2026-07-09","amount":2222},{"date":"2026-07-10","amount":0},{"date":"2026-07-11","amount":0},{"date":"2026-07-12","amount":0},{"date":"2026-07-13","amount":0}],"pendingPayout":100,"paidOut":0,"available":4318}}
```
```json
POST /partner/payouts {amount:100} -> {"success":true,"data":{"id":"5d6f9189-f4a7-455a-82ed-e483686fc6d1","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","amount":100,"status":"pending","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":null}}
```
```json
GET /partner/payouts -> {"success":true,"data":[{"id":"5d6f9189-f4a7-455a-82ed-e483686fc6d1","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","amount":100,"status":"pending","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":null},{"id":"1c63fe8f-4cb6-4ed3-8055-a9aa9e692390","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","amount":100,"status":"pending","note":null,"requestedAt":"2026-07-08T20:35:11.000Z","resolvedAt":null}]}
```

## Partner — Check-in / Complete Job (full lifecycle)

```json
POST /bookings (new job for lifecycle test) -> {"success":true,"data":{"id":"078f1c15-bcb5-439a-9840-1e4ff146b3e4","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"upcoming","notes":"QA job for checkin/complete flow","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:16.098Z","deletedAt":null}}
```
```json
PATCH /partner/jobs/078f1c15-bcb5-439a-9840-1e4ff146b3e4/checkin -> {"success":true,"data":{"id":"078f1c15-bcb5-439a-9840-1e4ff146b3e4","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"in_progress","notes":"QA job for checkin/complete flow","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:16.839Z","deletedAt":null}}
```
```json
PATCH /partner/jobs/078f1c15-bcb5-439a-9840-1e4ff146b3e4/complete -> {"success":true,"data":{"id":"078f1c15-bcb5-439a-9840-1e4ff146b3e4","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"completed","notes":"QA job for checkin/complete flow","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:17.361Z","deletedAt":null}}
```

## Customer — Reviews

```json
POST /reviews -> {"success":true,"data":{"id":"5eb5b619-afc2-4841-b0fc-88bc7e633061","bookingId":"078f1c15-bcb5-439a-9840-1e4ff146b3e4","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","rating":5,"comment":"QA test review — excellent service!","createdAt":"2026-07-13T18:29:17.757Z","updatedAt":"2026-07-13T18:29:17.757Z"}}
```

## Admin — Dashboard Stats

```json
GET /admin/stats -> {"success":true,"data":{"totalBookings":210,"totalRevenue":196773,"activeBookings":57,"totalProfessionals":38,"totalCustomers":24}}
```

## Admin — Bookings management

```json
GET /admin/bookings -> {"success":true,"data":{"bookings":[{"id":"078f1c15-bcb5-439a-9840-1e4ff146b3e4","status":"completed","serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","price":599,"notes":"QA job for checkin/complete flow","scheduledAt":"2026-07-13T18:30:00.000Z","createdAt":"2026-07-13T18:29:16.098Z","customerName":"Priya Sharma","customerEmail":"customer@servenow.in"},{"id":"14b2ad99-b255-4327-8ab8-cb0cb35339e6","status":"cancelled","serviceName":"Senior Plumber & AC Expert","proName":"Rajan ...
```
```json
PATCH /admin/bookings/078f1c15-bcb5-439a-9840-1e4ff146b3e4 {notes} -> {"success":true,"data":{"id":"078f1c15-bcb5-439a-9840-1e4ff146b3e4","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","categoryId":"10c41b25-272f-4030-b592-05bb6aad6067","addressId":null,"serviceName":"Senior Plumber & AC Expert","proName":"Rajan Verma","scheduledAt":"2026-07-13T18:30:00.000Z","status":"completed","notes":"QA admin-edited note","price":599,"createdAt":"2026-07-13T18:29:16.098Z","updatedAt":"2026-07-13T18:29:41.323Z","deletedAt":null}}
```

## Admin — Professionals management

```json
GET /admin/professionals -> {"success":true,"data":{"professionals":[{"id":"f5bee710-8899-44f5-a861-ae79c2a7d759","name":"Prakash Rao","title":"Refrigeration & AC Expert","bio":"Updated bio via QA test","rating":4.7,"reviewCount":167,"basePrice":599,"priceUnit":"/visit","badge":"Top Rated","tags":["Refrigerator","Compressor","Gas Top-Up","PCB Repair","Cooling"],"isActive":false,"avatarUrl":null,"categoryId":"914feff1-7cbf-4306-9026-983d6d919cf1","categoryName":"AC Repair","createdAt":"2026-07-05T20:56:24.170Z"},{"id":"0148...
```
```json
PATCH /admin/professionals/.../suspend -> {"success":true,"data":{"id":"86858cf6-4a2e-409c-88de-8344237d1a6a","isActive":false}}
```
```json
PATCH /admin/professionals/.../activate -> {"success":true,"data":{"id":"86858cf6-4a2e-409c-88de-8344237d1a6a","isActive":true}}
```

## Admin — Users

```json
GET /admin/users -> {"success":true,"data":{"users":[{"id":"99d975b4-5152-4f53-aaec-446b82072ac2","fullName":"Riyaz Test","email":"riyazuddins106@gmail.com","phone":"+919876500000","role":"customer","isActive":true,"avatarUrl":null,"createdAt":"2026-07-13T17:55:57.353Z"},{"id":"70eb5fdd-b769-495b-9dad-ef1ae1b3504b","fullName":"Test Flow","email":"testflow@example.com","phone":"+919876543210","role":"customer","isActive":true,"avatarUrl":null,"createdAt":"2026-07-13T17:41:53.704Z"},{"id":"86f2ea34-0ad2-4225-ae7b-3c9...
```

## Admin — Categories (CRUD)

```json
POST /admin/categories -> {"success":true,"data":{"id":"0cdb2dcc-627b-46bb-8ed8-08a18ea7d086","name":"QA Test Category","description":null,"iconName":"Sparkles","color":"#EDE9FD","iconColor":"#5B3EF5","serviceCount":0,"sortOrder":99,"isActive":true,"createdAt":"2026-07-13T18:29:43.506Z","updatedAt":"2026-07-13T18:29:43.506Z"}}
```
```json
PATCH /admin/categories/0cdb2dcc-627b-46bb-8ed8-08a18ea7d086 -> {"success":true,"data":{"id":"0cdb2dcc-627b-46bb-8ed8-08a18ea7d086","name":"QA Test Category","description":null,"iconName":"Sparkles","color":"#EDE9FD","iconColor":"#5B3EF5","serviceCount":0,"sortOrder":99,"isActive":true,"createdAt":"2026-07-13T18:29:43.506Z","updatedAt":"2026-07-13T18:29:44.063Z"}}
```
```json
DELETE /admin/categories/0cdb2dcc-627b-46bb-8ed8-08a18ea7d086 -> {"success":true,"data":{"id":"0cdb2dcc-627b-46bb-8ed8-08a18ea7d086"}}
```

## Admin — Offers (CRUD)

```json
POST /admin/offers -> {"success":true,"data":{"id":"6ff9f0f1-2e85-4b89-8e43-04d2303331f7","title":"QA Test Offer","subtitle":"QA subtitle","tag":"QA","discountText":"10% OFF","bgColor":"#5B3EF5","ctaText":"Try","ctaRoute":"/","isActive":true,"sortOrder":0,"expiresAt":null,"createdAt":"2026-07-13T18:29:44.977Z","updatedAt":"2026-07-13T18:29:44.977Z"}}
```
```json
DELETE /admin/offers/6ff9f0f1-2e85-4b89-8e43-04d2303331f7 -> {"success":true,"data":{"id":"6ff9f0f1-2e85-4b89-8e43-04d2303331f7"}}
```

## Admin — Reviews & Audit log & Payouts

```json
GET /admin/reviews -> {"success":true,"data":{"reviews":[{"id":"5eb5b619-afc2-4841-b0fc-88bc7e633061","rating":5,"comment":"QA test review — excellent service!","createdAt":"2026-07-13T18:29:17.757Z","customerId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","customerName":"Priya Sharma","customerEmail":"customer@servenow.in","proName":"Rajan Verma"},{"id":"dc8f16de-9f...
```
```json
GET /admin/audit-logs -> {"success":true,"data":{"logs":[{"id":"e6b73e5f-c55e-4eed-a95d-89984f323200","adminId":"a984920a-743e-4b5f-8e4f-23756a3cadf7","action":"category.delete","targetType":"category","targetId":"0cdb2dcc-627b-46bb-8ed8-08a18ea7d086","metadata":{},"createdAt":"2026-07-13T18:29:44.712Z"},{"id":"5989868b-fb5f-4c74-b7a5-3fbb967fac21","adminId":"a984920a-743e-4b5f-8e4f-23756a3cadf7","action":"category.update...
```
```json
GET /admin/payouts -> {"success":true,"data":{"payouts":[{"id":"5d6f9189-f4a7-455a-82ed-e483686fc6d1","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","proName":"Rajan Verma","amount":100,"status":"pending","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":null},{"id":"1c63fe8f-4cb6-4ed3-8055-a9aa9e692390","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","proName":"Rajan Verma","amount":100,"status":"pending","note":null,"requestedAt":"2026-07-08T20:35:11.000Z","resol...
```
```json
PATCH /admin/payouts/5d6f9189.../ {status: approved} -> {"success":false,"error":{"message":"status must be \"paid\" or \"rejected\""}}
```
```json
PATCH /admin/payouts/5d6f9189.../ {status: paid} -> {"success":true,"data":{"id":"5d6f9189-f4a7-455a-82ed-e483686fc6d1","professionalId":"86858cf6-4a2e-409c-88de-8344237d1a6a","amount":100,"status":"paid","note":"QA test payout request","requestedAt":"2026-07-13T18:29:00.324Z","resolvedAt":"2026-07-13T18:30:00.762Z"}}
```

## Support Tickets

```json
POST /support-tickets -> {"success":false,"error":{"message":"name, email, subject, message are all required."}}
```
```json
GET /support-tickets/mine -> {"success":true,"data":[{"id":"b3edb7c7-4ad1-4c1b-984f-9e31e14c361e","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","name":"Rahul Verma","email":"customer@servenow.in","subject":"Partner arrived 2 hours late without any notice","message":"I booked an AC service for 10 AM but the partner arrived at 12 PM with no prior notification. I had to cancel an office meeting to wait. Please look into this.","status":"in_progress","response":"We are looking into this.","createdAt":"2026-07-13T10:11:44.968Z","updatedAt":"2026-07-13T13:25:37.887Z"},{"id":"f43f1a7c-e053-4a3f-ac42-f9d996c52dba","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","name":"Rahul Verma","email":"customer@servenow.in","subject":"Bookings tab showing empty — past bookings missing","message":"The Bookings tab is completely empty even though I made 3 bookings last month. The 5 July booking is confirmed but not showing. Please fix.","status":"open","response":null,"createdAt":"2026-07-13T10:11:44.968Z","updatedAt":"2026-07-13T10:11:44.968Z"}]}
```
```json
POST /support-tickets (corrected payload) -> {"success":true,"data":{"id":"e20cd00d-41dc-44bb-90ef-249c4b8181ec","userId":"fcf0dd22-e37d-4e0a-a06e-f81bc0eacff0","name":"Priya Sharma","email":"customer@servenow.in","subject":"QA test ticket","message":"This is a QA test support ticket.","status":"open","response":null,"createdAt":"2026-07-13T18:30:10.577Z","updatedAt":"2026-07-13T18:30:10.577Z"}}
```
