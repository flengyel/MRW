from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from hashlib import sha256
from io import StringIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from test_appendix_a import APPENDIX_A
from test_justification_bundle import encode, expectation_for, sample_document
from theorem_terminal import appendix_a, appendix_a_warrant
from theorem_terminal.cli import main
from theorem_terminal.source import SourceDocument


class WhyCommandTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.source = Path(self.temporary_directory.name) / "Appendix A — why.tex"
        self.source.write_text(APPENDIX_A, encoding="utf-8")
        self.reviewed_revision = sha256(
            APPENDIX_A.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
        ).hexdigest()
        self.document = sample_document(self.reviewed_revision)
        self.raw = encode(self.document)
        self.expectation = expectation_for(self.raw, self.document)

    def run_command(
        self,
        *arguments: str,
        raw: bytes | None = None,
    ) -> tuple[int, str, str]:
        stdout = StringIO()
        stderr = StringIO()
        selected_raw = self.raw if raw is None else raw
        with (
            patch.object(
                appendix_a,
                "_REVIEWED_SOURCE_REVISION",
                self.reviewed_revision,
            ),
            patch.object(
                appendix_a_warrant,
                "APPENDIX_A_BUNDLE_EXPECTATION",
                self.expectation,
            ),
            patch.object(
                appendix_a_warrant,
                "load_package_bundle",
                return_value=selected_raw,
            ),
            redirect_stdout(stdout),
            redirect_stderr(stderr),
        ):
            status = main(arguments)
        return status, stdout.getvalue(), stderr.getvalue()

    def test_why_preserves_kallenberg_order_before_the_warrant(self) -> None:
        status, output, error = self.run_command("why", str(self.source))

        self.assertEqual(status, 0)
        self.assertEqual(error, "")
        headings = (
            "1. Purpose and organization",
            "2. Central concepts and results",
            "3. First selected result",
            "Role in Appendix A",
            "Statement",
            "Governing idea",
            "Proof skeleton",
            "Detailed proof from the source",
            "5. Reviewed formal correspondence",
            "6. Exact claim versions",
            "7. Admitted premises and external bases",
            "8. Checked justification derivation",
            "9. Pinned external verification",
            "10. Provenance and related source bindings",
            "11. Justification verification",
        )
        positions = [output.index(heading) for heading in headings]
        self.assertEqual(positions, sorted(positions))

    def test_why_displays_exact_records_and_contextual_derivability(self) -> None:
        status, output, _ = self.run_command("why", str(self.source))

        self.assertEqual(status, 0)
        self.assertIn("claim-F — Synthetic claim", output)
        self.assertIn("admission-x: x:claim-F", output)
        self.assertIn("Profile: j0-v1 (J0)", output)
        self.assertIn("Context: context-v1", output)
        self.assertIn("TheoremTerminal.Justification.checkCertificate", output)
        self.assertIn("Lean: 4.32.2", output)
        self.assertIn("Axioms reported: propext", output)
        self.assertIn("correspondence-v1: formal_to_manuscript", output)
        self.assertIn("checked in this run: false", output)
        self.assertIn(
            "Derivable relative to these admitted premises and policy.",
            output,
        )
        self.assertNotIn("Conclusion: true", output)
        self.assertNotIn("Conclusion: known", output)
        self.assertNotIn("Conclusion: verified", output)
        self.assertNotIn("Confidence", output)

    def test_corrupt_bundle_exits_without_partial_stdout(self) -> None:
        status, output, error = self.run_command(
            "why",
            str(self.source),
            raw=self.raw + b" ",
        )

        self.assertEqual(status, 2)
        self.assertEqual(output, "")
        self.assertIn("bundle SHA-256", error)

    def test_stale_bundle_source_binding_is_rejected(self) -> None:
        stale_document = sample_document("f" * 64)
        stale_raw = encode(stale_document)
        stale_expectation = expectation_for(stale_raw, stale_document)
        source = SourceDocument.read(self.source)

        with patch.object(
            appendix_a,
            "_REVIEWED_SOURCE_REVISION",
            self.reviewed_revision,
        ):
            with self.assertRaisesRegex(
                appendix_a_warrant.JustificationBundleError,
                "source revision does not match",
            ):
                appendix_a_warrant.render_why(
                    source,
                    expectation=stale_expectation,
                    bundle_bytes=stale_raw,
                )

    def test_changed_manuscript_still_requires_guide_review(self) -> None:
        changed = Path(self.temporary_directory.name) / "changed.tex"
        changed.write_text(
            APPENDIX_A.replace(
                "A section defines a total lift",
                "A changed argument defines a total lift",
            ),
            encoding="utf-8",
        )

        status, output, error = self.run_command("why", str(changed))

        self.assertEqual(status, 2)
        self.assertEqual(output, "")
        self.assertIn("guide has not been reviewed", error)

    def test_orient_and_study_do_not_touch_warrant_resources(self) -> None:
        def run_without_warrant(command: str) -> tuple[int, str]:
            stderr = StringIO()
            with (
                patch.object(
                    appendix_a,
                    "_REVIEWED_SOURCE_REVISION",
                    self.reviewed_revision,
                ),
                patch.object(
                    appendix_a_warrant,
                    "load_package_bundle",
                    side_effect=AssertionError("warrant resource was touched"),
                ),
                redirect_stdout(StringIO()),
                redirect_stderr(stderr),
            ):
                status = main((command, str(self.source)))
            return status, stderr.getvalue()

        orient_status, orient_error = run_without_warrant("orient")
        study_status, study_error = run_without_warrant("study")

        self.assertEqual(orient_status, 0)
        self.assertEqual(study_status, 0)
        self.assertEqual(orient_error, "")
        self.assertEqual(study_error, "")


if __name__ == "__main__":
    unittest.main()
