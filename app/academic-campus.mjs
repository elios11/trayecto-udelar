/**
 * Keeps campus selection independent from the plan and pathway identifiers.
 * A missing or stale local value always falls back to the first official campus.
 */
export function resolveCampus(campuses, requestedId) {
  return campuses.find((campus) => campus.id === requestedId) ?? campuses[0];
}

export function availablePathwayEntries(pathways, campus) {
  return Object.entries(pathways).filter(([, pathway]) =>
    !campus || !pathway.campusIds?.length || pathway.campusIds.includes(campus.id),
  );
}

export function resolveCampusPathway(pathways, campus, requestedPathwayId) {
  const available = availablePathwayEntries(pathways, campus);
  const preferred = campus?.defaultPathwayId;
  return available.find(([id]) => id === requestedPathwayId)?.[0]
    ?? available.find(([id]) => id === preferred)?.[0]
    ?? available[0]?.[0]
    ?? "";
}
