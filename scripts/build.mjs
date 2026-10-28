import {access} from 'node:fs/promises';
for(const f of ['index.html','app.js','engine.js','style.css'])await access('dist/'+f);
console.log('Static application ready in dist/');
