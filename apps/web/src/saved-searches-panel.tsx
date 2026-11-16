import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui";
import { normalizeSearchPreferences, type SearchPreferences } from "./search-preferences";
import { readSavedSearches, savedSearchNameError, writeSavedSearches, type SavedSearch } from "./saved-searches";
import type { LanguageCode } from "./i18n";

const locales = { en: "en-GB", cz: "cs-CZ", ua: "uk-UA" };

function SearchParameters({ params, clubs, language }: {
  params: SearchPreferences;
  clubs: Array<{ slug: string; name: string }>;
  language: LanguageCode;
}) {
  const { t } = useTranslation();
  const formatDate = (date: string) => new Intl.DateTimeFormat(locales[language], { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  const selectedClubs = clubs.filter(club => params.clubSlugs.includes(club.slug));
  return <dl className="savedSearchParameters">
    <div><dt>{t("club.date")}</dt><dd>{formatDate(params.date)}{params.endDate !== params.date ? ` – ${formatDate(params.endDate)}` : ""}</dd></div>
    <div><dt>{t("savedSearches.time")}</dt><dd>{params.startTime === null && params.endTime === null ? t("savedSearches.anyTime") : `${params.startTime ?? "00:00"}–${params.endTime ?? "24:00"}`}</dd></div>
    <div><dt>{t("club.duration")}</dt><dd>{t("savedSearches.minutes", { count: params.duration })} · {params.courtsNeeded} {t("club.court", { count: params.courtsNeeded })}</dd></div>
    <div><dt>{t("club.courtType")}</dt><dd>{t(params.courtType === "all" ? "club.allCourts" : `club.${params.courtType}`)}</dd></div>
    <div><dt>{t("savedSearches.card")}</dt><dd>{t(params.multisportOnly ? "club.multisport" : "savedSearches.anyCard")}</dd></div>
    <div><dt>{t("nav.clubs")}</dt><dd><details><summary>{t("advanced.selected", { count: selectedClubs.length })}</summary><p>{selectedClubs.map(club => club.name).join(", ") || t("advanced.chooseClub")}</p></details></dd></div>
  </dl>;
}

function SaveSearchDialog({ editing, searches, params, clubs, language, onClose, onSave }: {
  editing: SavedSearch | null;
  searches: SavedSearch[];
  params: SearchPreferences;
  clubs: Array<{ slug: string; name: string }>;
  language: LanguageCode;
  onClose: () => void;
  onSave: (name: string) => boolean;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const [name, setName] = useState(editing?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    nameInput.current?.focus();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="saveSearchDialog" aria-labelledby={titleId} onCancel={onClose}>
    <form noValidate onSubmit={event => {
      event.preventDefault();
      const nameError = savedSearchNameError(name, searches, editing?.id);
      if (nameError) { setError(nameError); nameInput.current?.focus(); return; }
      if (!onSave(name.trim())) setError("storageError");
    }}>
      <div className="savedSearchHeading"><h2 id={titleId}>{t(editing ? "savedSearches.updateTitle" : "advanced.save")}</h2><Button type="button" variant="ghost" size="icon" aria-label={t("actions.cancel")} icon={<X size={18} />} onClick={onClose} /></div>
      <p className="savedSearchHelp">{t("savedSearches.localOnly")}</p>
      <label className="uiField"><span className="uiFieldLabel">{t("savedSearches.name")}</span>
        <input className="uiControl" ref={nameInput} value={name} maxLength={60} autoComplete="off" placeholder={t("savedSearches.namePlaceholder")} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={event => { setName(event.target.value); setError(null); }} />
      </label>
      {error ? <p id={errorId} className="advancedValidation" role="alert">{t(`savedSearches.${error}`)}</p> : null}
      <SearchParameters params={params} clubs={clubs} language={language} />
      <div className="saveSearchDialogActions"><Button type="button" onClick={onClose}>{t("actions.cancel")}</Button><Button type="submit" variant="primary">{t(editing ? "savedSearches.update" : "advanced.save")}</Button></div>
    </form>
  </dialog>;
}

export function SavedSearchesPanel({ params, defaults, maximumDate, clubs, language, open, onOpenChange, saveOpen, onSaveOpenChange, onApply, onMessage }: {
  params: SearchPreferences;
  defaults: SearchPreferences;
  maximumDate: string;
  clubs: Array<{ slug: string; name: string }>;
  language: LanguageCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveOpen: boolean;
  onSaveOpenChange: (open: boolean) => void;
  onApply: (params: SearchPreferences) => void;
  onMessage: (message: string) => void;
}) {
  const { t } = useTranslation();
  const preferenceKey = (value: SearchPreferences) => JSON.stringify([value.date, value.endDate, [...value.clubSlugs].sort(), value.duration, value.courtsNeeded, value.courtType, value.multisportOnly, value.startTime, value.endTime]);
  const [searches, setSearches] = useState(() => readSavedSearches(window.localStorage, defaults, t("savedSearches.legacyName")));
  const [activeId, setActiveId] = useState<string | null>(() => {
    const first = searches[0];
    return first && preferenceKey(params) === preferenceKey(normalizeSearchPreferences(first.params, defaults, maximumDate)) ? first.id : null;
  });
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [deleted, setDeleted] = useState<{ search: SavedSearch; index: number; wasActive: boolean } | null>(null);
  const [storageError, setStorageError] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const active = searches.find(search => search.id === activeId);
  const activeParams = active ? normalizeSearchPreferences(active.params, defaults, maximumDate) : null;
  const changed = activeParams && preferenceKey(params) !== preferenceKey(activeParams);

  useEffect(() => {
    const element = sheet.current!;
    const media = window.matchMedia("(max-width: 1080px)");
    const sync = () => {
      if (open && media.matches) { if (!element.open) element.showModal(); }
      else element.close();
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [open]);
  useEffect(() => {
    if (deleted) (sheet.current?.open ? sheet.current : document.querySelector(".savedSearchSidebar"))?.querySelector<HTMLButtonElement>(".savedSearchUndo button")?.focus({ preventScroll: true });
  }, [deleted]);

  function persist(next: SavedSearch[]) {
    const saved = writeSavedSearches(window.localStorage, next);
    setStorageError(!saved);
    if (saved) setSearches(next);
    return saved;
  }
  function closeSave() { onSaveOpenChange(false); setEditing(null); }
  const contents = <>
    <div className="savedSearchHeading"><h2>{t("savedSearches.title")} <span>{searches.length}</span></h2><Button className="savedSearchClose" variant="ghost" size="icon" aria-label={t("savedSearches.close")} icon={<X size={18} />} onClick={() => onOpenChange(false)} /></div>
    <p className="savedSearchHelp">{t("savedSearches.localOnly")}</p>
    {storageError ? <p className="advancedValidation" role="alert">{t("savedSearches.storageError")}</p> : null}
    {searches.length ? <ul className="savedSearchList">{searches.map((search, index) => <li className={`savedSearchItem ${activeId === search.id ? "savedSearchItem-active" : ""}`} key={search.id}>
      <div className="savedSearchItemHeading">
        <button type="button" className="savedSearchUse" aria-label={t("savedSearches.use", { name: search.name })} onClick={() => {
          const normalized = normalizeSearchPreferences(search.params, defaults, maximumDate);
          onApply(normalized); setActiveId(search.id); onOpenChange(false);
          onMessage(t(normalized.date !== search.params.date || normalized.endDate !== search.params.endDate ? "savedSearches.appliedShifted" : "savedSearches.applied", { name: search.name }));
        }}><span>{search.name}</span><ArrowUpRight size={16} aria-hidden="true" /></button>
        <Button size="icon" variant="ghost" aria-label={t("savedSearches.remove", { name: search.name })} icon={<Trash2 size={16} />} onClick={() => {
          if (persist(searches.filter(item => item.id !== search.id))) {
            setDeleted({ search, index, wasActive: activeId === search.id }); if (activeId === search.id) setActiveId(null);
          }
        }} />
      </div>
      <SearchParameters params={search.params} clubs={clubs} language={language} />
      {(search.params.date < defaults.date || search.params.endDate > maximumDate) ? <p className="savedSearchDateNote">{t("savedSearches.expired")}</p> : null}
      {activeId === search.id ? <div className="savedSearchLoaded"><span>{t(changed ? "savedSearches.changed" : "savedSearches.loaded")}</span>{changed ? <Button size="sm" onClick={() => { setEditing(search); onSaveOpenChange(true); }}>{t("savedSearches.update")}</Button> : null}</div> : null}
    </li>)}</ul> : <div className="savedSearchEmpty"><Bookmark size={24} strokeWidth={1.5} /><h3>{t("savedSearches.emptyTitle")}</h3><p>{t("savedSearches.emptyHint")}</p></div>}
    {deleted ? <div className="savedSearchUndo" role="status"><span>{t("savedSearches.deleted", { name: deleted.search.name })}</span><button type="button" onClick={() => {
      if (savedSearchNameError(deleted.search.name, searches)) { setStorageError(true); return; }
      const next = [...searches]; next.splice(deleted.index, 0, deleted.search);
      if (persist(next)) { if (deleted.wasActive) setActiveId(deleted.search.id); setDeleted(null); }
    }}>{t("savedSearches.undo")}</button></div> : null}
  </>;
  return <>
    <aside className="savedSearchSidebar" aria-label={t("savedSearches.title")}>{contents}</aside>
    <dialog className="savedSearchSheet" ref={sheet} aria-label={t("savedSearches.title")} onCancel={() => onOpenChange(false)}>{contents}</dialog>
    {saveOpen ? <SaveSearchDialog editing={editing} searches={searches} params={params} clubs={clubs} language={language} onClose={closeSave} onSave={name => {
      const entry = { id: editing?.id ?? crypto.randomUUID(), name, params: { ...params, clubSlugs: [...params.clubSlugs] } };
      const next = editing ? searches.map(search => search.id === editing.id ? entry : search) : [entry, ...searches];
      if (!persist(next)) return false;
      setActiveId(entry.id); setDeleted(null); closeSave();
      onMessage(t("savedSearches.saved", { name }));
      return true;
    }} /> : null}
  </>;
}
