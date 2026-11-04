const fs = require('fs');
const path = require('path');

const orderControllerPath = path.resolve(__dirname, '../src/modules/order/order.controller.ts');
let content = fs.readFileSync(orderControllerPath, 'utf8');
content = content.replace("@Roles('CUSTOMER', 'ADMIN')", "@Roles('CUSTOMER', 'ADMIN', 'GUEST')");
fs.writeFileSync(orderControllerPath, content, 'utf8');
console.log('Successfully updated OrderController roles!');

const paymentControllerPath = path.resolve(__dirname, '../src/modules/payments/payment.controller.ts');
let pContent = fs.readFileSync(paymentControllerPath, 'utf8');
pContent = pContent.replace("@Roles('CUSTOMER', 'ADMIN')", "@Roles('CUSTOMER', 'ADMIN', 'GUEST')");
pContent = pContent.replace("@Roles('CUSTOMER', 'ADMIN')", "@Roles('CUSTOMER', 'ADMIN', 'GUEST')");
pContent = pContent.replace("@Roles('CUSTOMER', 'ADMIN')", "@Roles('CUSTOMER', 'ADMIN', 'GUEST')");
pContent = pContent.replace("@Roles('CUSTOMER', 'ADMIN')", "@Roles('CUSTOMER', 'ADMIN', 'GUEST')");
fs.writeFileSync(paymentControllerPath, pContent, 'utf8');
console.log('Successfully updated PaymentController roles!');

