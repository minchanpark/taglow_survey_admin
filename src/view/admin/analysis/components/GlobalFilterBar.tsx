import { RotateCcw } from "lucide-react";
import type { AnalysisFilters, ProfileFilterDefinition } from "../../../../api/admin/model";
import { getAnalysisFilterValue, withAnalysisFilterValue } from "../../../../api/admin/model";
import { Button } from "../../../../components";
import "./css/GlobalFilterBar.css";

export function GlobalFilterBar(props: {
  filters: AnalysisFilters;
  fields: ProfileFilterDefinition[];
  isLoading: boolean;
  totalResponses?: number;
  filteredResponses?: number;
  lowSampleThreshold?: number;
  onChange: (filters: AnalysisFilters) => void;
  onReset: () => void;
}) {
  return (
    <section className="tg-analysis-filter" aria-label="응답 조건 선택">
      <div className="tg-analysis-filter__fields">
        {props.fields.length ? (
          props.fields.map((field) => {
            const options = field.options;
            return (
              <label key={field.key} className="tg-analysis-filter__field">
                <span>{field.label}</span>
                <select
                  value={getAnalysisFilterValue(props.filters, field.key) ?? ""}
                  disabled={props.isLoading && options.length === 0}
                  onChange={(event) => props.onChange(withAnalysisFilterValue(props.filters, field.key, event.target.value || undefined))}
                >
                  <option value="">전체</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })
        ) : props.isLoading ? (
          <p className="tg-analysis-filter__empty">기본 정보 필터를 불러오는 중입니다.</p>
        ) : (
          <p className="tg-analysis-filter__empty">선택형 기본 정보 질문이 없습니다.</p>
        )}
      </div>
      <div className="tg-analysis-filter__footer">
        <ActiveFilterSummary
          filters={props.filters}
          totalResponses={props.totalResponses}
          filteredResponses={props.filteredResponses}
          lowSampleThreshold={props.lowSampleThreshold}
        />
        <Button variant="ghost" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={props.onReset}>
          초기화
        </Button>
      </div>
    </section>
  );
}

function ActiveFilterSummary(props: { filters: AnalysisFilters; totalResponses?: number; filteredResponses?: number; lowSampleThreshold?: number }) {
  const active = Object.entries(props.filters).filter(([, value]) => typeof value === "string" && value.trim());
  const responseText = formatResponseSummary(active.length > 0, props.totalResponses, props.filteredResponses);
  const isLowSample =
    typeof props.filteredResponses === "number" &&
    props.filteredResponses > 0 &&
    props.filteredResponses < (props.lowSampleThreshold ?? 10);
  return (
    <span className="tg-analysis-filter__summary">
      {active.length ? `조건 ${active.length}개 적용` : "모든 응답 기준"}
      {" · "}
      {responseText}
      {isLowSample ? <strong>해석 주의</strong> : null}
    </span>
  );
}

function formatResponseSummary(isFiltered: boolean, totalResponses: number | undefined, filteredResponses: number | undefined): string {
  if (typeof totalResponses !== "number" || typeof filteredResponses !== "number") {
    return "응답을 세는 중";
  }
  return isFiltered ? `조건 적용 ${filteredResponses}명 / 전체 ${totalResponses}명` : `제출 완료 ${totalResponses}명`;
}
