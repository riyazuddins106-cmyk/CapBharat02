const fs = require('fs');
let content = fs.readFileSync('apps/customer-web/src/app/CustomerApp.tsx', 'utf8');

const oldCheck = \`<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>\`;
const newCheck = \`<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"><Check size={32} color="#10B981" /></div>\`;

const oldX = \`<button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>\`;
const newX = \`<button onClick={onClose} className="text-gray-400 hover:text-gray-600 leading-none"><X size={20} /></button>\`;

content = content.replace(oldCheck, newCheck).replace(oldX, newX);

fs.writeFileSync('apps/customer-web/src/app/CustomerApp.tsx', content);
