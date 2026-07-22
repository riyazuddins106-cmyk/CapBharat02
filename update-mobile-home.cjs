const fs = require('fs');
let content = fs.readFileSync('apps/mobile/app/(tabs)/index.tsx', 'utf8');

const featuredOld = `          featuredServices.slice(0, 6).map((service) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: '/(tabs)/services',
                params: { categoryId: service.categoryId, subCategoryId: service.subCategoryId ?? undefined },
              })}
              style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {service.images?.[0] ? (
                <Image source={{ uri: service.images[0] }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { backgroundColor: colors.muted }]} />
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.productTitleRow}>
                  <Text numberOfLines={2} style={[styles.productName, { color: colors.foreground }]}>{service.name}</Text>
                  {service.badge && <Text style={styles.productBadge}>{service.badge}</Text>}
                </View>
                <Text numberOfLines={2} style={[styles.productDescription, { color: colors.mutedForeground }]}>{service.description}</Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>
                  ₹{service.customerPrice} · {service.duration} min
                </Text>
              </View>
            </TouchableOpacity>
          ))`;

const featuredNew = `          featuredServices.slice(0, 6).map((service) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.9}
              onPress={() => router.push({
                pathname: '/(tabs)/services',
                params: { categoryId: service.categoryId, subCategoryId: service.subCategoryId ?? undefined },
              })}
              style={[styles.productCard, { backgroundColor: colors.card, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}
            >
              <View style={styles.productImageWrapper}>
                {service.images?.[0] ? (
                  <Image source={{ uri: service.images[0] }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="sparkles" size={24} color="#C4B5FD" />
                  </View>
                )}
                {service.badge && (
                  <View style={styles.productBadgeContainer}>
                    <Text style={styles.productBadgeText}>{service.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.productContent}>
                <View>
                  <Text numberOfLines={2} style={[styles.productName, { color: colors.foreground }]}>{service.name}</Text>
                  <Text numberOfLines={1} style={[styles.productDescription, { color: colors.mutedForeground }]}>{service.description || 'Professional service'}</Text>
                </View>
                <View style={styles.productFooter}>
                  <View>
                    <Text style={[styles.productPrice, { color: colors.foreground }]}>₹{service.customerPrice}</Text>
                    <Text style={[styles.productDuration, { color: colors.mutedForeground }]}>
                      <Ionicons name="time-outline" size={10} color={colors.mutedForeground} /> {service.duration} min
                    </Text>
                  </View>
                  <View style={[styles.bookBtn, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={styles.bookBtnText}>Book</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))`;

const stylesOld = `  productCard: { flexDirection: 'row', gap: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderRadius: 16 },
  productImage: { width: 82, height: 82, borderRadius: 12 },
  productTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  productName: { flex: 1, fontSize: 14, fontWeight: '700' },
  productBadge: { color: '#fff', backgroundColor: '#5B3EF5', fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  productDescription: { fontSize: 11, marginTop: 5 },
  productPrice: { fontSize: 12, fontWeight: '700', marginTop: 6 },`;

const stylesNew = `  productCard: { flexDirection: 'row', gap: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderRadius: 16 },
  productImageWrapper: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  productBadgeContainer: { position: 'absolute', top: 0, left: 0, backgroundColor: '#5B3EF5', paddingHorizontal: 6, paddingVertical: 4, borderBottomRightRadius: 8 },
  productBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  productContent: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  productName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  productDescription: { fontSize: 12, marginTop: 4 },
  productFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  productPrice: { fontSize: 16, fontWeight: '800' },
  productDuration: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  bookBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bookBtnText: { color: '#5B3EF5', fontSize: 12, fontWeight: '700' },`;

if (content.includes(featuredOld) && content.includes(stylesOld)) {
  content = content.replace(featuredOld, featuredNew).replace(stylesOld, stylesNew);
  fs.writeFileSync('apps/mobile/app/(tabs)/index.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find blocks");
  if (!content.includes(featuredOld)) console.log("Missing featuredOld");
  if (!content.includes(stylesOld)) console.log("Missing stylesOld");
}
