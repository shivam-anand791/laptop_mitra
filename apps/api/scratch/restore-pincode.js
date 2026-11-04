const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/modules/shipping/pincode.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the fallback block with the exact original fail-closed return
const startIdx = content.indexOf('    // 4. Deterministic offline fallback');
if (startIdx !== -1) {
  const endIdx = content.indexOf('  /**', startIdx);
  const original = `    return {
      valid: false,
      pincode: pin,
      serviceable: false,
      isDelhiNcr: false,
      codAvailable: false,
      message: 'Pincode verification is temporarily unavailable. Please try again.',
    };
  }

`;
  content = content.slice(0, startIdx) + original + content.slice(endIdx);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Restored fail-closed behavior in pincode.service.ts!');
} else {
  console.log('Fallback block not found in pincode.service.ts');
}

