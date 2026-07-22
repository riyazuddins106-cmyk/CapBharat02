const fs = require('fs');
let content = fs.readFileSync('apps/mobile/app/(tabs)/bookings.tsx', 'utf8');

const methodInfoOld = `  const METHOD_INFO: Record<string, { icon: string; label: string; desc: string }> = {
    cash:       { icon: '', label: 'Cash on Delivery',   desc: 'Pay the professional in cash' },
    upi_manual: { icon: '', label: 'UPI Payment',        desc: config?.upiVpa ? \`Pay to \${config.upiVpa}\` : 'Pay via UPI app' },
    razorpay:   { icon: '', label: 'Razorpay',           desc: 'Cards, Net Banking, Wallets & UPI' },
    stripe:     { icon: '', label: 'Card (International)',desc: 'Visa, Mastercard & more via Stripe' },
  };`;

const methodInfoNew = `  const METHOD_INFO: Record<string, { icon: any; label: string; desc: string }> = {
    cash:       { icon: 'cash-outline', label: 'Cash on Delivery',   desc: 'Pay the professional in cash' },
    upi_manual: { icon: 'phone-portrait-outline', label: 'UPI Payment',        desc: config?.upiVpa ? \`Pay to \${config.upiVpa}\` : 'Pay via UPI app' },
    razorpay:   { icon: 'card-outline', label: 'Razorpay',           desc: 'Cards, Net Banking, Wallets & UPI' },
    stripe:     { icon: 'globe-outline', label: 'Card (International)',desc: 'Visa, Mastercard & more via Stripe' },
  };`;

const iconRenderOld = `<Text style={styles.methodIcon}>{info.icon}</Text>`;
const iconRenderNew = `<Ionicons name={info.icon} size={24} color={colors.primary} style={{ width: 28, textAlign: 'center' }} />`;

const iconRenderFallbackOld = `const info = METHOD_INFO[method] ?? { icon: '', label: method, desc: '' };`;
const iconRenderFallbackNew = `const info = METHOD_INFO[method] ?? { icon: 'card-outline', label: method, desc: '' };`;

const successIconOld = `<Text style={styles.paidIcon}>✓</Text>`;
const successIconNew = `<Ionicons name="checkmark-circle" size={48} color="#16A34A" />`;

if (content.includes(methodInfoOld) && content.includes(iconRenderOld)) {
  content = content.replace(methodInfoOld, methodInfoNew).replace(iconRenderOld, iconRenderNew).replace(iconRenderFallbackOld, iconRenderFallbackNew).replace(successIconOld, successIconNew);
  fs.writeFileSync('apps/mobile/app/(tabs)/bookings.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find blocks");
}
