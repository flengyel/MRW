from __future__ import annotations

import argparse
import os
from pathlib import Path
import stat
import sys
from typing import Sequence

from theorem_terminal.appendix_a import (
    AppendixASourceError,
    StudyLevel,
    render_orientation,
    render_study,
)
from theorem_terminal.justification import JustificationBundleError
from theorem_terminal.latex import LatexSourceError
from theorem_terminal.source import SourceDocument, SourceError


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="theorem-terminal",
        description="Study a mathematical source in top-down order.",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    orient = commands.add_parser(
        "orient",
        help="show purpose, organization, and central mathematics before detail",
    )
    orient.add_argument("source", type=Path, help="path to rs_Appendix_A.tex")

    study = commands.add_parser(
        "study",
        help="study a selected result, revealing later levels only on request",
    )
    study.add_argument("source", type=Path, help="path to rs_Appendix_A.tex")
    study.add_argument(
        "--label",
        default="lem:range-lifting-pullback-section",
        help="stable LaTeX label of the selected result",
    )
    study.add_argument(
        "--through",
        choices=("statement", "idea", "skeleton", "details"),
        default="statement",
        help="last level to display",
    )

    why = commands.add_parser(
        "why",
        help="show the cumulative mathematics and its checked warrant",
    )
    why.add_argument("source", type=Path, help="path to rs_Appendix_A.tex")

    request = commands.add_parser(
        "request-assistance",
        help="explicitly send one displayed bounded OpenAI Responses API request",
    )
    request.add_argument(
        "request", type=Path, help="bounded request specification JSON"
    )
    request.add_argument(
        "--model", required=True, help="requested OpenAI model identifier"
    )
    request.add_argument(
        "--output", type=Path, required=True, help="new terminal ModelCall JSON"
    )

    review = commands.add_parser(
        "review-response",
        help="locally review a finalized response by deterministic passages",
    )
    review.add_argument("model_call", type=Path, help="finalized ModelCall JSON")
    review_selectors = review.add_mutually_exclusive_group()
    review_selectors.add_argument("--index-start", type=int)
    review_selectors.add_argument("--passage", type=int)
    review_selectors.add_argument("--full", action="store_true")

    project = commands.add_parser(
        "project-response",
        help="project one exact finalized-response span as documentary material",
    )
    project.add_argument("model_call", type=Path, help="finalized ModelCall JSON")
    project.add_argument("--start-byte", type=int)
    project.add_argument("--end-byte", type=int)
    project.add_argument("--passage", type=int)
    project.add_argument("--representation-id", required=True)
    project.add_argument("--representation-version", default="1")
    project.add_argument("--kind")
    project.add_argument("--claim-id", required=True)
    project.add_argument("--output", type=Path, required=True)

    admit = commands.add_parser(
        "admit-documentary",
        help="create one explicit m:D premise-admission request",
    )
    admit.add_argument("projection", type=Path)
    admit.add_argument("--fixture-id", required=True)
    admit.add_argument("--context-id", required=True)
    admit.add_argument("--admission-id", required=True)
    admit.add_argument(
        "--admitted-by-kind",
        choices=("person", "named_policy"),
        required=True,
    )
    admit.add_argument("--admitted-by-id", required=True)
    admit.add_argument("--at", required=True, help="premise-admission time")
    admit.add_argument("--reason-variable", default="m")
    admit.add_argument("--rationale", required=True)
    admit.add_argument("--scope", required=True)
    admit.add_argument("--derivation-id", required=True)
    admit.add_argument("--output", type=Path, required=True)

    check = commands.add_parser(
        "check-documentary",
        help="invoke the pinned Lean checker and retain one runtime package",
    )
    check.add_argument("projection", type=Path)
    check.add_argument("request", type=Path)
    check.add_argument("destination", type=Path)
    check.add_argument(
        "--lean-root",
        type=Path,
        default=Path("lean"),
        help="pinned repository-owned Lake project (default: lean)",
    )

    show = commands.add_parser(
        "show-documentary",
        help="reload, validate, and display a retained documentary warrant",
    )
    show.add_argument("package", type=Path)
    return parser


def _write_new(path: Path, raw: bytes) -> None:
    """Persist a private record atomically without overwriting."""

    from theorem_terminal.private_persistence import persist_private_new

    persist_private_new(path, raw)


def _read_bounded(path: Path, limit: int, description: str) -> bytes:
    metadata = path.lstat()
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ValueError(f"{description} must be a regular non-symlink file")
    if metadata.st_size > limit:
        raise ValueError(f"{description} exceeds the {limit}-byte limit")
    with path.open("rb") as stream:
        raw = stream.read(limit + 1)
    if len(raw) > limit:
        raise ValueError(f"{description} exceeds the {limit}-byte limit")
    return raw


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command in ("orient", "study", "why"):
            source = SourceDocument.read(args.source)
        if args.command == "orient":
            output = render_orientation(source)
        elif args.command == "study":
            level = StudyLevel[args.through.upper()]
            output = render_study(source, args.label, through=level)
        elif args.command == "why":
            from theorem_terminal.appendix_a_warrant import render_why

            output = render_why(source)
        elif args.command == "request-assistance":
            from theorem_terminal.openai_response import (
                MAX_PREPARED_REQUEST_BYTES,
                parse_prepared_request,
                request_assistance,
            )

            prepared = parse_prepared_request(
                _read_bounded(
                    args.request,
                    MAX_PREPARED_REQUEST_BYTES,
                    "prepared request",
                )
            )
            raw = request_assistance(
                prepared,
                args.model,
                args.output,
                os.environ.get("OPENAI_API_KEY", ""),
                preview=lambda rendered: print(rendered, end="", flush=True),
                confirmation=lambda _rendered: sys.stdin.readline().rstrip("\r\n"),
            )
            output = (
                f"Created terminal ModelCall: {args.output}"
                if raw is not None
                else "Request not sent; no ModelCall created."
            )
        elif args.command == "review-response":
            from theorem_terminal.model_projection import (
                MAX_MODEL_CALL_BYTES,
                parse_finalized_model_call,
            )
            from theorem_terminal.response_review import render_response_review

            call = parse_finalized_model_call(
                _read_bounded(args.model_call, MAX_MODEL_CALL_BYTES, "ModelCall input")
            )
            output = render_response_review(
                call,
                index_start=args.index_start,
                passage_number=args.passage,
                full=args.full,
            )
        elif args.command == "project-response":
            from theorem_terminal.documentary_warrant import (
                DocumentaryProjection,
                encode_documentary_projection,
            )
            from theorem_terminal.model_projection import (
                MAX_MODEL_CALL_BYTES,
                extract_lossless_representation,
                make_model_produced_claim,
                parse_finalized_model_call,
            )
            from theorem_terminal.response_review import purpose_kind, select_passage

            call = parse_finalized_model_call(
                _read_bounded(
                    args.model_call,
                    MAX_MODEL_CALL_BYTES,
                    "ModelCall input",
                )
            )
            if args.passage is not None:
                if args.start_byte is not None or args.end_byte is not None:
                    raise ValueError(
                        "--passage is mutually exclusive with --start-byte and --end-byte"
                    )
                if args.kind is not None:
                    raise ValueError("--kind is not accepted with --passage")
                selected = select_passage(call.raw_response, args.passage)
                start_byte = selected.start_byte
                end_byte = selected.end_byte
                kind = purpose_kind(call)
            else:
                if args.start_byte is None or args.end_byte is None:
                    raise ValueError(
                        "byte mode requires both --start-byte and --end-byte"
                    )
                if args.kind is None:
                    raise ValueError("byte mode requires --kind")
                start_byte = args.start_byte
                end_byte = args.end_byte
                kind = args.kind
            subject = call.document["target"]
            representation = extract_lossless_representation(
                call,
                representation_id=args.representation_id,
                version=args.representation_version,
                subject=subject,
                kind=kind,
                start_byte=start_byte,
                end_byte=end_byte,
            )
            claim = make_model_produced_claim(
                call,
                representation,
                claim_id=args.claim_id,
                display_name="Model produced selected response span",
                description=(
                    "Documentary attribution of exact model-response UTF-8 bytes only."
                ),
            )
            raw = encode_documentary_projection(
                DocumentaryProjection(call, representation, claim)
            )
            _write_new(args.output, raw)
            output = f"Created documentary projection: {args.output}"
        elif args.command == "admit-documentary":
            from theorem_terminal.documentary_warrant import (
                MAX_PROJECTION_BYTES,
                build_lean_request,
                parse_documentary_projection,
            )

            projection = parse_documentary_projection(
                _read_bounded(
                    args.projection,
                    MAX_PROJECTION_BYTES,
                    "documentary projection",
                )
            )
            raw = build_lean_request(
                projection,
                fixture_id=args.fixture_id,
                context_id=args.context_id,
                admission_id=args.admission_id,
                admitted_by={
                    "kind": args.admitted_by_kind,
                    "id": args.admitted_by_id,
                },
                at=args.at,
                reason_variable=args.reason_variable,
                rationale=args.rationale,
                scope=args.scope,
                derivation_id=args.derivation_id,
            )
            _write_new(args.output, raw)
            output = f"Created explicit documentary admission request: {args.output}"
        elif args.command == "check-documentary":
            from theorem_terminal.documentary_warrant import (
                MAX_PROJECTION_BYTES,
                MAX_REQUEST_BYTES,
                create_documentary_warrant_package,
                render_documentary_warrant,
            )

            package = create_documentary_warrant_package(
                args.destination,
                _read_bounded(
                    args.projection,
                    MAX_PROJECTION_BYTES,
                    "documentary projection",
                ),
                _read_bounded(
                    args.request,
                    MAX_REQUEST_BYTES,
                    "documentary admission request",
                ),
                lean_root=args.lean_root,
            )
            output = (
                f"Created checked documentary package: {package.path}\n\n"
                + render_documentary_warrant(package)
            )
        else:
            from theorem_terminal.documentary_warrant import (
                load_documentary_warrant_package,
                render_documentary_warrant,
            )

            output = render_documentary_warrant(
                load_documentary_warrant_package(args.package)
            )
    except (
        SourceError,
        AppendixASourceError,
        LatexSourceError,
        JustificationBundleError,
        OSError,
    ) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except ValueError as exc:
        # Bridge validation errors are ValueError subclasses; keep CLI failures
        # concise without importing the bridge on ordinary study commands.
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(output)
    return 0
