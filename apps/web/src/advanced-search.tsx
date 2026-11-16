import type { ReactNode } from "react";
import { Bookmark, ChevronDown, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui";

export function AdvancedSearch({ clubs, selected, multisportOnly, onMultisportChange, dayCount, onChange, open, onOpenChange, onSave, onOpenSaved, canSave, searchButton }: {
  clubs: Array<{ slug: string; name: string; courtCount: number; courtTypes: string[] }>;
  selected: string[];
  multisportOnly: boolean;
  onMultisportChange: (enabled: boolean) => void;
  dayCount: number;
  onChange: (slugs: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onOpenSaved: () => void;
  canSave: boolean;
  searchButton: ReactNode;
}) {
  const { t } = useTranslation();
  return <div className="advancedSearch">
    <div className="advancedSearchBar">
      <div className="advancedSearchOverview">
        <Button className="advancedSearchToggle" aria-expanded={open} aria-controls="advanced-search-options" onClick={() => onOpenChange(!open)} size="sm" variant="ghost">
          {t("advanced.title")}
          <ChevronDown size={14} className={open ? "advancedChevronOpen" : ""} aria-hidden="true" />
        </Button>
        <span className="advancedSummary">{!multisportOnly && selected.length === clubs.length ? t("advanced.allClubs") : t("advanced.selected", { count: selected.length })}{dayCount > 1 ? ` · ${t("advanced.days", { count: dayCount })}` : ""}{multisportOnly ? ` · ${t("club.multisport")}` : ""}</span>
      </div>
      <div className="advancedSearchActions">
        <Button className="savedSearchesTrigger" icon={<Bookmark size={16} />} onClick={onOpenSaved} size="sm">{t("savedSearches.title")}</Button>
        <Button className="advancedSaveButton" icon={<Save size={14} />} onClick={onSave} disabled={!canSave} variant="ghost" size="sm">{t("advanced.save")}</Button>
      </div>
    </div>
    {open ? <div id="advanced-search-options" className="advancedSearchOptions">
      <div className="advancedDateRange"><p>{t("advanced.rangeHint")}</p>
        <label className="advancedMultisportFilter"><input type="checkbox" checked={multisportOnly} onChange={event => onMultisportChange(event.target.checked)} />{t("allClubs.multisportOnly")}</label>
      </div>
      <fieldset className="advancedClubs">
        <legend>{t("advanced.clubs")}</legend>
        <div className="advancedClubActions">
          <span>{t("advanced.clubHint")}</span>
          <div>
            <Button size="sm" variant="ghost" onClick={() => onChange(clubs.map(club => club.slug))}>{t("advanced.selectAll")}</Button>
            <Button size="sm" variant="ghost" onClick={() => onChange([])}>{t("advanced.clear")}</Button>
          </div>
        </div>
        <div className="advancedClubGrid">
          {clubs.map(club => <label className="advancedClubOption" key={club.slug}>
            <input type="checkbox" checked={selected.includes(club.slug)} onChange={event => onChange(event.target.checked ? [...selected, club.slug] : selected.filter(slug => slug !== club.slug))} />
            <span>{club.name}<small>{club.courtCount} {t("club.court", { count: club.courtCount })} · {club.courtTypes.map(type => t(`club.${type}`)).join(" / ")}</small></span>
          </label>)}
        </div>
        {selected.length === 0 ? <p className="advancedValidation" role="status">{t("advanced.chooseClub")}</p> : null}
      </fieldset>
      <div className="advancedSearchFooter"><span>{t("advanced.selected", { count: selected.length })}</span>{searchButton}</div>
    </div> : null}
  </div>;
}
