// 학생 모의 점검(마무리 · 내 PC 상태 추이 비교): 가짜 DOM 과 가짜 api.get 으로 renderStatus 안의 추이 칸만 확인한다.
// 네트워크·서버·실제 PC 조회 없음. 아래 값은 모두 설명용 합성 값이며 실측이 아니다.
// 실행(on-client 폴더에서): node docs/student-checks/mock-pc-trend.mjs
class N{constructor(t){this.tag=t;this.children=[];this.dataset={};this._t='';this.className='';this.attrs={};this.handlers={};this.isConnected=true}append(...c){this.children.push(...c.filter(Boolean))}setAttribute(k,v){this.attrs[k]=String(v)}set textContent(v){this._t=String(v)}get textContent(){return this._t+this.children.map(c=>c.textContent+(c.tag==='p'?' | ':'')).join('')}addEventListener(e,f){this.handlers[e]=f}focus(){}}
globalThis.document={createElement:t=>new N(t)};
const {createStudentView}=await import(process.argv[2] ?? new URL('../../student/extension.mjs', import.meta.url).href);

const GiB=1024**3;
const ok=(at,cpu,usedGiB)=>({ok:true,meta:{mode:'disconnected'},data:{schema:'aleph.on.pc-status.v1',source:'local-pc',measuredAt:at,metrics:{
  cpu:{state:'ok',usagePercent:cpu,sampleMs:200},memory:{state:'ok',usedBytes:usedGiB*GiB,totalBytes:16*GiB},
  disk:{state:'ok',totalBytes:100*GiB,freeBytes:8*GiB},network:{state:'ok',interfaceCount:2,ipv4Count:2},
  firewall:{state:'ok',profiles:[{name:'Domain',enabled:true},{name:'Private',enabled:true},{name:'Public',enabled:false}]},
  events:{state:'ok',warningCount:0,errorCount:0,truncated:true,sampleLimit:5000,since:at}}}});
const partial=at=>({ok:true,meta:{mode:'disconnected'},data:{schema:'aleph.on.pc-status.v1',source:'local-pc',measuredAt:at,metrics:{
  cpu:{state:'unavailable',reason:'timeout'},memory:{state:'ok',usedBytes:4*GiB,totalBytes:16*GiB},disk:{state:'unavailable',reason:'query_failed'},
  network:{state:'unavailable',reason:'query_failed'},firewall:{state:'unavailable',reason:'permission_denied'},events:{state:'unavailable',reason:'permission_denied'}}}});
const queue=[
  ['첫 표본', ok('2026-10-29T07:00:00Z',20,8)],
  ['두 번째 표본(비교)', ok('2026-10-29T07:00:30Z',35.5,15)],
  ['늦게 도착한 오래된 응답(무시돼야 함)', ok('2026-10-29T06:59:00Z',99,1)],
  ['일부 확인 불가', partial('2026-10-29T07:01:00Z')],
  ['서버 연결 실패', {ok:false,error:{code:'NETWORK_ERROR',message:'로컬 서버에 연결할 수 없습니다.'}}],
  ['허용되지 않은 주소(이전 판)', {ok:false,error:{code:'NOT_ALLOWED',message:'학생 구현에서 허용되지 않은 주소입니다.'}}],
  ['계약과 다른 응답', {ok:true,data:{schema:'other',metrics:{}}}],
];
let next=null;
const v=createStudentView({api:{get:async path=>{if(path!=='/api/pc/status')throw new Error('unexpected path '+path);return next;}},onChange:()=>{}});
const trend=()=>{const root=v.renderStatus({mode:'disconnected',notifications:[],devices:{status:'idle'},sessions:{status:'idle'},diagnostics:{}});return root.children.find(c=>c.attrs['aria-label']==='내 PC 상태 추이 비교');};
const findTag=(n,tag)=>n.tag===tag?n:(n.children||[]).map(c=>findTag(c,tag)).find(Boolean);
const show=(k,box)=>console.log(`[${k}]\n  ${box.textContent.replace(/안내: [^|]*\| /,'').slice(0,900)}`);
show('조회 전',trend());
for(const [k,res] of queue){next=res;const button=findTag(trend(),'button');await button.handlers.click();show(k,trend());}
