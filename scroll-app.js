'use strict';
import { renderPhotoCollection } from './collection.js?v=20261007-refine6';
import { createBootScreen } from './boot.js?v=20261007-refine6';
import { createSoundtrackPlayer } from './soundtrack.js?v=20261007-refine6';
let scene;
let collectionController;
let bootEntered=false;
const soundtrackPlayer=createSoundtrackPlayer();
const boot=createBootScreen({name:'Nutcracker',onEnter(){bootEntered=true;syncScene();scheduleScroll();navigate(routeIndex(),{updateHistory:false});}});
const sceneCardNodes=new Map();
const sceneCardLayer=document.getElementById('scene-card-labels');
const routes=['introduction','photos','achievements','hobbies','facts'];
const labels=['Self introduction','Some cool photos','Achievements','Hobbies','Random facts'];
const defaultSmileyPhrases=[{text:'Hey there! :D'},{text:'Welcome to my little corner of the internet.'},{text:'One more side quest?'}];
const editorSequence=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','b','a'];
const editorUrl=new URL('admin.html?v=20261007-refine6',document.baseURI).href;
const penguin=document.querySelector('.site-header .wordmark');
const secretPanel=document.getElementById('secret-controls');
const sections=routes.map(id=>document.getElementById(id));
const reduceQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
let data={name:'Nutcracker',greeting:'Hi! I am',nickname:'',intro:'',achievements:[],hobbies:[],facts:[],contacts:[{label:'Email',type:'email',value:'cleavant666@gmail.com'},{label:'Discord',type:'copy',value:'nutcracker_cool'}]};
let preference=false;try{preference=localStorage.getItem('portfolio-reduce-motion')==='true';}catch{}
let editorKeys=[];let smileCursor=0;let editorMode=false;let penguinTaps=0;let lastPenguinTapAt=0;let penguinTapTimer;let lockedHash='';let lockedScroll=0;
let active=0;let scrollValue=0;let scrollFrame=0;let toastTimer;let revealObserver;let smileResetTimer;
const motionOff=()=>reduceQuery.matches||preference;
const letterSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
function n(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=String(text);return node;}
function icon(kind){
 const paths={up:'M12 19V5m-6 6 6-6 6 6',down:'M12 5v14m-6-6 6 6 6-6',left:'M19 12H5m6-6-6 6 6 6',right:'M5 12h14m-6-6 6 6-6 6',external:'M6 18 18 6M6 6h12v12',copy:'M9 9h11v11H9zM15 5V3H3v12h2',spark:'M12 2v20M2 12h20M5 5l14 14M5 19 19 5',motion:'M12 3a9 9 0 1 0 9 9M17 4h.01M21 8h.01'};
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon icon-'+kind);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[kind]||paths.external);svg.append(path);return svg;
}
function smileyPhrases(){const values=Object.hasOwn(data,'smileyPhrases')?data.smileyPhrases:defaultSmileyPhrases;return Array.isArray(values)?[...new Set(values.map(item=>text(item?.text).trim()).filter(Boolean))]:[];}
function safeUrl(value,image=false){if(typeof value!=='string'||!value.trim())return '';if(image&&/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/.test(value))return value;try{const url=new URL(value.replace(/^\/(?!\/)/,''),document.baseURI);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
function items(key){return Array.isArray(data[key])?data[key].filter(x=>x&&typeof x==='object'):[];}
function text(value,fallback=''){return typeof value==='string'?value:fallback;}
function toast(message){clearTimeout(toastTimer);document.getElementById('status').textContent=message;toastTimer=setTimeout(()=>{document.getElementById('status').textContent='';},4200);}
function piece(node,delay=0){node.classList.add('reveal');node.style.setProperty('--reveal-delay',Math.min(delay,300)+'ms');return node;}
// Reserve each word's width while its letters appear, so typing never moves the layout.
function prepareText(node){
 if(!node||node.querySelector('.reveal-char')||!node.textContent.trim())return;
 const readText=part=>part.nodeType===Node.TEXT_NODE?part.textContent:part.nodeName==='BR'?'\n':Array.from(part.childNodes).map(readText).join('');
 const accessibleText=readText(node).trim();
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);const leaves=[];
 while(walker.nextNode())leaves.push(walker.currentNode);
 let index=0;
 for(const leaf of leaves){
  const fragment=document.createDocumentFragment();
  for(const run of leaf.textContent.split(/(\s+)/u)){
   if(!run)continue;
   if(/^\s+$/u.test(run)){fragment.append(document.createTextNode(run));continue;}
   const word=n('span','text-word');word.setAttribute('aria-hidden','true');
   const letters=letterSegmenter?Array.from(letterSegmenter.segment(run),part=>part.segment):Array.from(run);
   for(const letter of letters){const char=n('span','reveal-char',letter);char.style.setProperty('--char-index',String(Math.min(index++,75)));word.append(char);}
   fragment.append(word);
  }
  leaf.replaceWith(fragment);
 }
 node.classList.add('word-reveal');
 if(/^H[1-6]$/.test(node.tagName))node.setAttribute('aria-label',accessibleText.replace(/\s+/g,' '));
 else node.append(n('span','sr-only',accessibleText));
}
function preparePortfolioText(){
 document.querySelectorAll('.story-title,#home-greeting,#chapter-description,.story-lead,.timeline-item h3,.timeline-item p,.hobby-card h3,.hobby-card p,.fact-content,.empty-chapter h3,.empty-chapter p').forEach(prepareText);
}
function sectionFrame(index){const section=n('div','slide');return section;}
function emptyChapter(section,title,body){const empty=n('div','empty-chapter');empty.append(n('span','empty-number','—'));const copy=n('div');copy.append(n('h3','',title),n('p','',body));empty.append(copy,icon('spark'));section.append(piece(empty,140));}
function achievementsSlide(){const section=sectionFrame(1,'The little milestones.',text(data.achievementsIntro));const achievements=items('achievements').filter(x=>text(x.title));if(!achievements.length){emptyChapter(section,'Still writing this chapter.','A collection of achievements will live here.');return section;}const list=n('div','timeline');achievements.forEach((item,i)=>{const row=n('article','timeline-item depth-card');row.append(n('span','timeline-year',text(item.year)));const details=n('div');details.append(n('h3','',text(item.title)),n('p','',text(item.description)));row.append(details);const src=safeUrl(item.image,true);if(src){const image=n('img');image.src=src;image.alt=text(item.imageAlt).trim()||text(item.title);image.loading='lazy';const preview=n('button','photo-expand');preview.type='button';preview.setAttribute('aria-label','View '+text(item.title)+' photo full size');preview.append(image,n('span','photo-expand-hint','Click to view certificate'));preview.addEventListener('click',()=>openPhoto(src,image.alt));row.append(preview);}list.append(piece(row,Math.min(i*80,240)));});section.append(list);return section;}
function hobbiesSlide(){const section=sectionFrame(2,'For the fun of it.',text(data.hobbiesIntro));const list=n('div','hobby-grid');items('hobbies').filter(x=>text(x.title)).forEach((item,i)=>{const card=n('details','hobby-card depth-card');const summary=n('summary'),top=n('span','hobby-top');top.append(n('span','',String(i+1).padStart(2,'0')));const plus=n('span','hobby-plus','+');plus.setAttribute('aria-hidden','true');top.append(plus);summary.append(top,n('h3','',text(item.title)));card.append(summary,n('p','',text(item.description)));const src=safeUrl(item.image,true);if(src){const img=n('img');img.src=src;img.alt=text(item.imageAlt,text(item.title));img.loading='lazy';card.append(img);}list.append(piece(card,140+i*80));});if(!list.childElementCount)emptyChapter(section,'A few interests, coming soon.','There is always something new to get into.');else section.append(list);return section;}
function factsSlide(){const section=sectionFrame(3,'A little more me.',text(data.factsIntro));const grid=n('div','fact-grid');items('facts').filter(x=>text(x.title)).forEach((fact,i)=>{const card=n('button','fact-card depth-card');card.type='button';card.setAttribute('aria-pressed','false');const label=n('span','fact-label',`FACT ${String(i+1).padStart(2,'0')}`),content=n('span','fact-content',text(fact.title)),hint=n('span','fact-hint','Tap to reveal +');card.append(label,content,hint);card.addEventListener('click',()=>{const open=card.getAttribute('aria-pressed')!=='true';card.setAttribute('aria-pressed',String(open));content.textContent=open?text(fact.description):text(fact.title);hint.textContent=open?'Tap to turn back':'Tap to reveal +';prepareText(content);});grid.append(piece(card,140+i*80));});if(!grid.childElementCount)emptyChapter(section,'A little mystery for now.','Random facts will find their way here.');else section.append(grid);return section;}
function contacts(){const list=document.getElementById('contact-list');list.replaceChildren();items('contacts').forEach(contact=>{const value=text(contact.value).trim();if(!value)return;let control;if(contact.type==='copy'){control=n('button');control.type='button';control.dataset.copy=value;control.setAttribute('aria-label',`Copy ${text(contact.label)} ${value}`);}else{control=n('a');if(contact.type==='email'){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return;control.href='mailto:'+encodeURIComponent(value).replace(/%40/g,'@');}else{const url=safeUrl(value);if(!url)return;control.href=url;control.target='_blank';control.rel='noopener noreferrer';}}const detail=n('span','contact-value',value);detail.append(icon(contact.type==='copy'?'copy':'external'));control.append(document.createTextNode(text(contact.label,'Contact')),detail);list.append(control);});}
function resetPenguinTaps(){clearTimeout(penguinTapTimer);penguinTaps=0;lastPenguinTapAt=0;}
function showSecretProgress(message){
 const status=secretPanel.querySelector('.secret-status');
 status.textContent=message||`${editorKeys.length} of ${editorSequence.length} keys entered.`;
 secretPanel.querySelectorAll('.secret-step').forEach((step,index)=>{step.classList.toggle('complete',index<editorKeys.length);});
}
function setEditorMode(enabled){
 editorMode=enabled;editorKeys=[];resetPenguinTaps();
 document.documentElement.classList.toggle('secret-mode',enabled);document.body.classList.toggle('secret-mode',enabled);secretPanel.hidden=!enabled;
 const navigation=document.querySelector('.section-nav');navigation.inert=enabled;document.getElementById('journey').inert=enabled;document.getElementById('connect').inert=enabled;document.querySelector('.journey-rail').inert=enabled;
 document.getElementById('open-chapter').disabled=enabled;document.getElementById('reset-view').disabled=enabled;
 if(enabled){lockedHash=location.hash;lockedScroll=window.scrollY;navigation.setAttribute('aria-disabled','true');penguin.setAttribute('aria-label','Cancel secret code entry');showSecretProgress('Secret mode unlocked. Enter your code. Tap the penguin to cancel.');secretPanel.focus({preventScroll:true});}
 else{navigation.removeAttribute('aria-disabled');penguin.setAttribute('aria-label','Nutcracker home');toast('Secret mode cancelled.');scheduleScroll();}
 syncScene();
}
function enterEditorKey(key){
 if(!editorMode)return;
 const normalized=key.length===1?key.toLowerCase():key;
 const candidate=[...editorKeys,normalized];editorKeys=[];
 for(let size=Math.min(candidate.length,editorSequence.length);size>0;size--){const suffix=candidate.slice(-size);if(suffix.every((value,index)=>value===editorSequence[index])){editorKeys=suffix;break;}}
 if(editorKeys.length===editorSequence.length){showSecretProgress('Code accepted. Opening the latest editor…');window.location.assign(editorUrl);return;}
 showSecretProgress(editorKeys.length?undefined:'That did not match. Start again with Up, Up. Sections are still paused.');
}
function setupSecretControls(){
 secretPanel.append(n('p','eyebrow','Secret mode'),n('h2','','Enter your code.'),n('p','secret-help','Sections are paused. Use your keyboard or the buttons below. Tap the penguin again to cancel.'));
 const progress=n('div','secret-progress');progress.setAttribute('aria-hidden','true');
 for(let i=0;i<editorSequence.length;i++)progress.append(n('span','secret-step'));
 const status=n('p','secret-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 const pad=n('div','secret-pad');pad.setAttribute('role','group');pad.setAttribute('aria-label','Secret code keys');
 for(const [key,label,kind] of [['ArrowUp','Up','up'],['ArrowDown','Down','down'],['ArrowLeft','Left','left'],['ArrowRight','Right','right'],['b','B'],['a','A']]){
  const button=n('button','secret-key',kind?null:label);button.type='button';button.setAttribute('aria-label',label);if(kind)button.append(icon(kind));button.addEventListener('click',()=>enterEditorKey(key));pad.append(button);
 }
 secretPanel.append(progress,status,pad);
}
setupSecretControls();
function routeIndex(){return Math.max(0,routes.indexOf(location.hash.slice(1)));}
function navigate(index,{focus=false,updateHistory=true}={}){
 if(!bootEntered||editorMode||index<0||index>=routes.length||photoDialog.open)return;
 const target=sections[index];if(updateHistory&&location.hash!=='#'+routes[index])history.pushState(null,'','#'+routes[index]);
 const top=index===0?0:Math.max(0,window.scrollY+target.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom-26);
 window.scrollTo({top,behavior:motionOff()?'instant':'smooth'});
 if(focus){const heading=target.querySelector('h1,h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
 scheduleScroll();
}
function observeReveals(){
 revealObserver?.disconnect();
 const nodes=document.querySelectorAll('.reveal');
 if(motionOff()||!('IntersectionObserver' in window)){nodes.forEach(node=>node.classList.add('is-visible'));return;}
 revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('is-visible',entry.isIntersecting);},{threshold:.04,rootMargin:'0px 0px -25px 0px'});
 nodes.forEach(node=>revealObserver.observe(node));
}
function renderContent(){
 document.getElementById('brand-name').textContent=text(data.name,'Nutcracker');
 boot.setName(text(data.name,'Nutcracker'));soundtrackPlayer.setTracks(data.soundtracks);
 document.getElementById('home-greeting').textContent=`${text(data.greeting,'Hi! I am')} ${text(data.name,'Nutcracker')}`;
 document.getElementById('chapter-description').textContent=[text(data.nickname),text(data.intro)].filter(Boolean).join('\n');
 document.getElementById('home-smile').disabled=!smileyPhrases().length;
 document.getElementById('photos-lead').textContent=text(data.journalIntro,'A few things I wanted to keep. More photos and places will find their way here.');
 const photosTitle=document.getElementById('photos-title');const customTitle=text(data.journalTitle).trim();photosTitle.replaceChildren();if(customTitle)photosTitle.textContent=customTitle;else photosTitle.append(document.createTextNode('Some cool'),n('br'),n('em','','photos.'));
 collectionController?.destroy();collectionController=renderPhotoCollection(data,document.getElementById('photos-content'),{openPhoto,prepareText,onRender:()=>{observeReveals();scheduleScroll();}});
 for(const [route,render] of [['achievements',achievementsSlide],['hobbies',hobbiesSlide],['facts',factsSlide]]){
  document.getElementById(route+'-content').replaceChildren(render());document.getElementById(route+'-lead').textContent=text(data[route+'Intro']);
 }
 contacts();preparePortfolioText();observeReveals();scheduleScroll();
}
const palette=[[164,198,255],[150,162,255],[124,209,255],[95,233,246],[137,159,255]];
function smoothstep(x){return x*x*(3-2*x);}
function updateScroll(){
 scrollFrame=0;if(editorMode)return;
 const y=window.scrollY;const height=window.innerHeight;
 const anchors=sections.map((section,i)=>i===0?0:y+section.getBoundingClientRect().top-height*.27);
 const last=routes.length-1;let current=last;for(let i=0;i<last;i++)if(y<anchors[i+1]){current=i;break;}
 const local=current<last?Math.max(0,Math.min(1,(y-anchors[current])/Math.max(1,anchors[current+1]-anchors[current]))):1;
 const blend=current<last?smoothstep(Math.max(0,Math.min(1,(local-.46)/.54))):0;
 scrollValue=current+blend;scene?.setScroll(scrollValue);
 const low=Math.min(last,Math.floor(scrollValue)),high=Math.min(last,low+1),weight=scrollValue-low;
 const rgb=palette[low].map((v,i)=>Math.round(v+(palette[high][i]-v)*weight));
 document.body.style.setProperty('--journey-rgb',rgb.join(' '));document.body.style.setProperty('--journey-accent',`rgb(${rgb.join(' ')})`);
 document.body.style.setProperty('--scroll-phase',String(scrollValue));document.body.style.setProperty('--glow-x',(50+Math.cos(scrollValue*Math.PI)*23)+'%');
 const nearest=Math.min(last,Math.round(scrollValue));
 document.body.dataset.world=String(nearest);
 document.getElementById('journey-progress').style.transform=`scaleY(${Math.max(.025,Math.min(1,y/Math.max(1,document.documentElement.scrollHeight-height)))})`;
 if(nearest!==active||!document.body.dataset.scrollReady){active=nearest;document.body.dataset.scrollReady='true';document.querySelectorAll('[data-slide]').forEach(link=>{if(link.dataset.slide===routes[active])link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});}
}
function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);}
function syncScene(){scene?.setMotion(bootEntered&&!motionOff()&&!editorMode&&!photoDialog.open);scene?.setLocked(!bootEntered||editorMode||photoDialog.open);}
function updateMotion(){document.documentElement.classList.toggle('no-motion',motionOff());const button=document.getElementById('motion-toggle');button.replaceChildren(icon('motion'),document.createTextNode(motionOff()?' Motion off':' Motion on'));button.setAttribute('aria-pressed',String(motionOff()));button.setAttribute('aria-label',reduceQuery.matches?'Motion off, following your device preference':(motionOff()?'Turn animations on':'Turn animations off'));button.disabled=reduceQuery.matches;syncScene();observeReveals();scheduleScroll();}
function chooseChapter(index){navigate(index,{focus:true});}
penguin.addEventListener('click',event=>{
 if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
 event.preventDefault();
 if(editorMode){setEditorMode(false);return;}
 const now=performance.now();if(penguinTaps&&now-lastPenguinTapAt>2000)resetPenguinTaps();
 lastPenguinTapAt=now;penguinTaps++;clearTimeout(penguinTapTimer);
 if(penguinTaps===10){setEditorMode(true);return;}penguinTapTimer=setTimeout(resetPenguinTaps,2001);
});
document.addEventListener('click',event=>{
 if(event.target.closest('.site-header .wordmark'))return;
 if(!editorMode){resetPenguinTaps();return;}
 if(event.target.closest('[data-slide],#open-chapter,#reset-view,.back-to-top')){event.preventDefault();event.stopImmediatePropagation();}
},true);
document.addEventListener('click',event=>{
 if(event.defaultPrevented)return;const link=event.target.closest('a[href^="#"]');if(!link||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
 const index=routes.indexOf(link.getAttribute('href').slice(1));if(index<0)return;
 event.preventDefault();navigate(index,{focus:true});
});
window.addEventListener('hashchange',()=>{if(editorMode){history.replaceState(null,'',location.pathname+location.search+lockedHash);return;}navigate(routeIndex(),{updateHistory:false});});
window.addEventListener('popstate',()=>{if(!editorMode)navigate(routeIndex(),{updateHistory:false});});
window.addEventListener('scroll',()=>{if(editorMode){if(Math.abs(window.scrollY-lockedScroll)>1)window.scrollTo({top:lockedScroll,behavior:'instant'});return;}scheduleScroll();},{passive:true});
window.addEventListener('resize',scheduleScroll,{passive:true});
function blockSecretScroll(event){if(editorMode&&!event.target.closest('.secret-controls'))event.preventDefault();}
window.addEventListener('wheel',blockSecretScroll,{passive:false});window.addEventListener('touchmove',blockSecretScroll,{passive:false});
document.addEventListener('keydown',event=>{
 if(!bootEntered)return;
 const key=event.key.length===1?event.key.toLowerCase():event.key;
 const editable=event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable]');
 if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing||editable||photoDialog.open)return;
 if(editorMode){if(key===' '&&event.target.closest('.secret-key'))return;if(key.startsWith('Arrow')||key.length===1||['PageUp','PageDown','Home','End'].includes(key)){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)enterEditorKey(key);}return;}
 if(event.repeat||event.shiftKey||event.target.closest('button,summary,a'))return;
 if(key==='ArrowRight'){event.preventDefault();navigate(active+1);}if(key==='ArrowLeft'){event.preventDefault();navigate(active-1);}
},true);
window.addEventListener('blur',()=>{resetPenguinTaps();if(editorMode){editorKeys=[];showSecretProgress('Enter your code, or tap the penguin to cancel.');}});
document.getElementById('motion-toggle').addEventListener('click',()=>{preference=!preference;try{localStorage.setItem('portfolio-reduce-motion',String(preference));}catch{}updateMotion();});reduceQuery.addEventListener('change',updateMotion);
document.getElementById('open-chapter').addEventListener('click',()=>navigate(1,{focus:true}));
document.getElementById('reset-view').addEventListener('click',()=>{if(!editorMode)scene?.resetView();});
document.getElementById('home-smile').addEventListener('click',()=>{
 const phrases=smileyPhrases();if(!phrases.length)return;
 const button=document.getElementById('home-smile'),face=document.getElementById('smile-face'),message=document.getElementById('home-smile-message');
 message.textContent=phrases[smileCursor++%phrases.length];message.hidden=false;prepareText(message);message.classList.add('reveal','is-visible');
 face.textContent=[';D',':3',':P',':D'][smileCursor%4];clearTimeout(smileResetTimer);button.classList.add('is-speaking');
 button.querySelectorAll('.smile-particle').forEach(particle=>particle.remove());
 if(!motionOff()){
  button.animate([{transform:'rotate(-12deg) scale(1.05)'},{transform:'rotate(12deg) scale(1.22)'},{transform:'rotate(-5deg) scale(1.08)'},{transform:'rotate(0deg) scale(1)'}],{duration:520,easing:'ease-out'});
  for(let i=0;i<5;i++){const particle=n('span','smile-particle',i%2?'+':'·');particle.setAttribute('aria-hidden','true');const angle=(i/5)*Math.PI*2;particle.style.setProperty('--particle-x',Math.cos(angle)*38+'px');particle.style.setProperty('--particle-y',Math.sin(angle)*35+'px');button.append(particle);}
 }
 smileResetTimer=setTimeout(()=>{face.textContent=':D';button.classList.remove('is-speaking');button.querySelectorAll('.smile-particle').forEach(particle=>particle.remove());},700);
});
document.addEventListener('click',async event=>{const button=event.target.closest('[data-copy]');if(!button)return;try{await navigator.clipboard.writeText(button.dataset.copy);toast('Copied: '+button.dataset.copy);}catch{toast('Discord: '+button.dataset.copy+' — select and copy the handle.');}});
document.addEventListener('pointermove',event=>{if(motionOff()||event.pointerType!=='mouse')return;const card=event.target.closest('.depth-card');if(!card)return;const bounds=card.getBoundingClientRect();card.style.setProperty('--tilt-x',((event.clientY-bounds.top)/bounds.height-.5)*-5+'deg');card.style.setProperty('--tilt-y',((event.clientX-bounds.left)/bounds.width-.5)*6+'deg');});
document.addEventListener('pointerout',event=>{const card=event.target.closest('.depth-card');if(card&&!card.contains(event.relatedTarget)){card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');}});
const photoDialog=n('dialog','photo-dialog');photoDialog.setAttribute('aria-label','Full size portfolio photo');
const photoClose=n('button','','Close photo ×');photoClose.type='button';photoClose.addEventListener('click',()=>photoDialog.close());
const photo=n('img');const photoDetails=n('div','collection-dialog-details');photoDetails.hidden=true;photoDialog.append(photoClose,photo,photoDetails);document.body.append(photoDialog);
function openPhoto(src,alt,entry){photo.src=src;photo.alt=alt;photoDetails.replaceChildren();photoDetails.hidden=!entry;if(entry){photoDetails.append(n('p','collection-dialog-type',entry.type==='travel'?'PLACES & TRAVEL':'FROM THE COLLECTION'),n('h2','collection-dialog-title',entry.title),n('p','collection-dialog-meta',[entry.location,entry.date].filter(Boolean).join(' / ')),n('p','collection-dialog-description',entry.description));}if(!photoDialog.open)photoDialog.showModal();syncScene();}
photoDialog.addEventListener('close',syncScene);photoDialog.addEventListener('click',event=>{if(event.target===photoDialog)photoDialog.close();});
let positionObserver;if('ResizeObserver' in window){positionObserver=new ResizeObserver(scheduleScroll);sections.forEach(section=>positionObserver.observe(section));}
function renderSceneCardLabels(layouts){
 for(const layout of layouts){
  let node=sceneCardNodes.get(layout.index);if(!node){node=n('div','scene-card-label');node.append(n('span','scene-card-kicker',layout.label),n('span','scene-card-title',layout.title),n('span','scene-card-action','Explore'),icon('external'));sceneCardLayer.append(node);sceneCardNodes.set(layout.index,node);}
  node.hidden=!layout.visible;if(!layout.visible)continue;
  const {x,y,width,height}=layout.rect;const styles=[Math.round(x),Math.round(y),Math.round(width),Math.round(height),layout.opacity.toFixed(3)].join('/');if(node.dataset.layout===styles)continue;node.dataset.layout=styles;node.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;node.style.width=Math.round(width)+'px';node.style.height=Math.round(height)+'px';node.style.setProperty('--card-scale',String(Math.min(1,Math.max(.45,height/112))));node.style.opacity=String(layout.opacity);
 }
}
function sceneFallback(){boot.markSceneReady();sceneCardLayer.hidden=true;document.body.classList.remove('scene-loading');document.querySelector('.scene-fallback').hidden=false;document.getElementById('universe-canvas').hidden=true;document.getElementById('scene-hint').textContent='SCROLL TO EXPLORE';document.getElementById('reset-view').hidden=true;}
document.body.classList.add('scene-loading');
import('./scene.js?v=20261007-refine6').then(({createPortfolioScene})=>{scene=createPortfolioScene({canvas:document.getElementById('universe-canvas'),onSelect:chooseChapter,onCardLayout:renderSceneCardLabels,onReady:()=>{document.body.classList.remove('scene-loading');boot.markSceneReady();},onError:sceneFallback});scene?.setScroll(scrollValue);syncScene();}).catch(sceneFallback);
updateMotion();renderContent();
fetch('portfolio.json?refresh=20261007-refine6',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('unavailable');return r.json();}).then(content=>{if(!content||typeof content!=='object'||Array.isArray(content))throw new Error('invalid');data=content;renderContent();boot.markContentReady();if(location.hash)navigate(routeIndex(),{updateHistory:false});}).catch(()=>{boot.markContentReady();toast('The latest content could not load. Open the live website and refresh to try again.');});
window.addEventListener('pagehide',event=>{if(!event.persisted){scene?.dispose();boot.destroy();soundtrackPlayer.destroy();collectionController?.destroy();revealObserver?.disconnect();positionObserver?.disconnect();cancelAnimationFrame(scrollFrame);}});
window.addEventListener('pageshow',scheduleScroll);
