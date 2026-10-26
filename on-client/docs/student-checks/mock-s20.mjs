// 학생 모의 점검(20단계): 가짜 DOM 으로 student/extension.mjs 의 render 함수만 실행한다. 네트워크·서버 없음.
// 실행(on-client 폴더에서): node docs/student-checks/mock-s20.mjs
class N{constructor(t){this.tag=t;this.children=[];this.dataset={};this._t='';this.className=''}append(...c){this.children.push(...c.filter(Boolean))}set textContent(v){this._t=String(v)}get textContent(){return this._t+this.children.map(c=>c.textContent+(c.tag==='p'?' | ':'')).join('')}addEventListener(){}}
globalThis.document={createElement:t=>new N(t)};
const {createStudentView}=await import(process.argv[2] ?? new URL('../../student/extension.mjs', import.meta.url).href);
const v=createStudentView();
const SRC='https://api.osv.dev/v1/querybatch', H='a'.repeat(64);
const p=(name,version,status,vulns=[])=>({name,version,status,vulnerabilities:vulns,source:SRC,checkedAt:'2026-10-26T08:00:00Z'});
const cases=[
 ['idle',{status:'idle'}],['loading',{status:'loading'}],
 ['error',{status:'error',error:{code:'TIMEOUT',message:'패키지 조회를 확인할 수 없습니다.'}}],
 ['not_checked',{status:'ok',data:{status:'not_checked',code:'NO_APPROVED_PACKAGES',lockfileVersion:3,lockfileHash:H,excluded:{count:12},checkedAt:'2026-10-26T08:00:00Z',packages:[]}}],
 ['complete',{status:'ok',data:{status:'complete',lockfileVersion:3,lockfileHash:H,excluded:{count:0},checkedAt:'2026-10-26T08:01:00Z',packages:[p('jose','5.9.6','none_found'),p('lodash','4.17.20','known_vulnerabilities',[{id:'GHSA-35jh-r3h4-6jhm',modified:'2024-01-01T00:00:00Z'}])]}}],
 ['partial',{status:'ok',data:{status:'partial',lockfileVersion:3,lockfileHash:'b'.repeat(64),excluded:{count:0},checkedAt:'2026-10-26T08:02:00Z',packages:[p('x','1.0.0','unverifiable',[{id:'OSV-1',modified:'2024-01-01T00:00:00Z'}]),p('y','^1.2.0','none_found')]}}],
 ['stale',{status:'ok',data:{status:'complete',lockfileVersion:3,lockfileHash:H,excluded:{count:0},checkedAt:'2026-10-26T07:00:00Z',packages:[]}}],
];
for(const [k,c] of cases){const r=v.renderVulnerabilities(structuredClone(c));const rows=[];const walk=n=>{if(n.dataset&&n.dataset.studentPackageName)rows.push(n.dataset.studentPackageName+'@'+n.dataset.studentPackageVersion);(n.children||[]).forEach(walk)};walk(r);console.log(`[${k}] rows=${rows.join(',')||'-'}\n  ${r.textContent.slice(0,600)}`)}
