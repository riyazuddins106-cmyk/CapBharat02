const fs = require('fs');
let content = fs.readFileSync('apps/mobile/app/(tabs)/services.tsx', 'utf8');

const toReplace = `{!!catalogue?.services?.length && (
        <View style={[styles.serviceSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Book a service</Text>
            <TouchableOpacity onPress={() => setCartOpen(true)} disabled={!accessToken}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                Cart{cart?.items.length ? \` (\${cart.items.reduce((sum, item) => sum + item.quantity, 0)})\` : ''}
              </Text>
            </TouchableOpacity>
          </View>
          {catalogue.services.slice(0, 4).map((service) => (
            <View key={service.id} style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{service.duration} min · ₹{service.customerPrice}</Text>
              </View>
              <TouchableOpacity onPress={() => accessToken && cartMutation.mutate(service.id)} disabled={!accessToken} style={[styles.addButton, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{accessToken ? 'Add' : 'Sign in'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}`;

const flatListOld = `        renderItem={({ item: service }) => (
          <View style={[styles.serviceRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {service.duration} min · ₹{service.customerPrice}
              </Text>
              {!!service.description && (
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {service.description}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => accessToken && cartMutation.mutate(service.id)}
              disabled={!accessToken}
              style={[styles.addButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                {accessToken ? 'Add' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        )}`;

const flatListNew = `        ListHeaderComponent={
          catalogue?.services?.length ? (
            <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available Services</Text>
              <TouchableOpacity onPress={() => setCartOpen(true)} disabled={!accessToken}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                  Cart{cart?.items.length ? \` (\${cart.items.reduce((sum, item) => sum + item.quantity, 0)})\` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item: service }) => (
          <View style={[styles.catalogCard, { backgroundColor: colors.card, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
            <View style={styles.catalogImageWrapper}>
              {service.images?.[0] ? (
                <Image source={{ uri: service.images[0] }} style={styles.catalogImage} />
              ) : (
                <View style={[styles.catalogImage, { backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="sparkles" size={24} color="#C4B5FD" />
                </View>
              )}
              {service.badge && (
                <View style={styles.catalogBadgeContainer}>
                  <Text style={styles.catalogBadgeText}>{service.badge}</Text>
                </View>
              )}
            </View>
            <View style={styles.catalogContent}>
              <View>
                <Text numberOfLines={2} style={[styles.catalogName, { color: colors.foreground }]}>{service.name}</Text>
                <Text numberOfLines={1} style={[styles.catalogDescription, { color: colors.mutedForeground }]}>{service.description || 'Professional service'}</Text>
              </View>
              <View style={styles.catalogFooter}>
                <View>
                  <Text style={[styles.catalogPrice, { color: colors.foreground }]}>₹{service.customerPrice}</Text>
                  <Text style={[styles.catalogDuration, { color: colors.mutedForeground }]}>
                    <Ionicons name="time-outline" size={10} color={colors.mutedForeground} /> {service.duration} min
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => accessToken && cartMutation.mutate(service.id)}
                  disabled={!accessToken}
                  activeOpacity={0.8}
                  style={[styles.catalogAddBtn, { backgroundColor: accessToken ? '#5B3EF5' : colors.muted }]}
                >
                  <Text style={[styles.catalogAddBtnText, { color: accessToken ? '#fff' : colors.mutedForeground }]}>
                    {accessToken ? '+ Add' : 'Sign in'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}`;

const importsOld = `import { Image } from 'react-native';`;
// We will just append the styles to the end

if (content.includes(toReplace) && content.includes(flatListOld)) {
  content = content.replace(toReplace, "");
  content = content.replace(flatListOld, flatListNew);
  
  if (!content.includes("import { Image }")) {
      content = content.replace("import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';", "import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';");
  }

  content += `\nObject.assign(styles, StyleSheet.create({
  catalogCard: { flexDirection: 'row', gap: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderRadius: 16 },
  catalogImageWrapper: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  catalogImage: { width: '100%', height: '100%' },
  catalogBadgeContainer: { position: 'absolute', top: 0, left: 0, backgroundColor: '#5B3EF5', paddingHorizontal: 6, paddingVertical: 4, borderBottomRightRadius: 8 },
  catalogBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  catalogContent: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  catalogName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  catalogDescription: { fontSize: 12, marginTop: 4 },
  catalogFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  catalogPrice: { fontSize: 16, fontWeight: '800' },
  catalogDuration: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  catalogAddBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  catalogAddBtnText: { fontSize: 13, fontWeight: '700' },
}));\n`;

  fs.writeFileSync('apps/mobile/app/(tabs)/services.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find blocks");
  if (!content.includes(toReplace)) console.log("Missing toReplace");
  if (!content.includes(flatListOld)) console.log("Missing flatListOld");
}
