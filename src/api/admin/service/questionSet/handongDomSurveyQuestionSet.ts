import {
  departmentOptions,
  dormitoryOptions,
  genderOptions,
  rcOptions,
  roomTypeOptions,
  semesterGroupOptions,
} from "../../model";
import type {
  MetricType,
  QuestionConfig,
  QuestionSetTemplate,
  QuestionSetTemplateId,
  QuestionSetTemplateQuestion,
  QuestionSetTemplateSection,
  QuestionType,
  SectionType,
} from "../../model";

type SourceQuestion = Readonly<{
  number: number;
  text: string;
  textEn?: string;
}>;

type SectionDefinition = Readonly<{
  sectionKey: string;
  titleKo: string;
  titleEn: string;
  sectionType: SectionType;
  start: number;
  end: number;
  topicKey: string;
  includeSourceNumbers?: readonly number[];
}>;

type ExtraQuestionDefinition = Readonly<{
  sectionKey: string;
  orderScore: number;
  sourceNumber: number;
  questionKey: string;
  titleKo: string;
  titleEn: string;
  questionType: QuestionType;
  metricType: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config: QuestionConfig;
  displayGroup?: string;
  displayGroupEn?: string;
}>;

const DORM_TEMPLATE_ID: QuestionSetTemplateId = "handong-dom-survey-2026-1";

const sectionDefinitions: SectionDefinition[] = [
  { sectionKey: "dorm_25_2_profile", titleKo: "기본 정보", titleEn: "Basic Information", sectionType: "profile", start: 1, end: 6, topicKey: "profile", includeSourceNumbers: [185, 186] },
  { sectionKey: "dorm_25_2_council_programs", titleKo: "자치회 사업", titleEn: "Dorm Union Initiatives", sectionType: "satisfaction", start: 7, end: 23, topicKey: "council_programs" },
  { sectionKey: "dorm_25_2_entry_check_system", titleKo: "입출입 및 점호 시스템", titleEn: "Entry, Exit, and Roll Call System", sectionType: "facility", start: 24, end: 49, topicKey: "entry_check_system" },
  { sectionKey: "dorm_25_2_facilities", titleKo: "생활관 시설", titleEn: "Dormitory Facilities", sectionType: "facility", start: 50, end: 149, topicKey: "facilities" },
  { sectionKey: "dorm_25_2_laundry", titleKo: "세탁 및 건조기", titleEn: "Washing Machines and Dryers", sectionType: "laundry", start: 150, end: 163, topicKey: "laundry" },
  { sectionKey: "dorm_25_2_other_life", titleKo: "기타 생활", titleEn: "Other Living Conditions", sectionType: "general", start: 164, end: 177, topicKey: "other_life" },
  { sectionKey: "dorm_25_2_global_lounge", titleKo: "글로벌 라운지", titleEn: "Handong Global Lounge", sectionType: "global_lounge", start: 178, end: 184, topicKey: "global_lounge" },
];

const timeSlotOptions = [
  "05:00~07:00",
  "07:00~09:00",
  "09:00~11:00",
  "11:00~13:00",
  "13:00~15:00",
  "15:00~17:00",
  "17:00~19:00",
  "19:00~21:00",
  "21:00~23:00",
].map((label) => ({ value: stableValue(label), labelKo: label }));

const participantImageTagConfig = {
  maxTags: 3,
  tagTypes: ["불편", "수리 요청", "개선 제안", "기타"],
  tagTypesEn: ["Inconvenience", "Repair Request", "Improvement Suggestion", "Other"],
  enableZoom: true,
  requireText: true,
  maxFileSizeMb: 10,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const extraQuestionDefinitions: ExtraQuestionDefinition[] = [
  participantImageQuestion(
    195,
    64.5,
    "question_mpqzy65n",
    "화장실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the bathroom, please upload an image and tag the relevant area.",
    "'화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Bathroom'?",
  ),
  participantImageQuestion(
    196,
    71.5,
    "question_mpr07j52",
    "샤워실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the shower room, please upload an image and tag the relevant area.",
    "'샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Shower Room'?",
  ),
  participantImageQuestion(
    197,
    76.5,
    "1",
    "1층 로비 공용 공간과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the 1st floor lobby common area, please upload an image and tag the relevant area.",
    "'1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?",
  ),
  participantImageQuestion(
    198,
    82.5,
    "question_mpr05np9",
    "복도 공용 공간과 관련하여 건의/문의할 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the hallway common area, please upload an image and tag the relevant area.",
    "'복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Hallway Common Area'?",
  ),
  participantImageQuestion(
    199,
    88.5,
    "question_mpr04h83",
    "쓰레기통 및 분리수거 시설과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding trash bins and recycling facilities, please upload an image and tag the relevant area.",
    "'쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'?",
  ),
  participantImageQuestion(
    200,
    97.5,
    "question_mpr02eg3",
    "취사공간과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the cooking area, please upload an image and tag the relevant area.",
    "'취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?",
  ),
  participantImageQuestion(
    201,
    105.5,
    "question_mpr01hnh",
    "'휴게 및 모임 공간'과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding rest and meeting areas, please upload an image and tag the relevant area.",
    "'휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?",
  ),
  participantImageQuestion(
    202,
    111.5,
    "question_mpr008n6",
    "'공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding study areas, please upload an image and tag the relevant area.",
    "'공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'?",
  ),
  participantImageQuestion(
    203,
    119.5,
    "question_mpqzwsvd",
    "운동 공간과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding sports areas, please upload an image and tag the relevant area.",
    "운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?",
  ),
  participantImageQuestion(
    204,
    127.5,
    "question_mpqzv2pv",
    "기도실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the prayer room, please upload an image and tag the relevant area.",
    "'기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Prayer Room'?",
  ),
  participantImageQuestion(
    205,
    135.5,
    "question_mpqzvr9k",
    "엘리베이터와 관련하여 건의/문의하고 싳은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the elevator, please upload an image and tag the relevant area.",
    "'엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Elevator'?",
  ),
  participantImageQuestion(
    206,
    149.5,
    "question_mpqzpnc2",
    "'생활관 시설'과 관련하여 개선되어야 할 점이 있다면, 이미지를 업로드하고 태깅으로 건의해주세요.",
    "If there are any areas for improvement regarding dormitory facilities, please upload an image and tag the relevant area.",
  ),
  participantImageQuestion(
    207,
    184.5,
    "question_mpqzsirp",
    "글로벌 라운지와 관련하여 건의/문의하고 싶은 내용이 있다면, 이미지를 올려서 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the Handong Global Lounge, please upload an image and tag the relevant area.",
    undefined,
    undefined,
    "dorm_25_2_global_lounge",
  ),
];

const extraOrderByQuestionKey = new Map(extraQuestionDefinitions.map((question) => [question.questionKey, question.orderScore]));

const rawQuestionText = `
1. 성별
2. 학기
3. 학부 (1전공 기준)
4. 소속 RC
5. 인실
6. 거주 생활관
7. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(1) 입주 업무 (택배 관리 및 정리, 차량 통제, 끌차 대여)]
8. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(2) 오피스 아워 (게시물 승인)]
9. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(3) 방시간표 및 방 체크리스트]
10. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(4) RC 월간소식지]
11. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(5) 하용조관 헬스장 신청]
12. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(6) 재난대피훈련]
13. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(7) 샤워기 필터 보급]
14. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(8) 생활관 몰래카메라 탐지]
15. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(9) 생활관 정기 설문조사]
16. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(1) 푸드트럭 할인 쿠폰 증정 이벤트]
17. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(2) 한동컵]
18. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(3) 트립 프롬 한동]
19. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(4) 기말고사 파이팅 간식 증정 이벤트]
20. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 소통 부문) [(1) 소통 창구 1 - 이메일 문의]
21. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 소통 부문) [(2) 소통 창구 2 - 오피스 아워 대면 문의]
22. ‘자치회 사업’과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
23. ‘자치회 사업’과 관련하여 만족스러웠던 점이 있다면, 자유롭게 적어주세요.
24. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 침묵시간 운영시간]
25. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 침묵시간 규칙 준수]
26. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 침묵시간 관리 방법]
27. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(4) 침묵시간 효과성]
28. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 소등시간]
29. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 소등 여부]
30. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 소등 후 활동 편의성]
31. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(4) 소등 후 안전성과 이동 편리성]
32. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(5) 소등제도 관리]
33. '인원점검'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 인원점검 시간]
34. '인원점검'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 인원점검 방식]
35. '인원점검'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 인원점검 빈도]
36. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 점호방송 시간]
37. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 점호방송 내용]
38. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 점호방송 음량]
39. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(4) 점호방송 방식]
40. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(5) 점호방송 정보전달 및 질서유지 효과]
41. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(6) 점호방송 피드백 반영]
42. '만족'을 선택해주세요.
43. '외출 제한 시간(01:00 ~ 04:00)'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 외출제한시간 적절성]
44. '외출 제한 시간(01:00 ~ 04:00)'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 외출제한시간의 관리 및 적용]
45. '외출 제한 시간(01:00 ~ 04:00)'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 외출제한시간의 안전 및 질서유지 효과]
46. '외박 신청' & '늦은 복귀 신청'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 절차의 간편성]
47. '외박 신청' & '늦은 복귀 신청'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 신청 가능 시간]
48. '외박 신청' & '늦은 복귀 신청'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 기록 관리 및 긴급 상황 시 예외 처리]
49. '입출입 및 점호 시스템(침묵시간, 소등제도, 인원점검, 점호방송, 외출 제한 시간, 외박 신청)'과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
50. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 호실 크기]
51. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 호실 수납 공간 (옷장, 서랍 등)]
52. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 호실 가구 상태 (책상, 의자, 침대 등)]
53. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 조명 환경(조명, 자연광 유입 정도)]
54. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 문 (방음, 단열, 보안 등)]
55. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 벽 (방음, 단열)]
56. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 창문 (방음, 단열, 환기 등)]
57. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 화재 안전 장비 (화재 경보기 등)]
58. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(9) 인터넷 속도 및 연결 안정성]
59. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(10) 전기 공급(콘센트 수, 위치)]
60. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(11) 빨래 건조대]
61. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 상태 (공간 크기, 변기, 세면대 등)]
62. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 환기 상태]
63. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 용품 비치 (슬리퍼, 휴지, 비누 등)]
64. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 청결 및 위생 상태]
65. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 상태 (공간 크기, 샤워기 등)]
66. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 환기 상태]
67. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 이용 편리성]
68. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 안전성]
69. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 수질]
70. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 온수 공급]
71. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 청결 및 위생 상태]
72. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
73. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 가구 및 설비 상태 ]
74. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
75. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 편리성]
76. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 청결 및 위생 상태]
77. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 및 시설 상태]
78. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 조명 상태]
79. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 환기 상태]
80. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 안전성]
81. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 통행 편리성]
82. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 청결 및 위생 상태]
83. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 위치와 접근성 ]
84. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 분리수거 체계]
85. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 용량과 크기]
86. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 수거 주기 및 관리 상태]
87. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 환기 상태]
88. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 청결 및 위생 상태]
89. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 위치와 접근성]
90. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설비 상태]
91. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 용품 및 비치 상태]
92. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 공용 냉장고 관리 상태]
93. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 공간 충분성]
94. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 환기 상태]
95. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 안전성]
96. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 편리성]
97. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(9) 청결 및 위생 상태]
98. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
99. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 가구 상태]
100. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
101. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 환기 상태]
102. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 설비 및 편의성]
103. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 안전성]
104. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 소음 관리]
105. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
106. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
107. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 가구 상태 (책상, 의자 등)]
108. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
109. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 사용 규칙 안내 및 준수]
110. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 소음 관리]
111. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 청결 및 위생 상태]
112. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
113. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 기구 및 설비 상태]
114. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
115. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 환기 상태]
116. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 소음 관리]
117. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 이용 편의성]
118. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 이용 시간 및 규칙 안내]
119. '운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
120. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
121. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설비 상태]
122. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
123. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 환기 상태]
124. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 분위기 및 환경]
125. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 소음 차단 및 프라이버시 보호]
126. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 이용 규칙 안내 및 준수]
127. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
128. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 대기시간]
129. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설비 상태 및 작동 안전성]
130. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 운행 용량 및 효율성]
131. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 소음 및 진동]
132. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 환기 상태]
133. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 위치 및 접근성]
134. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 운영 시간 및 규칙 안내]
135. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
136. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 비치 도구의 양]
137. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 비치 도구의 질]
138. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 비치 도구의 다양성]
139. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 위치 및 접근성]
140. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 관리 상태]
141. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 상태 및 작동 안정성]
142. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설정 온도 및 온도 조절]
143. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 소음 및 진동]
144. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 공기 순환 및 환기 상태]
145. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 냉난방 전환 시기]
146. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 운영 시간]
147. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 에너지 효율성 및 환경 친화성]
148. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
149. '생활관 시설'과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
150. 세탁기 및 건조기 관리가 잘 이루어지고 있습니까? [세탁기]
151. 세탁기 및 건조기 관리가 잘 이루어지고 있습니까? [건조기]
152. 불만족 또는 매우 불만족을 선택하셨다면, 그 이유는 무엇인가요?
153. 세탁기 및 건조기 청소 및 관리에 있어서 부족하다고 생각하는 점은 무엇입니까?
154. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [05:00~07:00]
155. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [07:00~09:00]
156. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [09:00~11:00]
157. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [11:00~13:00]
158. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [13:00~15:00]
159. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [15:00~17:00]
160. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [17:00~19:00]
161. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [19:00~21:00]
162. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [21:00~23:00]
163. 세탁기 및 건조기를 사용하지 않아 청소 및 점검이 이루어지기를 선호하는 시간대는 언제입니까? (평일 기준, 하나만 선택 가능)
164. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(1) 방 배정]
165. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(2) RC별 행사 및 사업]
166. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(3) 상점제도]
167. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(4) 벌점제도]
168. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(1) 팀 기준]
169. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(2) 전공 기준]
170. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(3) 기상 패턴 기준]
171. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(4) 생활 습관 (청결) 기준]
172. '매우 중요하다'를 선택해주세요.
173. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 방 배정]
174. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) RC별 행사 및 사업]
175. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 상점제도]
176. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 벌점제도]
177. ‘기타 생활(방 배정, RC별 행사 및 사업, 상벌점제도)’과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
178. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [설비 상태]
179. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [용품 및 비치 상태]
180. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [청결 및 위생 상태]
181. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [환기 상태]
182. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [이용 시간]
183. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [안전성]
184. 기타 글로벌 라운지와 관련하여 건의/문의하고 싶은 내용이 있다면, 자유롭게 적어주세요.
185. 학번 (예. 22400001)
186. 이름 (예. 김한동)
`;

const rawEnglishQuestionText = `
1. Gender
2. Semester
3. Department (1st Major)
4. Respective RC
5. Room type
6. Dormitory
7. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(1) Move-in Services (Package Management and Organization, Vehicle Control, Cart Rental)]
8. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(2) Office Hours (Post Approval)]
9. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(3) Room Timetable and Room Checklist]
10. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(4) RC Monthly Newsletter]
11. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(5) Hayongjo Hall Gym Registration]
12. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(6) Emergency Evacuation Drill]
13. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(7) Shower Filter Distribution]
14. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(8) Hidden Camera Detection in Dormitories]
15. What is your level of satisfaction with the following Dorm Union initiatives? (Student Welfare Section) [(9) Regular Dormitory Survey]
16. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section) [(1) Food Truck Discount Coupon Event]
17. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section) [(2) Handong Cup]
18. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section) [(3) Trip from Handong]
19. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section) [(4) Final Exam Encouragement Snack Event]
20. What is your level of satisfaction with the following Dorm Union initiatives? (Student Communication Section) [(1) Communication Channel 1 - Email Inquiries]
21. What is your level of satisfaction with the following Dorm Union initiatives? (Student Communication Section) [(2) Communication Channel 2 - In-person Office Hours Inquiries]
22. If there are any areas for improvement regarding the 'Dorm Union initiatives', please feel free to share.
23. If there are any aspects of the 'Dorm Union initiatives' that you were satisfied with, please feel free to share.
24. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(1) Silent Hours Operating Hours]
25. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(2) Compliance with Silent Hours Rules]
26. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(3) Management of Silent Hours]
27. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(4) Effectiveness of Silent Hours]
28. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(1) Lights Out Time]
29. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(2) Lights Out Compliance]
30. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(3) Convenience of Activities After Lights Out]
31. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(4) Safety and Mobility Convenience After Lights Out]
32. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(5) Management of the Lights Out System]
33. What is your level of satisfaction with the following aspects related to 'Roll Call'? [(1) Roll Call Time]
34. What is your level of satisfaction with the following aspects related to 'Roll Call'? [(2) Roll Call Method]
35. What is your level of satisfaction with the following aspects related to 'Roll Call'? [(3) Roll Call Frequency]
36. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'? [(1) Roll Call Announcement Time]
37. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'? [(2) Roll Call Announcement Content]
38. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'? [(3) Roll Call Volume]
39. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'? [(4) Roll Call Method]
40. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'? [(5) Effectiveness of Information Delivery and Order Maintenance in the Roll Call Announcement]
41. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'? [(6) Incorporation of Feedback in the Roll Call Announcement]
42. Please select 'Satisfied'.
43. What is your level of satisfaction with the following aspects of the 'Curfew Hours (01:00 AM - 04:00 AM)'? [(1) Appropriateness of Curfew Hours]
44. What is your level of satisfaction with the following aspects of the 'Curfew Hours (01:00 AM - 04:00 AM)'? [(2) Management and Implementation of Curfew Hours]
45. What is your level of satisfaction with the following aspects of the 'Curfew Hours (01:00 AM - 04:00 AM)'? [(3) Safety and Order Maintenance Effectiveness During Curfew Hours]
46. What is your level of satisfaction with the following aspects of 'Overnight Stay Request' & 'Late Return Request'? [(1) Simplicity of the Procedure]
47. What is your level of satisfaction with the following aspects of 'Overnight Stay Request' & 'Late Return Request'? [(2) Available Application Times]
48. What is your level of satisfaction with the following aspects of 'Overnight Stay Request' & 'Late Return Request'? [(3) Record Management and Handling of Exceptions in Emergency Situations]
49. If there are any areas for improvement regarding the 'Entry/Exit and Roll Call System' (Silent Hours, Lights Out System, Roll Call, Roll Call Announcement, Curfew Hours, Overnight Stay Request), please feel free to share your thoughts.
50. What is your level of satisfaction with the following aspects of the 'Room'? [(1) Room size]
51. What is your level of satisfaction with the following aspects of the 'Room'? [(2) Room Storage Space (Wardrobe, Drawers, etc.)]
52. What is your level of satisfaction with the following aspects of the 'Room'? [(3) Condition of Room Furniture (Desk, Chair, Bed, etc.)]
53. What is your level of satisfaction with the following aspects of the 'Room'? [(4) Lighting Environment (Lighting, Natural Light Inflow)]
54. What is your level of satisfaction with the following aspects of the 'Room'? [(5) Door (Soundproofing, Insulation, Security, etc.)]
55. What is your level of satisfaction with the following aspects of the 'Room'? [(6) Walls (Soundproofing, Insulation)]
56. What is your level of satisfaction with the following aspects of the 'Room'? [(7) Windows (Soundproofing, Insulation, Ventilation, etc.)]
57. What is your level of satisfaction with the following aspects of the 'Room'? [(8) Fire safety equipment (fire alarms, etc.)]
58. What is your level of satisfaction with the following aspects of the 'Room'? [(9) Internet Speed and Connection Stability]
59. What is your level of satisfaction with the following aspects of the 'Room'? [(10) Electrical Supply (Number of Outlets, Location)]
60. What is your level of satisfaction with the following aspects of the 'Room'? [(11) Laundry Drying Rack]
61. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(1) Condition of Facilities (Space Size, Toilet, Sink, etc.)]
62. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(2) Ventilation]
63. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(3) Availability of Supplies (Slippers, Toilet Paper, Soap, etc.)]
64. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(4) Cleanliness and Hygiene]
65. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(1) Condition of Facilities (Space Size, Showerhead, etc.)]
66. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(2) Ventilation]
67. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(3) Convenience of Use]
68. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(4) Safety]
69. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(5) Water Quality]
70. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(6) Hot Water Supply]
71. What is your level of satisfaction with the following aspects of the 'Shower Room'? [(7) Cleanliness and Hygiene]
72. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'? [(1) Adequacy of Space]
73. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'? [(2) Condition of Furniture and Facilities]
74. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'? [(3) Lighting Condition]
75. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'? [(4) Convenience]
76. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'? [(5) Cleanliness and Hygiene]
77. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(1) Condition of Facilities and Equipment]
78. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(2) Lighting Condition]
79. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(3) Ventilation]
80. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(4) Safety]
81. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(5) Ease of Passage]
82. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(6) Cleanliness and Hygiene]
83. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(1) Location and Accessibility]
84. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(2) Recycling System]
85. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(3) Capacity and Size]
86. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(4) Collection Cycle and Management]
87. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(5) Ventilation]
88. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(6) Cleanliness and Hygiene]
89. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(1) Location and Accessibility]
90. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(2) Condition of Facilities]
91. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(3) Availability of Supplies]
92. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(4) Management of Shared Refrigerators]
93. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(5) Adequacy of Space]
94. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(6) Ventilation]
95. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(7) Safety]
96. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(8) Convenience]
97. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'? [(9) Cleanliness and Hygiene]
98. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(1) Adequacy of Space]
99. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(2) Condition of Furniture]
100. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(3) Lighting Condition]
101. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(4) Ventilation]
102. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(5) Convenience]
103. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(6) Safety]
104. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(7) Noise Management]
105. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'? [(8) Cleanliness and Hygiene]
106. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(1) Adequacy of Space]
107. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(2) Condition of Furniture (Desks, Chairs, etc.)]
108. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(3) Lighting Condition]
109. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(4) Guidance and Compliance with Usage Rules]
110. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(5) Noise Management]
111. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(6) Cleanliness and Hygiene]
112. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(1) Adequacy of Space]
113. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(2) Condition of Equipment and Facilities]
114. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(3) Lighting Condition]
115. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(4) Ventilation]
116. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(5) Noise Management]
117. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(6) Ease of Use]
118. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(7) Usage Hours and Rules Guidance]
119. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'? [(8) Cleanliness and Hygiene]
120. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(1) Adequacy of Space]
121. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(2) Condition of Facilities]
122. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(3) Lighting Condition]
123. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(4) Ventilation]
124. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(5) Atmosphere and Environment]
125. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(6) Noise Blocking and Privacy Protection]
126. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(7) Guidance and Compliance with Usage Rules]
127. What is your level of satisfaction with the following aspects of the 'Prayer Room'? [(8) Cleanliness and Hygiene]
128. What is your level of satisfaction with the following aspects of the 'Elevator'? [(1) Waiting Time]
129. What is your level of satisfaction with the following aspects of the 'Elevator'? [(2) Condition of Equipment and Operational Safety]
130. What is your level of satisfaction with the following aspects of the 'Elevator'? [(3) Capacity and Efficiency]
131. What is your level of satisfaction with the following aspects of the 'Elevator'? [(4) Noise and Vibration]
132. What is your level of satisfaction with the following aspects of the 'Elevator'? [(5) Ventilation]
133. What is your level of satisfaction with the following aspects of the 'Elevator'? [(6) Location and Accessibility]
134. What is your level of satisfaction with the following aspects of the 'Elevator'? [(7) Operating Hours and Rules Guidance]
135. What is your level of satisfaction with the following aspects of the 'Elevator'? [(8) Cleanliness and Hygiene]
136. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'? [(1) Quantity of Available Tools]
137. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'? [(2) Quality of Available Tools]
138. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'? [(3) Variety of Available Tools]
139. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'? [(4) Location and Accessibility]
140. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'? [(5) Condition and Management]
141. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(1) Condition of Equipment and Operational Stability]
142. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(2) Set Temperature and Temperature Control]
143. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(3) Noise and Vibration]
144. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(4) Air Circulation and Ventilation]
145. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(5) Timing of Heating/Cooling Transition]
146. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(6) Operating Hours]
147. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(7) Energy Efficiency and Environmental Friendliness]
148. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(8) Cleanliness and Hygiene]
149. If there are any areas for improvement regarding the 'Dormitory Facilities', please feel free to share your thoughts.
150. Is the management of the washing machines and dryers being carried out effectively? [Washing Machine]
151. Is the management of the washing machines and dryers being carried out effectively? [Dryer]
152. If you selected 'Dissatisfied' or 'Very Dissatisfied', what is the reason?
153. What do you think is lacking in the cleaning and maintenance of the washing machines and dryers?
154. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [05:00~07:00]
155. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [07:00~09:00]
156. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [09:00~11:00]
157. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [11:00~13:00]
158. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [13:00~15:00]
159. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [15:00~17:00]
160. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [17:00~19:00]
161. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [19:00~21:00]
162. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [21:00~23:00]
163. What time of day would you prefer cleaning and inspections of the washing machines and dryers to be conducted, considering you do not use them? (Weekdays only, please select one option)
164. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'? [(1) Room Assignment]
165. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'? [(2) RC-specific Events and Programs]
166. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'? [(3) Reward Points System]
167. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'? [(4) Penalty Points System]
168. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(1) Team-based Criteria]
169. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(2) Major-based Criteria]
170. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(3) Wake-up Pattern-based Criteria]
171. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(4) Lifestyle Habits (Cleanliness)-based Criteria]
172. Please select 'Very Important'.
173. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(1) Room Assignment]
174. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(2) RC-specific Events and Programs]
175. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(3) Reward Points System]
176. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(4) Penalty Points System]
177. If there are any areas for improvement regarding 'Other Living Conditions' (Room Assignment, RC-specific Events and Programs, Reward and Penalty Points System), please feel free to share your thoughts.
178. What is your level of satisfaction with the following aspects of the Handong Global Lounge? [Condition of Facilities]
179. What is your level of satisfaction with the following aspects of the Handong Global Lounge? [Availability of Supplies]
180. What is your level of satisfaction with the following aspects of the Handong Global Lounge? [Cleanliness and Hygiene]
181. What is your level of satisfaction with the following aspects of the Handong Global Lounge? [Ventilation]
182. What is your level of satisfaction with the following aspects of the Handong Global Lounge? [Operating Hours]
183. What is your level of satisfaction with the following aspects of the Handong Global Lounge? [Safety]
184. If you have any suggestions or inquiries regarding the Handong Global Lounge, please feel free to share them.
185. Student ID (e.g., 22400001)
186. Name (e.g., Kim Handong)
`;

export function getQuestionSetTemplate(templateId: QuestionSetTemplateId): QuestionSetTemplate {
  if (templateId !== DORM_TEMPLATE_ID) {
    throw new Error(`Unknown question set template: ${templateId}`);
  }

  const sourceQuestions = mergeSourceQuestions(parseSourceQuestions(rawQuestionText), parseSourceQuestions(rawEnglishQuestionText));
  return {
    templateId,
    title: "2026년도 1학기 생활관 정기 설문조사 질문 목록",
    sections: sectionDefinitions.map((section, orderIndex) => toTemplateSection(section, sourceQuestions, orderIndex)),
  };
}

function toTemplateSection(
  section: SectionDefinition,
  sourceQuestions: SourceQuestion[],
  orderIndex: number,
): QuestionSetTemplateSection {
  return {
    sectionKey: section.sectionKey,
    title: { ko: section.titleKo, en: section.titleEn },
    sectionType: section.sectionType,
    settings: {
      sourceTemplateId: DORM_TEMPLATE_ID,
      templateOrderIndex: orderIndex,
    },
    questions: [
      ...sourceQuestions
        .filter((question) => isSourceQuestionInSection(question, section))
        .map((question, questionOrderIndex) => toTemplateQuestion(question, section, questionOrderIndex)),
      ...extraQuestionDefinitions
        .filter((question) => question.sectionKey === section.sectionKey)
        .map((question) => toExtraTemplateQuestion(question, section)),
    ].sort((left, right) => getQuestionOrderScore(left) - getQuestionOrderScore(right)),
  };
}

function toTemplateQuestion(
  source: SourceQuestion,
  section: SectionDefinition,
  orderIndex: number,
): QuestionSetTemplateQuestion {
  const questionType = inferQuestionType(source);
  const metricType = inferMetricType(source, questionType);
  const displayGroup = inferDisplayGroup(source.text);
  const englishText = source.textEn ? normalizeEnglishQuestionText(source.textEn) : undefined;
  const displayGroupEn = englishText ? inferDisplayGroup(englishText) : undefined;
  const titleEn = englishText ? inferQuestionTitle(englishText, displayGroupEn) : undefined;
  return {
    sourceNumber: source.number,
    questionKey: `dorm_25_2_q${source.number.toString().padStart(3, "0")}`,
    title: titleEn ? { ko: inferQuestionTitle(source.text, displayGroup), en: titleEn } : { ko: inferQuestionTitle(source.text, displayGroup) },
    questionType,
    metricType,
    topicKey: section.topicKey,
    spaceKey: inferSpaceKey(source.text),
    config: withEnglishDisplayGroup(inferConfig(source, questionType, metricType), displayGroupEn),
    validation: {},
    isRequired: true,
    displayGroup,
    displayGroupEn,
  };
}

function isSourceQuestionInSection(question: SourceQuestion, section: SectionDefinition): boolean {
  return (question.number >= section.start && question.number <= section.end) || Boolean(section.includeSourceNumbers?.includes(question.number));
}

function toExtraTemplateQuestion(
  source: ExtraQuestionDefinition,
  section: SectionDefinition,
): QuestionSetTemplateQuestion {
  return {
    sourceNumber: source.sourceNumber,
    questionKey: source.questionKey,
    title: { ko: source.titleKo, en: source.titleEn },
    questionType: source.questionType,
    metricType: source.metricType,
    topicKey: source.topicKey ?? section.topicKey,
    spaceKey: source.spaceKey,
    config: withExtraDisplayGroups(source.config, source.displayGroup, source.displayGroupEn),
    validation: {},
    isRequired: true,
    displayGroup: source.displayGroup,
    displayGroupEn: source.displayGroupEn,
  };
}

function getQuestionOrderScore(question: QuestionSetTemplateQuestion): number {
  return extraOrderByQuestionKey.get(question.questionKey) ?? getSourceQuestionOrderScore(question.sourceNumber);
}

function getSourceQuestionOrderScore(sourceNumber: number): number {
  if (sourceNumber === 185) return 6.5;
  if (sourceNumber === 186) return 6.6;
  return sourceNumber;
}

function participantImageQuestion(
  sourceNumber: number,
  orderScore: number,
  questionKey: string,
  titleKo: string,
  titleEn: string,
  displayGroup?: string,
  displayGroupEn?: string,
  sectionKey = "dorm_25_2_facilities",
): ExtraQuestionDefinition {
  return {
    sectionKey,
    orderScore,
    sourceNumber,
    questionKey,
    titleKo,
    titleEn,
    questionType: "participant_image_tag",
    metricType: "none",
    config: participantImageTagConfig,
    displayGroup,
    displayGroupEn,
  };
}

function parseSourceQuestions(value: string): SourceQuestion[] {
  return value
    .trim()
    .split(/\n+/)
    .map((line) => {
      const match = line.match(/^(\d+)\.\s+(.+)$/);
      if (!match) return null;
      return {
        number: Number(match[1]),
        text: match[2].trim(),
      };
    })
    .filter((question): question is SourceQuestion => Boolean(question));
}

function mergeSourceQuestions(koreanQuestions: SourceQuestion[], englishQuestions: SourceQuestion[]): SourceQuestion[] {
  const englishTextByNumber = new Map(englishQuestions.map((question) => [question.number, question.text] as const));
  return koreanQuestions.map((question) => ({
    ...question,
    textEn: englishTextByNumber.get(question.number),
  }));
}

function normalizeEnglishQuestionText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^\d+(?:-\d+)?\.\s+/, "")
    .trim();
}

function withEnglishDisplayGroup(config: QuestionConfig, displayGroupEn: string | undefined): QuestionConfig {
  if (!displayGroupEn) return config;
  return {
    ...(config as Record<string, unknown>),
    displayGroupEn,
  };
}

function withExtraDisplayGroups(config: QuestionConfig, displayGroup: string | undefined, displayGroupEn: string | undefined): QuestionConfig {
  if (!displayGroup && !displayGroupEn) return config;
  return {
    ...(config as Record<string, unknown>),
    ...(displayGroup ? { displayGroup } : {}),
    ...(displayGroupEn ? { displayGroupEn } : {}),
  };
}

function inferQuestionType(source: SourceQuestion): QuestionType {
  const text = source.text;
  if (text.includes("선택해주세요")) return "attention_check";
  if (source.number <= 6 || isIdentityProfileQuestion(source)) return "profile";
  if (hasAny(text, ["자유롭게", "이유", "부족", "건의/문의"])) return "text";
  if (text.includes("중복 선택 가능")) return "multi_select";
  if (text.includes("하나만 선택 가능")) return "single_choice";
  if (hasAny(text, ["만족도", "중요도", "관리가 잘 이루어지고"])) return "scale";
  return "text";
}

function isIdentityProfileQuestion(source: SourceQuestion): boolean {
  return source.text.startsWith("학번") || source.text.startsWith("이름");
}

function inferMetricType(source: SourceQuestion, questionType: QuestionType): MetricType {
  if (source.text.includes("선택해주세요")) return "none";
  if (questionType === "attention_check" || questionType === "text" || questionType === "profile") return "none";
  if (source.text.includes("중요도") || source.text.includes("매우 중요하다")) return "importance";
  if (questionType === "scale") return "satisfaction";
  return "none";
}

function inferConfig(source: SourceQuestion, questionType: QuestionType, metricType: MetricType): QuestionConfig {
  if (questionType === "scale") {
    return metricType === "importance"
      ? {
          scaleMin: 1,
          scaleMax: 5,
          labelsKo: ["전혀 중요하지 않음", "중요하지 않음", "보통", "중요함", "매우 중요함"],
          labelsEn: ["Not important at all", "Not important", "Neutral", "Important", "Very important"],
        }
      : {
          scaleMin: 1,
          scaleMax: 7,
          labelsKo: ["참여경험없음", "매우 불만족", "불만족", "보통", "만족", "매우 만족", "들어본 적 없음"],
          labelsEn: ["No participation experience", "Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied", "Never heard of it"],
          excludedValues: [1, 7],
        };
  }

  if (questionType === "attention_check") {
    const isImportanceCheck = source.text.includes("중요");
    return {
      scaleMin: 1,
      scaleMax: isImportanceCheck ? 5 : 7,
      labelsKo: isImportanceCheck ? ["전혀 중요하지 않음", "중요하지 않음", "보통", "중요함", "매우 중요함"] : ["참여경험없음", "매우 불만족", "불만족", "보통", "만족", "매우 만족", "들어본 적 없음"],
      labelsEn: isImportanceCheck ? ["Not important at all", "Not important", "Neutral", "Important", "Very important"] : ["No participation experience", "Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied", "Never heard of it"],
      expectedValue: inferAttentionCheckExpectedValue(source.text, isImportanceCheck),
      excludeIfFailed: true,
    };
  }

  if (questionType === "single_choice") {
    return {
      options: source.text.includes("선택해주세요")
        ? source.text.includes("매우 중요하다")
          ? importanceScaleChoiceOptions()
          : satisfactionScaleChoiceOptions()
        : source.number === 163
          ? timeSlotOptions
          : yesNoOptions(),
    };
  }

  if (questionType === "multi_select") {
    const label = inferBracketLabel(source.text) ?? "해당";
    const labelEn = source.textEn ? inferBracketLabel(normalizeEnglishQuestionText(source.textEn)) : undefined;
    return {
      minSelect: 0,
      options: [{ value: stableValue(label), labelKo: label, ...(labelEn ? { labelEn: stripItemNumber(labelEn) } : {}) }],
    };
  }

  if (questionType === "profile") {
    return inferProfileConfig(source);
  }

  if (questionType === "text") {
    return {
      multiline: true,
      maxLength: 1000,
    };
  }

  return {};
}

function inferProfileConfig(source: SourceQuestion): QuestionConfig {
  const profileFieldByNumber: Record<number, string> = {
    1: "gender",
    2: "semester_group",
    3: "department",
    4: "rc",
    5: "room_type",
    6: "dormitory",
    185: "student_number",
    186: "name",
  };
  const profileField = profileFieldByNumber[source.number] ?? `profile_${source.number}`;
  const optionsByField: Record<string, Array<{ value: string; labelKo: string; labelEn?: string }>> = {
    gender: toLocalizedChoiceOptions(genderOptions, {
      남성: "Male",
      여성: "Female",
    }),
    semester_group: toLocalizedChoiceOptions(semesterGroupOptions, {
      "1-2학기": "1st-2nd semester",
      "3-4학기": "3rd-4th semester",
      "5-6학기": "5th-6th semester",
      "7-8학기": "7th-8th semester",
      "9학기이상": "9th semester or above",
    }),
    department: toLocalizedChoiceOptions(departmentOptions, {
      AI컴퓨터전자공학부: "School of AI Computer and Electrical Engineering",
      콘텐츠융합디자인학부: "School of Content Convergence Design",
      법학부: "School of Law",
      AI융합학부: "School of AI Convergence",
      경영경제학부: "School of Management and Economics",
      국제어문학부: "School of International Studies, Languages and Literature",
      기계제어공학부: "School of Mechanical and Control Engineering",
      생명과학부: "School of Life Science",
      공간환경시스템공학부: "School of Spatial Environment System Engineering",
      커뮤니케이션학부: "School of Communication",
      상담심리사회복지학부: "School of Counseling Psychology and Social Welfare",
      "글로벌리더십학부(1학년)": "Global Leadership School (Freshman)",
    }),
    rc: toLocalizedChoiceOptions(rcOptions, {
      토레이RC: "Torrey RC",
      장기려RC: "Jang Gi-ryo RC",
      손양원RC: "Son Yang-won RC",
      열송학사RC: "Yeolsong RC",
      카이퍼RC: "Kuiper RC",
      카마이클RC: "Carmichael RC",
    }),
    room_type: toLocalizedChoiceOptions(roomTypeOptions, {
      "1인실": "Single room",
      "2인실": "Double room",
      "3인실": "Triple room",
      "4인실": "Quad room",
    }),
    dormitory: toLocalizedChoiceOptions(dormitoryOptions, {
      비전관: "Vision Hall",
      은혜관: "Grace Hall",
      로뎀관: "Rodem Hall",
      벧엘관: "Bethel Hall",
      하용조관: "Hayongjo Hall",
      국제관: "International Hall",
    }),
  };
  return {
    profileField,
    inputType: optionsByField[profileField] ? "single_choice" : "text",
    options: optionsByField[profileField] ?? [],
  };
}

function inferDisplayGroup(text: string): string | undefined {
  const bracketless = text.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
  return bracketless !== text ? bracketless : undefined;
}

function inferQuestionTitle(text: string, displayGroup: string | undefined): string {
  if (!displayGroup) return text;
  const label = inferBracketLabel(text);
  return label ? stripItemNumber(label) : text;
}

function inferBracketLabel(text: string): string | undefined {
  const match = text.match(/\[([^\]]+)\]\s*$/);
  return match?.[1]?.trim();
}

function stripItemNumber(value: string): string {
  return value
    .trim()
    .replace(/^\((\d+)\)\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function inferSpaceKey(text: string): string | undefined {
  const entries: Array<[string, string]> = [
    ["호실", "room"],
    ["화장실", "restroom"],
    ["샤워실", "shower_room"],
    ["1층 로비", "lobby"],
    ["복도", "hallway"],
    ["쓰레기통", "trash_room"],
    ["분리수거실", "recycling_room"],
    ["취사 공간", "cooking_space"],
    ["휴게", "lounge"],
    ["공부 공간", "study_space"],
    ["운동 공간", "exercise_space"],
    ["기도실", "prayer_room"],
    ["엘리베이터", "elevator"],
    ["청소 도구", "cleaning_tools"],
    ["냉난방", "hvac"],
    ["세탁기", "washer"],
    ["건조기", "dryer"],
    ["글로벌 라운지", "global_lounge"],
  ];
  return entries.find(([label]) => text.includes(label))?.[1];
}

function toLocalizedChoiceOptions(values: readonly string[], englishLabels: Record<string, string>) {
  return values.map((value) => ({ value, labelKo: value, labelEn: englishLabels[value] }));
}

function yesNoOptions() {
  return [
    { value: "yes", labelKo: "예", labelEn: "Yes" },
    { value: "no", labelKo: "아니오", labelEn: "No" },
  ];
}

function satisfactionScaleChoiceOptions() {
  return [
    ["참여경험없음", "No participation experience"],
    ["매우 불만족", "Very dissatisfied"],
    ["불만족", "Dissatisfied"],
    ["보통", "Neutral"],
    ["만족", "Satisfied"],
    ["매우 만족", "Very satisfied"],
    ["들어본 적 없음", "Never heard of it"],
  ].map(([labelKo, labelEn]) => ({ value: stableValue(labelKo), labelKo, labelEn }));
}

function importanceScaleChoiceOptions() {
  return [
    ["전혀 중요하지 않음", "Not important at all"],
    ["중요하지 않음", "Not important"],
    ["보통", "Neutral"],
    ["중요함", "Important"],
    ["매우 중요함", "Very important"],
  ].map(([labelKo, labelEn]) => ({ value: stableValue(labelKo), labelKo, labelEn }));
}

function inferAttentionCheckExpectedValue(text: string, isImportanceCheck: boolean): string {
  const quotedValue = text.match(/['"“”‘’]([^'"“”‘’]+)['"“”‘’]/)?.[1]?.trim();
  if (quotedValue) {
    if (/^[1-7]$/.test(quotedValue)) return quotedValue;
    if (isImportanceCheck && quotedValue.includes("전혀 중요하지")) return "1";
    if (isImportanceCheck && quotedValue.includes("중요하지")) return "2";
    if (isImportanceCheck && quotedValue.includes("매우 중요")) return "5";
    if (isImportanceCheck && quotedValue.includes("중요")) return "4";
    if (!isImportanceCheck && quotedValue.includes("참여경험")) return "1";
    if (!isImportanceCheck && quotedValue.includes("들어본 적")) return "7";
    if (!isImportanceCheck && quotedValue.includes("매우 불만족")) return "2";
    if (!isImportanceCheck && quotedValue.includes("불만족")) return "3";
    if (!isImportanceCheck && quotedValue.includes("매우 만족")) return "6";
    if (!isImportanceCheck && quotedValue.includes("만족")) return "5";
    if (quotedValue.includes("보통")) return "3";
  }
  return isImportanceCheck ? "3" : "4";
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function stableValue(value: string): string {
  return value
    .trim()
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "") || "option";
}
