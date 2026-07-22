const fs = require('fs');
let content = fs.readFileSync('apps/customer-web/src/app/CustomerApp.tsx', 'utf8');

const importOld = `  Sofa, Shirt, Package, WashingMachine, Tag, Waves,
} from "lucide-react";`;

const importNew = `  Sofa, Shirt, Package, WashingMachine, Tag, Waves, Banknote, Smartphone, CreditCard,
} from "lucide-react";`;

content = content.replace(importOld, importNew);

const methodsOld = `  const METHOD_LABELS: Record<string, { icon: string; label: string; desc: string }> = {
    cash:       { icon: "", label: "Cash on Delivery", desc: "Pay the professional in cash" },
    upi_manual: { icon: "", label: "UPI Payment",      desc: config?.upiVpa ? \`Pay to \${config.upiVpa}\` : "Pay via UPI" },
    razorpay:   { icon: "", label: "Card / Net Banking / UPI", desc: "Secure online payment" },
  };`;

const methodsNew = `  const METHOD_LABELS: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
    cash:       { icon: <Banknote size={20} color="#10B981" />, label: "Cash on Delivery", desc: "Pay the professional in cash" },
    upi_manual: { icon: <Smartphone size={20} color="#3B82F6" />, label: "UPI Payment",      desc: config?.upiVpa ? \`Pay to \${config.upiVpa}\` : "Pay via UPI" },
    razorpay:   { icon: <CreditCard size={20} color="#6366F1" />, label: "Card / Net Banking / UPI", desc: "Secure online payment" },
  };`;

content = content.replace(methodsOld, methodsNew);

const infoOld = `                const info = METHOD_LABELS[method] ?? { icon: "", label: method, desc: "" };`;
const infoNew = `                const info = METHOD_LABELS[method] ?? { icon: <CreditCard size={20} />, label: method, desc: "" };`;

content = content.replace(infoOld, infoNew);

fs.writeFileSync('apps/customer-web/src/app/CustomerApp.tsx', content);
