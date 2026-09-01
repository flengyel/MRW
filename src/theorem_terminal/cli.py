from __future__ import annotations

import argparse
from pathlib import Path
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
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        source = SourceDocument.read(args.source)
        if args.command == "orient":
            output = render_orientation(source)
        elif args.command == "study":
            level = StudyLevel[args.through.upper()]
            output = render_study(source, args.label, through=level)
        else:
            from theorem_terminal.appendix_a_warrant import render_why

            output = render_why(source)
    except (
        SourceError,
        AppendixASourceError,
        LatexSourceError,
        JustificationBundleError,
    ) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(output)
    return 0

