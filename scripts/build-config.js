const fs = require('fs');
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY_HERE') {
  throw new Error('GOOGLE_API_KEY environment variable is not set in Vercel.');
}

fs.writeFileSync(
  'territory-app/config.js',
  `// Generated at build time — do not edit\nconst GOOGLE_API_KEY = '${apiKey}';\n`
);
console.log('config.js generated successfully.');

const fbConfigRaw = process.env.FIREBASE_CONFIG;
if (fbConfigRaw) {
  try {
    JSON.parse(fbConfigRaw);
    fs.writeFileSync(
      'territory-app/firebase-config.js',
      `// Generated at build time — do not edit\nconst FIREBASE_CONFIG = ${fbConfigRaw};\n`
    );
    console.log('firebase-config.js generated successfully.');
  } catch (e) {
    throw new Error('FIREBASE_CONFIG env var is not valid JSON: ' + e.message);
  }
} else {
  fs.writeFileSync('territory-app/firebase-config.js', `const FIREBASE_CONFIG = {};\n`);
  console.log('firebase-config.js: no FIREBASE_CONFIG env var set, writing placeholder.');
}
