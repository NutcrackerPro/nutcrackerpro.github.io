'use strict';
let draft;
let dirty = false;
let loading = false;
let loadCount = 0;
const form = document.getElementById('portfolio-form');
const status = document.getElementById('editor-status');
const download = document.getElementById('download');
const copy = document.getElementById('copy');
const refresh = document.getElementById('refresh-published');
const scalar = ['name','greeting','nickname','intro','heroImageAlt','artCaption','achievementsIntro','hobbiesIntro','factsIntro','journalTitle','journalIntro'];
const schemas = {
  achievements:[['year','Year'],['title','Achievement'],['description','What would you like to share?','textarea'],['image','Photo (optional)','image'],['imageAlt','Describe the photo']],
  hobbies:[['title','Hobby'],['description','Tell me more about it','textarea'],['image','Photo (optional)','image'],['imageAlt','Describe the photo']],
  facts:[['title','Card front — a title or question'],['description','Card back — your random fact','textarea']],
  smileyPhrases:[['text','Smiley phrase']],
  journalEntries:[['type','Entry category','journalType'],['title','Entry title'],['date','Date (optional)'],['location','Place / location (optional)'],['description','The story behind it (optional)','textarea'],['image','Photo (optional)','image'],['imageAlt','Describe the photo for someone who cannot see it']],
  soundtracks:[['title','Track title'],['url','Soundtrack','audio']],
  contacts:[['label','Contact name'],['type','What kind of contact?','select'],['value','Email address, username or full web link']]
};
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function change(){dirty=true;status.textContent='Unsaved draft — download or copy your changes before leaving.';}
function imageSource(value){if(typeof value!=='string'||!value.trim())return '';if(/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/.test(value))return value;try{const u=new URL(value.replace(/^\/(?!\/)/,''),document.baseURI);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
const audioMimeTypes=new Set(['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/wave','audio/aac','audio/mp4','audio/x-m4a','audio/webm','audio/flac','audio/x-flac']);
const audioDataPattern=/^data:audio\/(mpeg|ogg|wav|x-wav|wave|aac|mp4|x-m4a|webm|flac|x-flac);base64,([A-Za-z0-9+/]+={0,2})$/;
function audioSource(value){
 if(typeof value!=='string'||!value.trim())return '';const source=value.trim();const embedded=source.match(audioDataPattern);
 if(embedded){try{if(embedded[2].length%4!==0||atob(embedded[2]).length>2*1024*1024)return '';return source;}catch{return '';}}
 try{const url=new URL(source);return url.protocol==='https:'&&/\.(mp3|ogg|oga|wav|m4a|aac|mp4|webm|flac)$/i.test(url.pathname)?url.href:'';}catch{return '';}
}
function readAudioFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read that audio file. Please try again.'));const aliases={'audio/mp3':'audio/mpeg','audio/x-wav':'audio/wav','audio/wave':'audio/wav','audio/x-m4a':'audio/mp4','audio/x-flac':'audio/flac'};reader.readAsDataURL(new Blob([file],{type:aliases[file.type]||file.type}));});}
function checkAudioFile(source){return new Promise((resolve,reject)=>{const probe=document.createElement('audio');probe.preload='metadata';let timer;const finish=error=>{clearTimeout(timer);probe.onloadedmetadata=null;probe.onerror=null;probe.removeAttribute('src');probe.load();error?reject(error):resolve();};probe.onloadedmetadata=()=>finish();probe.onerror=()=>finish(new Error('That file could not be played by this browser. Try an MP3, OGG or WAV audio file.'));timer=setTimeout(()=>finish(new Error('The audio file could not be checked. Please try a smaller MP3, OGG or WAV file.')),10000);probe.src=source;probe.load();});}
function audioField(label,value,set){
 const owner=draft;let version=0;const wrap=node('div','audio-field');const preview=node('audio','audio-preview');preview.controls=true;preview.preload='none';preview.setAttribute('aria-label','Soundtrack preview');
 function show(source){preview.pause();preview.hidden=!source;if(source)preview.src=source;else preview.removeAttribute('src');preview.load();}
 const url=field(label+' — direct HTTPS audio link',value,next=>{version++;set(next);const source=audioSource(next);show(source);if(next.trim()&&!source)status.textContent='Use a direct HTTPS link to an MP3, OGG, WAV, M4A, AAC, WebM or FLAC audio file, or choose an audio file below.';});const textInput=url.querySelector('input');textInput.maxLength=4096;textInput.placeholder='https://example.com/track.mp3';
 if(typeof value==='string'&&value.startsWith('data:')){textInput.value='';textInput.placeholder='Uploaded soundtrack selected';}
 show(audioSource(value));
 const upload=node('input','audio-upload');upload.type='file';upload.accept='audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/wave,audio/aac,audio/mp4,audio/x-m4a,audio/webm,audio/flac,audio/x-flac,.mp3,.ogg,.oga,.wav,.aac,.m4a,.webm,.flac';const uploadLabel=node('label','','Or choose an audio file (up to 2 MB)');uploadLabel.append(upload);
 upload.addEventListener('change',async()=>{const file=upload.files[0];if(!file)return;const request=++version;if(!audioMimeTypes.has(file.type)||file.size===0||file.size>2*1024*1024){status.textContent='Choose a supported audio file under 2 MB. For a longer track, use a direct HTTPS audio link.';upload.value='';return;}
  upload.disabled=true;status.textContent='Checking your soundtrack…';
  try{const source=await readAudioFile(file);if(!audioSource(source))throw new Error('That file is not a supported audio upload.');await checkAudioFile(source);if(draft!==owner||!wrap.isConnected||request!==version)return;set(source);show(source);textInput.value='';textInput.placeholder='Uploaded soundtrack selected';change();}
  catch(error){if(draft===owner&&wrap.isConnected&&request===version)status.textContent=error.message||'Could not open that soundtrack. Please choose another.';}
  finally{upload.disabled=false;upload.value='';}
 });
 const clear=node('button','secondary-button audio-clear','Remove audio');clear.type='button';clear.addEventListener('click',()=>{version++;set('');show('');textInput.value='';textInput.placeholder='https://example.com/track.mp3';change();});
 preview.addEventListener('play',()=>{document.querySelectorAll('.audio-preview').forEach(audio=>{if(audio!==preview)audio.pause();});});preview.addEventListener('error',()=>{if(draft===owner&&wrap.isConnected)status.textContent='This track could not be previewed. Check that the link opens an audio file and is publicly accessible.';});
 wrap.append(preview,url,uploadLabel,clear,node('p','field-help','MP3, OGG, WAV, M4A, AAC, WebM and FLAC files are supported where your browser can play them. Uploaded audio stays in this draft until you publish.'));
 return wrap;
}
function field(label,value,set,type='text'){
 const wrap=node('label','',label);const input=node(type==='textarea'?'textarea':(type==='select'||type==='journalType')?'select':'input');
 if(type==='select'||type==='journalType'){for(const [v,t] of (type==='journalType'?[['artwork','Photo'],['travel','Place / travel']]:[['link','Web link'],['email','Email'],['copy','Copy username']])){const option=node('option','',t);option.value=v;input.append(option);}}
 else if(type==='textarea')input.rows=4;else input.type='text';
 input.value=value|| (type==='select'?'link':type==='journalType'?'artwork':'');if(type!=='select'&&type!=='journalType')input.maxLength=type==='textarea'?6000:500;
 input.addEventListener('input',()=>{set(input.value);change();});wrap.append(input);return wrap;
}
function readPhotoFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read that image. Please try again.'));reader.readAsDataURL(file);});}
async function preparePhoto(file){
 const maxResult=2*1024*1024;
 if(file.type==='image/gif'){if(file.size>maxResult)throw new Error('Animated GIFs must be under 2 MB so their animation can be preserved.');return readPhotoFile(file);}
 const temporary=URL.createObjectURL(file);const image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('That image could not be opened. Please choose another.'));image.src=temporary;});
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('That image could not be opened. Please choose another.');
  const longest=Math.max(image.naturalWidth,image.naturalHeight);
  if(file.size<=750*1024&&longest<=2048)return readPhotoFile(file);
  const canvas=document.createElement('canvas');const context=canvas.getContext('2d');if(!context)throw new Error('Your browser could not prepare this photo. Try a smaller image.');
  let limit=2048;
  for(let step=0;step<4;step++){
   const scale=Math.min(1,limit/longest);canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));context.drawImage(image,0,0,canvas.width,canvas.height);
   const format=file.type==='image/jpeg'?'image/jpeg':'image/webp';
   for(const quality of [.88,.78,.68]){const result=canvas.toDataURL(format,quality);const bytes=Math.ceil((result.length-result.indexOf(',')-1)*.75);if(bytes<=900*1024||(quality===.68&&bytes<=maxResult))return result;}
   limit=Math.round(limit*.8);
  }
  throw new Error('This photo is still over 2 MB after resizing. Please choose a smaller image.');
 }finally{URL.revokeObjectURL(temporary);}
}
function imageField(label,value,set){
 const owner=draft;
 const wrap=node('div','image-field');const preview=node('img','photo-preview');preview.alt='Selected image preview';const src=imageSource(value);preview.hidden=!src;if(src)preview.src=src;
 const url=field(label+' — image path or URL',value,v=>{set(v);const s=imageSource(v);preview.hidden=!s;if(s)preview.src=s;});const textInput=url.querySelector('input');
 if(typeof value==='string'&&value.startsWith('data:')){textInput.value='';textInput.placeholder='Uploaded photo selected';}
 const upload=node('input','image-upload');upload.type='file';upload.accept='image/png,image/jpeg,image/webp,image/gif,image/avif';
 const uploadLabel=node('label','','Or choose a photo');uploadLabel.append(upload);
 upload.addEventListener('change',async()=>{const file=upload.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type)||file.size>15*1024*1024){status.textContent='Choose a PNG, JPG, WebP or AVIF photo under 15 MB, or an animated GIF under 2 MB.';upload.value='';return;}
  upload.disabled=true;status.textContent='Preparing your photo…';
  try{const source=await preparePhoto(file);if(draft!==owner||!wrap.isConnected)return;set(source);preview.src=source;preview.hidden=false;textInput.value='';textInput.placeholder='Uploaded photo selected';change();}
  catch(error){if(draft===owner&&wrap.isConnected)status.textContent=error.message||'Could not prepare that image. Please try another.';}
  finally{upload.disabled=false;upload.value='';}
 });
 const help=node('p','field-help','JPG, PNG, WebP and AVIF photos up to 15 MB are resized locally to keep your site fast. Animated GIFs must be under 2 MB.');
 wrap.append(preview,url,uploadLabel,help);return wrap;
}
function renderList(key){
 const container=document.getElementById('edit-'+key);container.querySelectorAll('audio').forEach(audio=>{audio.pause();audio.removeAttribute('src');audio.load();});container.replaceChildren();
 if(!draft[key].length){container.append(node('p','repeat-empty','Nothing here yet. Use the add button to start.'));return;}
 draft[key].forEach((item,index)=>{
  const card=node('div','repeat-card');const head=node('div','repeat-card-head');const title=node('h3','',`${index+1}. ${item.title||item.label||item.text||'Untitled'}`);const actions=node('div','item-actions');
  for(const [label,delta] of [['Move up',-1],['Move down',1]]){const b=node('button','',label);b.type='button';b.disabled=index+delta<0||index+delta>=draft[key].length;b.addEventListener('click',()=>{[draft[key][index],draft[key][index+delta]]=[draft[key][index+delta],draft[key][index]];change();renderList(key);});actions.append(b);}
  const remove=node('button','remove-button','Remove');remove.type='button';remove.addEventListener('click',()=>{if(window.confirm('Remove this item from your draft? Your published website is unchanged.')){draft[key].splice(index,1);change();renderList(key);}});actions.append(remove);head.append(title,actions);card.append(head);
  for(const [name,label,type] of schemas[key]){const set=value=>{item[name]=value;if(name==='title'||name==='label'||name==='text')title.textContent=`${index+1}. ${value||'Untitled'}`;};card.append(type==='image'?imageField(label,item[name],set):type==='audio'?audioField(label,item[name],set):field(label,item[name],set,type));}
  container.append(card);
 });
}
function serialize(){
 if(!form.reportValidity())throw new Error('Please fill in your name and greeting.');
 for(const contact of draft.contacts){
  const value=String(contact.value||'').trim();if(!value)continue;
  if(contact.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Please enter a valid contact email address.');
  if(contact.type==='link'){let u;try{u=new URL(value);}catch{throw new Error('Web links must start with https:// or http://.');}if(!['http:','https:'].includes(u.protocol))throw new Error('Web links must start with https:// or http://.');}
 }
 for(const track of draft.soundtracks){const source=typeof track.url==='string'?track.url.trim():'';if(source&&!audioSource(source))throw new Error('Each soundtrack needs a direct HTTPS audio link or a supported uploaded audio file under 2 MB.');}
 const content=JSON.stringify(draft,null,2)+'\n';if(new Blob([content]).size>8*1024*1024)throw new Error('Your content is over 8 MB. Use smaller photos or hosted audio links before saving.');return content;
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',event=>{if(scalar.includes(event.target.name)){draft[event.target.name]=event.target.value;change();}});
form.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(!button)return;const key=button.dataset.add;if(!schemas[key])return;draft[key].push(Object.fromEntries(schemas[key].map(([name])=>[name,name==='type'?(key==='journalEntries'?'artwork':'link'):''])));change();renderList(key);document.getElementById('edit-'+key).lastElementChild.querySelector('input')?.focus();});
copy.addEventListener('click',async()=>{try{const content=serialize();await navigator.clipboard.writeText(content);status.textContent='Copied. Open the GitHub editor, replace the file contents, and commit your changes. Your live site has not changed yet.';}catch(error){status.textContent=error.message||'Copy is unavailable here. Please download your changes instead.';}});
download.addEventListener('click',()=>{try{const content=serialize();const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=node('a');a.href=url;a.download='portfolio.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;status.textContent='Downloaded portfolio.json. Upload it to your GitHub repository to publish these changes.';}catch(error){status.textContent=error.message;}});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function loadPublished(confirmDiscard=true){
 if(loading)return;
 if(confirmDiscard&&dirty&&!window.confirm('Replace your unsaved draft with the latest published content? Download or copy your changes first if you want to keep them.'))return;
 loading=true;refresh.disabled=true;download.disabled=true;copy.disabled=true;form.inert=true;form.setAttribute('aria-busy','true');status.textContent='Loading the latest published content…';
 try{
  const url=new URL('portfolio.json',document.baseURI);url.searchParams.set('refresh',`${Date.now()}-${++loadCount}`);
  const response=await fetch(url.href,{cache:'no-store'});if(!response.ok)throw new Error('Could not load your published portfolio. Please try refreshing again.');
  const data=await response.json();if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Portfolio data has an invalid format.');
  for(const key of Object.keys(schemas))if(Array.isArray(data[key])&&data[key].some(item=>!item||typeof item!=='object'||Array.isArray(item)))throw new Error('Portfolio data has an invalid item.');
  if(!Object.prototype.hasOwnProperty.call(data,'smileyPhrases'))data.smileyPhrases=[{text:'Hey there! :D'},{text:'Welcome to my little corner of the internet.'},{text:'One more side quest?'}];
  for(const key of Object.keys(schemas))data[key]=Array.isArray(data[key])?data[key]:[];
  draft=data;
  for(const key of scalar)form.elements.namedItem(key).value=typeof draft[key]==='string'?draft[key]:'';
  document.getElementById('hero-field').replaceChildren(imageField('Featured photo',draft.heroImage,v=>{draft.heroImage=v;}));
  Object.keys(schemas).forEach(renderList);dirty=false;form.hidden=false;status.textContent='Latest published content loaded. Edit below, then copy or download your changes to publish on GitHub.';
 }catch(error){status.textContent=(error.message||'Could not load your published portfolio.')+(draft?' Your current draft is unchanged.':'');}
 finally{loading=false;refresh.disabled=false;download.disabled=!draft;copy.disabled=!draft;form.inert=false;form.setAttribute('aria-busy','false');}
}
refresh.addEventListener('click',()=>loadPublished());
loadPublished(false);
