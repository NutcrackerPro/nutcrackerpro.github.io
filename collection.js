// A native scrolling photo album inside the existing 3D portfolio.
let albumSerial=0;
function text(value){return typeof value==='string'?value.trim():'';}
function node(tag,className,value){const element=document.createElement(tag);if(className)element.className=className;if(value!==undefined)element.textContent=value;return element;}
function imageSource(value){value=text(value);if(!value)return '';if(/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/.test(value))return value;try{const url=new URL(value,document.baseURI);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
function icon(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');const paths={close:'m6 6 12 12M18 6 6 18',spark:'M12 2v20M2 12h20M5 5l14 14M5 19 19 5',previous:'M19 12H5m6-6-6 6 6 6',next:'M5 12h14m-6-6 6 6-6 6',expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'};path.setAttribute('d',paths[kind]||paths.expand);svg.append(path);return svg;}
function normalizeEntry(item,index){return {type:item.type==='travel'?'travel':'artwork',title:text(item.title)||'Untitled',date:text(item.date),location:text(item.location),description:text(item.description),image:imageSource(item.image),imageAlt:text(item.imageAlt),number:index+1};}
export function renderPhotoCollection(data,container,options={}){
 if(!container)return {destroy(){},entries:[]};
 const source=Array.isArray(data?.journalEntries)?data.journalEntries.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];
 let entries=source.map(normalizeEntry);
 if(!entries.length&&imageSource(data?.heroImage))entries=[normalizeEntry({type:'artwork',title:text(data.artCaption)||'From my collection',image:data.heroImage,imageAlt:data.heroImageAlt},0)];
 container.replaceChildren();container.classList.add('photo-collection');
 const abort=new AbortController();let observer;let resizeObserver;let currentFilter='all';let dialog;let lastTrigger;let cards=[];let positions=[];let frame=0;let destroyed=false;let drag;let blockClicksUntil=0;let visible=[];
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('no-motion');
 const listen=(target,event,callback,settings={})=>target.addEventListener(event,callback,{...settings,signal:abort.signal});
 const wrapper=node('div','collection-wrap');const controls=node('div','collection-controls');const filters=node('div','collection-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter photos');
 const count=node('p','collection-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');const filterButtons=[];
 for(const [type,label] of [['all','Everything'],['artwork','Photos'],['travel','Places & travel']]){const button=node('button','collection-filter');button.type='button';button.dataset.filter=type;button.append(node('span','',label),node('span','collection-filter-count',String(type==='all'?entries.length:entries.filter(item=>item.type===type).length)));listen(button,'click',()=>{currentFilter=type;renderCards();});filters.append(button);filterButtons.push(button);}
 controls.append(filters,count);
 const stage=node('div','collection-stage');const strip=node('div','collection-strip');strip.tabIndex=0;strip.setAttribute('role','region');strip.setAttribute('aria-label','Photo album');
 const hint=node('p','collection-scroll-hint','Swipe or scroll sideways to explore.');hint.id=`photo-album-hint-${++albumSerial}`;strip.setAttribute('aria-describedby',hint.id);
 const previous=node('button','collection-arrow');previous.type='button';previous.setAttribute('aria-label','Previous photo');previous.append(icon('previous'));
 const next=node('button','collection-arrow');next.type='button';next.setAttribute('aria-label','Next photo');next.append(icon('next'));
 const position=node('span','collection-position');position.setAttribute('role','status');position.setAttribute('aria-live','polite');position.setAttribute('aria-atomic','true');
 const navigation=node('div','collection-navigation');navigation.setAttribute('role','group');navigation.setAttribute('aria-label','Photo album navigation');const buttons=node('div','collection-arrows');buttons.append(previous,next);navigation.append(hint,position,buttons);
 const empty=node('div','collection-empty');empty.append(icon('spark'));const emptyCopy=node('div');emptyCopy.append(node('h3','','A few memories, coming soon.'),node('p','','There is room here for the next photo.'));empty.append(emptyCopy);
 stage.append(strip);wrapper.append(controls,stage,navigation,empty);container.append(wrapper);
 function scheduleMeasure(){if(!destroyed&&!frame)frame=requestAnimationFrame(measure);}
 function measure(){
  frame=0;if(destroyed)return;
  positions=cards.map(card=>({left:card.offsetLeft,width:card.offsetWidth}));
  const maximum=Math.max(0,strip.scrollWidth-strip.clientWidth);const overflow=visible.length>1&&maximum>3;
  stage.classList.toggle('has-overflow',overflow);stage.classList.toggle('at-start',strip.scrollLeft<=2);stage.classList.toggle('at-end',strip.scrollLeft>=maximum-2);navigation.hidden=!overflow;previous.disabled=!overflow||strip.scrollLeft<=2;next.disabled=!overflow||strip.scrollLeft>=maximum-2;
  strip.tabIndex=overflow?0:-1;
  if(!visible.length)return;
  const start=strip.scrollLeft;const end=start+strip.clientWidth;const inView=positions.map((item,index)=>({item,index})).filter(({item})=>Math.min(end,item.left+item.width)-Math.max(start,item.left)>Math.min(30,item.width*.12));
  const first=(inView[0]?.index||0)+1;const last=(inView.at(-1)?.index??first-1)+1;
  const value=first===last?`Photo ${first} of ${visible.length}`:`Photos ${first}–${last} of ${visible.length}`;if(position.textContent!==value)position.textContent=value;
 }
 function scrollTo(left){const maximum=Math.max(0,strip.scrollWidth-strip.clientWidth);strip.scrollTo({left:Math.max(0,Math.min(maximum,left)),behavior:reduced()?'auto':'smooth'});scheduleMeasure();}
 function step(direction){const left=strip.scrollLeft;const maximum=Math.max(0,strip.scrollWidth-strip.clientWidth);const targets=positions.map(item=>item.left);const target=direction>0?targets.find(value=>value>left+3):targets.slice().reverse().find(value=>value<left-3);scrollTo(target??(direction>0?maximum:0));}
 listen(previous,'click',()=>step(-1));listen(next,'click',()=>step(1));listen(strip,'scroll',scheduleMeasure,{passive:true});listen(window,'resize',scheduleMeasure,{passive:true});
 listen(strip,'keydown',event=>{if(event.target!==strip)return;if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();if(event.key==='Home')scrollTo(0);else if(event.key==='End')scrollTo(strip.scrollWidth);else step(event.key==='ArrowRight'?1:-1);});
 // Touch and trackpads use browser scrolling. Mouse dragging only starts after a horizontal gesture.
 listen(strip,'pointerdown',event=>{if((event.pointerType!=='mouse'&&event.pointerType!=='pen')||event.button!==0||strip.scrollWidth<=strip.clientWidth+3)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:strip.scrollLeft,active:false};});
 listen(window,'pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const delta=event.clientX-drag.x;if(!drag.active){if(Math.abs(delta)<6||Math.abs(delta)<Math.abs(event.clientY-drag.y))return;drag.active=true;strip.classList.add('is-dragging');try{strip.setPointerCapture(drag.id);}catch{}}
  if(event.cancelable)event.preventDefault();strip.scrollLeft=drag.left-delta;scheduleMeasure();},{passive:false});
 function finishDrag(event){if(!drag||event.pointerId!==drag.id)return;if(drag.active){blockClicksUntil=performance.now()+250;try{strip.releasePointerCapture(drag.id);}catch{}}drag=null;strip.classList.remove('is-dragging');scheduleMeasure();}
 listen(window,'pointerup',finishDrag);listen(window,'pointercancel',finishDrag);
 listen(strip,'click',event=>{if(performance.now()<blockClicksUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});listen(strip,'dragstart',event=>event.preventDefault());
 if('ResizeObserver'in window){resizeObserver=new ResizeObserver(scheduleMeasure);resizeObserver.observe(strip);}
 function showPhoto(entry,trigger){
  lastTrigger=trigger;if(typeof options.openPhoto==='function'){options.openPhoto(entry.image,entry.imageAlt||entry.title,entry);return;}
  if(!dialog){dialog=node('dialog','collection-dialog');dialog.setAttribute('aria-label','Full size photo');const close=node('button','collection-dialog-close');close.type='button';close.setAttribute('aria-label','Close photo');close.append(icon('close'));listen(close,'click',()=>dialog.close());const image=node('img','collection-dialog-image');const details=node('div','collection-dialog-details');details.append(node('p','collection-dialog-type'),node('h2','collection-dialog-title'),node('p','collection-dialog-meta'),node('p','collection-dialog-description'));dialog.append(close,image,details);document.body.append(dialog);listen(dialog,'close',()=>{options.onClose?.();lastTrigger?.focus({preventScroll:true});});listen(dialog,'click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});}
  const image=dialog.querySelector('img');image.src=entry.image;image.alt=entry.imageAlt||entry.title;dialog.querySelector('.collection-dialog-type').textContent=entry.type==='travel'?'PLACES & TRAVEL':'FROM THE COLLECTION';dialog.querySelector('h2').textContent=entry.title;dialog.querySelector('.collection-dialog-meta').textContent=[entry.location,entry.date].filter(Boolean).join(' / ');dialog.querySelector('.collection-dialog-description').textContent=entry.description;dialog.showModal();options.onOpen?.();
 }
 function renderCards(){
  observer?.disconnect();strip.replaceChildren();cards=[];positions=[];drag=null;strip.classList.remove('is-dragging');visible=entries.filter(item=>currentFilter==='all'||item.type===currentFilter);count.textContent=`${String(visible.length).padStart(2,'0')} ${visible.length===1?'photo':'photos'}`;
  filterButtons.forEach(button=>{const active=button.dataset.filter===currentFilter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});stage.hidden=!visible.length;empty.hidden=!!visible.length;navigation.hidden=true;strip.classList.toggle('single-photo',visible.length===1);strip.setAttribute('aria-label',`${visible.length} ${visible.length===1?'photo':'photos'} in the album`);
  empty.querySelector('h3').textContent=currentFilter==='travel'?'The next adventure starts here.':'A few memories, coming soon.';empty.querySelector('p').textContent=currentFilter==='travel'?'No travel photos yet. New places will find their way here.':'There is room here for the next photo.';
  visible.forEach(entry=>{
   const card=node('article','collection-card');card.style.setProperty('--source-ratio','1.333');
   if(entry.image){const imageButton=node('button','collection-image');imageButton.type='button';imageButton.setAttribute('aria-label',`View ${entry.title} photo full size`);const image=node('img');image.src=entry.image;image.alt=entry.imageAlt||entry.title;image.loading='lazy';image.decoding='async';image.draggable=false;image.width=700;image.height=540;const imageHint=node('span','collection-image-hint');imageHint.append(icon('expand'),node('span','','View photo'));imageButton.append(image,imageHint);imageButton.addEventListener('click',()=>showPhoto(entry,imageButton));image.addEventListener('load',()=>{if(destroyed||!card.isConnected)return;if(image.naturalWidth&&image.naturalHeight)card.style.setProperty('--source-ratio',String(image.naturalWidth/image.naturalHeight));scheduleMeasure();});image.addEventListener('error',()=>{imageButton.classList.add('image-unavailable');image.hidden=true;imageHint.replaceChildren(node('span','','Photo could not be loaded'));imageButton.disabled=true;scheduleMeasure();});card.append(imageButton);}
   else{const note=node('div','collection-note');note.append(icon('spark'),node('span','','A note from the collection'));card.append(note);}
   const copy=node('div','collection-card-copy reveal');const meta=node('p','collection-card-meta');meta.append(node('span','',entry.type==='travel'?'PLACES & TRAVEL':'FROM THE COLLECTION'),node('span','',String(entry.number).padStart(2,'0')));copy.append(meta,node('h3','collection-card-title',entry.title));if(entry.location||entry.date)copy.append(node('p','collection-card-location',[entry.location,entry.date].filter(Boolean).join(' / ')));if(entry.description)copy.append(node('p','collection-card-description',entry.description));card.append(copy);strip.append(card);cards.push(card);if(typeof options.prepareText==='function')copy.querySelectorAll('h3,.collection-card-description').forEach(options.prepareText);
  });
  strip.scrollLeft=0;
  if(typeof options.onRender==='function')options.onRender();else if('IntersectionObserver'in window&&!reduced()){observer=new IntersectionObserver(records=>{records.forEach(record=>{if(record.isIntersecting){record.target.classList.add('is-visible');observer.unobserve(record.target);}});},{threshold:.04});strip.querySelectorAll('.reveal').forEach(copy=>observer.observe(copy));}else strip.querySelectorAll('.reveal').forEach(copy=>copy.classList.add('is-visible'));
  scheduleMeasure();
 }
 renderCards();
 return {entries,destroy(){if(destroyed)return;destroyed=true;if(dialog?.open)dialog.close();abort.abort();observer?.disconnect();resizeObserver?.disconnect();cancelAnimationFrame(frame);drag=null;dialog?.remove();container.replaceChildren();container.classList.remove('photo-collection');}};
}
