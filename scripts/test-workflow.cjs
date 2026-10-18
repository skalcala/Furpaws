const fs=require('fs');const{spawn}=require('child_process');const net=require('net');const{MongoClient}=require('mongoose').mongo;const dotenv=require('dotenv');
process.chdir(require('path').resolve(__dirname, '..'));
fs.mkdirSync('.local', { recursive: true });
(async()=>{
 const config=dotenv.parse(fs.readFileSync(require('path').join(__dirname,'../server/.env')));const uri=new URL(process.env.LOCAL_MONGODB_URI||config.LOCAL_MONGODB_URI||'mongodb://127.0.0.1:27018/furpaws?replicaSet=rs0');if(!['127.0.0.1','localhost'].includes(uri.hostname))throw Error('Workflow tests require local MongoDB');
 const database=`furpaws_workflow_test_${Date.now()}`;uri.pathname='/'+database;
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const env={...process.env,...config,MONGODB_URI:uri.toString(),PORT:String(port),API_BASE:`http://127.0.0.1:${port}/api`,JWT_SECRET:require('crypto').randomBytes(32).toString('hex')};delete env.VERCEL;for(const key of ["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_VERIFY_SERVICE_SID"])env[key]="";
 const run=(args)=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>out+=b);p.on('exit',code=>resolve({code,out}));p.on('error',reject);});
 let server;
 try{
  const seed=await run(['server/seed.js']);if(seed.code)throw Error('Isolated seed failed');
  server=spawn(process.execPath,['server/server.js'],{env,stdio:'ignore'});
  let ready=false;for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250));}if(!ready)throw Error('Audit API did not start');
  const result=await run(['--test','--test-concurrency=1','tests/api.test.js','tests/visit-details.test.js','tests/workflow-fixes.test.js','tests/emergency-followup.test.js','tests/portal-updates.test.js']);fs.writeFileSync('.local/workflow-results.txt',result.out);console.log(result.out);if(result.code)process.exitCode=1;
 }finally{if(server)server.kill('SIGTERM');const client=new MongoClient(uri.toString());await client.connect();await client.db(database).dropDatabase();await client.close();console.log('Removed isolated audit database; clinic databases unchanged.');}
})().catch(e=>{console.error(e.message);process.exit(1)});
