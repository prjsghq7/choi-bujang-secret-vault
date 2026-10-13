// 강사 공지는 학생 자료 API와 별도 구역이며 학생 계정의 직접 수정·조회 경로를 제공하지 않습니다.
export default function handler(_request, response) {
  return response.status(403).json({ error: 'Instructor resource is not available in this zone' });
}
