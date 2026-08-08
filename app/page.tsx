"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type CourseStatus = "pending" | "approved" | "exonerated";

type Course = {
  id: string;
  name: string;
  credits: number;
  semester: number | "opt";
  area: string;
  prerequisites?: string[];
  minCredits?: number;
  offered: Array<"impar" | "par" | "libre">;
  elective?: boolean;
  placementTest?: boolean;
};

const courses: Course[] = [
  { id: "PI", name: "Prueba Inicial", credits: 4, semester: 0, area: "Matemática", placementTest: true, offered: ["impar", "par"] },
  { id: "MI2", name: "Matemática Inicial", credits: 4, semester: 1, area: "Matemática", offered: ["impar", "par"] },
  { id: "1023", name: "Matemática Discreta 1", credits: 9, semester: 1, area: "Fundamentos", offered: ["impar", "par", "libre"] },
  { id: "1373", name: "Programación 1", credits: 10, semester: 1, area: "Programación", offered: ["impar", "par"] },
  { id: "1061", name: "Cálculo Diferencial e Integral en una Variable", credits: 13, semester: 2, area: "Matemática", prerequisites: ["MI2"], offered: ["impar", "par", "libre"] },
  { id: "1151", name: "Física 1", credits: 10, semester: 2, area: "Ciencias", offered: ["impar", "par", "libre"] },
  { id: "1030", name: "Geometría y Álgebra Lineal 1", credits: 9, semester: 2, area: "Matemática", offered: ["impar", "par", "libre"] },
  { id: "1321", name: "Programación 2", credits: 12, semester: 2, area: "Programación", prerequisites: ["1373"], offered: ["impar", "par"] },
  { id: "1062", name: "Cálculo Diferencial e Integral en Varias Variables", credits: 13, semester: 3, area: "Matemática", prerequisites: ["1061"], offered: ["impar", "par", "libre"] },
  { id: "1031", name: "Geometría y Álgebra Lineal 2", credits: 9, semester: 3, area: "Matemática", prerequisites: ["1030"], offered: ["impar", "par", "libre"] },
  { id: "1027", name: "Lógica", credits: 12, semester: 3, area: "Fundamentos", prerequisites: ["1023"], offered: ["impar"] },
  { id: "1026", name: "Matemática Discreta 2", credits: 9, semester: 3, area: "Fundamentos", prerequisites: ["1023"], offered: ["impar", "par", "libre"] },
  { id: "1466", name: "Arquitectura de Computadoras", credits: 10, semester: 4, area: "Sistemas", prerequisites: ["1373"], offered: ["par", "libre"] },
  { id: "1323", name: "Programación 3", credits: 15, semester: 4, area: "Programación", prerequisites: ["1321"], offered: ["par", "libre"] },
  { id: "1025", name: "Probabilidad y Estadística", credits: 10, semester: 4, area: "Matemática", prerequisites: ["1061"], offered: ["impar", "par", "libre"] },
  { id: "1033", name: "Métodos Numéricos", credits: 8, semester: 4, area: "Matemática", prerequisites: ["1062"], offered: ["par"] },
  { id: "1537", name: "Sistemas Operativos", credits: 12, semester: 5, area: "Sistemas", prerequisites: ["1466", "1323"], offered: ["impar", "libre"] },
  { id: "1324", name: "Programación 4", credits: 15, semester: 5, area: "Programación", prerequisites: ["1321"], offered: ["impar"] },
  { id: "1325", name: "Teoría de Lenguajes", credits: 12, semester: 5, area: "Fundamentos", prerequisites: ["1027", "1026"], offered: ["impar"] },
  { id: "1944", name: "Administración General para Ingenieros", credits: 5, semester: 5, area: "Gestión", minCredits: 120, offered: ["impar", "libre"] },
  { id: "1911", name: "Fundamentos de Bases de Datos", credits: 15, semester: 6, area: "Datos", prerequisites: ["1323"], offered: ["par"] },
  { id: "1327", name: "Taller de Programación", credits: 15, semester: 6, area: "Integradora", prerequisites: ["1323", "1324"], offered: ["par"] },
  { id: "1446", name: "Redes de Computadoras", credits: 12, semester: 6, area: "Sistemas", prerequisites: ["1537"], offered: ["par"] },
  { id: "1945", name: "Práctica de Administración para Ingenieros", credits: 5, semester: 6, area: "Gestión", minCredits: 150, offered: ["par", "libre"] },
  { id: "1650", name: "Introducción a la Investigación de Operaciones", credits: 10, semester: 7, area: "Matemática", prerequisites: ["1025"], offered: ["impar"] },
  { id: "1783", name: "Taller Introductorio de Ingeniería de Software", credits: 10, semester: 7, area: "Software", prerequisites: ["1327"], offered: ["impar"] },
  { id: "1340", name: "Programación Lógica", credits: 10, semester: 7, area: "Programación", prerequisites: ["1027", "1324"], offered: ["impar"] },
  { id: "1721", name: "Proyecto de Ingeniería de Software", credits: 15, semester: 8, area: "Integradora", prerequisites: ["1783", "1911"], minCredits: 250, offered: ["par"] },
  { id: "1224", name: "Economía", credits: 7, semester: 8, area: "Gestión", minCredits: 120, offered: ["par", "libre"] },
  { id: "1225", name: "Políticas Científicas en Informática", credits: 3, semester: 8, area: "Gestión", minCredits: 120, offered: ["par"] },
  { id: "1730-A", name: "Proyecto de Grado · primera etapa", credits: 15, semester: 9, area: "Integradora", prerequisites: ["1721"], minCredits: 270, offered: ["impar", "par"] },
  { id: "1730-B", name: "Proyecto de Grado · segunda etapa", credits: 15, semester: 10, area: "Integradora", prerequisites: ["1730-A"], offered: ["impar", "par"] },
  { id: "1354", name: "Programación Funcional", credits: 10, semester: "opt", area: "Programación", elective: true, prerequisites: ["1324"], offered: ["impar"] },
  { id: "1866", name: "Aprendizaje Automático", credits: 10, semester: "opt", area: "Fundamentos", elective: true, prerequisites: ["1025", "1323"], offered: ["par"] },
  { id: "1434", name: "Computación de Alta Performance", credits: 10, semester: "opt", area: "Sistemas", elective: true, prerequisites: ["1537"], offered: ["impar"] },
  { id: "1316", name: "Introducción a la Computación Gráfica", credits: 10, semester: "opt", area: "Programación", elective: true, prerequisites: ["1323", "1031"], offered: ["impar"] },
  { id: "1545", name: "Criptografía", credits: 10, semester: "opt", area: "Fundamentos", elective: true, prerequisites: ["1027"], offered: ["par"] },
  { id: "1926", name: "Sistemas de Información Geográfica", credits: 8, semester: "opt", area: "Datos", elective: true, prerequisites: ["1911"], offered: ["impar"] },
];

const areaTargets = [
  { name: "Matemática", target: 60 },
  { name: "Fundamentos", target: 60 },
  { name: "Programación", target: 70 },
  { name: "Sistemas", target: 50 },
  { name: "Software", target: 20 },
  { name: "Datos", target: 15 },
  { name: "Integradora", target: 30 },
  { name: "Gestión", target: 15 },
];

const stateLabels: Record<CourseStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  exonerated: "Exonerada",
};

const STORAGE_KEY = "trayecto-udelar-demo-v1";

export default function Home() {
  const [statuses, setStatuses] = useState<Record<string, CourseStatus>>({});
  const [selected, setSelected] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showElectives, setShowElectives] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setStatuses(JSON.parse(saved));
    } catch {
      // A damaged local save should never prevent the curriculum from loading.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  }, [statuses, hydrated]);

  const earnedCredits = useMemo(
    () => courses.reduce((sum, course) => statuses[course.id] === "exonerated" ? sum + course.credits : sum, 0),
    [statuses],
  );

  const isComplete = (id: string) => statuses[id] === "approved" || statuses[id] === "exonerated";
  const isRequirementComplete = (id: string) => id === "MI2"
    ? isComplete("MI2") || statuses.PI === "exonerated"
    : isComplete(id);
  const isUnlocked = (course: Course) =>
    (course.prerequisites ?? []).every(isRequirementComplete) && (!course.minCredits || earnedCredits >= course.minCredits);

  const cycleStatus = (course: Course) => {
    if (!isUnlocked(course)) return;
    setStatuses((current) => {
      const now = current[course.id] ?? "pending";
      if (course.placementTest) {
        const next: CourseStatus = now === "exonerated" ? "pending" : "exonerated";
        const updated = { ...current, [course.id]: next };
        if (next === "exonerated") updated.MI2 = "pending";
        return updated;
      }
      const next: CourseStatus = now === "pending" ? "approved" : now === "approved" ? "exonerated" : "pending";
      const updated = { ...current, [course.id]: next };
      if (course.id === "MI2" && next !== "pending") updated.PI = "pending";
      return updated;
    });
  };

  const filtered = (semester: Course["semester"]) => courses.filter((course) => {
    const matchesSemester = course.semester === semester;
    const matchesSearch = `${course.id} ${course.name} ${course.area}`.toLowerCase().includes(search.toLowerCase());
    const isReplacedByPlacementTest = course.id === "MI2" && statuses.PI === "exonerated";
    return matchesSemester && matchesSearch && !isReplacedByPlacementTest && (!availableOnly || isUnlocked(course));
  });

  const areaCredits = (area: string) => courses.reduce(
    (sum, course) => course.area === area && statuses[course.id] === "exonerated" ? sum + course.credits : sum,
    0,
  );

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ career: "ingenieria-computacion-1997", statuses }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mi-trayecto-udelar.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.statuses && typeof parsed.statuses === "object") setStatuses(parsed.statuses);
      } catch {
        window.alert("No pudimos leer ese archivo de progreso.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const resetProgress = () => {
    if (window.confirm("¿Querés borrar todo el progreso guardado en este dispositivo?")) setStatuses({});
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img src="/udelar.svg" alt="Universidad de la República" className="udelar-logo" />
          <span className="brand-separator" aria-hidden="true" />
          <div>
            <p className="eyebrow">Proyecto estudiantil no oficial</p>
            <h1>Trayecto</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="quiet-button" onClick={() => importRef.current?.click()}>Importar</button>
          <button className="quiet-button" onClick={exportProgress}>Exportar</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importProgress} />
          <button className="avatar" aria-label="Progreso guardado en este dispositivo">LOCAL</button>
        </div>
      </header>

      <section className="hero-row">
        <div className="career-heading">
          <div className="selector-row">
            <label>
              <span>Carrera</span>
              <select defaultValue="computacion">
                <option value="computacion">Ingeniería en Computación</option>
                <option disabled>Doctor en Medicina — próxima importación</option>
                <option disabled>Abogacía — próxima importación</option>
              </select>
            </label>
            <label>
              <span>Plan</span>
              <select defaultValue="1997">
                <option value="1997">Plan 1997 · piloto</option>
              </select>
            </label>
            <label>
              <span>Trayectoria</span>
              <select defaultValue="pi-20-59">
                <option value="pi-20-59">Ingreso 1er semestre · PI 20–59%</option>
              </select>
            </label>
          </div>
          <p className="pilot-note"><span /> Semestres transcritos de la trayectoria compartida (dedicación total). Las previas del piloto son una simulación no validada y no deben usarse para planificar inscripciones.</p>
        </div>

        <div className="credit-summary">
          <div className="credit-ring" style={{ "--progress": `${Math.min(earnedCredits / 450 * 100, 100)}%` } as React.CSSProperties}>
            <div><strong>{earnedCredits}</strong><span>de 450</span></div>
          </div>
          <div>
            <p>Créditos obtenidos</p>
            <strong>{Math.round(earnedCredits / 450 * 100)}% de la carrera</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="progress-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Tu avance</p>
              <h2>Requisitos</h2>
            </div>
            <button className="icon-button" aria-label="Reiniciar progreso" onClick={resetProgress}>↺</button>
          </div>

          <div className="degree-card analyst">
            <div>
              <span>Título intermedio</span>
              <h3>Analista en Computación</h3>
            </div>
            <strong>{Math.min(earnedCredits, 270)}<small>/270</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / 270 * 100, 100)}%` }} /></div>
          </div>

          <div className="degree-card engineer">
            <div>
              <span>Título de grado</span>
              <h3>Ingeniero/a en Computación</h3>
            </div>
            <strong>{earnedCredits}<small>/450</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / 450 * 100, 100)}%` }} /></div>
          </div>

          <div className="area-heading">
            <h3>Créditos por área</h3>
            <span>Metas demo</span>
          </div>
          <div className="area-list">
            {areaTargets.map((area) => {
              const current = areaCredits(area.name);
              return (
                <div className="area-row" key={area.name}>
                  <div><span>{area.name}</span><strong>{current}/{area.target}</strong></div>
                  <div className="area-track"><i style={{ width: `${Math.min(current / area.target * 100, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
          <p className="data-source">Progreso guardado únicamente en este navegador.</p>
        </aside>

        <section className="curriculum-panel">
          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar materia, código o área" />
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
              <span /> Solo habilitadas
            </label>
            <div className="legend" aria-label="Estados de las materias">
              <span><i className="dot pending" /> Pendiente</span>
              <span title="Curso aprobado; todavía no suma créditos"><i className="dot approved" /> Aprobada · sin créditos</span>
              <span title="Unidad curricular completada; suma créditos"><i className="dot exonerated" /> Exonerada · suma créditos</span>
            </div>
          </div>

          <div className="curriculum-scroll">
            <div className="semester-grid">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((semester) => (
                <section className="semester-column" key={semester}>
                  <header>
                    <span>{semester === 0 ? "PI" : String(semester).padStart(2, "0")}</span>
                    <div><h2>{semester === 0 ? "Pre-semestre" : `${semester}º semestre`}</h2><p>{filtered(semester).reduce((sum, item) => sum + item.credits, 0)} créditos</p></div>
                  </header>
                  <div className="course-stack">
                    {semester === 1 && statuses.PI === "exonerated" && <p className="replacement-note">✓ Matemática Inicial sustituida por la Prueba Inicial.</p>}
                    {filtered(semester).map((course) => (
                      <CourseCard key={course.id} course={course} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                    ))}
                    {filtered(semester).length === 0 && <p className="empty-column">Sin resultados</p>}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <section className="electives-section">
            <button className="electives-heading" onClick={() => setShowElectives((value) => !value)} aria-expanded={showElectives}>
              <div><span className="eyebrow">Trayectoria flexible</span><h2>Optativas y electivas</h2></div>
              <div><span>{filtered("opt").length} materias en el catálogo piloto</span><b>{showElectives ? "−" : "+"}</b></div>
            </button>
            {showElectives && (
              <div className="electives-grid">
                {filtered("opt").map((course) => (
                  <CourseCard key={course.id} course={course} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                ))}
              </div>
            )}
          </section>
        </section>
      </section>

      <footer>
        <p>Trayecto es un proyecto estudiantil independiente. La información oficial prevalece siempre sobre este prototipo.</p>
        <a href="https://bedelias.udelar.edu.uy/" target="_blank" rel="noreferrer">Consultar Bedelías ↗</a>
      </footer>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="details-drawer" onClick={(event) => event.stopPropagation()} aria-label={`Detalles de ${selected.name}`}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar detalles">×</button>
            <p className="eyebrow">{selected.id} · {selected.area}</p>
            <h2>{selected.name}</h2>
            <div className="drawer-stats"><div><span>Créditos</span><strong>{selected.credits}</strong></div><div><span>Estado</span><strong>{selected.placementTest ? (statuses.PI === "exonerated" ? "Acreditada" : "No acreditada") : stateLabels[statuses[selected.id] ?? "pending"]}</strong></div></div>
            <h3>Condiciones para cursar</h3>
            {(selected.prerequisites?.length || selected.minCredits) ? (
              <ul className="requirements-list">
                {selected.prerequisites?.map((id) => {
                  const prerequisite = courses.find((course) => course.id === id);
                  return <li className={isRequirementComplete(id) ? "done" : "missing"} key={id}><span>{isRequirementComplete(id) ? "✓" : "○"}</span>{prerequisite?.name ?? id}</li>;
                })}
                {selected.minCredits && <li className={earnedCredits >= selected.minCredits ? "done" : "missing"}><span>{earnedCredits >= selected.minCredits ? "✓" : "○"}</span>{selected.minCredits} créditos acumulados</li>}
              </ul>
            ) : <p className="free-course">No tiene previas en este recorrido sugerido.</p>}
            <h3>Se dicta</h3>
            <div className="offering-list">{selected.offered.map((item) => <span key={item}>{item}</span>)}</div>
            <button className="primary-button" disabled={!isUnlocked(selected)} onClick={() => cycleStatus(selected)}>
              {selected.placementTest
                ? (statuses.PI === "exonerated" ? "Desmarcar Prueba Inicial" : "Acreditar Prueba Inicial")
                : isUnlocked(selected) ? `Marcar como ${(statuses[selected.id] ?? "pending") === "pending" ? "aprobada" : (statuses[selected.id] ?? "pending") === "approved" ? "exonerada" : "pendiente"}` : "Materia aún no habilitada"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

function CourseCard({ course, status, unlocked, onCycle, onDetails }: { course: Course; status: CourseStatus; unlocked: boolean; onCycle: () => void; onDetails: () => void }) {
  return (
    <article className={`course-card ${status} ${unlocked ? "unlocked" : "locked"}`}>
      <div className="course-topline">
        <span>#{course.id}</span>
        <button onClick={onDetails} aria-label={`Ver detalles de ${course.name}`}>i</button>
      </div>
      <h3>{course.name}</h3>
      <div className="course-meta"><span>{course.area}</span><strong>{course.credits} cr.</strong></div>
      <button className="status-button" disabled={!unlocked} onClick={onCycle}>
        {!unlocked
          ? <><span className="lock-mark">⌑</span> No habilitada</>
          : course.placementTest
            ? <><span className="status-mark">{status === "exonerated" ? "✓" : "□"}</span>{status === "exonerated" ? "Acreditada · suma 4 cr." : "Acreditar prueba"}</>
            : <><span className="status-mark">{status === "pending" ? "○" : status === "approved" ? "◐" : "●"}</span>{stateLabels[status]}</>}
      </button>
    </article>
  );
}
