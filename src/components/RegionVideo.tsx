import {useEffect,useRef,useState} from "react";
import {Icon} from "./Icon";

/** Decorative region media. The supplied poster stays visible until playback succeeds. */
export default function RegionVideo(){
 const video=useRef<HTMLVideoElement>(null);
 const [reducedMotion,setReducedMotion]=useState(true),[failed,setFailed]=useState(false),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(true);
 useEffect(()=>{const preference=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>{setPlaying(false);setReducedMotion(preference.matches)};update();preference.addEventListener("change",update);return()=>preference.removeEventListener("change",update)},[]);
 useEffect(()=>{const media=video.current;if(reducedMotion||failed||!media)return;let active=true;media.muted=true;void media.play().catch(()=>{if(active){setPlaying(false);setFailed(true)}});return()=>{active=false;media.pause()}},[reducedMotion,failed]);
 useEffect(()=>{
  const media=video.current;
  if(!media)return;
  const observer=new IntersectionObserver(([entry])=>{
   if(!entry.isIntersecting&&!media.paused){
    media.muted=true;
    setMuted(true);
   }
  },{threshold:.1});
  observer.observe(media);
  return()=>{
   observer.disconnect();
   media.pause();
   media.muted=true;
  };
 },[]);
 const toggleSound=()=>{
  const media=video.current;
  if(!media)return;
  media.muted=!media.muted;
  setMuted(media.muted);
  if(media.muted) return;
  void media.play().catch(()=>{});
 };
 return <>
 <div className="hero-media" aria-hidden="true">
  <img className="hero-poster" src="/videos/teasmart-vung-che-poster.jpg" alt="" fetchPriority="high"/>
  {!reducedMotion&&!failed&&<video ref={video} className={"hero-video"+(playing?" is-playing":"")} src="/videos/Vungchemoi.mp4" autoPlay muted loop playsInline preload="metadata" poster="/videos/teasmart-vung-che-poster.jpg" tabIndex={-1} disablePictureInPicture onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setPlaying(false);setFailed(true)}}/>}
 </div>
 {!reducedMotion&&!failed&&<button type="button" className="hero-sound-button" onClick={toggleSound} aria-label={muted?"Bật âm thanh":"Tắt âm thanh"} aria-pressed={!muted}>
  <Icon name={muted?"volumeOff":"volume"} size={19}/>
  <span>{muted?"Bật âm thanh":"Tắt âm thanh"}</span>
 </button>}
 </>;
}