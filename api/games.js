const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
function sign(v){return crypto.createHmac('sha256',process.env.ADMIN_SECRET).update(v).digest('hex')}
function authed(req){const m=(req.headers.cookie||'').match(/(?:^|;\s*)playbox_admin=([^;]+)/);if(!m||!process.env.ADMIN_SECRET)return false;const [u,s]=decodeURIComponent(m[1]).split('.');return !!u&&!!s&&s===sign(u)}
function send(res,c,b){res.status(c).setHeader('Content-Type','application/json').setHeader('Cache-Control','no-store').end(JSON.stringify(b))}
function clean(g){return {id:g.id,name:g.name,category:g.category,cover:g.cover,url:g.url,size:g.size,hot:!!g.hot,status:g.status,created_at:g.created_at}}
module.exports=async(req,res)=>{
 if(req.method==='GET'){const admin=req.query&&req.query.admin==='1';if(admin&&!authed(req))return send(res,401,{error:'Unauthorized'});const {data,error}=await supabase.from('games').select('*').order('created_at',{ascending:false});if(error)return send(res,500,{error:error.message});return send(res,200,(admin?data:data.filter(g=>g.status==='active')).map(clean))}
 if(!authed(req))return send(res,401,{error:'Unauthorized'});let b=req.body||{};if(typeof b==='string'){try{b=JSON.parse(b)}catch{return send(res,400,{error:'Invalid JSON'})}}
 const cats=['Action','Adventure','Arcade','Puzzle','Racing','Sports','Casual','Strategy','Other'];
 if(req.method==='POST'||req.method==='PATCH'){if(!b.name||!b.cover||!b.url)return send(res,400,{error:'Name, cover URL and game URL are required.'});try{new URL(b.cover);new URL(b.url)}catch{return send(res,400,{error:'Cover and game URLs must be valid.'})}if(!cats.includes(b.category))return send(res,400,{error:'Invalid category.'});const row={name:b.name.trim(),category:b.category,cover:b.cover.trim(),url:b.url.trim(),size:['normal','big','huge'].includes(b.size)?b.size:'normal',hot:!!b.hot,status:'active'};if(req.method==='POST'){const {data,error}=await supabase.from('games').insert(row).select().single();if(error)return send(res,500,{error:error.message});return send(res,201,clean(data))}if(!b.id)return send(res,400,{error:'Game id is required.'});const {data,error}=await supabase.from('games').update(row).eq('id',b.id).select().single();if(error)return send(res,500,{error:error.message});return send(res,200,clean(data))}
 if(req.method==='DELETE'){if(!b.id)return send(res,400,{error:'Game id is required.'});const {error}=await supabase.from('games').delete().eq('id',b.id);if(error)return send(res,500,{error:error.message});return send(res,200,{ok:true})}
 return send(res,405,{error:'Method not allowed'});
};
