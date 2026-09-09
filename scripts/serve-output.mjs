import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

export async function serveOutput(directory, base = '/') {
  const root=resolve(directory);
  const prefix='/' + base.split('/').filter(Boolean).join('/');
  const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
  const server=createServer(async(req,res)=>{
    try {
      let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(prefix!=='/'){
        if(path!==prefix && !path.startsWith(prefix+'/')){res.writeHead(404);res.end();return;}
        path=path.slice(prefix.length);
      }
      let file=resolve(root,'.'+(path||'/'));
      if(file!==root && !file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      if((await stat(file)).isDirectory())file=resolve(file,'index.html');
      const body=await readFile(file);
      res.writeHead(200,{'content-type':contentTypes[extname(file)]||'application/octet-stream'});
      res.end(body);
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();
  return {url:`http://127.0.0.1:${address.port}${prefix==='/'?'':prefix}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
