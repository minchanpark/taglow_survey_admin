import {
  departmentOptions,
  dormitoryOptions,
  genderOptions,
  rcOptions,
  roomTypeOptions,
  semesterGroupOptions,
  toChoiceOptions,
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
}>;

type SectionDefinition = Readonly<{
  sectionKey: string;
  titleKo: string;
  sectionType: SectionType;
  start: number;
  end: number;
  topicKey: string;
}>;

type ExtraQuestionDefinition = Readonly<{
  sectionKey: string;
  orderScore: number;
  sourceNumber: number;
  questionKey: string;
  titleKo: string;
  questionType: QuestionType;
  metricType: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config: QuestionConfig;
  displayGroup?: string;
}>;

const DORM_TEMPLATE_ID: QuestionSetTemplateId = "handong-dom-survey-2026-1";

const sectionDefinitions: SectionDefinition[] = [
  { sectionKey: "dorm_25_2_profile", titleKo: "기본 정보", sectionType: "profile", start: 1, end: 6, topicKey: "profile" },
  { sectionKey: "dorm_25_2_council_programs", titleKo: "자치회 사업", sectionType: "satisfaction", start: 7, end: 32, topicKey: "council_programs" },
  { sectionKey: "dorm_25_2_entry_check_system", titleKo: "입출입 및 점호 시스템", sectionType: "facility", start: 33, end: 58, topicKey: "entry_check_system" },
  { sectionKey: "dorm_25_2_facilities", titleKo: "생활관 시설", sectionType: "facility", start: 59, end: 158, topicKey: "facilities" },
  { sectionKey: "dorm_25_2_laundry", titleKo: "세탁 및 건조기", sectionType: "laundry", start: 159, end: 172, topicKey: "laundry" },
  { sectionKey: "dorm_25_2_other_life", titleKo: "기타 생활", sectionType: "general", start: 173, end: 186, topicKey: "other_life" },
  { sectionKey: "dorm_25_2_global_lounge", titleKo: "글로벌 라운지", sectionType: "global_lounge", start: 187, end: 193, topicKey: "global_lounge" },
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
  enableZoom: true,
  requireText: true,
  maxFileSizeMb: 10,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const extraQuestionDefinitions: ExtraQuestionDefinition[] = [
  {
    sectionKey: "dorm_25_2_profile",
    orderScore: 0.5,
    sourceNumber: 194,
    questionKey: "question_mpqztb3f",
    titleKo: "학번",
    questionType: "text",
    metricType: "none",
    config: { textMode: "short", maxLength: 200, multiline: false },
  },
  participantImageQuestion(195, 73.5, "question_mpqzy65n", "화장실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.", "'화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(196, 80.5, "question_mpr07j52", "샤워실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.", "'샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(197, 85.5, "1", "1층 로비 공용 공간과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.", "'1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(198, 91.5, "question_mpr05np9", "복도 공용 공간과 관련하여 건의/문의할 부분이 있다면 이미지를 올려 태깅해주세요.", "'복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(199, 97.5, "question_mpr04h83", "쓰레기통 및 분리수거 시설과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.", "'쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(200, 106.5, "question_mpr02eg3", "취사공간과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.", "'취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(201, 114.5, "question_mpr01hnh", "'휴게 및 모임 공간'과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.", "'휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(202, 120.5, "question_mpr008n6", "'공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.", "'공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(203, 128.5, "question_mpqzwsvd", "운동 공간과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.", "운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(204, 136.5, "question_mpqzv2pv", "기도실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.", "'기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(205, 144.5, "question_mpqzvr9k", "엘리베이터와 관련하여 건의/문의하고 싳은 부분이 있다면, 이미지를 올려 태깅해주세요.", "'엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까?"),
  participantImageQuestion(206, 158.5, "question_mpqzpnc2", "'생활관 시설'과 관련하여 개선되어야 할 점이 있다면, 이미지를 업로드하고 태깅으로 건의해주세요."),
  participantImageQuestion(
    207,
    193.5,
    "question_mpqzsirp",
    "글로벌 라운지와 관련하여 건의/문의하고 싶은 내용이 있다면, 이미지를 올려서 태깅해주세요.",
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
8. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(2) 오피스 아워]
9. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(3) 화소지 (화장실 소식지)]
10. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(4) 화광지(화장실 광고 소식지)]
11. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(5) 방시간표]
12. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(6) 방 체크리스트]
13. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(7) 장기 대여 사업]
14. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(8) RC 월간소식지]
15. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(9) 하용조관 헬스장 신청]
16. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(10) 재난대피훈련]
17. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(11) 샤워기 필터 보급]
18. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(12) 이불 보관 이벤트]
19. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(13) 식기건조대 설치]
20. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문) [(14) 생활관 몰래카메라 탐지]
21. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(1) 한동컵]
22. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(2) 롤드컵]
23. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(3) TFT 대회 (롤체대회)]
24. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(4) 롤 뷰잉 파티]
25. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(5) 트립 프롬 한동]
26. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(6) 방구석 먹방 이벤트]
27. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 문화 부문) [(7) 열방의 축제]
28. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 소통 부문) [(1) 소통 창구 (이메일 문의)]
29. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 소통 부문) [(2) 소통 창구 (챗봇 문의) ]
30. 다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 소통 부문) [(3) 자치회 공청회]
31. ‘자치회 사업’과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
32. ‘자치회 사업’과 관련하여 만족스러웠던 점이 있다면, 자유롭게 적어주세요.
33. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 침묵시간 운영시간]
34. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 침묵시간 규칙 준수]
35. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 침묵시간 관리 방법]
36. '침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(4) 침묵시간 효과성]
37. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 소등시간]
38. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 소등 여부]
39. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 소등 후 활동 편의성]
40. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(4) 소등 후 안전성과 이동 편리성]
41. '소등제도'와 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(5) 소등제도 관리]
42. '인원점검'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 인원점검 시간]
43. '인원점검'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 인원점검 방식]
44. '인원점검'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 인원점검 빈도]
45. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 점호방송 시간]
46. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 점호방송 내용]
47. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 점호방송 음량]
48. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(4) 점호방송 방식]
49. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(5) 점호방송 정보전달 및 질서유지 효과]
50. '점호방송'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(6) 점호방송 피드백 반영]
51. '만족'을 선택해주세요.
52. '외출 제한 시간(01:00 ~ 04:00)'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 외출제한시간 적절성]
53. '외출 제한 시간(01:00 ~ 04:00)'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 외출제한시간의 관리 및 적용]
54. '외출 제한 시간(01:00 ~ 04:00)'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 외출제한시간의 안전 및 질서유지 효과]
55. '외박 신청' & '늦은 복귀 신청'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(1) 절차의 간편성]
56. '외박 신청' & '늦은 복귀 신청'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(2) 신청 가능 시간]
57. '외박 신청' & '늦은 복귀 신청'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까? [(3) 기록 관리 및 긴급 상황 시 예외 처리]
58. '입출입 및 점호 시스템(침묵시간, 소등제도, 인원점검, 점호방송, 외출 제한 시간, 외박 신청)'과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
59. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 호실 크기]
60. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 호실 수납 공간 (옷장, 서랍 등)]
61. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 호실 가구 상태 (책상, 의자, 침대 등)]
62. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 조명 환경(조명, 자연광 유입 정도)]
63. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 문 (방음, 단열, 보안 등)]
64. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 벽 (방음, 단열)]
65. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 창문 (방음, 단열, 환기 등)]
66. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 화재 안전 장비 (화재 경보기 등)]
67. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(9) 인터넷 속도 및 연결 안정성]
68. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(10) 전기 공급(콘센트 수, 위치)]
69. '호실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(11) 빨래 건조대]
70. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 상태 (공간 크기, 변기, 세면대 등)]
71. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 환기 상태]
72. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 용품 비치 (슬리퍼, 휴지, 비누 등)]
73. '화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 청결 및 위생 상태]
74. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 상태 (공간 크기, 샤워기 등)]
75. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 환기 상태]
76. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 이용 편리성]
77. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 안전성]
78. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 수질]
79. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 온수 공급]
80. '샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 청결 및 위생 상태]
81. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
82. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 가구 및 설비 상태 ]
83. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
84. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 편리성]
85. '1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 청결 및 위생 상태]
86. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 및 시설 상태]
87. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 조명 상태]
88. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 환기 상태]
89. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 안전성]
90. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 통행 편리성]
91. '복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 청결 및 위생 상태]
92. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 위치와 접근성 ]
93. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 분리수거 체계]
94. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 용량과 크기]
95. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 수거 주기 및 관리 상태]
96. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 환기 상태]
97. '쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 청결 및 위생 상태]
98. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 위치와 접근성]
99. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설비 상태]
100. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 용품 및 비치 상태]
101. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 공용 냉장고 관리 상태]
102. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 공간 충분성]
103. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 환기 상태]
104. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 안전성]
105. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 편리성]
106. '취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(9) 청결 및 위생 상태]
107. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
108. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 가구 상태]
109. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
110. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 환기 상태]
111. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 설비 및 편의성]
112. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 안전성]
113. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 소음 관리]
114. '휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
115. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
116. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 가구 상태 (책상, 의자 등)]
117. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
118. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 사용 규칙 안내 및 준수]
119. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 소음 관리]
120. '공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 청결 및 위생 상태]
121. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
122. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 기구 및 설비 상태]
123. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
124. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 환기 상태]
125. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 소음 관리]
126. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 이용 편의성]
127. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 이용 시간 및 규칙 안내]
128. 운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
129. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 공간 충분성]
130. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설비 상태]
131. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 조명 상태]
132. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 환기 상태]
133. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 분위기 및 환경]
134. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 소음 차단 및 프라이버시 보호]
135. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 이용 규칙 안내 및 준수]
136. '기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
137. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 대기시간]
138. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설비 상태 및 작동 안전성]
139. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 운행 용량 및 효율성]
140. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 소음 및 진동]
141. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 환기 상태]
142. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 위치 및 접근성]
143. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 운영 시간 및 규칙 안내]
144. '엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
145. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 비치 도구의 양]
146. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 비치 도구의 질]
147. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 비치 도구의 다양성]
148. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 위치 및 접근성]
149. '청소 도구'와 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 관리 상태]
150. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 설비 상태 및 작동 안정성]
151. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) 설정 온도 및 온도 조절]
152. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 소음 및 진동]
153. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 공기 순환 및 환기 상태]
154. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(5) 냉난방 전환 시기]
155. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(6) 운영 시간]
156. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(7) 에너지 효율성 및 환경 친화성]
157. '냉난방 시설'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(8) 청결 및 위생 상태]
158. '생활관 시설'과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
159. 세탁기 및 건조기 관리가 잘 이루어지고 있습니까? [세탁기]
160. 세탁기 및 건조기 관리가 잘 이루어지고 있습니까? [건조기]
161. 불만족 또는 매우 불만족을 선택하셨다면, 그 이유는 무엇인가요?
162. 세탁기 및 건조기 청소 및 관리에 있어서 부족하다고 생각하는 점은 무엇입니까?
163. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [05:00~07:00]
164. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [07:00~09:00]
165. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [09:00~11:00]
166. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [11:00~13:00]
167. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [13:00~15:00]
168. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [15:00~17:00]
169. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [17:00~19:00]
170. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [19:00~21:00]
171. 주로 세탁기 및 건조기를 사용하는 요일과 시간대는 언제입니까? (중복 선택 가능) [21:00~23:00]
172. 세탁기 및 건조기를 사용하지 않아 청소 및 점검이 이루어지기를 선호하는 시간대는 언제입니까? (평일 기준, 하나만 선택 가능)
173. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(1) 방 배정]
174. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(2) RC별 행사 및 사업]
175. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(3) 상점제도]
176. '기타 생활'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(4) 벌점제도]
177. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(1) 팀 기준]
178. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(2) 전공 기준]
179. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(3) 기상 패턴 기준]
180. '방 배정'과 관련된 다음 항목에 대한 중요도에 대해 어떻게 생각하십니까? [(4) 생활 습관 (청결) 기준]
181. '매우 중요하다'를 선택해주세요.
182. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(1) 방 배정]
183. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(2) RC별 행사 및 사업]
184. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(3) 상점제도]
185. '기타 생활'과 관련된 다음 항목에 대한 만족도는 어떠합니까? [(4) 벌점제도]
186. ‘기타 생활(방 배정, RC별 행사 및 사업, 상벌점제도)’과 관련하여 개선되어야 할 점이 있다면, 자유롭게 적어주세요.
187. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [설비 상태]
188. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [용품 및 비치 상태]
189. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [청결 및 위생 상태]
190. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [환기 상태]
191. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [이용 시간]
192. 글로벌 라운지와 관련된 다음 항목에 대한 만족도는 어떠합니까? [안전성]
193. 기타 글로벌 라운지와 관련하여 건의/문의하고 싶은 내용이 있다면, 자유롭게 적어주세요.
`;

export function getQuestionSetTemplate(templateId: QuestionSetTemplateId): QuestionSetTemplate {
  if (templateId !== DORM_TEMPLATE_ID) {
    throw new Error(`Unknown question set template: ${templateId}`);
  }

  const sourceQuestions = parseSourceQuestions(rawQuestionText);
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
    title: { ko: section.titleKo },
    sectionType: section.sectionType,
    settings: {
      sourceTemplateId: DORM_TEMPLATE_ID,
      templateOrderIndex: orderIndex,
    },
    questions: [
      ...sourceQuestions
      .filter((question) => question.number >= section.start && question.number <= section.end)
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
  return {
    sourceNumber: source.number,
    questionKey: `dorm_25_2_q${source.number.toString().padStart(3, "0")}`,
    title: { ko: inferQuestionTitle(source.text, displayGroup) },
    questionType,
    metricType,
    topicKey: section.topicKey,
    spaceKey: inferSpaceKey(source.text),
    config: inferConfig(source, questionType, metricType),
    validation: {},
    isRequired: true,
    displayGroup,
  };
}

function toExtraTemplateQuestion(
  source: ExtraQuestionDefinition,
  section: SectionDefinition,
): QuestionSetTemplateQuestion {
  return {
    sourceNumber: source.sourceNumber,
    questionKey: source.questionKey,
    title: { ko: source.titleKo },
    questionType: source.questionType,
    metricType: source.metricType,
    topicKey: source.topicKey ?? section.topicKey,
    spaceKey: source.spaceKey,
    config: source.displayGroup ? { ...(source.config as Record<string, unknown>), displayGroup: source.displayGroup } : source.config,
    validation: {},
    isRequired: true,
    displayGroup: source.displayGroup,
  };
}

function getQuestionOrderScore(question: QuestionSetTemplateQuestion): number {
  return extraOrderByQuestionKey.get(question.questionKey) ?? question.sourceNumber;
}

function participantImageQuestion(
  sourceNumber: number,
  orderScore: number,
  questionKey: string,
  titleKo: string,
  displayGroup?: string,
  sectionKey = "dorm_25_2_facilities",
): ExtraQuestionDefinition {
  return {
    sectionKey,
    orderScore,
    sourceNumber,
    questionKey,
    titleKo,
    questionType: "participant_image_tag",
    metricType: "none",
    config: participantImageTagConfig,
    displayGroup,
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

function inferQuestionType(source: SourceQuestion): QuestionType {
  const text = source.text;
  if (text.includes("선택해주세요")) return "attention_check";
  if (source.number <= 6 || source.number >= 194) return "profile";
  if (hasAny(text, ["자유롭게", "이유", "부족", "건의/문의"])) return "text";
  if (text.includes("중복 선택 가능")) return "multi_select";
  if (text.includes("하나만 선택 가능")) return "single_choice";
  if (hasAny(text, ["만족도", "중요도", "관리가 잘 이루어지고"])) return "scale";
  return "text";
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
        }
      : {
          scaleMin: 1,
          scaleMax: 5,
          labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
        };
  }

  if (questionType === "attention_check") {
    return {
      scaleMin: 1,
      scaleMax: 5,
      labelsKo: source.text.includes("중요") ? ["전혀 중요하지 않음", "중요하지 않음", "보통", "중요함", "매우 중요함"] : ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
      expectedValue: inferAttentionCheckExpectedValue(source.text),
      excludeIfFailed: true,
    };
  }

  if (questionType === "single_choice") {
    return {
      options: source.text.includes("선택해주세요")
        ? source.text.includes("매우 중요하다")
          ? importanceScaleChoiceOptions()
          : satisfactionScaleChoiceOptions()
        : source.number === 172
          ? timeSlotOptions
          : yesNoOptions(),
    };
  }

  if (questionType === "multi_select") {
    const label = inferBracketLabel(source.text) ?? "해당";
    return {
      minSelect: 0,
      options: [{ value: stableValue(label), labelKo: label }],
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
    194: "student_number",
    195: "name",
  };
  const profileField = profileFieldByNumber[source.number] ?? `profile_${source.number}`;
  const optionsByField: Record<string, Array<{ value: string; labelKo: string }>> = {
    gender: toChoiceOptions(genderOptions),
    semester_group: toChoiceOptions(semesterGroupOptions),
    department: toChoiceOptions(departmentOptions),
    rc: toChoiceOptions(rcOptions),
    room_type: toChoiceOptions(roomTypeOptions),
    dormitory: toChoiceOptions(dormitoryOptions),
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

function yesNoOptions() {
  return [
    { value: "yes", labelKo: "예" },
    { value: "no", labelKo: "아니오" },
  ];
}

function satisfactionScaleChoiceOptions() {
  return ["매우 불만족", "불만족", "보통", "만족", "매우 만족"].map((label) => ({ value: stableValue(label), labelKo: label }));
}

function importanceScaleChoiceOptions() {
  return ["전혀 중요하지 않음", "중요하지 않음", "보통", "중요함", "매우 중요함"].map((label) => ({ value: stableValue(label), labelKo: label }));
}

function inferAttentionCheckExpectedValue(text: string): string {
  const quotedValue = text.match(/['"“”‘’]([^'"“”‘’]+)['"“”‘’]/)?.[1]?.trim();
  if (quotedValue) {
    if (/^[1-5]$/.test(quotedValue)) return quotedValue;
    if (quotedValue.includes("매우 불만족") || quotedValue.includes("전혀 중요하지")) return "1";
    if (quotedValue.includes("불만족") || quotedValue.includes("중요하지")) return "2";
    if (quotedValue.includes("매우 중요")) return "5";
    if (quotedValue.includes("매우 만족")) return "5";
    if (quotedValue.includes("중요")) return "4";
    if (quotedValue.includes("만족")) return "4";
    if (quotedValue.includes("보통")) return "3";
  }
  return "3";
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
