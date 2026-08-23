import{r as o,j as e}from"./vendor-motion-CWmlYJXN.js";import{u as ne}from"./index-C3JiZbYs.js";import{x as oe,y as ae,z as ie,F as U,G as se,H as le,S as I,J as de,b as z,j as ce,N as D,W as pe,D as J,O as ge,X as W,Z as be,Q as xe,V as A,Y as he,_ as me}from"./vendor-lucide-DzC2HuM0.js";import"./vendor-react-DMQILNY9.js";import"./vendor-router-DNiNzuUU.js";const C=[{value:"ring",label:"Ring",icon:oe,hint:"finger"},{value:"necklace",label:"Necklace",icon:ae,hint:"neck"},{value:"earrings",label:"Earrings",icon:ie,hint:"ears"},{value:"bracelet",label:"Bracelet",icon:U,hint:"wrist"},{value:"watch",label:"Watch",icon:U,hint:"wrist"},{value:"pendant",label:"Pendant",icon:se,hint:"neck/chest"},{value:"bangle",label:"Bangle",icon:le,hint:"wrist"}];function V(n){return new Promise((b,c)=>{const a=new FileReader;a.onload=()=>b(a.result),a.onerror=c,a.readAsDataURL(n)})}function Y(n){return new Promise((b,c)=>{const a=new Image;a.crossOrigin="anonymous",a.onload=()=>b(a),a.onerror=c,a.src=n})}function ye(n){return new Promise(b=>setTimeout(b,n))}function fe({before:n,after:b,visible:c}){const a=o.useRef(null),i=o.useRef(null),s=o.useRef(null),x=o.useRef(null),l=o.useRef(null),t=o.useRef(!1),d=o.useRef(50),y=o.useRef(0),h=o.useCallback(g=>{i.current&&(i.current.style.clipPath=`inset(0 ${100-g}% 0 0)`),s.current&&(s.current.style.left=`${g}%`),x.current&&(x.current.style.opacity=g>20?"1":"0"),l.current&&(l.current.style.opacity=g<80?"1":"0")},[]),f=o.useCallback(g=>{if(!a.current)return;const u=a.current.getBoundingClientRect();d.current=Math.max(4,Math.min(96,(g-u.left)/u.width*100)),cancelAnimationFrame(y.current),y.current=requestAnimationFrame(()=>h(d.current))},[h]);return o.useEffect(()=>(h(50),()=>cancelAnimationFrame(y.current)),[h]),e.jsxs("div",{ref:a,className:"tryon2-slider",onPointerDown:g=>{t.current=!0,g.currentTarget.setPointerCapture(g.pointerId),f(g.clientX)},onPointerMove:g=>{t.current&&f(g.clientX)},onPointerUp:()=>{t.current=!1},onPointerCancel:()=>{t.current=!1},children:[e.jsx("img",{src:b,alt:"Try-on result",className:"tryon2-slider-img",style:{opacity:c?1:0,transition:"opacity 0.7s ease"}}),e.jsx("div",{ref:i,className:"tryon2-slider-before",children:e.jsx("img",{src:n,alt:"Original photo",className:"tryon2-slider-img tryon2-slider-img--before"})}),e.jsx("div",{ref:s,className:"tryon2-slider-line",children:e.jsx("div",{className:"tryon2-slider-handle",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 20 20",fill:"none",children:[e.jsx("path",{d:"M7 5L3 10L7 15",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("path",{d:"M13 5L17 10L13 15",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})]})})}),e.jsx("span",{ref:x,className:"tryon2-label-pill tryon2-label-pill--left",children:"Original"}),e.jsx("span",{ref:l,className:"tryon2-label-pill tryon2-label-pill--right",children:"Try-On"})]})}function ue({photo:n,jewelleryType:b}){const c=C.find(i=>i.value===b)??C[0],a=c.icon;return e.jsxs("div",{className:"tryon2-gen-overlay",children:[n&&e.jsx("img",{src:n,alt:"",className:"tryon2-gen-bg"}),e.jsx("div",{className:"tryon2-shimmer"}),e.jsxs("div",{className:"tryon2-gen-badge",children:[e.jsx("div",{className:"tryon2-gen-ring",children:e.jsx("div",{className:"tryon2-gen-inner",children:e.jsx(a,{size:26})})}),e.jsxs("strong",{children:["Placing ",c.label.toLowerCase()]}),e.jsxs("span",{children:["Matching light · Fitting to ",c.hint]}),e.jsxs("div",{className:"tryon2-gen-dots",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})]})]})}function ve({photo:n,onPhoto:b}){const c=o.useRef(null),a=async i=>{i&&b(await V(i))};return e.jsxs("div",{className:`tryon2-thumb ${n?"has-photo":""}`,onClick:()=>c.current?.click(),onDragOver:i=>i.preventDefault(),onDrop:i=>{i.preventDefault(),a(i.dataTransfer.files[0])},children:[e.jsx("input",{ref:c,type:"file",accept:"image/*",capture:"user",style:{display:"none"},onChange:i=>{a(i.target.files?.[0])}}),n?e.jsxs(e.Fragment,{children:[e.jsx("img",{src:n,alt:"Person",className:"tryon2-thumb-img"}),e.jsx("button",{type:"button",className:"tryon2-thumb-remove",onClick:i=>{i.stopPropagation(),b("")},"aria-label":"Remove",children:e.jsx(W,{size:11})}),e.jsxs("div",{className:"tryon2-thumb-change",children:[e.jsx(be,{size:14})," Change"]})]}):e.jsxs("div",{className:"tryon2-thumb-empty",children:[e.jsx("div",{className:"tryon2-thumb-empty-icon",children:e.jsx(xe,{size:22})}),e.jsx("strong",{children:"Upload your photo"}),e.jsx("span",{children:"Upload a photo of yourself (or the customer) to try jewellery on — drag & drop or click"})]})]})}function we({jewellery:n,jewelleryType:b,onJewellery:c,onJewelleryType:a,folders:i}){const s=o.useRef(null),x=i.flatMap(t=>t.images),l=async t=>{t&&c(await V(t))};return e.jsxs("div",{className:"tryon2-picker-wrap",children:[e.jsx("div",{className:"tryon2-type-grid",children:C.map(t=>{const d=t.icon,y=t.value===b;return e.jsxs("button",{type:"button",className:`tryon2-type-btn ${y?"is-on":""}`,onClick:()=>a(t.value),children:[e.jsx(d,{size:15}),t.label]},t.value)})}),n?e.jsxs("div",{className:"tryon2-jewel-preview",children:[e.jsx("img",{src:n,alt:"Selected jewellery"}),e.jsxs("div",{className:"tryon2-jewel-badge",children:[e.jsx(z,{size:11})," Selected"]}),e.jsx("button",{type:"button",className:"tryon2-jewel-remove",onClick:()=>c(""),"aria-label":"Remove jewellery",children:e.jsx(W,{size:12})}),e.jsxs("label",{className:"tryon2-jewel-change",children:[e.jsx(A,{size:11})," Change",e.jsx("input",{type:"file",accept:"image/*",style:{display:"none"},onChange:t=>{l(t.target.files?.[0])}})]})]}):e.jsxs("label",{className:"tryon2-jewel-upload",children:[e.jsx("div",{className:"tryon2-jewel-upload-icon",children:e.jsx(A,{size:18})}),e.jsx("strong",{children:"Upload design"}),e.jsx("span",{children:"JPG, PNG or WEBP"}),e.jsx("input",{ref:s,type:"file",accept:"image/*",style:{display:"none"},onChange:t=>{l(t.target.files?.[0])}})]}),x.length>0&&e.jsxs("div",{className:"tryon2-gallery",children:[e.jsxs("span",{className:"tryon2-gallery-label",children:["From gallery (",x.length,")"]}),e.jsx("div",{className:"tryon2-gallery-grid",children:x.map(t=>e.jsxs("button",{type:"button",className:`tryon2-gallery-item ${n===t.url?"is-on":""}`,onClick:()=>c(t.url),title:t.label,children:[e.jsx("img",{src:t.url,alt:t.label,loading:"lazy"}),n===t.url&&e.jsx(z,{size:16,className:"tryon2-gallery-check"})]},t.id))})]})]})}function je({frames:n,onDownload:b}){const[c,a]=o.useState(0),[i,s]=o.useState(!0),x=o.useRef(null);o.useEffect(()=>(i&&n.length>1?x.current=setInterval(()=>a(t=>(t+1)%n.length),900):x.current&&clearInterval(x.current),()=>{x.current&&clearInterval(x.current)}),[i,n.length]);const l=n[c];return e.jsxs("div",{className:"tryon2-frame-player",children:[e.jsxs("div",{className:"tryon2-frame-img-wrap",children:[n.map((t,d)=>e.jsx("img",{src:t.url,alt:t.label,className:`tryon2-frame-img ${d===c?"is-active":""}`},d)),l&&e.jsx("span",{className:"tryon2-frame-label",children:l.label})]}),e.jsxs("div",{className:"tryon2-frame-controls",children:[e.jsx("div",{className:"tryon2-frame-dots",children:n.map((t,d)=>e.jsx("button",{type:"button",className:`tryon2-frame-dot ${d===c?"is-on":""}`,onClick:()=>{a(d),s(!1)},"aria-label":`Frame ${d+1}`},d))}),e.jsxs("div",{className:"tryon2-frame-btns",children:[e.jsx("button",{type:"button",className:"tryon2-action-btn",onClick:()=>s(t=>!t),children:i?e.jsxs(e.Fragment,{children:[e.jsx(he,{size:14})," Pause"]}):e.jsxs(e.Fragment,{children:[e.jsx(me,{size:14})," Play"]})}),e.jsxs("button",{type:"button",className:"tryon2-action-btn",onClick:b,children:[e.jsx(J,{size:14})," Download"]})]})]})]})}function Se(){const{aiGeneratedFolders:n,saveTryonFolder:b}=ne(),c=n.flatMap(r=>r.images),[a,i]=o.useState(!1),[s,x]=o.useState(""),[l,t]=o.useState(""),[d,y]=o.useState("ring"),[h,f]=o.useState("idle"),[g,u]=o.useState(""),[B,$]=o.useState(""),[L,R]=o.useState(!1),[v,P]=o.useState([]),[m,k]=o.useState("idle"),[q,S]=o.useState("");o.useEffect(()=>{if(!g){R(!1);return}const r=setTimeout(()=>R(!0),60);return()=>clearTimeout(r)},[g]);const T=!!(s&&l&&h!=="generating"),H=async()=>{if(T){f("generating"),$(""),u(""),R(!1),P([]),k("idle"),S("");try{const r=await fetch("/api/ai/tryon",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({personPhoto:s,jewelleryImage:l,jewelleryType:d})}),p=await r.json().catch(()=>({}));if(!r.ok||!p.resultUrl)throw new Error(p.error||"Try-on generation failed");u(p.resultUrl),f("done"),b({name:`Virtual Try-On · ${d} · ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`,prompt:`Virtual try-on: ${d}`,images:[{url:p.resultUrl,label:`${d} try-on`,prompt:`Virtual try-on: ${d}`}]}).catch(()=>{})}catch(r){$(r instanceof Error?r.message:"Try-on generation failed"),f("error")}}},X=async()=>{if(!(!g||!l)){k("generating"),S(""),P([]);try{const r=await fetch("/api/ai/tryon/frames",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({tryonImage:g,jewelleryImage:l,jewelleryType:d})}),p=await r.json().catch(()=>({}));if(!r.ok||!p.frames?.length)throw new Error(p.error||"Motion sequence failed");P(p.frames),k("done"),b({name:`Motion Sequence · ${d} · ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`,prompt:`Virtual try-on motion sequence: ${d}`,images:p.frames.map(w=>({url:w.url,label:w.label,prompt:`Virtual try-on motion: ${d}`}))}).catch(()=>{})}catch(r){S(r instanceof Error?r.message:"Motion sequence failed"),k("error")}}},_=async()=>{if(v.length)try{const r=await Y(v[0].url),p=document.createElement("canvas");p.width=r.naturalWidth||768,p.height=r.naturalHeight||1024;const w=p.getContext("2d");if(!w)return;const K=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm",ee=p.captureStream(2),F=new MediaRecorder(ee,{mimeType:K}),O=[];F.ondataavailable=j=>{j.data.size>0&&O.push(j.data)},F.start();for(const j of v){const te=await Y(j.url);w.clearRect(0,0,p.width,p.height),w.drawImage(te,0,0,p.width,p.height),await ye(600)}F.stop(),await new Promise(j=>{F.onstop=()=>j()});const re=new Blob(O,{type:"video/webm"}),M=URL.createObjectURL(re),E=document.createElement("a");E.href=M,E.download=`bb-motion-${Date.now()}.webm`,E.click(),setTimeout(()=>URL.revokeObjectURL(M),1e4)}catch{}},Z=()=>{x(""),t(""),u(""),f("idle"),$(""),P([]),k("idle"),S(""),R(!1)},Q=()=>{const r=document.createElement("a");r.href=g,r.download=`bb-tryon-${Date.now()}.png`,r.click()},G=C.find(r=>r.value===d)??C[0],N=s&&l?3:s||l?2:1;return e.jsxs("div",{className:"tryon2-shell",children:[e.jsx("style",{children:ke}),e.jsxs("header",{className:"tryon2-header",children:[e.jsxs("div",{className:"tryon2-header-left",children:[e.jsxs("span",{className:"tryon2-eyebrow",children:[e.jsx(I,{size:10})," AI Studio"]}),e.jsxs("h1",{className:"tryon2-title",children:["Virtual ",e.jsx("span",{className:"tryon2-title-accent",children:"Try‑On"})]}),e.jsx("p",{className:"tryon2-subtitle",children:"Place any jewellery on a photo using AI"})]}),e.jsxs("div",{className:"tryon2-header-right",children:[h!=="done"&&e.jsx("div",{className:"tryon2-progress-pills",children:["Upload","Jewellery","Generate"].map((r,p)=>e.jsxs("div",{className:`tryon2-progress-pill ${p+1<=N?"is-done":""} ${p+1===N?"is-active":""}`,children:[e.jsx("span",{className:"tryon2-progress-num",children:p+1<N?"✓":p+1}),r]},r))}),h==="done"&&e.jsxs("button",{type:"button",className:"tryon2-reset-btn",onClick:Z,children:[e.jsx(de,{size:14})," New try-on"]})]})]}),e.jsxs("div",{className:"tryon2-body",children:[e.jsxs("aside",{className:"tryon2-inputs",children:[e.jsxs("div",{className:"tryon2-step-header",children:[e.jsx("div",{className:`tryon2-step-num ${s?"is-done":N===1?"is-active":""}`,children:s?e.jsx(z,{size:13}):"1"}),e.jsxs("div",{className:"tryon2-step-label",children:[e.jsx("span",{children:"Your Photo"}),e.jsx("small",{children:s?"Photo added":"Upload a clear photo of yourself to try it on"})]})]}),e.jsxs("div",{className:"tryon2-thumb-wrap",children:[e.jsx(ve,{photo:s,onPhoto:x}),c.length>0&&e.jsxs("div",{style:{marginTop:8},children:[e.jsxs("button",{type:"button",onClick:()=>i(r=>!r),style:{width:"100%",minHeight:40,borderRadius:10,border:"1.5px solid rgba(207,95,145,0.35)",background:a?"rgba(207,95,145,0.08)":"#fff",color:"var(--bb-rose)",fontWeight:800,fontSize:"0.78rem",display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer"},children:[e.jsx(ce,{size:15})," From my gallery (",c.length,")"]}),a&&e.jsxs("div",{style:{marginTop:8,padding:10,borderRadius:12,border:"1px solid var(--bb-line)",background:"#fff",maxHeight:240,overflowY:"auto"},children:[e.jsx("p",{style:{margin:"0 0 8px",fontSize:"0.72rem",color:"var(--bb-muted)"},children:"Browse all your saved images — pick any photo to try jewellery on."}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(56px, 1fr))",gap:6},children:c.map(r=>e.jsx("button",{type:"button",title:r.label,onClick:()=>{x(r.url),i(!1)},style:{width:"100%",aspectRatio:"1",padding:0,borderRadius:8,overflow:"hidden",border:`2px solid ${s===r.url?"var(--bb-rose)":"transparent"}`,cursor:"pointer",background:"none"},children:e.jsx("img",{src:r.url,alt:r.label,loading:"lazy",style:{width:"100%",height:"100%",objectFit:"cover"}})},r.id))})]})]})]}),e.jsx("div",{className:"tryon2-divider"}),e.jsxs("div",{className:"tryon2-step-header",children:[e.jsx("div",{className:`tryon2-step-num ${l?"is-done":N===2?"is-active":""}`,children:l?e.jsx(z,{size:13}):"2"}),e.jsxs("div",{className:"tryon2-step-label",children:[e.jsx("span",{children:"Jewellery Piece"}),e.jsx("small",{children:l?`${G.label} selected`:"Choose type & piece"})]})]}),e.jsx(we,{jewellery:l,jewelleryType:d,onJewellery:t,onJewelleryType:y,folders:n}),e.jsx("div",{className:"tryon2-divider"}),e.jsxs("div",{className:"tryon2-step-header",children:[e.jsx("div",{className:`tryon2-step-num ${h==="done"?"is-done":T?"is-active":""}`,children:h==="done"?e.jsx(z,{size:13}):"3"}),e.jsxs("div",{className:"tryon2-step-label",children:[e.jsx("span",{children:"Generate"}),e.jsx("small",{children:h==="done"?"Try-on complete!":"AI places it naturally"})]})]}),e.jsxs("div",{className:"tryon2-generate-wrap",children:[e.jsx("button",{type:"button",className:`tryon2-generate-btn ${T?"is-ready":""}`,disabled:!T,onClick:()=>{H()},children:h==="generating"?e.jsxs(e.Fragment,{children:[e.jsx(D,{size:16,className:"animate-spin"})," Generating…"]}):e.jsxs(e.Fragment,{children:[e.jsx(pe,{size:16})," Generate Try-On"]})}),!s&&!l&&e.jsx("p",{className:"tryon2-hint",children:"Start by uploading a photo above."}),s&&!l&&e.jsx("p",{className:"tryon2-hint",children:"Now pick a jewellery piece to continue."}),!s&&l&&e.jsx("p",{className:"tryon2-hint",children:"Almost there — upload a customer photo."}),h==="error"&&e.jsxs("div",{className:"tryon2-error",children:["⚠ ",B]})]})]}),e.jsxs("main",{className:"tryon2-canvas",children:[h==="idle"&&!g&&e.jsx("div",{className:"tryon2-empty",children:s&&l?e.jsxs("div",{className:"tryon2-ready-preview",children:[e.jsxs("div",{className:"tryon2-preview-stack",children:[e.jsx("img",{src:s,alt:"Person",className:"tryon2-preview-person"}),e.jsx("div",{className:"tryon2-preview-jewel-badge",children:e.jsx("img",{src:l,alt:"Jewellery"})})]}),e.jsxs("div",{className:"tryon2-ready-text",children:[e.jsxs("div",{className:"tryon2-ready-badge",children:[e.jsx(I,{size:14})," Ready to generate"]}),e.jsx("h3",{children:"Looking good so far!"}),e.jsxs("p",{children:["Hit ",e.jsx("strong",{children:"Generate Try-On"})," to see the ",G.label.toLowerCase()," placed naturally on the photo"]})]})]}):e.jsxs("div",{className:"tryon2-idle-art",children:[e.jsx("div",{className:"tryon2-orb tryon2-orb--1"}),e.jsx("div",{className:"tryon2-orb tryon2-orb--2"}),e.jsx("div",{className:"tryon2-orb tryon2-orb--3"}),e.jsx("div",{className:"tryon2-idle-icon",children:e.jsx(I,{size:40})}),e.jsx("strong",{children:"Try jewellery on a photo"}),e.jsx("p",{children:"Our AI composites any piece onto a real photo — rings, necklaces, earrings and more."}),e.jsx("div",{className:"tryon2-steps-hint",children:[{n:"1",t:"Upload your photo",s:"A clear photo of yourself — or pick from your gallery",done:!!s},{n:"2",t:"Choose jewellery",s:"From gallery or upload",done:!!l},{n:"3",t:"Generate",s:"AI places it naturally",done:!1}].map(r=>e.jsxs("div",{className:`tryon2-step-hint ${r.done?"is-done":""}`,children:[e.jsx("span",{children:r.done?"✓":r.n}),e.jsxs("div",{children:[e.jsx("strong",{children:r.t}),e.jsx("p",{children:r.s})]})]},r.n))})]})}),h==="generating"&&e.jsx(ue,{photo:s,jewelleryType:d}),g&&e.jsxs("div",{className:`tryon2-result-wrap ${v.length>0||m==="generating"||m==="error"?"has-frames":""}`,style:{opacity:L?1:0,transform:L?"none":"scale(0.97)",transition:"opacity 0.6s ease, transform 0.6s ease"},children:[e.jsxs("div",{className:"tryon2-result-left",children:[e.jsx("div",{className:"tryon2-result-slider-wrap",children:e.jsx(fe,{before:s,after:g,visible:L})}),e.jsxs("div",{className:"tryon2-result-actions",children:[e.jsxs("button",{type:"button",className:"tryon2-action-btn tryon2-action-btn--primary",onClick:Q,children:[e.jsx(J,{size:15})," Download"]}),e.jsx("button",{type:"button",className:"tryon2-action-btn",onClick:()=>{X()},disabled:m==="generating",children:m==="generating"?e.jsxs(e.Fragment,{children:[e.jsx(D,{size:15,className:"animate-spin"})," Making motion…"]}):e.jsxs(e.Fragment,{children:[e.jsx(ge,{size:15})," Make motion"]})})]}),e.jsx("p",{className:"tryon2-footnote",children:"Drag the handle to compare · Preview only"})]}),(v.length>0||m==="generating"||m==="error")&&e.jsx("div",{className:"tryon2-frames-block",children:m==="generating"?e.jsxs("div",{className:"tryon2-video-loading",children:[e.jsx(D,{size:20,className:"animate-spin"}),e.jsx("span",{children:"Creating motion sequence… ~90 sec"})]}):m==="error"?e.jsxs("div",{className:"tryon2-video-error",children:["⚠ ",q]}):e.jsx(je,{frames:v,onDownload:()=>{_()}})})]})]})]})]})}const ke=`
  /* ── Shell ── */
  .tryon2-shell {
    padding: 16px 20px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 14px;
    /* Exactly fill the space below the sticky header (78px desktop) */
    height: calc(100dvh - 78px);
    overflow: hidden;
  }
  @media (max-width: 860px) {
    .tryon2-shell {
      height: auto;
      min-height: calc(100dvh - 54px);
      overflow: visible;
      padding: 12px 14px;
    }
  }

  /* ── Header ── */
  .tryon2-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .tryon2-header-left { display: flex; flex-direction: column; gap: 3px; }
  .tryon2-header-right { display: flex; align-items: center; gap: 12px; }

  .tryon2-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--bb-rose);
  }

  .tryon2-title {
    margin: 0;
    font-size: clamp(1.7rem, 2.8vw, 2.5rem);
    line-height: 1.08;
    font-weight: 900;
    color: var(--bb-ink);
    letter-spacing: -0.02em;
  }
  .tryon2-title-accent {
    font-family: 'Pinyon Script', cursive;
    color: var(--bb-rose);
    font-size: 1.2em;
    line-height: 1;
  }
  .tryon2-subtitle {
    font-size: 0.8rem;
    color: var(--bb-muted);
    margin: 0;
    font-weight: 500;
  }

  /* ── Progress pills ── */
  .tryon2-progress-pills {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(0,0,0,0.04);
    border-radius: 999px;
    padding: 4px;
  }
  .tryon2-progress-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 6px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--bb-muted);
    transition: all 0.22s;
    white-space: nowrap;
  }
  .tryon2-progress-pill.is-active {
    background: #fff;
    color: var(--bb-rose);
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  }
  .tryon2-progress-pill.is-done { color: var(--bb-ink); opacity: 0.55; }
  .tryon2-progress-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(207,95,145,0.12);
    color: var(--bb-rose);
    display: grid;
    place-items: center;
    font-size: 0.65rem;
    font-weight: 900;
    flex-shrink: 0;
    transition: all 0.22s;
  }
  .tryon2-progress-pill.is-active .tryon2-progress-num {
    background: linear-gradient(135deg, var(--bb-rose), var(--bb-coral));
    color: #fff;
    box-shadow: 0 2px 8px rgba(207,95,145,0.4);
  }
  .tryon2-progress-pill.is-done .tryon2-progress-num {
    background: rgba(34,197,94,0.12);
    color: #16a34a;
  }

  .tryon2-reset-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 12px;
    border: 1.5px solid var(--bb-line);
    background: #fff;
    color: var(--bb-muted);
    font-size: 0.8rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .tryon2-reset-btn:hover { color: var(--bb-rose); border-color: var(--bb-rose); background: rgba(207,95,145,0.04); }

  /* ── Layout ── */
  .tryon2-body {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 14px;
    align-items: stretch;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  @media (max-width: 1100px) { .tryon2-body { grid-template-columns: 280px minmax(0, 1fr); } }
  @media (max-width: 860px)  {
    .tryon2-body {
      grid-template-columns: 1fr;
      overflow: visible;
      height: auto;
    }
  }

  /* ── Left panel ── */
  .tryon2-inputs {
    background: #fff;
    border: 1px solid var(--bb-line);
    border-radius: 22px;
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
    /* Fill available column height and scroll internally */
    height: 100%;
    scrollbar-width: thin;
    scrollbar-color: rgba(207,95,145,0.2) transparent;
  }
  .tryon2-inputs::-webkit-scrollbar { width: 4px; }
  .tryon2-inputs::-webkit-scrollbar-track { background: transparent; }
  .tryon2-inputs::-webkit-scrollbar-thumb { background: rgba(207,95,145,0.25); border-radius: 99px; }

  /* ── Step header rows ── */
  .tryon2-step-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px 0;
  }
  .tryon2-step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    font-size: 0.72rem;
    font-weight: 900;
    background: rgba(0,0,0,0.06);
    color: var(--bb-muted);
    transition: all 0.22s;
  }
  .tryon2-step-num.is-active {
    background: linear-gradient(135deg, var(--bb-rose), var(--bb-coral));
    color: #fff;
    box-shadow: 0 3px 10px rgba(207,95,145,0.35);
  }
  .tryon2-step-num.is-done {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: #fff;
    box-shadow: 0 3px 10px rgba(34,197,94,0.3);
  }
  .tryon2-step-label { display: flex; flex-direction: column; gap: 1px; }
  .tryon2-step-label span { font-size: 0.78rem; font-weight: 800; color: var(--bb-ink); }
  .tryon2-step-label small { font-size: 0.68rem; color: var(--bb-muted); font-weight: 500; }

  .tryon2-step-body { padding: 10px 18px; }
  .tryon2-divider { height: 1px; background: var(--bb-line); margin: 0; }

  /* ── Photo upload ── */
  .tryon2-thumb-wrap { padding: 10px 18px 16px; }
  .tryon2-thumb {
    border-radius: 14px;
    border: 2px dashed rgba(207,95,145,0.3);
    background: linear-gradient(145deg, #fff8f6, #fff5f2);
    min-height: 130px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: grid;
    place-items: center;
    transition: all 0.22s;
  }
  .tryon2-thumb:hover {
    border-color: var(--bb-rose);
    background: rgba(207,95,145,0.04);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(207,95,145,0.13);
  }
  .tryon2-thumb.has-photo { border-style: solid; border-color: rgba(207,95,145,0.35); background: #fff; min-height: unset; }
  .tryon2-thumb-img { width: 100%; max-height: 200px; object-fit: cover; display: block; border-radius: 12px; }
  .tryon2-thumb-empty {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 24px 20px; color: var(--bb-muted); text-align: center;
  }
  .tryon2-thumb-empty-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(207,95,145,0.12), rgba(199,166,106,0.08));
    display: grid; place-items: center; color: var(--bb-rose);
  }
  .tryon2-thumb-empty strong { font-size: 0.84rem; font-weight: 800; color: var(--bb-ink); }
  .tryon2-thumb-empty span { font-size: 0.72rem; color: var(--bb-muted); }
  .tryon2-thumb-remove { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.5); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background 0.15s; }
  .tryon2-thumb-remove:hover { background: rgba(185,28,28,0.85); }
  .tryon2-thumb-change { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: #fff; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 5px; opacity: 0; transition: opacity 0.2s; }
  .tryon2-thumb:hover .tryon2-thumb-change { opacity: 1; }

  /* ── Jewellery picker ── */
  .tryon2-picker-wrap { padding: 10px 18px 16px; display: flex; flex-direction: column; gap: 12px; }

  .tryon2-type-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .tryon2-type-btn {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 10px 6px 9px;
    border-radius: 12px;
    border: 1.5px solid var(--bb-line);
    background: #fafafa;
    color: var(--bb-muted);
    font-size: 0.67rem; font-weight: 800;
    cursor: pointer; transition: all 0.16s; text-align: center; line-height: 1.2;
  }
  .tryon2-type-btn:hover { border-color: rgba(207,95,145,0.45); color: var(--bb-ink); background: #fff; transform: translateY(-1px); box-shadow: 0 3px 12px rgba(0,0,0,0.08); }
  .tryon2-type-btn.is-on {
    border-color: var(--bb-rose);
    background: linear-gradient(135deg, rgba(207,95,145,0.1), rgba(199,166,106,0.06));
    color: var(--bb-rose);
    box-shadow: 0 0 0 3px rgba(207,95,145,0.12), 0 3px 10px rgba(207,95,145,0.15);
    transform: translateY(-1px);
  }
  .tryon2-type-btn svg { flex-shrink: 0; }

  .tryon2-jewel-preview { position: relative; border-radius: 14px; overflow: hidden; border: 2px solid rgba(207,95,145,0.3); background: linear-gradient(145deg, #fdf9f7, #fff); }
  .tryon2-jewel-preview img { width: 100%; max-height: 140px; object-fit: contain; display: block; padding: 8px; }
  .tryon2-jewel-badge { position: absolute; top: 8px; right: 8px; display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.96); border-radius: 999px; padding: 4px 10px; font-size: 0.67rem; font-weight: 900; color: #16a34a; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .tryon2-jewel-remove { position: absolute; top: 8px; left: 8px; width: 26px; height: 26px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.45); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background 0.15s; }
  .tryon2-jewel-remove:hover { background: rgba(185,28,28,0.85); }
  .tryon2-jewel-change { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px; background: linear-gradient(transparent, rgba(0,0,0,0.55)); color: #fff; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
  .tryon2-jewel-preview:hover .tryon2-jewel-change { opacity: 1; }
  .tryon2-jewel-upload {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 18px; border-radius: 13px;
    border: 1.5px dashed rgba(207,95,145,0.32);
    background: linear-gradient(145deg, rgba(255,248,246,0.8), rgba(255,252,250,0.9));
    color: var(--bb-rose); font-size: 0.78rem; font-weight: 800;
    cursor: pointer; transition: all 0.18s; text-align: center;
  }
  .tryon2-jewel-upload:hover { border-color: var(--bb-rose); background: rgba(207,95,145,0.06); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(207,95,145,0.12); }
  .tryon2-jewel-upload-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(207,95,145,0.12); display: grid; place-items: center; }
  .tryon2-jewel-upload span { color: var(--bb-muted); font-size: 0.7rem; font-weight: 600; }

  /* ── Gallery ── */
  .tryon2-gallery { display: flex; flex-direction: column; gap: 8px; }
  .tryon2-gallery-label { font-size: 0.62rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: var(--bb-muted); }
  .tryon2-gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .tryon2-gallery-item { padding: 0; border: 2px solid transparent; border-radius: 10px; overflow: hidden; cursor: pointer; background: #f5f0ed; position: relative; aspect-ratio: 1; transition: all 0.16s; }
  .tryon2-gallery-item:hover { transform: scale(1.05); box-shadow: 0 5px 16px rgba(0,0,0,0.12); border-color: rgba(207,95,145,0.25); }
  .tryon2-gallery-item.is-on { border-color: var(--bb-rose); box-shadow: 0 0 0 3px rgba(207,95,145,0.2); transform: scale(1.03); }
  .tryon2-gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tryon2-gallery-check { position: absolute; inset: 0; margin: auto; color: var(--bb-rose); filter: drop-shadow(0 1px 5px rgba(255,255,255,0.95)); }

  /* ── Generate CTA ── */
  .tryon2-generate-wrap { padding: 14px 18px 18px; }
  .tryon2-generate-btn {
    width: 100%;
    display: inline-flex; align-items: center; justify-content: center; gap: 9px;
    padding: 15px 20px;
    border-radius: 14px;
    border: none;
    background: rgba(0,0,0,0.06);
    color: var(--bb-muted);
    font-size: 0.9rem; font-weight: 800;
    cursor: default;
    transition: all 0.22s;
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
  }
  .tryon2-generate-btn.is-ready {
    background: linear-gradient(135deg, var(--bb-coral) 0%, var(--bb-rose) 50%, #a855f7 100%);
    color: #fff;
    cursor: pointer;
    box-shadow: 0 6px 24px rgba(207,95,145,0.35);
  }
  .tryon2-generate-btn.is-ready::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: btn-shimmer 2.5s linear infinite;
  }
  @keyframes btn-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .tryon2-generate-btn.is-ready:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(207,95,145,0.42); }
  .tryon2-generate-btn:disabled { opacity: 1; }

  .tryon2-hint { margin: 6px 18px 14px; font-size: 0.72rem; color: var(--bb-muted); text-align: center; line-height: 1.5; }
  .tryon2-error { margin: 0 18px 14px; padding: 10px 14px; border-radius: 11px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 0.77rem; line-height: 1.5; }

  /* ── Right canvas ── */
  .tryon2-canvas {
    border-radius: 22px;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    background: linear-gradient(160deg, #fdf4f0 0%, #f7ece6 50%, #f2e8f0 100%);
    border: 1px solid var(--bb-line);
    box-shadow: 0 4px 32px rgba(0,0,0,0.06);
    /* Fill column height — same as left panel */
    height: 100%;
    /* Sticky so it stays in view while left scrolls on mobile */
    align-self: stretch;
  }
  /* ── Empty state ── */
  .tryon2-empty {
    width: 100%; height: 100%; min-height: 420px;
    display: grid; place-items: center;
    padding: 48px 40px;
    position: relative;
  }

  /* Animated background orbs */
  .tryon2-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    animation: orb-float 8s ease-in-out infinite;
  }
  .tryon2-orb--1 { width: 220px; height: 220px; background: rgba(207,95,145,0.12); top: -40px; right: 10%; animation-delay: 0s; }
  .tryon2-orb--2 { width: 160px; height: 160px; background: rgba(199,166,106,0.1); bottom: 10%; left: 5%; animation-delay: -3s; }
  .tryon2-orb--3 { width: 120px; height: 120px; background: rgba(139,107,181,0.1); top: 40%; right: 5%; animation-delay: -5s; }
  @keyframes orb-float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(12px, -18px) scale(1.06); }
    66%       { transform: translate(-8px, 10px) scale(0.95); }
  }

  .tryon2-idle-art {
    display: flex; flex-direction: column; align-items: center;
    gap: 18px; text-align: center; max-width: 400px;
    position: relative; z-index: 1;
  }
  .tryon2-idle-icon {
    width: 100px; height: 100px; border-radius: 28px;
    background: linear-gradient(135deg, rgba(207,95,145,0.15), rgba(199,166,106,0.1));
    border: 1.5px solid rgba(207,95,145,0.2);
    display: grid; place-items: center; color: var(--bb-rose);
    box-shadow: 0 12px 40px rgba(207,95,145,0.16);
    animation: icon-pulse 3s ease-in-out infinite;
  }
  @keyframes icon-pulse {
    0%, 100% { box-shadow: 0 12px 40px rgba(207,95,145,0.16); transform: scale(1); }
    50%       { box-shadow: 0 16px 50px rgba(207,95,145,0.26); transform: scale(1.03); }
  }
  .tryon2-idle-art strong { font-size: 1.2rem; color: var(--bb-ink); font-weight: 900; margin: 0; letter-spacing: -0.01em; }
  .tryon2-idle-art > p { color: var(--bb-muted); font-size: 0.86rem; line-height: 1.65; margin: 0; max-width: 280px; }

  .tryon2-steps-hint {
    display: grid; gap: 0; text-align: left; width: 100%;
    background: rgba(255,255,255,0.72);
    border-radius: 16px;
    padding: 4px;
    border: 1px solid rgba(255,255,255,0.9);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .tryon2-step-hint {
    display: flex; gap: 12px; align-items: center;
    padding: 11px 12px; border-radius: 12px;
    transition: background 0.16s;
  }
  .tryon2-step-hint:hover { background: rgba(207,95,145,0.05); }
  .tryon2-step-hint.is-done { opacity: 0.6; }
  .tryon2-step-hint > span {
    width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
    display: grid; place-items: center; font-size: 0.76rem; font-weight: 900;
    background: linear-gradient(135deg, var(--bb-rose), var(--bb-coral));
    color: #fff;
    box-shadow: 0 3px 10px rgba(207,95,145,0.3);
  }
  .tryon2-step-hint.is-done > span { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 3px 10px rgba(34,197,94,0.3); }
  .tryon2-step-hint strong { display: block; font-size: 0.82rem; color: var(--bb-ink); font-weight: 800; margin-bottom: 1px; }
  .tryon2-step-hint p { margin: 0; font-size: 0.72rem; color: var(--bb-muted); }

  /* ── Ready preview ── */
  .tryon2-ready-preview {
    display: flex; flex-direction: column; align-items: center; gap: 28px;
    position: relative; z-index: 1;
  }
  .tryon2-preview-stack { position: relative; width: 200px; height: 264px; }
  .tryon2-preview-person { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; display: block; border: 2.5px solid rgba(255,255,255,0.9); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
  .tryon2-preview-jewel-badge {
    position: absolute; bottom: -14px; right: -14px;
    width: 80px; height: 80px; border-radius: 18px; overflow: hidden;
    border: 3px solid #fff; box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    background: linear-gradient(145deg, #fdf9f7, #fff);
    animation: jewel-bounce 2s ease-in-out infinite;
  }
  @keyframes jewel-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-5px); }
  }
  .tryon2-preview-jewel-badge img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
  .tryon2-ready-text { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .tryon2-ready-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: linear-gradient(135deg, rgba(207,95,145,0.12), rgba(199,166,106,0.08));
    border: 1px solid rgba(207,95,145,0.2);
    padding: 5px 14px; border-radius: 999px;
    font-size: 0.72rem; font-weight: 800; color: var(--bb-rose);
  }
  .tryon2-ready-text h3 { margin: 0; font-size: 1.15rem; font-weight: 900; color: var(--bb-ink); letter-spacing: -0.01em; }
  .tryon2-ready-text p { margin: 0; font-size: 0.83rem; color: var(--bb-muted); line-height: 1.55; max-width: 260px; }
  .tryon2-ready-text strong { color: var(--bb-rose); }

  /* ── Generating overlay ── */
  .tryon2-gen-overlay { position: absolute; inset: 0; overflow: hidden; background: #12080e; display: grid; place-items: center; }
  .tryon2-gen-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(14px) brightness(0.25) saturate(0.4); display: block; }
  .tryon2-shimmer { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 20%, rgba(207,95,145,0.14) 50%, transparent 80%); background-size: 200% 100%; animation: shimmer 2.4s linear infinite; }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .tryon2-gen-badge { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #fff; text-align: center; padding: 40px; }
  .tryon2-gen-ring { width: 100px; height: 100px; border-radius: 50%; padding: 3px; background: conic-gradient(from 0deg, #e38d5a, #cf5f91, #8b6bb5, #3f8874, #e38d5a); animation: spin 3s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .tryon2-gen-inner { width: 100%; height: 100%; border-radius: 50%; background: rgba(18,8,14,0.88); display: grid; place-items: center; color: var(--bb-rose); }
  .tryon2-gen-badge strong { font-size: 1.1rem; font-weight: 800; color: #fff; }
  .tryon2-gen-badge span { font-size: 0.78rem; color: rgba(255,255,255,0.55); }
  .tryon2-gen-dots { display: flex; gap: 8px; margin-top: 4px; }
  .tryon2-gen-dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--bb-rose); animation: dotpulse 1.4s ease-in-out infinite; }
  .tryon2-gen-dots span:nth-child(2) { animation-delay: 0.2s; }
  .tryon2-gen-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dotpulse { 0%,80%,100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }

  /* ── Comparison slider ── */
  .tryon2-slider { position: relative; overflow: hidden; cursor: ew-resize; user-select: none; width: 100%; line-height: 0; touch-action: pan-y; }
  .tryon2-slider-img { width: 100%; display: block; max-height: 720px; object-fit: contain; background: linear-gradient(160deg, #fdf4f0, #f2e8f0); }
  .tryon2-slider-img--before { width: 100%; display: block; }
  .tryon2-slider-before { position: absolute; inset: 0; overflow: hidden; will-change: clip-path; }
  .tryon2-slider-before img { width: 100%; height: 100%; object-fit: contain; display: block; background: linear-gradient(160deg, #fdf4f0, #f2e8f0); }
  .tryon2-slider-line { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.98); transform: translateX(-50%); pointer-events: none; box-shadow: 0 0 16px rgba(0,0,0,0.3); will-change: left; }
  .tryon2-slider-handle {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 52px; height: 52px; border-radius: 50%;
    background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.22);
    display: grid; place-items: center; color: var(--bb-ink);
    border: 2px solid rgba(207,95,145,0.2);
  }
  .tryon2-label-pill { position: absolute; top: 16px; padding: 6px 14px; border-radius: 999px; background: rgba(0,0,0,0.5); color: #fff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; backdrop-filter: blur(12px); pointer-events: none; transition: opacity 0.2s; }
  .tryon2-label-pill--left { left: 16px; }
  .tryon2-label-pill--right { right: 16px; }

  /* ── Result ── */
  /* Default (no frames): single column */
  .tryon2-result-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  /* With frames: side-by-side so nothing is hidden below fold */
  .tryon2-result-wrap.has-frames {
    display: grid;
    grid-template-columns: 1fr 300px;
    grid-template-rows: 1fr;
    gap: 0;
    height: 100%;
    overflow: hidden;
  }

  .tryon2-result-left {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .tryon2-result-slider-wrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(160deg, #fdf4f0, #f2e8f0);
  }
  /* Make the slider image fill the available height rather than its natural size */
  .tryon2-result-slider-wrap .tryon2-slider { height: 100%; }
  .tryon2-result-slider-wrap .tryon2-slider-img { max-height: 100%; height: 100%; object-fit: contain; width: 100%; }
  .tryon2-result-slider-wrap .tryon2-slider-before img { height: 100%; object-fit: contain; }

  .tryon2-result-actions { display: flex; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.95); backdrop-filter: blur(14px); border-top: 1px solid var(--bb-line); flex-wrap: wrap; flex-shrink: 0; }
  .tryon2-action-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px; border: 1.5px solid var(--bb-line); background: #fff; color: var(--bb-ink); font-size: 0.79rem; font-weight: 800; cursor: pointer; transition: all 0.16s; white-space: nowrap; }
  .tryon2-action-btn:hover:not(:disabled) { border-color: var(--bb-rose); color: var(--bb-rose); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(207,95,145,0.14); }
  .tryon2-action-btn:disabled { opacity: 0.45; cursor: default; }
  .tryon2-action-btn--primary { background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, #a855f7); color: #fff; border-color: transparent; box-shadow: 0 4px 18px rgba(207,95,145,0.3); }
  .tryon2-action-btn--primary:hover:not(:disabled) { opacity: 0.9; color: #fff; transform: translateY(-1px); box-shadow: 0 8px 26px rgba(207,95,145,0.38); }
  .tryon2-footnote { margin: 0; font-size: 0.68rem; color: var(--bb-muted); text-align: center; padding: 7px 14px 10px; flex-shrink: 0; }

  /* ── Frames (right column when side-by-side) ── */
  .tryon2-frames-block {
    border-left: 1px solid var(--bb-line);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }
  /* When stacked (no has-frames grid), restore top border */
  .tryon2-result-wrap:not(.has-frames) .tryon2-frames-block {
    border-left: none;
    border-top: 1px solid var(--bb-line);
    height: auto;
  }
  .tryon2-video-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; background: #140c0e; color: rgba(255,255,255,0.65); font-size: 0.82rem; justify-content: center; flex: 1; }
  .tryon2-video-error { padding: 18px; background: #3b1c1c; color: #f87171; font-size: 0.82rem; text-align: center; }
  .tryon2-frame-player { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .tryon2-frame-img-wrap { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #140c0e; }
  .tryon2-frame-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; opacity: 0; transition: opacity 0.28s ease; }
  .tryon2-frame-img.is-active { opacity: 1; }
  .tryon2-frame-label { position: absolute; bottom: 10px; left: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(0,0,0,0.62); color: #fff; font-size: 0.67rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; backdrop-filter: blur(8px); pointer-events: none; }
  .tryon2-frame-controls { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.97); border-top: 1px solid var(--bb-line); gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
  .tryon2-frame-dots { display: flex; gap: 6px; align-items: center; }
  .tryon2-frame-dot { width: 8px; height: 8px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.15); cursor: pointer; padding: 0; transition: background 0.15s, transform 0.15s; }
  .tryon2-frame-dot.is-on { background: var(--bb-rose); transform: scale(1.45); }
  .tryon2-frame-btns { display: flex; gap: 7px; }

  @media (max-width: 860px) {
    .tryon2-result-wrap.has-frames { display: flex; flex-direction: column; height: auto; }
    .tryon2-frames-block { border-left: none; border-top: 1px solid var(--bb-line); height: auto; }
    .tryon2-frame-img-wrap { aspect-ratio: 3/4; flex: none; }
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .tryon2-slider-img { max-height: 520px; }
    .tryon2-progress-pills { display: none; }
    .tryon2-canvas { min-height: 480px; height: auto; }
    .tryon2-inputs { height: auto; overflow: visible; }
    .tryon2-gallery-grid { grid-template-columns: repeat(5, 1fr); }
  }
  @media (max-width: 540px) {
    .tryon2-result-actions { flex-direction: column; }
    .tryon2-gallery-grid { grid-template-columns: repeat(4, 1fr); }
    .tryon2-shell { padding: 10px; }
  }
`;export{Se as default};
