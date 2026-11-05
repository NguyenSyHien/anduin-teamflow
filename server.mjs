import http from 'node:http';
import {readFile} from 'node:fs/promises';
const source=await readFile('dist/server/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
http.createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>12000){res.writeHead(413);res.end();return;}chunks.push(chunk);}const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Request failed');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
