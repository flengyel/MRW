'use strict';
// A stable published item ID is not a snapshot or an exact retained citation.
const sources = Object.freeze({ 'stacks-project':'https://stacks.math.columbia.edu/tag/', kerodon:'https://kerodon.net/tag/' });
function qualifiedIdentifier(value) {
  if (typeof value !== 'string') return undefined;
  const plain = /^(stacks-project|kerodon):([A-Z0-9]{4})$/.exec(value);
  if (plain) return plain[0];
  const retained = /^mrw-outline:v2\/((?:stacks-project|kerodon):[A-Z0-9]{4})\//.exec(value);
  if (retained) return retained[1];
  for (const [id, base] of Object.entries(sources)) if (value.startsWith(base) && /^[A-Z0-9]{4}\/?$/.test(value.slice(base.length))) return id+':'+value.slice(base.length).replace(/\/$/,'');
}
function canonicalCitation(value) {
  const id=qualifiedIdentifier(value);
  if (!id) throw new Error('Choose a complete source-qualified identifier.');
  const [source,tag]=id.split(':');return sources[source]+tag;
}
module.exports={qualifiedIdentifier,canonicalCitation};
