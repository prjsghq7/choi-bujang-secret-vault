// 학생 모의 점검(18단계): 가짜 DOM 으로 student/extension.mjs 의 render 함수만 실행한다. 네트워크·서버 없음.
// 실행(on-client 폴더에서): node docs/student-checks/mock-s18.mjs
class N{constructor(t){this.tag=t;this.children=[];this.dataset={};this._t='';this.className=''}append(...c){this.children.push(...c.filter(Boolean))}set textContent(v){this._t=String(v)}get textContent(){return this._t+this.children.map(c=>c.textContent).join('')}addEventListener(){}}
globalThis.document={createElement:t=>new N(t)};
const {createStudentView}=await import(process.argv[2] ?? new URL('../../student/extension.mjs', import.meta.url).href);
const v=createStudentView();
const ev={id:'ev-1',evidence:[{id:'e1',text:'로그인 실패 5회'},{id:'e2',text:'새 기기'}],rules:[{id:'r1',text:'반복 실패 경보'}],state:{access:'denied',session:'unknown',device:'unknown'},supportedActions:[]};
const ok={status:'ok',mode:'demo',data:{summary:'요약',evidenceIds:['e1','e2'],proposals:[],requiresHumanConfirmation:true,executed:false}};
const cases={
 nullEvent:{event:null,explanation:{status:'idle'}},
 errorNull:{event:null,explanation:{status:'error',error:{code:'ON_AI_INVALID_INPUT',message:'설명에 필요한 사건 근거·규칙을 확인할 수 없습니다.'}}},
 loading:{event:ev,explanation:{status:'loading'}},
 ok:{event:ev,explanation:ok,checkedAt:'2026-10-26T00:00:00Z'},
 wrongEvent:{event:{...ev,id:'ev-2',evidence:[{id:'x1',text:'다른'}]},explanation:ok},
 executed:{event:ev,explanation:{...ok,data:{...ok.data,executed:true}}},
 withProposal:{event:{...ev,supportedActions:['revoke-session']},explanation:{...ok,data:{...ok.data,proposals:[{action:'revoke-session',evidenceIds:['e1'],reason:'반복 실패'}]}}},
 badProposal:{event:ev,explanation:{...ok,data:{...ok.data,proposals:[{action:'wipe',evidenceIds:['e1'],reason:'x'}]}}},
};
for(const [k,c] of Object.entries(cases)){const r=v.renderExplanation(structuredClone(c));console.log(`[${k}] attr=${r.dataset.studentExplanationEvent??'-'}\n  ${r.textContent}`)}
