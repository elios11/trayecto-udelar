export function prerequisiteCheckpointKey(rule) {
  if (rule?.query?.kind && rule.query.value && rule.noPublishedRule) {
    return `query:${rule.query.kind}:${rule.query.value}:none`;
  }
  if (rule?.target?.code && rule.target.assessment) {
    return `${rule.target.code}:${rule.target.assessment}`;
  }
  return null;
}

export function snapshotMatchesPlan(snapshot, { serviceCode, programName, year }) {
  return snapshot?.service?.code === serviceCode
    && snapshot?.program?.name === programName
    && String(snapshot?.plan?.year) === String(year);
}

export function isContradictoryMissingDetail(rule) {
  return rule?.noPublishedRule === true
    && rule?.reason === "detail-link-unavailable"
    && rule?.target?.hasDetails === true;
}

export function mergePrerequisiteCheckpoint(checkpoint, snapshot, planIdentity) {
  const current = checkpoint && typeof checkpoint === "object" ? checkpoint : {};
  const currentPrerequisites = Object.fromEntries(
    Object.entries(current.prerequisites ?? {}).filter(([, rule]) => !isContradictoryMissingDetail(rule)),
  );
  const prerequisites = {};
  let restoredRules = 0;

  if (snapshotMatchesPlan(snapshot, planIdentity)) {
    for (const rule of snapshot.prerequisites ?? []) {
      if (isContradictoryMissingDetail(rule)) continue;
      const key = prerequisiteCheckpointKey(rule);
      if (!key) continue;
      prerequisites[key] = rule;
      if (!(key in currentPrerequisites)) restoredRules += 1;
    }
  }

  Object.assign(prerequisites, currentPrerequisites);
  return {
    checkpoint: {
      ...current,
      prerequisites,
      restoredFromSnapshotAt: restoredRules ? new Date().toISOString() : current.restoredFromSnapshotAt,
    },
    restoredRules,
  };
}
