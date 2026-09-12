(function(){
'use strict';

const KB={
 'fotosintesis':{t:'ciencia',a:'La fotosíntesis es el proceso por el que plantas, algas y algunos microorganismos convierten energía luminosa en energía química. En la fotosíntesis oxigénica, usan agua y dióxido de carbono para formar compuestos orgánicos y liberan oxígeno.'},
 'gravedad':{t:'ciencia',a:'La gravedad es la interacción asociada a la masa y la energía. Cerca de la superficie terrestre produce una aceleración aproximada de 9.81 m/s². En relatividad general se describe como la geometría del espacio-tiempo.'},
 'adn':{t:'biologia',a:'El ADN es la molécula que almacena la información genética. Está formado por nucleótidos con cuatro bases principales: A, T, C y G. La secuencia de esas bases codifica instrucciones biológicas.'},
 'internet':{t:'tecnologia',a:'Internet es una red mundial de redes que intercambian datos mediante protocolos como IP y TCP/UDP. La Web es uno de sus servicios y funciona principalmente sobre HTTP/HTTPS.'},
 'cpu':{t:'tecnologia',a:'La CPU ejecuta instrucciones y coordina operaciones de un sistema. Incluye núcleos de procesamiento, registros, unidades aritmético-lógicas, cachés y lógica de control.'},
 'ram':{t:'tecnologia',a:'La RAM es memoria de trabajo rápida y volátil. Guarda temporalmente los datos y programas que el sistema está utilizando; su contenido normalmente desaparece al apagar el equipo.'},
 'python':{t:'programacion',a:'Python es un lenguaje de propósito general conocido por su sintaxis legible. Se usa en automatización, backend, ciencia de datos, scripting, herramientas y aprendizaje automático.'},
 'javascript':{t:'programacion',a:'JavaScript es un lenguaje dinámico usado en navegadores y también en entornos como Node.js. Permite trabajar con eventos, interfaces, redes, archivos y aplicaciones de servidor.'},
 'lua':{t:'programacion',a:'Lua es un lenguaje ligero y embebible. Roblox utiliza Luau, una variante de Lua con características adicionales de rendimiento, análisis y tipado opcional.'},
 'luau':{t:'programacion',a:'Luau es el lenguaje de scripting de Roblox. Está basado en Lua y añade tipado opcional, optimizaciones y funciones pensadas para crear experiencias de Roblox.'},
 'roblox':{t:'gaming',a:'Roblox es una plataforma para crear y jugar experiencias. Los scripts se escriben principalmente en Luau y pueden ejecutarse en el cliente o en el servidor según el diseño del juego.'},
 'docker':{t:'tecnologia',a:'Docker empaqueta aplicaciones y sus dependencias en contenedores reproducibles. Esto ayuda a mantener entornos consistentes entre desarrollo, pruebas y despliegue.'},
 'api':{t:'tecnologia',a:'Una API es una interfaz que define cómo un programa puede comunicarse con otro. Puede exponer datos, operaciones o eventos y usar distintos formatos y protocolos.'},
 'http':{t:'web',a:'HTTP es un protocolo de comunicación de la Web. Los métodos más conocidos incluyen GET, POST, PUT y DELETE. HTTPS añade cifrado mediante TLS.'},
 'git':{t:'programacion',a:'Git es un sistema distribuido de control de versiones. Permite registrar cambios mediante commits y trabajar con ramas para desarrollar funciones sin perder el historial.'},
 'html':{t:'web',a:'HTML define la estructura y el significado de una página web mediante elementos como títulos, párrafos, enlaces, formularios y secciones.'},
 'css':{t:'web',a:'CSS controla la presentación de una página: colores, tipografías, espaciado, posiciones, animaciones, layouts flexibles y diseño responsive.'},
 'sql':{t:'datos',a:'SQL es un lenguaje para consultar y modificar bases de datos relacionales. Permite seleccionar, insertar, actualizar y eliminar datos y relacionar tablas.'},
 'algoritmo':{t:'programacion',a:'Un algoritmo es una secuencia finita de pasos definidos para transformar unas entradas en un resultado.'},
 'ia':{t:'inteligencia artificial',a:'La inteligencia artificial reúne métodos que permiten a los sistemas reconocer patrones, predecir, clasificar, generar contenido o tomar decisiones. Los modelos generativos aprenden esas capacidades a partir de datos.'},
 'json':{t:'programacion',a:'JSON es un formato de texto para representar objetos, listas, cadenas, números, booleanos y valores nulos. Es común para intercambiar datos entre programas.'},
 'linux':{t:'sistemas',a:'Linux es un kernel de código abierto utilizado por numerosas distribuciones y sistemas. Es especialmente común en servidores, desarrollo y dispositivos embebidos.'},
 'windows':{t:'sistemas',a:'Windows es una familia de sistemas operativos de Microsoft orientada a equipos personales, empresas y servidores.'},
 'latencia':{t:'redes',a:'La latencia es el tiempo que tarda una señal o petición en viajar desde un origen hasta un destino y, según la medición, regresar con una respuesta.'},
 'servidor':{t:'web',a:'Un servidor es un programa o máquina que atiende peticiones de otros programas llamados clientes. Puede servir páginas, archivos, datos o ejecutar lógica de una aplicación.'},
 'cliente':{t:'web',a:'Un cliente es el programa que inicia o consume un servicio. Un navegador, por ejemplo, puede actuar como cliente de un servidor web.'}
};

const JOKES=[
 '¿Por qué el programador confunde Halloween y Navidad? Porque OCT 31 = DEC 25.',
 'Hay 10 tipos de personas: las que entienden binario y las que no.',
 'Mi código no tiene bugs; tiene funciones sorpresa.',
 'Un SQL entra al bar, ve dos tablas y pregunta: “¿puedo hacer un JOIN?”'
];

const STARTER=[
 ['hola','greeting'],['buenas','greeting'],['hey','greeting'],['qué tal','greeting'],['hello','greeting'],
 ['2+2','math'],['144/12','math'],['raíz de 81','math'],['20% de 50','math'],
 ['haz un html que diga hola','html'],['landing page moderna','html'],['pagina web con boton','html'],
 ['anti afk roblox','luau'],['script luau','luau'],['esp roblox','luau'],['noclip','luau'],['fly script','luau'],
 ['que es docker','knowledge'],['que es python','knowledge'],['que es una api','knowledge'],['explica la fotosintesis','knowledge'],
 ['cuentame un chiste','humor'],['hazme reir','humor'],['broma','humor'],['quien eres','meta'],['como funcionas','meta'],['gracias','thanks']
];

function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function md(s){
 const blocks=[];
 s=s.replace(/```([\w+#-]+)?\n([\s\S]*?)```/g,(_,l,c)=>{const id='@@'+blocks.length+'@@';blocks.push('<pre><code>'+esc(c.trim())+'</code></pre>');return id});
 let o=esc(s).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');
 blocks.forEach((b,i)=>o=o.replace('@@'+i+'@@',b));return o;
}

function math(q){
 let m=q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*x×÷\/])\s*(-?\d+(?:\.\d+)?)/);
 if(m){const a=+m[1],b=+m[3],op=m[2];let r;if(op==='+')r=a+b;else if(op==='-')r=a-b;else if(op==='*'||op==='x'||op==='×')r=a*b;else r=b===0?'indefinido':a/b;return '**'+a+' '+op+' '+b+' = '+r+'**';}
 m=q.match(/raiz(?: cuadrada)?(?: de)?\s*(-?\d+(?:\.\d+)?)/);if(m){const n=+m[1];return n<0?'No existe una raíz cuadrada real de '+n+'.':'√'+n+' ≈ **'+Math.sqrt(n).toFixed(6)+'**';}
 m=q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:de\s*)?(\d+(?:\.\d+)?)/);if(m)return m[1]+'% de '+m[2]+' = **'+(+m[1]/100*+m[2])+'**';
 m=q.match(/(-?\d+(?:\.\d+)?)\s*\^\s*(-?\d+(?:\.\d+)?)/);if(m)return m[1]+'^'+m[2]+' = **'+Math.pow(+m[1],+m[2])+'**';
 return null;
}

function buildHTML(raw){
 let text='QyrexAI';
 const q=raw.match(/(?:diga|muestre|texto|titulo|título|mensaje)\s*[:\s]*["“]?([^"”\n]{1,160})/i);
 if(q)text=q[1].trim();
 const safe=esc(text.replace(/["“”]/g,''));
 return '```html\n<!doctype html>\n<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe+'</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#17162a,#07080c 55%);color:#fff;font-family:Inter,system-ui,sans-serif}main{width:min(720px,90vw);padding:64px 42px;border-radius:28px;border:1px solid #34384b;background:rgba(255,255,255,.06);backdrop-filter:blur(18px);box-shadow:0 30px 100px #0009;text-align:center}h1{font-size:clamp(2rem,7vw,5rem);margin:0;background:linear-gradient(135deg,#a78bfa,#50dcff);-webkit-background-clip:text;color:transparent}</style></head><body><main><h1>'+safe+'</h1></main></body></html>\n```';
}

function luau(kind){
 if(kind==='afk')return '```lua\nlocal Players=game:GetService("Players")\nlocal VirtualUser=game:GetService("VirtualUser")\nlocal player=Players.LocalPlayer\nplayer.Idled:Connect(function()\n    VirtualUser:CaptureController()\n    VirtualUser:ClickButton2(Vector2.new())\nend)\n```';
 if(kind==='esp')return '```lua\nlocal Players=game:GetService("Players")\nlocal LocalPlayer=Players.LocalPlayer\nlocal function apply(character)\n    if character:FindFirstChild("QyrexHighlight") then return end\n    local h=Instance.new("Highlight")\n    h.Name="QyrexHighlight"\n    h.FillTransparency=.55\n    h.Parent=character\nend\nfor _,p in ipairs(Players:GetPlayers()) do\n    if p~=LocalPlayer and p.Character then apply(p.Character) end\nend\n```';
 if(kind==='speed')return '```lua\nlocal Players=game:GetService("Players")\nlocal player=Players.LocalPlayer\nlocal function apply(character)\n    character:WaitForChild("Humanoid").WalkSpeed=32\nend\nif player.Character then apply(player.Character) end\nplayer.CharacterAdded:Connect(apply)\n```';
 if(kind==='fly')return '```lua\nlocal Players=game:GetService("Players")\nlocal RunService=game:GetService("RunService")\nlocal player=Players.LocalPlayer\nlocal enabled=false\nRunService.RenderStepped:Connect(function()\n    local c=player.Character\n    local root=c and c:FindFirstChild("HumanoidRootPart")\n    if root and enabled then\n        root.AssemblyLinearVelocity=workspace.CurrentCamera.CFrame.LookVector*60\n    end\nend)\n```';
 if(kind==='noclip')return '```lua\nlocal Players=game:GetService("Players")\nlocal RunService=game:GetService("RunService")\nlocal player=Players.LocalPlayer\nRunService.Stepped:Connect(function()\n    local c=player.Character\n    if not c then return end\n    for _,p in ipairs(c:GetDescendants()) do\n        if p:IsA("BasePart") then p.CanCollide=false end\n    end\nend)\n```';
 return null;
}

function extractTopic(q){
 const cleaned=q.replace(/\b(que|qué|es|un|una|el|la|los|las|como|cómo|funciona|para|por|de|del|me|puedes|puede|hacer|haz|dame|explica|explicame|explícame)\b/g,' ').replace(/[^a-z0-9áéíóúñü\s_-]/gi,' ').replace(/\s+/g,' ').trim();
 return cleaned.split(' ').filter(x=>x.length>2).slice(0,6).join(' ');
}

function nearestKnowledge(q){
 const nq=norm(q);let best=null,bscore=0;
 for(const [k,v] of Object.entries(KB)){
  let s=0;if(nq===k)s+=8;if(nq.includes(k))s+=6;if(k.includes(nq)&&nq.length>2)s+=3;
  const words=new Set(nq.split(/\s+/)); for(const w of k.split(/\s+/)) if(words.has(w))s+=2;
  if(s>bscore){bscore=s;best={key:k,...v,score:s};}
 }
 return best&&bscore>=2?best:null;
}

class QyrexEngine{
 constructor(model){this.model=model;this.memory=[];this.history=[];this.prototypes=STARTER.map(x=>({text:x[0],label:x[1]}));}
 load(){try{this.memory=JSON.parse(localStorage.getItem('qyrex_memory_v3')||'[]').slice(-400);this.history=JSON.parse(localStorage.getItem('qyrex_history_v3')||'[]').slice(-20)}catch(e){this.memory=[];this.history=[]}}
 save(){try{localStorage.setItem('qyrex_memory_v3',JSON.stringify(this.memory.slice(-400)));localStorage.setItem('qyrex_history_v3',JSON.stringify(this.history.slice(-20)))}catch(e){}}
 remember(user,answer,embedding){this.memory.push({user,answer,embedding:Array.from(embedding),t:Date.now()});this.memory=this.memory.slice(-400);this.history.push({user,assistant:answer});this.history=this.history.slice(-20);this.save()}
 nearest(text){const emb=this.model.encode(text);let best=null,score=-1;for(const m of this.memory.slice(-180)){if(!m.embedding)continue;const s=this.model.similarity(emb,m.embedding);if(s>score){score=s;best=m}}return score>.84?best:null}
 contextHint(){const h=this.history.slice(-4).map(x=>x.user).filter(Boolean);return h.length?'Contexto reciente: '+h.join(' | '):''}
 composeUnknown(raw){
  const q=norm(raw),topic=extractTopic(raw),ctx=this.contextHint();
  if(/^(por que|porque|por qué)/.test(q))return 'La respuesta depende de **'+(topic||'la situación')+'**.\n\nPara explicarlo bien hay que distinguir la causa principal, los factores que influyen y el resultado. En general, empieza por identificar qué cambió, qué lo provoca y qué evidencia tienes.\n\nSi me das el caso concreto, puedo desglosarlo paso a paso.';
  if(/^(como|cómo)\b/.test(q)||/\bcomo puedo\b/.test(q))return '**Cómo abordar '+(topic||'esto')+':**\n\n1. Define exactamente el resultado que quieres.\n2. Divide el problema en partes pequeñas.\n3. Haz una primera versión mínima.\n4. Prueba cada parte y corrige lo que falle.\n5. Mejora rendimiento, seguridad y experiencia después de validar la base.\n\n'+(ctx?'Puedo continuar usando el contexto de esta charla.':'Dime la herramienta, lenguaje o situación y lo adapto.');
  if(/\b(diferencia|diferencias|mejor|vs|versus|compar(a|ar))\b/.test(q))return 'Para comparar opciones conviene mirar **rendimiento, facilidad de uso, coste, compatibilidad, mantenimiento y objetivo final**.\n\nEn '+(topic||'tu caso')+', la mejor opción depende de qué priorices. Si me das las dos opciones concretas, te hago una comparación directa con ventajas, desventajas y una recomendación.';
  if(/\b(lista|listame|dame|menciona|nombra)\b/.test(q))return '**Opciones relacionadas con '+(topic||'el tema')+':**\n\n1. Concepto principal\n2. Alternativa común\n3. Opción avanzada\n4. Enfoque rápido\n5. Enfoque más completo\n\nPuedo convertir esta lista en una explicación detallada, tabla o código según necesites.';
  if(/\b(resume|resumen|resume esto|explica corto)\b/.test(q))return 'Puedo resumirlo en una idea central y después separar los puntos importantes. En este momento necesito que me pases el texto o contenido concreto que quieres resumir.';
  if(/\b(traduce|traducir|traduccion|traducción)\b/.test(q))return 'Claro. Pega el texto y dime el idioma de destino; puedo conservar el significado y adaptar el tono.';
  if(/\b(reescribe|mejora|corrige|redacta|hazlo mas profesional)\b/.test(q))return 'Puedo reescribirlo con mejor claridad, gramática y tono. Pégame el texto y te devolveré una versión lista para copiar.';
  if(/\b(codigo|código|script|programa|funcion|función)\b/.test(q))return 'Sí puedo ayudarte con código. Para no inventar una solución incompatible, especifica el lenguaje y el comportamiento exacto; también puedo partir de un error que ya tengas y corregirlo.';
  if(/\?$/.test(q))return 'La mejor respuesta para **'+(topic||'esa pregunta')+'** depende del contexto. Puedo darte una explicación directa, un ejemplo y después una versión más avanzada. Añade un poco de contexto y lo concreto.';
  return 'Entiendo el tema de **'+(topic||'tu mensaje')+'**. Puedo ayudarte a analizarlo, explicarlo, convertirlo en pasos, escribir código o comparar alternativas.\n\nNo tengo un modelo de lenguaje gigantesco preentrenado embebido dentro de este navegador, así que no voy a fingir que conozco datos que no tengo. Aun así, este motor usa el contexto de la conversación, memoria local, recuperación de conocimiento y herramientas especializadas para construir una respuesta útil.';
 }
 respond(raw){
  const q=norm(raw);
  let r=math(q); if(r)return r;
  const k=nearestKnowledge(q); if(k){return '**'+k.key+'**\n\n'+k.a+'\n\n*Área: '+k.t+'*';}
  if(/^(hola|hey|buenas|hello|hi|que tal|qué tal)\b/.test(q)){
   const prior=this.history.length?' Recuerdo el contexto de esta conversación.':'';
   return 'Hola 👋. Soy **QyrexAI**, tu asistente local.'+prior+'\n\nPuedo ayudarte con programación, Roblox/Luau, HTML/CSS/JS, matemáticas, explicaciones, escritura, ideas, depuración y mucho más.';
  }
  if(/quien eres|que eres|what are you|como funcionas/.test(q))return 'Soy **QyrexAI**, un asistente ejecutado localmente en tu propio servicio. Tengo memoria local, contexto conversacional, recuperación de conocimiento y herramientas de programación.\n\nNo voy a decirte que soy idéntico a ChatGPT: un modelo de nivel frontera requiere pesos preentrenados gigantes y un entrenamiento que esta versión local no posee. El objetivo de esta arquitectura es acercarnos funcionalmente sin depender de una API externa.';
  if(/gracias|thanks|thx/.test(q))return 'De nada 😎. Seguimos.';
  if(/chiste|broma|rie|reir|joke/.test(q))return JOKES[hash32(q)%JOKES.length];
  if(/html|pagina|landing|sitio web/.test(q))return buildHTML(raw);
  if(/anti.?afk|\bafk\b/.test(q))return 'Código local Anti-AFK:\n\n'+luau('afk');
  if(/\besp\b|highlight|chams/.test(q))return 'Ejemplo local de Highlight:\n\n'+luau('esp');
  if(/\bspeed\b|walkspeed|velocidad/.test(q))return 'Ejemplo local:\n\n'+luau('speed');
  if(/\bfly\b|volar|vuelo/.test(q))return 'Ejemplo local:\n\n'+luau('fly');
  if(/noclip|no clip|atravesar/.test(q))return 'Ejemplo local:\n\n'+luau('noclip');
  const old=this.nearest(raw); if(old)return 'Encontré una conversación relacionada en tu memoria local:\n\n> '+old.user+'\n\n'+old.answer;
  return this.composeUnknown(raw);
 }
}
window.QyrexEngine=QyrexEngine;
window.QyrexStarterDataset=STARTER;
window.QyrexMarkdown=md;
window.QyrexBuildHTML=buildHTML;
window.QyrexKnowledgeBase=KB;
})();
