from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from hashlib import sha256
from io import StringIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal import appendix_a
from theorem_terminal.cli import main


APPENDIX_A = r"""% !TEX root = rs_main.tex
\section{Restriction categories and \texorpdfstring{\(P\)}{P}-categories}
\label{app:cats}

\subsection{Restriction categories}
Restriction-category material.

\subsection{\texorpdfstring{\(P\)}{P}-categories}
P-category material.

\subsection{Restrictions and total morphisms in \texorpdfstring{\(P\)}{P}-categories}
Total-map material.

\begin{lem}[projections of partial pairings]
\label{lem:partial-pairing-projections}
The projections and restriction of a partial pairing satisfy the stated
identities.
\end{lem}

\begin{proof}
Apply bifunctoriality and half-naturality.
\end{proof}

\begin{lem}[reindexing of partial pairings]
\label{lem:partial-pairing-reindexing}
Partial pairing commutes with precomposition.
\end{lem}

\begin{proof}
Apply naturality of the diagonal.
\end{proof}

\begin{lem}[restriction along projections]
\label{lem:restriction-along-projections}
Domains on factors induce the stated restrictions on a near product.
\end{lem}

\begin{proof}
Use naturality and the restriction identities.
\end{proof}

\subsection{Ranges and sections}
\label{sec:ranges-and-sections}
Range material.

\subsection{The category of domains}
\begin{lem}[lifting as a pullback-section condition]
\label{lem:range-lifting-pullback-section}
Let \(f:X\to Y\) and let \(q:Z\to Y\) be total. Then a total lift exists
if and only if the indicated pullback projection has a right inverse.
\end{lem}

\begin{proof}
A section defines a total lift by composition with the other projection.
Conversely, a total lift defines a section by the pullback property.
\end{proof}

\subsection{\texorpdfstring{\(P\)}{P}-recursion categories}
\begin{prop}[comparison with dominical recursion categories]
\label{prop:dominical-to-P-recursion}
Every dominical recursion category is a \(P\)-recursion category.
\end{prop}
"""


class AppendixACommandTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.source = Path(self.temporary_directory.name) / "Appendix A — test.tex"
        self.source.write_text(APPENDIX_A, encoding="utf-8")
        self.original_bytes = self.source.read_bytes()
        self.reviewed_revision = sha256(
            APPENDIX_A.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
        ).hexdigest()

    def run_command(self, *arguments: str) -> tuple[int, str, str]:
        stdout = StringIO()
        stderr = StringIO()
        with (
            patch.object(
                appendix_a,
                "_REVIEWED_SOURCE_REVISION",
                self.reviewed_revision,
            ),
            redirect_stdout(stdout),
            redirect_stderr(stderr),
        ):
            status = main(arguments)
        return status, stdout.getvalue(), stderr.getvalue()

    def test_orientation_precedes_selection_and_stops_before_statement(self) -> None:
        status, output, error = self.run_command("orient", str(self.source))

        self.assertEqual(status, 0)
        self.assertEqual(error, "")
        purpose = output.index("1. Purpose and organization")
        central = output.index("2. Central concepts and results")
        selected = output.index("3. First selected result")
        self.assertLess(purpose, central)
        self.assertLess(central, selected)
        self.assertNotIn("Let \\(f:X\\to Y\\)", output)
        self.assertNotIn("Detailed proof from the source", output)
        self.assertNotIn("Lean", output)
        self.assertIn("Guide origin: AI proposal", output)
        self.assertIn("lem:partial-pairing-projections", output)
        self.assertIn("prop:dominical-to-P-recursion", output)
        self.assertIn(
            "Select lem:range-lifting-pullback-section with the study command.",
            output,
        )
        self.assertNotIn(f"theorem-terminal study {self.source}", output)

    def test_orientation_identifies_exact_source_revision(self) -> None:
        status, output, _ = self.run_command("orient", str(self.source))

        self.assertEqual(status, 0)
        expected = sha256(self.original_bytes).hexdigest()
        self.assertIn(f"Source revision (SHA-256): {expected}", output)

    def test_line_ending_conversion_does_not_invalidate_reviewed_guide(self) -> None:
        windows_source = Path(self.temporary_directory.name) / "Appendix A CRLF.tex"
        windows_source.write_bytes(APPENDIX_A.replace("\n", "\r\n").encode("utf-8"))

        status, output, error = self.run_command("orient", str(windows_source))

        self.assertEqual(status, 0)
        self.assertEqual(error, "")
        self.assertIn("Appendix A — top-down orientation", output)

    def test_default_study_stops_after_exact_statement(self) -> None:
        status, output, error = self.run_command("study", str(self.source))

        self.assertEqual(status, 0)
        self.assertEqual(error, "")
        self.assertIn("Role in Appendix A", output)
        self.assertIn("Statement", output)
        self.assertIn("Let \\(f:X\\to Y\\)", output)
        self.assertNotIn("Governing idea", output)
        self.assertNotIn("Proof skeleton", output)
        self.assertNotIn("Detailed proof from the source", output)

    def test_later_levels_are_revealed_only_when_requested(self) -> None:
        status, output, _ = self.run_command(
            "study", str(self.source), "--through", "details"
        )

        self.assertEqual(status, 0)
        self.assertLess(output.index("Statement"), output.index("Governing idea"))
        self.assertLess(output.index("Governing idea"), output.index("Proof skeleton"))
        self.assertLess(
            output.index("Proof skeleton"), output.index("Detailed proof from the source")
        )
        self.assertIn("A section defines a total lift", output)

    def test_named_but_unprepared_result_is_not_presented_as_guided_study(self) -> None:
        status, output, error = self.run_command(
            "study",
            str(self.source),
            "--label",
            "lem:partial-pairing-projections",
        )

        self.assertEqual(status, 2)
        self.assertEqual(output, "")
        self.assertIn("no top-down study guide", error)
        self.assertIn("lem:range-lifting-pullback-section", error)

    def test_commands_do_not_modify_the_mathematical_source(self) -> None:
        self.run_command("orient", str(self.source))
        self.run_command("study", str(self.source), "--through", "details")

        self.assertEqual(self.source.read_bytes(), self.original_bytes)

    def test_no_formal_artifact_is_required(self) -> None:
        status, _, error = self.run_command("orient", str(self.source))

        self.assertEqual(status, 0)
        self.assertEqual(error, "")

    def test_missing_source_fails_clearly(self) -> None:
        missing = Path(self.temporary_directory.name) / "missing.tex"
        status, output, error = self.run_command("orient", str(missing))

        self.assertEqual(status, 2)
        self.assertEqual(output, "")
        self.assertIn("source does not exist", error)

    def test_unrelated_tex_is_rejected(self) -> None:
        unrelated = Path(self.temporary_directory.name) / "other.tex"
        unrelated.write_text(r"\section{Other mathematics}", encoding="utf-8")
        status, output, error = self.run_command("orient", str(unrelated))

        self.assertEqual(status, 2)
        self.assertEqual(output, "")
        self.assertIn("not the expected rs_Appendix_A.tex", error)

    def test_missing_advertised_result_is_rejected(self) -> None:
        incomplete = Path(self.temporary_directory.name) / "incomplete.tex"
        incomplete.write_text(
            APPENDIX_A.replace(
                r"\label{lem:partial-pairing-reindexing}",
                r"\label{lem:renamed}",
            ),
            encoding="utf-8",
        )

        status, output, error = self.run_command("orient", str(incomplete))

        self.assertEqual(status, 2)
        self.assertEqual(output, "")
        self.assertIn(r"\label{lem:partial-pairing-reindexing}", error)

    def test_changed_mathematics_requires_guide_review(self) -> None:
        changed = Path(self.temporary_directory.name) / "changed.tex"
        changed.write_text(
            APPENDIX_A.replace(
                "A section defines a total lift",
                "A different argument defines a total lift",
            ),
            encoding="utf-8",
        )
        stdout = StringIO()
        stderr = StringIO()

        with (
            patch.object(
                appendix_a,
                "_REVIEWED_SOURCE_REVISION",
                self.reviewed_revision,
            ),
            redirect_stdout(stdout),
            redirect_stderr(stderr),
        ):
            status = main(("orient", str(changed)))

        self.assertEqual(status, 2)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("guide has not been reviewed", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
