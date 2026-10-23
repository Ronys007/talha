import{r as g,j as t,L as gt}from"./vendor-react-kS05blNL.js";import ft from"./html2canvas.esm-DtF4syFK.js";import{E as ut}from"./jspdf.es.min-BWegApGm.js";import"./app-Byx6PE7o.js";function vt({order:b,ledger:k}){var U,X,K,Y,Z,tt;const[f,nt]=g.useState(!1),[n,_]=g.useState(!1),[o,L]=g.useState(b),[h,H]=g.useState(k),[m,E]=g.useState(!1),[u,q]=g.useState(!1),[B,ot]=g.useState(!1),[P,rt]=g.useState(""),v=g.useRef(null);function at(){window.print()}async function st(){if(v.current){q(!0);try{const e=await ft(v.current,{scale:2,useCORS:!0,windowWidth:v.current.scrollWidth,windowHeight:v.current.scrollHeight}),i=new ut("p","pt","a4"),a=i.internal.pageSize.getWidth(),y=(i.internal.pageSize.getHeight()-24)*e.width/a,ct=Math.ceil(e.height/y);for(let T=0;T<ct;T++){T>0&&i.addPage();const j=document.createElement("canvas");j.width=e.width;const I=Math.min(y,e.height-T*y);j.height=I;const R=j.getContext("2d");R.fillStyle="#ffffff",R.fillRect(0,0,j.width,j.height),R.drawImage(e,0,T*y,e.width,I,0,0,e.width,I);const xt=j.toDataURL("image/jpeg",.95),ht=I*a/e.width;i.addImage(xt,"JPEG",0,0,a,ht)}const et=`Invoice_#${o.id}.pdf`,pt=i.output("blob"),it=new File([pt],et,{type:"application/pdf"});navigator.canShare&&navigator.canShare({files:[it]})?await navigator.share({files:[it],title:`Invoice #${o.id}`,text:"Here is your invoice copy."}):i.save(et)}catch(e){console.error("Error generating PDF:",e),alert("Failed to share PDF.")}finally{q(!1)}}}const p=Math.max(1,parseInt(o==null?void 0:o.discount_divisor,10)||1),s=p>1,S=(U=o==null?void 0:o.items)==null?void 0:U.some(e=>(parseFloat(e.discount_percent)||0)>0),W=((X=o==null?void 0:o.items)==null?void 0:X.reduce((e,i)=>e+(parseFloat(i.selling_price)||0)*(parseFloat(i.quantity)||0),0))??0,M=((K=o==null?void 0:o.items)==null?void 0:K.reduce((e,i)=>{const a=parseFloat(i.selling_price)||0,c=s?a/p:a;return e+c*(parseFloat(i.quantity)||0)},0))??0,O=s?W-M:0,Q=((Y=o==null?void 0:o.items)==null?void 0:Y.reduce((e,i)=>{const a=parseFloat(i.selling_price)||0,c=s?a/p:a,x=parseFloat(i.discount_percent)||0,z=x>0?c*(1-x/100):c;return e+z*(parseFloat(i.quantity)||0)},0))??0,$=(s?M:W)-Q,G=parseFloat(o==null?void 0:o.total_price)||Q,A=((Z=o==null?void 0:o.items)==null?void 0:Z.reduce((e,i)=>e+(parseFloat(i.quantity)||0),0))??0,w=(s?1:0)+(s||S?2:0),r={INVOICE:n?"चालान":"INVOICE","Bill No":n?"बिल नं.":"Bill #","GST No":n?"जीएसटी क्र.":"GST No","Billed To":n?"बिल प्राप्तकर्ता":"Billed To","Invoice Status":n?"चालान की स्थिति":"Invoice Status","Add Status":n?"स्थिति जोड़ें":"Add Status",Item:n?"आइटम":"Item",Qty:n?"मात्रा":"Qty",Price:n?"मुल्य":"Price","Price ÷ 2":n?"मुल्य ÷ 2":"Price ÷ 2","Price ÷ 3":n?"मुल्य ÷ 3":"Price ÷ 3","Disc %":n?"छूट %":"Disc %","Net Price":n?"शुद्ध मुल्य":"Net Price",Total:n?"कुल":"Total",Subtotal:n?"उप-योग":"Subtotal","Total Discount":n?"कुल छूट":"Total Discount","Total Bill Amount":n?"कुल बिल राशि":"Total Bill Amount","Customer Ledger —":n?"बहीखाता —":"Customer Ledger —","All bills as of":n?"के अनुसार सभी बिल":"All bills as of",Date:n?"दिनांक":"Date","Bill Amount":n?"बिल राशि":"Bill Amount",Received:n?"प्राप्त":"Received","Balance Due":n?"बकाया राशि":"Balance Due",current:n?"वर्तमान":"current","Previous Balance":n?"पिछला बकाया":"Previous Balance","This Bill (":n?"यह बिल (":"This Bill (","Total Outstanding":n?"कुल बकाया":"Total Outstanding","Thank you for your business!":n?"आपके व्यापार के लिए धन्यवाद!":"Thank you for your business!","Print Invoice":n?"चालान प्रिंट करें":"🖨️ Print Invoice","Include Customer Ledger":n?"ग्राहक बहीखाता शामिल करें":"Include Customer Ledger","S.No":n?"क्र.सं.":"S.No","Total Qty":n?"कुल मात्रा":"Total Qty"},lt=(h==null?void 0:h.filter(e=>!e.is_current))??[],N=h==null?void 0:h.find(e=>e.is_current),F=lt.reduce((e,i)=>e+parseFloat(i.bill_balance),0),J=parseFloat((N==null?void 0:N.bill_balance)??G),V=F+J;function l(e){return"₹"+parseFloat(e??0).toFixed(2)}function D(e){return new Date(e).toLocaleDateString("en-IN",{dateStyle:"medium"})}const d=({children:e,right:i})=>t.jsx("th",{style:{padding:"9px 12px",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:".04em",textAlign:i?"right":"left",borderBottom:"2px solid #e5e7eb",background:"#f9fafb"},children:e});async function C(e){if(!e||!e.trim())return e;try{const i=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(e)}`;return(await(await fetch(i)).json())[0].map(x=>x[0]).join("")}catch(i){return console.error("Translation error:",i),e}}async function dt(){if(n){_(!1),L(b),H(k);return}E(!0),_(!0);try{let e=JSON.parse(JSON.stringify(b)),i=JSON.parse(JSON.stringify(k));e.customer=await C(b.customer);for(let a=0;a<i.length;a++)i[a].customer&&(i[a].customer=await C(k[a].customer));if(e.items)for(let a=0;a<e.items.length;a++){const c=b.items[a].item_name||b.items[a].code;e.items[a].item_name=await C(c)}L(e),H(i)}catch(e){console.error("Translation failed:",e)}finally{E(!1)}}return t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"no-print print-toolbar",style:{padding:"10px 24px",background:"var(--bg-surface)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},children:[t.jsx(gt,{href:"/billing",className:"print-toolbar-back",style:{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg-card)",color:"var(--text-secondary)",fontSize:13,fontWeight:500,textDecoration:"none"},children:"← Back"}),t.jsxs("div",{className:"print-toolbar-actions",style:{display:"flex",alignItems:"center",gap:10},children:[t.jsxs("div",{onClick:()=>nt(!f),style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:f?"#0ea5e9":"var(--text-secondary)",userSelect:"none",padding:"6px 12px",borderRadius:8,border:`1px solid ${f?"#bae6fd":"var(--border)"}`,background:f?"#e0f2fe":"var(--bg-card)",transition:"all 0.2s",fontWeight:500},children:[t.jsx("span",{style:{display:"inline-flex",width:32,height:16,borderRadius:8,background:f?"#0ea5e9":"#d1d5db",position:"relative",transition:"background 0.2s",flexShrink:0},children:t.jsx("span",{style:{position:"absolute",top:2,left:f?16:2,width:12,height:12,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 2px rgba(0,0,0,0.25)"}})}),"📋 Ledger"]}),t.jsx("div",{style:{width:1,height:26,background:"var(--border)"}}),t.jsx("button",{onClick:dt,disabled:m||u,style:{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",background:n?"#fef9c3":"var(--bg-card)",color:"var(--text-primary)",fontSize:13,fontWeight:500,cursor:m?"not-allowed":"pointer",opacity:m?.65:1},children:m?"⏳ Translating...":n?"🔤 English":"🇮🇳 हिंदी"}),t.jsxs("div",{style:{position:"relative",display:"inline-flex"},onMouseEnter:e=>{const i=e.currentTarget.querySelector(".share-tooltip");i&&(i.style.opacity="1")},onMouseLeave:e=>{const i=e.currentTarget.querySelector(".share-tooltip");i&&(i.style.opacity="0")},children:[t.jsx("button",{onClick:st,disabled:m||u,style:{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:8,border:"none",background:u?"#7dd3fc":"#38bdf8",color:"#fff",fontSize:16,cursor:u?"not-allowed":"pointer",boxShadow:"0 1px 4px rgba(56,189,248,0.35)"},children:u?"⏳":"📤"}),t.jsx("span",{className:"share-tooltip",style:{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#fff",fontSize:11,fontWeight:500,padding:"3px 8px",borderRadius:5,whiteSpace:"nowrap",opacity:0,transition:"opacity 0.15s",pointerEvents:"none",zIndex:10},children:u?"Generating...":"Share PDF"})]}),t.jsx("button",{onClick:at,disabled:m||u,style:{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:8,border:"none",background:"#0ea5e9",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 1px 4px rgba(14,165,233,0.4)"},children:"🖨️ Print"})]})]}),t.jsxs("div",{ref:v,className:`print-page${o.mode==="barcode"?" barcode-print":""}`,style:{padding:"16px 20px",maxWidth:780,margin:"0 auto",background:"#fff",fontFamily:"Inter, system-ui, sans-serif",color:"#111827",border:"1px solid #e5e7eb",borderRadius:8},children:[t.jsxs("div",{className:"invoice-header-3col",style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"2px solid #e5e7eb"},children:[t.jsxs("div",{style:{flex:1,textAlign:"left",fontSize:13,color:"#374151"},children:[r["Bill No"]," ",o.id]}),t.jsx("div",{style:{flex:1,textAlign:"center",fontSize:13,fontWeight:800,color:"#0ea5e9"},children:r.INVOICE}),t.jsx("div",{style:{flex:1,textAlign:"right",fontSize:13,color:"#374151"},children:D(o.created_at)})]}),t.jsxs("div",{className:"invoice-customer-details",style:{marginBottom:16},children:[t.jsx("div",{style:{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4},children:r["Billed To"]}),t.jsx("div",{className:"invoice-customer-name",style:{fontSize:14,fontWeight:700,color:"#111827"},children:o.customer})]}),t.jsx("div",{className:"invoice-table-wrap",children:t.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",marginBottom:16,border:"1px solid #e5e7eb",borderRadius:6,overflow:"hidden"},children:[t.jsx("thead",{children:t.jsxs("tr",{style:{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"},children:[t.jsx(d,{children:r["S.No"]}),t.jsx(d,{children:r.Item}),t.jsx(d,{right:!0,children:r.Qty}),t.jsx(d,{right:!0,children:r.Price}),s&&t.jsx(d,{right:!0,children:t.jsx("span",{style:{color:"#0284c7"},children:p===2?r["Price ÷ 2"]||"Price ÷ 2":p===3?r["Price ÷ 3"]||"Price ÷ 3":`Price ÷ ${p}`})}),(s||S)&&t.jsx(d,{right:!0,children:r["Disc %"]}),(s||S)&&t.jsx(d,{right:!0,children:r["Net Price"]}),t.jsx(d,{right:!0,children:r.Total})]})}),t.jsxs("tbody",{children:[(tt=o.items)==null?void 0:tt.map((e,i)=>{const a=parseFloat(e.selling_price)||0,c=s?a/p:a,x=parseFloat(e.discount_percent)||0,z=x>0?c*(1-x/100):c,y=Math.round((parseFloat(e.quantity)||0)*z*100)/100;return t.jsxs("tr",{style:{borderBottom:"1px solid #f1f5f9",background:i%2===1?"#fafafa":"#ffffff"},children:[t.jsx("td",{style:{padding:"9px 10px",fontSize:12.5,color:"#64748b",textAlign:"center",width:40},children:i+1}),t.jsx("td",{style:{padding:"9px 10px"},children:t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.image_url&&t.jsx("img",{src:e.image_url,alt:e.item_name,style:{width:32,height:32,borderRadius:6,objectFit:"cover",border:"1px solid #e2e8f0",flexShrink:0}}),t.jsxs("div",{children:[t.jsx("div",{style:{fontWeight:600,fontSize:13,color:"#0f172a"},children:e.item_name||e.code}),e.code&&t.jsxs("div",{style:{fontSize:10.5,color:"#94a3b8",marginTop:1},children:["#",e.code]})]})]})}),t.jsx("td",{style:{padding:"9px 10px",textAlign:"right",fontSize:13,fontWeight:600,color:"#1e293b"},children:parseFloat(e.quantity||0)%1===0?parseInt(e.quantity):parseFloat(e.quantity)}),t.jsx("td",{style:{padding:"9px 10px",textAlign:"right",fontSize:12.5,color:s?"#94a3b8":"#1e293b",textDecoration:s?"line-through":"none"},children:l(a)}),s&&t.jsx("td",{style:{padding:"9px 10px",textAlign:"right",fontSize:13,fontWeight:700,color:"#0284c7"},children:l(c)}),(s||S)&&t.jsx("td",{style:{padding:"9px 10px",textAlign:"right",fontSize:12.5},children:x>0?t.jsxs("span",{style:{background:"#fef2f2",color:"#dc2626",fontWeight:700,padding:"2px 6px",borderRadius:4,fontSize:11,border:"1px solid #fecaca"},children:[x,"%"]}):t.jsx("span",{style:{color:"#cbd5e1"},children:"—"})}),(s||S)&&t.jsx("td",{style:{padding:"9px 10px",textAlign:"right",fontSize:13,fontWeight:700,color:"#0f172a"},children:l(z)}),t.jsx("td",{style:{padding:"9px 10px",textAlign:"right",fontWeight:800,fontSize:13.5,color:"#0f172a"},children:l(y)})]},e.id??e.code??i)}),t.jsxs("tr",{style:{borderTop:"2px solid #cbd5e1",background:"#f8fafc"},children:[t.jsxs("td",{colSpan:2,style:{padding:"10px 12px",fontSize:12.5,fontWeight:700,color:"#475569",textAlign:"right",whiteSpace:"nowrap"},children:[r["Total Qty"],":"]}),t.jsx("td",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#0f172a",whiteSpace:"nowrap"},children:A%1===0?A:parseFloat(A.toFixed(2))}),w>0&&t.jsx("td",{colSpan:w}),t.jsxs("td",{style:{padding:"10px 12px",fontSize:12.5,fontWeight:700,color:"#475569",textAlign:"right",whiteSpace:"nowrap"},children:[r.Subtotal,":"]}),t.jsx("td",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#0f172a",whiteSpace:"nowrap"},children:l(W)})]}),s&&O>.005&&t.jsxs("tr",{style:{borderTop:"1px solid #fecaca",background:"#ffffff"},children:[t.jsx("td",{colSpan:2+w}),t.jsx("td",{colSpan:2,style:{padding:"8px 12px",fontSize:12.5,fontWeight:700,color:"#dc2626",textAlign:"right",whiteSpace:"nowrap"},children:p===2?n?"मुल्य ÷ 2 छूट:":"Price ÷ 2 Discount:":p===3?n?"मुल्य ÷ 3 छूट:":"Price ÷ 3 Discount:":`Price ÷ ${p} Discount:`}),t.jsxs("td",{style:{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#dc2626",whiteSpace:"nowrap"},children:["-",l(O)]})]}),$>.005&&t.jsxs("tr",{style:{borderTop:"1px solid #fecaca",background:"#ffffff"},children:[t.jsx("td",{colSpan:2+w}),t.jsx("td",{colSpan:2,style:{padding:"8px 12px",fontSize:12.5,fontWeight:700,color:"#dc2626",textAlign:"right",whiteSpace:"nowrap"},children:n?"आइटम छूट:":"Item Discount:"}),t.jsxs("td",{style:{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#dc2626",whiteSpace:"nowrap"},children:["-",l($)]})]}),t.jsxs("tr",{style:{borderTop:"2px solid #bae6fd",background:"#f0f9ff"},children:[t.jsx("td",{colSpan:2+w}),t.jsxs("td",{colSpan:2,style:{padding:"11px 12px",fontSize:13.5,fontWeight:800,color:"#0369a1",textAlign:"right",whiteSpace:"nowrap"},children:[r["Total Bill Amount"],":"]}),t.jsx("td",{style:{padding:"11px 12px",textAlign:"right",fontSize:15,fontWeight:900,color:"#0284c7",whiteSpace:"nowrap"},children:l(G)})]})]})]})}),t.jsxs("div",{className:"no-print",style:{marginTop:16,padding:12,background:"#f9fafb",borderRadius:8,border:"1px dashed #d1d5db"},children:[t.jsxs("label",{style:{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:14,fontWeight:600,color:"#374151"},children:[t.jsx("input",{type:"checkbox",checked:B,onChange:e=>ot(e.target.checked),style:{width:18,height:18,cursor:"pointer",accentColor:"#0ea5e9"}}),r["Invoice Status"]]}),B&&t.jsx("div",{style:{marginTop:10},children:t.jsx("textarea",{value:P,onChange:e=>rt(e.target.value),placeholder:r["Add Status"]+"...",style:{width:"100%",minHeight:60,padding:10,borderRadius:6,border:"1px solid #d1d5db",fontSize:13,color:"#374151",outline:"none",resize:"vertical",background:"white"}})})]}),B&&(P||"").trim().length>0&&t.jsxs("div",{style:{marginTop:16,padding:"8px 0",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"baseline",gap:10},children:[t.jsxs("span",{style:{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",flexShrink:0},children:[r["Invoice Status"],":"]}),t.jsx("span",{style:{fontSize:13,color:"#111827",whiteSpace:"pre-wrap",fontStyle:"italic",lineBreak:"anywhere"},children:P})]}),f&&h&&h.length>0&&t.jsxs("div",{style:{marginTop:40},children:[t.jsxs("div",{style:{borderTop:"2px solid #e5e7eb",paddingTop:24,marginBottom:16},children:[t.jsxs("div",{style:{fontSize:13,fontWeight:700,marginBottom:2},children:[r["Customer Ledger —"]," ",o.customer]}),t.jsxs("div",{style:{fontSize:11,color:"#9ca3af"},children:[r["All bills as of"]," ",D(new Date)]})]}),t.jsx("div",{className:"invoice-table-wrap",children:t.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:16},children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx(d,{children:r.Date}),t.jsx(d,{children:r["Bill No"]}),t.jsx(d,{right:!0,children:r["Bill Amount"]}),t.jsx(d,{right:!0,children:r.Received}),t.jsx(d,{right:!0,children:r["Balance Due"]})]})}),t.jsx("tbody",{children:h.map(e=>t.jsxs("tr",{style:{borderBottom:"1px solid #f3f4f6",background:e.is_current?"#eff6ff":void 0},children:[t.jsx("td",{style:{padding:"9px 12px",color:"#374151"},children:D(e.created_at)}),t.jsxs("td",{style:{padding:"9px 12px"},children:[t.jsxs("span",{style:{fontWeight:e.is_current?700:400},children:["#",e.id]}),e.is_current&&t.jsx("span",{style:{marginLeft:6,fontSize:10,color:"#0ea5e9",fontWeight:600,background:"#e0f2fe",padding:"1px 5px",borderRadius:3},children:r.current})]}),t.jsx("td",{style:{padding:"9px 12px",textAlign:"right"},children:l(e.total_price)}),t.jsx("td",{style:{padding:"9px 12px",textAlign:"right",color:parseFloat(e.received)<0?"#dc2626":"#16a34a"},children:parseFloat(e.received)!==0?l(e.received):"—"}),t.jsx("td",{style:{padding:"9px 12px",textAlign:"right",fontWeight:600,color:parseFloat(e.bill_balance)>0?"#dc2626":"#16a34a"},children:l(e.bill_balance)})]},e.id))})]})}),t.jsx("div",{className:"ledger-summary-box",style:{display:"flex",justifyContent:"flex-end"},children:t.jsxs("div",{style:{width:"100%",maxWidth:320,border:"1px solid #e5e7eb",borderRadius:6,overflow:"hidden"},children:[F>0&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"9px 14px",fontSize:13,color:"#374151",borderBottom:"1px solid #e5e7eb"},children:[t.jsx("span",{children:r["Previous Balance"]}),t.jsx("span",{style:{color:"#dc2626",fontWeight:500},children:l(F)})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"9px 14px",fontSize:13,color:"#374151",borderBottom:"1px solid #e5e7eb",background:"#eff6ff"},children:[t.jsxs("span",{children:[r["This Bill ("],"#",o.id,")"]}),t.jsx("span",{style:{fontWeight:500},children:l(J)})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"8px 14px",fontSize:13,fontWeight:800,color:V>0?"#dc2626":"#16a34a",background:"#f9fafb"},children:[t.jsx("span",{children:r["Total Outstanding"]}),t.jsx("span",{children:l(V)})]})]})})]})]}),t.jsx("style",{children:`
                .barcode-print,
                .barcode-print * {
                    font-size: 8px !important;
                }
                .barcode-print .invoice-table-wrap table th,
                .barcode-print .invoice-table-wrap table tr,
                .barcode-print .invoice-table-wrap table td,
                .barcode-print .invoice-table-wrap table th *,
                .barcode-print .invoice-table-wrap table tr *,
                .barcode-print .invoice-table-wrap table td * {
                    font-size: 8px !important;
                    line-height: 1.1 !important;
                }
                .barcode-print .invoice-table-wrap table th,
                .barcode-print .invoice-table-wrap table td {
                    padding: 3px 4px !important;
                }
                .barcode-print .invoice-customer-details,
                .barcode-print .invoice-customer-details * {
                    font-size: 8px !important;
                    line-height: 1.1 !important;
                }

                /* ── Responsive: Tablet (≤768px) ── */
                @media (max-width: 768px) {
                    .print-toolbar {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 10px !important;
                        padding: 10px 14px !important;
                    }
                    .print-toolbar-actions {
                        flex-wrap: wrap !important;
                        justify-content: flex-end !important;
                        gap: 8px !important;
                    }
                    .print-page {
                        margin: 8px !important;
                        padding: 14px 12px !important;
                        border-radius: 6px !important;
                        font-size: 12px !important;
                    }
                    .invoice-table-wrap {
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
                    .invoice-table-wrap table td,
                    .invoice-table-wrap table th {
                        font-size: 11px !important;
                        padding: 6px 7px !important;
                    }
                    .invoice-totals {
                        width: 100% !important;
                    }
                    .invoice-totals > div {
                        font-size: 11px !important;
                        max-width: 100% !important;
                    }
                    .ledger-summary-box {
                        width: 100% !important;
                    }
                    .ledger-summary-box div {
                        font-size: 11px !important;
                    }
                }

                /* ── Responsive: Mobile (≤480px) ── */
                @media (max-width: 480px) {
                    .print-toolbar {
                        padding: 6px 8px !important;
                        gap: 6px !important;
                    }
                    .print-toolbar button,
                    .print-toolbar a {
                        font-size: 11px !important;
                        padding: 5px 10px !important;
                    }
                    .print-toolbar-back {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    .print-toolbar-actions {
                        width: 100% !important;
                        justify-content: space-between !important;
                    }
                    .print-page {
                        margin: 2px !important;
                        padding: 8px 6px !important;
                        font-size: 10px !important;
                    }
                    /* Invoice header: Bill # | INVOICE | Date */
                    .invoice-header-3col > div {
                        font-size: 10px !important;
                    }
                    /* Customer name */
                    .invoice-customer-name {
                        font-size: 10px !important;
                    }
                    /* Table header & cells */
                    .invoice-table-wrap table td,
                    .invoice-table-wrap table th {
                        font-size: 9px !important;
                        padding: 4px 5px !important;
                    }
                    /* Totals block */
                    .invoice-totals {
                        width: 100% !important;
                    }
                    .invoice-totals > div,
                    .invoice-totals span {
                        font-size: 10px !important;
                        max-width: 100% !important;
                        padding: 4px 6px !important;
                    }
                    /* Ledger table */
                    .ledger-summary-box,
                    .ledger-summary-box div,
                    .ledger-summary-box span {
                        font-size: 10px !important;
                        max-width: 100% !important;
                    }
                    /* Generic invoice text */
                    .print-page div,
                    .print-page span,
                    .print-page td,
                    .print-page th {
                        font-size: 10px !important;
                    }
                }

                /* ── Print Media ── */
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-page {
                        margin: 0 !important;
                        border: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                        padding: 16px 20px !important;
                    }
                    .invoice-table-wrap {
                        overflow: visible !important;
                    }
                }
            `})]})}export{vt as default};
