import { RotateCcw } from "lucide-react";
import type { AnalysisFilters, FilterOptions } from "../../../../api/admin/model";
import { Button } from "../../../../components";
import "./css/GlobalFilterBar.css";

type FilterKey = keyof AnalysisFilters;

const filterFields: Array<{ key: FilterKey; label: string; optionKey: keyof FilterOptions }> = [
  { key: "gender", label: "성별", optionKey: "genders" },
  { key: "semesterGroup", label: "학기", optionKey: "semesterGroups" },
  { key: "department", label: "학부", optionKey: "departments" },
  { key: "rc", label: "RC", optionKey: "rcs" },
  { key: "dormitory", label: "생활관", optionKey: "dormitories" },
  { key: "roomType", label: "인실", optionKey: "roomTypes" },
  { key: "dormExperience", label: "거주 경험", optionKey: "dormExperiences" },
];

export function GlobalFilterBar(props: {
  filters: AnalysisFilters;
  options?: FilterOptions;
  isLoading: boolean;
  onChange: (filters: AnalysisFilters) => void;
  onReset: () => void;
}) {
  return (
    <section className="tg-analysis-filter" aria-label="Global Filter Bar">
      <div className="tg-analysis-filter__fields">
        {filterFields.map((field) => {
          const options = props.options?.[field.optionKey] ?? [];
          return (
            <label key={field.key} className="tg-analysis-filter__field">
              <span>{field.label}</span>
              <select
                value={props.filters[field.key] ?? ""}
                disabled={props.isLoading && options.length === 0}
                onChange={(event) => props.onChange({ ...props.filters, [field.key]: event.target.value || undefined })}
              >
                <option value="">전체</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className="tg-analysis-filter__footer">
        <ActiveFilterSummary filters={props.filters} />
        <Button variant="ghost" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={props.onReset}>
          초기화
        </Button>
      </div>
    </section>
  );
}

function ActiveFilterSummary(props: { filters: AnalysisFilters }) {
  const active = Object.entries(props.filters).filter(([, value]) => typeof value === "string" && value.trim());
  if (!active.length) return <span className="tg-analysis-filter__summary">전체 응답 기준</span>;
  return <span className="tg-analysis-filter__summary">필터 {active.length}개 적용</span>;
}
