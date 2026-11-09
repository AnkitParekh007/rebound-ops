/** Work model is evidence, not the absence of the word “remote”. */
export function inferWorkModel({ structured, location = '', title = '', description = '' } = {}) {
  const value = String(structured || '').trim().toLowerCase().replace(/[ _-]/g, '');
  const known = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite', inoffice: 'Onsite' };
  if (known[value]) return { workplaceType: known[value], isRemote: value === 'remote', workplaceEvidence: 'Employer work-model field: ' + structured };
  const label = location + ' · ' + title;
  const descriptionEvidence = String(description).match(/\b(?:all (?:of )?our (?:roles|positions) are remote|this (?:role|position|job) is (?:fully )?remote|(?:fully|100%) remote (?:role|position|job))\b/i)?.[0];
  // Hybrid takes precedence over a permissive remote keyword in mixed labels.
  if (/\bhybrid\b/i.test(label)) return { workplaceType: 'Hybrid', isRemote: false, workplaceEvidence: 'Employer location/title: ' + label };
  if (/\bon[- ]site\b|\bin[- ]office\b|\boffice[- ]based\b/i.test(label)) return { workplaceType: 'Onsite', isRemote: false, workplaceEvidence: 'Employer location/title: ' + label };
  if (/\bremote\b|\banywhere\b|fully\s*distributed/i.test(label) || descriptionEvidence) return { workplaceType: 'Remote', isRemote: true, workplaceEvidence: descriptionEvidence ? 'Employer description: ' + descriptionEvidence : 'Employer location/title: ' + label };
  return { workplaceType: 'Unknown', isRemote: false, workplaceEvidence: 'Work model not specified by the source. Check the employer listing.' };
}

/** Older adapters/cache entries may have inferred Onsite from a city alone. */
export function conservativeWorkModel(job) {
  if (/^onsite$/i.test(job.workplaceType || '') && !job.workplaceEvidence) {
    return { ...job, ...inferWorkModel({ location: job.location, title: job.title, description: job.description }) };
  }
  if (!job.workplaceType && !job.isRemote) return { ...job, workplaceType: 'Unknown', workplaceEvidence: 'Work model not specified by the source.' };
  return job;
}
