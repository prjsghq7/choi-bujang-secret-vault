// 학생 모의 점검(19단계): 가짜 DOM 으로 student/extension.mjs 의 render 함수만 실행한다. 네트워크·서버 없음.
// 실행(on-client 폴더에서): node docs/student-checks/mock-s19.mjs
class N{constructor(t){this.tag=t;this.children=[];this.dataset={};this._t='';this.className=''}append(...c){this.children.push(...c.filter(Boolean))}set textContent(v){this._t=String(v)}get textContent(){return this._t+this.children.map(c=>c.textContent+(c.tag==='p'?' | ':'')).join('')}addEventListener(){}}
globalThis.document={createElement:t=>new N(t)};
const {createStudentView}=await import(process.argv[2] ?? new URL('../../student/extension.mjs', import.meta.url).href);
const v=createStudentView();
const ev={id:'ev-1',evidence:[{id:'e1',text:'a'},{id:'e2',text:'b'}],rules:[],state:{},supportedActions:['revoke-session']};
const rc={requestId:'11111111-1111-1111-1111-111111111111',receiptId:'22222222-2222-2222-2222-222222222222',eventId:'ev-1',actionId:'revoke-session',status:'pending',version:1,replayed:false};
const base={event:ev,actionId:'revoke-session',target:{id:'subject:u1',generation:3},receipt:rc,observation:null,message:''};
const cases={
 idle:{status:'idle',event:null,actionId:null,target:null,receipt:null,observation:null,message:'조치 제안은 아직 실행되지 않았습니다.'},
 prepared:{...base,status:'prepared',receipt:{...rc,status:'prepared'},confirmationExpiresAt:'2026-10-26T08:00:00Z'},
 executing:{...base,status:'executing'},
 pending:{...base,status:'pending'},
 succeeded:{...base,status:'succeeded',receipt:{...rc,status:'succeeded',replayed:true},observation:{observedAt:'2026-10-26T08:01:00Z',effectApplied:true}},
 succNoObs:{...base,status:'succeeded'},
 mismatch:{...base,status:'succeeded',receipt:{...rc,eventId:'ev-9'},observation:{observedAt:'x',effectApplied:true}},
 unknownMin:{...base,status:'unknown',receipt:{requestId:rc.requestId,status:'unknown'},error:{code:'ACTION_TIMEOUT',message:'결과 불명(unknown)...'}},
 expired:{...base,status:'expired'},
 error:{...base,status:'error',receipt:null,error:{code:'ACTION_DENIED',message:'거절'}},
};
for(const [k,c] of Object.entries(cases)){const r=v.renderAction(structuredClone(c));console.log(`[${k}] ev=${r.dataset.studentActionEvent??'-'} req=${r.dataset.studentActionRequest?'Y':'-'}\n  ${r.textContent.slice(0,330)}`)}
