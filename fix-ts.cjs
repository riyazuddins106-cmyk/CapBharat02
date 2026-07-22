const fs = require('fs');
let content = fs.readFileSync('apps/mobile/app/(tabs)/services.tsx', 'utf8');

const regex = /Object\.assign\(styles, StyleSheet\.create\({[\s\S]*?}\)\);/g;
content = content.replace(regex, "");

const insertIdx = content.indexOf('emptyText: { fontSize: 13 },');
if (insertIdx !== -1) {
  content = content.slice(0, insertIdx + 'emptyText: { fontSize: 13 },'.length) + `
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
  catalogAddBtnText: { fontSize: 13, fontWeight: '700' },` + content.slice(insertIdx + 'emptyText: { fontSize: 13 },'.length);
  fs.writeFileSync('apps/mobile/app/(tabs)/services.tsx', content);
  console.log("Success");
}
