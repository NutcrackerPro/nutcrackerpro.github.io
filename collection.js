// The photo collection stays inside the scrolling 3D portfolio.
function text(value){return typeof value==='string'?value.trim():'';}
function node(tag,className,value){const element=document.createElement(tag);if(className)element.className=className;if(value!==undefined)element.textContent=value;return element;}
function imageSource(value){value=text(value);if(!value)return '';if(/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/.test(value))return value;try{const url=new URL(value,document.baseURI);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
function icon(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',kind==='close'?'m6 6 12 12M18 6 6 18':kind==='spark'?'M12 2v20M2 12h20M5 5l14 14M5 19 19 5':'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5');svg.append(path);return svg;}
function normalizeEntry(item,index){return {type:item.type==='travel'?'travel':'artwork',title:text(item.title)||'Untitled',date:text(item.date),location:text(item.location),description:text(item.description),image:imageSource(item.image),imageAlt:text(item.imageAlt),number:index+1};}
export function renderPhotoCollection(data,container,options={}){
 if(!container)return {destroy(){},entries:[]};
 const source=Array.isArray(data?.journalEntries)?data.journalEntries.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];
 let entries=source.map(normalizeEntry);
 if(!entries.length&&imageSource(data?.heroImage))entries=[normalizeEntry({type:'artwork',title:text(data.artCaption)||'From my collection',image:data.heroImage,imageAlt:data.heroImageAlt},0)];
 container.replaceChildren();container.classList.add('photo-collection');
 let observer;let currentFilter='all';let dialog;let lastTrigger;
 const wrapper=node('div','collection-wrap');
 const controls=node('div','collection-controls');
 const filters=node('div','collection-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter photos');
 const count=node('p','collection-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
 const filterButtons=[];
 for(const [type,label] of [['all','Everything'],['artwork','Photos'],['travel','Places & travel']]){
  const button=node('button','collection-filter');button.type='button';button.dataset.filter=type;button.append(node('span','',label),node('span','collection-filter-count',String(type==='all'?entries.length:entries.filter(item=>item.type===type).length)));
  button.addEventListener('click',()=>{currentFilter=type;renderCards();});filters.append(button);filterButtons.push(button);
 }
 controls.append(filters,count);
 const grid=node('div','collection-grid');
 const empty=node('div','collection-empty');empty.append(icon('spark'));const emptyCopy=node('div');emptyCopy.append(node('h3','','A few memories, coming soon.'),node('p','','There is room here for the next photo.'));empty.append(emptyCopy);
 wrapper.append(controls,grid,empty);container.append(wrapper);
 function showPhoto(entry,trigger){
  lastTrigger=trigger;
  if(typeof options.openPhoto==='function'){options.openPhoto(entry.image,entry.imageAlt||entry.title,entry);return;}
  if(!dialog){dialog=node('dialog','collection-dialog');dialog.setAttribute('aria-label','Full size photo');const close=node('button','collection-dialog-close');close.type='button';close.setAttribute('aria-label','Close photo');close.append(icon('close'));close.addEventListener('click',()=>dialog.close());const image=node('img','collection-dialog-image');const details=node('div','collection-dialog-details');details.append(node('p','collection-dialog-type'),node('h2','collection-dialog-title'),node('p','collection-dialog-meta'),node('p','collection-dialog-description'));dialog.append(close,image,details);document.body.append(dialog);dialog.addEventListener('close',()=>{options.onClose?.();lastTrigger?.focus({preventScroll:true});});dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});}
  const image=dialog.querySelector('img');image.src=entry.image;image.alt=entry.imageAlt||entry.title;
  dialog.querySelector('.collection-dialog-type').textContent=entry.type==='travel'?'PLACES & TRAVEL':'FROM THE COLLECTION';
  dialog.querySelector('h2').textContent=entry.title;
  dialog.querySelector('.collection-dialog-meta').textContent=[entry.location,entry.date].filter(Boolean).join(' / ');
  dialog.querySelector('.collection-dialog-description').textContent=entry.description;
  dialog.showModal();options.onOpen?.();
 }
 function renderCards(){
  observer?.disconnect();grid.replaceChildren();
  const visible=entries.filter(item=>currentFilter==='all'||item.type===currentFilter);
  count.textContent=`${String(visible.length).padStart(2,'0')} ${visible.length===1?'photo':'photos'}`;
  filterButtons.forEach(button=>{const active=button.dataset.filter===currentFilter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  empty.hidden=visible.length>0;
  empty.querySelector('h3').textContent=currentFilter==='travel'?'The next adventure starts here.':'A few memories, coming soon.';
  empty.querySelector('p').textContent=currentFilter==='travel'?'No travel photos yet. New places will find their way here.':'There is room here for the next photo.';
  visible.forEach((entry,index)=>{
   const card=node('article','collection-card depth-card reveal');card.style.setProperty('--reveal-delay',Math.min(index*70,210)+'ms');
   if(entry.image){const imageButton=node('button','collection-image');imageButton.type='button';imageButton.setAttribute('aria-label',`View ${entry.title} photo full size`);const image=node('img');image.src=entry.image;image.alt=entry.imageAlt||entry.title;image.loading='lazy';image.decoding='async';image.width=700;image.height=540;const hint=node('span','collection-image-hint');hint.append(icon('expand'),node('span','','Take a closer look'));imageButton.append(image,hint);imageButton.addEventListener('click',()=>showPhoto(entry,imageButton));image.addEventListener('error',()=>{imageButton.classList.add('image-unavailable');image.hidden=true;hint.replaceChildren(node('span','','Photo could not be loaded'));imageButton.disabled=true;});card.append(imageButton);}
   const copy=node('div','collection-card-copy');const meta=node('p','collection-card-meta');meta.append(node('span','',entry.type==='travel'?'PLACES & TRAVEL':'FROM THE COLLECTION'),node('span','',String(entry.number).padStart(2,'0')));copy.append(meta,node('h3','collection-card-title',entry.title));
   if(entry.location||entry.date)copy.append(node('p','collection-card-location',[entry.location,entry.date].filter(Boolean).join(' / ')));
   if(entry.description){const description=node('p','collection-card-description',entry.description);copy.append(description);}
   card.append(copy);grid.append(card);
   if(typeof options.prepareText==='function')card.querySelectorAll('h3,.collection-card-description').forEach(options.prepareText);
  });
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('no-motion');
  if('IntersectionObserver'in window&&!reduced){observer=new IntersectionObserver(records=>{records.forEach(record=>{record.target.classList.toggle('is-visible',record.isIntersecting);});},{threshold:.04,rootMargin:'0px 0px -25px 0px'});grid.querySelectorAll('.reveal').forEach(card=>observer.observe(card));}else grid.querySelectorAll('.reveal').forEach(card=>card.classList.add('is-visible'));
  options.onRender?.();
 }
 renderCards();
 return {entries,destroy(){observer?.disconnect();if(dialog?.open)dialog.close();dialog?.remove();container.replaceChildren();container.classList.remove('photo-collection');}};
}
