'use strict';

const { digest } = require('./navigation');

function inspectLeanSource({source, declaration, selection}) {
    const {start, end} = selection;
    const written = /^(?:(?:private|protected|public)[ \t]+)?(?:theorem|lemma)[ \t]+([\p{L}_][\p{L}\p{N}_'.]*)(?=\s|[([{:]|$)/gmu;
    const declarations = [...source.matchAll(written)];
    const named = declarations.map((match, index) => ({
        name: match[1],
        start: match.index,
        end: declarations[index + 1]?.index ?? source.length,
    }));
    const matching = named.filter(item => (!declaration || item.name === declaration ||
        declaration.endsWith('.' + item.name)) && (start === end
        ? item.start <= start && start < item.end
        : start < item.end && item.start < end));
    if (matching.length !== 1) return null;
    const item = matching[0];
    const text = source.slice(item.start, item.end);
    const assignment = text.indexOf(':=');
    const proofStart = assignment < 0 ? null : item.start + assignment + 2;
    return {
        declaration: item.name, sourceSpan: {start: item.start, end: item.end},
        writtenStatement: text.slice(0, assignment < 0 ? text.length : assignment).trimEnd(),
        proofSpan: proofStart === null ? null : {start: proofStart, end: item.end},
        proofValue: 'unavailable', typeConstants: null, valueConstants: null, localSteps: [],
        sourceDigest: digest(source), observations: 'source-only',
        entries: [{kind: 'theorem', ...item, text}],
    };
}

module.exports = { inspectLeanSource };
