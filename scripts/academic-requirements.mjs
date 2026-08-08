export const requirementSources = {
  plan2025: "https://eva.fing.edu.uy/mod/resource/view.php?id=72909",
  plan1997: "https://idm.fing.edu.uy/sites/default/files/claustro_citaciones/2012/distribuido/5550/Distribuido%20N%C2%BA%2081-2012%20-%20plan_ing_computacion.pdf",
  bedelias: "https://bedelias.udelar.edu.uy/",
};

const official = (sourceUrl) => ({ sourceStatus: "official", sourceUrl });

export const requirementStructures = {
  "2025": {
    countingMode: "allocated",
    nodes: [
      { id: "p2025-basic", parentId: null, kind: "group", name: "Áreas de formación básica", shortName: "Formación básica", minCredits: 120, ...official(requirementSources.plan2025) },
      { id: "p2025-mce", parentId: "p2025-basic", kind: "area", name: "Matemática y Ciencias Experimentales", shortName: "Matemática y ciencias", minCredits: 50, ...official(requirementSources.plan2025) },
      { id: "p2025-fc", parentId: "p2025-basic", kind: "area", name: "Fundamentos de Computación", shortName: "Fundamentos", minCredits: 70, ...official(requirementSources.plan2025) },
      { id: "p2025-tech", parentId: null, kind: "group", name: "Áreas de formación básico-tecnológica y técnicas de Computación", shortName: "Formación tecnológica", minCredits: 180, ...official(requirementSources.plan2025) },
      { id: "p2025-fs", parentId: "p2025-tech", kind: "area", name: "Fundamentos de Sistemas", shortName: "Sistemas", minCredits: 30, ...official(requirementSources.plan2025) },
      { id: "p2025-is", parentId: "p2025-tech", kind: "area", name: "Ingeniería de Software", shortName: "Ing. de software", minCredits: 20, ...official(requirementSources.plan2025) },
      { id: "p2025-gdi", parentId: "p2025-tech", kind: "area", name: "Gestión de Datos e Información", shortName: "Datos e información", minCredits: 10, ...official(requirementSources.plan2025) },
      { id: "p2025-ca", parentId: "p2025-tech", kind: "area", name: "Computación Aplicada", shortName: "Computación aplicada", minCredits: 20, ...official(requirementSources.plan2025) },
      { id: "p2025-ai", parentId: "p2025-tech", kind: "area", name: "Actividades Integradoras", shortName: "Act. integradoras", minCredits: 40, ...official(requirementSources.plan2025) },
      { id: "p2025-comp", parentId: null, kind: "group", name: "Áreas de formación complementaria", shortName: "Formación complementaria", minCredits: 20, ...official(requirementSources.plan2025) },
      { id: "p2025-industrial", parentId: "p2025-comp", kind: "area", name: "Ingeniería Industrial", shortName: "Ing. industrial", minCredits: 0, ...official(requirementSources.plan2025) },
      { id: "p2025-society", parentId: "p2025-comp", kind: "area", name: "Ingeniería y Sociedad", shortName: "Ingeniería y sociedad", minCredits: 0, ...official(requirementSources.plan2025) },
    ],
    credentials: [
      {
        id: "analyst",
        title: "Analista en Computación",
        minTotalCredits: 270,
        nodeRequirements: [
          { nodeId: "p2025-mce", minCredits: 20 },
          { nodeId: "p2025-fc", minCredits: 40 },
          { nodeId: "p2025-fs", minCredits: 20 },
          { nodeId: "p2025-is", minCredits: 10 },
          { nodeId: "p2025-gdi", minCredits: 10 },
          { nodeId: "p2025-ai", minCredits: 15 },
        ],
        requiredActivities: [],
        sourceUrl: requirementSources.plan2025,
      },
      {
        id: "engineer",
        title: "Ingeniero/a en Computación",
        minTotalCredits: 450,
        nodeRequirements: [
          { nodeId: "p2025-basic", minCredits: 120 },
          { nodeId: "p2025-mce", minCredits: 50 },
          { nodeId: "p2025-fc", minCredits: 70 },
          { nodeId: "p2025-tech", minCredits: 180 },
          { nodeId: "p2025-fs", minCredits: 30 },
          { nodeId: "p2025-is", minCredits: 20 },
          { nodeId: "p2025-gdi", minCredits: 10 },
          { nodeId: "p2025-ca", minCredits: 20 },
          { nodeId: "p2025-ai", minCredits: 40 },
          { nodeId: "p2025-comp", minCredits: 20 },
          { nodeId: "p2025-industrial", minCredits: 0 },
          { nodeId: "p2025-society", minCredits: 0 },
        ],
        requiredActivities: [
          { id: "degree-project", label: "Proyecto de grado", minCredits: 30, courseIds: [], representationStatus: "not-modeled", sourceUrl: requirementSources.plan2025 },
        ],
        sourceUrl: requirementSources.plan2025,
      },
    ],
  },
  "1997": {
    countingMode: "allocated",
    nodes: [
      { id: "p1997-basic", parentId: null, kind: "group", name: "Materias básicas", shortName: "Formación básica", minCredits: 80, ...official(requirementSources.bedelias) },
      { id: "p1997-math", parentId: "p1997-basic", kind: "area", name: "Matemática", shortName: "Matemática", minCredits: 70, ...official(requirementSources.bedelias) },
      { id: "p1997-science", parentId: "p1997-basic", kind: "area", name: "Ciencias Experimentales", shortName: "Ciencias experimentales", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-tech", parentId: null, kind: "group", name: "Básico-tecnológicas, técnicas e integradoras", shortName: "Formación tecnológica", minCredits: 220, ...official(requirementSources.bedelias) },
      { id: "p1997-programming", parentId: "p1997-tech", kind: "area", name: "Programación", shortName: "Programación", minCredits: 60, ...official(requirementSources.bedelias) },
      { id: "p1997-systems", parentId: "p1997-tech", kind: "area", name: "Arquitectura, Sistemas Operativos y Redes", shortName: "Arquitectura, SO y redes", minCredits: 30, ...official(requirementSources.bedelias) },
      { id: "p1997-ai", parentId: "p1997-tech", kind: "area", name: "Inteligencia Artificial y Robótica", shortName: "IA y robótica", minCredits: 0, ...official(requirementSources.bedelias) },
      { id: "p1997-data", parentId: "p1997-tech", kind: "area", name: "Bases de Datos y Sistemas de Información", shortName: "Bases de datos y SI", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-numerical", parentId: "p1997-tech", kind: "area", name: "Cálculo Numérico y Simbólico", shortName: "Cálculo numérico", minCredits: 8, ...official(requirementSources.bedelias) },
      { id: "p1997-software", parentId: "p1997-tech", kind: "area", name: "Ingeniería de Software", shortName: "Ing. de software", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-integrating", parentId: "p1997-tech", kind: "area", name: "Actividades Integradoras, Talleres, Pasantías y Proyectos", shortName: "Act. integradoras", minCredits: 45, ...official(requirementSources.bedelias) },
      { id: "p1997-operations", parentId: "p1997-tech", kind: "area", name: "Investigación de Operaciones", shortName: "Investigación operativa", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-management", parentId: "p1997-tech", kind: "area", name: "Gestión en Organizaciones", shortName: "Gestión", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-complementary", parentId: null, kind: "group", name: "Materias complementarias", shortName: "Formación complementaria", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-social", parentId: "p1997-complementary", kind: "area", name: "Ciencias Humanas y Sociales", shortName: "Ciencias humanas y sociales", minCredits: 10, ...official(requirementSources.bedelias) },
      { id: "p1997-optional", parentId: null, kind: "category", name: "Materias opcionales", shortName: "Opcionales", minCredits: 0, ...official(requirementSources.bedelias) },
    ],
    credentials: [
      {
        id: "analyst",
        title: "Analista en Computación",
        minTotalCredits: 270,
        nodeRequirements: [
          { nodeId: "p1997-basic", minCredits: 80 },
          { nodeId: "p1997-programming", minCredits: 60 },
          { nodeId: "p1997-systems", minCredits: 30 },
          { nodeId: "p1997-management", minCredits: 10 },
          { nodeId: "p1997-data", minCredits: 10 },
          { nodeId: "p1997-integrating", minCredits: 15 },
        ],
        requiredActivities: [],
        sourceUrl: requirementSources.plan1997,
      },
      {
        id: "engineer",
        title: "Ingeniero/a en Computación",
        minTotalCredits: 450,
        nodeRequirements: [
          { nodeId: "p1997-basic", minCredits: 80 },
          { nodeId: "p1997-math", minCredits: 70 },
          { nodeId: "p1997-science", minCredits: 10 },
          { nodeId: "p1997-tech", minCredits: 220 },
          { nodeId: "p1997-programming", minCredits: 60 },
          { nodeId: "p1997-systems", minCredits: 30 },
          { nodeId: "p1997-ai", minCredits: 0 },
          { nodeId: "p1997-data", minCredits: 10 },
          { nodeId: "p1997-numerical", minCredits: 8 },
          { nodeId: "p1997-software", minCredits: 10 },
          { nodeId: "p1997-integrating", minCredits: 45 },
          { nodeId: "p1997-operations", minCredits: 10 },
          { nodeId: "p1997-management", minCredits: 10 },
          { nodeId: "p1997-complementary", minCredits: 10 },
          { nodeId: "p1997-social", minCredits: 10 },
          { nodeId: "p1997-optional", minCredits: 0 },
        ],
        requiredActivities: [
          { id: "degree-project", label: "Proyecto de grado", minCredits: 30, courseIds: ["1730-A", "1730-B"], representationStatus: "modeled", sourceUrl: requirementSources.plan1997 },
        ],
        sourceUrl: requirementSources.plan1997,
      },
    ],
  },
};

export const plan2025SuggestedNodes = {
  PI: "p2025-mce",
  MI2: "p2025-mce",
  "1275": "p2025-society",
  "2044": "p2025-fc",
  "1030": "p2025-mce",
  "2043": "p2025-ai",
  "1061": "p2025-mce",
  "1375": "p2025-fc",
  "1031": "p2025-mce",
  "2046": "p2025-fc",
  "1062": "p2025-mce",
  "P25-TG": "p2025-fc",
  "P25-EDA": "p2025-fc",
  "P25-LPO": "p2025-fc",
  "1025": "p2025-mce",
  "P25-MEC": "p2025-mce",
  "P25-LAB": "p2025-ai",
  "P25-ALG": "p2025-fc",
  "P25-OOP": "p2025-fc",
  "P25-ARQ": "p2025-fs",
  "P25-BD": "p2025-gdi",
  "P25-TC": "p2025-fc",
  "P25-APC": "p2025-fc",
  "P25-SO": "p2025-fs",
  "P25-PIS": "p2025-is",
  "P25-CPD": "p2025-fs",
  "P25-RED": "p2025-fs",
  "P25-TD": "p2025-ai",
  "P25-AA": "p2025-ca",
  "P25-IIO": "p2025-ca",
  "P25-SEG": "p2025-fs",
  "P25-ISA": "p2025-is",
  "P25-PROY-IS": "p2025-ai",
};

export const groupCodeToNode = {
  "2025": {
    "I": "p2025-basic",
    "I.I": "p2025-mce",
    "I.II": "p2025-fc",
    "II": "p2025-tech",
    "II.I": "p2025-fs",
    "II.II": "p2025-is",
    "II.III": "p2025-gdi",
    "II.IV": "p2025-ca",
    "II.V": "p2025-ai",
    "III": "p2025-comp",
    "III.I": "p2025-industrial",
    "III.II": "p2025-society",
  },
  "1997": {
    "2436": "p1997-basic",
    "4083": "p1997-math",
    "4442": "p1997-science",
    "3215": "p1997-tech",
    "4580": "p1997-programming",
    "4428": "p1997-systems",
    "4882": "p1997-ai",
    "4647": "p1997-data",
    "5020": "p1997-numerical",
    "5082": "p1997-software",
    "4756": "p1997-integrating",
    "4815": "p1997-operations",
    "4066": "p1997-management",
    "3233": "p1997-complementary",
    "5265": "p1997-social",
    "3582": "p1997-optional",
  },
};

export function allocationFromPaths(course, planYear, fallbackNodeId, fallbackSourceUrl) {
  const codeMap = groupCodeToNode[planYear];
  const eligible = new Set();
  for (const path of course?.curriculumPaths ?? []) {
    let mostSpecific = null;
    for (const label of path) {
      const match = label.match(/^([A-Z0-9]+(?:\.[A-Z0-9]+)*)\s+-\s+.*?\s+-\s+min:/i);
      if (match && codeMap[match[1]]) mostSpecific = codeMap[match[1]];
    }
    if (mostSpecific) eligible.add(mostSpecific);
  }
  const candidates = [...eligible];
  if (candidates.length === 1) {
    return {
      eligibleRequirementIds: candidates,
      creditAllocations: [{ nodeId: candidates[0], credits: course.credits, status: "official", sourceUrl: requirementSources.bedelias }],
    };
  }
  return {
    eligibleRequirementIds: candidates,
    creditAllocations: fallbackNodeId
      ? [{ nodeId: fallbackNodeId, credits: course?.credits ?? 0, status: "suggested", sourceUrl: fallbackSourceUrl }]
      : [],
  };
}
