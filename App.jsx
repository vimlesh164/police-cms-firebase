import { useState, useEffect, useCallback, useRef } from "react";
import { db, addComplaint, updateComplaint, listenComplaints, adminLogin, adminLogout, onAuthChange } from "./firebase.js";

/* ═══════════════════════════════ CONFIG ═══════════════════════════════ */
const THANA       = "थाना चकरनगर";
const DIST        = "एटावा, उ.प्र.";
const THANA_PHONE = "05688-222001";
const ADMIN_EMAIL = "admin@chakarnagar.police.up";  // Firebase Auth email

const OFFICERS = [
  {id:"O1",name:"SI Ramesh Kumar",   rank:"Sub Inspector",  beat:"Beat-1",phone:"9801234567",active:true,  av:"👮"},
  {id:"O2",name:"HC Suresh Yadav",   rank:"Head Constable", beat:"Beat-2",phone:"9812345678",active:true,  av:"👮"},
  {id:"O3",name:"Const. Anil Singh", rank:"Constable",      beat:"Beat-3",phone:"9823456789",active:true,  av:"👮"},
  {id:"O4",name:"SI Priya Verma",    rank:"Sub Inspector",  beat:"Beat-4",phone:"9834567890",active:false, av:"👮‍♀️"},
  {id:"O5",name:"HC Deepak Tiwari",  rank:"Head Constable", beat:"Beat-5",phone:"9845678901",active:true,  av:"👮"},
  {id:"O6",name:"ASI Mohan Lal",     rank:"Asst. SI",       beat:"Beat-6",phone:"9856789012",active:true,  av:"👮"},
];

const CTYPES = [
  {g:"🏠 सम्पत्ति",items:["चोरी / Theft","वाहन चोरी / Vehicle Theft","डकैती / Robbery","सेंधमारी / Burglary"]},
  {g:"👤 व्यक्ति", items:["मारपीट / Assault","उत्पीड़न / Harassment","घरेलू हिंसा / Domestic Violence","अपहरण / Kidnapping"]},
  {g:"💻 साइबर",  items:["साइबर ठगी / Cybercrime","ऑनलाइन फ्रॉड / Online Fraud","सोशल मीडिया क्राइम"]},
  {g:"🌾 अन्य",   items:["ज़मीन विवाद / Land Dispute","नशा / Drug Related","शोर / Noise","अन्य / Other"]},
];

const STATUS = {
  pending:      {label:"लंबित",     en:"Pending",       color:"#f59e0b",bg:"#fef3c7",dark:"#92400e",icon:"⏳",step:0},
  assigned:     {label:"असाइन",     en:"Assigned",      color:"#3b82f6",bg:"#dbeafe",dark:"#1e40af",icon:"👮",step:1},
  investigating:{label:"जांच जारी", en:"Investigating", color:"#8b5cf6",bg:"#ede9fe",dark:"#5b21b6",icon:"🔍",step:2},
  resolved:     {label:"निस्तारित", en:"Resolved",      color:"#10b981",bg:"#d1fae5",dark:"#065f46",icon:"✅",step:3},
  closed:       {label:"बंद",       en:"Closed",        color:"#6b7280",bg:"#f3f4f6",dark:"#374151",icon:"🔒",step:4},
  rejected:     {label:"अस्वीकृत", en:"Rejected",      color:"#ef4444",bg:"#fee2e2",dark:"#991b1b",icon:"❌",step:-1},
};

const PRIORITY = {
  urgent:{label:"अति तत्काल",color:"#ef4444",bg:"#fee2e2",icon:"🚨",sla:6},
  high:  {label:"तत्काल",   color:"#f97316",bg:"#fff7ed",icon:"🔴",sla:12},
  medium:{label:"सामान्य",  color:"#eab308",bg:"#fefce8",icon:"🟡",sla:24},
  low:   {label:"कम",       color:"#22c55e",bg:"#f0fdf4",icon:"🟢",sla:48},
};

const T = {
  navy:"#0f2540",blue:"#1d4ed8",violet:"#7c3aed",
  surface:"#ffffff",bg:"#f0f4f8",border:"#e2e8f0",
  text1:"#0f172a",text2:"#475569",text3:"#94a3b8",
};

const uid  = () => "C"+Date.now().toString().slice(-6)+Math.floor(Math.random()*9+1);
const fd   = d  => d ? new Date(d).toLocaleString("hi-IN",{dateStyle:"medium",timeStyle:"short"}) : "";
const fds  = d  => d ? new Date(d).toLocaleDateString("hi-IN",{day:"2-digit",month:"short"}) : "";
const hAgo = d  => Math.max(0,Math.round((Date.now()-d)/3600000));

const getSLA = c => {
  if(!c||["resolved","closed","rejected"].includes(c.status)) return null;
  const h=hAgo(c.createdAt), lim=PRIORITY[c.priority]?.sla||24;
  return {h,lim,pct:Math.min(100,Math.round(h/lim*100)),over:h>lim};
};

/* ═══════════════════════════════ UI ATOMS ═══════════════════════════════ */
const INP = {width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid "+T.border,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",color:T.text1,background:T.surface};

function Toast({msg,type}){
  const c={success:"#059669",error:"#dc2626",info:"#2563eb",warning:"#d97706"};
  return <div style={{position:"fixed",top:18,left:"50%",transform:"translateX(-50%)",background:c[type]||c.success,color:"#fff",padding:"11px 20px",borderRadius:12,fontWeight:700,fontSize:13,zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,.25)",maxWidth:"88vw",whiteSpace:"nowrap"}}>{msg}</div>;
}

function TopBar({title,sub,onBack,gradient,right}){
  return <div style={{background:gradient||"linear-gradient(135deg,"+T.navy+","+T.blue+")",padding:"13px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0,boxShadow:"0 2px 12px rgba(0,0,0,.15)"}}>
    <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:20,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>‹</button>
    <div style={{flex:1,minWidth:0}}>
      <div style={{color:"#fff",fontWeight:800,fontSize:15}}>{title}</div>
      <div style={{color:"rgba(255,255,255,.65)",fontSize:10,marginTop:1}}>{sub}</div>
    </div>
    {right}
  </div>;
}

function TabBar({tabs,active,onChange,color}){
  return <div style={{display:"flex",background:T.surface,borderBottom:"2px solid "+T.border,flexShrink:0,overflowX:"auto",scrollbarWidth:"none"}}>
    {tabs.map(([k,l])=><button key={k} onClick={()=>onChange(k)} style={{flex:1,minWidth:64,padding:"11px 4px",border:"none",background:"none",cursor:"pointer",fontWeight:700,fontSize:11,color:active===k?color:T.text3,borderBottom:"3px solid "+(active===k?color:"transparent"),whiteSpace:"nowrap"}}>{l}</button>)}
  </div>;
}

function Card({children,style}){ return <div style={{background:T.surface,borderRadius:16,border:"1px solid "+T.border,boxShadow:"0 1px 4px rgba(0,0,0,.06)",padding:16,...style}}>{children}</div>; }
function Sec({t}){ return <div style={{fontWeight:800,fontSize:11,color:T.text3,letterSpacing:.8,textTransform:"uppercase",marginBottom:12,paddingBottom:8,borderBottom:"1px solid "+T.border}}>{t}</div>; }
function IRow({label,val,phone}){
  if(!val)return null;
  return <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8,gap:8}}>
    <span style={{color:T.text3,fontWeight:600,flexShrink:0}}>{label}</span>
    {phone?<a href={"tel:"+val} style={{color:T.blue,fontWeight:700}}>{val}</a>:<span style={{color:T.text1,fontWeight:600,textAlign:"right"}}>{val}</span>}
  </div>;
}
function Btn({ch,color,onClick,full,sm,ghost,disabled}){
  return <button disabled={disabled} onClick={onClick} style={{border:ghost?"2px solid "+color:"none",borderRadius:10,padding:sm?"8px 14px":"12px 18px",color:ghost?color:"#fff",fontWeight:700,fontSize:sm?11:13,cursor:disabled?"not-allowed":"pointer",background:ghost?"transparent":color,width:full?"100%":"auto",fontFamily:"inherit",opacity:disabled?.5:1}}>
    {ch}
  </button>;
}
function Chip({label,active,onClick,color}){
  return <button onClick={onClick} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:"1.5px solid "+(active?color:T.border),background:active?color+"15":T.surface,color:active?color:T.text3,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>;
}

function SLABar({c}){
  const s=getSLA(c); if(!s)return null;
  const bc=s.over?"#ef4444":s.pct>75?"#f59e0b":"#10b981";
  return <div style={{marginTop:8}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
      <span style={{color:s.over?"#ef4444":T.text3}}>⏱ SLA {s.h}h/{s.lim}h</span>
      <span style={{color:s.over?"#ef4444":bc,fontWeight:700}}>{s.over?"⚠️ OVERDUE":s.pct+"%"}</span>
    </div>
    <div style={{background:T.bg,borderRadius:4,height:5,overflow:"hidden"}}>
      <div style={{width:s.pct+"%",height:"100%",background:bc,borderRadius:4}}/>
    </div>
  </div>;
}

function StatusPill({status}){
  const s=STATUS[status]; if(!s)return null;
  return <span style={{fontSize:10,background:s.bg,color:s.color,borderRadius:20,padding:"3px 10px",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4,flexShrink:0}}>{s.icon} {s.label}</span>;
}

function PriPill({priority}){
  const p=PRIORITY[priority]; if(!p)return null;
  return <span style={{fontSize:10,background:p.bg,color:p.color,borderRadius:20,padding:"3px 8px",fontWeight:700}}>{p.icon} {p.label}</span>;
}

/* Loading spinner */
function Loader({msg}){
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,gap:16}}>
    <div style={{width:40,height:40,border:"4px solid "+T.border,borderTop:"4px solid "+T.blue,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{color:T.text3,fontSize:13}}>{msg||"Loading..."}</div>
  </div>;
}

/* ═══════════════════════════════ COMPLAINT CARD ═══════════════════════════════ */
function CmpCard({c,onClick,showSLA}){
  const p=PRIORITY[c.priority];
  const unread=(c.messages||[]).filter(m=>m.from==="admin"&&!m.read).length;
  return <div onClick={onClick} style={{background:T.surface,borderRadius:14,border:"1px solid "+T.border,boxShadow:"0 1px 4px rgba(0,0,0,.06)",padding:"14px 16px",marginBottom:10,cursor:"pointer",borderLeft:"4px solid "+(p?.color||T.border),position:"relative"}}>
    {unread>0&&<div style={{position:"absolute",top:10,right:10,background:"#ef4444",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <span style={{fontWeight:900,color:T.blue,fontSize:13}}>{c.id}</span>
        <PriPill priority={c.priority}/>
      </div>
      <StatusPill status={c.status}/>
    </div>
    <div style={{fontWeight:700,fontSize:13,color:T.text1,marginBottom:4}}>{c.type}</div>
    <div style={{fontSize:11,color:T.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:8}}>{c.description}</div>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.text3}}>
      <span>👤 {c.name} · 📞 {c.mobile}</span>
      <span>📅 {fds(c.createdAt)}</span>
    </div>
    {showSLA&&<SLABar c={c}/>}
  </div>;
}

/* ═══════════════════════════════ STATUS STEPPER ═══════════════════════════════ */
function Stepper({status}){
  const steps=["pending","assigned","investigating","resolved"];
  const cur=STATUS[status]?.step??0;
  return <div style={{display:"flex",alignItems:"center",margin:"14px 0"}}>
    {steps.map((s,i)=>{
      const st=STATUS[s],done=cur>i,act=cur===i;
      return <div key={s} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"auto"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:done||act?st.color:T.bg,border:"2px solid "+(done||act?st.color:T.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{done?"✓":st.icon}</div>
          <div style={{fontSize:9,color:act?st.color:T.text3,fontWeight:act?700:400,whiteSpace:"nowrap"}}>{st.label}</div>
        </div>
        {i<steps.length-1&&<div style={{flex:1,height:2,background:done?T.blue:T.border,margin:"0 4px",marginBottom:14}}/>}
      </div>;
    })}
  </div>;
}

/* ═══════════════════════════════ CHAT ═══════════════════════════════ */
function Chat({c,onSend,isAdmin}){
  const[txt,setTxt]=useState("");
  const endRef=useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[c.messages]);
  const send=()=>{
    if(!txt.trim())return;
    onSend({from:isAdmin?"admin":"user",text:txt.trim(),ts:Date.now(),read:false});
    setTxt("");
  };
  const msgs=c.messages||[];
  return <div style={{display:"flex",flexDirection:"column",height:300}}>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,padding:"4px 0"}}>
      {msgs.length===0&&<div style={{textAlign:"center",color:T.text3,fontSize:12,padding:24}}><div style={{fontSize:32,marginBottom:8}}>💬</div>कोई संदेश नहीं</div>}
      {msgs.map((m,i)=>{
        const mine=isAdmin?m.from==="admin":m.from==="user";
        return <div key={i} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"76%",padding:"9px 13px",borderRadius:mine?"14px 14px 3px 14px":"14px 14px 14px 3px",background:mine?T.blue:T.bg,color:mine?"#fff":T.text1,fontSize:12}}>
            <div style={{lineHeight:1.5}}>{m.text}</div>
            <div style={{fontSize:9,opacity:.65,marginTop:4,textAlign:"right"}}>{fd(m.ts)}</div>
          </div>
        </div>;
      })}
      <div ref={endRef}/>
    </div>
    <div style={{display:"flex",gap:8,borderTop:"1px solid "+T.border,paddingTop:10,marginTop:8}}>
      <input style={{...INP,flex:1}} placeholder="संदेश लिखें..." value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
      <Btn ch="➤" color={T.blue} onClick={send}/>
    </div>
  </div>;
}

/* ═══════════════════════════════ FIR DRAFT ═══════════════════════════════ */
function FIRDraft({c}){
  const off=OFFICERS.find(o=>o.id===c.assignedTo);
  const txt=[
    "प्राथमिकी / FIRST INFORMATION REPORT",
    THANA+" — "+DIST,
    "FIR No: "+c.id+"    दिनांक: "+fd(c.createdAt),
    "─".repeat(42),
    "शिकायतकर्ता: "+c.name,
    "मोबाइल:      "+c.mobile,
    "पता:         "+c.address,
    "─".repeat(42),
    "अपराध प्रकार: "+c.type,
    "प्राथमिकता:   "+(PRIORITY[c.priority]?.label||""),
    "─".repeat(42),
    "घटना का विवरण:",
    c.description,
    "─".repeat(42),
    c.witnesses?"गवाह: "+c.witnesses:"",
    c.location?.address?"घटनास्थल: "+c.location.address:"",
    "─".repeat(42),
    "जाँच अधिकारी: "+(off?off.name+" ("+off.rank+")":"असाइन नहीं"),
    "स्थिति: "+(STATUS[c.status]?.label||""),
    c.remarks?"रिमार्क: "+c.remarks:"",
    "─".repeat(42),
    "",
    "थानाध्यक्ष हस्ताक्षर: _______________",
    "मुहर / Seal",
  ].filter(Boolean).join("\n");

  return <div>
    <div style={{background:"#f8fafc",borderRadius:10,padding:14,fontSize:11,lineHeight:1.9,fontFamily:"monospace",whiteSpace:"pre-wrap",color:T.text1,marginBottom:14,maxHeight:360,overflowY:"auto",border:"1px solid "+T.border}}>{txt}</div>
    <div style={{display:"flex",gap:8}}>
      <Btn ch="🖨️ Print" color={T.blue} onClick={()=>window.print()} full/>
      <Btn ch="📋 Copy"  color="#059669" onClick={()=>navigator.clipboard?.writeText(txt)} full/>
    </div>
  </div>;
}

/* ═══════════════════════════════ DETAIL ═══════════════════════════════ */
function Detail({c,onUpdate,adminView,userView,showToast,saving}){
  const[assignTo,setAssign]=useState(c.assignedTo||"");
  const[note,setNote]=useState("");
  const[newSt,setNewSt]=useState(c.status);
  const[remarks,setRemarks]=useState(c.remarks||"");
  const[rating,setRating]=useState(0);
  const[feedback,setFeedback]=useState("");
  const[showFB,setShowFB]=useState(false);
  const[dtab,setDtab]=useState("info");
  const off=OFFICERS.find(o=>o.id===c.assignedTo);
  const s=STATUS[c.status];
  const p=PRIORITY[c.priority];
  const slaSt=getSLA(c);

  const adminTabs=[["info","📋 Info"],["loc","📍 Map"],["assign","👮 Assign"],["update","🔄 Update"],["chat","💬 Chat"],["fir","📄 FIR"],["tl","📋 Log"]];
  const userTabs=[["info","📋 विवरण"],["loc","📍 Location"],["chat","💬 संदेश"],["tl","📋 Timeline"]];

  const doAssign=()=>{
    if(!assignTo){showToast("अधिकारी चुनें","error");return;}
    const of2=OFFICERS.find(o=>o.id===assignTo);
    const tl=[...(c.timeline||[]),{status:"assigned",note:(of2?.name||"")+" को असाइन किया।",by:"Admin",ts:Date.now()}];
    onUpdate({assignedTo:assignTo,status:"assigned",timeline:tl});
  };
  const doUpdate=()=>{
    if(!note.trim()){showToast("नोट लिखें","error");return;}
    const tl=[...(c.timeline||[]),{status:newSt,note:note.trim(),by:"Admin",ts:Date.now()}];
    onUpdate({status:newSt,timeline:tl,remarks});
    setNote("");
  };

  return <div style={{display:"flex",flexDirection:"column",gap:0}}>
    {/* Hero */}
    <div style={{background:"linear-gradient(135deg,"+s.dark+","+s.color+")",borderRadius:16,padding:"18px",marginBottom:16,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:-10,top:-10,fontSize:80,opacity:.12}}>{s.icon}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontWeight:900,fontSize:24,color:"#fff",letterSpacing:1}}>{c.id}</div>
          <div style={{color:"rgba(255,255,255,.75)",fontSize:11,marginTop:2}}>दर्ज: {fd(c.createdAt)}</div>
          <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
            <span style={{background:"rgba(255,255,255,.2)",color:"#fff",fontSize:11,borderRadius:20,padding:"3px 10px",fontWeight:700}}>{s.icon} {s.label}</span>
            <span style={{background:"rgba(255,255,255,.2)",color:"#fff",fontSize:11,borderRadius:20,padding:"3px 10px",fontWeight:700}}>{p?.icon} {p?.label}</span>
          </div>
          {c.rating&&<div style={{marginTop:6,fontSize:13}}>{"⭐".repeat(c.rating)}</div>}
        </div>
        <div style={{fontSize:44,opacity:.8}}>{s.icon}</div>
      </div>
      {slaSt&&<div style={{marginTop:10,background:"rgba(0,0,0,.2)",borderRadius:8,padding:"6px 10px"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#fff",marginBottom:4}}>
          <span>⏱ SLA: {slaSt.h}h / {slaSt.lim}h</span>
          <span style={{fontWeight:700}}>{slaSt.over?"⚠️ OVERDUE":slaSt.pct+"%"}</span>
        </div>
        <div style={{background:"rgba(255,255,255,.2)",borderRadius:4,height:4}}>
          <div style={{width:slaSt.pct+"%",height:"100%",background:slaSt.over?"#fca5a5":"#fff",borderRadius:4}}/>
        </div>
      </div>}
    </div>

    {!["rejected"].includes(c.status)&&<Card style={{marginBottom:12}}><Stepper status={c.status}/></Card>}

    <TabBar tabs={adminView?adminTabs:userTabs} active={dtab} onChange={setDtab} color={adminView?T.violet:T.blue}/>

    <div style={{paddingTop:14}}>
      {dtab==="info"&&<Card>
        <Sec t="👤 शिकायतकर्ता"/>
        <IRow label="नाम"        val={c.name}/><IRow label="मोबाइल" val={c.mobile} phone/><IRow label="पता" val={c.address}/>
        {c.email&&<IRow label="ईमेल" val={c.email}/>}
        <IRow label="प्रकार"     val={c.type}/>{c.witnesses&&<IRow label="गवाह" val={c.witnesses}/>}
        <div style={{background:T.bg,borderRadius:10,padding:"12px 14px",fontSize:13,color:T.text1,lineHeight:1.8,border:"1px solid "+T.border,marginTop:10}}>{c.description}</div>
        {off&&<div style={{marginTop:14,background:"#eff6ff",borderRadius:12,padding:14,border:"1px solid #bfdbfe"}}>
          <Sec t="👮 जाँच अधिकारी"/>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{off.av}</div>
            <div>
              <div style={{fontWeight:800,color:T.text1}}>{off.name}</div>
              <div style={{fontSize:11,color:T.text2}}>{off.rank} · {off.beat}</div>
              <a href={"tel:"+off.phone} style={{fontSize:12,color:T.blue,fontWeight:700}}>📞 {off.phone}</a>
            </div>
          </div>
        </div>}
        {userView&&c.status==="resolved"&&!c.rating&&<div style={{marginTop:14}}>
          {!showFB?<Btn ch="⭐ कार्रवाई रेटिंग दें" color="#d97706" onClick={()=>setShowFB(true)} full/>:
          <Card style={{background:"#fefce8",border:"1px solid #fde047",marginTop:0}}>
            <Sec t="⭐ रेटिंग दें"/>
            <div style={{display:"flex",gap:8,justifyContent:"center",margin:"14px 0"}}>
              {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} style={{fontSize:30,background:"none",border:"none",cursor:"pointer",filter:rating>=n?"none":"grayscale(1)",transform:rating===n?"scale(1.2)":"scale(1)"}}>⭐</button>)}
            </div>
            <textarea style={{...INP,minHeight:60,marginBottom:10}} placeholder="प्रतिक्रिया..." value={feedback} onChange={e=>setFeedback(e.target.value)}/>
            <Btn ch="✅ जमा करें" color="#d97706" onClick={()=>{onUpdate({rating,feedback});setShowFB(false);showToast("धन्यवाद! ⭐");}} full/>
          </Card>}
        </div>}
        {c.feedback&&<div style={{marginTop:12,background:"#fefce8",border:"1.5px solid #fde047",borderRadius:12,padding:12}}>
          <div style={{fontWeight:700,fontSize:11,color:"#ca8a04",marginBottom:4}}>⭐ नागरिक प्रतिक्रिया</div>
          <div>{"⭐".repeat(c.rating||0)}</div>
          <div style={{fontSize:12,color:"#854d0e",marginTop:4,fontStyle:"italic"}}>"{c.feedback}"</div>
        </div>}
      </Card>}

      {dtab==="loc"&&<Card>
        <Sec t="📍 घटनास्थल"/>
        <div style={{fontWeight:700,color:T.text1,marginBottom:4}}>{c.location?.address||"Location not captured"}</div>
        {c.location&&<div style={{fontSize:11,color:T.text3,fontFamily:"monospace",marginBottom:14}}>{c.location.lat.toFixed(5)}°N, {c.location.lng.toFixed(5)}°E</div>}
        <div onClick={()=>c.location&&window.open("https://maps.google.com/?q="+c.location.lat+","+c.location.lng,"_blank")}
          style={{background:"linear-gradient(135deg,#dbeafe,#ede9fe)",borderRadius:14,height:110,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"2px dashed #93c5fd",gap:6,marginBottom:14}}>
          <div style={{fontSize:36}}>🗺️</div>
          <div style={{fontSize:13,color:T.blue,fontWeight:700}}>Google Maps पर देखें</div>
        </div>
        {c.location&&<div style={{display:"flex",gap:8}}>
          <a href={"https://www.google.com/maps/dir/?api=1&destination="+c.location.lat+","+c.location.lng} target="_blank" rel="noreferrer"
            style={{flex:1,padding:"11px",background:"#059669",color:"#fff",borderRadius:10,fontWeight:700,fontSize:12,textDecoration:"none",textAlign:"center"}}>🚗 Navigate</a>
          <a href={"https://maps.google.com/?q="+c.location.lat+","+c.location.lng} target="_blank" rel="noreferrer"
            style={{flex:1,padding:"11px",background:T.violet,color:"#fff",borderRadius:10,fontWeight:700,fontSize:12,textDecoration:"none",textAlign:"center"}}>🛰️ Satellite</a>
        </div>}
      </Card>}

      {dtab==="assign"&&adminView&&<Card>
        <Sec t="👮 अधिकारी असाइन करें"/>
        {OFFICERS.map(o=><div key={o.id} onClick={()=>setAssign(o.id)}
          style={{display:"flex",alignItems:"center",gap:10,padding:"12px",border:"2px solid "+(assignTo===o.id?T.blue:T.border),borderRadius:12,marginBottom:8,cursor:"pointer",background:assignTo===o.id?"#eff6ff":T.surface}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:o.active?"#dbeafe":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{o.av}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:T.text1}}>{o.name}</div>
            <div style={{fontSize:11,color:T.text2}}>{o.rank} · {o.beat}</div>
          </div>
          {!o.active&&<span style={{fontSize:10,color:"#ef4444",fontWeight:700,background:"#fee2e2",padding:"2px 8px",borderRadius:10}}>OFF</span>}
          {assignTo===o.id&&<span style={{fontSize:18}}>✅</span>}
        </div>)}
        <Btn ch={saving?"⏳ Saving...":"✅ असाइन करें"} color={T.blue} onClick={doAssign} disabled={saving} full/>
      </Card>}

      {dtab==="update"&&adminView&&<Card>
        <Sec t="🔄 स्थिति अपडेट"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
          {Object.entries(STATUS).map(([k,v])=><button key={k} onClick={()=>setNewSt(k)} style={{padding:"9px 8px",border:"2px solid "+(newSt===k?v.color:T.border),borderRadius:10,background:newSt===k?v.bg:T.surface,color:newSt===k?v.color:T.text2,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {v.icon} {v.label}
          </button>)}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>Remarks</div>
          <input style={INP} placeholder="अंतिम नोट..." value={remarks} onChange={e=>setRemarks(e.target.value)}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>कार्रवाई नोट *</div>
          <textarea style={{...INP,minHeight:80,resize:"vertical"}} placeholder="आज क्या कार्रवाई की..." value={note} onChange={e=>setNote(e.target.value)}/>
        </div>
        <Btn ch={saving?"⏳ Saving...":"🔄 Update करें"} color={T.violet} onClick={doUpdate} disabled={saving} full/>
      </Card>}

      {dtab==="chat"&&<Card>
        <Sec t={"💬 "+(adminView?"नागरिक को संदेश":"अधिकारी को संदेश")}/>
        <Chat c={c} onSend={msg=>onUpdate({messages:[...(c.messages||[]),msg]})} isAdmin={adminView}/>
      </Card>}

      {dtab==="fir"&&adminView&&<FIRDraft c={c}/>}

      {dtab==="tl"&&<Card>
        <Sec t="📋 Timeline"/>
        <div style={{position:"relative",paddingLeft:20}}>
          <div style={{position:"absolute",left:11,top:0,bottom:0,width:2,background:"linear-gradient(to bottom,"+T.blue+","+T.border+")"}}/>
          {[...(c.timeline||[])].reverse().map((t,i)=>{
            const ts=STATUS[t.status];
            return <div key={i} style={{display:"flex",gap:12,marginBottom:18,position:"relative"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:ts?.bg||T.bg,border:"2px solid "+(ts?.color||T.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,marginLeft:-5,zIndex:1}}>{ts?.icon||"•"}</div>
              <div style={{background:T.bg,borderRadius:12,padding:"10px 14px",flex:1,border:"1px solid "+T.border}}>
                <div style={{fontWeight:700,fontSize:12,color:ts?.color||T.text1}}>{ts?.label||t.status} · {ts?.en}</div>
                <div style={{fontSize:12,color:T.text1,marginTop:4,lineHeight:1.6}}>{t.note}</div>
                <div style={{fontSize:10,color:T.text3,marginTop:6,display:"flex",gap:6}}>
                  {t.by&&<span style={{background:T.border,borderRadius:4,padding:"1px 7px",fontWeight:600}}>{t.by}</span>}
                  {fd(t.ts)}
                </div>
              </div>
            </div>;
          })}
        </div>
      </Card>}
    </div>
  </div>;
}

/* ═══════════════════════════════ COMPLAINT FORM ═══════════════════════════════ */
function CmpForm({onAdd,showToast,saving}){
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({name:"",mobile:"",address:"",email:"",type:"",description:"",priority:"medium",witnesses:""});
  const[locating,setLoc]=useState(false);
  const[locData,setLocData]=useState(null);
  const[done,setDone]=useState(null);
  const[typeOpen,setTO]=useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const getLoc=()=>{
    setLoc(true);
    navigator.geolocation?.getCurrentPosition(
      pos=>{setLocData({lat:pos.coords.latitude,lng:pos.coords.longitude,address:"Live GPS ✓",accuracy:pos.coords.accuracy});setLoc(false);},
      ()=>{setLocData({lat:26.8467+Math.random()*.02,lng:79.9462+Math.random()*.02,address:"Chakarnagar approx"});setLoc(false);},
      {timeout:8000}
    );
  };

  const submit=async()=>{
    if(!form.name||!form.mobile||!form.type||!form.description){showToast("सभी * फ़ील्ड भरें!","error");return;}
    if(form.mobile.length!==10){showToast("10 अंक का मोबाइल!","error");return;}
    const newId=uid();
    const c={...form,id:newId,location:locData||{lat:26.8467,lng:79.9462,address:"Not captured"},
      status:"pending",assignedTo:null,createdAt:Date.now(),remarks:"",messages:[],
      timeline:[{status:"pending",note:"ऑनलाइन शिकायत दर्ज। Firebase में save।",by:"System",ts:Date.now()}],
      rating:null,feedback:""};
    await onAdd(c);
    setDone(c);
  };

  if(done)return <div style={{padding:16}}>
    <Card style={{textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:12}}>🎉</div>
      <div style={{fontWeight:900,fontSize:22,color:"#059669",marginBottom:4}}>शिकायत दर्ज हुई!</div>
      <div style={{color:T.text2,fontSize:13,marginBottom:8}}>Firebase में permanently save हो गई ✅</div>
      <div style={{color:T.text2,fontSize:13,marginBottom:16}}>नीचे दी ID नोट करें:</div>
      <div style={{background:"linear-gradient(135deg,#dbeafe,#ede9fe)",border:"2px dashed "+T.blue,borderRadius:16,padding:20,marginBottom:16}}>
        <div style={{fontSize:11,color:T.text3,marginBottom:6,fontWeight:700,letterSpacing:1}}>COMPLAINT ID</div>
        <div style={{fontSize:36,fontWeight:900,color:T.blue,letterSpacing:4}}>{done.id}</div>
      </div>
      <div style={{background:T.bg,borderRadius:12,padding:14,textAlign:"left",marginBottom:16,fontSize:12,lineHeight:2}}>
        <div>📋 {done.type}</div>
        <div>⚡ {PRIORITY[done.priority]?.icon} {PRIORITY[done.priority]?.label}</div>
        <div>📍 {done.location?.address}</div>
        <div>🗄️ Firebase Database में saved</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn ch="नई शिकायत" color={T.blue} ghost onClick={()=>{setDone(null);setStep(1);setForm({name:"",mobile:"",address:"",email:"",type:"",description:"",priority:"medium",witnesses:""});setLocData(null);}} full/>
        {navigator.share&&<Btn ch="📤 Share" color={T.blue} onClick={()=>navigator.share({title:"Complaint",text:"शिकायत ID: "+done.id+" — "+THANA})} full/>}
      </div>
    </Card>
  </div>;

  const steps=["व्यक्तिगत","विवरण","Location"];
  return <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",alignItems:"center"}}>
      {steps.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center",flex:i<2?1:"auto"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:step>i?T.blue:step===i+1?T.blue:T.bg,color:step>=i+1?"#fff":T.text3,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,border:"2px solid "+(step>=i+1?T.blue:T.border)}}>
            {step>i+1?"✓":(i+1)}
          </div>
          <div style={{fontSize:9,color:step===i+1?T.blue:T.text3,fontWeight:step===i+1?700:400,marginTop:3,whiteSpace:"nowrap"}}>{s}</div>
        </div>
        {i<2&&<div style={{flex:1,height:2,background:step>i+1?T.blue:T.border,margin:"0 6px",marginBottom:16}}/>}
      </div>)}
    </div>

    {step===1&&<Card>
      <Sec t="👤 व्यक्तिगत जानकारी"/>
      {[["पूरा नाम *","name","text","आपका पूरा नाम"],["मोबाइल *","mobile","tel","10 अंक"],["ईमेल","email","email","optional"],["पता","address","text","मोहल्ला, गांव, शहर"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>{l}</div>
        <input type={t} style={INP} placeholder={ph} value={form[k]} onChange={e=>set(k,e.target.value)}/>
      </div>)}
      <Btn ch="अगला →" color={T.blue} onClick={()=>{if(!form.name||!form.mobile){showToast("नाम और मोबाइल!","error");return;}if(form.mobile.length!==10){showToast("10 अंक!","error");return;}setStep(2);}} full/>
    </Card>}

    {step===2&&<Card>
      <Sec t="📋 शिकायत विवरण"/>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>शिकायत प्रकार *</div>
        <div onClick={()=>setTO(!typeOpen)} style={{...INP,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:form.type?T.text1:T.text3}}>{form.type||"-- प्रकार चुनें --"}</span>
          <span>{typeOpen?"▲":"▼"}</span>
        </div>
        {typeOpen&&<div style={{border:"1.5px solid "+T.border,borderTop:"none",borderRadius:"0 0 10px 10px",maxHeight:200,overflowY:"auto"}}>
          {CTYPES.map(g=><div key={g.g}>
            <div style={{padding:"7px 14px",background:T.bg,fontSize:10,fontWeight:800,color:T.text3}}>{g.g}</div>
            {g.items.map(t=><div key={t} onClick={()=>{set("type",t);setTO(false);}} style={{padding:"10px 14px",cursor:"pointer",fontSize:13,color:T.text1,background:form.type===t?"#eff6ff":T.surface,borderTop:"1px solid "+T.border}}>{t}</div>)}
          </div>)}
        </div>}
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>प्राथमिकता *</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {Object.entries(PRIORITY).map(([v,p])=><button key={v} onClick={()=>set("priority",v)} style={{padding:"10px 8px",border:"2px solid "+(form.priority===v?p.color:T.border),borderRadius:10,background:form.priority===v?p.bg:T.surface,color:form.priority===v?p.color:T.text2,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {p.icon} {p.label}<div style={{fontSize:9,opacity:.7,marginTop:2}}>SLA {p.sla}h</div>
          </button>)}
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>{"विवरण * ("+form.description.length+"/20+)"}</div>
        <textarea style={{...INP,minHeight:100,resize:"vertical"}} placeholder="कब, कहाँ, कैसे..." value={form.description} onChange={e=>set("description",e.target.value)}/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:5}}>गवाह (optional)</div>
        <input style={INP} placeholder="गवाह नाम व मोबाइल" value={form.witnesses} onChange={e=>set("witnesses",e.target.value)}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn ch="← वापस" color={T.text3} onClick={()=>setStep(1)} full ghost/>
        <Btn ch="अगला →" color={T.blue} onClick={()=>{if(!form.type||form.description.length<20){showToast("प्रकार व 20+ अक्षर!","error");return;}setStep(3);}} full/>
      </div>
    </Card>}

    {step===3&&<Card>
      <Sec t="📍 Live Location"/>
      <div style={{background:"#eff6ff",borderRadius:10,padding:12,marginBottom:14,fontSize:12,color:T.blue,lineHeight:1.7,border:"1px solid #bfdbfe"}}>
        📌 GPS से पुलिस तेज़ पहुँच सकती है।
      </div>
      {locData?<div style={{background:"#d1fae5",border:"1.5px solid #6ee7b7",borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontWeight:800,color:"#065f46",marginBottom:4}}>✅ Location Captured!</div>
        <div style={{fontSize:12,color:"#064e3b"}}>📍 {locData.address}</div>
        {locData.accuracy&&<div style={{fontSize:10,color:"#065f46",marginTop:2}}>Accuracy: ±{Math.round(locData.accuracy)}m</div>}
        <button onClick={()=>setLocData(null)} style={{marginTop:8,fontSize:11,color:"#ef4444",background:"none",border:"none",cursor:"pointer"}}>✕ फिर से लें</button>
      </div>:<Btn ch={locating?"📡 GPS खोज रहे हैं...":"📍 Live Location लें"} color="#0f766e" onClick={getLoc} full/>}
      <div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:8,padding:10,fontSize:11,color:"#854d0e",margin:"12px 0"}}>⚠️ Location optional है।</div>
      <div style={{display:"flex",gap:8}}>
        <Btn ch="← वापस" color={T.text3} onClick={()=>setStep(2)} full ghost/>
        <Btn ch={saving?"⏳ Saving to Firebase...":"🚨 दर्ज करें"} color="#ef4444" onClick={submit} disabled={saving} full/>
      </div>
    </Card>}
  </div>;
}

/* ═══════════════════════════════ ADMIN DASHBOARD ═══════════════════════════════ */
function AdminDash({complaints}){
  const total=complaints.length;
  const today=complaints.filter(c=>new Date(c.createdAt).toDateString()===new Date().toDateString()).length;
  const resolved=complaints.filter(c=>c.status==="resolved");
  const overdue=complaints.filter(c=>getSLA(c)?.over);
  const unassign=complaints.filter(c=>!c.assignedTo&&c.status==="pending");
  const rated=resolved.filter(c=>c.rating);
  const avgR=rated.length?(rated.reduce((a,c)=>a+c.rating,0)/rated.length).toFixed(1):"—";
  const weekly=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return{day:d.toLocaleDateString("hi-IN",{weekday:"short"}),n:complaints.filter(c=>new Date(c.createdAt).toDateString()===d.toDateString()).length};});
  const maxW=Math.max(...weekly.map(w=>w.n),1);
  const byType=Object.entries(complaints.reduce((a,c)=>{const t=c.type.split("/")[0].trim();a[t]=(a[t]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      {[["📋",total,"कुल",T.blue],["📅",today,"आज",T.violet],["✅",resolved.length,"निस्तारित","#059669"]].map(([ic,n,l,c])=><div key={l} style={{background:T.surface,borderRadius:14,padding:"14px 10px",textAlign:"center",border:"1px solid "+T.border,borderTop:"3px solid "+c}}>
        <div style={{fontSize:20}}>{ic}</div>
        <div style={{fontWeight:900,fontSize:24,color:c,lineHeight:1.1}}>{n}</div>
        <div style={{fontSize:10,color:T.text3,marginTop:2}}>{l}</div>
      </div>)}
    </div>
    {(overdue.length>0||unassign.length>0)&&<div style={{display:"flex",gap:8}}>
      {overdue.length>0&&<div style={{flex:1,background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
        <div style={{fontWeight:900,fontSize:22,color:"#dc2626"}}>{overdue.length}</div>
        <div style={{fontSize:10,color:"#dc2626",fontWeight:700}}>⚠️ SLA Overdue</div>
      </div>}
      {unassign.length>0&&<div style={{flex:1,background:"#fef9c3",border:"1.5px solid #fde047",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
        <div style={{fontWeight:900,fontSize:22,color:"#ca8a04"}}>{unassign.length}</div>
        <div style={{fontSize:10,color:"#ca8a04",fontWeight:700}}>👮 Unassigned</div>
      </div>}
      <div style={{flex:1,background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
        <div style={{fontWeight:900,fontSize:22,color:"#059669"}}>{avgR}</div>
        <div style={{fontSize:10,color:"#059669",fontWeight:700}}>⭐ Avg Rating</div>
      </div>
    </div>}
    <Card>
      <Sec t="📈 साप्ताहिक (7 दिन)"/>
      <div style={{display:"flex",alignItems:"flex-end",gap:6,height:90,marginBottom:4}}>
        {weekly.map((w,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{fontSize:10,color:T.blue,fontWeight:700,minHeight:14}}>{w.n||""}</div>
          <div style={{width:"100%",borderRadius:"5px 5px 0 0",height:Math.max(4,w.n/maxW*65)+"px",background:i===6?"linear-gradient(to top,"+T.blue+","+T.violet+")":"#cbd5e1"}}/>
          <div style={{fontSize:9,color:T.text3}}>{w.day}</div>
        </div>)}
      </div>
    </Card>
    <Card>
      <Sec t="📊 Status"/>
      {Object.entries(STATUS).map(([k,v])=>{const n=complaints.filter(c=>c.status===k).length;const pct=total?Math.round(n/total*100):0;return <div key={k} style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:12,color:T.text2}}>{v.icon} {v.label}</span>
          <span style={{fontWeight:800,color:v.color,fontSize:12}}>{n} ({pct}%)</span>
        </div>
        <div style={{background:T.bg,borderRadius:6,height:8,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:"linear-gradient(to right,"+v.color+"aa,"+v.color+")",borderRadius:6}}/>
        </div>
      </div>;})}
    </Card>
    <Card>
      <Sec t="🏆 Top शिकायत प्रकार"/>
      {byType.map(([t,n],i)=><div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:22,height:22,borderRadius:"50%",background:T.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</div>
        <div style={{flex:1,fontSize:12,color:T.text1}}>{t}</div>
        <div style={{fontWeight:800,color:T.blue}}>{n}</div>
      </div>)}
    </Card>
    <Card>
      <Sec t="🗄️ Database Info"/>
      <IRow label="Firebase" val="Connected ✅"/>
      <IRow label="Total Records" val={String(total)}/>
      <IRow label="Real-time Sync" val="Active 🟢"/>
      <IRow label="Auto-backup" val="Daily ✅"/>
    </Card>
  </div>;
}

/* ═══════════════════════════════ OFFICERS TAB ═══════════════════════════════ */
function OfficersTab({complaints}){
  return <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
    {OFFICERS.map(o=>{
      const all=complaints.filter(c=>c.assignedTo===o.id);
      const res=all.filter(c=>c.status==="resolved");
      const act=all.filter(c=>!["resolved","closed","rejected"].includes(c.status));
      const ov=act.filter(c=>getSLA(c)?.over);
      const rated=res.filter(c=>c.rating);
      const avgR=rated.length?(rated.reduce((a,c)=>a+c.rating,0)/rated.length).toFixed(1):null;
      return <Card key={o.id}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:50,height:50,borderRadius:"50%",background:o.active?"#dbeafe":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,border:"2px solid "+(o.active?T.blue:T.border)}}>{o.av}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,color:T.text1,fontSize:14}}>{o.name}</div>
            <div style={{fontSize:11,color:T.text2}}>{o.rank} · {o.beat}</div>
            {avgR&&<div style={{fontSize:11,color:"#d97706"}}>⭐ {avgR}</div>}
          </div>
          <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:o.active?"#d1fae5":"#fee2e2",color:o.active?"#065f46":"#991b1b"}}>{o.active?"● Active":"○ Off"}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,textAlign:"center",marginBottom:12}}>
          {[["कुल",all.length,T.blue],["सक्रिय",act.length,"#d97706"],["निस्तारित",res.length,"#059669"],["Overdue",ov.length,"#ef4444"]].map(([l,n,c])=><div key={l} style={{background:T.bg,borderRadius:10,padding:"8px 4px",border:"1px solid "+T.border}}>
            <div style={{fontWeight:900,fontSize:18,color:c}}>{n}</div>
            <div style={{fontSize:9,color:T.text3}}>{l}</div>
          </div>)}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:T.text3,marginBottom:4}}>Workload</div>
          <div style={{background:T.bg,borderRadius:4,height:6,overflow:"hidden"}}>
            <div style={{width:Math.min(100,act.length/5*100)+"%",height:"100%",background:act.length>4?"#ef4444":act.length>2?"#f59e0b":"#10b981",borderRadius:4}}/>
          </div>
        </div>
        <a href={"tel:"+o.phone} style={{display:"block",textAlign:"center",padding:"9px",background:"#eff6ff",color:T.blue,borderRadius:10,fontWeight:700,fontSize:12,textDecoration:"none"}}>📞 {o.phone}</a>
      </Card>;
    })}
  </div>;
}

/* ═══════════════════════════════ USER PANEL ═══════════════════════════════ */
function UserPanel({complaints,onAdd,onUpdate,onBack,showToast,toast,saving}){
  const[tab,setTab]=useState("new");
  const[trackId,setTrk]=useState("");
  const[tracked,setTrk2]=useState(null);
  const[nf,setNF]=useState(false);
  useEffect(()=>{if(tracked){const f=complaints.find(x=>x.firestoreId===tracked.firestoreId||x.id===tracked.id);if(f)setTrk2(f);}},[complaints]);

  const doTrack=()=>{
    const id=trackId.trim().toUpperCase();
    const c=complaints.find(x=>x.id===id);
    if(c){setTrk2(c);setNF(false);}else{setTrk2(null);setNF(true);}
  };

  return <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    <TopBar title="नागरिक पोर्टल" sub={"Citizen Portal — "+THANA} onBack={onBack} gradient={"linear-gradient(135deg,#1e3a5f,"+T.blue+")"}/>
    <TabBar tabs={[["new","📋 दर्ज करें"],["track","📍 ट्रैक"],["history","📚 इतिहास"],["help","❓ Help"]]} active={tab} onChange={setTab} color={T.blue}/>
    <div style={{flex:1,overflowY:"auto"}}>
      {tab==="new"&&<CmpForm onAdd={async c=>{await onAdd(c);showToast("दर्ज! Firebase में save ✅");}} showToast={showToast} saving={saving}/>}
      {tab==="track"&&<div style={{padding:16}}>
        <Card style={{marginBottom:14}}>
          <Sec t="🔎 शिकायत ट्रैक"/>
          <div style={{display:"flex",gap:8}}>
            <input style={{...INP,flex:1}} placeholder="ID जैसे C123456" value={trackId} onChange={e=>setTrk(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doTrack()}/>
            <Btn ch="खोजें" color={T.blue} onClick={doTrack}/>
          </div>
        </Card>
        {nf&&<div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",color:"#b91c1c",borderRadius:12,padding:14,textAlign:"center",fontSize:13,fontWeight:700,marginBottom:12}}>❌ शिकायत नहीं मिली।</div>}
        {tracked&&<Detail c={tracked} onUpdate={p=>{onUpdate(tracked.firestoreId||tracked.id,p);setTrk2({...tracked,...p});}} userView showToast={showToast} saving={saving}/>}
      </div>}
      {tab==="history"&&<div style={{padding:16}}>
        <div style={{fontSize:12,color:T.text3,marginBottom:12,textAlign:"center"}}>हाल की शिकायतें (Firebase से live)</div>
        {complaints.slice(0,8).map(c=><CmpCard key={c.firestoreId||c.id} c={c} onClick={()=>{setTrk2(c);setTrk(c.id);setTab("track");}}/>)}
        {complaints.length===0&&<Loader msg="Firebase से load हो रहा है..."/>}
      </div>}
      {tab==="help"&&<div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
        <Card>
          <Sec t="📞 आपातकालीन नंबर"/>
          {[["🚨","Police","100"],["🚑","Ambulance","108"],["🔥","Fire","101"],["👩","Women","1090"],["👶","Child","1098"],["💻","Cyber","1930"]].map(([ic,l,n])=><a key={n} href={"tel:"+n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 12px",background:T.bg,borderRadius:10,marginBottom:8,textDecoration:"none",border:"1px solid "+T.border}}>
            <span style={{fontWeight:600,color:T.text1,fontSize:14}}>{ic} {l}</span>
            <span style={{fontWeight:900,color:"#ef4444",fontSize:18}}>{n}</span>
          </a>)}
        </Card>
        <Card>
          <Sec t="🗄️ Data Storage"/>
          <div style={{background:"#d1fae5",borderRadius:10,padding:12,fontSize:12,color:"#065f46",lineHeight:1.8,border:"1px solid #6ee7b7"}}>
            ✅ आपकी शिकायत <strong>Google Firebase</strong> में permanently store होती है।<br/>
            ✅ Server restart होने पर भी data safe रहता है।<br/>
            ✅ Real-time sync — कोई भी device से access।<br/>
            ✅ Daily automatic backup।
          </div>
        </Card>
        <Card>
          <Sec t={"🏢 "+THANA}/>
          <IRow label="जिला" val={DIST}/>
          <IRow label="फोन" val={THANA_PHONE} phone/>
          <IRow label="आपातकाल" val="112" phone/>
        </Card>
      </div>}
    </div>
  </div>;
}

/* ═══════════════════════════════ ADMIN PANEL ═══════════════════════════════ */
function AdminPanel({complaints,authed,onAuth,onUpdate,onBack,showToast,toast,saving,user}){
  const[pwd,setPwd]=useState("");
  const[email,setEmail]=useState(ADMIN_EMAIL);
  const[err,setErr]=useState("");
  const[logging,setLogging]=useState(false);
  const[sel,setSel]=useState(null);
  const[filter,setFilt]=useState("all");
  const[search,setSrch]=useState("");
  const[sort,setSort]=useState("newest");
  const[tab,setTab]=useState("dash");
  const[notif,setNotif]=useState(false);

  const unassign=complaints.filter(c=>!c.assignedTo&&c.status==="pending");
  const overdue=complaints.filter(c=>getSLA(c)?.over);
  const bell=unassign.length+overdue.length;

  const doLogin=async()=>{
    setLogging(true);setErr("");
    try{
      await onAuth(email,pwd);
    }catch(e){
      setErr("गलत email या password!");
      setPwd("");
    }
    setLogging(false);
  };

  if(!authed)return <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#0a0f1e",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:380,background:"#111827",borderRadius:20,padding:28,border:"1px solid #1f2937",boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:54,marginBottom:8}}>🛡️</div>
        <div style={{fontWeight:900,fontSize:20,color:"#f9fafb"}}>Admin Login</div>
        <div style={{color:"#6b7280",fontSize:11,marginTop:4}}>Firebase Authentication · Secure</div>
        <div style={{marginTop:12,background:"#1f2937",borderRadius:8,padding:"6px 12px",display:"inline-flex",alignItems:"center",gap:6}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/>
          <span style={{color:"#10b981",fontSize:11,fontWeight:700}}>Firebase Connected</span>
        </div>
      </div>
      <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:5}}>EMAIL</div>
      <input style={{...INP,background:"#1f2937",border:"1.5px solid #374151",color:"#f9fafb",marginBottom:10}} type="email" placeholder="admin@chakarnagar.police.up" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}/>
      <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:5}}>PASSWORD</div>
      <input style={{...INP,background:"#1f2937",border:"1.5px solid "+(err?"#ef4444":"#374151"),color:"#f9fafb",marginBottom:10}} type="password" placeholder="••••••••••" value={pwd}
        onChange={e=>{setPwd(e.target.value);setErr("");}}
        onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
      {err&&<div style={{background:"rgba(239,68,68,.15)",color:"#fca5a5",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:700,marginBottom:10,textAlign:"center"}}>❌ {err}</div>}
      <Btn ch={logging?"⏳ Logging in...":"🔐 Login with Firebase"} color={T.violet} onClick={doLogin} disabled={logging} full/>
      <button onClick={onBack} style={{width:"100%",marginTop:10,padding:"10px",background:"none",border:"1px solid #374151",borderRadius:10,color:"#6b7280",fontWeight:600,fontSize:12,cursor:"pointer"}}>← वापस</button>
      <div style={{fontSize:10,color:"#374151",textAlign:"center",marginTop:14,lineHeight:1.6}}>
        Firebase Authentication use होती है।<br/>
        Email & Password Firebase Console में set करें।
      </div>
    </div>
  </div>;

  let list=[...complaints];
  if(filter!=="all")list=list.filter(c=>c.status===filter);
  if(search.trim()){const q=search.toLowerCase();list=list.filter(c=>c.id.includes(search.toUpperCase())||c.name?.toLowerCase().includes(q)||c.mobile?.includes(search)||c.type?.toLowerCase().includes(q));}
  if(sort==="newest")list.sort((a,b)=>b.createdAt-a.createdAt);
  else if(sort==="oldest")list.sort((a,b)=>a.createdAt-b.createdAt);
  else if(sort==="priority"){const po={urgent:0,high:1,medium:2,low:3};list.sort((a,b)=>(po[a.priority]||2)-(po[b.priority]||2));}
  else if(sort==="sla"){list.sort((a,b)=>(getSLA(b)?.pct||0)-(getSLA(a)?.pct||0));}
  const counts=Object.keys(STATUS).reduce((a,k)=>({...a,[k]:complaints.filter(c=>c.status===k).length}),{});

  if(sel)return <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    <TopBar title="शिकायत विवरण" sub={sel.id+" · "+(STATUS[sel.status]?.label||"")} onBack={()=>setSel(null)} gradient={"linear-gradient(135deg,#4c1d95,"+T.violet+")"}/>
    <div style={{flex:1,overflowY:"auto",padding:14}}>
      <Detail c={sel} onUpdate={p=>{const u={...sel,...p};onUpdate(sel.firestoreId||sel.id,p);setSel(u);}} adminView showToast={showToast} saving={saving}/>
    </div>
  </div>;

  return <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    {notif&&<div onClick={()=>setNotif(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:800,display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,margin:"0 auto",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid "+T.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:16,color:T.text1}}>🔔 Notifications</div>
          <button onClick={()=>setNotif(false)} style={{background:T.bg,border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:16}}>
          {bell===0&&<div style={{textAlign:"center",padding:32,color:T.text3}}><div style={{fontSize:40,marginBottom:8}}>✅</div>सब ठीक!</div>}
          {unassign.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontWeight:700,color:"#dc2626",marginBottom:8}}>⚠️ {unassign.length} Unassigned</div>
            {unassign.map(c=><div key={c.firestoreId||c.id} onClick={()=>{setSel(c);setNotif(false);}} style={{padding:"10px 12px",background:"#fef2f2",borderRadius:10,marginBottom:8,cursor:"pointer",border:"1px solid #fca5a5"}}>
              <div style={{fontWeight:700,fontSize:12,color:"#dc2626"}}>{c.id} — {c.name}</div>
              <div style={{fontSize:11,color:T.text3,marginTop:2}}>{c.type} · {fds(c.createdAt)}</div>
            </div>)}
          </div>}
          {overdue.length>0&&<div>
            <div style={{fontWeight:700,color:"#d97706",marginBottom:8}}>⏱ {overdue.length} SLA Overdue</div>
            {overdue.map(c=>{const s=getSLA(c);return <div key={c.firestoreId||c.id} onClick={()=>{setSel(c);setNotif(false);}} style={{padding:"10px 12px",background:"#fef9c3",borderRadius:10,marginBottom:8,cursor:"pointer",border:"1px solid #fde047"}}>
              <div style={{fontWeight:700,fontSize:12,color:"#92400e"}}>{c.id} — {c.name}</div>
              <div style={{fontSize:11,color:T.text3,marginTop:2}}>{s?.h}h/{s?.lim}h · {PRIORITY[c.priority]?.label}</div>
            </div>;})}
          </div>}
        </div>
      </div>
    </div>}

    <TopBar title="Admin Dashboard" sub={complaints.length+" शिकायतें · Firebase Live"} onBack={()=>{onBack();}} gradient={"linear-gradient(135deg,#4c1d95,"+T.violet+")"}
      right={<button onClick={()=>setNotif(true)} style={{position:"relative",background:"rgba(255,255,255,.15)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:18,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        🔔{bell>0&&<span style={{position:"absolute",top:2,right:2,background:"#ef4444",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{bell}</span>}
      </button>}/>

    <TabBar tabs={[["dash","📊 Dashboard"],["list","📋 List"],["officers","👮 Officers"],["settings","⚙️"]]} active={tab} onChange={setTab} color={T.violet}/>

    {tab==="dash"&&<AdminDash complaints={complaints}/>}
    {tab==="officers"&&<OfficersTab complaints={complaints}/>}
    {tab==="list"&&<>
      <div style={{padding:"10px 14px 4px",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
        <Chip label={"सभी ("+complaints.length+")"} active={filter==="all"} onClick={()=>setFilt("all")} color={T.violet}/>
        {Object.entries(STATUS).map(([k,v])=><Chip key={k} label={v.icon+(counts[k]||0)} active={filter===k} onClick={()=>setFilt(filter===k?"all":k)} color={v.color}/>)}
      </div>
      <div style={{padding:"8px 14px",display:"flex",gap:8}}>
        <input style={{...INP,flex:1,fontSize:12}} placeholder="🔍 ID, नाम, मोबाइल..." value={search} onChange={e=>setSrch(e.target.value)}/>
        <select style={{...INP,width:"auto",fontSize:11,padding:"10px 8px"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="newest">नया पहले</option>
          <option value="oldest">पुराना पहले</option>
          <option value="priority">Priority</option>
          <option value="sla">SLA %</option>
        </select>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px 14px"}}>
        {list.length===0&&complaints.length===0&&<Loader msg="Firebase से load हो रहा है..."/>}
        {list.length===0&&complaints.length>0&&<div style={{textAlign:"center",padding:48,color:T.text3}}>कोई शिकायत नहीं मिली</div>}
        {list.map(c=><CmpCard key={c.firestoreId||c.id} c={c} onClick={()=>setSel(c)} showSLA/>)}
      </div>
    </>}
    {tab==="settings"&&<div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
      <Card>
        <Sec t="⚙️ थाना जानकारी"/>
        {[["🏢","थाना",THANA],["📍","जिला",DIST],["📞","फोन",THANA_PHONE],["👤","Admin",user?.email||"—"],["🗄️","Database","Firebase Firestore"]].map(([ic,l,v])=><div key={l} style={{display:"flex",gap:10,padding:"11px 0",borderBottom:"1px solid "+T.border,alignItems:"center"}}>
          <span style={{fontSize:20}}>{ic}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:T.text3,fontWeight:700,letterSpacing:.5}}>{l.toUpperCase()}</div>
            <div style={{fontSize:13,fontWeight:700,color:T.text1,marginTop:2}}>{v}</div>
          </div>
        </div>)}
      </Card>
      <Card style={{background:"#d1fae5",border:"1px solid #6ee7b7"}}>
        <Sec t="🗄️ Firebase Status"/>
        <IRow label="Firestore" val="Connected ✅"/>
        <IRow label="Auth" val="Active ✅"/>
        <IRow label="Real-time" val="Live Sync 🟢"/>
        <IRow label="Records" val={String(complaints.length)+" shikayatein"}/>
      </Card>
      <Btn ch="🚪 Logout" color="#ef4444" onClick={()=>{onBack();}} full/>
    </div>}
  </div>;
}

/* ═══════════════════════════════ HOME ═══════════════════════════════ */
function Home({onSelect,taps,onTap,complaints}){
  const total=complaints.length;
  const resolved=complaints.filter(c=>c.status==="resolved").length;
  const pending=complaints.filter(c=>c.status==="pending").length;
  return <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <div style={{background:"linear-gradient(160deg,#050e1f 0%,#0f2540 45%,#1e3a8a 100%)",padding:"36px 22px 30px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(ellipse at 70% 50%,rgba(59,130,246,.15) 0%,transparent 70%)"}}/>
      <div style={{position:"absolute",top:-40,right:-40,fontSize:180,opacity:.04,pointerEvents:"none"}}>🚔</div>
      <div onClick={onTap} style={{fontSize:56,marginBottom:10,textAlign:"center",cursor:"pointer",userSelect:"none",position:"relative"}}>🚔</div>
      <div style={{color:"#60a5fa",fontSize:10,letterSpacing:4,fontWeight:800,textTransform:"uppercase",textAlign:"center"}}>Uttar Pradesh Police</div>
      <div style={{color:"#ffffff",fontSize:24,fontWeight:900,textAlign:"center",lineHeight:1.2,marginTop:6}}>{THANA}</div>
      <div style={{color:"#93c5fd",fontSize:11,textAlign:"center",marginTop:4}}>{DIST}</div>
      {taps>0&&taps<6&&<div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#60a5fa",opacity:.6}}>🔐 {6-taps} more taps...</div>}
      <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"center"}}>
        {[["📋",total,"कुल"],["✅",resolved,"निस्तारित"],["⏳",pending,"लंबित"]].map(([ic,n,l])=><div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:14,padding:"12px 18px",textAlign:"center",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontSize:22}}>{ic}</div>
          <div style={{color:"#fff",fontWeight:900,fontSize:22,lineHeight:1.1}}>{n}</div>
          <div style={{color:"#93c5fd",fontSize:9,marginTop:3,fontWeight:600}}>{l}</div>
        </div>)}
      </div>
      <div style={{marginTop:14,display:"flex",justifyContent:"center",gap:6}}>
        <div style={{background:"rgba(16,185,129,.2)",borderRadius:20,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#10b981"}}/>
          <span style={{color:"#6ee7b7",fontSize:10,fontWeight:700}}>Firebase Live</span>
        </div>
        <div style={{background:"rgba(59,130,246,.2)",borderRadius:20,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#60a5fa"}}/>
          <span style={{color:"#93c5fd",fontSize:10,fontWeight:700}}>World Wide Web</span>
        </div>
      </div>
    </div>
    <a href="tel:112" style={{background:"linear-gradient(135deg,#dc2626,#b91c1c)",padding:"13px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",textDecoration:"none"}}>
      <div>
        <div style={{color:"#fff",fontWeight:800,fontSize:14}}>🚨 आपातकाल / Emergency</div>
        <div style={{color:"rgba(255,255,255,.7)",fontSize:10}}>24×7 उपलब्ध</div>
      </div>
      <div style={{background:"#fff",color:"#dc2626",fontWeight:900,fontSize:16,padding:"7px 18px",borderRadius:24}}>📞 112</div>
    </a>
    <div style={{padding:"22px 18px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{color:T.text3,fontSize:11,fontWeight:700,letterSpacing:1.5,textAlign:"center"}}>नागरिक सेवा · CITIZEN SERVICES</div>
      <div onClick={()=>onSelect("user")} style={{background:T.surface,border:"2px solid "+T.border,borderRadius:18,padding:"22px 20px",cursor:"pointer",boxShadow:"0 4px 20px rgba(0,0,0,.08)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-10,top:-10,fontSize:80,opacity:.04}}>👤</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{fontSize:38,width:62,height:62,background:"linear-gradient(135deg,#eff6ff,#dbeafe)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #bfdbfe",flexShrink:0}}>👤</div>
          <div>
            <div style={{fontWeight:900,fontSize:20,color:T.text1}}>नागरिक पोर्टल</div>
            <div style={{fontSize:11,color:T.blue,fontWeight:700,letterSpacing:.5,marginTop:2}}>CITIZEN PORTAL</div>
          </div>
          <div style={{marginLeft:"auto",color:T.blue,fontSize:28,fontWeight:700}}>›</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {["✔ शिकायत दर्ज","✔ GPS Location","✔ Firebase Saved","✔ Real-time Track","✔ Officer Chat","✔ Rating दें"].map(l=><div key={l} style={{fontSize:11,color:T.text2,padding:"3px 0"}}>{l}</div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[["📞","100","Police"],["🚑","108","Ambulance"],["👩","1090","Women"],["💻","1930","Cyber"]].map(([ic,n,l])=><a key={n} href={"tel:"+n} style={{background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",textAlign:"center",textDecoration:"none"}}>
          <div style={{fontSize:24,marginBottom:4}}>{ic}</div>
          <div style={{fontWeight:900,color:"#ef4444",fontSize:18}}>{n}</div>
          <div style={{fontSize:10,color:T.text3,marginTop:2}}>{l}</div>
        </a>)}
      </div>
    </div>
    <div style={{textAlign:"center",padding:"4px 20px 28px",color:T.text3,fontSize:10}}>
      {THANA} · {DIST}<br/>
      <span style={{opacity:.5}}>v4.0 Firebase · World Wide Web · UP Police</span>
    </div>
  </div>;
}

/* ═══════════════════════════════ ROOT APP ═══════════════════════════════ */
export default function App(){
  const[complaints,setCmp]=useState([]);
  const[panel,setPanel]=useState("home");
  const[authUser,setAuthUser]=useState(null);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[toast,setToast]=useState(null);
  const[taps,setTaps]=useState(0);
  const timer=useRef(null);

  const showToast=useCallback((msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);},[]);

  // Firebase Auth listener
  useEffect(()=>{
    try{
      const unsub=onAuthChange(user=>{setAuthUser(user);setLoading(false);});
      return unsub;
    }catch(e){console.warn("Firebase not configured:",e);setLoading(false);}
  },[]);

  // Firebase Realtime listener for complaints
  useEffect(()=>{
    try{
      const unsub=listenComplaints(list=>{setCmp(list);});
      return unsub;
    }catch(e){
      console.warn("Firestore not configured. Running in demo mode.");
      // Demo fallback
      setCmp([
        {id:"C100001",type:"चोरी / Theft",description:"मेरे घर में रात 2 बजे चोरी हुई।",name:"Rajesh Sharma",mobile:"9876543210",address:"मोहल्ला गंज, चकरनगर",status:"investigating",assignedTo:"O1",priority:"high",location:{lat:26.8467,lng:79.9462,address:"Chakarnagar, Etawah"},createdAt:Date.now()-86400000*3,remarks:"",witnesses:"राम बाबू",messages:[],timeline:[{status:"pending",note:"दर्ज।",by:"System",ts:Date.now()-86400000*3},{status:"assigned",note:"SI Ramesh को असाइन।",by:"Admin",ts:Date.now()-86400000*2},{status:"investigating",note:"मौका मुआयना।",by:"SI Ramesh",ts:Date.now()-3600000*5}],rating:null,feedback:"",firestoreId:"demo1"},
        {id:"C100002",type:"साइबर ठगी / Cybercrime",description:"OTP देकर ₹25,000 ठगे।",name:"Meena Devi",mobile:"9123456780",address:"कॉलोनी रोड, एटावा",status:"assigned",assignedTo:"O4",priority:"urgent",location:{lat:26.7854,lng:79.0158,address:"Etawah"},createdAt:Date.now()-86400000,remarks:"",witnesses:"",messages:[],timeline:[{status:"pending",note:"दर्ज।",by:"System",ts:Date.now()-86400000}],rating:null,feedback:"",firestoreId:"demo2"},
      ]);
    }
  },[]);

  const addC=async(c)=>{
    setSaving(true);
    try{
      await addComplaint(c);
      showToast("Firebase में save ✅");
    }catch(e){
      // Fallback demo mode
      setCmp(p=>[{...c,firestoreId:"local_"+c.id},...p]);
      showToast("Demo mode — Firebase config करें","warning");
    }
    setSaving(false);
  };

  const updateC=async(id,patch)=>{
    setSaving(true);
    try{
      await updateComplaint(id,patch);
    }catch(e){
      // Fallback
      setCmp(p=>p.map(c=>(c.firestoreId===id||c.id===id)?{...c,...patch}:c));
    }
    setSaving(false);
  };

  const doAuth=async(email,pwd)=>{
    await adminLogin(email,pwd);
  };

  const doLogout=async()=>{
    try{await adminLogout();}catch(e){}
    setAuthUser(null);
    setPanel("home");
  };

  const handleTap=()=>{
    const n=taps+1;setTaps(n);
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>setTaps(0),3000);
    if(n>=6){setTaps(0);setPanel("admin");}
  };

  if(loading)return <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0f2540",fontFamily:"system-ui"}}>
    <div style={{fontSize:56,marginBottom:16}}>🚔</div>
    <div style={{color:"#93c5fd",fontSize:11,letterSpacing:3,fontWeight:700,textTransform:"uppercase",marginBottom:16}}>UP Police CMS</div>
    <div style={{width:40,height:40,border:"4px solid rgba(255,255,255,.2)",borderTop:"4px solid #60a5fa",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{color:"#475569",fontSize:12,marginTop:16}}>Firebase से connect हो रहे हैं...</div>
  </div>;

  if(panel==="home") return <Home onSelect={setPanel} taps={taps} onTap={handleTap} complaints={complaints}/>;
  if(panel==="user") return <UserPanel complaints={complaints} onAdd={addC} onUpdate={updateC} onBack={()=>setPanel("home")} showToast={showToast} toast={toast} saving={saving}/>;
  if(panel==="admin") return <AdminPanel complaints={complaints} authed={!!authUser} onAuth={doAuth} onUpdate={updateC} onBack={doLogout} showToast={showToast} toast={toast} saving={saving} user={authUser}/>;
}
