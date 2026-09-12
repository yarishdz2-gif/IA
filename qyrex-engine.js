(function(){
'use strict';

const FACTS={
 fotosintesis:'La fotosíntesis convierte energía luminosa en energía química. En plantas, usa CO₂ y agua y produce materia orgánica; en la fotosíntesis oxigénica se libera O₂.',
 gravedad:'La gravedad es una interacción fundamental asociada a la masa y la energía. Cerca de la superficie terrestre, la aceleración gravitatoria es de aproximadamente 9.81 m/s².',
 adn:'El ADN almacena información genética mediante secuencias de nucleótidos que contienen A, T, C y G.',
 internet:'Internet es una red mundial de redes que usa familias de protocolos como TCP/IP para comunicar sistemas.',
 cpu:'La CPU ejecuta instrucciones y coordina operaciones mediante unidades de cálculo, control, registros y cachés.',
 ram:'La RAM es memoria volátil de acceso rápido donde se mantienen temporalmente programas y datos en uso.',
 python:'Python es un lenguaje de propósito general con sintaxis legible, usado en automatización, web, ciencia de datos e IA.',
 javascript:'JavaScript es un lenguaje de programación utilizado ampliamente en navegadores y en runtimes como Node.js.',
 lua:'Lua es un lenguaje ligero y embebible; Roblox usa Luau, un dialecto propio basado en Lua.',
 luau:'Luau es el lenguaje de scripting utilizado por Roblox, basado en Lua y ampliado con tipado opcional y herramientas propias.',
 roblox:'Roblox es una plataforma de creación y ejecución de experiencias donde el scripting se realiza principalmente con Luau.',
 docker:'Docker permite empaquetar una aplicación con dependencias en contenedores reproducibles.',
 api:'Una API es un contrato mediante el cual un software expone operaciones o datos a otro software.',
 http:'HTTP es un protocolo de comunicación de la web con métodos como GET, POST, PUT y DELETE.',
 git:'Git es un sistema distribuido de control de versiones basado en commits, ramas y fusiones.',
 html:'HTML define la estructura semántica de una página web.',
 css:'CSS define la presentación visual y el layout de documentos web.',
 sql:'SQL es un lenguaje para consultar y modificar bases de datos relacionales.',
 algoritmo:'Un algoritmo es una secuencia finita y definida de pasos para transformar entradas en resultados.',
 ia:'La IA reúne técnicas que permiten a los sistemas aprender, clasificar, predecir, generar o decidir bajo reglas y modelos.'
};
const JOKES=[
 '¿Por qué el programador confunde Halloween y Navidad? Porque OCT 31 = DEC 25.',
 'Hay 10 tipos de personas: las que entienden binario y las que no.',
 'Mi código no tiene bugs; tiene características que aún no documenté.',
 'Un SQL entra al bar, ve dos tablas y dice: «puedo hacer un JOIN?»'
];
const STARTER=[
 ['hola','greeting'],['buenas','greeting'],['hey','greeting'],['qué tal','greeting'],['hello','greeting'],
 ['2+2','math'],['144/12','math'],['raíz de 81','math'],['20% de 50','math'],
 ['haz un html que diga hola','html'],['landing page moderna','html'],['pagina web con boton','html'],
 ['anti afk roblox','luau'],['script luau','luau'],['esp roblox','luau'],['noclip','luau'],['fly script','luau'],
 ['que es docker','knowledge'],['que es python','knowledge'],['que es una api','knowledge'],['explica la fotosintesis','knowledge'],
 ['cuentame un chiste','humor'],['hazme reir','humor'],['broma','humor'],['quien eres','meta'],['como funcionas','meta'],['gracias','thanks']
];
function norm(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function md(s){
 const blocks=[];
 s=s.replace(/```([\w+#-]+)?\n([\s\S]*?)```/g,(_,l,c)=>{const id='@@'+blocks.length+'@@';blocks.push('<pre><code>'+esc(c.trim())+'</code></pre>');return id});
 let o=esc(s).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');
 blocks.forEach((b,i)=>o=o.replace('@@'+i+'@@',b));return o;
}
function math(q){
 let m=q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*x×÷\/])\s*(-?\d+(?:\.\d+)?)/);
 if(m){const a=+m[1],b=+m[3],op=m[2];let r;if(op==='+')r=a+b;else if(op==='-')r=a-b;else if(op==='*'||op==='x'||op==='×')r=a*b;else if(op==='÷'||op==='/')r=b===0?'indefinido':a/b;return '**'+a+' '+op+' '+b+' = '+r+'**';}
 m=q.match(/raiz(?: cuadrada)?(?: de)?\s*(-?\d+(?:\.\d+)?)/);if(m)return '√'+m[1]+' ≈ **'+Math.sqrt(+m[1]).toFixed(6)+'**';
 m=q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:de\s*)?(\d+(?:\.\d+)?)/);if(m)return m[1]+'% de '+m[2]+' = **'+(+m[1]/100*+m[2])+'**';
 m=q.match(/(-?\d+(?:\.\d+)?)\s*\^\s*(-?\d+(?:\.\d+)?)/);if(m)return m[1]+'^'+m[2]+' = **'+Math.pow(+m[1],+m[2])+'**';
 return null;
}
function buildHTML(raw){
 let text='QyrexAI';const q=raw.match(/(?:diga|muestre|texto|titulo|título)\s*[:]?\s*["“]?([^"”\n]{1,160})/i);if(q)text=q[1].trim();
 const safe=esc(text.replace(/["“”]/g,''));
 return '```html\n<!doctype html>\n<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe+'</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080910;color:#fff;font-family:system-ui}main{padding:48px;border-radius:28px;border:1px solid #30354a;background:rgba(255,255,255,.06);box-shadow:0 20px 80px #0008;text-align:center}h1{font-size:clamp(2rem,7vw,5rem);margin:0;background:linear-gradient(135deg,#a78bfa,#50dcff);-webkit-background-clip:text;color:transparent}</style></head><body><main><h1>'+safe+'</h1></main></body></html>\n```';
}
function luau(kind){
 if(kind==='afk')return '```lua\nlocal Players=game:GetService("Players")\nlocal VirtualUser=game:GetService("VirtualUser")\nlocal player=Players.LocalPlayer\nplayer.Idled:Connect(function() VirtualUser:CaptureController(); VirtualUser:ClickButton2(Vector2.new()) end)\n```';
 if(kind==='esp')return '```lua\nlocal Players=game:GetService("Players")\nlocal LocalPlayer=Players.LocalPlayer\nlocal function apply(character) if character:FindFirstChild("QyrexHighlight") then return end local h=Instance.new("Highlight");h.Name="QyrexHighlight";h.FillTransparency=.55;h.Parent=character end\nfor _,p in ipairs(Players:GetPlayers()) do if p~=LocalPlayer and p.Character then apply(p.Character) end end\n```';
 if(kind==='speed')return '```lua\nlocal player=game:GetService("Players").LocalPlayer\nlocal function apply(char) char:WaitForChild("Humanoid").WalkSpeed=32 end\nif player.Character then apply(player.Character) end\nplayer.CharacterAdded:Connect(apply)\n```';
 if(kind==='fly')return '```lua\nlocal Players=game:GetService("Players")\nlocal RunService=game:GetService("RunService")\nlocal player=Players.LocalPlayer\nlocal on=false\nRunService.RenderStepped:Connect(function() local c=player.Character;local r=c and c:FindFirstChild("HumanoidRootPart");if r and on then r.AssemblyLinearVelocity=workspace.CurrentCamera.CFrame.LookVector*60 end end)\n```';
 if(kind==='noclip')return '```lua\nlocal Players=game:GetService("Players")\nlocal RunService=game:GetService("RunService")\nlocal player=Players.LocalPlayer\nRunService.Stepped:Connect(function() local c=player.Character;if not c then return end;for _,p in ipairs(c:GetDescendants()) do if p:IsA("BasePart") then p.CanCollide=false end end end)\n```';
 return null;
}
class QyrexEngine{
 constructor(model){this.model=model;this.memory=[];this.history=[];this.prototypes=STARTER.map(x=>({text:x[0],label:x[1]}));}
 load(){try{this.memory=JSON.parse(localStorage.getItem('qyrex_memory_v2')||'[]').slice(-300)}catch(e){this.memory=[]}}
 save(){try{localStorage.setItem('qyrex_memory_v2',JSON.stringify(this.memory.slice(-300)))}catch(e){}}
 remember(user,answer,embedding){this.memory.push({user,answer,embedding:Array.from(embedding),t:Date.now()});this.memory=this.memory.slice(-300);this.save()}
 nearest(text){const emb=this.model.encode(text);let best=null,score=-1;for(const m of this.memory.slice(-120)){if(!m.embedding)continue;const s=this.model.similarity(emb,m.embedding);if(s>score){score=s;best=m}}return score>.78?best:null}
 respond(raw){
  const q=norm(raw);
  const m=math(q);if(m)return m;
  for(const k of Object.keys(FACTS))if(q.includes(norm(k)))return FACTS[k];
  if(/html|pagina|landing|sitio web/.test(q))return buildHTML(raw);
  if(/anti.?afk|\bafk\b/.test(q))return 'Código local Anti-AFK:\n\n'+luau('afk');
  if(/\besp\b|highlight|chams/.test(q))return 'Ejemplo local de Highlight:\n\n'+luau('esp');
  if(/\bspeed\b|walkspeed|velocidad/.test(q))return 'Ejemplo local:\n\n'+luau('speed');
  if(/\bfly\b|volar|vuelo/.test(q))return 'Ejemplo local:\n\n'+luau('fly');
  if(/noclip|no clip|atravesar/.test(q))return 'Ejemplo local:\n\n'+luau('noclip');
  if(/chiste|broma|rie|reir|joke/.test(q))return JOKES[hash32(q)%JOKES.length];
  if(/quien eres|que eres|what are you/.test(q))return 'Soy **QyrexAI 2.0**, una IA experimental local. El sitio puede servirse en Render como estático y el procesamiento ocurre en el navegador. No llamo a APIs de modelos externas.';
  if(/gracias|thanks|thx/.test(q))return 'De nada. Seguimos mejorando QyrexAI.';
  if(/^(hola|hey|buenas|hello|hi)\b/.test(q))return 'Hola. Estoy listo. Dime qué quieres construir, explicar o programar.';
  const old=this.nearest(raw);if(old)return 'Recuerdo una conversación relacionada:\n\n**'+old.user+'**\n\n'+old.answer;
  const words=q.split(/\s+/).filter(x=>x.length>2).slice(0,8);
  const cls=this.model.classify(raw);
  return 'Estoy procesando **'+words.join(', ')+'** con el núcleo local.\n\nEsta versión separa razonamiento neuronal, memoria y herramientas locales. Para obtener respuestas cada vez más específicas, añade ejemplos desde el panel de entrenamiento.\n\nClase neural: `'+cls.klass+'` · score `'+cls.score.toFixed(3)+'`';
 }
}
window.QyrexEngine=QyrexEngine;
window.QyrexStarterDataset=STARTER;
window.QyrexMarkdown=md;
window.QyrexBuildHTML=buildHTML;
})();
