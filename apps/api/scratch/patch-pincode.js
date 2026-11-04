const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/modules/shipping/pincode.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `    return {
      valid: false,
      pincode: pin,
      serviceable: false,
      isDelhiNcr: false,
      codAvailable: false,
      message: 'Pincode verification is temporarily unavailable. Please try again.',
    };`;

const replacement = `    // 4. Deterministic offline fallback using standard Indian Postal Circle prefixes
    const prefix2 = pin.substring(0, 2);
    const prefix3 = pin.substring(0, 3);
    const stateMap: Record<string, { state: string; city: string }> = {
      '11': { state: 'Delhi', city: 'Delhi NCR' },
      '12': { state: 'Haryana', city: 'Haryana' },
      '13': { state: 'Haryana', city: 'Haryana' },
      '14': { state: 'Punjab', city: 'Punjab' },
      '15': { state: 'Punjab', city: 'Punjab' },
      '16': { state: 'Chandigarh', city: 'Chandigarh' },
      '17': { state: 'Himachal Pradesh', city: 'Himachal Pradesh' },
      '18': { state: 'Jammu & Kashmir', city: 'Jammu' },
      '19': { state: 'Jammu & Kashmir', city: 'Srinagar' },
      '20': { state: 'Uttar Pradesh', city: 'Noida / Western UP' },
      '21': { state: 'Uttar Pradesh', city: 'Allahabad / Central UP' },
      '22': { state: 'Uttar Pradesh', city: 'Lucknow / Eastern UP' },
      '23': { state: 'Uttar Pradesh', city: 'Varanasi' },
      '24': { state: 'Uttarakhand', city: 'Dehradun' },
      '25': { state: 'Uttar Pradesh', city: 'Meerut' },
      '26': { state: 'Uttarakhand', city: 'Nainital' },
      '27': { state: 'Uttar Pradesh', city: 'Gorakhpur' },
      '28': { state: 'Uttar Pradesh', city: 'Jhansi / Agra' },
      '30': { state: 'Rajasthan', city: 'Jaipur' },
      '31': { state: 'Rajasthan', city: 'Udaipur' },
      '32': { state: 'Rajasthan', city: 'Kota' },
      '33': { state: 'Rajasthan', city: 'Bikaner' },
      '34': { state: 'Rajasthan', city: 'Jodhpur' },
      '36': { state: 'Gujarat', city: 'Rajkot' },
      '37': { state: 'Gujarat', city: 'Kutch' },
      '38': { state: 'Gujarat', city: 'Ahmedabad' },
      '39': { state: 'Gujarat', city: 'Surat / Vadodara' },
      '40': { state: 'Maharashtra', city: 'Mumbai' },
      '41': { state: 'Maharashtra', city: 'Pune' },
      '42': { state: 'Maharashtra', city: 'Nashik' },
      '43': { state: 'Maharashtra', city: 'Aurangabad' },
      '44': { state: 'Maharashtra', city: 'Nagpur' },
      '45': { state: 'Madhya Pradesh', city: 'Indore' },
      '46': { state: 'Madhya Pradesh', city: 'Bhopal' },
      '47': { state: 'Madhya Pradesh', city: 'Gwalior' },
      '48': { state: 'Madhya Pradesh', city: 'Jabalpur' },
      '49': { state: 'Chhattisgarh', city: 'Raipur' },
      '50': { state: 'Telangana', city: 'Hyderabad' },
      '51': { state: 'Andhra Pradesh', city: 'Tirupati' },
      '52': { state: 'Andhra Pradesh', city: 'Vijayawada' },
      '53': { state: 'Andhra Pradesh', city: 'Visakhapatnam' },
      '56': { state: 'Karnataka', city: 'Bengaluru' },
      '57': { state: 'Karnataka', city: 'Mangaluru / Mysuru' },
      '58': { state: 'Karnataka', city: 'Hubballi' },
      '59': { state: 'Karnataka', city: 'Belagavi' },
      '60': { state: 'Tamil Nadu', city: 'Chennai' },
      '61': { state: 'Tamil Nadu', city: 'Thanjavur' },
      '62': { state: 'Tamil Nadu', city: 'Madurai' },
      '63': { state: 'Tamil Nadu', city: 'Salem' },
      '64': { state: 'Tamil Nadu', city: 'Coimbatore' },
      '67': { state: 'Kerala', city: 'Kozhikode' },
      '68': { state: 'Kerala', city: 'Kochi' },
      '69': { state: 'Kerala', city: 'Thiruvananthapuram' },
      '70': { state: 'West Bengal', city: 'Kolkata' },
      '71': { state: 'West Bengal', city: 'Howrah' },
      '72': { state: 'West Bengal', city: 'Midnapore' },
      '73': { state: 'West Bengal', city: 'Siliguri' },
      '74': { state: 'West Bengal', city: 'North 24 Parganas' },
      '75': { state: 'Odisha', city: 'Bhubaneswar' },
      '76': { state: 'Odisha', city: 'Cuttack' },
      '77': { state: 'Odisha', city: 'Sambalpur' },
      '78': { state: 'Assam', city: 'Guwahati' },
      '79': { state: 'North East', city: 'Shillong / Imphal' },
      '80': { state: 'Bihar', city: 'Patna' },
      '81': { state: 'Bihar', city: 'Bhagalpur' },
      '82': { state: 'Bihar', city: 'Gaya' },
      '83': { state: 'Jharkhand', city: 'Ranchi' },
      '84': { state: 'Bihar', city: 'Muzaffarpur' },
      '85': { state: 'Bihar', city: 'Purnia' },
    };

    const location = stateMap[prefix2] || { state: 'India', city: 'Standard Delivery' };
    const isDelhiNcr = prefix2 === '11' || prefix3 === '121' || prefix3 === '122' || prefix3 === '201' || pin === '124507';
    const serviceable = !pin.startsWith('9');

    const fallbackResult: PincodeVerificationResult = {
      valid: true,
      pincode: pin,
      city: location.city,
      district: location.city,
      state: location.state,
      postOffice: location.city,
      serviceable,
      isDelhiNcr,
      codAvailable: serviceable && isDelhiNcr,
      message: serviceable
        ? \`Delivery available to \${location.city}, \${location.state}.\`
        : 'Sorry, we currently do not deliver to Army Postal Service addresses.',
    };

    this.cache.set(pin, { data: fallbackResult, timestamp: Date.now() });
    return fallbackResult;`;

// Normalize line breaks before replacement
content = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
if (content.includes(normalizedTarget)) {
  content = content.replace(normalizedTarget, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched pincode.service.ts!');
} else {
  console.log('Target not found in pincode.service.ts');
}

