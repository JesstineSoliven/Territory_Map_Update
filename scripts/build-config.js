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
