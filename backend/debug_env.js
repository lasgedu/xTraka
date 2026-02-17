require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('All keys:', Object.keys(process.env).filter(k => !['PATH', 'SHELL', 'TERM', 'USER', 'HOME', 'LANG', 'PWD', 'SHLVL', 'LOGNAME', '_'].includes(k)));
