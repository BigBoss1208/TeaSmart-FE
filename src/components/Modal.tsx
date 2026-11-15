import {createPortal} from "react-dom";
import { useEffect, useId, useRef, type ReactNode } from "react";
export default function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{const before=document.activeElement as HTMLElement|null;const previous=document.body.style.overflow;document.body.style.overflow="hidden";ref.current?.focus();return()=>{document.body.style.overflow=previous;before?.focus()}},[]);
 const content=<div className="admin-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={`admin-modal feedback-modal ${wide?"feedback-modal-wide":""}`} onKeyDown={e=>{if(e.key==="Escape")onClose();if(e.key==="Tab"){const nodes=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}><div className="admin-modal-head"><h2 id={id}>{title}</h2><button type="button" aria-label="Đóng" onClick={onClose}>×</button></div>{children}</div></div>;
 return typeof document === "undefined"?content:createPortal(content,document.body);
}
