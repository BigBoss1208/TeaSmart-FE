import {useEffect,useState,type ImgHTMLAttributes} from "react";
export default function ImageWithFallback({src,...props}:Omit<ImgHTMLAttributes<HTMLImageElement>,"src">&{src?:string|null}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return <img {...props} src={!src||failed?"/placeholder-teasmart.svg":src} onError={()=>setFailed(true)}/>}
