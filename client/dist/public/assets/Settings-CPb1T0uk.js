import{r as l,j as e}from"./vendor-motion-CWmlYJXN.js";import{az as A,a0 as I,U as v,n as P,S as B,aA as T,N as h,aB as D,P as E,a5 as F,aC as W,aD as f,E as U,v as L,aE as O,B as Y,aF as R}from"./vendor-lucide-DzC2HuM0.js";const u=[{id:"profile",label:"Profile",icon:A,desc:"Your account info"},{id:"api",label:"Integrations",icon:I,desc:"API keys & services"},{id:"team",label:"Team",icon:v,desc:"Members & roles"},{id:"billing",label:"Billing",icon:P,desc:"Plan & payments"}],J=[{name:"ElevenLabs",desc:"Voice AI — Luna assistant",masked:"sk_1870...e7f",status:"active",color:"#6366f1",icon:"🎙️"},{name:"OpenRouter",desc:"Image generation & vision",masked:"sk-or-v1...bd9c",status:"active",color:"#f59e0b",icon:"🤖"},{name:"Meshy AI",desc:"3D model generation",masked:"tsk_23...n1O",status:"active",color:"#10b981",icon:"🧊"},{name:"Azure OpenAI",desc:"Fallback image rendering",masked:"eyJ...xkYQ",status:"active",color:"#0ea5e9",icon:"☁️"}],M=["Unlimited AI concept renders","Virtual try-on (photo + motion)","Luna voice assistant","3D model exports","Up to 10 active clients","Gallery & CAD file storage"];function $(){const[o,y]=l.useState("profile"),[t,d]=l.useState("idle"),[c,j]=l.useState({}),[k,w]=l.useState(!0),[i,r]=l.useState({fullName:"",email:"",studio:"",phone:""}),[x,m]=l.useState(i);l.useEffect(()=>{fetch("/api/auth/profile",{credentials:"include"}).then(s=>s.json()).then(s=>{if(s.profile){const a={fullName:s.profile.fullName||"",email:s.profile.email||"",studio:s.profile.studio||"",phone:s.profile.phone||""};r(a),m(a)}}).catch(()=>{}).finally(()=>w(!1))},[]);const p=JSON.stringify(i)!==JSON.stringify(x),N=async()=>{d("saving");try{const s=await fetch("/api/auth/profile",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!s.ok)throw new Error("Save failed");const a=await s.json();if(a.profile){const n={fullName:a.profile.fullName||"",email:a.profile.email||"",studio:a.profile.studio||"",phone:a.profile.phone||""};r(n),m(n)}d("saved"),setTimeout(()=>d("idle"),2500)}catch{d("error"),setTimeout(()=>d("idle"),2500)}},S=()=>{r(x)},z=s=>j(a=>({...a,[s]:!a[s]})),b=u.find(s=>s.id===o),g=i.fullName?i.fullName.split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase():"AK";return e.jsxs("div",{style:{padding:"clamp(20px, 3vw, 36px) clamp(16px, 3vw, 40px)",maxWidth:1100,margin:"0 auto",display:"flex",flexDirection:"column",gap:28},children:[e.jsx("style",{children:H}),e.jsxs("header",{style:{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:"0.65rem",fontWeight:900,letterSpacing:"0.16em",textTransform:"uppercase",color:"var(--bb-rose)"},children:"Workspace"}),e.jsx("h1",{style:{margin:"4px 0 0",fontSize:"clamp(1.8rem, 3vw, 2.4rem)",fontWeight:900,color:"var(--bb-ink)",lineHeight:1.1},children:"Settings"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderRadius:999,background:"rgba(207,95,145,0.08)",border:"1px solid rgba(207,95,145,0.18)",fontSize:"0.78rem",fontWeight:700,color:"var(--bb-rose)"},children:[e.jsx(B,{size:13})," Studio Plan"]})]}),e.jsxs("div",{className:"st-layout",children:[e.jsxs("aside",{className:"st-sidebar",children:[e.jsx("nav",{style:{display:"flex",flexDirection:"column",gap:4},children:u.map(s=>{const a=s.icon,n=o===s.id;return e.jsxs("button",{onClick:()=>y(s.id),className:`st-tab ${n?"is-active":""}`,children:[e.jsx("span",{className:"st-tab-icon",children:e.jsx(a,{size:17})}),e.jsxs("span",{className:"st-tab-text",children:[e.jsx("strong",{children:s.label}),e.jsx("small",{children:s.desc})]}),n&&e.jsx(T,{size:14,className:"st-tab-arrow"})]},s.id)})}),e.jsx("div",{className:"st-info-card",children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("div",{className:"st-avatar",children:g}),e.jsxs("div",{children:[e.jsx("strong",{style:{fontSize:"0.88rem",color:"var(--bb-ink)",display:"block"},children:i.fullName||"Your Name"}),e.jsx("span",{style:{fontSize:"0.72rem",color:"var(--bb-muted)"},children:"Jeweller · Owner"})]})]})})]}),e.jsxs("main",{className:"st-content",children:[e.jsxs("div",{className:"st-content-header",children:[e.jsx(b.icon,{size:18,style:{color:"var(--bb-rose)"}}),e.jsxs("div",{children:[e.jsx("h2",{className:"st-content-title",children:b.label}),e.jsx("p",{className:"st-content-desc",children:b.desc})]})]}),e.jsxs("div",{style:{padding:24,display:"flex",flexDirection:"column",gap:24},children:[o==="profile"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"st-section",children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16},children:[e.jsx("div",{className:"st-avatar-lg",children:g}),e.jsxs("div",{children:[e.jsx("p",{style:{margin:"0 0 8px",fontSize:"0.85rem",color:"var(--bb-muted)",lineHeight:1.5},children:"Profile photo is shown to clients in their portal."}),e.jsx("button",{className:"st-btn-outline",children:"Change photo"})]})]})}),e.jsxs("div",{className:"st-section",children:[e.jsx("h3",{className:"st-section-title",children:"Personal Information"}),k?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"12px 0",color:"var(--bb-muted)",fontSize:"0.85rem"},children:[e.jsx(h,{size:16,className:"st-spin"})," Loading your profile…"]}):e.jsxs("div",{className:"st-grid-2",children:[e.jsxs("label",{className:"st-field",children:[e.jsx("span",{className:"st-label",children:"Full Name"}),e.jsx("input",{value:i.fullName,onChange:s=>r(a=>({...a,fullName:s.target.value})),type:"text",className:"st-input",placeholder:"Your full name"})]}),e.jsxs("label",{className:"st-field",children:[e.jsx("span",{className:"st-label",children:"Email Address"}),e.jsx("input",{value:i.email,onChange:s=>r(a=>({...a,email:s.target.value})),type:"email",className:"st-input",placeholder:"your@email.com"})]}),e.jsxs("label",{className:"st-field",children:[e.jsx("span",{className:"st-label",children:"Studio / Company"}),e.jsxs("div",{className:"st-input-icon-wrap",children:[e.jsx(D,{size:14,className:"st-input-icon"}),e.jsx("input",{value:i.studio,onChange:s=>r(a=>({...a,studio:s.target.value})),type:"text",className:"st-input st-input-padded",placeholder:"Blink & Bling Jewelers"})]})]}),e.jsxs("label",{className:"st-field",children:[e.jsx("span",{className:"st-label",children:"Phone"}),e.jsxs("div",{className:"st-input-icon-wrap",children:[e.jsx(E,{size:14,className:"st-input-icon"}),e.jsx("input",{value:i.phone,onChange:s=>r(a=>({...a,phone:s.target.value})),type:"tel",className:"st-input st-input-padded",placeholder:"+44 7700 000000"})]})]})]})]}),e.jsxs("div",{className:"st-section",children:[e.jsx("h3",{className:"st-section-title",children:"Notifications"}),[{label:"New client message",desc:"When a customer sends you a message"},{label:"AI render complete",desc:"When image generation finishes"}].map((s,a)=>e.jsxs("div",{className:"st-toggle-row",children:[e.jsxs("div",{children:[e.jsx("strong",{className:"st-toggle-label",children:s.label}),e.jsx("span",{className:"st-toggle-desc",children:s.desc})]}),e.jsxs("label",{className:"st-switch",children:[e.jsx("input",{type:"checkbox",defaultChecked:!0}),e.jsx("span",{className:"st-switch-track"})]})]},a))]}),e.jsxs("div",{className:`st-save-bar ${p?"is-visible":""}`,children:[e.jsx("span",{style:{fontSize:"0.83rem",color:"var(--bb-muted)"},children:p?"You have unsaved changes":""}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{className:"st-btn-outline",onClick:S,disabled:t==="saving",children:"Discard"}),e.jsx("button",{className:`st-btn-primary ${t==="saved"?"is-saved":""} ${t==="error"?"is-error":""}`,onClick:N,disabled:t==="saving"||!p,children:t==="saving"?e.jsxs(e.Fragment,{children:[e.jsx(h,{size:14,className:"st-spin"})," Saving…"]}):t==="saved"?e.jsx(e.Fragment,{children:"✓ Saved!"}):t==="error"?e.jsx(e.Fragment,{children:"! Failed — retry"}):e.jsxs(e.Fragment,{children:[e.jsx(F,{size:14})," Save changes"]})})]})]})]}),o==="api"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"st-alert",children:[e.jsx(W,{size:15}),"API keys are stored securely in your environment. They are never exposed to clients."]}),e.jsxs("div",{className:"st-section",children:[e.jsx("h3",{className:"st-section-title",children:"Connected Services"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:J.map(s=>e.jsxs("div",{className:"st-api-row",children:[e.jsx("span",{className:"st-api-icon",children:s.icon}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("strong",{style:{fontSize:"0.9rem",color:"var(--bb-ink)"},children:s.name}),e.jsxs("span",{className:"st-badge-green",children:[e.jsx(f,{size:11})," Active"]})]}),e.jsx("span",{style:{fontSize:"0.76rem",color:"var(--bb-muted)"},children:s.desc})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("code",{className:"st-key-code",children:c[s.name]?s.masked:"••••••••••••"}),e.jsx("button",{className:"st-icon-btn",onClick:()=>z(s.name),title:c[s.name]?"Hide":"Show",children:c[s.name]?e.jsx(U,{size:14}):e.jsx(L,{size:14})})]})]},s.name))})]}),e.jsxs("div",{className:"st-section",children:[e.jsx("h3",{className:"st-section-title",children:"Other Configuration"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[{icon:O,label:"Public Base URL",val:"wet-quail-8.loca.lt",desc:"Used for AI video frame serving"},{icon:Y,label:"ElevenLabs Agent ID",val:"agent_9001...",desc:"Luna voice assistant agent"},{icon:R,label:"Image Model",val:"gemini-3.1-flash-image-preview",desc:"Default AI image generation model"}].map(({icon:s,label:a,val:n,desc:C})=>e.jsxs("div",{className:"st-config-row",children:[e.jsx(s,{size:15,style:{color:"var(--bb-muted)",flexShrink:0}}),e.jsxs("div",{style:{flex:1},children:[e.jsx("strong",{style:{fontSize:"0.84rem",color:"var(--bb-ink)",display:"block"},children:a}),e.jsx("span",{style:{fontSize:"0.74rem",color:"var(--bb-muted)"},children:C})]}),e.jsx("code",{style:{fontSize:"0.75rem",color:"var(--bb-muted)",background:"rgba(0,0,0,0.04)",padding:"3px 8px",borderRadius:6},children:n})]},a))})]})]}),o==="team"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"st-section",children:[e.jsx("h3",{className:"st-section-title",children:"Members"}),[{name:i.fullName||"Akash",email:i.email||"akash@blinkbling.com",role:"Owner",active:!0}].map(s=>e.jsxs("div",{className:"st-member-row",children:[e.jsx("div",{className:"st-avatar-sm",style:{background:"linear-gradient(135deg, var(--bb-coral), var(--bb-rose))"},children:(s.name[0]||"A").toUpperCase()}),e.jsxs("div",{style:{flex:1},children:[e.jsx("strong",{style:{fontSize:"0.88rem",color:"var(--bb-ink)",display:"block"},children:s.name}),e.jsx("span",{style:{fontSize:"0.76rem",color:"var(--bb-muted)"},children:s.email})]}),e.jsx("span",{className:"st-badge-green",children:s.role})]},s.email))]}),e.jsxs("div",{className:"st-invite-card",children:[e.jsx(v,{size:22,style:{color:"var(--bb-rose)"}}),e.jsxs("div",{children:[e.jsx("strong",{style:{display:"block",marginBottom:4},children:"Invite a team member"}),e.jsx("span",{style:{fontSize:"0.82rem",color:"var(--bb-muted)"},children:"Add designers, assistants or account managers."})]}),e.jsx("button",{className:"st-btn-primary",style:{flexShrink:0},children:"Send invite"})]})]}),o==="billing"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"st-plan-card",children:[e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:"0.65rem",fontWeight:900,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--bb-rose)"},children:"Current Plan"}),e.jsx("h3",{style:{margin:"4px 0 6px",fontSize:"1.4rem",fontWeight:900,color:"var(--bb-ink)"},children:"Studio Plan"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--bb-muted)"},children:"Billed monthly · Next renewal 27 Jun 2026"})]}),e.jsxs("div",{style:{textAlign:"right"},children:[e.jsx("span",{style:{fontSize:"2rem",fontWeight:900,color:"var(--bb-rose)",lineHeight:1},children:"£49"}),e.jsx("span",{style:{fontSize:"0.85rem",color:"var(--bb-muted)"},children:"/mo"})]})]}),e.jsx("div",{style:{height:1,background:"rgba(207,95,145,0.15)",margin:"18px 0"}}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:8},children:M.map(s=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,fontSize:"0.82rem",color:"var(--bb-ink)"},children:[e.jsx("span",{style:{width:18,height:18,borderRadius:"50%",background:"rgba(207,95,145,0.12)",display:"grid",placeItems:"center",flexShrink:0},children:e.jsx(f,{size:11,style:{color:"var(--bb-rose)"}})}),s]},s))})]}),e.jsxs("div",{className:"st-section",children:[e.jsx("h3",{className:"st-section-title",children:"Payment Method"}),e.jsxs("div",{className:"st-payment-row",children:[e.jsx("span",{style:{fontSize:"1.4rem"},children:"💳"}),e.jsxs("div",{style:{flex:1},children:[e.jsx("strong",{style:{fontSize:"0.88rem",color:"var(--bb-ink)",display:"block"},children:"Visa ending in 4242"}),e.jsx("span",{style:{fontSize:"0.76rem",color:"var(--bb-muted)"},children:"Expires 08/2027"})]}),e.jsx("button",{className:"st-btn-outline",children:"Update"})]})]}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{className:"st-btn-primary",children:"Upgrade plan"}),e.jsx("button",{className:"st-btn-outline",children:"Manage subscription"})]})]})]})]})]})]})}const H=`
  .st-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .st-layout { grid-template-columns: 1fr; }
  }

  /* ── Sidebar ── */
  .st-sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: 24px;
  }

  .st-tab {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 13px;
    border-radius: 13px;
    border: 1.5px solid transparent;
    background: transparent;
    color: var(--bb-muted);
    cursor: pointer;
    text-align: left;
    transition: all 0.17s;
  }
  .st-tab:hover { background: rgba(255,255,255,0.7); color: var(--bb-ink); }
  .st-tab.is-active {
    background: #fff;
    border-color: rgba(207,95,145,0.28);
    color: var(--bb-ink);
    box-shadow: 0 2px 14px rgba(51,39,35,0.08);
  }
  .st-tab-icon {
    width: 32px; height: 32px; border-radius: 9px;
    background: rgba(207,95,145,0.08);
    display: grid; place-items: center; flex-shrink: 0;
    color: var(--bb-rose);
    transition: background 0.17s;
  }
  .st-tab:not(.is-active) .st-tab-icon { background: rgba(0,0,0,0.04); color: var(--bb-muted); }
  .st-tab-text { flex: 1; line-height: 1.2; }
  .st-tab-text strong { display: block; font-size: 0.88rem; font-weight: 800; }
  .st-tab-text small  { display: block; font-size: 0.7rem; font-weight: 500; color: var(--bb-muted); margin-top: 1px; }
  .st-tab.is-active .st-tab-text small { color: rgba(207,95,145,0.7); }
  .st-tab-arrow { color: var(--bb-rose); flex-shrink: 0; }

  .st-info-card {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.6);
    border: 1px solid var(--bb-line);
  }
  .st-avatar {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose));
    color: #fff; font-size: 0.78rem; font-weight: 900;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .st-avatar-lg {
    width: 64px; height: 64px; border-radius: 18px;
    background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose));
    color: #fff; font-size: 1.1rem; font-weight: 900;
    display: grid; place-items: center; flex-shrink: 0;
    box-shadow: 0 6px 20px rgba(207,95,145,0.28);
  }
  .st-avatar-sm {
    width: 38px; height: 38px; border-radius: 10px;
    color: #fff; font-size: 0.78rem; font-weight: 900;
    display: grid; place-items: center; flex-shrink: 0;
  }

  /* ── Content panel ── */
  .st-content {
    background: #fff;
    border-radius: 20px;
    border: 1px solid var(--bb-line);
    box-shadow: 0 2px 20px rgba(51,39,35,0.05);
    overflow: visible;
  }
  .st-content-header {
    display: flex; align-items: center; gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--bb-line);
    border-radius: 20px 20px 0 0;
    background: linear-gradient(135deg, rgba(255,247,244,0.6), rgba(255,251,248,0.8));
  }
  .st-content-title { margin: 0; font-size: 1.05rem; font-weight: 900; color: var(--bb-ink); }
  .st-content-desc  { margin: 2px 0 0; font-size: 0.76rem; color: var(--bb-muted); }

  /* ── Sections ── */
  .st-section {
    background: #fafafa;
    border: 1px solid var(--bb-line);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .st-section-title {
    margin: 0;
    font-size: 0.72rem; font-weight: 900;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--bb-muted);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--bb-line);
  }

  /* ── Form ── */
  .st-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 600px) { .st-grid-2 { grid-template-columns: 1fr; } }
  .st-field { display: grid; gap: 6px; }
  .st-label { font-size: 0.74rem; font-weight: 800; color: var(--bb-muted); letter-spacing: 0.04em; }
  .st-input {
    border: 1.5px solid var(--bb-line);
    border-radius: 10px;
    padding: 10px 13px;
    color: var(--bb-ink);
    outline: none;
    background: #fff;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.16s, box-shadow 0.16s;
    font-family: inherit;
  }
  .st-input:focus { border-color: rgba(207,95,145,0.5); box-shadow: 0 0 0 3px rgba(207,95,145,0.1); }
  .st-input-icon-wrap { position: relative; }
  .st-input-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: var(--bb-muted); pointer-events: none;
  }
  .st-input-padded { padding-left: 34px; }

  /* ── Save bar ── */
  .st-save-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
    padding: 14px 18px;
    border-radius: 14px;
    background: rgba(255,247,244,0.7);
    border: 1.5px solid rgba(207,95,145,0.18);
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
    transition: all 0.22s;
  }
  .st-save-bar.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* ── Toggles ── */
  .st-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 10px 0;
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .st-toggle-row:last-child { border-bottom: 0; padding-bottom: 0; }
  .st-toggle-label { display: block; font-size: 0.86rem; font-weight: 700; color: var(--bb-ink); }
  .st-toggle-desc   { font-size: 0.74rem; color: var(--bb-muted); }
  .st-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; cursor: pointer; }
  .st-switch input { opacity: 0; width: 0; height: 0; }
  .st-switch-track {
    position: absolute; inset: 0; border-radius: 999px;
    background: #e2e8f0; transition: background 0.18s;
  }
  .st-switch-track::after {
    content: ''; position: absolute;
    width: 16px; height: 16px; left: 3px; top: 3px;
    border-radius: 50%; background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    transition: transform 0.18s;
  }
  .st-switch input:checked + .st-switch-track { background: var(--bb-rose); }
  .st-switch input:checked + .st-switch-track::after { transform: translateX(18px); }

  /* ── Buttons ── */
  .st-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 11px; border: none;
    background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet));
    color: #fff; font-size: 0.86rem; font-weight: 800; cursor: pointer;
    transition: all 0.17s; box-shadow: 0 3px 12px rgba(207,95,145,0.25);
    font-family: inherit;
  }
  .st-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 5px 18px rgba(207,95,145,0.32); }
  .st-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .st-btn-primary.is-saved { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 3px 12px rgba(16,185,129,0.25); }
  .st-btn-primary.is-error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 3px 12px rgba(239,68,68,0.25); }
  .st-btn-outline {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 18px; border-radius: 11px;
    border: 1.5px solid var(--bb-line); background: #fff;
    color: var(--bb-ink); font-size: 0.86rem; font-weight: 700; cursor: pointer;
    transition: all 0.17s; font-family: inherit;
  }
  .st-btn-outline:hover:not(:disabled) { border-color: var(--bb-rose); color: var(--bb-rose); }
  .st-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }
  .st-icon-btn {
    width: 28px; height: 28px; border-radius: 7px;
    border: 1px solid var(--bb-line); background: #fff;
    color: var(--bb-muted); display: grid; place-items: center;
    cursor: pointer; transition: all 0.15s;
  }
  .st-icon-btn:hover { border-color: var(--bb-rose); color: var(--bb-rose); }

  /* ── API rows ── */
  .st-api-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px;
    border: 1px solid var(--bb-line); background: #fff;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .st-api-row:hover { border-color: rgba(207,95,145,0.25); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .st-api-icon { font-size: 1.4rem; flex-shrink: 0; }
  .st-key-code {
    font-size: 0.74rem; color: var(--bb-muted);
    background: rgba(0,0,0,0.04); padding: 4px 8px;
    border-radius: 6px; letter-spacing: 0.04em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  .st-config-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04); background: #fff;
  }

  /* ── Alert ── */
  .st-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 11px;
    background: rgba(16,185,129,0.07);
    border: 1px solid rgba(16,185,129,0.2);
    color: #065f46; font-size: 0.82rem; font-weight: 600;
  }

  /* ── Badges ── */
  .st-badge-green {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 999px;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.2);
    color: #065f46; font-size: 0.68rem; font-weight: 800;
    white-space: nowrap;
  }

  /* ── Team ── */
  .st-member-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .st-member-row:last-child { border-bottom: 0; }
  .st-invite-card {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 20px; border-radius: 14px;
    border: 1.5px dashed rgba(207,95,145,0.28);
    background: rgba(255,247,244,0.5);
    flex-wrap: wrap;
  }

  /* ── Billing ── */
  .st-plan-card {
    padding: 22px 24px; border-radius: 16px;
    background: linear-gradient(135deg, rgba(255,247,244,0.9), rgba(255,251,248,1));
    border: 1.5px solid rgba(207,95,145,0.22);
    box-shadow: 0 4px 20px rgba(207,95,145,0.08);
  }
  .st-payment-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px;
    border: 1px solid var(--bb-line); background: #fff;
  }

  /* ── Spin ── */
  @keyframes st-spin { to { transform: rotate(360deg); } }
  .st-spin { animation: st-spin 0.8s linear infinite; }
`;export{$ as default};
