const audioTypes='mpeg|ogg|wav|x-wav|wave|aac|mp4|x-m4a|webm|flac|x-flac';
function audioSource(value){
 if(typeof value!=='string')return '';
 const source=value.trim();
 if(new RegExp('^data:audio/('+audioTypes+');base64,[A-Za-z0-9+/=\\s]+$').test(source))return source;
 try{const url=new URL(source);return url.protocol==='https:'&&/\.(mp3|ogg|oga|wav|m4a|aac|mp4|webm|flac)$/i.test(url.pathname)?url.href:'';}catch{return '';}
}
function element(tag,className,text){const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;}
export function createSoundtrackPlayer(){
 const panel=element('section','soundtrack-player');panel.setAttribute('aria-label','Portfolio soundtrack');panel.hidden=true;
 const play=element('button','soundtrack-play','Play');play.type='button';play.setAttribute('aria-label','Play soundtrack');
 const select=element('select','soundtrack-select');select.setAttribute('aria-label','Choose a soundtrack');
 const next=element('button','soundtrack-next','Next');next.type='button';next.setAttribute('aria-label','Next soundtrack');
 const volume=element('input','soundtrack-volume');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value='.35';volume.setAttribute('aria-label','Soundtrack volume');
 const status=element('p','soundtrack-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const audio=document.createElement('audio');audio.preload='none';audio.volume=.35;
 panel.append(play,select,next,volume,status,audio);document.body.append(panel);
 let tracks=[];let cursor=0;
 function sync(){play.textContent=audio.paused?'Play':'Pause';play.setAttribute('aria-label',audio.paused?'Play soundtrack':'Pause soundtrack');play.setAttribute('aria-pressed',String(!audio.paused));}
 function choose(index){cursor=index;audio.pause();audio.src=tracks[cursor].url;select.value=String(cursor);status.textContent='';sync();}
 async function start(){if(!tracks.length)return;try{await audio.play();status.textContent='';}catch{status.textContent='Press Play to start, or choose another track.';}sync();}
 play.addEventListener('click',()=>{if(audio.paused)start();else audio.pause();});
 select.addEventListener('change',()=>{const wasPlaying=!audio.paused;choose(Number(select.value));if(wasPlaying)start();});
 next.addEventListener('click',()=>{const wasPlaying=!audio.paused;choose((cursor+1)%tracks.length);if(wasPlaying)start();});
 volume.addEventListener('input',()=>{audio.volume=Number(volume.value);});
 audio.addEventListener('play',sync);audio.addEventListener('pause',sync);
 audio.addEventListener('error',()=>{status.textContent='This track could not load. Try another track.';sync();});
 audio.addEventListener('ended',()=>{if(tracks.length>1){choose((cursor+1)%tracks.length);start();}else sync();});
 return {
  setTracks(values){
   audio.pause();tracks=Array.isArray(values)?values.filter(value=>value&&typeof value==='object').map(value=>({title:typeof value.title==='string'?value.title.trim():'',url:audioSource(value.url)})).filter(value=>value.url):[];
   select.replaceChildren();tracks.forEach((track,index)=>{const option=element('option','',track.title||'Track '+(index+1));option.value=String(index);select.append(option);});
   panel.hidden=!tracks.length;next.hidden=tracks.length<2;if(tracks.length)choose(0);else{audio.removeAttribute('src');audio.load();}
  },
  destroy(){audio.pause();audio.removeAttribute('src');audio.load();panel.remove();}
 };
}
