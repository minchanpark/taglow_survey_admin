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
  { sectionKey: "dorm_25_2_profile", titleKo: "기본 정보", titleEn: "Basic Information", sectionType: "profile", start: 1, end: 6, topicKey: "profile" },
  { sectionKey: "dorm_25_2_council_programs", titleKo: "자치회 사업", titleEn: "Dorm Union Initiatives", sectionType: "satisfaction", start: 7, end: 32, topicKey: "council_programs" },
  { sectionKey: "dorm_25_2_entry_check_system", titleKo: "입출입 및 점호 시스템", titleEn: "Entry, Exit, and Roll Call System", sectionType: "facility", start: 33, end: 58, topicKey: "entry_check_system" },
  { sectionKey: "dorm_25_2_facilities", titleKo: "생활관 시설", titleEn: "Dormitory Facilities", sectionType: "facility", start: 59, end: 158, topicKey: "facilities" },
  { sectionKey: "dorm_25_2_laundry", titleKo: "세탁 및 건조기", titleEn: "Washing Machines and Dryers", sectionType: "laundry", start: 159, end: 172, topicKey: "laundry" },
  { sectionKey: "dorm_25_2_other_life", titleKo: "기타 생활", titleEn: "Other Living Conditions", sectionType: "general", start: 173, end: 186, topicKey: "other_life" },
  { sectionKey: "dorm_25_2_global_lounge", titleKo: "글로벌 라운지", titleEn: "Handong Global Lounge", sectionType: "global_lounge", start: 187, end: 193, topicKey: "global_lounge" },
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
  {
    sectionKey: "dorm_25_2_profile",
    orderScore: 0.5,
    sourceNumber: 194,
    questionKey: "question_mpqztb3f",
    titleKo: "학번",
    titleEn: "Student ID",
    questionType: "text",
    metricType: "none",
    config: { textMode: "short", maxLength: 200, multiline: false },
  },
  participantImageQuestion(
    195,
    73.5,
    "question_mpqzy65n",
    "화장실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the bathroom, please upload an image and tag the relevant area.",
    "'화장실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Bathroom'?",
  ),
  participantImageQuestion(
    196,
    80.5,
    "question_mpr07j52",
    "샤워실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the shower room, please upload an image and tag the relevant area.",
    "'샤워실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Shower Room'?",
  ),
  participantImageQuestion(
    197,
    85.5,
    "1",
    "1층 로비 공용 공간과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the 1st floor lobby common area, please upload an image and tag the relevant area.",
    "'1층 로비 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?",
  ),
  participantImageQuestion(
    198,
    91.5,
    "question_mpr05np9",
    "복도 공용 공간과 관련하여 건의/문의할 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the hallway common area, please upload an image and tag the relevant area.",
    "'복도 공용 공간'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Hallway Common Area'?",
  ),
  participantImageQuestion(
    199,
    97.5,
    "question_mpr04h83",
    "쓰레기통 및 분리수거 시설과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding trash bins and recycling facilities, please upload an image and tag the relevant area.",
    "'쓰레기통 및 분리수거실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'?",
  ),
  participantImageQuestion(
    200,
    106.5,
    "question_mpr02eg3",
    "취사공간과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the cooking area, please upload an image and tag the relevant area.",
    "'취사 공간(휴게실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?",
  ),
  participantImageQuestion(
    201,
    114.5,
    "question_mpr01hnh",
    "'휴게 및 모임 공간'과 관련하여 건의/문의하고 싶은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding rest and meeting areas, please upload an image and tag the relevant area.",
    "'휴게 및 모임 공간(코이노니아실, 휴게실, 회복실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?",
  ),
  participantImageQuestion(
    202,
    120.5,
    "question_mpr008n6",
    "'공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding study areas, please upload an image and tag the relevant area.",
    "'공부 공간 (그룹스터디실, 세미나실, 노트북실, 독서실 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'?",
  ),
  participantImageQuestion(
    203,
    128.5,
    "question_mpqzwsvd",
    "운동 공간과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding sports areas, please upload an image and tag the relevant area.",
    "운동 공간(헬스장, 탁구장, 포켓볼 등)'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?",
  ),
  participantImageQuestion(
    204,
    136.5,
    "question_mpqzv2pv",
    "기도실과 관련하여 건의/문의하고 싶은 부분이 있다면 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the prayer room, please upload an image and tag the relevant area.",
    "'기도실'과 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Prayer Room'?",
  ),
  participantImageQuestion(
    205,
    144.5,
    "question_mpqzvr9k",
    "엘리베이터와 관련하여 건의/문의하고 싳은 부분이 있다면, 이미지를 올려 태깅해주세요.",
    "If you have any suggestions or inquiries regarding the elevator, please upload an image and tag the relevant area.",
    "'엘리베이터'와 관련된 다음 항목에 대한 만족도는 어떠합니까?",
    "What is your level of satisfaction with the following aspects of the 'Elevator'?",
  ),
  participantImageQuestion(
    206,
    158.5,
    "question_mpqzpnc2",
    "'생활관 시설'과 관련하여 개선되어야 할 점이 있다면, 이미지를 업로드하고 태깅으로 건의해주세요.",
    "If there are any areas for improvement regarding dormitory facilities, please upload an image and tag the relevant area.",
  ),
  participantImageQuestion(
    207,
    193.5,
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

const rawEnglishQuestionText = `
1. 1. Gender
2. 2. Semester
3. 3. Department (1st Major)
4. 4. Respective RC
5. 5. Room type
6. 6. Dormitory
7. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(1) Move-in Services (Package Management and Organization, Vehicle Control, Cart Rental)]
8. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(2) Office Hour]
9. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(3) Weekly RC Newsletter]
10. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(4) Restroom Advertisement]
11. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(5) Roommates' Time Table]
12. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(6) Room Checklist]
13. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(7) Long-term Rental Service]
14. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(8) Monthly RC Newsletter]
15. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(9) Hayong-jo Hall Gym Application]
16. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(10) Evacuation Drill]
17. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(11) Showerhead filter supply]
18. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(12) Blanket Storage Event]
19. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(13) Installation of Dish Racks]
20. 1. What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section) [(14) Dormitory Hidden Camera Detection]
21. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(1) Handong Cup]
22. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(2) League of Legends Cup]
23. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(3) TFT Championship]
24. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(4) League of Legends Viewing Party]
25. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(5) Trip From Handong]
26. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(6) Room Mukbang Event]
27. 2. What is your level of satisfaction with the following Dorm Union initiatives? (Student Culture Section)   [(7) Festival of Nations Korean Booth]
28. 3. What is your level of satisfaction with the following Dorm Union initiatives? (Student Communication Section)   [(1) Communication Channel (Email Inquiries)]
29. 3. What is your level of satisfaction with the following Dorm Union initiatives? (Student Communication Section)   [(2) Communication Channel (Chatbot Inquiries)]
30. 3. What is your level of satisfaction with the following Dorm Union initiatives? (Student Communication Section)   [(3) Dorm Union Public Hearing]
31. 4. If there are any areas for improvement regarding the 'Dorm Union initiatives', please feel free to share.
32. 5. If there are any aspects of the 'Dorm Union initiatives' that you were satisfied with, please feel free to share.
33. 1. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(1) Silent Hours Operating Hours]
34. 1. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(2) Compliance with Silent Hours Rules]
35. 1. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(3) Management of Silent Hours]
36. 1. What is your level of satisfaction with the following aspects related to 'Silent Hours'? [(4) Effectiveness of Silent Hours]
37. 2. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(1) Lights Out Time]
38. 2. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(2) Lights Out Compliance]
39. 2. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(3) Convenience of Activities After Lights Out]
40. 2. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(4) Safety and Mobility Convenience After Lights Out]
41. 2. What is your level of satisfaction with the following aspects related to the 'Lights Out System'? [(5) Management of the Lights Out System]
42. 3. What is your level of satisfaction with the following aspects related to 'Roll Call'? [(1) Roll Call Time]
43. 3. What is your level of satisfaction with the following aspects related to 'Roll Call'? [(2) Roll Call Method]
44. 3. What is your level of satisfaction with the following aspects related to 'Roll Call'? [(3) Roll Call Frequency]
45. 4. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'?   [(1) Roll Call Announcement Time]
46. 4. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'?   [(2) Roll Call Announcement Content]
47. 4. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'?   [(3) Roll Call Volume]
48. 4. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'?   [(4) Roll Call Method]
49. 4. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'?   [(5) Effectiveness of Information Delivery and Order Maintenance in the Roll Call Announcement]
50. 4. What is your level of satisfaction with the following aspects of the 'Roll Call Announcement'?   [(6) Incorporation of Feedback in the Roll Call Announcement]
51. 5. Please select 'Satisfied'.
52. 6. What is your level of satisfaction with the following aspects of the 'Curfew Hours (01:00 AM - 04:00 AM)'?   [(1) Appropriateness of Curfew Hours]
53. 6. What is your level of satisfaction with the following aspects of the 'Curfew Hours (01:00 AM - 04:00 AM)'?   [(2) Management and Implementation of Curfew Hours]
54. 6. What is your level of satisfaction with the following aspects of the 'Curfew Hours (01:00 AM - 04:00 AM)'?   [(3) Safety and Order Maintenance Effectiveness During Curfew Hours]
55. 7. What is your level of satisfaction with the following aspects of 'Overnight Stay Request' & 'Late Return Request'? [(1) Simplicity of the Procedure]
56. 7. What is your level of satisfaction with the following aspects of 'Overnight Stay Request' & 'Late Return Request'? [(2) Available Application Times]
57. 7. What is your level of satisfaction with the following aspects of 'Overnight Stay Request' & 'Late Return Request'? [(3) Record Management and Handling of Exceptions in Emergency Situations]
58. 9. If there are any areas for improvement regarding the 'Entry/Exit and Roll Call System' (Silent Hours, Lights Out System, Roll Call, Roll Call Announcement, Curfew Hours, Overnight Stay Request), please feel free to share your thoughts.
59. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(1) Room size]
60. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(2) Room Storage Space (Wardrobe, Drawers, etc.)]
61. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(3) Condition of Room Furniture (Desk, Chair, Bed, etc.)]
62. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(4) Lighting Environment (Lighting, Natural Light Inflow)]
63. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(5) Door (Soundproofing, Insulation, Security, etc.)]
64. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(6) Walls (Soundproofing, Insulation)]
65. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(7) Windows (Soundproofing, Insulation, Ventilation, etc.)]
66. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(8) Fire safety equipment (fire alarms, etc.)]
67. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(9) Internet Speed and Connection Stability]
68. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(10) Electrical Supply (Number of Outlets, Location)]
69. 1. What is your level of satisfaction with the following aspects of the 'Room'? [(11) Laundry Drying Rack]
70. 2. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(1) Condition of Facilities (Space Size, Toilet, Sink, etc.)]
71. 2. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(2) Ventilation]
72. 2. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(3) Availability of Supplies (Slippers, Toilet Paper, Soap, etc.)]
73. 2. What is your level of satisfaction with the following aspects of the 'Bathroom'? [(4) Cleanliness and Hygiene]
74. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(1) Condition of Facilities (Space Size, Showerhead, etc.)]
75. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(2) Ventilation]
76. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(3) Convenience of Use]
77. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(4) Safety]
78. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(5) Water Quality]
79. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(6) Hot Water Supply]
80. 3. What is your level of satisfaction with the following aspects of the 'Shower Room'?  [(7) Cleanliness and Hygiene]
81. 4. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?   [(1) Adequacy of Space]
82. 4. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?   [(2) Condition of Furniture and Facilities]
83. 4. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?   [(3) Lighting Condition]
84. 4. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?   [(4) Convenience]
85. 4. What is your level of satisfaction with the following aspects of the '1st Floor Lobby Common Area'?   [(5) Cleanliness and Hygiene]
86. 5. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(1) Condition of Facilities and Equipment]
87. 5. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(2) Lighting Condition]
88. 5. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(3) Ventilation]
89. 5. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(4) Safety]
90. 5. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(5) Ease of Passage]
91. 5. What is your level of satisfaction with the following aspects of the 'Hallway Common Area'? [(6) Cleanliness and Hygiene]
92. 6. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(1) Location and Accessibility]
93. 6. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(2) Recycling System]
94. 6. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(3) Capacity and Size]
95. 6. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(4) Collection Cycle and Management]
96. 6. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(5) Ventilation]
97. 6. What is your level of satisfaction with the following aspects of the 'Trash Bins and Recycling Room'? [(6) Cleanliness and Hygiene]
98. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(1) Location and Accessibility]
99. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(2) Condition of Facilities]
100. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(3) Availability of Supplies]
101. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(4) Management of Shared Refrigerators]
102. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(5) Adequacy of Space]
103. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(6) Ventilation]
104. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(7) Safety]
105. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(8) Convenience]
106. 7. What is your level of satisfaction with the following aspects of the 'Cooking Area (Lounge, etc.)'?   [(9) Cleanliness and Hygiene]
107. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(1) Adequacy of Space]
108. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(2) Condition of Furniture]
109. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(3) Lighting Condition]
110. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(4) Ventilation]
111. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(5) Convenience]
112. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(6) Safety]
113. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(7) Noise Management]
114. 8. What is your level of satisfaction with the following aspects of the 'Rest and Meeting Areas (Koinonia, Lounge, Recovery Room, etc.)'?   [(8) Cleanliness and Hygiene]
115. 9. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(1) Adequacy of Space]
116. 9. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(2) Condition of Furniture (Desks, Chairs, etc.)]
117. 9. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(3) Lighting Condition]
118. 9. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(4) Guidance and Compliance with Usage Rules]
119. 9. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(5) Noise Management]
120. 9. What is your level of satisfaction with the following aspects of the 'Study Areas (Group Study Rooms, Seminar Rooms, Laptop Rooms, Reading Rooms, etc.)'? [(6) Cleanliness and Hygiene]
121. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(1) Adequacy of Space]
122. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(2) Condition of Equipment and Facilities]
123. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(3) Lighting Condition]
124. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(4) Ventilation]
125. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(5) Noise Management]
126. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(6) Ease of Use]
127. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(7) Usage Hours and Rules Guidance]
128. 10. What is your level of satisfaction with the following aspects of the 'Sports Areas (Gym, Table Tennis Room, Pool Table, etc.)'?   [(8) Cleanliness and Hygiene]
129. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(1) Adequacy of Space]
130. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(2) Condition of Facilities]
131. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(3) Lighting Condition]
132. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(4) Ventilation]
133. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(5) Atmosphere and Environment]
134. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(6) Noise Blocking and Privacy Protection]
135. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(7) Guidance and Compliance with Usage Rules]
136. 11. What is your level of satisfaction with the following aspects of the 'Prayer Room'?   [(8) Cleanliness and Hygiene]
137. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(1) Waiting Time]
138. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(2) Condition of Equipment and Operational Safety]
139. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(3) Capacity and Efficiency]
140. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(4) Noise and Vibration]
141. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(5) Ventilation]
142. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(6) Location and Accessibility]
143. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(7) Operating Hours and Rules Guidance]
144. 12. What is your level of satisfaction with the following aspects of the 'Elevator'? [(8) Cleanliness and Hygiene]
145. 13. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'?  [(1) Quantity of Available Tools]
146. 13. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'?  [(2) Quality of Available Tools]
147. 13. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'?  [(3) Variety of Available Tools]
148. 13. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'?  [(4) Location and Accessibility]
149. 13. What is your level of satisfaction with the following aspects of the 'Cleaning Tools'?  [(5) Condition and Management]
150. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(1) Condition of Equipment and Operational Stability]
151. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(2) Set Temperature and Temperature Control]
152. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(3) Noise and Vibration]
153. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(4) Air Circulation and Ventilation]
154. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(5) Timing of Heating/Cooling Transition]
155. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(6) Operating Hours]
156. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(7) Energy Efficiency and Environmental Friendliness]
157. 14. What is your level of satisfaction with the following aspects of the 'Heating and Cooling Facilities'? [(8) Cleanliness and Hygiene]
158. 15. If there are any areas for improvement regarding the 'Dormitory Facilities', please feel free to share your thoughts.
159. 1. Is the management of the washing machines and dryers being carried out effectively? [Washing Machine]
160. 1. Is the management of the washing machines and dryers being carried out effectively? [Dryer]
161. 1-1. If you selected 'Dissatisfied' or 'Very Dissatisfied', what is the reason?
162. 1-2. What do you think is lacking in the cleaning and maintenance of the washing machines and dryers?
163. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [05:00~07:00]
164. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [07:00~09:00]
165. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [09:00~11:00]
166. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [11:00~13:00]
167. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [13:00~15:00]
168. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [15:00~17:00]
169. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [17:00~19:00]
170. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [19:00~21:00]
171. 2. What days and times do you primarily use the washing machines and dryers? (Multiple selections are allowed) [21:00~23:00]
172. 2-1. What time of day would you prefer cleaning and inspections of the washing machines and dryers to be conducted, considering you do not use them? (Weekdays only, please select one option)
173. 1. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'?   [(1) Room Assignment]
174. 1. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'?   [(2) RC-specific Events and Programs]
175. 1. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'?   [(3) Reward Points System]
176. 1. What is your opinion on the importance of the following aspects related to 'Other Living Conditions'?   [(4) Penalty Points System]
177. 2. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(1) Team-based Criteria]
178. 2. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(2) Major-based Criteria]
179. 2. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(3) Wake-up Pattern-based Criteria]
180. 2. What is your opinion on the importance of the following aspects related to 'Room Assignment'? [(4) Lifestyle Habits (Cleanliness)-based Criteria]
181. 2. Please select 'Very Important'.
182. 3. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(1) Room Assignment]
183. 3. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(2) RC-specific Events and Programs]
184. 3. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(3) Reward Points System]
185. 3. What is your level of satisfaction with the following aspects related to 'Other Living Conditions'? [(4) Penalty Points System]
186. 4. If there are any areas for improvement regarding 'Other Living Conditions' (Room Assignment, RC-specific Events and Programs, Reward and Penalty Points System), please feel free to share your thoughts.
187. 1. What is your level of satisfaction with the following aspects of the Handong Global Lounge?   [Condition of Facilities]
188. 1. What is your level of satisfaction with the following aspects of the Handong Global Lounge?   [Availability of Supplies]
189. 1. What is your level of satisfaction with the following aspects of the Handong Global Lounge?   [Cleanliness and Hygiene]
190. 1. What is your level of satisfaction with the following aspects of the Handong Global Lounge?   [Ventilation]
191. 1. What is your level of satisfaction with the following aspects of the Handong Global Lounge?   [Operating Hours]
192. 1. What is your level of satisfaction with the following aspects of the Handong Global Lounge?   [Safety]
193. 2. If you have any suggestions or inquiries regarding the Handong Global Lounge, please feel free to share them.
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
  };
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
          labelsEn: ["Not important at all", "Not important", "Neutral", "Important", "Very important"],
        }
      : {
          scaleMin: 1,
          scaleMax: 5,
          labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
          labelsEn: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
        };
  }

  if (questionType === "attention_check") {
    const isImportanceCheck = source.text.includes("중요");
    return {
      scaleMin: 1,
      scaleMax: 5,
      labelsKo: isImportanceCheck ? ["전혀 중요하지 않음", "중요하지 않음", "보통", "중요함", "매우 중요함"] : ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
      labelsEn: isImportanceCheck ? ["Not important at all", "Not important", "Neutral", "Important", "Very important"] : ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
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
    194: "student_number",
    195: "name",
  };
  const profileField = profileFieldByNumber[source.number] ?? `profile_${source.number}`;
  const optionsByField: Record<string, Array<{ value: string; labelKo: string; labelEn?: string }>> = {
    gender: toLocalizedChoiceOptions(genderOptions, {
      남성: "Male",
      여성: "Female",
    }),
    semester_group: toLocalizedChoiceOptions(semesterGroupOptions, {
      "1학기": "1st semester",
      "2학기": "2nd semester",
      "3학기": "3rd semester",
      "4학기": "4th semester",
      "5학기이상": "5th semester or above",
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
    ["매우 불만족", "Very dissatisfied"],
    ["불만족", "Dissatisfied"],
    ["보통", "Neutral"],
    ["만족", "Satisfied"],
    ["매우 만족", "Very satisfied"],
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
