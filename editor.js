'use strict';
let draft;
let dirty = false;
const form = document.getElementById('portfolio-form');
const status = document.getElementById('editor-status');
const download = document.getElementById('download');
const copy = document.getElementById('copy');
const scalar = ['name','greeting','nickname','intro','heroImageAlt','artCaption','achievementsIntro','hobbiesIntro','factsIntro'];
const schemas = {
  achievements:[['year','Year'],['title','Achievement'],['description','What would you like to share?','textarea'],['image','Photo (optional)','image'],['imageAlt','Describe the photo']],
  hobbies:[['title','Hobby'],['description','Tell me more about it','textarea'],['image','Photo (optional)','image'],['imageAlt','Describe the photo']],
  facts:[['title','Card front — a title or question'],['description','Card back — your random fact','textarea']],
  smileyPhrases:[['text','Smiley phrase']],
  contacts:[['label','Contact name'],['type','What kind of contact?','select'],['value','Email address, username or full web link']]
};
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function change(){dirty=true;status.textContent='Unsaved draft — download or copy your changes before leaving.';}
function imageSource(value){if(typeof value!=='string'||!value.trim())return '';if(/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/.test(value))return value;try{const u=new URL(value.replace(/^\/(?!\/)/,''),document.baseURI);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function field(label,value,set,type='text'){
 const wrap=node('label','',label);const input=node(type==='textarea'?'textarea':type==='select'?'select':'input');
 if(type==='select'){for(const [v,t] of [['link','Web link'],['email','Email'],['copy','Copy username']]){const option=node('option','',t);option.value=v;input.append(option);}}
 else if(type==='textarea')input.rows=4;else input.type='text';
 input.value=value|| (type==='select'?'link':'');if(type!=='select')input.maxLength=type==='textarea'?6000:500;
 input.addEventListener('input',()=>{set(input.value);change();});wrap.append(input);return wrap;
}
function imageField(label,value,set){
 const wrap=node('div','image-field');const preview=node('img','photo-preview');preview.alt='Selected image preview';const src=imageSource(value);preview.hidden=!src;if(src)preview.src=src;
 const url=field(label+' — image path or URL',value,v=>{set(v);const s=imageSource(v);preview.hidden=!s;if(s)preview.src=s;});const textInput=url.querySelector('input');
 if(typeof value==='string'&&value.startsWith('data:')){textInput.value='';textInput.placeholder='Uploaded photo selected';}
 const upload=node('input','image-upload');upload.type='file';upload.accept='image/png,image/jpeg,image/webp,image/gif,image/avif';
 const uploadLabel=node('label','','Or choose a photo');uploadLabel.append(upload);
 upload.addEventListener('change',async()=>{const file=upload.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type)||file.size>2*1024*1024){status.textContent='Choose a PNG, JPG, WebP, GIF or AVIF image under 2 MB.';upload.value='';return;}
  const reader=new FileReader();reader.onload=()=>{const source=String(reader.result);const probe=new Image();probe.onload=()=>{set(source);preview.src=source;preview.hidden=false;textInput.value='';textInput.placeholder='Uploaded photo selected';change();};probe.onerror=()=>{status.textContent='That image could not be opened. Please choose another.';};probe.src=source;};reader.onerror=()=>{status.textContent='Could not read that image. Please try again.';};reader.readAsDataURL(file);
 });
 wrap.append(preview,url,uploadLabel);return wrap;
}
function renderList(key){
 const container=document.getElementById('edit-'+key);container.replaceChildren();
 if(!draft[key].length){container.append(node('p','repeat-empty','Nothing here yet. Use the add button to start.'));return;}
 draft[key].forEach((item,index)=>{
  const card=node('div','repeat-card');const head=node('div','repeat-card-head');const title=node('h3','',`${index+1}. ${item.title||item.label||item.text||'Untitled'}`);const actions=node('div','item-actions');
  for(const [label,delta] of [['Move up',-1],['Move down',1]]){const b=node('button','',label);b.type='button';b.disabled=index+delta<0||index+delta>=draft[key].length;b.addEventListener('click',()=>{[draft[key][index],draft[key][index+delta]]=[draft[key][index+delta],draft[key][index]];change();renderList(key);});actions.append(b);}
  const remove=node('button','remove-button','Remove');remove.type='button';remove.addEventListener('click',()=>{if(window.confirm('Remove this item from your draft? Your published website is unchanged.')){draft[key].splice(index,1);change();renderList(key);}});actions.append(remove);head.append(title,actions);card.append(head);
  for(const [name,label,type] of schemas[key]){const set=value=>{item[name]=value;if(name==='title'||name==='label'||name==='text')title.textContent=`${index+1}. ${value||'Untitled'}`;};card.append(type==='image'?imageField(label,item[name],set):field(label,item[name],set,type));}
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
 const content=JSON.stringify(draft,null,2)+'\n';if(new Blob([content]).size>8*1024*1024)throw new Error('Your content is over 8 MB. Please use smaller photos before saving.');return content;
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',event=>{if(scalar.includes(event.target.name)){draft[event.target.name]=event.target.value;change();}});
form.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(!button)return;const key=button.dataset.add;if(!schemas[key])return;draft[key].push(Object.fromEntries(schemas[key].map(([name])=>[name,name==='type'?'link':''])));change();renderList(key);document.getElementById('edit-'+key).lastElementChild.querySelector('input')?.focus();});
copy.addEventListener('click',async()=>{try{const content=serialize();await navigator.clipboard.writeText(content);status.textContent='Copied. Open the GitHub editor, replace the file contents, and commit your changes. Your live site has not changed yet.';}catch(error){status.textContent=error.message||'Copy is unavailable here. Please download your changes instead.';}});
download.addEventListener('click',()=>{try{const content=serialize();const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=node('a');a.href=url;a.download='portfolio.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;status.textContent='Downloaded portfolio.json. Upload it to your GitHub repository to publish these changes.';}catch(error){status.textContent=error.message;}});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
fetch('portfolio.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Could not load your portfolio. Refresh to try again.');return r.json();}).then(data=>{if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Portfolio data has an invalid format.');draft=data;if(!Object.prototype.hasOwnProperty.call(draft,'smileyPhrases'))draft.smileyPhrases=[{text:'Hey there! :D'},{text:'Welcome to my little corner of the internet.'},{text:'One more side quest?'}];for(const key of Object.keys(schemas))draft[key]=Array.isArray(draft[key])?draft[key]:[];for(const key of scalar)form.elements.namedItem(key).value=typeof draft[key]==='string'?draft[key]:'';document.getElementById('hero-field').append(imageField('Homepage artwork',draft.heroImage,v=>{draft.heroImage=v;}));Object.keys(schemas).forEach(renderList);form.hidden=false;download.disabled=false;copy.disabled=false;status.textContent='Ready to fill in. Your published content is loaded below.';}).catch(error=>{status.textContent=error.message;});
