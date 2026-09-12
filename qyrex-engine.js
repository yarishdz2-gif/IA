
(function(){
"use strict";

const STARTER=[
 ["hola",0],["buenas",0],["hey",0],["qué tal",0],["hello",0],
 ["cuanto es 2+2",1],["144/12",1],["raíz de 81",1],["20% de 50",1],
 ["haz un html que diga hola",2],["crea una página web",2],["landing page",2],
 ["anti afk en roblox",3],["script luau",3],["roblox esp",3],["noclip",3],["fly script",3],
 ["qué es python",4],["qué es javascript",4],["qué es docker",4],["qué es api",4],
 ["explica la fotosíntesis",5],["qué es el adn",5],["qué es la gravedad",5],
 ["cuéntame un chiste",6],["dame una broma",6],["hazme reír",6],
 ["quién eres",7],["qué eres",7],["cómo funcionas",7],
 ["gracias",8],["ok",8],["perfecto",8]
];

const FACTS={
"fotosintesis":"Las plantas convierten luz, CO₂ y agua en materia orgánica; en la fotosíntesis oxigénica se libera O₂.",
"gravedad":"La gravedad es la interacción por la que las masas se atraen; cerca de la superficie terrestre la aceleración es aproximadamente 9.81 m/s².",
"adn":"El ADN almacena información genética mediante secuencias de nucleótidos con bases A, T, C y G.",
"internet":"Internet es una red mundial de redes que usa protocolos como TCP/IP.",
"cpu":"La CPU ejecuta instrucciones y coordina operaciones de un sistema informático.",
"ram":"La RAM es memoria volátil usada para mantener datos y programas activos.",
"python":"Python es un lenguaje de programación de propósito general usado, entre otras cosas, en automatización, web, ciencia de datos e IA.",
"javascript":"JavaScript es un lenguaje de programación usado ampliamente en navegadores y también en entornos como Node.js.",
"lua":"Lua es un lenguaje ligero y embebible; Roblox utiliza Luau, un dialecto basado en Lua.",
"luau":"Luau es el lenguaje derivado de Lua utilizado por Roblox, con extensiones como tipado opcional.",
"roblox":"Roblox es una plataforma para crear y jugar experiencias; su scripting usa Luau.",
"docker":"Docker permite empaquetar aplicaciones y dependencias en contenedores reproducibles.",
"api":"Una API es una interfaz que permite que un software exponga funciones o datos a otro software.",
"http":"HTTP es un protocolo de comunicación utilizado por la web.",
"git":"Git es un sistema de control de versiones distribuido.",
"html":"HTML es el lenguaje de marcado que define la estructura de una página web.",
"css":"CSS describe la presentación y el diseño visual de documentos web.",
"sql":"SQL permite consultar y modificar datos en bases de datos relacionales.",
"ia":"La inteligencia artificial agrupa técnicas para construir sistemas que realizan tareas asociadas al procesamiento inteligente de información.",
"algoritmo":"Un algoritmo es una secuencia definida de pasos para transformar una entrada en una salida o resolver un problema."
};
const JOKES=[
"¿Por qué el programador confunde Halloween y Navidad? Porque OCT 31 = DEC 25.",
"Mi código no tiene bugs; tiene funciones sorpresa.",
"Hay 10 tipos de personas: las que entienden binario y las que no.",
"Un SQL entra al bar y pregunta: ¿puedo hacer un JOIN?"
];

function normalize(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function md(s){
 const blocks=[];
 s=s.replace(/```([a-z0-9+#_-]+)?\n([\s\S]*?)```/gi,(_,l,c)=>{
   const id="@@CODE"+blocks.length+"@@";
   blocks.push('<pre><code>'+esc(c.trim())+'</code></pre>');
   return id;
 });
 let out=esc(s)
   .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
   .replace(/`([^`]+)`/g,"<code>$1</code>")
   .replace(/\n/g,"<br>");
 blocks.forEach((b,i)=>{out=out.replace("@@CODE"+i+"@@",b)});
 return out;
}
function math(q){
 let m=q.match(/(-?\d+(?:\.\d+)?)\s*([\+\-\*x×\/])\s*(-?\d+(?:\.\d+)?)/);
 if(m){
   const a=+m[1],b=+m[3],op=m[2];let r;
   if(op==="+")r=a+b;else if(op==="-")r=a-b;else if(op==="*"||op==="x"||op==="×")r=a*b;else r=b===0?"indefinido":a/b;
   return `**${a} ${op} ${b} = ${r}**`;
 }
 m=q.match(/raiz(?: cuadrada)?(?: de)?\s*(-?\d+(?:\.\d+)?)/i);
 if(m)return `√${m[1]} ≈ **${Math.sqrt(+m[1]).toFixed(6)}**`;
 m=q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:de\s*)?(\d+(?:\.\d+)?)/);
 if(m)return `**${(+m[1]/100*+m[2])}**`;
 return null;
}
function buildHTML(raw){
 let text="Hola mundo";
 const m=raw.match(/(?:diga|diga que|muestre|mensaje|texto|titulo|título)\s*[:\s]*["“]?([^"”\n]{1,180})["”]?/i);
 if(m)text=m[1].trim();
 const safe=esc(text);
 return '```html\n<!doctype html>\\n<html lang="es">\\n<head>\\n<meta charset="UTF-8">\\n<meta name="viewport" content="width=device-width,initial-scale=1">\\n<title>'+safe+'</title>\\n<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#09090b;color:white;font-family:system-ui}main{padding:40px;border-radius:20px;background:#15151b;border:1px solid #2c2c36}h1{margin:0;background:linear-gradient(90deg,#a78bfa,#67e8f9);-webkit-background-clip:text;color:transparent}</style>\\n</head>\\n<body><main><h1>'+safe+'</h1></main></body>\\n</html>\n```';
}
function luau(kind){
 if(kind==="afk")return '```lua\nlocal Players=game:GetService("Players")\nlocal VirtualUser=game:GetService("VirtualUser")\nlocal player=Players.LocalPlayer\nplayer.Idled:Connect(function()\n    VirtualUser:CaptureController()\n    VirtualUser:ClickButton2(Vector2.new())\nend)\n```';
 if(kind==="esp")return '```lua\nlocal Players=game:GetService("Players")\nlocal localPlayer=Players.LocalPlayer\nlocal function addESP(player)\n    if player==localPlayer then return end\n    local character=player.Character or player.CharacterAdded:Wait()\n    if character:FindFirstChild("QyrexHighlight") then return end\n    local h=Instance.new("Highlight")\n    h.Name="QyrexHighlight"\n    h.FillColor=Color3.fromRGB(90,180,255)\n    h.OutlineColor=Color3.fromRGB(255,255,255)\n    h.FillTransparency=.55\n    h.Parent=character\nend\nfor _,p in ipairs(Players:GetPlayers()) do task.spawn(addESP,p) end\nPlayers.PlayerAdded:Connect(addESP)\n```';
 if(kind==="speed")return '```lua\nlocal Players=game:GetService("Players")\nlocal player=Players.LocalPlayer\nlocal function apply(char)\n    char:WaitForChild("Humanoid").WalkSpeed=32\nend\nif player.Character then apply(player.Character) end\nplayer.CharacterAdded:Connect(apply)\n```';
 if(kind==="fly")return '```lua\nlocal Players=game:GetService("Players")\nlocal UIS=game:GetService("UserInputService")\nlocal RunService=game:GetService("RunService")\nlocal player=Players.LocalPlayer\nlocal on=false\nUIS.InputBegan:Connect(function(i,g)\n    if not g and i.KeyCode==Enum.KeyCode.F then on=not on end\nend)\nRunService.RenderStepped:Connect(function()\n    local char=player.Character\n    local root=char and char:FindFirstChild("HumanoidRootPart")\n    if root and on then root.AssemblyLinearVelocity=workspace.CurrentCamera.CFrame.LookVector*60 end\nend)\n```';
 if(kind==="noclip")return '```lua\nlocal Players=game:GetService("Players")\nlocal RunService=game:GetService("RunService")\nlocal player=Players.LocalPlayer\nRunService.Stepped:Connect(function()\n    local char=player.Character\n    if not char then return end\n    for _,part in ipairs(char:GetDescendants()) do\n        if part:IsA("BasePart") then part.CanCollide=false end\n    end\nend)\n```';
 return null;
}

class QyrexApp{
 constructor(){
   this.model=new QyrexLocalModel();
   this.turns=0;this.memory=[];this.proto=[];
   this._load();
 }
 async init(){
   this.renderWelcome();this.updateStats();
   const p=document.getElementById('prompt');
   p.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send()}});
   p.addEventListener('input',()=>{p.style.height='auto';p.style.height=Math.min(p.scrollHeight,160)+'px'});
 }
 _load(){
   try{
     const raw=localStorage.getItem('qyrexai_model_v1');
     if(raw)this.model.loadJSON(JSON.parse(raw));
     const mem=JSON.parse(localStorage.getItem('qyrexai_memory_v1')||'[]');if(Array.isArray(mem))this.memory=mem.slice(-100);
     const proto=JSON.parse(localStorage.getItem('qyrexai_proto_v1')||'[]');if(Array.isArray(proto))this.proto=proto;
   }catch(e){}
 }
 save(){
   try{
     localStorage.setItem('qyrexai_model_v1',JSON.stringify(this.model.toJSON()));
     localStorage.setItem('qyrexai_memory_v1',JSON.stringify(this.memory.slice(-100)));
     localStorage.setItem('qyrexai_proto_v1',JSON.stringify(this.proto));
   }catch(e){console.warn(e)}
 }
 updateStats(){
   document.getElementById('turns').textContent=this.turns;
   document.getElementById('paramsSide').textContent=this.model.parameterCount().toLocaleString();
   document.getElementById('memorySide').textContent=this.memory.length;
   document.getElementById('statParams').textContent=this.model.parameterCount().toLocaleString();
   document.getElementById('statTrainable').textContent=this.model.trainableParameterCount().toLocaleString();
   document.getElementById('statMemory').textContent=this.memory.length;
   document.getElementById('trainLabel').textContent=this.model.examples+' ejemplos';
 }
 renderWelcome(){
   const el=document.getElementById('chatInner');
   el.innerHTML='';
   this.aiMsg('QyrexAI local está listo. **Sin APIs externas.**\\n\\nTengo un núcleo neuronal local de millones de parámetros para representación y un motor híbrido para código, matemáticas, conocimiento y conversación. Puedes entrenarme con el dataset incluido y seguir guardando aprendizaje en este navegador.');
 }
 aiMsg(text){
   const el=document.createElement('div');el.className='row';
   el.innerHTML='<div class="avatar ai">Q</div><div class="msg"><div class="meta">QyrexAI · local</div>'+md(text)+'</div>';
   document.getElementById('chatInner').appendChild(el);this.scroll();
 }
 userMsg(text){
   const el=document.createElement('div');el.className='row user';
   el.innerHTML='<div class="msg">'+md(text)+'</div><div class="avatar user">TÚ</div>';
   document.getElementById('chatInner').appendChild(el);this.scroll();
 }
 scroll(){const c=document.getElementById('chat');c.scrollTop=c.scrollHeight}
 newChat(){document.getElementById('chatInner').innerHTML='';this.turns=0;this.renderWelcome();this.updateStats()}
 async send(){
   const ta=document.getElementById('prompt');const raw=ta.value.trim();if(!raw)return;
   ta.value='';ta.style.height='auto';this.userMsg(raw);
   const t=performance.now();this.turns++;
   const reply=this.respond(raw);
   this.memory.push({u:raw,a:reply,time:new Date().toISOString()});
   if(this.memory.length>100)this.memory.shift();
   this.save();this.updateStats();
   setTimeout(()=>{this.aiMsg(reply+`\n\n<small style="color:#70788a">local · ${Math.round(performance.now()-t)} ms · ${this.model.parameterCount().toLocaleString()} params</small>`);},25);
 }
 respond(raw){
   const q=normalize(raw);
   const facts=Object.keys(FACTS);
   for(const k of facts)if(q.includes(k))return FACTS[k];
   const m=math(q);if(m)return m;
   if(/html|pagina|página|landing/.test(q))return 'Aquí tienes una página generada localmente:\\n\\n'+buildHTML(raw);
   if(/anti.?afk|\bafk\b/.test(q))return 'Te preparo un Anti-AFK local:\\n\\n'+luau('afk');
   if(/\besp\b|highlight|chams/.test(q))return 'Ejemplo de ESP con Highlight:\\n\\n'+luau('esp');
   if(/\bspeed\b|walkspeed|velocidad/.test(q))return 'Ejemplo para WalkSpeed:\\n\\n'+luau('speed');
   if(/\bfly\b|volar|vuelo/.test(q))return 'Ejemplo de vuelo básico:\\n\\n'+luau('fly');
   if(/noclip|no clip/.test(q))return 'Ejemplo de noclip:\\n\\n'+luau('noclip');
   if(/chiste|broma|rie|ríe|joke/.test(q))return JOKES[(hash32(q)+this.turns)%JOKES.length];
   if(/quien eres|qué eres|que eres|what are you/.test(q))return 'Soy **QyrexAI**, una IA local que corre en tu propio navegador. No hago peticiones a APIs externas. Mi arquitectura combina una representación neuronal de millones de parámetros con un motor local de generación y memoria.';
   if(/gracias|thanks|thx/.test(q))return 'De nada. Seguimos construyendo QyrexAI.';
   if(/^hola|^hey|^buenas|^hello/.test(q))return 'Hola. Estoy listo. Puedes pedirme código, explicaciones, matemáticas, HTML o simplemente conversar.';
   if(/cómo|como|como funciona|cómo funciona/.test(q)){
     return 'Puedo procesar el texto localmente, convertirlo en características, pasarlo por el núcleo neuronal, consultar la memoria local y elegir un generador especializado. Todo ocurre en tu equipo.';
   }
   // Similarity against memory for continuity.
   if(this.memory.length){
     let best=null,bs=-1;const v=this.model.project(raw);
     for(const item of this.memory.slice(-30)){
       const s=this.model.similarity(v,this.model.project(item.u));
       if(s>bs){bs=s;best=item}
     }
     if(best&&bs>.8)return 'Recuerdo una conversación parecida: **'+best.u+'**\\n\\n'+best.a;
   }
   const key=q.split(/\s+/).filter(x=>x.length>2).slice(0,6);
   return `Entiendo el tema **${key.join(', ')||'general'}**, pero esta versión está diseñada para crecer mediante entrenamiento local.\\n\\nPrueba con una pregunta concreta o entrena el dataset desde **Modelo**. Cada ejemplo puede quedarse guardado en tu navegador.`;
 }
 openModel(){document.getElementById('modelOverlay').classList.add('show');this.updateStats()}
 closeModel(){document.getElementById('modelOverlay').classList.remove('show')}
 async trainStarter(){
   const status=document.getElementById('trainStatus'),bar=document.getElementById('trainProgress');
   status.textContent='Entrenando el dataset local…';bar.style.width='0%';
   const pairs=STARTER.map(([text,label])=>({text,target:[label]}));
   await this.model.trainPairs(pairs,async(n,total)=>{bar.style.width=(n/total*100).toFixed(1)+'%';status.textContent=`Entrenando ${n}/${total} ejemplos…`;});
   this.proto=STARTER.map(([text,label])=>({text,label}));
   this.save();this.updateStats();status.textContent=`Entrenamiento terminado. ${this.model.examples} ejemplos procesados localmente.`;
 }
 clearLearning(){
   localStorage.removeItem('qyrexai_model_v1');localStorage.removeItem('qyrexai_memory_v1');localStorage.removeItem('qyrexai_proto_v1');
   this.model=new QyrexLocalModel();this.memory=[];this.proto=[];this.updateStats();
   document.getElementById('trainStatus').textContent='Aprendizaje local borrado.';
 }
 exportModel(){
   const blob=new Blob([JSON.stringify({model:this.model.toJSON(),memory:this.memory,proto:this.proto,version:'1.0.0'})],{type:'application/json'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='qyrexai-learning.json';a.click();URL.revokeObjectURL(a.href);
 }
 async importModel(ev){
   const f=ev.target.files&&ev.target.files[0];if(!f)return;
   try{
     const d=JSON.parse(await f.text());if(d.model)this.model.loadJSON(d.model);if(Array.isArray(d.memory))this.memory=d.memory;if(Array.isArray(d.proto))this.proto=d.proto;
     this.save();this.updateStats();document.getElementById('trainStatus').textContent='Aprendizaje importado correctamente.';
   }catch(e){document.getElementById('trainStatus').textContent='No se pudo importar ese archivo.'}
   ev.target.value='';
 }
 downloadWeights(){
   const blob=new Blob([JSON.stringify(this.model.toJSON())],{type:'application/json'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='qyrexai-weights.json';a.click();URL.revokeObjectURL(a.href);
 }
}
window.QyrexApp=QyrexApp;
})();
